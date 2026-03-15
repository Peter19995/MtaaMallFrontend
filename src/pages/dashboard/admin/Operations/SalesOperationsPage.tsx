import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PlusIcon,
  ShoppingBagIcon,
  XCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
  ClockIcon,
  TagIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button, DataTable, Select, TextInput, type Column } from '@components/common'
import {
  getBranchOperationsSummaryRequest,
  listBranchesRequest
} from '@api/modules/branches.api'
import {
  getDailySalesRequest,
  getSalesSummaryRequest,
  type DailySalesPoint
} from '@api/modules/reports.api'
import {
  cancelPosSaleRequest,
  getDailyPosSummaryRequest,
  getPosSaleRequest,
  listPosSalesRequest,
  refundPosSaleRequest,
  updatePosSaleStatusRequest,
  type PosSaleResponse
} from '@api/modules/pos.api'
import { AppTheme, withOpacity } from '@constants/theme'

type FeedbackState = {
  type: 'success' | 'error'
  message: string
}

const COMMON_POS_STATUSES = ['pending', 'completed', 'cancelled', 'refunded']
const today = new Date().toISOString().slice(0, 10)

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const formatDate = (value: string): string => new Date(value).toLocaleDateString()

const formatDateTime = (value: string): string => new Date(value).toLocaleString()

const toDisplayLabel = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
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

