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

export type ServiceMilestone = {
  public_id: string
  name: string
  sequence: number
  amount: string
  status: 'pending' | 'completed' | 'cancelled'
  due_at?: string | null
  completed_at?: string | null
}

export type ServiceJob = {
  public_id: string
  business_id: number
  branch_id?: number | null
  service_offering_id: number
  service_name?: string | null
  customer_id?: number | null
  pricing_model: 'fixed' | 'hourly' | 'quoted'
  status: 'draft' | 'booked' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  currency: string
  fixed_amount: string
  hourly_rate: string
  estimated_hours?: string | null
  actual_hours: string
  quoted_amount: string
  materials_amount: string
  travel_amount: string
  tip_amount: string
  pass_through_amount: string
  deposit_amount: string
  seller_discount_amount: string
  platform_discount_amount: string
  cancellation_fee: string
  no_show_fee: string
  scheduled_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  created_at: string
  milestones: ServiceMilestone[]
}

export type ServiceJobCreate = {
  service_offering_id: number
  branch_id?: number
  pricing_model: ServiceJob['pricing_model']
  fixed_amount?: number
  hourly_rate?: number
  estimated_hours?: number
  quoted_amount?: number
  materials_amount?: number
  travel_amount?: number
  tip_amount?: number
  pass_through_amount?: number
  deposit_amount?: number
  cancellation_fee?: number
  no_show_fee?: number
  scheduled_at?: string
  notes?: string
  idempotency_key: string
  milestones?: Array<{ name: string; amount: number; due_at?: string }>
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

export const listServiceJobsRequest = async (): Promise<ServiceJob[]> => {
  const { data } = await api.get<ServiceJob[] | StandardApiResponse<ServiceJob[]>>('/services/jobs')
  return unwrapList(data)
}

export const createServiceJobRequest = async (payload: ServiceJobCreate): Promise<ServiceJob> => {
  const { data } = await api.post<ServiceJob | StandardApiResponse<ServiceJob>>('/services/jobs', payload)
  return unwrapItem(data)
}

export const completeServiceJobRequest = async (
  jobId: string,
  payload: { actual_hours?: number }
): Promise<ServiceJob> => {
  const { data } = await api.post<ServiceJob | StandardApiResponse<ServiceJob>>(
    `/services/jobs/${jobId}/complete`, payload
  )
  return unwrapItem(data)
}

export const completeServiceMilestoneRequest = async (
  jobId: string,
  milestoneId: string
): Promise<ServiceMilestone> => {
  const { data } = await api.post<ServiceMilestone | StandardApiResponse<ServiceMilestone>>(
    `/services/jobs/${jobId}/milestones/${milestoneId}/complete`
  )
  return unwrapItem(data)
}

export const applyServicePolicyRequest = async (
  jobId: string,
  action: 'cancel' | 'no-show',
  payload: { reason: string; fee_amount?: number }
): Promise<ServiceJob> => {
  const { data } = await api.post<ServiceJob | StandardApiResponse<ServiceJob>>(
    `/services/jobs/${jobId}/${action}`, payload
  )
  return unwrapItem(data)
}

export const addServiceAdjustmentRequest = async (
  jobId: string,
  payload: { kind: 'refund' | 'credit'; amount: number; reason: string; idempotency_key: string }
): Promise<void> => {
  await api.post(`/services/jobs/${jobId}/adjustments`, payload)
}
