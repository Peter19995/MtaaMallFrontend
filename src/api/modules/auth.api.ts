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
  security?: { ready: boolean }
}

export type AccountType = 'business' | 'customer'

export type CustomerRegistration = {
  email?: string
  username: string
  full_name?: string
  phone: string
  password: string
}

export type BusinessRegistration = {
  name: string
  legal_name: string
  registration_number: string
  business_type: string
  description?: string
  email?: string
  phone?: string
  address?: string
  country: string
  currency: string
  timezone: string
  owner: { email?: string; username: string; full_name: string; phone: string; password: string }
  branches: []
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
  experience?: import('../../utils/experiences').Experience
  landing_path?: string
  membership_id?: number | null
  platform_permissions?: string[]
  business_permissions?: string[]
  allowed_branch_ids?: number[]
  context?: string
  business_memberships?: import('./memberships.api').Membership[]
  platform_memberships?: import('./memberships.api').Membership[]
  business_id?: string | null
  business_status?: import('./businesses.api').BusinessStatus | null
  id: number
  email?: string | null
  username: string
  full_name?: string | null
  phone?: string | null
  branch_scope?: 'all' | 'selected' | null
  branch_ids?: number[]
  is_active: boolean
  is_superuser: boolean
  created_at?: string
  last_login?: string | null
  roles?: string[]
  permissions?: string[]
}

type AuthActionResponse = Record<string, unknown>

export const loginRequest = async (payload: LoginRequest): Promise<TokenResponse> => {
  const { data } = await api.post<TokenResponse>('/auth/login', { ...payload, use_cookies: true }, {
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

export const registerCustomerRequest = async (payload: CustomerRegistration) => {
  const { data } = await api.post('/auth/register/customer', payload, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  return data
}

export const registerBusinessRequest = async (payload: BusinessRegistration) => {
  const { data } = await api.post('/auth/register/business', payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  })
  return data
}

export const logoutRequest = async (): Promise<AuthActionResponse> => {
  const { data } = await api.post<AuthActionResponse>('/auth/logout')
  return data
}

export const reauthenticateRequest = async (password: string): Promise<AuthActionResponse> => {
  const { data } = await api.post<AuthActionResponse>('/auth/reauthenticate', { password })
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

export const acceptPlatformInvitationRequest = async (token: string, password: string) =>
  (await api.post(`/auth/invitations/platform/${encodeURIComponent(token)}/accept`, { password })).data

export const getMeRequest = async (accessToken?: string, context?: string): Promise<UserResponse> => {
  const { data } = await api.get<UserResponse>('/users/me', {
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(context ? { 'X-Context': context } : {}) }
  })

  return data
}
