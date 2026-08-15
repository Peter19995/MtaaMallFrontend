import api from '@api/config/axios.config'

export type BusinessBranchRegistration = {
  name: string
  location: string
  county: string
  town: string
  phone?: string
}

export type BusinessRegistrationRequest = {
  name: string
  registration_number: string
  business_type: string
  description?: string
  email?: string
  phone?: string
  owner: {
    email?: string
    username?: string
    full_name: string
    phone: string
    password: string
  }
  branches?: BusinessBranchRegistration[]
}

export type BusinessRegistrationResponse = {
  id: number
  name: string
  registration_number: string
  business_type: string
  description?: string | null
  email: string
  phone: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  owner: {
    id: number
    full_name?: string | null
    email: string
    username: string
    phone?: string | null
  }
  branches: Array<BusinessBranchRegistration & { id: number; code: string; is_active: boolean }>
  verified_at?: string | null
  created_at: string
}

export type BusinessProfileUpdate = {
  name: string
  business_type: string
  description?: string
  email?: string
  phone?: string
}

export const registerBusinessRequest = async (
  payload: BusinessRegistrationRequest
): Promise<BusinessRegistrationResponse> => {
  const { data } = await api.post<BusinessRegistrationResponse>('/businesses/register', payload)
  return data
}

export const getMyBusinessRequest = async (): Promise<BusinessRegistrationResponse> => {
  const { data } = await api.get<BusinessRegistrationResponse>('/businesses/me')
  return data
}

export const updateMyBusinessRequest = async (
  payload: BusinessProfileUpdate
): Promise<BusinessRegistrationResponse> => {
  const { data } = await api.patch<BusinessRegistrationResponse>('/businesses/me', payload)
  return data
}
