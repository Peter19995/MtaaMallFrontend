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

export const listBranchesRequest = async (): Promise<BranchResponse[]> => {
  const { data } = await api.get<BranchResponse[]>('/branches/')
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
