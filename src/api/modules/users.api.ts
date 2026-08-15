import api from '@api/config/axios.config'
import type { UserResponse } from './auth.api'

export type UserListParams = {
  skip?: number
  limit?: number
}

export const listUsersRequest = async (params?: UserListParams): Promise<UserResponse[]> => {
  const { data } = await api.get<UserResponse[]>('/users/', { params })
  return data
}
