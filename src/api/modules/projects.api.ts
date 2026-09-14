import api from '@api/config/axios.config'

export type ProjectType =
  | 'curtain_installation'
  | 'post_construction_cleaning'
  | 'interior_design'
  | 'furniture_customization'
  | 'wall_painting'
  | 'other'

export type ProjectStatus =
  | 'inquiry'
  | 'quoted'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

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
  client_name?: string
  budget?: number
  actual_cost?: number
  progress?: number
  start_date?: string | null
  expected_end_date?: string | null
  image_urls?: string[]
}

export type ProjectListParams = {
  skip?: number
  limit?: number
  status?: string
  project_type?: string
  client_id?: number
  start_date_from?: string
  start_date_to?: string
}

export type ProjectCreatePayload = {
  name: string
  description?: string
  project_type: ProjectType
  status?: ProjectStatus
  start_date?: string
  expected_end_date?: string
  budget?: number
  quoted_amount?: number
  deposit_amount?: number
  client_id?: number | null
  project_manager_id?: number | null
  branch_id?: number
}

export type ProjectResponse = {
  id: number
  name: string
  description?: string | null
  project_type: ProjectType | string
  status: ProjectStatus | string
  start_date?: string | null
  expected_end_date?: string | null
  budget?: number
  quoted_amount?: number
  deposit_amount?: number
  client_id?: number | null
  project_manager_id?: number | null
  branch_id?: number | null
  actual_cost?: number
  actual_end_date?: string | null
  created_at: string
  updated_at?: string | null
  progress_percentage?: number
  image_urls?: string[]
}

export type ProjectTaskResponse = {
  id: number
  project_id: number
  title: string
  description?: string | null
  status?: string
  start_date?: string | null
  due_date?: string | null
  completed_date?: string | null
  assigned_to_id?: number | null
  parent_task_id?: number | null
  created_at: string
}

export type ProjectTaskCreatePayload = {
  title: string
  description?: string
  status?: string
  start_date?: string
  due_date?: string
  assigned_to_id?: number
  parent_task_id?: number
}

export type ProjectTaskUpdatePayload = {
  title?: string
  description?: string
  status?: string
  start_date?: string
  due_date?: string
  completed_date?: string
  assigned_to_id?: number
}

export type ProjectTasksListParams = {
  skip?: number
  limit?: number
}

export type ProjectMaterialCreatePayload = {
  product_id: number
  quantity: number
  unit_price?: number
  notes?: string
  project_id?: number
}

export type ProjectMaterialResponse = {
  id: number
  project_id: number
  product_id: number
  quantity: number
  unit_price?: number | null
  notes?: string | null
  total_price: number
  status: string
  created_at: string
}

export type ProjectLabourCreatePayload = {
  employee_id?: number
  employee_user_id?: number
  task_id?: number
  hours_worked: number
  rate_per_hour: number
  work_date: string
  description?: string
  project_id?: number
}

export type ProjectLabourResponse = {
  id: number
  project_id: number
  employee_id?: number | null
  task_id?: number | null
  hours_worked: number
  rate_per_hour: number
  work_date: string
  description?: string | null
  total_cost: number
  created_at: string
}

export type ProjectExpenseCreatePayload = {
  category: string
  amount: number
  description?: string
  expense_date: string
  receipt_url?: string
  project_id?: number
}

export type ProjectExpenseResponse = {
  id: number
  project_id: number
  category: string
  amount: number
  description?: string | null
  expense_date: string
  receipt_url?: string | null
  approved_by_id?: number | null
  created_at: string
}

export type ProjectFinancialSummaryResponse = {
  project_id: number
  project_name: string
  budget: number
  actual_cost: number
  quoted_amount: number
  deposit_amount: number
  balance_due: number
  profitability?: number
  material_cost: number
  labour_cost: number
  other_expenses: number
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
  client_id?: number | null
  project_manager_id?: number | null
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

export const createProjectRequest = async (
  payload: ProjectCreatePayload
): Promise<ProjectResponse> => {
  const { data } = await api.post<ProjectResponse>('/projects/', payload)
  return data
}

export const getProjectRequest = async (projectId: number): Promise<ProjectResponse> => {
  const { data } = await api.get<ProjectResponse>(`/projects/${projectId}`)
  return data
}

export const updateProjectRequest = async (
  projectId: number,
  payload: ProjectUpdatePayload
): Promise<ProjectResponse> => {
  const { data } = await api.put<ProjectResponse>(`/projects/${projectId}`, payload)
  return data
}

export const deleteProjectRequest = async (projectId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}`)
}

export const uploadProjectImagesRequest = async (
  projectId: number,
  files: File[]
): Promise<unknown> => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  const { data } = await api.post(`/projects/${projectId}/images`, formData)
  return data
}

export const listProjectTasksRequest = async (
  projectId: number,
  params?: ProjectTasksListParams
): Promise<ProjectTaskResponse[]> => {
  const { data } = await api.get<ProjectTaskResponse[]>(`/projects/${projectId}/tasks`, { params })
  return data
}

export const createProjectTaskRequest = async (
  projectId: number,
  payload: ProjectTaskCreatePayload
): Promise<ProjectTaskResponse> => {
  const { data } = await api.post<ProjectTaskResponse>(`/projects/${projectId}/tasks`, {
    ...payload,
    project_id: projectId
  })
  return data
}

export const updateProjectTaskRequest = async (
  taskId: number,
  payload: ProjectTaskUpdatePayload
): Promise<ProjectTaskResponse> => {
  const { data } = await api.put<ProjectTaskResponse>(`/projects/tasks/${taskId}`, payload)
  return data
}

export const addProjectMaterialRequest = async (
  projectId: number,
  payload: ProjectMaterialCreatePayload
): Promise<ProjectMaterialResponse> => {
  const { data } = await api.post<ProjectMaterialResponse>(`/projects/${projectId}/materials`, {
    ...payload,
    project_id: projectId
  })
  return data
}

export const addProjectLabourRequest = async (
  projectId: number,
  payload: ProjectLabourCreatePayload
): Promise<ProjectLabourResponse> => {
  const { data } = await api.post<ProjectLabourResponse>(`/projects/${projectId}/labour`, {
    ...payload,
    project_id: projectId
  })
  return data
}

export const addProjectExpenseRequest = async (
  projectId: number,
  payload: ProjectExpenseCreatePayload
): Promise<ProjectExpenseResponse> => {
  const { data } = await api.post<ProjectExpenseResponse>(`/projects/${projectId}/expenses`, {
    ...payload,
    project_id: projectId
  })
  return data
}

export const getProjectFinancialsRequest = async (
  projectId: number
): Promise<ProjectFinancialSummaryResponse> => {
  const { data } = await api.get<ProjectFinancialSummaryResponse>(`/projects/${projectId}/financial`)
  return data
}
