import axios, { type InternalAxiosRequestConfig } from 'axios'
import { requestTenantContext } from './tenantContext'

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean; _contextAtDispatch?: string | null }
type ApiEnvelope<T> = {
  data?: T
  message?: string
  success?: boolean
  meta?: unknown
  errors?: unknown
  detail?: unknown
  status?: string | number
  code?: string | number
}

const AUTH_BYPASS_PATHS = ['/auth/login', '/auth/register', '/auth/invitations/platform', '/auth/refresh']

const shouldBypassStoredToken = (url?: string) => {
  if (!url) {
    return false
  }

  return AUTH_BYPASS_PATHS.some((path) => url.includes(path))
}

const getAuthErrorMessage = (payload: unknown): string => {
  if (!isPlainObject(payload)) {
    return ''
  }

  const detail = payload.detail
  if (typeof detail === 'string') {
    return detail
  }

  const message = payload.message
  if (typeof message === 'string') {
    return message
  }

  return ''
}

const isRetriableAuthError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false
  }

  if (error.response?.status === 401) {
    return true
  }

  if (error.response?.status !== 400) {
    return false
  }

  const authMessage = getAuthErrorMessage(error.response?.data).toLowerCase()
  return (
    authMessage.includes('authorization header is required') ||
    authMessage.includes('not authenticated') ||
    authMessage.includes('missing authorization')
  )
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]'

const unwrapApiPayload = <T>(payload: T | ApiEnvelope<T>): T => {
  if (!isPlainObject(payload) || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload as T
  }

  const envelopeKeys = new Set([
    'data',
    'message',
    'success',
    'meta',
    'errors',
    'detail',
    'status',
    'code'
  ])

  const keys = Object.keys(payload)
  const hasOnlyEnvelopeKeys = keys.every((key) => envelopeKeys.has(key))

  if (!hasOnlyEnvelopeKeys && keys.length > 1) {
    return payload as T
  }

  return payload.data as T
}

const rawApiUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined)
)?.trim()
const normalizedApiUrl = rawApiUrl?.replace(/\/+$/, '')
const isDev = import.meta.env.DEV
const runtimeHostname = typeof window !== 'undefined' ? window.location.hostname : ''
const shouldUseSameOriginApi =
  isDev ||
  runtimeHostname === 'mtaamall.com' ||
  runtimeHostname === 'www.mtaamall.com'
const configuredBaseUrl = normalizedApiUrl
  ? normalizedApiUrl.endsWith('/api/v1')
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`
  : '/api/v1'
const baseURL = shouldUseSameOriginApi ? '/api/v1' : configuredBaseUrl

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'MtaaMall' }
})

api.interceptors.request.use((config) => {
  const context = localStorage.getItem('auth_context')
  const requestContext = requestTenantContext(window.location.pathname, config.url, context)
  ;(config as RetryableRequest)._contextAtDispatch = context
  if (!shouldBypassStoredToken(config.url) && requestContext && !config.headers.has('X-Context')) {
    config.headers.set('X-Context', requestContext)
  }


  return config
})

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshBase = baseURL.startsWith('http') ? baseURL : window.location.origin + baseURL
    await axios.post(refreshBase + '/auth/refresh', {}, {
      withCredentials: true, headers: { 'X-Requested-With': 'MtaaMall', 'Content-Type': 'application/json' }
    })
    return 'cookie-session'
  } catch {
    localStorage.removeItem('auth_user')
    return null
  }
}

api.interceptors.response.use(
  (response) => {
    if ((response.config as RetryableRequest)._contextAtDispatch !== localStorage.getItem('auth_context')) {
      return Promise.reject(new axios.CanceledError('Workspace changed'))
    }
    response.data = unwrapApiPayload(response.data)
    return response
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequest | undefined
    if (error.response?.status === 403 && getAuthErrorMessage(error.response.data).includes('Complete account security setup')) {
      if (!window.location.pathname.startsWith('/security') && !window.location.pathname.startsWith('/verify-email')) window.location.replace('/security')
      return Promise.reject(error)
    }
    if (originalRequest && originalRequest._contextAtDispatch !== localStorage.getItem('auth_context')) {
      return Promise.reject(new axios.CanceledError('Workspace changed'))
    }
    if (error.response?.status === 403 && getAuthErrorMessage(error.response.data).includes('no active membership')) {
      localStorage.setItem('auth_context', 'customer')
      localStorage.removeItem('auth_user')
      window.location.replace(`/account/workspaces?workspaceRefresh=${Date.now()}`)
      return Promise.reject(error)
    }

    if (
      isRetriableAuthError(error) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      if (!refreshPromise) {
        // Serialize rotating-cookie exchanges across tabs as well as within this
        // tab. Each exchange reads the latest browser cookie after acquiring it.
        const exchange = navigator.locks
          ? navigator.locks.request('mtaamall-session-refresh', refreshAccessToken)
          : refreshAccessToken()
        refreshPromise = exchange.finally(() => {
          refreshPromise = null
        })
      }

      const nextAccessToken = await refreshPromise
      if (nextAccessToken) {
        originalRequest.headers.delete('Authorization')
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default api
