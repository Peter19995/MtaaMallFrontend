import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
  FolderIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, useSiteDialog, type Column } from '@components/common'
import { listProductsRequest } from '@api/modules/products.api'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  addProjectExpenseRequest,
  addProjectLabourRequest,
  addProjectMaterialRequest,
  createProjectRequest,
  createProjectTaskRequest,
  deleteProjectRequest,
  getProjectFinancialsRequest,
  getProjectRequest,
  listProjectsRequest,
  listProjectTasksRequest,
  updateProjectRequest,
  updateProjectTaskRequest,
  uploadProjectImagesRequest,
  type ProjectCreatePayload,
  type ProjectExpenseResponse,
  type ProjectLabourResponse,
  type ProjectMaterialResponse,
  type ProjectStatus,
  type ProjectSummaryResponse,
  type ProjectTaskCreatePayload,
  type ProjectTaskResponse,
  type ProjectTaskUpdatePayload,
  type ProjectType,
  type ProjectUpdatePayload
} from '@api/modules/projects.api'
import { AppTheme, withOpacity } from '@constants/theme'

type ProjectFormState = {
  name: string
  description: string
  projectType: ProjectType
  status: ProjectStatus
  startDate: string
  expectedEndDate: string
  actualEndDate: string
  budget: string
  quotedAmount: string
  depositAmount: string
  clientId: string
  projectManagerId: string
  branchId: string
}

type TaskFormState = {
  title: string
  description: string
  status: string
  startDate: string
  dueDate: string
  completedDate: string
  assignedToId: string
  parentTaskId: string
}

type MaterialFormState = {
  productId: string
  quantity: string
  unitPrice: string
  notes: string
}

type LabourFormState = {
  employeeId: string
  taskId: string
  hoursWorked: string
  ratePerHour: string
  workDate: string
  description: string
}

type ExpenseFormState = {
  category: string
  amount: string
  expenseDate: string
  receiptUrl: string
  description: string
}

const today = new Date().toISOString().slice(0, 10)

const PROJECT_TYPE_OPTIONS: Array<{ value: ProjectType; label: string; icon: typeof CubeIcon }> = [
  { value: 'interior_design', label: 'Interior Design', icon: SparklesIcon },
  { value: 'curtain_installation', label: 'Curtain Installation', icon: PhotoIcon },
  { value: 'post_construction_cleaning', label: 'Post Construction Cleaning', icon: WrenchScrewdriverIcon },
  { value: 'furniture_customization', label: 'Furniture Customization', icon: CubeIcon },
  { value: 'wall_painting', label: 'Wall Painting', icon: CubeIcon },
  { value: 'other', label: 'Other', icon: DocumentTextIcon }
]

