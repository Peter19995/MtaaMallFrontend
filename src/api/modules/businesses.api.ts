import api from '@api/config/axios.config'

export type BusinessStatus = 'draft' | 'pending_verification' | 'active' | 'suspended' | 'rejected' | 'closed'
export type BusinessProfile = {
  legal_name: string
  display_name: string
  registration_number?: string | null
  tax_number?: string | null
  business_type?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  description?: string | null
  country: string
  currency: string
  timezone: string
}
export type Business = BusinessProfile & {
  id: string
  public_id: string
  slug: string
  status: BusinessStatus
  rejection_reason: string | null
  created_by_user_id: number | null
  approved_by_user_id: number | null
  approved_at: string | null
  suspended_at: string | null
  created_at: string
  updated_at: string | null
  owner: { id: number; username: string; full_name?: string | null; email?: string | null; phone?: string | null } | null
  branches: { id: number; name: string; is_active: boolean }[]
}
export type BusinessAudit = {
  id: string
  actor_user_id: number | null
  from_status: BusinessStatus | null
  to_status: BusinessStatus
  reason: string | null
  source: string
  created_at: string
}
export type BusinessReviewDocument = {
  public_id: string
  document_type: string
  file_name: string
  file_url: string
  status: 'submitted' | 'accepted' | 'rejected'
  submitted_by_user_id: number
  reviewed_by_user_id: number | null
  review_reason: string | null
  submitted_at: string
  reviewed_at: string | null
}
export type PlatformBusinessDetail = {
  business: Business
  documents: BusinessReviewDocument[]
  activity: {
    owner_last_login: string | null
    owner_created_at: string | null
    owner_email_verified: boolean
    active_members: number
    total_members: number
    last_status_change_at: string | null
  }
  audit_history: BusinessAudit[]
}
export type BusinessOnboarding = { status: string; current_step: string; checklist: Record<string, boolean>; created_at: string; updated_at: string | null }
export const listBusinesses = async (status?: BusinessStatus) =>
  (await api.get<Business[]>('/platform/businesses', { params: { status } })).data
export const getBusiness = async (id: string) =>
  (await api.get<PlatformBusinessDetail>(`/platform/businesses/${encodeURIComponent(id)}`)).data
export const decideBusiness = async (id: string, action: 'activate' | 'reject' | 'suspend' | 'reactivate', reason: string) =>
  (await api.post<Business>(`/platform/businesses/${encodeURIComponent(id)}/${action}`, { reason })).data
export const createBusiness = async (body: BusinessProfile & { owner_username: string }) =>
  (await api.post<Business>('/businesses/', body)).data
export const getMyBusiness = async () => (await api.get<Business>('/businesses/me')).data
export const getMyBusinessOnboarding = async () => (await api.get<BusinessOnboarding>('/businesses/me/onboarding')).data
export const getMyBusinessDocuments = async () => (await api.get<BusinessReviewDocument[]>('/businesses/me/documents')).data
export const submitMyBusinessDocument = async (body: { document_type: string; file: File }) => {
  const data = new FormData(); data.append('document_type', body.document_type); data.append('file', body.file)
  return (await api.post<BusinessReviewDocument>('/businesses/me/documents', data)).data
}
export const downloadBusinessDocument = async (document: BusinessReviewDocument) => {
  const result = await api.get('/businesses/documents/' + document.public_id + '/download', { responseType: 'blob' })
  const url = URL.createObjectURL(result.data)
  const link = window.document.createElement('a'); link.href = url; link.download = document.file_name
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const updateMyBusiness = async (body: Partial<BusinessProfile>) =>
  (await api.patch<Business>('/businesses/me', body)).data
export const changeBusinessStatus = async (id: string, status: BusinessStatus, reason?: string) =>
  (await api.patch<Business>(`/businesses/${encodeURIComponent(id)}/status`, { status, reason })).data
export const submitMyBusiness = async (status: BusinessStatus) =>
  (await api.post<Business>('/businesses/me/submission', { status })).data
export const getBusinessAudit = async (id: string, offset = 0) =>
  (await api.get<BusinessAudit[]>(`/businesses/${encodeURIComponent(id)}/audit`, { params: { offset, limit: 25 } })).data
