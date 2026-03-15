import axios, { type InternalAxiosRequestConfig } from 'axios'

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean }
type RefreshResponse = { access_token: string; refresh_token?: string }

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

    localStorage.setItem('access_token', data.access_token)
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }

    return data.access_token
  } catch {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
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
