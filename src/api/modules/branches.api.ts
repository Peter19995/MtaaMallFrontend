import api from '@api/config/axios.config'

export type BranchResponse = {
  id: number
  name: string
  code: string
  location?: string | null
  is_active?: boolean
  manager_user_id?: number | null
  manager_name?: string | null
  created_at?: string | null
}

export const listBranchesRequest = async (): Promise<BranchResponse[]> => {
  const { data } = await api.get<BranchResponse[]>('/branches/')
  return data
}
