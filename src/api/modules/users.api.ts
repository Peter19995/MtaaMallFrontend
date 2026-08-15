import api from '@api/config/axios.config'
import type { UserResponse } from './auth.api'

export type UserListParams = {
  skip?: number
  limit?: number
}

export type UserProfileUpdate = {
  full_name?: string
  email?: string
  phone?: string
}

export const listUsersRequest = async (params?: UserListParams): Promise<UserResponse[]> => {
  const { data } = await api.get<UserResponse[]>('/users/', { params })
  return data
}

export const updateUserRequest = async (
  userId: number,
  payload: UserProfileUpdate
): Promise<UserResponse> => {
  const { data } = await api.put<UserResponse>(`/users/${userId}`, payload)
  return data
}
