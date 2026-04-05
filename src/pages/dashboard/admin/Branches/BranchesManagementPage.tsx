import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button, Checkbox, DataTable, Select, TextInput, type Column } from '@components/common'
import {
  assignBranchManagerRequest,
  createBranchRequest,
  deleteBranchRequest,
  getBranchRequest,
  listBranchesRequest,
  updateBranchRequest,
  type BranchResponse
} from '@api/modules/branches.api'
import { listUsersRequest } from '@api/modules/users.api'

type BranchFormState = {
  name: string
  code: string
  location: string
  managerUserId: string
  isActive: boolean
  isOnlineShopSource: boolean
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
}

type ApiErrorItem = {
  message?: string
}

type ApiErrorResponse = {
  message?: string
  detail?: string | Array<{ msg?: string }>
  errors?: ApiErrorItem[]
}

const createEmptyBranchForm = (): BranchFormState => ({
  name: '',
  code: '',
  location: '',
  managerUserId: '',
  isActive: true,
  isOnlineShopSource: false
})

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleString()
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback
  }

  const responseData = error.response?.data as string | ApiErrorResponse | undefined

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData
  }

  if (typeof responseData === 'object' && responseData) {
    if (typeof responseData.message === 'string' && responseData.message.trim()) {
      return responseData.message
    }

    if (typeof responseData.detail === 'string' && responseData.detail.trim()) {
      return responseData.detail
    }

    if (Array.isArray(responseData.detail) && responseData.detail.length > 0) {
      const joinedDetails = responseData.detail
        .map((item) => item?.msg)
        .filter((message): message is string => Boolean(message))
        .join('; ')

      if (joinedDetails) {
        return joinedDetails
      }
    }

    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      const joinedErrors = responseData.errors
        .map((item) => item?.message)
        .filter((message): message is string => Boolean(message))
        .join('; ')

      if (joinedErrors) {
        return joinedErrors
      }
    }
  }

  if (error.response?.status) {
    return `Request failed with status code ${error.response.status}`
  }

  return error.message || fallback
}

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

const BranchesManagementPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [branchForm, setBranchForm] = useState<BranchFormState>(createEmptyBranchForm())
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<BranchResponse | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const branchesQuery = useQuery({
    queryKey: ['branches', 'management', includeDeleted],
    queryFn: () => listBranchesRequest({ include_deleted: includeDeleted })
  })

  const usersQuery = useQuery({
    queryKey: ['users', 'branch-managers'],
    queryFn: () => listUsersRequest({ limit: 100 })
  })

  const editingBranch = useMemo(
    () => (branchesQuery.data ?? []).find((branch) => branch.id === editingBranchId) ?? null,
    [branchesQuery.data, editingBranchId]
  )

  const managerOptions = useMemo(
    () => [
      {
        label: editingBranch?.manager_name ? 'Keep current manager' : 'No manager selected',
        value: ''
      },
      ...((usersQuery.data ?? []).map((user) => ({
        label: user.full_name?.trim()
          ? `${user.full_name} (${user.email})`
          : `${user.username} (${user.email})`,
        value: String(user.id)
      })) || [])
    ],
    [editingBranch?.manager_name, usersQuery.data]
  )

  const filteredBranches = useMemo(() => {
    const branches = branchesQuery.data ?? []
    const query = search.trim().toLowerCase()

    if (!query) {
      return branches
    }

    return branches.filter((branch) => {
      return (
        branch.name.toLowerCase().includes(query) ||
        branch.code.toLowerCase().includes(query) ||
        (branch.location ?? '').toLowerCase().includes(query) ||
        (branch.manager_name ?? '').toLowerCase().includes(query)
      )
    })
  }, [branchesQuery.data, search])

  const stats = useMemo(() => {
    const branches = branchesQuery.data ?? []

    return {
      total: branches.length,
      active: branches.filter((branch) => branch.is_active !== false).length,
      inactive: branches.filter((branch) => branch.is_active === false).length,
      onlineSources: branches.filter((branch) => branch.is_online_shop_source).length,
      managed: branches.filter((branch) => Boolean(branch.manager_user_id)).length
    }
  }, [branchesQuery.data])

  const saveBranchMutation = useMutation({
    mutationFn: async (payload: BranchFormState) => {
      const name = payload.name.trim()
      const code = payload.code.trim().toUpperCase()
      const location = payload.location.trim() || undefined
      const managerUserId = parseOptionalNumber(payload.managerUserId)

      if (name.length < 2) {
        throw new Error('Branch name must be at least 2 characters.')
      }

      if (code.length < 2) {
        throw new Error('Branch code must be at least 2 characters.')
      }

      if (editingBranchId !== null) {
        await updateBranchRequest(editingBranchId, {
          name,
          code,
          location,
          is_active: payload.isActive,
          is_online_shop_source: payload.isOnlineShopSource
        })

        if (
          managerUserId &&
          managerUserId !== (editingBranch?.manager_user_id ?? undefined)
        ) {
          await assignBranchManagerRequest(editingBranchId, { user_id: managerUserId })
        }

        return getBranchRequest(editingBranchId, { include_deleted: true })
      }

      return createBranchRequest({
        name,
        code,
        location,
        is_active: payload.isActive,
        is_online_shop_source: payload.isOnlineShopSource,
        manager_user_id: managerUserId
      })
    },
    onSuccess: (branch) => {
      setFeedback({
        type: 'success',
        message:
          editingBranchId !== null
            ? `Branch "${branch.name}" updated.`
            : `Branch "${branch.name}" created.`
      })
      setBranchForm(createEmptyBranchForm())
      setEditingBranchId(null)
      setIsFormVisible(false)
      setTimeout(() => setFeedback(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to save branch.'
      })
    }
  })

  const deleteBranchMutation = useMutation({
    mutationFn: (branchId: number) => deleteBranchRequest(branchId),
    onSuccess: () => {
      setFeedback({
        type: 'success',
        message: 'Branch deleted.'
      })
      setDeleteErrorMessage(null)
      setDeleteCandidate(null)
      setTimeout(() => setFeedback(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    onError: (error: unknown) => {
      const message = extractApiErrorMessage(error, 'Failed to delete branch.')
      setDeleteErrorMessage(message)
      setFeedback({
        type: 'error',
        message
      })
    }
  })

  const onSubmitBranch = (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    saveBranchMutation.mutate(branchForm)
  }

  const onEditBranch = (branch: BranchResponse) => {
    setEditingBranchId(branch.id)
    setBranchForm({
      name: branch.name,
      code: branch.code,
      location: branch.location ?? '',
      managerUserId: '',
      isActive: branch.is_active !== false,
      isOnlineShopSource: Boolean(branch.is_online_shop_source)
    })
    setIsFormVisible(true)
    setFeedback(null)
  }

  const openDeleteModal = (branch: BranchResponse) => {
    setDeleteErrorMessage(null)
    setDeleteCandidate(branch)
  }

  const branchColumns: Column<BranchResponse>[] = [
    {
      key: 'name',
      header: 'Branch',
      render: (branch) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <BuildingStorefrontIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-text">{branch.name}</p>
            <p className="text-xs text-text-tertiary">Code: {branch.code}</p>
          </div>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (branch) => (
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <MapPinIcon className="h-4 w-4 text-text-tertiary" />
          {branch.location ?? 'No location'}
        </span>
      )
    },
    {
      key: 'manager_name',
      header: 'Manager',
      render: (branch) => (
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <UserIcon className="h-4 w-4 text-text-tertiary" />
          {branch.manager_name ?? 'No manager'}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (branch) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            branch.is_active !== false
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {branch.is_active !== false ? (
            <CheckCircleIcon className="h-3 w-3" />
          ) : (
            <XCircleIcon className="h-3 w-3" />
          )}
          {branch.is_active !== false ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'is_online_shop_source',
      header: 'Online Source',
      render: (branch) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            branch.is_online_shop_source
              ? 'bg-secondary/10 text-secondary'
              : 'bg-background text-text-tertiary'
          }`}
        >
          <GlobeAltIcon className="h-3 w-3" />
          {branch.is_online_shop_source ? 'Enabled' : 'Disabled'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (branch) => (
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <ClockIcon className="h-4 w-4 text-text-tertiary" />
          {formatDateTime(branch.created_at)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (branch) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="!px-3 !py-2"
            onClick={() => onEditBranch(branch)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="!border-error/20 !px-3 !py-2 !text-error hover:!bg-error/5"
            onClick={() => openDeleteModal(branch)}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
            <BuildingStorefrontIcon className="h-6 w-6 text-primary" />
            Branches
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage branch locations, online sources, and branch managers
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingBranchId(null)
            setBranchForm(createEmptyBranchForm())
            setIsFormVisible((current) => !current)
            setFeedback(null)
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white"
        >
          <PlusIcon className="h-4 w-4" />
          {isFormVisible ? 'Close Branch Form' : 'New Branch'}
        </Button>
      </motion.div>

      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        {[
          {
            label: 'Total Branches',
            value: stats.total,
            color: 'text-primary',
            bg: 'bg-primary/10',
            icon: BuildingStorefrontIcon
          },
          {
            label: 'Active',
            value: stats.active,
            color: 'text-success',
            bg: 'bg-success/10',
            icon: CheckCircleIcon
          },
          {
            label: 'Inactive',
            value: stats.inactive,
            color: 'text-error',
            bg: 'bg-error/10',
            icon: XCircleIcon
          },
          {
            label: 'Online Sources',
            value: stats.onlineSources,
            color: 'text-secondary',
            bg: 'bg-secondary/10',
            icon: GlobeAltIcon
          },
          {
            label: 'With Managers',
            value: stats.managed,
            color: 'text-accent',
            bg: 'bg-accent/10',
            icon: UserIcon
          }
        ].map((stat) => {
          const Icon = stat.icon

          return (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.section>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 rounded-xl border p-4 ${
              feedback.type === 'success'
                ? 'border-success/20 bg-success/5 text-success'
                : 'border-error/20 bg-error/5 text-error'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {feedback.type === 'success' ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <XCircleIcon className="h-4 w-4" />
              )}
              {feedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormVisible && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    {editingBranchId !== null ? 'Edit Branch' : 'Create Branch'}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Keep branch details and manager assignment aligned with your backend
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-text-tertiary transition hover:bg-background hover:text-text"
                  onClick={() => {
                    setIsFormVisible(false)
                    setEditingBranchId(null)
                    setBranchForm(createEmptyBranchForm())
                  }}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={onSubmitBranch} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Branch Name"
                    value={branchForm.name}
                    onChange={(event) =>
                      setBranchForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Main Branch"
                  />
                  <TextInput
                    label="Code"
                    value={branchForm.code}
                    onChange={(event) =>
                      setBranchForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                    }
                    placeholder="MAIN"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Location"
                    value={branchForm.location}
                    onChange={(event) =>
                      setBranchForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    placeholder="Nairobi CBD"
                  />
                  <Select
                    label="Branch Manager"
                    value={branchForm.managerUserId}
                    onChange={(event) =>
                      setBranchForm((prev) => ({ ...prev, managerUserId: String(event.target.value) }))
                    }
                    options={managerOptions}
                    helperText={
                      editingBranch?.manager_name
                        ? `Current manager: ${editingBranch.manager_name}. Leave blank to keep current manager.`
                        : 'Optional when creating a branch.'
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-background px-4 py-3">
                  <Checkbox
                    label="Branch is active"
                    checked={branchForm.isActive}
                    onChange={(event) =>
                      setBranchForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                  />
                  <Checkbox
                    label="Use as online shop source"
                    checked={branchForm.isOnlineShopSource}
                    onChange={(event) =>
                      setBranchForm((prev) => ({
                        ...prev,
                        isOnlineShopSource: event.target.checked
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" loading={saveBranchMutation.isPending}>
                    {editingBranchId !== null ? 'Save Branch' : 'Create Branch'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormVisible(false)
                      setEditingBranchId(null)
                      setBranchForm(createEmptyBranchForm())
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">Branches List</h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Search branch records, review manager assignments, and control active status
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextInput
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by branch, code, location, manager"
                className="min-w-[280px]"
              />
              <div className="rounded-lg border border-border bg-background px-4 py-2.5">
                <Checkbox
                  label="Include deleted"
                  checked={includeDeleted}
                  onChange={(event) => setIncludeDeleted(event.target.checked)}
                />
              </div>
            </div>
          </div>
        </div>

        <DataTable
          columns={branchColumns}
          data={filteredBranches}
          getRowKey={(branch) => branch.id}
          emptyState={
            branchesQuery.isLoading ? (
              <div className="p-8 text-center">
                <ArrowPathIcon className="mx-auto mb-3 h-8 w-8 animate-spin text-primary/30" />
                <p className="text-sm text-text-secondary">Loading branches...</p>
              </div>
            ) : branchesQuery.isError ? (
              <div className="p-8 text-center">
                <XCircleIcon className="mx-auto mb-3 h-10 w-10 text-error/40" />
                <p className="text-sm text-error">Could not load branches.</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <BuildingStorefrontIcon className="mx-auto mb-3 h-12 w-12 text-text-tertiary/30" />
                <p className="text-sm text-text-secondary">No branches found</p>
              </div>
            )
          }
        />
      </section>

      <AnimatePresence>
        {deleteCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!deleteBranchMutation.isPending) {
                setDeleteCandidate(null)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border bg-gradient-to-r from-error/10 via-white to-warning/10 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 ring-1 ring-error/15">
                    <ExclamationTriangleIcon className="h-7 w-7 text-error" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-error">
                      Delete Branch
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-text">Remove this branch?</h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      You are about to delete{' '}
                      <span className="font-semibold text-text">{deleteCandidate.name}</span>. Make
                      sure no dependent records still rely on this branch.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {deleteErrorMessage ? (
                  <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3">
                    <p className="text-sm font-medium text-error">{deleteErrorMessage}</p>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-text-tertiary">Branch Code</p>
                    <p className="mt-1 font-semibold text-text">{deleteCandidate.code}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-text-tertiary">Manager</p>
                    <p className="mt-1 font-semibold text-text">
                      {deleteCandidate.manager_name ?? 'No manager'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteCandidate(null)}
                  disabled={deleteBranchMutation.isPending}
                >
                  Keep Branch
                </Button>
                <Button
                  type="button"
                  className="bg-error text-white hover:bg-error-dark"
                  loading={deleteBranchMutation.isPending}
                  onClick={() => {
                    setDeleteErrorMessage(null)
                    deleteBranchMutation.mutate(deleteCandidate.id)
                  }}
                >
                  Delete Branch
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BranchesManagementPage
