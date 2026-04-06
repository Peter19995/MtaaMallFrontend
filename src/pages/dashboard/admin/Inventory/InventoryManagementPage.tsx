import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
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
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, type Column } from '@components/common'
import { getProductRequest, listProductsRequest } from '@api/modules/products.api'
import { listBranchesRequest, type BranchResponse } from '@api/modules/branches.api'
import {
  createRestockRequest,
  createStockCountRequest,
  createStockTransferRequest,
  getInventoryDashboardRequest,
  getStockBalancesRequest,
  getStockStatusRequest,
  getStockCountAdjustmentReasonsRequest,
  getSupportedValuationMethodsRequest,
  type InventoryDashboardAlert,
  type StockCountAdjustmentReason,
  type InventoryValuationMethod,
  type ProductStockStatusResponse,
  type RestockResponse,
  type StockCountResponse,
  type StockTransferResponse
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
  productVariantId: string
  quantity: string
  buyingPrice: string
  sellingPrice: string
  maxOfferAmount: string
  maxOfferPercent: string
  maxOfferMode: 'amount' | 'percent'
  notes: string
}

type StockCountFormState = {
  branchId: string
  countDate: string
  rows: StockCountRowState[]
}

type StockCountRowState = {
  id: string
  productId: string
  physicalStock: string
  applyAdjustment: boolean
  adjustmentReason: string
  adjustmentReference: string
  valuationMethod: string
  adjustmentBuyingPrice: string
  adjustmentSellingPrice: string
  notes: string
}

type StockTransferFormState = {
  productId: string
  fromBranchId: string
  toBranchId: string
  quantity: string
  transferDate: string
  notes: string
}

type ApiErrorItem = {
  message?: string
}

type ApiErrorResponse = {
  message?: string
  detail?: string | Array<{ msg?: string }>
  errors?: ApiErrorItem[]
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
  productVariantId: '',
  quantity: '1',
  buyingPrice: '0',
  sellingPrice: '0',
  maxOfferAmount: '0',
  maxOfferPercent: '0',
  maxOfferMode: 'amount',
  notes: ''
})

const createStockCountRow = (): StockCountRowState => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId: '',
  physicalStock: '0',
  applyAdjustment: false,
  adjustmentReason: '',
  adjustmentReference: '',
  valuationMethod: '',
  adjustmentBuyingPrice: '',
  adjustmentSellingPrice: '',
  notes: ''
})