const SalesOperationsPage = () => {
  const queryClient = useQueryClient()
  const [branchId, setBranchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerIdFilter, setCustomerIdFilter] = useState('')
  const [dailySummaryDate, setDailySummaryDate] = useState(today)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [statusBySaleId, setStatusBySaleId] = useState<Record<number, string>>({})

  const branchIdNumber = useMemo(
    () => (branchId ? Number(branchId) : undefined),
    [branchId]
  )

  const reportParams = useMemo(
    () => ({
      branch_id: branchIdNumber,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    }),
    [branchIdNumber, startDate, endDate]
  )

  const posFilters = useMemo(
    () => ({
      branch_id: branchIdNumber,
      status: statusFilter || undefined,
      date_from: startDate || undefined,
      date_to: endDate || undefined,
      customer_id: parseOptionalNumber(customerIdFilter),
      skip: 0,
      limit: 100
    }),
    [branchIdNumber, statusFilter, startDate, endDate, customerIdFilter]
  )

  const branchesQuery = useQuery({
    queryKey: ['branches', 'operations'],
    queryFn: listBranchesRequest
  })

  const summaryQuery = useQuery({
    queryKey: ['reports', 'summary', reportParams],
    queryFn: () => getSalesSummaryRequest(reportParams)
  })

  const dailySalesQuery = useQuery({
    queryKey: ['reports', 'daily-sales', reportParams],
    queryFn: () => getDailySalesRequest(reportParams)
  })

  const branchOperationsQuery = useQuery({
    queryKey: ['branches', 'operations', 'summary', branchIdNumber],
    queryFn: () => getBranchOperationsSummaryRequest(branchIdNumber as number),
    enabled: Boolean(branchIdNumber)
  })

  const posSalesQuery = useQuery({
    queryKey: ['pos', 'sales', posFilters],
    queryFn: () => listPosSalesRequest(posFilters)
  })

  const dailyPosSummaryQuery = useQuery({
    queryKey: ['pos', 'daily-summary', branchIdNumber, dailySummaryDate],
    queryFn: () =>
      getDailyPosSummaryRequest({
        branch_id: branchIdNumber,
        summary_date: dailySummaryDate || undefined
      })
  })

  const selectedSaleQuery = useQuery({
    queryKey: ['pos', 'sales', 'detail', selectedSaleId, branchIdNumber],
    queryFn: () =>
      getPosSaleRequest(selectedSaleId as number, {
        branch_id: branchIdNumber
      }),
    enabled: selectedSaleId !== null
  })

  useEffect(() => {
    const sales = posSalesQuery.data ?? []
    if (sales.length === 0) {
      return
    }

    setStatusBySaleId((previous) => {
      const next: Record<number, string> = {}

      sales.forEach((sale) => {
        next[sale.id] = previous[sale.id] ?? sale.status
      })

      return next
    })
  }, [posSalesQuery.data])

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

  // Filter sales by search term
  const filteredSales = useMemo(() => {
    const sales = posSalesQuery.data ?? []
    if (!searchTerm.trim()) return sales
    
    const term = searchTerm.toLowerCase()
    return sales.filter(sale => 
      sale.id.toString().includes(term) ||
      sale.customer_id?.toString().includes(term) ||
      sale.branch_name?.toLowerCase().includes(term) ||
      sale.status.toLowerCase().includes(term)
    )
  }, [posSalesQuery.data, searchTerm])

  const updateStatusMutation = useMutation({
    mutationFn: (input: { saleId: number; status: string; branchId?: number }) =>
      updatePosSaleStatusRequest(
        input.saleId,
        { status: input.status },
        {
          branch_id: input.branchId
        }
      ),
    onSuccess: (sale) => {
      setFeedback({
        type: 'success',
        message: `Sale #${sale.id} status updated to ${toDisplayLabel(sale.status)}.`
      })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales', 'detail', sale.id] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'daily-summary'] })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to update sale status.'
      })
    }
  })

  const cancelSaleMutation = useMutation({
    mutationFn: (input: { saleId: number; reason?: string; branchId?: number; restockItems: boolean }) =>
      cancelPosSaleRequest(
        input.saleId,
        {
          reason: input.reason,
          restock_items: input.restockItems
        },
        {
          branch_id: input.branchId
        }
      ),
    onSuccess: (sale) => {
      setFeedback({
        type: 'success',
        message: `Sale #${sale.id} cancelled successfully.`
      })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales', 'detail', sale.id] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to cancel sale.'
      })
    }
  })

  const refundSaleMutation = useMutation({
    mutationFn: (input: { saleId: number; reason?: string; branchId?: number; restockItems: boolean }) =>
      refundPosSaleRequest(
        input.saleId,
        {
          reason: input.reason,
          restock_items: input.restockItems
        },
        {
          branch_id: input.branchId
        }
      ),
    onSuccess: (result) => {
      setFeedback({
        type: 'success',
        message: `Refund posted for sale #${result.sale.id}: ${formatCurrency(result.refunded_amount)}.`
      })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales', 'detail', result.sale.id] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to refund sale.'
      })
    }
  })

  const onUpdateStatus = (sale: PosSaleResponse) => {
    const status = (statusBySaleId[sale.id] ?? sale.status).trim()
    if (!status) {
      setFeedback({
        type: 'error',
        message: 'Status cannot be empty.'
      })
      return
    }

    updateStatusMutation.mutate({
      saleId: sale.id,
      status,
      branchId: sale.branch_id ?? branchIdNumber
    })
  }

  const onCancelSale = (sale: PosSaleResponse) => {
    const reasonInput = window.prompt(`Cancel sale #${sale.id}. Reason (optional):`)
    if (reasonInput === null) {
      return
    }

    cancelSaleMutation.mutate({
      saleId: sale.id,
      reason: reasonInput.trim() || undefined,
      branchId: sale.branch_id ?? branchIdNumber,
      restockItems: true
    })
  }

  const onRefundSale = (sale: PosSaleResponse) => {
    const reasonInput = window.prompt(`Refund sale #${sale.id}. Reason (optional):`)
    if (reasonInput === null) {
      return
    }

    refundSaleMutation.mutate({
      saleId: sale.id,
      reason: reasonInput.trim() || undefined,
      branchId: sale.branch_id ?? branchIdNumber,
      restockItems: true
    })
  }

  const dailyRows = dailySalesQuery.data ?? []

  const posSalesColumns: Array<Column<PosSaleResponse>> = [
    {
      key: 'id',
      header: 'Sale',
      render: (sale) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <ReceiptRefundIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-text">#{sale.id}</span>
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Date & Time',
      render: (sale) => (
        <div className="flex items-center gap-1 text-sm">
          <ClockIcon className="h-4 w-4 text-text-tertiary" />
          {formatDateTime(sale.created_at)}
        </div>
      )
    },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (sale) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BuildingStorefrontIcon className="h-3 w-3" />
          {sale.branch_name ?? 'Not set'}
        </span>
      )
    },
    {
      key: 'customer_id',
      header: 'Customer',
      render: (sale) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <UserIcon className="h-4 w-4 text-text-tertiary" />
          #{sale.customer_id}
        </span>
      )
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (sale) => (
        <span className="font-medium">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
      )
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      render: (sale) => (
        <span className="font-bold text-primary">{formatCurrency(sale.total_amount)}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (sale) => {
        const currentStatus = statusBySaleId[sale.id] ?? sale.status
        const statusOptions = Array.from(new Set([currentStatus, ...COMMON_POS_STATUSES]))
        const isUpdatingCurrentSale =
          updateStatusMutation.isPending && updateStatusMutation.variables?.saleId === sale.id

        const getStatusColor = (status: string) => {
          switch(status) {
            case 'completed': return 'bg-success/10 text-success'
            case 'pending': return 'bg-warning/10 text-warning'
            case 'cancelled': return 'bg-error/10 text-error'
            case 'refunded': return 'bg-accent/10 text-accent'
            default: return 'bg-background text-text-tertiary'
          }
        }

        return (
          <div className="flex min-w-[240px] items-center gap-2">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={currentStatus}
              onChange={(event) => {
                const nextStatus = event.target.value
                setStatusBySaleId((previous) => ({
                  ...previous,
                  [sale.id]: nextStatus
                }))
              }}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {toDisplayLabel(status)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(sale)}
              loading={isUpdatingCurrentSale}
              className="whitespace-nowrap"
            >
              Update
            </Button>
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (sale) => {
        const saleId = sale.id
        const isCancellingCurrentSale =
          cancelSaleMutation.isPending && cancelSaleMutation.variables?.saleId === saleId
        const isRefundingCurrentSale =
          refundSaleMutation.isPending && refundSaleMutation.variables?.saleId === saleId

        return (
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
              onClick={() => setSelectedSaleId(saleId)}
              title="View details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
              onClick={() => onCancelSale(sale)}
              disabled={isCancellingCurrentSale}
              title="Cancel sale"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 text-text-secondary hover:text-accent hover:bg-accent/5 rounded-lg transition-all"
              onClick={() => onRefundSale(sale)}
              disabled={isRefundingCurrentSale}
              title="Refund sale"
            >
              <BanknotesIcon className="h-4 w-4" />
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
              <ShoppingBagIcon className="h-6 w-6 text-primary" />
              Sales Operations
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Track reports and manage POS sales from one place
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-primary" />
              Filters
            </h2>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              {showAdvancedFilters ? 'Hide Advanced' : 'Show Advanced'}
              {showAdvancedFilters ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Branch"
              options={branchOptions}
              value={branchId}
              onChange={(event) => setBranchId(String(event.target.value))}
            />
            <TextInput
              label="Date From"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <TextInput
              label="Date To"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
            <Select
              label="POS Status"
              options={[
                { label: 'All statuses', value: '' },
                ...COMMON_POS_STATUSES.map((status) => ({
                  label: toDisplayLabel(status),
                  value: status
                }))
              ]}
              value={statusFilter}
              onChange={(event) => setStatusFilter(String(event.target.value))}
            />
          </div>

          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-border"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Customer ID"
                    type="number"
                    min={1}
                    value={customerIdFilter}
                    onChange={(event) => setCustomerIdFilter(event.target.value)}
                    placeholder="Filter by customer ID"
                  />
                  <div className="relative">
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Search in Sales
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by ID, customer, branch..."
                      className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg 
                               focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 
                               transition-all text-sm"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Stats Cards */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
      >
        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Sales</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(summaryQuery.data?.total_sales ?? 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <ShoppingBagIcon className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Orders</p>
              <p className="text-lg font-bold text-secondary">{summaryQuery.data?.total_orders ?? 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Online Orders</p>
              <p className="text-lg font-bold text-accent">{summaryQuery.data?.online_orders ?? 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <CreditCardIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">POS Orders</p>
              <p className="text-lg font-bold text-success">{summaryQuery.data?.pos_orders ?? 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all md:col-span-1 col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <CalendarDaysIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Daily POS Net</p>
              <p className="text-lg font-bold text-warning">
                {formatCurrency(dailyPosSummaryQuery.data?.net_sales ?? 0)}
              </p>
            </div>
          </div>
          <TextInput
            className="mt-2"
            type="date"
            value={dailySummaryDate}
            onChange={(event) => setDailySummaryDate(event.target.value)}
          />
        </motion.div>
      </motion.section>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Daily Sales Table */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <ChartBarIcon className="h-4 w-4 text-primary" />
                Daily Sales Report
              </h2>
              {dailySalesQuery.isFetching && (
                <span className="text-xs text-text-tertiary flex items-center gap-1">
                  <ArrowPathIcon className="h-3 w-3 animate-spin" />
                  Refreshing...
                </span>
              )}
            </div>

            {dailySalesQuery.isLoading ? (
              <div className="p-8 text-center">
                <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                <p className="text-sm text-text-secondary">Loading daily sales...</p>
              </div>
            ) : dailyRows.length === 0 ? (
              <div className="p-8 text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                <p className="text-sm text-text-secondary">No daily sales records</p>
                <p className="text-xs text-text-tertiary mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-background/50">
                    <tr className="text-xs text-text-tertiary">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Orders</th>
                      <th className="px-4 py-3 font-medium text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dailyRows.map((row: DailySalesPoint) => (
                      <tr key={row.date} className="hover:bg-background/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-text">
                          <div className="flex items-center gap-2">
                            <CalendarDaysIcon className="h-4 w-4 text-text-tertiary" />
                            {formatDate(row.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{row.orders}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {formatCurrency(row.total_sales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.section>

        {/* Right Column - Branch & POS Summary */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Branch Operations */}
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BuildingStorefrontIcon className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-text">Branch Operations</h2>
            </div>

            {!branchId ? (
              <div className="text-center py-4">
                <BuildingStorefrontIcon className="h-8 w-8 mx-auto text-text-tertiary/30 mb-2" />
                <p className="text-xs text-text-tertiary">Select a branch to view operations</p>
              </div>
            ) : branchOperationsQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <ArrowPathIcon className="h-6 w-6 text-primary/30 animate-spin" />
              </div>
            ) : branchOperationsQuery.data ? (
              <div className="space-y-3">
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="font-semibold text-text">{branchOperationsQuery.data.branch_name}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Total Sales</span>
                    <span className="font-bold text-primary">{formatCurrency(branchOperationsQuery.data.total_sales)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Total Orders</span>
                    <span className="font-semibold">{branchOperationsQuery.data.total_orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Active Projects</span>
                    <span className="font-semibold text-success">{branchOperationsQuery.data.active_projects}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-error text-center py-2">Could not load branch operations</p>
            )}
          </div>

          {/* POS Daily Snapshot */}
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ReceiptRefundIcon className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-text">POS Daily Snapshot</h2>
            </div>

            {dailyPosSummaryQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <ArrowPathIcon className="h-6 w-6 text-primary/30 animate-spin" />
              </div>
            ) : dailyPosSummaryQuery.data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-xs text-text-tertiary">Transactions</p>
                    <p className="text-lg font-bold text-primary">{dailyPosSummaryQuery.data.total_transactions}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-xs text-text-tertiary">Items Sold</p>
                    <p className="text-lg font-bold text-secondary">{dailyPosSummaryQuery.data.total_items_sold}</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Gross Sales</span>
                    <span className="font-semibold">{formatCurrency(dailyPosSummaryQuery.data.gross_sales)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Refunds</span>
                    <span className="font-semibold text-error">{formatCurrency(dailyPosSummaryQuery.data.refunds)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <span className="text-sm font-medium text-text">Net Sales</span>
                    <span className="text-lg font-bold text-success">{formatCurrency(dailyPosSummaryQuery.data.net_sales)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-2">No POS summary data available</p>
            )}
          </div>
        </motion.section>
      </div>

      {/* Create POS Sale CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="bg-gradient-to-r from-primary/10 via-white to-secondary/10 rounded-xl border border-border p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <PlusIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text">Create POS Sale</h2>
                <p className="text-xs text-text-secondary">
                  Create a new point-of-sale transaction with branch-specific payment modes
                </p>
              </div>
            </div>
            <Link to="/dashboard/admin/sales/create">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white">
                <PlusIcon className="h-4 w-4" />
                Create POS Sale
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* POS Sales Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <ReceiptRefundIcon className="h-4 w-4 text-primary" />
              POS Sales Management
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => posSalesQuery.refetch()}
              loading={posSalesQuery.isFetching}
              className="flex items-center gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {posSalesQuery.isError ? (
            <div className="p-8 text-center">
              <XCircleIcon className="h-12 w-12 mx-auto text-error/30 mb-3" />
              <p className="text-sm text-error">Could not load POS sales.</p>
              <Button
                variant="outline"
                onClick={() => posSalesQuery.refetch()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <DataTable
              columns={posSalesColumns}
              data={filteredSales}
              getRowKey={(sale) => sale.id}
              emptyState={
                posSalesQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                    <p className="text-sm text-text-secondary">Loading POS sales...</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <ShoppingBagIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                    <p className="text-sm text-text-secondary">No POS sales found</p>
                    <p className="text-xs text-text-tertiary mt-1">Try adjusting your filters</p>
                  </div>
                )
              }
            />
          )}
        </div>
      </motion.section>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSaleId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedSaleId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                  <ReceiptRefundIcon className="h-5 w-5 text-primary" />
                  Sale Details #{selectedSaleId}
                </h2>
                <button
                  onClick={() => setSelectedSaleId(null)}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-4">
                {selectedSaleQuery.isLoading ? (
                  <div className="py-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                    <p className="text-sm text-text-secondary">Loading sale details...</p>
                  </div>
                ) : selectedSaleQuery.data ? (
                  <div className="space-y-4">
                    {/* Sale Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-text-tertiary">Status</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          selectedSaleQuery.data.status === 'completed' ? 'text-success' :
                          selectedSaleQuery.data.status === 'pending' ? 'text-warning' :
                          selectedSaleQuery.data.status === 'cancelled' ? 'text-error' : 'text-accent'
                        }`}>
                          {toDisplayLabel(selectedSaleQuery.data.status)}
                        </p>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-text-tertiary">Branch</p>
                        <p className="text-sm font-semibold mt-1">{selectedSaleQuery.data.branch_name ?? 'Not set'}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-text-tertiary">Date</p>
                        <p className="text-sm font-semibold mt-1">{formatDate(selectedSaleQuery.data.created_at)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-text-tertiary">Total</p>
                        <p className="text-lg font-bold text-primary mt-1">{formatCurrency(selectedSaleQuery.data.total_amount)}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div>
                      <h3 className="text-sm font-semibold text-text mb-3">Items</h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-background">
                            <tr className="text-xs text-text-tertiary">
                              <th className="px-4 py-2 font-medium">Product</th>
                              <th className="px-4 py-2 font-medium text-right">Qty</th>
                              <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                              <th className="px-4 py-2 font-medium text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedSaleQuery.data.items.map((item) => (
                              <tr key={item.id} className="hover:bg-background/50 transition-colors">
                                <td className="px-4 py-2 text-sm">{item.product_name}</td>
                                <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                                <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                                <td className="px-4 py-2 text-sm font-medium text-right">{formatCurrency(item.total_price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSaleId(null)
                          onCancelSale(selectedSaleQuery.data)
                        }}
                        className="flex items-center gap-2"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Cancel Sale
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSaleId(null)
                          onRefundSale(selectedSaleQuery.data)
                        }}
                        className="flex items-center gap-2"
                      >
                        <BanknotesIcon className="h-4 w-4" />
                        Refund Sale
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-error text-center py-4">Could not load sale details</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-error/10 border border-error/20 text-error'
                : 'bg-success/10 border border-success/20 text-success'
            }`}
          >
            {feedback.type === 'error' ? (
              <XCircleIcon className="h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Info */}
      <section className="bg-background rounded-lg p-3 text-xs text-text-tertiary border border-border">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4 text-primary" />
          <span>
            Reports use `/api/v1/reports/*`; POS management uses `/api/v1/pos/sales*`,
            `/api/v1/pos/summary/daily`, and `/api/v1/payments/modes*`.
          </span>
        </div>
      </section>
    </div>
  )
}

export default SalesOperationsPage