const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string; color: string }> = [
  { value: 'inquiry', label: 'Inquiry', color: 'bg-blue-100 text-blue-700' },
  { value: 'quoted', label: 'Quoted', color: 'bg-purple-100 text-purple-700' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-primary/10 text-primary' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completed', color: 'bg-success/10 text-success' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-error/10 text-error' }
]

const EMPTY_PROJECT_FORM: ProjectFormState = {
  name: '',
  description: '',
  projectType: 'interior_design',
  status: 'inquiry',
  startDate: today,
  expectedEndDate: '',
  actualEndDate: '',
  budget: '0',
  quotedAmount: '0',
  depositAmount: '0',
  clientId: '',
  projectManagerId: '',
  branchId: ''
}

const EMPTY_TASK_FORM: TaskFormState = {
  title: '',
  description: '',
  status: 'pending',
  startDate: '',
  dueDate: '',
  completedDate: '',
  assignedToId: '',
  parentTaskId: ''
}

const EMPTY_MATERIAL_FORM: MaterialFormState = {
  productId: '',
  quantity: '1',
  unitPrice: '',
  notes: ''
}

const EMPTY_LABOUR_FORM: LabourFormState = {
  employeeId: '',
  taskId: '',
  hoursWorked: '1',
  ratePerHour: '0',
  workDate: today,
  description: ''
}

const EMPTY_EXPENSE_FORM: ExpenseFormState = {
  category: '',
  amount: '0',
  expenseDate: today,
  receiptUrl: '',
  description: ''
}

const toDisplayLabel = (value?: string | null): string => {
  if (!value) {
    return 'Not set'
  }
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseRequiredNumber = (value: string, fieldLabel: string): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`)
  }
  return parsed
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
}

const ProjectsOperationsPage = () => {
  const siteDialog = useSiteDialog()
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [projectSearch, setProjectSearch] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'details' | 'tasks' | 'materials' | 'labour' | 'expenses'>('details')

  const [createProjectForm, setCreateProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM)
  const [updateProjectForm, setUpdateProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM)
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const [newTaskForm, setNewTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editTaskForm, setEditTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM)

  const [materialForm, setMaterialForm] = useState<MaterialFormState>(EMPTY_MATERIAL_FORM)
  const [labourForm, setLabourForm] = useState<LabourFormState>(EMPTY_LABOUR_FORM)
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(EMPTY_EXPENSE_FORM)

  const [projectError, setProjectError] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [resourceError, setResourceError] = useState<string | null>(null)

  const [recentMaterials, setRecentMaterials] = useState<ProjectMaterialResponse[]>([])
  const [recentLabour, setRecentLabour] = useState<ProjectLabourResponse[]>([])
  const [recentExpenses, setRecentExpenses] = useState<ProjectExpenseResponse[]>([])

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'admin', 'list'],
    queryFn: () => listProjectsRequest({ limit: 100 })
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'projects-select'],
    queryFn: listBranchesRequest
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'projects-materials-select'],
    queryFn: () => listProductsRequest({ limit: 200 })
  })

  const selectedProject = useMemo(
    () => (projectsQuery.data ?? []).find((project) => project.id === selectedProjectId),
    [projectsQuery.data, selectedProjectId]
  )

  const projectDetailsQuery = useQuery({
    queryKey: ['projects', 'admin', 'details', selectedProjectId],
    queryFn: () => getProjectRequest(selectedProjectId as number),
    enabled: selectedProjectId !== null
  })

  const tasksQuery = useQuery({
    queryKey: ['projects', 'admin', 'tasks', selectedProjectId],
    queryFn: () => listProjectTasksRequest(selectedProjectId as number, { limit: 100 }),
    enabled: selectedProjectId !== null
  })

  const financialsQuery = useQuery({
    queryKey: ['projects', 'admin', 'financial', selectedProjectId],
    queryFn: () => getProjectFinancialsRequest(selectedProjectId as number),
    enabled: selectedProjectId !== null
  })

  useEffect(() => {
    const project = projectDetailsQuery.data
    if (!project) {
      return
    }

    setUpdateProjectForm({
      name: project.name ?? '',
      description: project.description ?? '',
      projectType: (project.project_type as ProjectType) ?? 'interior_design',
      status: (project.status as ProjectStatus) ?? 'inquiry',
      startDate: (project.start_date ?? '').slice(0, 10),
      expectedEndDate: (project.expected_end_date ?? '').slice(0, 10),
      actualEndDate: (project.actual_end_date ?? '').slice(0, 10),
      budget: String(project.budget ?? 0),
      quotedAmount: String(project.quoted_amount ?? 0),
      depositAmount: String(project.deposit_amount ?? 0),
      clientId: String(project.client_id ?? ''),
      projectManagerId: project.project_manager_id ? String(project.project_manager_id) : '',
      branchId: project.branch_id ? String(project.branch_id) : ''
    })
  }, [projectDetailsQuery.data])

  const projectTypeOptions = useMemo(
    () => PROJECT_TYPE_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
    []
  )

  const projectStatusOptions = useMemo(
    () => PROJECT_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
    []
  )

  const projectStatusFilterOptions = useMemo(
    () => [
      { label: 'All statuses', value: 'all' },
      ...PROJECT_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }))
    ],
    []
  )

  const branchOptions = useMemo(
    () => [
      { label: 'No branch', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const productOptions = useMemo(
    () => [
      { label: 'Select product', value: '' },
      ...((productsQuery.data ?? []).map((product) => ({
        label: `${product.name} (${product.sku})`,
        value: String(product.id)
      })) || [])
    ],
    [productsQuery.data]
  )

  const filteredProjects = useMemo(() => {
    return (projectsQuery.data ?? []).filter((project) => {
      const matchesStatus =
        projectStatusFilter === 'all' ? true : project.status === projectStatusFilter
      const term = projectSearch.trim().toLowerCase()
      const matchesSearch =
        term.length === 0
          ? true
          : project.name.toLowerCase().includes(term) ||
            project.project_type.toLowerCase().includes(term) ||
            project.status.toLowerCase().includes(term)

      return matchesStatus && matchesSearch
    })
  }, [projectsQuery.data, projectSearch, projectStatusFilter])

  const visibleRecentMaterials = useMemo(
    () => recentMaterials.filter((item) => item.project_id === selectedProjectId),
    [recentMaterials, selectedProjectId]
  )

  const visibleRecentLabour = useMemo(
    () => recentLabour.filter((item) => item.project_id === selectedProjectId),
    [recentLabour, selectedProjectId]
  )

  const visibleRecentExpenses = useMemo(
    () => recentExpenses.filter((item) => item.project_id === selectedProjectId),
    [recentExpenses, selectedProjectId]
  )

  const createProjectMutation = useMutation({
    mutationFn: async (form: ProjectFormState) => {
      const clientId = parseRequiredNumber(form.clientId, 'Client ID')
      const branchId = parseOptionalNumber(form.branchId)
      const projectManagerId = parseOptionalNumber(form.projectManagerId)
      const budget = parseRequiredNumber(form.budget, 'Budget')
      const quotedAmount = parseRequiredNumber(form.quotedAmount, 'Quoted amount')
      const depositAmount = parseRequiredNumber(form.depositAmount, 'Deposit amount')

      if (!form.name.trim()) {
        throw new Error('Project name is required.')
      }

      const payload: ProjectCreatePayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        project_type: form.projectType,
        status: form.status,
        start_date: form.startDate || undefined,
        expected_end_date: form.expectedEndDate || undefined,
        budget,
        quoted_amount: quotedAmount,
        deposit_amount: depositAmount,
        client_id: clientId,
        project_manager_id: projectManagerId,
        branch_id: branchId
      }

      return createProjectRequest(payload)
    },
    onSuccess: (project) => {
      setProjectError(null)
      setCreateProjectForm(EMPTY_PROJECT_FORM)
      setSelectedProjectId(project.id)
      setActiveTab('details')
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'list'] })
    },
    onError: (error: Error) => {
      setProjectError(error.message || 'Could not create project.')
    }
  })

  const updateProjectMutation = useMutation({
    mutationFn: async (form: ProjectFormState) => {
      if (!selectedProjectId) {
        throw new Error('Select a project first.')
      }

      const clientId = parseRequiredNumber(form.clientId, 'Client ID')
      const payload: ProjectUpdatePayload = {
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
        status: form.status,
        start_date: form.startDate || undefined,
        expected_end_date: form.expectedEndDate || undefined,
        actual_end_date: form.actualEndDate || undefined,
        budget: parseRequiredNumber(form.budget, 'Budget'),
        quoted_amount: parseRequiredNumber(form.quotedAmount, 'Quoted amount'),
        deposit_amount: parseRequiredNumber(form.depositAmount, 'Deposit amount'),
        project_manager_id: parseOptionalNumber(form.projectManagerId)
      }

      void clientId

      return updateProjectRequest(selectedProjectId, payload)
    },
    onSuccess: () => {
      setProjectError(null)
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'details', selectedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'financial', selectedProjectId] })
    },
    onError: (error: Error) => {
      setProjectError(error.message || 'Could not update project.')
    }
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await deleteProjectRequest(projectId)
    },
    onSuccess: (_, projectId) => {
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null)
      }
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'list'] })
    }
  })

  const uploadImagesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) {
        throw new Error('Select a project first.')
      }
      if (imageFiles.length === 0) {
        throw new Error('Select at least one image file.')
      }
      await uploadProjectImagesRequest(selectedProjectId, imageFiles)
    },
    onSuccess: () => {
      setProjectError(null)
      setImageFiles([])
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'details', selectedProjectId] })
    },
    onError: (error: Error) => {
      setProjectError(error.message || 'Could not upload images.')
    }
  })

  const createTaskMutation = useMutation({
    mutationFn: async (form: TaskFormState) => {
      if (!selectedProjectId) {
        throw new Error('Select a project first.')
      }
      if (!form.title.trim()) {
        throw new Error('Task title is required.')
      }

      const payload: ProjectTaskCreatePayload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status.trim() || undefined,
        start_date: form.startDate || undefined,
        due_date: form.dueDate || undefined,
        assigned_to_id: parseOptionalNumber(form.assignedToId),
        parent_task_id: parseOptionalNumber(form.parentTaskId)
      }

      return createProjectTaskRequest(selectedProjectId, payload)
    },
    onSuccess: () => {
      setTaskError(null)
      setNewTaskForm(EMPTY_TASK_FORM)
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'tasks', selectedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'details', selectedProjectId] })
    },
    onError: (error: Error) => {
      setTaskError(error.message || 'Could not create task.')
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      if (!editingTaskId || editingTaskId !== taskId) {
        throw new Error('Pick a task to update.')
      }
      if (!editTaskForm.title.trim()) {
        throw new Error('Task title is required.')
      }

      const payload: ProjectTaskUpdatePayload = {
        title: editTaskForm.title.trim(),
        description: editTaskForm.description.trim() || undefined,
        status: editTaskForm.status.trim() || undefined,
        start_date: editTaskForm.startDate || undefined,
        due_date: editTaskForm.dueDate || undefined,
        completed_date: editTaskForm.completedDate || undefined,
        assigned_to_id: parseOptionalNumber(editTaskForm.assignedToId)
      }

      return updateProjectTaskRequest(taskId, payload)
    },
    onSuccess: () => {
      setTaskError(null)
      setEditingTaskId(null)
      setEditTaskForm(EMPTY_TASK_FORM)
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'tasks', selectedProjectId] })
    },
    onError: (error: Error) => {
      setTaskError(error.message || 'Could not update task.')
    }
  })

  const addMaterialMutation = useMutation({
    mutationFn: async (form: MaterialFormState) => {
      if (!selectedProjectId) {
        throw new Error('Select a project first.')
      }

      const productId = parseRequiredNumber(form.productId, 'Product')
      const quantity = parseRequiredNumber(form.quantity, 'Quantity')
      const unitPrice = parseOptionalNumber(form.unitPrice)

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0.')
      }

      return addProjectMaterialRequest(selectedProjectId, {
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        notes: form.notes.trim() || undefined
      })
    },
    onSuccess: (response) => {
      setResourceError(null)
      setMaterialForm(EMPTY_MATERIAL_FORM)
      setRecentMaterials((prev) => [response, ...prev].slice(0, 15))
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'details', selectedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'financial', selectedProjectId] })
    },
    onError: (error: Error) => {
      setResourceError(error.message || 'Could not add material.')
    }
  })

  const addLabourMutation = useMutation({
    mutationFn: async (form: LabourFormState) => {
      if (!selectedProjectId) {
        throw new Error('Select a project first.')
      }

      const employeeId = parseRequiredNumber(form.employeeId, 'Employee ID')
      const hoursWorked = parseRequiredNumber(form.hoursWorked, 'Hours worked')
      const ratePerHour = parseRequiredNumber(form.ratePerHour, 'Rate per hour')

      if (hoursWorked <= 0) {
        throw new Error('Hours worked must be greater than 0.')
      }
      if (ratePerHour <= 0) {
        throw new Error('Rate per hour must be greater than 0.')
      }
      if (!form.workDate) {
        throw new Error('Work date is required.')
      }

      return addProjectLabourRequest(selectedProjectId, {
        employee_id: employeeId,
        task_id: parseOptionalNumber(form.taskId),
        hours_worked: hoursWorked,
        rate_per_hour: ratePerHour,
        work_date: form.workDate,
        description: form.description.trim() || undefined
      })
    },
    onSuccess: (response) => {
      setResourceError(null)
      setLabourForm(EMPTY_LABOUR_FORM)
      setRecentLabour((prev) => [response, ...prev].slice(0, 15))
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'details', selectedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'financial', selectedProjectId] })
    },
    onError: (error: Error) => {
      setResourceError(error.message || 'Could not add labour.')
    }
  })

  const addExpenseMutation = useMutation({
    mutationFn: async (form: ExpenseFormState) => {
      if (!selectedProjectId) {
        throw new Error('Select a project first.')
      }
      if (!form.category.trim()) {
        throw new Error('Expense category is required.')
      }

      const amount = parseRequiredNumber(form.amount, 'Amount')
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0.')
      }
      if (!form.expenseDate) {
        throw new Error('Expense date is required.')
      }

      return addProjectExpenseRequest(selectedProjectId, {
        category: form.category.trim(),
        amount,
        expense_date: form.expenseDate,
        receipt_url: form.receiptUrl.trim() || undefined,
        description: form.description.trim() || undefined
      })
    },
    onSuccess: (response) => {
      setResourceError(null)
      setExpenseForm(EMPTY_EXPENSE_FORM)
      setRecentExpenses((prev) => [response, ...prev].slice(0, 15))
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'details', selectedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'financial', selectedProjectId] })
    },
    onError: (error: Error) => {
      setResourceError(error.message || 'Could not add expense.')
    }
  })

  const projectsColumns: Column<ProjectSummaryResponse>[] = [
    {
      key: 'name',
      header: 'Project',
      render: (row) => {
        const typeInfo = PROJECT_TYPE_OPTIONS.find(t => t.value === row.project_type)
        const TypeIcon = typeInfo?.icon || FolderIcon
        const statusInfo = PROJECT_STATUS_OPTIONS.find(s => s.value === row.status)
        
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <TypeIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text">{row.name}</p>
              <p className="text-xs text-text-tertiary">{toDisplayLabel(row.project_type)}</p>
            </div>
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const statusInfo = PROJECT_STATUS_OPTIONS.find(s => s.value === row.status)
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusInfo?.color || 'bg-background text-text-tertiary'}`}>
            {row.status === 'completed' && <CheckCircleIcon className="h-3 w-3" />}
            {row.status === 'in_progress' && <ArrowPathIcon className="h-3 w-3" />}
            {row.status === 'on_hold' && <ClockIcon className="h-3 w-3" />}
            {row.status === 'cancelled' && <XCircleIcon className="h-3 w-3" />}
            {toDisplayLabel(row.status)}
          </span>
        )
      }
    },
    {
      key: 'timeline',
      header: 'Timeline',
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <CalendarIcon className="h-4 w-4 text-text-tertiary" />
          <span>{formatDate(row.start_date)}</span>
          <span>-</span>
          <span>{formatDate(row.expected_end_date)}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={`p-2 rounded-lg transition-all ${
              selectedProjectId === row.id
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-primary hover:bg-primary/5'
            }`}
            onClick={() => {
              setSelectedProjectId(row.id)
              setProjectError(null)
              setTaskError(null)
              setResourceError(null)
              setEditingTaskId(null)
              setEditTaskForm(EMPTY_TASK_FORM)
              setActiveTab('details')
            }}
            title="Manage project"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
            onClick={async () => {
              if (await siteDialog.confirm({
                title: `Delete project “${row.name}”?`,
                message: 'This action cannot be undone.',
                confirmLabel: 'Delete project',
                tone: 'danger'
              })) {
                deleteProjectMutation.mutate(row.id)
              }
            }}
            title="Delete project"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  const tasksColumns: Column<ProjectTaskResponse>[] = [
    {
      key: 'title',
      header: 'Task',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            row.status === 'completed' ? 'bg-success' :
            row.status === 'in_progress' ? 'bg-primary' :
            'bg-warning'
          }`} />
          <div>
            <p className="font-medium text-text">{row.title}</p>
            <p className="text-xs text-text-tertiary">ID: {row.id}</p>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
          row.status === 'completed' ? 'bg-success/10 text-success' :
          row.status === 'in_progress' ? 'bg-primary/10 text-primary' :
          'bg-warning/10 text-warning'
        }`}>
          {row.status === 'completed' && <CheckCircleIcon className="h-3 w-3" />}
          {row.status === 'in_progress' && <ArrowPathIcon className="h-3 w-3" />}
          {toDisplayLabel(row.status)}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (row) => (
        <span className="text-sm text-text-secondary">{formatDate(row.due_date)}</span>
      )
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      render: (row) => (
        <span className="text-sm text-text-secondary">User {row.assigned_to_id || '--'}</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            onClick={() => {
              setEditingTaskId(row.id)
              setEditTaskForm({
                title: row.title ?? '',
                description: row.description ?? '',
                status: row.status ?? 'pending',
                startDate: (row.start_date ?? '').slice(0, 10),
                dueDate: (row.due_date ?? '').slice(0, 10),
                completedDate: (row.completed_date ?? '').slice(0, 10),
                assignedToId: row.assigned_to_id ? String(row.assigned_to_id) : '',
                parentTaskId: row.parent_task_id ? String(row.parent_task_id) : ''
              })
            }}
            title="Edit task"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  const onCreateProject = (event: FormEvent) => {
    event.preventDefault()
    setProjectError(null)
    createProjectMutation.mutate(createProjectForm)
  }

  const onUpdateProject = (event: FormEvent) => {
    event.preventDefault()
    setProjectError(null)
    updateProjectMutation.mutate(updateProjectForm)
  }

  const onUploadImages = (event: FormEvent) => {
    event.preventDefault()
    setProjectError(null)
    uploadImagesMutation.mutate()
  }

  const onCreateTask = (event: FormEvent) => {
    event.preventDefault()
    setTaskError(null)
    createTaskMutation.mutate(newTaskForm)
  }

  const onUpdateTask = (event: FormEvent) => {
    event.preventDefault()
    if (!editingTaskId) {
      return
    }
    setTaskError(null)
    updateTaskMutation.mutate(editingTaskId)
  }

  const onAddMaterial = (event: FormEvent) => {
    event.preventDefault()
    setResourceError(null)
    addMaterialMutation.mutate(materialForm)
  }

  const onAddLabour = (event: FormEvent) => {
    event.preventDefault()
    setResourceError(null)
    addLabourMutation.mutate(labourForm)
  }

  const onAddExpense = (event: FormEvent) => {
    event.preventDefault()
    setResourceError(null)
    addExpenseMutation.mutate(expenseForm)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <BuildingOfficeIcon className="h-6 w-6 text-primary" />
              Project Operations
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Create and manage projects, track tasks, and monitor costs
            </p>
          </div>
        </div>
      </motion.div>

      {/* Create Project Form */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PlusIcon className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-text">Create New Project</h2>
          </div>

          <form onSubmit={onCreateProject} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <TextInput
                label="Project Name"
                value={createProjectForm.name}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, name: e.target.value })}
                required
                placeholder="e.g., Luxury Apartment Renovation"
              />
              <TextInput
                label="Client ID"
                type="number"
                min={1}
                value={createProjectForm.clientId}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, clientId: e.target.value })}
                required
                placeholder="Client ID"
              />
              <Select
                label="Project Type"
                options={projectTypeOptions}
                value={createProjectForm.projectType}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, projectType: e.target.value as ProjectType })}
              />
              <Select
                label="Status"
                options={projectStatusOptions}
                value={createProjectForm.status}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, status: e.target.value as ProjectStatus })}
              />
              <Select
                label="Branch"
                options={branchOptions}
                value={createProjectForm.branchId}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, branchId: String(e.target.value) })}
              />
              <TextInput
                label="Project Manager ID"
                type="number"
                min={1}
                value={createProjectForm.projectManagerId}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, projectManagerId: e.target.value })}
                placeholder="Manager ID"
              />
              <TextInput
                label="Start Date"
                type="date"
                value={createProjectForm.startDate}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, startDate: e.target.value })}
              />
              <TextInput
                label="Expected End Date"
                type="date"
                value={createProjectForm.expectedEndDate}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, expectedEndDate: e.target.value })}
              />
              <TextInput
                label="Budget (KES)"
                type="number"
                min={0}
                step="0.01"
                value={createProjectForm.budget}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, budget: e.target.value })}
              />
              <TextInput
                label="Quoted Amount (KES)"
                type="number"
                min={0}
                step="0.01"
                value={createProjectForm.quotedAmount}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, quotedAmount: e.target.value })}
              />
              <TextInput
                label="Deposit Amount (KES)"
                type="number"
                min={0}
                step="0.01"
                value={createProjectForm.depositAmount}
                onChange={(e) => setCreateProjectForm({ ...createProjectForm, depositAmount: e.target.value })}
              />
              <div className="md:col-span-3">
                <TextArea
                  label="Description"
                  value={createProjectForm.description}
                  onChange={(e) => setCreateProjectForm({ ...createProjectForm, description: e.target.value })}
                  placeholder="Project description..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" loading={createProjectMutation.isPending}>
                Create Project
              </Button>
              {projectError && (
                <span className="text-xs text-error flex items-center gap-1">
                  <XCircleIcon className="h-4 w-4" />
                  {projectError}
                </span>
              )}
            </div>
          </form>
        </div>
      </motion.section>

      {/* Projects List */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <FolderIcon className="h-4 w-4 text-primary" />
              Projects
            </h2>
          </div>

          <div className="p-4 border-b border-border bg-background/50">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full h-10 pl-10 pr-4 bg-white border border-border rounded-lg 
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 
                           transition-all text-sm"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              </div>
              <div className="w-full md:w-48">
                <select
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {projectStatusFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => projectsQuery.refetch()}
                  loading={projectsQuery.isFetching}
                  className="h-10"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <DataTable
              columns={projectsColumns}
              data={filteredProjects}
              getRowKey={(row) => row.id}
              emptyState={
                projectsQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                    <p className="text-sm text-text-secondary">Loading projects...</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FolderIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                    <p className="text-sm text-text-secondary">No projects found</p>
                    <p className="text-xs text-text-tertiary mt-1">Create a new project to get started</p>
                  </div>
                )
              }
            />
          </div>
        </div>
      </motion.section>

      {/* Selected Project Management */}
      <AnimatePresence>
        {selectedProjectId && selectedProject && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border-2 border-primary/20 shadow-lg overflow-hidden">
              {/* Project Header */}
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                      {selectedProject.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-text">{selectedProject.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary">ID: {selectedProject.id}</span>
                        <span className="text-xs text-text-tertiary">•</span>
                        <span className="text-xs text-text-tertiary">{toDisplayLabel(selectedProject.project_type)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        projectDetailsQuery.refetch()
                        tasksQuery.refetch()
                        financialsQuery.refetch()
                      }}
                      loading={projectDetailsQuery.isFetching}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedProjectId(null)}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 border-b border-border bg-background/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-tertiary">Budget</p>
                    <p className="text-lg font-bold text-primary">
                      {financialsQuery.data ? formatCurrency(financialsQuery.data.budget) : '--'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-tertiary">Actual Cost</p>
                    <p className="text-lg font-bold text-warning">
                      {financialsQuery.data ? formatCurrency(financialsQuery.data.actual_cost) : '--'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-tertiary">Balance Due</p>
                    <p className="text-lg font-bold text-error">
                      {financialsQuery.data ? formatCurrency(financialsQuery.data.balance_due) : '--'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-tertiary">Profitability</p>
                    <p className={`text-lg font-bold ${
                      (financialsQuery.data?.profitability || 0) >= 0 ? 'text-success' : 'text-error'
                    }`}>
                      {financialsQuery.data?.profitability !== undefined
                        ? `${financialsQuery.data.profitability.toFixed(1)}%`
                        : '--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-border">
                <nav className="flex gap-1 p-2">
                  {[
                    { id: 'details', label: 'Details', icon: DocumentTextIcon },
                    { id: 'tasks', label: 'Tasks', icon: CheckCircleIcon },
                    { id: 'materials', label: 'Materials', icon: CubeIcon },
                    { id: 'labour', label: 'Labour', icon: UserGroupIcon },
                    { id: 'expenses', label: 'Expenses', icon: CurrencyDollarIcon },
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTab === tab.id
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {/* Update Project Form */}
                    <form onSubmit={onUpdateProject} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <TextInput
                          label="Project Name"
                          value={updateProjectForm.name}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, name: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Client ID"
                          type="number"
                          min={1}
                          value={updateProjectForm.clientId}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, clientId: e.target.value })}
                          required
                        />
                        <Select
                          label="Status"
                          options={projectStatusOptions}
                          value={updateProjectForm.status}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, status: e.target.value as ProjectStatus })}
                        />
                        <Select
                          label="Branch"
                          options={branchOptions}
                          value={updateProjectForm.branchId}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, branchId: String(e.target.value) })}
                        />
                        <TextInput
                          label="Project Manager ID"
                          type="number"
                          min={1}
                          value={updateProjectForm.projectManagerId}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, projectManagerId: e.target.value })}
                        />
                        <TextInput
                          label="Start Date"
                          type="date"
                          value={updateProjectForm.startDate}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, startDate: e.target.value })}
                        />
                        <TextInput
                          label="Expected End Date"
                          type="date"
                          value={updateProjectForm.expectedEndDate}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, expectedEndDate: e.target.value })}
                        />
                        <TextInput
                          label="Actual End Date"
                          type="date"
                          value={updateProjectForm.actualEndDate}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, actualEndDate: e.target.value })}
                        />
                        <TextInput
                          label="Budget (KES)"
                          type="number"
                          min={0}
                          step="0.01"
                          value={updateProjectForm.budget}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, budget: e.target.value })}
                        />
                        <TextInput
                          label="Quoted Amount (KES)"
                          type="number"
                          min={0}
                          step="0.01"
                          value={updateProjectForm.quotedAmount}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, quotedAmount: e.target.value })}
                        />
                        <TextInput
                          label="Deposit Amount (KES)"
                          type="number"
                          min={0}
                          step="0.01"
                          value={updateProjectForm.depositAmount}
                          onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, depositAmount: e.target.value })}
                        />
                        <div className="md:col-span-3">
                          <TextArea
                            label="Description"
                            value={updateProjectForm.description}
                            onChange={(e) => setUpdateProjectForm({ ...updateProjectForm, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button type="submit" loading={updateProjectMutation.isPending}>
                          Update Project
                        </Button>
                      </div>
                    </form>

                    {/* Image Upload */}
                    <div className="mt-6 border-t border-border pt-4">
                      <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                        <PhotoIcon className="h-4 w-4 text-primary" />
                        Project Images
                      </h3>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          {(projectDetailsQuery.data?.image_urls ?? []).length > 0 ? (
                            <div className="bg-background rounded-lg p-3 border border-border">
                              <p className="text-xs text-text-tertiary mb-2">
                                {projectDetailsQuery.data?.image_urls?.length || 0} images
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(projectDetailsQuery.data?.image_urls ?? []).map((url) => (
                                  <img
                                    key={url}
                                    src={url}
                                    alt="Project"
                                    className="h-16 w-16 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border-2 border-transparent hover:border-primary"
                                    onClick={() => setPreviewImage(url)}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-text-secondary bg-background rounded-lg p-4 border border-border">
                              No images uploaded yet.
                            </p>
                          )}
                        </div>

                        <div>
                          <form onSubmit={onUploadImages} className="space-y-3">
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-text-secondary">
                                Upload New Images
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                              />
                              {imageFiles.length > 0 && (
                                <p className="text-xs text-text-tertiary">
                                  {imageFiles.length} file(s) selected
                                </p>
                              )}
                            </div>
                            <Button type="submit" loading={uploadImagesMutation.isPending}>
                              Upload Images
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    {/* Create Task Form */}
                    <form onSubmit={onCreateTask} className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Add New Task</h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <TextInput
                          label="Task Title"
                          value={newTaskForm.title}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                          required
                          placeholder="e.g., Site Survey"
                        />
                        <TextInput
                          label="Assigned To ID"
                          type="number"
                          min={1}
                          value={newTaskForm.assignedToId}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, assignedToId: e.target.value })}
                          placeholder="Employee ID"
                        />
                        <TextInput
                          label="Parent Task ID"
                          type="number"
                          min={1}
                          value={newTaskForm.parentTaskId}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, parentTaskId: e.target.value })}
                          placeholder="Parent Task ID"
                        />
                        <TextInput
                          label="Status"
                          value={newTaskForm.status}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, status: e.target.value })}
                          placeholder="pending"
                        />
                        <TextInput
                          label="Start Date"
                          type="date"
                          value={newTaskForm.startDate}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, startDate: e.target.value })}
                        />
                        <TextInput
                          label="Due Date"
                          type="date"
                          value={newTaskForm.dueDate}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                        />
                        <div className="md:col-span-3">
                          <TextArea
                            label="Description"
                            value={newTaskForm.description}
                            onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                            placeholder="Task description..."
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button type="submit" loading={createTaskMutation.isPending}>
                          Add Task
                        </Button>
                        {taskError && (
                          <span className="text-xs text-error">{taskError}</span>
                        )}
                      </div>
                    </form>

                    {/* Tasks List */}
                    <DataTable
                      columns={tasksColumns}
                      data={tasksQuery.data ?? []}
                      getRowKey={(row) => row.id}
                      emptyState={
                        tasksQuery.isLoading ? (
                          <div className="p-4 text-center">
                            <ArrowPathIcon className="h-6 w-6 mx-auto text-primary/30 animate-spin" />
                          </div>
                        ) : (
                          <div className="p-4 text-center text-text-secondary">
                            No tasks yet. Add your first task above.
                          </div>
                        )
                      }
                    />

                    {/* Edit Task Form */}
                    {editingTaskId && (
                      <form onSubmit={onUpdateTask} className="mt-4 bg-primary/5 rounded-lg p-4 border border-primary/20">
                        <h3 className="text-sm font-semibold text-text mb-3">Edit Task #{editingTaskId}</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <TextInput
                            label="Task Title"
                            value={editTaskForm.title}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                            required
                          />
                          <TextInput
                            label="Status"
                            value={editTaskForm.status}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, status: e.target.value })}
                          />
                          <TextInput
                            label="Assigned To ID"
                            type="number"
                            min={1}
                            value={editTaskForm.assignedToId}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, assignedToId: e.target.value })}
                          />
                          <TextInput
                            label="Start Date"
                            type="date"
                            value={editTaskForm.startDate}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, startDate: e.target.value })}
                          />
                          <TextInput
                            label="Due Date"
                            type="date"
                            value={editTaskForm.dueDate}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                          />
                          <TextInput
                            label="Completed Date"
                            type="date"
                            value={editTaskForm.completedDate}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, completedDate: e.target.value })}
                          />
                          <div className="md:col-span-3">
                            <TextArea
                              label="Description"
                              value={editTaskForm.description}
                              onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                              rows={2}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button type="submit" loading={updateTaskMutation.isPending}>
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingTaskId(null)
                              setEditTaskForm(EMPTY_TASK_FORM)
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Materials Tab */}
                {activeTab === 'materials' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Add Material</h3>
                      <form onSubmit={onAddMaterial} className="space-y-3">
                        <Select
                          label="Product"
                          options={productOptions}
                          value={materialForm.productId}
                          onChange={(e) => setMaterialForm({ ...materialForm, productId: String(e.target.value) })}
                          required
                        />
                        <TextInput
                          label="Quantity"
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={materialForm.quantity}
                          onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Unit Price (KES)"
                          type="number"
                          min={0}
                          step="0.01"
                          value={materialForm.unitPrice}
                          onChange={(e) => setMaterialForm({ ...materialForm, unitPrice: e.target.value })}
                        />
                        <TextArea
                          label="Notes"
                          value={materialForm.notes}
                          onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })}
                          rows={2}
                        />
                        <Button type="submit" loading={addMaterialMutation.isPending}>
                          Add Material
                        </Button>
                      </form>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Recent Materials</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {visibleRecentMaterials.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg p-2 border border-border text-xs">
                            <div className="flex justify-between">
                              <span className="font-medium">Product #{item.product_id}</span>
                              <span className="text-primary">{formatCurrency(item.total_price)}</span>
                            </div>
                            <p className="text-text-tertiary mt-1">
                              Qty: {item.quantity} • Unit: {formatCurrency(item.unit_price || 0)}
                            </p>
                          </div>
                        ))}
                        {visibleRecentMaterials.length === 0 && (
                          <p className="text-sm text-text-secondary text-center py-4">
                            No materials added yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Labour Tab */}
                {activeTab === 'labour' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Add Labour</h3>
                      <form onSubmit={onAddLabour} className="space-y-3">
                        <TextInput
                          label="Employee ID"
                          type="number"
                          min={1}
                          value={labourForm.employeeId}
                          onChange={(e) => setLabourForm({ ...labourForm, employeeId: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Task ID"
                          type="number"
                          min={1}
                          value={labourForm.taskId}
                          onChange={(e) => setLabourForm({ ...labourForm, taskId: e.target.value })}
                        />
                        <TextInput
                          label="Hours Worked"
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={labourForm.hoursWorked}
                          onChange={(e) => setLabourForm({ ...labourForm, hoursWorked: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Rate Per Hour (KES)"
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={labourForm.ratePerHour}
                          onChange={(e) => setLabourForm({ ...labourForm, ratePerHour: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Work Date"
                          type="date"
                          value={labourForm.workDate}
                          onChange={(e) => setLabourForm({ ...labourForm, workDate: e.target.value })}
                          required
                        />
                        <TextArea
                          label="Description"
                          value={labourForm.description}
                          onChange={(e) => setLabourForm({ ...labourForm, description: e.target.value })}
                          rows={2}
                        />
                        <Button type="submit" loading={addLabourMutation.isPending}>
                          Add Labour
                        </Button>
                      </form>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Recent Labour</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {visibleRecentLabour.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg p-2 border border-border text-xs">
                            <div className="flex justify-between">
                              <span className="font-medium">Employee #{item.employee_id}</span>
                              <span className="text-primary">{formatCurrency(item.total_cost)}</span>
                            </div>
                            <p className="text-text-tertiary mt-1">
                              {item.hours_worked}h @ {formatCurrency(item.rate_per_hour)}/hr
                            </p>
                          </div>
                        ))}
                        {visibleRecentLabour.length === 0 && (
                          <p className="text-sm text-text-secondary text-center py-4">
                            No labour entries added yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Expenses Tab */}
                {activeTab === 'expenses' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Add Expense</h3>
                      <form onSubmit={onAddExpense} className="space-y-3">
                        <TextInput
                          label="Category"
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                          required
                          placeholder="e.g., Transport, Equipment"
                        />
                        <TextInput
                          label="Amount (KES)"
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Expense Date"
                          type="date"
                          value={expenseForm.expenseDate}
                          onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                          required
                        />
                        <TextInput
                          label="Receipt URL"
                          value={expenseForm.receiptUrl}
                          onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })}
                          placeholder="https://..."
                        />
                        <TextArea
                          label="Description"
                          value={expenseForm.description}
                          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          rows={2}
                        />
                        <Button type="submit" loading={addExpenseMutation.isPending}>
                          Add Expense
                        </Button>
                      </form>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-semibold text-text mb-3">Recent Expenses</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {visibleRecentExpenses.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg p-2 border border-border text-xs">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.category}</span>
                              <span className="text-primary">{formatCurrency(item.amount)}</span>
                            </div>
                            <p className="text-text-tertiary mt-1">
                              {formatDate(item.expense_date)}
                            </p>
                          </div>
                        ))}
                        {visibleRecentExpenses.length === 0 && (
                          <p className="text-sm text-text-secondary text-center py-4">
                            No expenses added yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resource Error */}
              {resourceError && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-error flex items-center gap-1">
                    <XCircleIcon className="h-4 w-4" />
                    {resourceError}
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] rounded-lg"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectsOperationsPage
