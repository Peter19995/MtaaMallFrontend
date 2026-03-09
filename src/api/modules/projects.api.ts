import api from '@api/config/axios.config'

export type PublicProjectResponse = {
  project_title: string
  description?: string | null
  project_type: string
  status: string
  start_date?: string | null
  expected_end_date?: string | null
  image_urls?: string[]
}

export type PublicProjectListParams = {
  skip?: number
  limit?: number
}

export type ProjectSummaryResponse = {
  id: number
  name: string
  project_type: string
  status: string
  start_date?: string | null
  expected_end_date?: string | null
  image_urls?: string[]
}

export type ProjectListParams = {
  skip?: number
  limit?: number
}

export type ProjectUpdatePayload = {
  name?: string
  description?: string
  status?: string
  start_date?: string
  expected_end_date?: string
  actual_end_date?: string
  budget?: number
  quoted_amount?: number
  deposit_amount?: number
  project_manager_id?: number
}

export const listPublicProjectsRequest = async (
  params?: PublicProjectListParams
): Promise<PublicProjectResponse[]> => {
  const { data } = await api.get<PublicProjectResponse[]>('/projects/public', { params })
  return data
}

export const listProjectsRequest = async (
  params?: ProjectListParams
): Promise<ProjectSummaryResponse[]> => {
  const { data } = await api.get<ProjectSummaryResponse[]>('/projects/', { params })
  return data
}

export const updateProjectRequest = async (
  projectId: number,
  payload: ProjectUpdatePayload
): Promise<void> => {
  await api.put(`/projects/${projectId}`, payload)
}

export const uploadProjectImagesRequest = async (
  projectId: number,
  files: File[]
): Promise<void> => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  await api.post(`/projects/${projectId}/images`, formData)
}
