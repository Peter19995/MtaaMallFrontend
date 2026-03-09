import api from '@api/config/axios.config'

export type ServiceCategoryResponse = {
  id: number
  name: string
  description?: string | null
  is_active?: boolean
  total_services?: number
  created_at?: string | null
  updated_at?: string | null
}

export type ServiceCategoryCreate = {
  name: string
  description?: string
  is_active?: boolean
}

export type ServiceOfferingResponse = {
  id: number
  code: string
  name: string
  description?: string | null
  category_id: number
  category_name?: string | null
  price: number
  duration_minutes?: number | null
  is_active: boolean
  is_popular?: boolean
  image_urls?: string[]
  created_at?: string | null
  updated_at?: string | null
}

export type ServiceOfferingCreate = {
  code: string
  name: string
  description?: string
  category_id: number
  price: number
  duration_minutes?: number
  is_active?: boolean
  image_urls?: string[]
}

export type ServiceOfferingUpdate = {
  code?: string
  name?: string
  description?: string
  category_id?: number
  price?: number
  duration_minutes?: number
  is_active?: boolean
  image_urls?: string[]
}

export type ServiceListParams = {
  skip?: number
  limit?: number
  search?: string
  category_id?: number
  is_active?: boolean
}

export const listServiceCategoriesRequest = async (): Promise<ServiceCategoryResponse[]> => {
  const { data } = await api.get<ServiceCategoryResponse[]>('/services/categories')
  return data
}

export const createServiceCategoryRequest = async (
  payload: ServiceCategoryCreate
): Promise<ServiceCategoryResponse> => {
  const { data } = await api.post<ServiceCategoryResponse>('/services/categories', payload)
  return data
}

export const listServicesRequest = async (
  params?: ServiceListParams
): Promise<ServiceOfferingResponse[]> => {
  const { data } = await api.get<ServiceOfferingResponse[]>('/services/', { params })
  return data
}

const buildServiceFormData = (
  payload: ServiceOfferingCreate | ServiceOfferingUpdate,
  images: File[]
): FormData => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, String(item)))
      return
    }
    formData.append(key, String(value))
  })
  images.forEach((image) => formData.append('images', image))
  return formData
}

export const createServiceRequest = async (
  payload: ServiceOfferingCreate,
  images: File[] = []
): Promise<ServiceOfferingResponse> => {
  const requestBody = images.length > 0 ? buildServiceFormData(payload, images) : payload
  const { data } = await api.post<ServiceOfferingResponse>('/services/', requestBody)
  return data
}

export const updateServiceRequest = async (
  serviceId: number,
  payload: ServiceOfferingUpdate,
  images: File[] = []
): Promise<ServiceOfferingResponse> => {
  const requestBody = images.length > 0 ? buildServiceFormData(payload, images) : payload
  const { data } = await api.put<ServiceOfferingResponse>(`/services/${serviceId}`, requestBody)
  return data
}

export const deleteServiceRequest = async (serviceId: number): Promise<void> => {
  await api.delete(`/services/${serviceId}`)
}