const createEmptyStockTransferForm = (fromBranchId = ''): StockTransferFormState => ({
  productId: '',
  fromBranchId,
  toBranchId: '',
  quantity: '1',
  transferDate: today,
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

const getDefaultInventoryBranchId = (branches: BranchResponse[]): string => {
  const mainBranch = branches.find((branch) => {
    const code = branch.code?.trim().toLowerCase() ?? ''
    const name = branch.name?.trim().toLowerCase() ?? ''
    return code === 'main' || name === 'main' || name.includes('main branch')
  })

  return mainBranch ? String(mainBranch.id) : branches[0] ? String(branches[0].id) : ''
}

const isLowStockStatus = (status: ProductStockStatusResponse): boolean => {
  if (typeof status.is_low_stock === 'boolean') {
    return status.is_low_stock
  }

  return status.reorder_level > 0 && status.stock_quantity <= status.reorder_level
}

const createEmptyRestockForm = (branchId = ''): RestockFormState => ({
  branchId,
  restockDate: today,
  rows: [createRestockRow()]
})

const createEmptyStockCountForm = (branchId = ''): StockCountFormState => ({
  branchId,
  countDate: today,
  rows: [createStockCountRow()]
})

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const formatVariantLabel = (variant: {
  sku: string
  options: Record<string, string>
}) => {
  const optionSummary = Object.entries(variant.options)
    .map(([optionName, value]) => `${optionName}: ${value}`)
    .join(' / ')

  return optionSummary ? `${optionSummary} (${variant.sku})` : variant.sku
}

const formatVariantOptionsSummary = (variantOptions?: Record<string, string> | null) => {
  if (!variantOptions) {
    return ''
  }

  return Object.entries(variantOptions)
    .map(([optionName, value]) => `${optionName}: ${value}`)
    .join(' / ')
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
  const [showStockTransferForm, setShowStockTransferForm] = useState(false)
  const [restockForm, setRestockForm] = useState<RestockFormState>(createEmptyRestockForm())
  const [stockCountForm, setStockCountForm] = useState<StockCountFormState>(createEmptyStockCountForm())
  const [stockTransferForm, setStockTransferForm] = useState<StockTransferFormState>(
    createEmptyStockTransferForm()
  )
  const [restockError, setRestockError] = useState<string | null>(null)
  const [stockCountError, setStockCountError] = useState<string | null>(null)
  const [stockTransferError, setStockTransferError] = useState<string | null>(null)
  const [stockTransferSuccess, setStockTransferSuccess] = useState<string | null>(null)
  const [stockStatusBranchFilter, setStockStatusBranchFilter] = useState('all')
  const [stockStatusProductFilter, setStockStatusProductFilter] = useState('all')

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

  const selectedStockStatusBranchId = useMemo(() => {
    const branchId = Number(stockStatusBranchFilter)
    return Number.isFinite(branchId) && branchId > 0 ? branchId : undefined
  }, [stockStatusBranchFilter])

  const selectedStockStatusProductId = useMemo(() => {
    const productId = Number(stockStatusProductFilter)
    return Number.isFinite(productId) && productId > 0 ? productId : undefined
  }, [stockStatusProductFilter])

  const stockStatusQuery = useQuery({
    queryKey: [
      'inventory',
      'stock-balances',
      'table',
      selectedStockStatusBranchId ?? 'all',
      selectedStockStatusProductId ?? 'all'
    ],
    queryFn: () =>
      getStockBalancesRequest({
        scope: selectedStockStatusBranchId ? 'branch' : 'all',
        branch_id: selectedStockStatusBranchId,
        product_id: selectedStockStatusProductId,
        skip: 0,
        limit: 300
      }),
    staleTime: 30_000
  })

  const valuationMethodsQuery = useQuery({
    queryKey: ['inventory', 'valuation-methods'],
    queryFn: getSupportedValuationMethodsRequest
  })

  const stockCountAdjustmentReasonsQuery = useQuery({
    queryKey: ['inventory', 'stock-count-adjustment-reasons'],
    queryFn: getStockCountAdjustmentReasonsRequest
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

  const stockStatusBranchOptions = useMemo(
    () => [
      { label: 'All branches', value: 'all' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const defaultInventoryBranchId = useMemo(
    () => getDefaultInventoryBranchId(branchesQuery.data ?? []),
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

  const stockCountAdjustmentReasonOptions = useMemo(
    () => [
      { label: 'Select adjustment reason', value: '' },
      ...((stockCountAdjustmentReasonsQuery.data ?? []).map((reason) => ({
        label: reason.name,
        value: reason.reason
      })) || [])
    ],
    [stockCountAdjustmentReasonsQuery.data]
  )

  const stockStatusProductOptions = useMemo(
    () => [
      { label: 'All products', value: 'all' },
      ...((productsQuery.data ?? []).map((product) => ({
        label: `${product.name} (${product.sku})`,
        value: String(product.id)
      })) || [])
    ],
    [productsQuery.data]
  )

  const stockTransferProductOptions = useMemo(
    () => [
      { label: 'Select product', value: '' },
      ...((productsQuery.data ?? []).map((product) => ({
        label: `${product.name} (${product.sku})`,
        value: String(product.id)
      })) || [])
    ],
    [productsQuery.data]
  )

  const stockTransferFromBranchOptions = useMemo(
    () => [
      { label: 'Select source branch', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const stockTransferToBranchOptions = useMemo(
    () => [
      { label: 'Select destination branch', value: '' },
      ...((branchesQuery.data ?? [])
        .filter((branch) => String(branch.id) !== stockTransferForm.fromBranchId)
        .map((branch) => ({
          label: `${branch.name} (${branch.code})`,
          value: String(branch.id)
        })) || [])
    ],
    [branchesQuery.data, stockTransferForm.fromBranchId]
  )

  const selectedRestockBranchId = useMemo(() => {
    const branchId = Number(restockForm.branchId)
    return Number.isFinite(branchId) && branchId > 0 ? branchId : undefined
  }, [restockForm.branchId])

  const selectedRestockBranchName = useMemo(() => {
    if (!selectedRestockBranchId) {
      return ''
    }

    return (
      branchesQuery.data?.find((branch) => branch.id === selectedRestockBranchId)?.name ??
      'selected branch'
    )
  }, [branchesQuery.data, selectedRestockBranchId])

  const selectedStockCountBranchId = useMemo(() => {
    const branchId = Number(stockCountForm.branchId)
    return Number.isFinite(branchId) && branchId > 0 ? branchId : undefined
  }, [stockCountForm.branchId])

  const selectedStockTransferProductId = useMemo(() => {
    const productId = Number(stockTransferForm.productId)
    return Number.isFinite(productId) && productId > 0 ? productId : undefined
  }, [stockTransferForm.productId])

  const selectedStockTransferFromBranchId = useMemo(() => {
    const branchId = Number(stockTransferForm.fromBranchId)
    return Number.isFinite(branchId) && branchId > 0 ? branchId : undefined
  }, [stockTransferForm.fromBranchId])

  const selectedStockTransferToBranchId = useMemo(() => {
    const branchId = Number(stockTransferForm.toBranchId)
    return Number.isFinite(branchId) && branchId > 0 ? branchId : undefined
  }, [stockTransferForm.toBranchId])

  const selectedStockCountBranchName = useMemo(() => {
    if (!selectedStockCountBranchId) {
      return ''
    }

    return (
      branchesQuery.data?.find((branch) => branch.id === selectedStockCountBranchId)?.name ??
      'selected branch'
    )
  }, [branchesQuery.data, selectedStockCountBranchId])

  const selectedStockTransferFromBranchName = useMemo(() => {
    if (!selectedStockTransferFromBranchId) {
      return ''
    }

    return (
      branchesQuery.data?.find((branch) => branch.id === selectedStockTransferFromBranchId)?.name ??
      'source branch'
    )
  }, [branchesQuery.data, selectedStockTransferFromBranchId])

  const selectedStockTransferToBranchName = useMemo(() => {
    if (!selectedStockTransferToBranchId) {
      return ''
    }

    return (
      branchesQuery.data?.find((branch) => branch.id === selectedStockTransferToBranchId)?.name ??
      'destination branch'
    )
  }, [branchesQuery.data, selectedStockTransferToBranchId])

  const restockRowProductQueries = useQueries({
    queries: restockForm.rows.map((row) => {
      const productId = Number(row.productId)
      const isEnabled =
        Number.isFinite(productId) &&
        productId > 0 &&
        typeof selectedRestockBranchId === 'number' &&
        selectedRestockBranchId > 0

      return {
        queryKey: [
          'products',
          'details',
          selectedRestockBranchId ?? 'none',
          productId || 'none'
        ],
        queryFn: () =>
          getProductRequest(productId, {
            branch_id: selectedRestockBranchId
          }),
        enabled: isEnabled,
        staleTime: 30_000
      }
    })
  })

  const stockCountRowStockQueries = useQueries({
    queries: stockCountForm.rows.map((row) => {
      const productId = Number(row.productId)
      const isEnabled =
        Number.isFinite(productId) &&
        productId > 0 &&
        typeof selectedStockCountBranchId === 'number' &&
        selectedStockCountBranchId > 0

      return {
        queryKey: [
          'inventory',
          'stock-status',
          'stock-count-row',
          selectedStockCountBranchId ?? 'none',
          productId || 'none'
        ],
        queryFn: async () => {
          const response = await getStockStatusRequest({
            branch_id: selectedStockCountBranchId,
            product_id: productId,
            limit: 1
          })

          return response.find((item) => item.product_id === productId) ?? response[0] ?? null
        },
        enabled: isEnabled,
        staleTime: 30_000
      }
    })
  })

  const stockTransferSourceStockQuery = useQuery({
    queryKey: [
      'inventory',
      'stock-status',
      'transfer-source',
      selectedStockTransferFromBranchId ?? 'none',
      selectedStockTransferProductId ?? 'none'
    ],
    queryFn: async () => {
      const response = await getStockStatusRequest({
        branch_id: selectedStockTransferFromBranchId,
        product_id: selectedStockTransferProductId,
        limit: 1
      })

      return (
        response.find((item) => item.product_id === selectedStockTransferProductId) ??
        response[0] ??
        null
      )
    },
    enabled:
      typeof selectedStockTransferFromBranchId === 'number' &&
      selectedStockTransferFromBranchId > 0 &&
      typeof selectedStockTransferProductId === 'number' &&
      selectedStockTransferProductId > 0,
    staleTime: 30_000
  })

  const stockTransferDestinationStockQuery = useQuery({
    queryKey: [
      'inventory',
      'stock-status',
      'transfer-destination',
      selectedStockTransferToBranchId ?? 'none',
      selectedStockTransferProductId ?? 'none'
    ],
    queryFn: async () => {
      const response = await getStockStatusRequest({
        branch_id: selectedStockTransferToBranchId,
        product_id: selectedStockTransferProductId,
        limit: 1
      })

      return (
        response.find((item) => item.product_id === selectedStockTransferProductId) ??
        response[0] ??
        null
      )
    },
    enabled:
      typeof selectedStockTransferToBranchId === 'number' &&
      selectedStockTransferToBranchId > 0 &&
      typeof selectedStockTransferProductId === 'number' &&
      selectedStockTransferProductId > 0,
    staleTime: 30_000
  })

  useEffect(() => {
    if (!defaultInventoryBranchId) {
      return
    }

    setRestockForm((prev) =>
      prev.branchId
        ? prev
        : {
            ...prev,
            branchId: defaultInventoryBranchId
          }
    )
    setStockCountForm((prev) =>
      prev.branchId
        ? prev
        : {
            ...prev,
            branchId: defaultInventoryBranchId
          }
    )
    setStockTransferForm((prev) =>
      prev.fromBranchId
        ? prev
        : {
            ...prev,
            fromBranchId: defaultInventoryBranchId
          }
    )
  }, [defaultInventoryBranchId])

  useEffect(() => {
    setStockTransferForm((prev) =>
      prev.fromBranchId && prev.fromBranchId === prev.toBranchId
        ? { ...prev, toBranchId: '' }
        : prev
    )
  }, [stockTransferForm.fromBranchId])

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
    field: 'productId' | 'productVariantId' | 'quantity' | 'buyingPrice' | 'sellingPrice' | 'notes',
    value: string
  ) => {
    updateRestockRow(rowId, (row) => {
      const next = { ...row, [field]: value } as RestockRowState
      if (field === 'productId') {
        next.productVariantId = ''
      }
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

  const updateStockCountRow = (
    rowId: string,
    updater: (row: StockCountRowState) => StockCountRowState
  ) => {
    setStockCountForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === rowId ? updater(row) : row))
    }))
  }

  const updateStockCountRowField = (
    rowId: string,
    field:
      | 'productId'
      | 'physicalStock'
      | 'adjustmentReason'
      | 'adjustmentReference'
      | 'valuationMethod'
      | 'adjustmentBuyingPrice'
      | 'adjustmentSellingPrice'
      | 'notes',
    value: string
  ) => {
    updateStockCountRow(rowId, (row) => ({ ...row, [field]: value }))
  }

  const updateStockCountRowAdjustment = (rowId: string, applyAdjustment: boolean) => {
    updateStockCountRow(rowId, (row) => ({
      ...row,
      applyAdjustment,
      adjustmentReason: applyAdjustment ? row.adjustmentReason : '',
      adjustmentReference: applyAdjustment ? row.adjustmentReference : '',
      adjustmentBuyingPrice: applyAdjustment ? row.adjustmentBuyingPrice : '',
      adjustmentSellingPrice: applyAdjustment ? row.adjustmentSellingPrice : ''
    }))
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

  const addStockCountRow = () => {
    setStockCountForm((prev) => ({
      ...prev,
      rows: [...prev.rows, createStockCountRow()]
    }))
  }

  const removeStockCountRow = (rowId: string) => {
    setStockCountForm((prev) => ({
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

  const stockCountTotals = useMemo(() => {
    return stockCountForm.rows.reduce(
      (acc, row, index) => {
        const physicalStock = toSafeNumber(row.physicalStock)
        const currentStock = stockCountRowStockQueries[index]?.data?.stock_quantity ?? 0
        acc.totalPhysical += physicalStock
        acc.totalVariance += physicalStock - currentStock
        return acc
      },
      {
        totalPhysical: 0,
        totalVariance: 0
      }
    )
  }, [stockCountForm.rows, stockCountRowStockQueries])

  const stockTransferQuantity = useMemo(() => {
    const quantity = Number(stockTransferForm.quantity)
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 0
  }, [stockTransferForm.quantity])

  const stockTransferSourceAvailable = stockTransferSourceStockQuery.data?.stock_quantity ?? 0
  const stockTransferDestinationAvailable =
    stockTransferDestinationStockQuery.data?.stock_quantity ?? 0
  const stockTransferProjectedSource = stockTransferSourceAvailable - stockTransferQuantity
  const stockTransferProjectedDestination =
    stockTransferDestinationAvailable + stockTransferQuantity

  const getProductOptionsForRow = () => {
    return [
      { label: 'Select product', value: '' },
      ...((productsQuery.data ?? [])
        .map((product) => ({
          label: `${product.name} (${product.sku})`,
          value: String(product.id)
        })) || [])
    ]
  }

  const getProductOptionsForStockCountRow = (rowId: string, currentProductId: string) => {
    const selectedInOtherRows = new Set(
      stockCountForm.rows
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
        const productVariantId = row.productVariantId ? Number(row.productVariantId) : undefined
        const quantity = Number(row.quantity)
        const buyingPrice = Number(row.buyingPrice)
        const sellingPrice = Number(row.sellingPrice)
        const maxOfferAmount = Number(row.maxOfferAmount)
        const rowProduct = restockRowProductQueries[index]?.data
        const hasVariants = (rowProduct?.variants?.length ?? 0) > 0

        if (!productId) {
          throw new Error(`Row ${index + 1}: select a product.`)
        }
        if (!rowProduct) {
          throw new Error(`Row ${index + 1}: product details are still loading. Try again.`)
        }
        if (hasVariants && !productVariantId) {
          throw new Error(`Row ${index + 1}: select the exact variant to restock.`)
        }
        if (
          hasVariants &&
          !rowProduct.variants?.some((variant) => variant.id === productVariantId)
        ) {
          throw new Error(`Row ${index + 1}: selected variant is not valid for this product.`)
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
          product_variant_id: hasVariants ? productVariantId : undefined,
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
      setRestockForm(createEmptyRestockForm(defaultInventoryBranchId))
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
      const branchId = Number(payload.branchId)

      if (!branchId) {
        throw new Error('Please select a branch.')
      }
      if (!payload.rows.length) {
        throw new Error('Add at least one product row.')
      }

      const requests = payload.rows.map((row, index) => {
        const productId = Number(row.productId)
        const physicalStock = Number(row.physicalStock)
        const hasAdjustmentBuyingPrice =
          row.applyAdjustment && row.adjustmentBuyingPrice.trim() !== ''
        const hasAdjustmentSellingPrice =
          row.applyAdjustment && row.adjustmentSellingPrice.trim() !== ''
        const adjustmentReason = row.applyAdjustment
          ? ((row.adjustmentReason || undefined) as StockCountAdjustmentReason | undefined)
          : undefined
        const adjustmentReference = row.applyAdjustment
          ? row.adjustmentReference.trim() || undefined
          : undefined
        const adjustmentBuyingPrice = hasAdjustmentBuyingPrice
          ? Number(row.adjustmentBuyingPrice)
          : undefined
        const adjustmentSellingPrice = hasAdjustmentSellingPrice
          ? Number(row.adjustmentSellingPrice)
          : undefined

        if (!productId) {
          throw new Error(`Row ${index + 1}: select a product.`)
        }
        if (Number.isNaN(physicalStock) || physicalStock < 0) {
          throw new Error(`Row ${index + 1}: physical stock must be 0 or more.`)
        }
        if (
          hasAdjustmentBuyingPrice &&
          (Number.isNaN(adjustmentBuyingPrice ?? NaN) || (adjustmentBuyingPrice ?? 0) < 0)
        ) {
          throw new Error(`Row ${index + 1}: adjustment buying price must be 0 or more.`)
        }
        if (
          hasAdjustmentSellingPrice &&
          (Number.isNaN(adjustmentSellingPrice ?? NaN) || (adjustmentSellingPrice ?? 0) < 0)
        ) {
          throw new Error(`Row ${index + 1}: adjustment selling price must be 0 or more.`)
        }

        return createStockCountRequest({
          product_id: productId,
          branch_id: branchId,
          count_date: payload.countDate,
          physical_stock: physicalStock,
          apply_adjustment: row.applyAdjustment,
          adjustment_reason: adjustmentReason,
          adjustment_reference: adjustmentReference,
          valuation_method: row.valuationMethod
            ? (row.valuationMethod as InventoryValuationMethod)
            : undefined,
          adjustment_buying_price: adjustmentBuyingPrice,
          adjustment_selling_price: adjustmentSellingPrice,
          notes: row.notes.trim() || undefined
        })
      })

      return Promise.all(requests)
    },
    onSuccess: () => {
      setStockCountForm(createEmptyStockCountForm(defaultInventoryBranchId))
      setStockCountError(null)
      setShowStockCountForm(false)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
    },
    onError: (error: Error) => {
      setStockCountError(error.message || 'Could not create stock count.')
    }
  })

  const createStockTransferMutation = useMutation({
    mutationFn: async (payload: StockTransferFormState) => {
      const productId = Number(payload.productId)
      const fromBranchId = Number(payload.fromBranchId)
      const toBranchId = Number(payload.toBranchId)
      const quantity = Number(payload.quantity)

      if (!productId) {
        throw new Error('Please select a product to transfer.')
      }
      if (!fromBranchId) {
        throw new Error('Please select a source branch.')
      }
      if (!toBranchId) {
        throw new Error('Please select a destination branch.')
      }
      if (fromBranchId === toBranchId) {
        throw new Error('Source and destination branches must be different.')
      }
      if (Number.isNaN(quantity) || quantity < 1) {
        throw new Error('Transfer quantity must be 1 or more.')
      }
      if (stockTransferSourceAvailable < quantity) {
        throw new Error(
          `Insufficient stock in ${selectedStockTransferFromBranchName || 'the source branch'}. Available stock is ${stockTransferSourceAvailable}.`
        )
      }

      return createStockTransferRequest({
        product_id: productId,
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        quantity,
        transfer_date: payload.transferDate,
        notes: payload.notes.trim() || undefined
      })
    },
    onSuccess: (transfer: StockTransferResponse) => {
      setStockTransferError(null)
      setStockTransferSuccess(
        `${transfer.quantity} unit${transfer.quantity === 1 ? '' : 's'} moved from ${transfer.from_branch_name} to ${transfer.to_branch_name}.`
      )
      setStockTransferForm(createEmptyStockTransferForm(String(transfer.from_branch_id)))
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'inventory-select'] })
    },
    onError: (error: unknown) => {
      setStockTransferSuccess(null)
      setStockTransferError(
        extractApiErrorMessage(error, 'Could not transfer stock between branches.')
      )
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

  const stockStatusTotalValue = useMemo(
    () => (stockStatusQuery.data ?? []).reduce((total, row) => total + row.in_stock_value, 0),
    [stockStatusQuery.data]
  )

  const stockStatusColumns: Column<ProductStockStatusResponse>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => {
        const variantSummary = formatVariantOptionsSummary(row.variant_options)
        const displaySku = row.variant_sku ?? row.sku

        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <CubeIcon className="h-4 w-4 text-primary/50" />
            </div>
            <div>
              <p className="font-medium text-text">{row.product_name}</p>
              <p className="text-xs text-text-tertiary">SKU: {displaySku}</p>
              {variantSummary ? (
                <p className="mt-1 text-xs text-text-secondary">{variantSummary}</p>
              ) : null}
            </div>
          </div>
        )
      }
    },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
          <BuildingStorefrontIcon className="h-3 w-3" />
          {row.branch_name ?? 'All branches'}
        </span>
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
      render: (row) => {
        const lowStock = isLowStockStatus(row)

        return (
          <div>
            <p className="mt-1 text-xs text-text-tertiary">
              Branch stock:{' '}
              <span className={`font-medium ${lowStock ? 'text-warning' : 'text-success'}`}>
                {row.stock_quantity}
              </span>
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Reorder level: <span className="font-medium text-text">{row.reorder_level}</span>
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Business total:{' '}
              <span className="font-medium text-text">{row.business_stock_quantity}</span>
            </p>
            <div className="mt-1 h-1.5 w-20 rounded-full bg-background">
              <div
                className={`h-full rounded-full ${
                  lowStock ? 'bg-warning' : 'bg-success'
                }`}
                style={{
                  width: `${Math.min((row.stock_quantity / (row.reorder_level * 2)) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )
      }
    },
    {
      key: 'selling_price',
      header: 'Sell price',
      render: (row) => (
        <span className="font-medium text-primary">{formatCurrency(row.selling_price)}</span>
      ),
      footer: <span className="text-text-secondary">Total</span>,
      align: 'right'
    },
    {
      key: 'in_stock_value',
      header: 'Stock value',
      render: (row) => (
        <span className="font-medium text-text">{formatCurrency(row.in_stock_value)}</span>
      ),
      footer: <span className="text-base font-semibold text-primary">{formatCurrency(stockStatusTotalValue)}</span>,
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

  const onSubmitStockTransfer = (event: FormEvent) => {
    event.preventDefault()
    setStockTransferError(null)
    setStockTransferSuccess(null)
    createStockTransferMutation.mutate(stockTransferForm)
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
              Manage restocks, stock transfers, stock counts, and monitor live inventory status
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
              variant="outline"
              onClick={() => {
                setShowStockTransferForm(!showStockTransferForm)
                setStockTransferError(null)
                setStockTransferSuccess(null)
              }}
              className="flex items-center gap-2"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              {showStockTransferForm ? 'Close Transfer' : 'New Transfer'}
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
                <div>
                  <h2 className="text-sm font-semibold text-text">Create New Restock</h2>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Choose the branch you are restocking for. Main branch is selected by default.
                  </p>
                </div>
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
                    const rowProductQuery = restockRowProductQueries[index]
                    const selectedProduct = rowProductQuery?.data ?? null
                    const variants = selectedProduct?.variants ?? []
                    const hasVariants = variants.length > 0
                    const selectedVariant = variants.find(
                      (variant) => String(variant.id) === row.productVariantId
                    )
                    const variantSelectPlaceholder = row.productId
                      ? rowProductQuery?.isLoading
                        ? 'Loading variants...'
                        : hasVariants
                        ? 'Select variant'
                        : 'No variants for this product'
                      : 'Select a product first'

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
                            options={getProductOptionsForRow()}
                            value={row.productId}
                            onChange={(event) =>
                              updateRestockRowField(row.id, 'productId', String(event.target.value))
                            }
                            required
                          />
                          <Select
                            label="Variant"
                            options={[
                              {
                                label: variantSelectPlaceholder,
                                value: ''
                              },
                              ...variants.map((variant) => ({
                                label: formatVariantLabel(variant),
                                value: String(variant.id)
                              }))
                            ]}
                            value={row.productVariantId}
                            onChange={(event) =>
                              updateRestockRowField(
                                row.id,
                                'productVariantId',
                                String(event.target.value)
                              )
                            }
                            disabled={!hasVariants}
                            required={hasVariants}
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
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
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
                          <TextInput
                            label="Restock Target"
                            value={
                              hasVariants
                                ? selectedVariant
                                  ? formatVariantLabel(selectedVariant)
                                  : 'Select a variant to choose the exact SKU'
                                : row.productId
                                ? 'Base product stock'
                                : 'Select a product first'
                            }
                            readOnly
                            className="bg-white"
                          />
                        </div>

                        <div className="mt-3 rounded-lg border border-border bg-white px-3 py-2">
                          {!restockForm.branchId ? (
                            <p className="text-xs text-text-tertiary">
                              Select a branch to load current stock for this product.
                            </p>
                          ) : !row.productId ? (
                            <p className="text-xs text-text-tertiary">
                              Select a product to see current stock in {selectedRestockBranchName}.
                            </p>
                          ) : rowProductQuery?.isLoading ? (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              Loading product details for {selectedRestockBranchName}...
                            </div>
                          ) : rowProductQuery?.isError ? (
                            <p className="text-xs text-error">
                              Could not load product details for this branch.
                            </p>
                          ) : hasVariants && !row.productVariantId ? (
                            <p className="text-xs text-text-tertiary">
                              This product has variants. Select the exact variant before recording
                              new stock.
                            </p>
                          ) : hasVariants && selectedVariant ? (
                            <div className="flex flex-col gap-1 text-xs text-text-secondary sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                              <span>
                                Variant SKU: <strong className="text-text">{selectedVariant.sku}</strong>
                              </span>
                              <span>
                                Current stock in {selectedRestockBranchName}:{' '}
                                <strong className="text-text">{selectedVariant.stock_quantity}</strong>
                              </span>
                              <span>
                                Target: <strong className="text-text">{formatVariantLabel(selectedVariant)}</strong>
                              </span>
                            </div>
                          ) : selectedProduct ? (
                            <div className="flex flex-col gap-1 text-xs text-text-secondary sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                              <span>
                                Current stock in {selectedRestockBranchName}:{' '}
                                <strong className="text-text">{selectedProduct.stock_quantity}</strong>
                              </span>
                              <span>
                                Reorder level:{' '}
                                <strong className="text-text">{selectedProduct.reorder_level}</strong>
                              </span>
                              <span>
                                Restocking: <strong className="text-text">Base product stock</strong>
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-text-tertiary">
                              No product details found for this selection in {selectedRestockBranchName}.
                            </p>
                          )}
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
                      setRestockForm(createEmptyRestockForm(defaultInventoryBranchId))
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

      {/* Stock Transfer Form */}
      <AnimatePresence>
        {showStockTransferForm && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ArrowsRightLeftIcon className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-text">Transfer Stock Between Branches</h2>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Move stock from one branch to another without changing total business stock.
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmitStockTransfer} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Select
                    label="Product"
                    options={stockTransferProductOptions}
                    value={stockTransferForm.productId}
                    onChange={(event) =>
                      setStockTransferForm((prev) => ({
                        ...prev,
                        productId: String(event.target.value)
                      }))
                    }
                    required
                  />
                  <Select
                    label="Source Branch"
                    options={stockTransferFromBranchOptions}
                    value={stockTransferForm.fromBranchId}
                    onChange={(event) =>
                      setStockTransferForm((prev) => ({
                        ...prev,
                        fromBranchId: String(event.target.value)
                      }))
                    }
                    required
                  />
                  <Select
                    label="Destination Branch"
                    options={stockTransferToBranchOptions}
                    value={stockTransferForm.toBranchId}
                    onChange={(event) =>
                      setStockTransferForm((prev) => ({
                        ...prev,
                        toBranchId: String(event.target.value)
                      }))
                    }
                    helperText="Destination must be different from the source branch."
                    required
                  />
                  <TextInput
                    label="Transfer Date"
                    type="date"
                    value={stockTransferForm.transferDate}
                    onChange={(event) =>
                      setStockTransferForm((prev) => ({
                        ...prev,
                        transferDate: event.target.value
                      }))
                    }
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Quantity"
                    type="number"
                    min={1}
                    value={stockTransferForm.quantity}
                    onChange={(event) =>
                      setStockTransferForm((prev) => ({
                        ...prev,
                        quantity: event.target.value
                      }))
                    }
                    helperText="The source branch must have enough stock for this transfer."
                    required
                  />
                  <TextArea
                    label="Notes"
                    rows={3}
                    value={stockTransferForm.notes}
                    onChange={(event) =>
                      setStockTransferForm((prev) => ({
                        ...prev,
                        notes: event.target.value
                      }))
                    }
                    placeholder="Move stock to Westlands showroom"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <BuildingStorefrontIcon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-text">Source Preview</p>
                    </div>
                    <div className="mt-3 text-xs text-text-secondary">
                      {!stockTransferForm.fromBranchId ? (
                        <p>Select a source branch.</p>
                      ) : !stockTransferForm.productId ? (
                        <p>Select a product to load source stock.</p>
                      ) : stockTransferSourceStockQuery.isLoading ? (
                        <div className="flex items-center gap-2">
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                          Loading source stock...
                        </div>
                      ) : stockTransferSourceStockQuery.isError ? (
                        <p className="text-error">Could not load source stock.</p>
                      ) : (
                        <div className="space-y-1">
                          <p>
                            Branch:{' '}
                            <strong className="text-text">
                              {selectedStockTransferFromBranchName || 'Source branch'}
                            </strong>
                          </p>
                          <p>
                            Available stock:{' '}
                            <strong
                              className={
                                stockTransferSourceAvailable >= stockTransferQuantity
                                  ? 'text-success'
                                  : 'text-error'
                              }
                            >
                              {stockTransferSourceAvailable}
                            </strong>
                          </p>
                          <p>
                            After transfer:{' '}
                            <strong
                              className={
                                stockTransferProjectedSource >= 0 ? 'text-text' : 'text-error'
                              }
                            >
                              {stockTransferProjectedSource}
                            </strong>
                          </p>
                          <p>
                            Business stock:{' '}
                            <strong className="text-text">
                              {stockTransferSourceStockQuery.data?.business_stock_quantity ?? 0}
                            </strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <BuildingStorefrontIcon className="h-4 w-4 text-secondary" />
                      <p className="text-sm font-semibold text-text">Destination Preview</p>
                    </div>
                    <div className="mt-3 text-xs text-text-secondary">
                      {!stockTransferForm.toBranchId ? (
                        <p>Select a destination branch.</p>
                      ) : !stockTransferForm.productId ? (
                        <p>Select a product to load destination stock.</p>
                      ) : stockTransferDestinationStockQuery.isLoading ? (
                        <div className="flex items-center gap-2">
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                          Loading destination stock...
                        </div>
                      ) : stockTransferDestinationStockQuery.isError ? (
                        <p className="text-error">Could not load destination stock.</p>
                      ) : (
                        <div className="space-y-1">
                          <p>
                            Branch:{' '}
                            <strong className="text-text">
                              {selectedStockTransferToBranchName || 'Destination branch'}
                            </strong>
                          </p>
                          <p>
                            Current stock:{' '}
                            <strong className="text-text">{stockTransferDestinationAvailable}</strong>
                          </p>
                          <p>
                            After transfer:{' '}
                            <strong className="text-success">
                              {stockTransferProjectedDestination}
                            </strong>
                          </p>
                          <p>
                            Business stock remains:{' '}
                            <strong className="text-text">
                              {stockTransferSourceStockQuery.data?.business_stock_quantity ??
                                stockTransferDestinationStockQuery.data?.business_stock_quantity ??
                                0}
                            </strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {stockTransferSuccess ? (
                  <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4" />
                      {stockTransferSuccess}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    loading={createStockTransferMutation.isPending}
                    className="min-w-[140px]"
                  >
                    Save Transfer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowStockTransferForm(false)
                      setStockTransferForm(createEmptyStockTransferForm(defaultInventoryBranchId))
                      setStockTransferError(null)
                      setStockTransferSuccess(null)
                    }}
                  >
                    Cancel
                  </Button>
                  {stockTransferError && (
                    <span className="text-xs text-error flex items-center gap-1">
                      <XCircleIcon className="h-4 w-4" />
                      {stockTransferError}
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
                <div>
                  <h2 className="text-sm font-semibold text-text">Create Stock Count</h2>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Choose the branch you are counting for. Main branch is selected by default.
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmitStockCount} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Count Date"
                    type="date"
                    value={stockCountForm.countDate}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({ ...prev, countDate: event.target.value }))
                    }
                    required
                  />
                  <Select
                    label="Branch"
                    options={branchOptions}
                    value={stockCountForm.branchId}
                    onChange={(event) =>
                      setStockCountForm((prev) => ({ ...prev, branchId: String(event.target.value) }))
                    }
                    required
                  />
                </div>

                <div className="space-y-3">
                  {stockCountForm.rows.map((row, index) => {
                    const rowStockQuery = stockCountRowStockQueries[index]
                    const currentStock = rowStockQuery?.data ?? null
                    const physicalStock = toSafeNumber(row.physicalStock)
                    const variance = currentStock ? physicalStock - currentStock.stock_quantity : null

                    return (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-background rounded-lg border border-border p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-text-secondary">
                              Product {index + 1}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStockCountRow(row.id)}
                            disabled={stockCountForm.rows.length === 1}
                            className="text-error hover:bg-error/5"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <Select
                            label="Product"
                            options={getProductOptionsForStockCountRow(row.id, row.productId)}
                            value={row.productId}
                            onChange={(event) =>
                              updateStockCountRowField(row.id, 'productId', String(event.target.value))
                            }
                            required
                          />
                          <TextInput
                            label="Physical Stock"
                            type="number"
                            min={0}
                            value={row.physicalStock}
                            onChange={(event) =>
                              updateStockCountRowField(row.id, 'physicalStock', event.target.value)
                            }
                            required
                          />
                          <Select
                            label="Valuation Method (optional)"
                            options={stockCountValuationOptions}
                            value={row.valuationMethod}
                            onChange={(event) =>
                              updateStockCountRowField(
                                row.id,
                                'valuationMethod',
                                String(event.target.value)
                              )
                            }
                          />
                        </div>

                        <div className="mt-3 rounded-lg border border-border bg-white px-3 py-2">
                          {!stockCountForm.branchId ? (
                            <p className="text-xs text-text-tertiary">
                              Select a branch to load current stock for this product.
                            </p>
                          ) : !row.productId ? (
                            <p className="text-xs text-text-tertiary">
                              Select a product to see current stock in {selectedStockCountBranchName}.
                            </p>
                          ) : rowStockQuery?.isLoading ? (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              Loading current stock for {selectedStockCountBranchName}...
                            </div>
                          ) : rowStockQuery?.isError ? (
                            <p className="text-xs text-error">
                              Could not load current stock for this branch.
                            </p>
                          ) : currentStock ? (
                            <div className="flex flex-col gap-1 text-xs text-text-secondary sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                              <span>
                                Current stock in {currentStock.branch_name ?? selectedStockCountBranchName}:{' '}
                                <strong className="text-text">{currentStock.stock_quantity}</strong>
                              </span>
                              <span>
                                Business stock:{' '}
                                <strong className="text-text">
                                  {currentStock.business_stock_quantity}
                                </strong>
                              </span>
                              <span>
                                Variance after count:{' '}
                                <strong
                                  className={
                                    variance === null
                                      ? 'text-text'
                                      : variance >= 0
                                        ? 'text-success'
                                        : 'text-error'
                                  }
                                >
                                  {variance !== null ? `${variance > 0 ? '+' : ''}${variance}` : '--'}
                                </strong>
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-text-tertiary">
                              No stock record found for this product in {selectedStockCountBranchName}.
                            </p>
                          )}
                        </div>

                        <label className="mt-3 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.applyAdjustment}
                            onChange={(event) =>
                              updateStockCountRowAdjustment(row.id, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                          />
                          <span className="text-sm text-text-secondary">
                            Apply adjustment immediately
                          </span>
                        </label>

                        {row.applyAdjustment && (
                          <div className="mt-3 grid gap-4 md:grid-cols-2">
                            <Select
                              label="Adjustment Reason"
                              options={stockCountAdjustmentReasonOptions}
                              value={row.adjustmentReason}
                              onChange={(event) =>
                                updateStockCountRowField(
                                  row.id,
                                  'adjustmentReason',
                                  String(event.target.value)
                                )
                              }
                            />
                            <TextInput
                              label="Adjustment Reference (optional)"
                              value={row.adjustmentReference}
                              onChange={(event) =>
                                updateStockCountRowField(
                                  row.id,
                                  'adjustmentReference',
                                  event.target.value
                                )
                              }
                              placeholder="Reference, note, or document number"
                            />
                            <TextInput
                              label="Adjustment Buying Price (optional)"
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.adjustmentBuyingPrice}
                              onChange={(event) =>
                                updateStockCountRowField(
                                  row.id,
                                  'adjustmentBuyingPrice',
                                  event.target.value
                                )
                              }
                            />
                            <TextInput
                              label="Adjustment Selling Price (optional)"
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.adjustmentSellingPrice}
                              onChange={(event) =>
                                updateStockCountRowField(
                                  row.id,
                                  'adjustmentSellingPrice',
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        )}

                        <div className="mt-3">
                          <TextInput
                            label="Notes"
                            value={row.notes}
                            onChange={(event) =>
                              updateStockCountRowField(row.id, 'notes', event.target.value)
                            }
                            placeholder="Optional notes about this count"
                          />
                        </div>
                      </motion.div>
                    )
                  })}

                  <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addStockCountRow}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Product Row
                    </Button>

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-text-tertiary">Total Physical Count</p>
                          <p className="font-semibold text-text">{stockCountTotals.totalPhysical}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-tertiary">Total Variance</p>
                          <p
                            className={`font-semibold ${
                              stockCountTotals.totalVariance >= 0 ? 'text-success' : 'text-error'
                            }`}
                          >
                            {stockCountTotals.totalVariance > 0 ? '+' : ''}
                            {stockCountTotals.totalVariance}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                      setStockCountForm(createEmptyStockCountForm(defaultInventoryBranchId))
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
          <div className="border-b border-border p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                  <CubeIcon className="h-4 w-4 text-primary" />
                  Stock Status
                </h2>
                <p className="mt-1 text-xs text-text-tertiary">
                  Filter live stock by branch, product, or leave both on all to view everything.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Select
                  label="Branch"
                  value={stockStatusBranchFilter}
                  onChange={(event) => setStockStatusBranchFilter(event.target.value)}
                  options={stockStatusBranchOptions}
                  className="min-w-[220px]"
                />
                <Select
                  label="Product"
                  value={stockStatusProductFilter}
                  onChange={(event) => setStockStatusProductFilter(event.target.value)}
                  options={stockStatusProductOptions}
                  className="min-w-[260px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStockStatusBranchFilter('all')
                    setStockStatusProductFilter('all')
                  }}
                  disabled={
                    stockStatusBranchFilter === 'all' && stockStatusProductFilter === 'all'
                  }
                  className="sm:self-end"
                >
                  View All
                </Button>
              </div>
            </div>

            {stockStatusQuery.isFetching && (
              <div className="mt-3">
                <span className="text-xs text-text-tertiary flex items-center gap-1">
                  <ArrowPathIcon className="h-3 w-3 animate-spin" />
                  Refreshing stock balances...
                </span>
              </div>
            )}
          </div>
          <DataTable
            columns={stockStatusColumns}
            data={stockStatusQuery.data ?? []}
            getRowKey={(row) =>
              `${row.branch_id ?? 'all'}-${row.product_id}-${row.product_variant_id ?? 'base'}`
            }
            emptyState={
              stockStatusQuery.isLoading ? (
                <div className="p-8 text-center">
                  <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                  <p className="text-sm text-text-secondary">Loading stock balances...</p>
                </div>
              ) : stockStatusQuery.isError ? (
                <div className="p-8 text-center">
                  <XCircleIcon className="h-10 w-10 mx-auto text-error/40 mb-3" />
                  <p className="text-sm text-error">Could not load stock balances.</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CubeIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                  <p className="text-sm text-text-secondary">No stock records found</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Try another branch or product filter, or switch back to View All.
                  </p>
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
