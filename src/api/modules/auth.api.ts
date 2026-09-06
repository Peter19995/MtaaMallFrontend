import api from '@api/config/axios.config'

export type LoginRequest = {
  username: string
  password: string
}

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export type AccountType = 'business' | 'customer'

export type UserCreate = {
  account_type: AccountType
  email?: string
  username: string
  full_name?: string
  phone?: string
  password: string
}

export type RefreshTokenRequest = {
  refresh_token: string
}

export type PasswordChangeRequest = {
  old_password: string
  new_password: string
}

export type PasswordResetRequest = {
  email: string
}

export type PasswordResetConfirmRequest = {
  token: string
  new_password: string
}

export type UserResponse = {
  id: number
  email?: string | null
  username: string
  full_name?: string | null
  phone?: string | null
  managed_branch_id?: number | null
  is_active: boolean
  is_superuser: boolean
  created_at?: string
  last_login?: string | null
  roles?: string[]
  permissions?: string[]
}

type AuthActionResponse = Record<string, unknown>

export const loginRequest = async (payload: LoginRequest): Promise<TokenResponse> => {
  const { data } = await api.post<TokenResponse>('/auth/login', payload, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  return data
}

export const refreshTokenRequest = async (
  payload: RefreshTokenRequest
): Promise<TokenResponse> => {
  const { data } = await api.post<TokenResponse>('/auth/refresh', payload)
  return data
}

export const registerRequest = async (payload: UserCreate): Promise<UserResponse> => {
  const { data } = await api.post<UserResponse>('/auth/register', payload, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  return data
}

export const logoutRequest = async (): Promise<AuthActionResponse> => {
  const { data } = await api.post<AuthActionResponse>('/auth/logout')
  return data
}

export const changePasswordRequest = async (
  payload: PasswordChangeRequest
): Promise<AuthActionResponse> => {
  const { data } = await api.post<AuthActionResponse>('/auth/change-password', payload)
  return data
}

export const requestPasswordResetRequest = async (
  payload: PasswordResetRequest
): Promise<AuthActionResponse> => {
  const { data } = await api.post<AuthActionResponse>('/auth/reset-password-request', payload)
  return data
}

export const confirmPasswordResetRequest = async (
  payload: PasswordResetConfirmRequest
): Promise<AuthActionResponse> => {
  const { data } = await api.post<AuthActionResponse>('/auth/reset-password-confirm', payload)
  return data
}

export const verifyEmailRequest = async (token: string): Promise<AuthActionResponse> => {
  const encodedToken = encodeURIComponent(token.trim())
  const { data } = await api.get<AuthActionResponse>(`/auth/verify-email/${encodedToken}`)
  return data
}

export const getMeRequest = async (accessToken?: string): Promise<UserResponse> => {
  const { data } = await api.get<UserResponse>('/users/me', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  })

  return data
}
