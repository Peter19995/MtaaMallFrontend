import api from '@api/config/axios.config'

type StandardApiResponse<T> = {
  success?: boolean
  message?: string
  data?: T
  meta?: unknown
  errors?: unknown
}

const unwrapList = <T>(payload: T[] | StandardApiResponse<T[]>): T[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []

const unwrapItem = <T>(payload: T | StandardApiResponse<T>): T =>
  (payload as StandardApiResponse<T>)?.data ?? (payload as T)

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

export type ServiceCategoryUpdate = {
  name?: string
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
}

export type ServiceOfferingUpdate = {
  code?: string
  name?: string
  description?: string
  category_id?: number
  price?: number
  duration_minutes?: number
  is_active?: boolean
}

export type ServiceListParams = {
  skip?: number
  limit?: number
  search?: string
  category_id?: number
  is_active?: boolean
}

export const listServiceCategoriesRequest = async (): Promise<ServiceCategoryResponse[]> => {
  const { data } = await api.get<ServiceCategoryResponse[] | StandardApiResponse<ServiceCategoryResponse[]>>(
    '/services/categories'
  )
  return unwrapList(data)
}

export const createServiceCategoryRequest = async (
  payload: ServiceCategoryCreate
): Promise<ServiceCategoryResponse> => {
  const { data } = await api.post<ServiceCategoryResponse | StandardApiResponse<ServiceCategoryResponse>>(
    '/services/categories',
    payload
  )
  return unwrapItem(data)
}

export const getServiceCategoryRequest = async (
  categoryId: number
): Promise<ServiceCategoryResponse> => {
  const { data } = await api.get<ServiceCategoryResponse | StandardApiResponse<ServiceCategoryResponse>>(
    `/services/categories/${categoryId}`
  )
  return unwrapItem(data)
}

export const updateServiceCategoryRequest = async (
  categoryId: number,
  payload: ServiceCategoryUpdate
): Promise<ServiceCategoryResponse> => {
  const { data } = await api.put<ServiceCategoryResponse | StandardApiResponse<ServiceCategoryResponse>>(
    `/services/categories/${categoryId}`,
    payload
  )
  return unwrapItem(data)
}

export const deleteServiceCategoryRequest = async (categoryId: number): Promise<void> => {
  await api.delete(`/services/categories/${categoryId}`)
}

export const listServicesRequest = async (
  params?: ServiceListParams
): Promise<ServiceOfferingResponse[]> => {
  const { data } = await api.get<
    ServiceOfferingResponse[] | StandardApiResponse<ServiceOfferingResponse[]>
  >('/services/', { params })
  return unwrapList(data)
}

export const createServiceRequest = async (
  payload: ServiceOfferingCreate
): Promise<ServiceOfferingResponse> => {
  const { data } = await api.post<
    ServiceOfferingResponse | StandardApiResponse<ServiceOfferingResponse>
  >('/services/', payload)
  return unwrapItem(data)
}

export const getServiceRequest = async (serviceId: number): Promise<ServiceOfferingResponse> => {
  const { data } = await api.get<
    ServiceOfferingResponse | StandardApiResponse<ServiceOfferingResponse>
  >(`/services/${serviceId}`)
  return unwrapItem(data)
}

export const updateServiceRequest = async (
  serviceId: number,
  payload: ServiceOfferingUpdate
): Promise<ServiceOfferingResponse> => {
  const { data } = await api.put<
    ServiceOfferingResponse | StandardApiResponse<ServiceOfferingResponse>
  >(`/services/${serviceId}`, payload)
  return unwrapItem(data)
}

export const uploadServiceImagesRequest = async (
  serviceId: number,
  files: File[]
): Promise<void> => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  await api.post(`/services/${serviceId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const deleteServiceRequest = async (serviceId: number): Promise<void> => {
  await api.delete(`/services/${serviceId}`)
}
