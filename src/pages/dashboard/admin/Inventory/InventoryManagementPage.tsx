import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CubeIcon,
  ServerStackIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  TagIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ScaleIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextInput, type Column } from '@components/common'
import { listProductsRequest } from '@api/modules/products.api'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  createRestockRequest,
  createStockCountRequest,
  getInventoryDashboardRequest,
  getSupportedValuationMethodsRequest,
  type InventoryDashboardAlert,
  type InventoryValuationMethod,
  type ProductStockStatusResponse,
  type RestockResponse,
  type StockCountResponse
} from '@api/modules/inventory.api'
import { AppTheme, withOpacity } from '@constants/theme'

type RestockFormState = {
  branchId: string
  restockDate: string
  rows: RestockRowState[]
}

type RestockRowState = {
  id: string
  productId: string
  quantity: string
  buyingPrice: string
  sellingPrice: string
  maxOfferAmount: string
  maxOfferPercent: string
  maxOfferMode: 'amount' | 'percent'
  notes: string
}

type StockCountFormState = {
  productId: string
  branchId: string
  countDate: string
  physicalStock: string
  applyAdjustment: boolean
  valuationMethod: string
  adjustmentBuyingPrice: string
  adjustmentSellingPrice: string
  notes: string
}

const today = new Date().toISOString().slice(0, 10)

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return Number.isFinite(rounded) ? String(rounded) : '0'
}

const toSafeNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const createRestockRow = (): RestockRowState => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId: '',
  quantity: '1',
  buyingPrice: '0',
  sellingPrice: '0',
  maxOfferAmount: '0',
  maxOfferPercent: '0',
  maxOfferMode: 'amount',
  notes: ''
})

const syncMaxOffer = (row: RestockRowState): RestockRowState => {
  const quantity = toSafeNumber(row.quantity)
  const sellingPrice = toSafeNumber(row.sellingPrice)
  const totalSelling = quantity * sellingPrice

  if (row.maxOfferMode === 'amount') {
    const amount = toSafeNumber(row.maxOfferAmount)
    const percent = totalSelling > 0 ? (amount / totalSelling) * 100 : 0
    return { ...row, maxOfferPercent: formatNumber(percent) }
  }

  const percent = toSafeNumber(row.maxOfferPercent)
  const amount = totalSelling > 0 ? (percent / 100) * totalSelling : 0
  return { ...row, maxOfferAmount: formatNumber(amount) }
}

const createEmptyRestockForm = (): RestockFormState => ({
  branchId: '',
  restockDate: today,
  rows: [createRestockRow()]
})

