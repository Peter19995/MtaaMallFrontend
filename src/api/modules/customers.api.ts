import api from '@api/config/axios.config'

export type CustomerResponse = {
  id: number
  email: string
  username: string
  full_name?: string | null
  phone?: string | null
  avatar?: string | null
  is_active: boolean
  is_cash_customer: boolean
  customer_source?: string | null
  can_staff_edit?: boolean
  created_at: string
  last_login?: string | null
}

export type CustomerCreate = {
  email: string
  username: string
  full_name?: string
  phone?: string
  password: string
}

export type CustomerUpdate = {
  email?: string
  username?: string
  full_name?: string
  phone?: string
  avatar?: string
  is_active?: boolean
}

export type CustomerListParams = {
  skip?: number
  limit?: number
  search?: string
  include_inactive?: boolean
}

export const listCustomersRequest = async (
  params?: CustomerListParams
): Promise<CustomerResponse[]> => {
  const { data } = await api.get<CustomerResponse[]>('/customers/', { params })
  return data
}

export const createCustomerRequest = async (
  payload: CustomerCreate
): Promise<CustomerResponse> => {
  const { data } = await api.post<CustomerResponse>('/customers/', payload)
  return data
}

export const getDefaultCashCustomerRequest = async (): Promise<CustomerResponse> => {
  const { data } = await api.get<CustomerResponse>('/customers/default-cash')
  return data
}

export const getCustomerRequest = async (customerId: number): Promise<CustomerResponse> => {
  const { data } = await api.get<CustomerResponse>(`/customers/${customerId}`)
  return data
}

export const updateCustomerRequest = async (
  customerId: number,
  payload: CustomerUpdate
): Promise<CustomerResponse> => {
  const { data } = await api.put<CustomerResponse>(`/customers/${customerId}`, payload)
  return data
}

export const deactivateCustomerRequest = async (
  customerId: number
): Promise<CustomerResponse> => {
  const { data } = await api.delete<CustomerResponse>(`/customers/${customerId}`)
  return data
}
