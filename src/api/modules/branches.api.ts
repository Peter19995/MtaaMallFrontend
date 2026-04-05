import api from '@api/config/axios.config'

export type BranchResponse = {
  id: number
  name: string
  code: string
  location?: string | null
  is_active?: boolean
  is_online_shop_source?: boolean
  manager_user_id?: number | null
  manager_name?: string | null
  created_at?: string | null
}

export type BranchOperationsSummaryResponse = {
  branch_id: number
  branch_name: string
  total_sales: number
  total_orders: number
  online_orders: number
  pos_orders: number
  active_projects: number
  restock_events: number
  stock_count_events: number
}

export type BranchListParams = {
  include_deleted?: boolean
}

export type BranchCreate = {
  name: string
  code: string
  location?: string
  is_active?: boolean
  is_online_shop_source?: boolean
  manager_user_id?: number
}

export type BranchUpdate = {
  name?: string
  code?: string
  location?: string
  is_active?: boolean
  is_online_shop_source?: boolean
}

export type AssignBranchManagerRequest = {
  user_id: number
}

export type BranchGetParams = {
  include_deleted?: boolean
}

export const listBranchesRequest = async (
  params?: BranchListParams
): Promise<BranchResponse[]> => {
  const { data } = await api.get<BranchResponse[]>('/branches/', { params })
  return data
}

export const createBranchRequest = async (payload: BranchCreate): Promise<BranchResponse> => {
  const { data } = await api.post<BranchResponse>('/branches/', payload)
  return data
}

export const getBranchRequest = async (
  branchId: number,
  params?: BranchGetParams
): Promise<BranchResponse> => {
  const { data } = await api.get<BranchResponse>(`/branches/${branchId}`, { params })
  return data
}

export const updateBranchRequest = async (
  branchId: number,
  payload: BranchUpdate
): Promise<BranchResponse> => {
  const { data } = await api.put<BranchResponse>(`/branches/${branchId}`, payload)
  return data
}

export const deleteBranchRequest = async (branchId: number): Promise<Record<string, unknown>> => {
  const { data } = await api.delete<Record<string, unknown>>(`/branches/${branchId}`)
  return data
}

export const assignBranchManagerRequest = async (
  branchId: number,
  payload: AssignBranchManagerRequest
): Promise<BranchResponse> => {
  const { data } = await api.post<BranchResponse>(`/branches/${branchId}/assign-manager`, payload)
  return data
}

export const getBranchOperationsSummaryRequest = async (
  branchId: number
): Promise<BranchOperationsSummaryResponse> => {
  const { data } = await api.get<BranchOperationsSummaryResponse>(
    `/branches/${branchId}/operations/summary`
  )
  return data
}
