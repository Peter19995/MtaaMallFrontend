import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  TagIcon,
  ClockIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button, DataTable, Select, TextArea, TextInput, type Column } from '@components/common'
import { useConfirmDialog } from '@contexts/ConfirmDialogContext'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  createPaymentModeRequest,
  deletePaymentModeRequest,
  listPaymentModesRequest,
  updatePaymentModeRequest,
  type PaymentModeResponse
} from '@api/modules/pos.api'
import { AppTheme, withOpacity } from '@constants/theme'

type PaymentModeFormState = {
  name: string
  code: string
  description: string
  branchId: string
  isActive: boolean
  isDefault: boolean
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
}

const createEmptyPaymentModeForm = (branchId = ''): PaymentModeFormState => ({
  name: '',
  code: '',
  description: '',
  branchId,
  isActive: true,
  isDefault: false
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

const PaymentModesPage = () => {
  const confirm = useConfirmDialog()
  const queryClient = useQueryClient()
  const [branchId, setBranchId] = useState('')
  const [search, setSearch] = useState('')
  const [paymentModeForm, setPaymentModeForm] = useState<PaymentModeFormState>(
    createEmptyPaymentModeForm()
  )
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingPaymentModeId, setEditingPaymentModeId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const branchIdNumber = useMemo(() => parseOptionalNumber(branchId), [branchId])

  const branchesQuery = useQuery({
    queryKey: ['branches', 'payment-modes'],
    queryFn: listBranchesRequest
  })

  const paymentModesQuery = useQuery({
    queryKey: ['pos', 'payment-modes', branchIdNumber],
    queryFn: () =>
      listPaymentModesRequest({
        branch_id: branchIdNumber,
        include_inactive: true
      })
  })

  const branchOptions = useMemo(
    () => [
      { label: 'All branches', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const formBranchOptions = useMemo(
    () => [
      { label: 'Use global/default branch', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const filteredModes = useMemo(() => {
    const modes = paymentModesQuery.data ?? []
    const query = search.trim().toLowerCase()
    if (!query) {
      return modes
    }

    return modes.filter((mode) => {
      return (
        mode.name.toLowerCase().includes(query) ||
        mode.code.toLowerCase().includes(query) ||
        (mode.branch_name ?? '').toLowerCase().includes(query)
      )
    })
  }, [paymentModesQuery.data, search])

  // Summary stats
  const stats = useMemo(() => {
    const modes = paymentModesQuery.data ?? []
    return {
      total: modes.length,
      active: modes.filter(m => m.is_active).length,
      inactive: modes.filter(m => !m.is_active).length,
      default: modes.filter(m => m.is_default).length
    }
  }, [paymentModesQuery.data])

  const savePaymentModeMutation = useMutation({
    mutationFn: async (payload: PaymentModeFormState) => {
      const name = payload.name.trim()
      const code = payload.code.trim().toLowerCase()

      if (name.length < 2) {
        throw new Error('Payment mode name must be at least 2 characters.')
      }
      if (code.length < 2) {
        throw new Error('Payment mode code must be at least 2 characters.')
      }

      if (editingPaymentModeId !== null) {
        return updatePaymentModeRequest(editingPaymentModeId, {
          name,
          code,
          description: payload.description.trim() || undefined,
          is_active: payload.isActive,
          is_default: payload.isDefault
        })
      }

      return createPaymentModeRequest({
        name,
        code,
        description: payload.description.trim() || undefined,
        is_active: payload.isActive,
        is_default: payload.isDefault,
        branch_id: parseOptionalNumber(payload.branchId)
      })
    },
    onSuccess: (mode) => {
      setFeedback({
        type: 'success',
        message:
          editingPaymentModeId !== null
            ? `Payment mode "${mode.name}" updated.`
            : `Payment mode "${mode.name}" created.`
      })
      setEditingPaymentModeId(null)
      setPaymentModeForm(createEmptyPaymentModeForm(branchId))
      setIsFormVisible(false)
      queryClient.invalidateQueries({ queryKey: ['pos', 'payment-modes'] })
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to save payment mode.'
      })
    }
  })

  const togglePaymentModeMutation = useMutation({
    mutationFn: (input: { modeId: number; isActive?: boolean; isDefault?: boolean }) =>
      updatePaymentModeRequest(input.modeId, {
        is_active: input.isActive,
        is_default: input.isDefault
      }),
    onSuccess: (mode) => {
      setFeedback({
        type: 'success',
        message: `Payment mode "${mode.name}" updated.`
      })
      queryClient.invalidateQueries({ queryKey: ['pos', 'payment-modes'] })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to update payment mode.'
      })
    }
  })

  const deletePaymentModeMutation = useMutation({
    mutationFn: (modeId: number) => deletePaymentModeRequest(modeId),
    onSuccess: () => {
      setFeedback({
        type: 'success',
        message: 'Payment mode deleted.'
      })
      queryClient.invalidateQueries({ queryKey: ['pos', 'payment-modes'] })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to delete payment mode.'
      })
    }
  })

  const onSavePaymentMode = (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    savePaymentModeMutation.mutate(paymentModeForm)
  }

  const onEditPaymentMode = (mode: PaymentModeResponse) => {
    setIsFormVisible(true)
    setEditingPaymentModeId(mode.id)
    setPaymentModeForm({
      name: mode.name,
      code: mode.code,
      description: mode.description ?? '',
      branchId: String(mode.branch_id),
      isActive: mode.is_active,
      isDefault: mode.is_default
    })
  }

  const onOpenCreatePaymentMode = () => {
    setEditingPaymentModeId(null)
    setPaymentModeForm(createEmptyPaymentModeForm(branchId))
    setIsFormVisible(true)
  }

  const onClosePaymentModeForm = () => {
    setEditingPaymentModeId(null)
    setPaymentModeForm(createEmptyPaymentModeForm(branchId))
    setIsFormVisible(false)
  }

  const onDeletePaymentMode = async (mode: PaymentModeResponse) => {
    const confirmed = await confirm({ title: 'Delete payment mode?', message: `Delete payment mode "${mode.name}"? This action cannot be undone.` })
    if (!confirmed) {
      return
    }
    deletePaymentModeMutation.mutate(mode.id)
  }

  const columns: Array<Column<PaymentModeResponse>> = [
    {
      key: 'name',
      header: 'Payment Mode',
      render: (mode) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <BanknotesIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-text flex items-center gap-2">
              {mode.name}
              {mode.is_default && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <CheckCircleSolid className="h-3 w-3" />
                  Default
                </span>
              )}
            </p>
            <p className="text-xs text-text-tertiary">Code: {mode.code}</p>
          </div>
        </div>
      )
    },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (mode) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BuildingStorefrontIcon className="h-3 w-3" />
          {mode.branch_name ?? `Branch #${mode.branch_id}`}
        </span>
      )
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: (mode) => (
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <ClockIcon className="h-4 w-4 text-text-tertiary" />
          {formatDateTime(mode.updated_at ?? mode.created_at)}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (mode) => (
        <div className="flex gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              mode.is_active
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            }`}
          >
            {mode.is_active ? (
              <>
                <CheckCircleIcon className="h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <XCircleIcon className="h-3 w-3" />
                Inactive
              </>
            )}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (mode) => {
        const isTogglingCurrent =
          togglePaymentModeMutation.isPending && togglePaymentModeMutation.variables?.modeId === mode.id
        const isDeletingCurrent =
          deletePaymentModeMutation.isPending && deletePaymentModeMutation.variables === mode.id

        return (
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
              onClick={() => onEditPaymentMode(mode)}
              title="Edit payment mode"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-warning hover:bg-warning/5 rounded-lg transition-all"
              onClick={() =>
                togglePaymentModeMutation.mutate({
                  modeId: mode.id,
                  isActive: !mode.is_active
                })
              }
              disabled={isTogglingCurrent}
              title={mode.is_active ? 'Deactivate' : 'Activate'}
            >
              {mode.is_active ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
              onClick={() =>
                togglePaymentModeMutation.mutate({
                  modeId: mode.id,
                  isDefault: !mode.is_default
                })
              }
              disabled={isTogglingCurrent}
              title={mode.is_default ? 'Remove default' : 'Set as default'}
            >
              <TagIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
              onClick={() => onDeletePaymentMode(mode)}
              disabled={isDeletingCurrent}
              title="Delete payment mode"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <BanknotesIcon className="h-6 w-6 text-primary" />
              Payment Modes
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage payment methods across all branches
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BanknotesIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Modes</p>
              <p className="text-lg font-bold text-primary">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Active</p>
              <p className="text-lg font-bold text-success">{stats.active}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/10 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Inactive</p>
              <p className="text-lg font-bold text-error">{stats.inactive}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TagIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Default</p>
              <p className="text-lg font-bold text-accent">{stats.default}</p>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Filters Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Branch Filter */}
            <div className="w-full lg:w-64">
              <Select
                label="Branch Filter"
                options={branchOptions}
                value={branchId}
                onChange={(event) => setBranchId(String(event.target.value))}
                className="h-10"
              />
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, or branch..."
                className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg 
                         focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 
                         transition-all text-sm"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => paymentModesQuery.refetch()}
                loading={paymentModesQuery.isFetching}
                className="h-10"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Create Button */}
            <div className="flex items-end">
              {!isFormVisible ? (
                <Button
                  onClick={onOpenCreatePaymentMode}
                  className="h-10 flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  <PlusIcon className="h-4 w-4" />
                  New Payment Mode
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onClosePaymentModeForm}
                  className="h-10"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Close Form
                </Button>
              )}
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="mt-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              Advanced Filters
              {showAdvancedFilters ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3 pt-3 border-t border-border"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Status
                    </label>
                    <Select options={['All Statuses', 'Active Only', 'Inactive Only'].map((label) => ({ label, value: label }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Default Status
                    </label>
                    <Select options={['All', 'Default Only', 'Non-default'].map((label) => ({ label, value: label }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Sort By
                    </label>
                    <Select options={['Name (A-Z)', 'Name (Z-A)', 'Recently Updated', 'Oldest First'].map((label) => ({ label, value: label }))} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Form Section */}
      <AnimatePresence>
        {isFormVisible && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border-2 border-primary/20 p-4 shadow-lg">
              <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                <BanknotesIcon className="h-4 w-4 text-primary" />
                {editingPaymentModeId !== null ? 'Edit Payment Mode' : 'Create New Payment Mode'}
              </h2>

              <form onSubmit={onSavePaymentMode} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <TextInput
                    label="Payment Mode Name"
                    value={paymentModeForm.name}
                    onChange={(e) => setPaymentModeForm({ ...paymentModeForm, name: e.target.value })}
                    required
                    placeholder="e.g., Cash, M-Pesa, Credit Card"
                  />
                  <TextInput
                    label="Code"
                    value={paymentModeForm.code}
                    onChange={(e) => setPaymentModeForm({ ...paymentModeForm, code: e.target.value })}
                    required
                    placeholder="e.g., cash, mpesa, cc"
                  />
                  <Select
                    label="Branch"
                    options={formBranchOptions}
                    value={paymentModeForm.branchId}
                    onChange={(e) => setPaymentModeForm({ ...paymentModeForm, branchId: String(e.target.value) })}
                    disabled={editingPaymentModeId !== null}
                  />
                </div>

                <TextArea
                  label="Description (Optional)"
                  rows={4}
                  value={paymentModeForm.description}
                  onChange={(e) => setPaymentModeForm({ ...paymentModeForm, description: e.target.value })}
                  placeholder="Brief description of this payment mode"
                />

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentModeForm.isActive}
                      onChange={(e) => setPaymentModeForm({ ...paymentModeForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-text-secondary">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentModeForm.isDefault}
                      onChange={(e) => setPaymentModeForm({ ...paymentModeForm, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-text-secondary">Set as default</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" loading={savePaymentModeMutation.isPending}>
                    {editingPaymentModeId !== null ? 'Update Payment Mode' : 'Create Payment Mode'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClosePaymentModeForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-error/10 border border-error/20 text-error'
                : 'bg-success/10 border border-success/20 text-success'
            }`}
          >
            {feedback.type === 'error' ? (
              <XCircleIcon className="h-4 w-4 flex-shrink-0" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
            )}
            <p className="text-sm">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modes Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4 text-primary" />
              Payment Modes List
            </h2>
            {paymentModesQuery.isFetching && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>

          {paymentModesQuery.isError ? (
            <div className="p-8 text-center">
              <XCircleIcon className="h-12 w-12 mx-auto text-error/30 mb-3" />
              <p className="text-sm text-error">Could not load payment modes.</p>
              <Button
                variant="outline"
                onClick={() => paymentModesQuery.refetch()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredModes}
              getRowKey={(mode) => mode.id}
              emptyState={
                paymentModesQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                    <p className="text-sm text-text-secondary">Loading payment modes...</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <BanknotesIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                    <p className="text-sm text-text-secondary">No payment modes found</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {branchId ? 'Try changing the branch filter' : 'Create your first payment mode'}
                    </p>
                  </div>
                )
              }
            />
          )}
        </div>
      </motion.section>
    </div>
  )
}

export default PaymentModesPage
