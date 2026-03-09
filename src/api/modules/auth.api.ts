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

export type RefreshTokenRequest = {
  refresh_token: string
}

export type UserResponse = {
  id: number
  email: string
  username: string
  full_name?: string | null
  is_active: boolean
  is_superuser: boolean
  roles?: string[]
  permissions?: string[]
}

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

export const getMeRequest = async (accessToken?: string): Promise<UserResponse> => {
  const { data } = await api.get<UserResponse>('/users/me', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  })

  return data
}
