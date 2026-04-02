import axios, { type InternalAxiosRequestConfig } from 'axios'

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean }
type RefreshResponse = { access_token: string; refresh_token?: string }
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

const AUTH_BYPASS_PATHS = ['/auth/login', '/auth/register', '/auth/refresh']

const shouldBypassStoredToken = (url?: string) => {
  if (!url) {
    return false
  }

  return AUTH_BYPASS_PATHS.some((path) => url.includes(path))
}

const getExistingAuthorizationHeader = (config: InternalAxiosRequestConfig) => {
  const headers = config.headers as
    | {
        Authorization?: string
        authorization?: string
        get?: (name: string) => string | undefined
      }
    | undefined

  return headers?.get?.('Authorization') ?? headers?.Authorization ?? headers?.authorization
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
  runtimeHostname === 'julian-interiors.com' ||
  runtimeHostname === 'www.julian-interiors.com'
const configuredBaseUrl = normalizedApiUrl
  ? normalizedApiUrl.endsWith('/api/v1')
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`
  : '/api/v1'
const baseURL = shouldUseSameOriginApi ? '/api/v1' : configuredBaseUrl

const api = axios.create({
  baseURL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')

  if (token && !shouldBypassStoredToken(config.url) && !getExistingAuthorizationHeader(config)) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    }
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    return null
  }

  try {
    const refreshBase = baseURL.startsWith('http')
      ? baseURL
      : `${window.location.origin}${baseURL}`

    const { data } = await axios.post<RefreshResponse>(
      `${refreshBase}/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    )

    const refreshPayload = unwrapApiPayload<RefreshResponse>(data)

    localStorage.setItem('access_token', refreshPayload.access_token)
    if (refreshPayload.refresh_token) {
      localStorage.setItem('refresh_token', refreshPayload.refresh_token)
    }

    return refreshPayload.access_token
  } catch {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    return null
  }
}

api.interceptors.response.use(
  (response) => {
    response.data = unwrapApiPayload(response.data)
    return response
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequest | undefined

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const nextAccessToken = await refreshPromise
      if (nextAccessToken) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${nextAccessToken}`
        }
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default api