const EMPTY_STOCK_COUNT_FORM: StockCountFormState = {
  productId: '',
  branchId: '',
  countDate: today,
  physicalStock: '0',
  applyAdjustment: false,
  valuationMethod: '',
  adjustmentBuyingPrice: '',
  adjustmentSellingPrice: '',
  notes: ''
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

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

const InventoryManagementPage = () => {
  const queryClient = useQueryClient()
  const statusLimit = 50
  const recentLimit = 10
  const [showRestockForm, setShowRestockForm] = useState(false)
  const [showStockCountForm, setShowStockCountForm] = useState(false)
  const [restockForm, setRestockForm] = useState<RestockFormState>(createEmptyRestockForm())
  const [stockCountForm, setStockCountForm] = useState<StockCountFormState>(EMPTY_STOCK_COUNT_FORM)
  const [restockError, setRestockError] = useState<string | null>(null)
  const [stockCountError, setStockCountError] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const productsQuery = useQuery({
    queryKey: ['products', 'inventory-select'],
    queryFn: () => listProductsRequest({ limit: 200 })
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'inventory-select'],
    queryFn: listBranchesRequest
  })

  const inventoryDashboardQuery = useQuery({
    queryKey: ['inventory', 'dashboard', statusLimit, recentLimit],
    queryFn: () =>
      getInventoryDashboardRequest({
        status_limit: statusLimit,
        recent_limit: recentLimit
      })
  })

  const valuationMethodsQuery = useQuery({
    queryKey: ['inventory', 'valuation-methods'],
    queryFn: getSupportedValuationMethodsRequest
  })

  const branchOptions = useMemo(
    () => [
      { label: 'Select branch', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const stockCountValuationOptions = useMemo(
    () => [
      { label: 'Use default valuation method', value: '' },
      ...((valuationMethodsQuery.data ?? []).map((method) => ({
        label: `${method.name} (${method.method})`,
        value: method.method
      })) || [])
    ],
    [valuationMethodsQuery.data]
  )

  const updateRestockRow = (
    rowId: string,
    updater: (row: RestockRowState) => RestockRowState
  ) => {
    setRestockForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === rowId ? updater(row) : row))
    }))
  }

  const updateRestockRowField = (
    rowId: string,
    field: 'productId' | 'quantity' | 'buyingPrice' | 'sellingPrice' | 'notes',
    value: string
  ) => {
    updateRestockRow(rowId, (row) => {
      const next = { ...row, [field]: value } as RestockRowState
      if (field === 'quantity' || field === 'sellingPrice') {
        return syncMaxOffer(next)
      }
      return next
    })
  }

  const updateRestockRowMaxOfferAmount = (rowId: string, value: string) => {
    updateRestockRow(rowId, (row) =>
      syncMaxOffer({ ...row, maxOfferMode: 'amount', maxOfferAmount: value })
    )
  }

  const updateRestockRowMaxOfferPercent = (rowId: string, value: string) => {
    updateRestockRow(rowId, (row) =>
      syncMaxOffer({ ...row, maxOfferMode: 'percent', maxOfferPercent: value })
    )
  }

  const addRestockRow = () => {
    setRestockForm((prev) => ({
      ...prev,
      rows: [...prev.rows, createRestockRow()]
    }))
  }

  const removeRestockRow = (rowId: string) => {
    setRestockForm((prev) => ({
      ...prev,
      rows: prev.rows.length > 1 ? prev.rows.filter((row) => row.id !== rowId) : prev.rows
    }))
  }

  const restockTotals = useMemo(() => {
    return restockForm.rows.reduce(
      (acc, row) => {
        const quantity = toSafeNumber(row.quantity)
        const buyingPrice = toSafeNumber(row.buyingPrice)
        const sellingPrice = toSafeNumber(row.sellingPrice)
        acc.totalBuying += quantity * buyingPrice
        acc.totalSelling += quantity * sellingPrice
        acc.expectedProfit += quantity * (sellingPrice - buyingPrice)
        return acc
      },
      {
        totalBuying: 0,
        totalSelling: 0,
        expectedProfit: 0
      }
    )
  }, [restockForm.rows])

  const getProductOptionsForRow = (rowId: string, currentProductId: string) => {
    const selectedInOtherRows = new Set(
      restockForm.rows
        .filter((row) => row.id !== rowId && row.productId)
        .map((row) => row.productId)
    )

    return [
      { label: 'Select product', value: '' },
      ...((productsQuery.data ?? [])
        .filter((product) => {
          const productId = String(product.id)
          return productId === currentProductId || !selectedInOtherRows.has(productId)
        })
        .map((product) => ({
          label: `${product.name} (${product.sku})`,
          value: String(product.id)
        })) || [])
    ]
  }

  const createRestockMutation = useMutation({
    mutationFn: async (payload: RestockFormState) => {
      const branchId = Number(payload.branchId)

      if (!branchId) {
        throw new Error('Please select a branch.')
      }
      if (!payload.rows.length) {
        throw new Error('Add at least one product row.')
      }

      const items = payload.rows.map((row, index) => {
        const productId = Number(row.productId)
        const quantity = Number(row.quantity)
        const buyingPrice = Number(row.buyingPrice)
        const sellingPrice = Number(row.sellingPrice)
        const maxOfferAmount = Number(row.maxOfferAmount)

        if (!productId) {
          throw new Error(`Row ${index + 1}: select a product.`)
        }
        if (Number.isNaN(quantity) || quantity < 1) {
          throw new Error(`Row ${index + 1}: quantity must be 1 or more.`)
        }
        if (Number.isNaN(buyingPrice) || buyingPrice < 0) {
          throw new Error(`Row ${index + 1}: buying price must be 0 or more.`)
        }
        if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
          throw new Error(`Row ${index + 1}: selling price must be 0 or more.`)
        }
        if (Number.isNaN(maxOfferAmount) || maxOfferAmount < 0) {
          throw new Error(`Row ${index + 1}: max offer must be 0 or more.`)
        }

        return {
          product_id: productId,
          quantity,
          buying_price: buyingPrice,
          selling_price: sellingPrice,
          max_offer: maxOfferAmount,
          notes: row.notes.trim() || undefined
        }
      })

      return createRestockRequest({
        branch_id: branchId,
        restock_date: payload.restockDate,
        items
      })
    },
    onSuccess: () => {
      setRestockForm(createEmptyRestockForm())
      setRestockError(null)
      setShowRestockForm(false)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'inventory-select'] })
    },
    onError: (error: Error) => {
      setRestockError(error.message || 'Could not create restock.')
    }
  })

  const createStockCountMutation = useMutation({
    mutationFn: async (payload: StockCountFormState) => {
      const productId = Number(payload.productId)
      const branchId = payload.branchId ? Number(payload.branchId) : undefined
      const physicalStock = Number(payload.physicalStock)
      const hasAdjustmentBuyingPrice =
        payload.applyAdjustment && payload.adjustmentBuyingPrice.trim() !== ''
      const hasAdjustmentSellingPrice =
        payload.applyAdjustment && payload.adjustmentSellingPrice.trim() !== ''
      const adjustmentBuyingPrice = hasAdjustmentBuyingPrice
        ? Number(payload.adjustmentBuyingPrice)
        : undefined
      const adjustmentSellingPrice = hasAdjustmentSellingPrice
        ? Number(payload.adjustmentSellingPrice)
        : undefined

      if (!productId) {
        throw new Error('Please select a product.')
      }
      if (payload.branchId && !branchId) {
        throw new Error('Please select a valid branch.')
      }
      if (Number.isNaN(physicalStock) || physicalStock < 0) {
        throw new Error('Physical stock must be 0 or more.')
      }
      if (
        hasAdjustmentBuyingPrice &&
        (Number.isNaN(adjustmentBuyingPrice ?? NaN) || (adjustmentBuyingPrice ?? 0) < 0)
      ) {
        throw new Error('Adjustment buying price must be 0 or more.')
      }
      if (
        hasAdjustmentSellingPrice &&
        (Number.isNaN(adjustmentSellingPrice ?? NaN) || (adjustmentSellingPrice ?? 0) < 0)
      ) {
        throw new Error('Adjustment selling price must be 0 or more.')
      }

      return createStockCountRequest({
        product_id: productId,
        branch_id: branchId,
        count_date: payload.countDate,
        physical_stock: physicalStock,
        apply_adjustment: payload.applyAdjustment,
        valuation_method: payload.valuationMethod
          ? (payload.valuationMethod as InventoryValuationMethod)
          : undefined,
        adjustment_buying_price: adjustmentBuyingPrice,
        adjustment_selling_price: adjustmentSellingPrice,
        notes: payload.notes.trim() || undefined
      })
    },
    onSuccess: () => {
      setStockCountForm(EMPTY_STOCK_COUNT_FORM)
      setStockCountError(null)
      setShowStockCountForm(false)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
    },
    onError: (error: Error) => {
      setStockCountError(error.message || 'Could not create stock count.')
    }
  })

  const summary = useMemo(() => {
    const dashboardSummary = inventoryDashboardQuery.data?.summary
    return {
      totalValue: dashboardSummary?.total_stock_value ?? 0,
      lowStock: dashboardSummary?.low_stock_items ?? 0,
      categories: dashboardSummary?.tracked_categories ?? 0,
      totalProducts: dashboardSummary?.total_products ?? 0,
      outOfStock: dashboardSummary?.out_of_stock_items ?? 0
    }
  }, [inventoryDashboardQuery.data?.summary])

  const stockStatusColumns: Column<ProductStockStatusResponse>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <CubeIcon className="h-4 w-4 text-primary/50" />
          </div>
          <div>
            <p className="font-medium text-text">{row.product_name}</p>
            <p className="text-xs text-text-tertiary">SKU: {row.sku}</p>
          </div>
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <TagIcon className="h-3 w-3" />
          {row.category_name ?? 'Uncategorized'}
        </span>
      )
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              row.is_low_stock ? 'text-warning' : 'text-success'
            }`}>
              {row.stock_quantity}
            </span>
            <span className="text-xs text-text-tertiary">/ {row.reorder_level}</span>
          </div>
          <div className="w-20 h-1.5 bg-background rounded-full mt-1">
            <div 
              className={`h-full rounded-full ${
                row.is_low_stock ? 'bg-warning' : 'bg-success'
              }`}
              style={{ 
                width: `${Math.min((row.stock_quantity / (row.reorder_level * 2)) * 100, 100)}%` 
              }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'selling_price',
      header: 'Sell price',
      render: (row) => (
        <span className="font-medium text-primary">{formatCurrency(row.selling_price)}</span>
      ),
      align: 'right'
    },
    {
      key: 'in_stock_value',
      header: 'Stock value',
      render: (row) => (
        <span className="font-medium text-text">{formatCurrency(row.in_stock_value)}</span>
      ),
      align: 'right'
    }
  ]

  const restocksColumns: Column<RestockResponse>[] = [
    {
      key: 'restock_date',
      header: 'Date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-text-tertiary" />
          <span>{new Date(row.restock_date).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-2">
          <CubeIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">{row.product_name}</span>
        </div>
      )
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (row) => (
        <span className="font-medium text-success">+{row.quantity}</span>
      ),
      align: 'right'
    },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BuildingStorefrontIcon className="h-3 w-3" />
          {row.branch_name ?? 'Unassigned'}
        </span>
      )
    },
    {
      key: 'new_stock',
      header: 'New stock',
      render: (row) => (
        <span className="font-medium text-text">{row.new_stock}</span>
      ),
      align: 'right'
    }
  ]

  const stockCountsColumns: Column<StockCountResponse>[] = [
    {
      key: 'count_date',
      header: 'Date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-text-tertiary" />
          <span>{new Date(row.count_date).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-2">
          <CubeIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">{row.product_name}</span>
        </div>
      )
    },
    {
      key: 'physical_stock',
      header: 'Physical',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-success">{row.physical_stock}</span>
      )
    },
    {
      key: 'system_stock',
      header: 'System',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-text">{row.system_stock}</span>
      )
    },
    {
      key: 'variance',
      header: 'Variance',
      align: 'right',
      render: (row) => (
        <span className={`font-medium ${
          row.variance === 0 ? 'text-text-secondary' : 
          row.variance > 0 ? 'text-success' : 'text-error'
        }`}>
          {row.variance > 0 ? '+' : ''}{row.variance}
        </span>
      )
    }
  ]

  const alertsColumns: Column<InventoryDashboardAlert>[] = [
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.severity === 'critical'
              ? 'bg-error/10 text-error'
              : row.severity === 'warning'
                ? 'bg-warning/10 text-warning'
                : 'bg-background text-text-tertiary'
          }`}
        >
          {row.severity === 'critical' && <XCircleIcon className="h-3 w-3" />}
          {row.severity === 'warning' && <ExclamationTriangleIcon className="h-3 w-3" />}
          {row.severity}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="text-sm text-text-secondary">{row.type}</span>
      )
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <span className="text-sm text-text">{row.message}</span>
      )
    }
  ]

  const onSubmitRestock = (event: FormEvent) => {
    event.preventDefault()
    setRestockError(null)
    createRestockMutation.mutate(restockForm)
  }

  const onSubmitStockCount = (event: FormEvent) => {
    event.preventDefault()
    setStockCountError(null)
    createStockCountMutation.mutate(stockCountForm)
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
              <ServerStackIcon className="h-6 w-6 text-primary" />
              Inventory Operations
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage restocks, stock counts, and monitor live inventory status
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStockCountForm(!showStockCountForm)}
              className="flex items-center gap-2"
            >
              <ScaleIcon className="h-4 w-4" />
              {showStockCountForm ? 'Close Stock Count' : 'New Stock Count'}
            </Button>
            <Button
              onClick={() => setShowRestockForm(!showRestockForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white"
            >
              <PlusIcon className="h-4 w-4" />
              {showRestockForm ? 'Close Restock' : 'New Restock'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
      >
        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Value</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(summary.totalValue)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Low Stock</p>
              <p className="text-lg font-bold text-warning">{summary.lowStock}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/10 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Out of Stock</p>
              <p className="text-lg font-bold text-error">{summary.outOfStock}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <CubeIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Products</p>
              <p className="text-lg font-bold text-success">{summary.totalProducts}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TagIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Categories</p>
              <p className="text-lg font-bold text-accent">{summary.categories}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg">
              <ClockIcon className="h-5 w-5 text-text-tertiary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Last Update</p>
              <p className="text-sm font-medium text-text">
                {inventoryDashboardQuery.data?.generated_at
                  ? new Date(inventoryDashboardQuery.data.generated_at).toLocaleTimeString()
                  : '--'}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Restock Form */}
      <AnimatePresence>
        {showRestockForm && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCartIcon className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold text-text">Create New Restock</h2>
              </div>

              <form onSubmit={onSubmitRestock} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Restock Date"
                    type="date"
                    value={restockForm.restockDate}
                    onChange={(event) =>
                      setRestockForm((prev) => ({ ...prev, restockDate: event.target.value }))
                    }
                    required
                  />
                  <Select
                    label="Branch"
                    options={branchOptions}
                    value={restockForm.branchId}
                    onChange={(event) =>
                      setRestockForm((prev) => ({ ...prev, branchId: String(event.target.value) }))
                    }
                    required
                  />
                </div>

                <div className="space-y-3">
                  {restockForm.rows.map((row, index) => {
                    const quantity = toSafeNumber(row.quantity)
                    const buyingPrice = toSafeNumber(row.buyingPrice)
                    const sellingPrice = toSafeNumber(row.sellingPrice)
                    const totalBuyingAmount = quantity * buyingPrice
                    const totalSellingAmount = quantity * sellingPrice
                    const expectedProfit = totalSellingAmount - totalBuyingAmount

                    return (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-background rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-text-secondary bg-white px-2 py-1 rounded">
                              Product {index + 1}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRestockRow(row.id)}
                            disabled={restockForm.rows.length === 1}
                            className="text-error hover:bg-error/5"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <Select
                            label="Product"
                            options={getProductOptionsForRow(row.id, row.productId)}
                            value={row.productId}
                            onChange={(event) =>
                              updateRestockRowField(row.id, 'productId', String(event.target.value))
                            }
                            required
                          />
                          <TextInput
                            label="Quantity"
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(event) =>
                              updateRestockRowField(row.id, 'quantity', event.target.value)
                            }
                            required
                          />
                          <TextInput
                            label="Buying Price (per unit)"
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.buyingPrice}
                            onChange={(event) =>
                              updateRestockRowField(row.id, 'buyingPrice', event.target.value)
                            }
                            required
                          />
                          <TextInput
                            label="Selling Price (per unit)"
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.sellingPrice}
                            onChange={(event) =>
                              updateRestockRowField(row.id, 'sellingPrice', event.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-4 mt-3">
                          <TextInput
                            label="Total Buying"
                            value={formatCurrency(totalBuyingAmount)}
                            readOnly
                            className="bg-white"
                          />
                          <TextInput
                            label="Total Selling"
                            value={formatCurrency(totalSellingAmount)}
                            readOnly
                            className="bg-white"
                          />
                          <TextInput
                            label="Expected Profit"
                            value={formatCurrency(expectedProfit)}
                            readOnly
                            className={`bg-white ${
                              expectedProfit >= 0 ? 'text-success' : 'text-error'
                            }`}
                          />
                          <div className="flex gap-2">
                            <TextInput
                              label="Max Offer (Amount)"
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.maxOfferAmount}
                              onChange={(event) =>
                                updateRestockRowMaxOfferAmount(row.id, event.target.value)
                              }
                              className="flex-1"
                            />
                            <TextInput
                              label="Max Offer (%)"
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.maxOfferPercent}
                              onChange={(event) =>
                                updateRestockRowMaxOfferPercent(row.id, event.target.value)
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <TextInput
                            label="Notes"
                            value={row.notes}
                            onChange={(event) =>
                              updateRestockRowField(row.id, 'notes', event.target.value)
                            }
                            placeholder="Optional notes about this restock item"
                          />
                        </div>
                      </motion.div>
                    )
                  })}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addRestockRow}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Product Row
                    </Button>

                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-text-tertiary">Total Buying</p>
                          <p className="font-semibold text-text">{formatCurrency(restockTotals.totalBuying)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-tertiary">Total Selling</p>
                          <p className="font-semibold text-text">{formatCurrency(restockTotals.totalSelling)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-tertiary">Expected Profit</p>
                          <p className={`font-semibold ${
                            restockTotals.expectedProfit >= 0 ? 'text-success' : 'text-error'
                          }`}>
                            {formatCurrency(restockTotals.expectedProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button 
                    type="submit" 
                    loading={createRestockMutation.isPending}
                    className="min-w-[120px]"
                  >
                    Save Restock
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowRestockForm(false)
                      setRestockForm(createEmptyRestockForm())
                      setRestockError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  {restockError && (
                    <span className="text-xs text-error flex items-center gap-1">
                      <XCircleIcon className="h-4 w-4" />
                      {restockError}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Stock Count Form */}
      <AnimatePresence>
        {showStockCountForm && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ScaleIcon className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold text-text">Create Stock Count</h2>
              </div>

              <form onSubmit={onSubmitStockCount} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Select
                    label="Product"
                    options={[
                      { label: 'Select product', value: '' },
                      ...((productsQuery.data ?? []).map((product) => ({
                        label: `${product.name} (${product.sku})`,
                        value: String(product.id)
                      })) || [])
                    ]}
                    value={stockCountForm.productId}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({ ...prev, productId: String(event.target.value) }))
                    }
                    required
                  />
                  <Select
                    label="Branch (optional)"
                    options={branchOptions}
                    value={stockCountForm.branchId}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({ ...prev, branchId: String(event.target.value) }))
                    }
                  />
                  <TextInput
                    label="Count Date"
                    type="date"
                    value={stockCountForm.countDate}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({ ...prev, countDate: event.target.value }))
                    }
                    required
                  />
                  <TextInput
                    label="Physical Stock"
                    type="number"
                    min={0}
                    value={stockCountForm.physicalStock}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({ ...prev, physicalStock: event.target.value }))
                    }
                    required
                  />
                  <Select
                    label="Valuation Method (optional)"
                    options={stockCountValuationOptions}
                    value={stockCountForm.valuationMethod}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({
                        ...prev,
                        valuationMethod: String(event.target.value)
                      }))
                    }
                  />
                  <div className="md:col-span-2">
                    <TextInput
                      label="Notes"
                      value={stockCountForm.notes}
                      onChange={(event) =>
                        setStockCountForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Optional notes about this count"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stockCountForm.applyAdjustment}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({
                        ...prev,
                        applyAdjustment: event.target.checked,
                        adjustmentBuyingPrice: event.target.checked ? prev.adjustmentBuyingPrice : '',
                        adjustmentSellingPrice: event.target.checked ? prev.adjustmentSellingPrice : ''
                      }))
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-text-secondary">Apply adjustment immediately</span>
                </label>

                {stockCountForm.applyAdjustment && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Adjustment Buying Price (optional)"
                      type="number"
                      min={0}
                      step="0.01"
                      value={stockCountForm.adjustmentBuyingPrice}
                      onChange={(event) =>
                        setStockCountForm((prev) => ({
                          ...prev,
                          adjustmentBuyingPrice: event.target.value
                        }))
                      }
                    />
                    <TextInput
                      label="Adjustment Selling Price (optional)"
                      type="number"
                      min={0}
                      step="0.01"
                      value={stockCountForm.adjustmentSellingPrice}
                      onChange={(event) =>
                        setStockCountForm((prev) => ({
                          ...prev,
                          adjustmentSellingPrice: event.target.value
                        }))
                      }
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button 
                    type="submit" 
                    loading={createStockCountMutation.isPending}
                    className="min-w-[120px]"
                  >
                    Save Stock Count
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowStockCountForm(false)
                      setStockCountForm(EMPTY_STOCK_COUNT_FORM)
                      setStockCountError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  {stockCountError && (
                    <span className="text-xs text-error flex items-center gap-1">
                      <XCircleIcon className="h-4 w-4" />
                      {stockCountError}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Stock Status Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <CubeIcon className="h-4 w-4 text-primary" />
              Stock Status
            </h2>
            {inventoryDashboardQuery.isFetching && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>
          <DataTable
            columns={stockStatusColumns}
            data={inventoryDashboardQuery.data?.stock_status ?? []}
            getRowKey={(row) => row.product_id}
            emptyState={
              inventoryDashboardQuery.isLoading ? (
                <div className="p-8 text-center">
                  <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                  <p className="text-sm text-text-secondary">Loading stock status...</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CubeIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                  <p className="text-sm text-text-secondary">No stock records found</p>
                </div>
              )
            }
          />
        </div>
      </motion.section>

      {/* Recent Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Recent Restocks */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <ShoppingCartIcon className="h-4 w-4 text-primary" />
                Recent Restocks
              </h2>
            </div>
            <DataTable
              columns={restocksColumns}
              data={inventoryDashboardQuery.data?.recent_restocks ?? []}
              getRowKey={(row) => row.id}
              emptyState={
                inventoryDashboardQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-6 w-6 mx-auto text-primary/30 animate-spin" />
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-text-secondary">No restocks yet</p>
                  </div>
                )
              }
            />
          </div>
        </motion.section>

        {/* Recent Stock Counts */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <ScaleIcon className="h-4 w-4 text-primary" />
                Recent Stock Counts
              </h2>
            </div>
            <DataTable
              columns={stockCountsColumns}
              data={inventoryDashboardQuery.data?.recent_stock_counts ?? []}
              getRowKey={(row) => row.id}
              emptyState={
                inventoryDashboardQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-6 w-6 mx-auto text-primary/30 animate-spin" />
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-text-secondary">No stock counts yet</p>
                  </div>
                )
              }
            />
          </div>
        </motion.section>
      </div>

      {/* Alerts Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-primary" />
              Inventory Alerts
            </h2>
          </div>
          <DataTable
            columns={alertsColumns}
            data={inventoryDashboardQuery.data?.alerts ?? []}
            getRowKey={(row, index) => `${row.type}-${row.product_id ?? index}`}
            emptyState={
              inventoryDashboardQuery.isLoading ? (
                <div className="p-8 text-center">
                  <ArrowPathIcon className="h-6 w-6 mx-auto text-primary/30 animate-spin" />
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CheckCircleIcon className="h-12 w-12 mx-auto text-success/30 mb-3" />
                  <p className="text-sm text-text-secondary">No active alerts</p>
                  <p className="text-xs text-text-tertiary mt-1">All inventory levels are healthy</p>
                </div>
              )
            }
          />
        </div>
      </motion.section>
    </div>
  )
}

export default InventoryManagementPage
