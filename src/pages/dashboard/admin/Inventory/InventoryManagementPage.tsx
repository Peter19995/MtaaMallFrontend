import { FormEvent, useEffect, useMemo, useState } from 'react'
import { requestApproval } from '@api/modules/audit.api'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
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
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, useSiteDialog, type Column } from '@components/common'
import { adoptCatalogProductRequest, getProductRequest, listProductsRequest } from '@api/modules/products.api'
import { searchCatalogProductsRequest, type CatalogProductSearchResult } from '@api/modules/catalog.api'
import { listTaxRatesRequest } from '@api/modules/finance.api'
import { useAuth } from '@hooks/useAuth'
import { useWorkspacePath } from '@hooks/useWorkspacePath'
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
  listSuppliersRequest,
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
  variantSelections: Record<string, string>
  supplierId: string
  batchNumber: string
  expiryDate: string
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
  productVariantId: string
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
  variantSelections: {},
  supplierId: '',
  batchNumber: '',
  expiryDate: '',
  quantity: '1',
  buyingPrice: '0',
  sellingPrice: '0',
  maxOfferAmount: '0',
  maxOfferPercent: '0',
  maxOfferMode: 'amount',
  notes: ''
})

const restockTargetKey = (
  row: Pick<RestockRowState, 'productId' | 'productVariantId'>
) => `${row.productId}:${row.productVariantId || 'base'}`

const createStockCountRow = (): StockCountRowState => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId: '',
  productVariantId: '',
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
  rows: []
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

const suggestedBusinessSku = (product: CatalogProductSearchResult) =>
  `${product.name}${product.package_quantity ?? ''}${product.package_unit ?? ''}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)

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

export type InventoryView = 'status' | 'restocks' | 'create-restock' | 'stock-counts' | 'alerts'

type InventoryManagementPageProps = {
  view?: InventoryView
}

const inventoryViewCopy: Record<InventoryView, { title: string; description: string }> = {
  status: {
    title: 'Stock Status',
    description: 'Review live stock balances by branch and transfer stock between locations.'
  },
  restocks: {
    title: 'Restocks',
    description: 'Record incoming stock and review recent restocking activity.'
  },
  'create-restock': {
    title: 'Create New Restock',
    description: 'Receive stock by product and exact variant into an authorized branch.'
  },
  'stock-counts': {
    title: 'Stock Counts',
    description: 'Record physical counts and review recent inventory variances.'
  },
  alerts: {
    title: 'Inventory Alerts',
    description: 'Review low-stock, out-of-stock, and other inventory warnings.'
  }
}

const InventoryManagementPage = ({ view = 'status' }: InventoryManagementPageProps) => {
  const navigate = useNavigate()
  const workspacePath = useWorkspacePath()
  const isCreateRestockPage = view === 'create-restock'
  const isRestockWorkflow = view === 'restocks' || isCreateRestockPage
  const { hasPermission } = useAuth()
  const canSearchCatalogue = hasPermission('catalog.products.read')
  const canAdoptCatalogueProducts = hasPermission('products.create')
  const siteDialog = useSiteDialog()
  const [approvalNotice, setApprovalNotice] = useState('')
  const createStockCountOrRequestApproval = async (payload: Parameters<typeof createStockCountRequest>[0]) => {
    try { return await createStockCountRequest(payload) }
    catch (error) {
      if (!extractApiErrorMessage(error, '').includes('stock_writeoff requires')) throw error
      const reason = await siteDialog.prompt({
        title: 'Request stock write-off approval',
        message: 'This stock reduction requires approval from a business administrator.',
        inputLabel: 'Write-off reason',
        placeholder: 'Explain the stock discrepancy or loss',
        defaultValue: payload.notes ?? '',
        confirmLabel: 'Request approval',
        minLength: 3
      })
      if (!reason || reason.trim().length < 3) throw new Error('Write-off was not applied. A reason is required to request approval.')
      const request = await requestApproval('stock_writeoff', reason.trim(), payload)
      setApprovalNotice('Stock write-off submitted for approval. No stock was written off. Follow the request in Approvals.')
      return request
    }
  }
  const queryClient = useQueryClient()
  const statusLimit = 50
  const recentLimit = 10
  const [showRestockForm, setShowRestockForm] = useState(isCreateRestockPage)
  const [showRestockItemForm, setShowRestockItemForm] = useState(false)
  const [editingRestockRowId, setEditingRestockRowId] = useState<string | null>(null)
  const [restockItemDraft, setRestockItemDraft] = useState<RestockRowState>(createRestockRow())
  const [restockItemError, setRestockItemError] = useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogProduct, setCatalogProduct] = useState<CatalogProductSearchResult | null>(null)
  const [adoption, setAdoption] = useState({
    sku: '', sellingPrice: '', costPrice: '', taxRateId: '', variantIds: [] as string[]
  })
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
  const [stockStatusSearch, setStockStatusSearch] = useState('')

  const productsQuery = useQuery({
    queryKey: ['products', 'inventory-select'],
    queryFn: () => listProductsRequest({ limit: 200 })
  })

  const businessProductSearchQuery = useQuery({
    queryKey: ['products', 'inventory-business-search', catalogSearch.trim()],
    queryFn: () => listProductsRequest({ search: catalogSearch.trim(), limit: 8 }),
    enabled: showRestockItemForm && catalogSearch.trim().length >= 2,
    staleTime: 30_000
  })
  const businessProductMatches = businessProductSearchQuery.data ?? []

  const catalogSearchQuery = useQuery({
    queryKey: ['catalog', 'restock-search', catalogSearch.trim()],
    queryFn: () => searchCatalogProductsRequest({ q: catalogSearch.trim(), limit: 8 }),
    enabled:
      canSearchCatalogue &&
      showRestockItemForm &&
      catalogSearch.trim().length >= 2 &&
      businessProductSearchQuery.isSuccess &&
      businessProductMatches.length === 0,
    staleTime: 30_000
  })

  const adoptionTaxRatesQuery = useQuery({
    queryKey: ['finance', 'tax-rates', 'restock-adoption'],
    queryFn: listTaxRatesRequest,
    enabled: Boolean(catalogProduct) && hasPermission('finance.read')
  })

  const adoptProductMutation = useMutation({
    mutationFn: () => adoptCatalogProductRequest({
      catalog_product_id: catalogProduct!.public_id,
      business_sku: adoption.sku.trim(),
      selling_price: adoption.sellingPrice,
      cost_price: adoption.costPrice || null,
      tax_rate_id: adoption.taxRateId || null,
      available_online: false,
      enabled_catalog_variant_ids: catalogProduct!.variants.length ? adoption.variantIds : null
    }),
    onSuccess: (product) => {
      queryClient.setQueryData(['products', 'inventory-select'], (current: typeof productsQuery.data) => [
        ...(current ?? []).filter((item) => item.id !== product.id),
        product
      ])
      setRestockItemDraft((current) => ({
        ...current,
        productId: String(product.id),
        productVariantId: '',
        buyingPrice: adoption.costPrice || '0',
        sellingPrice: adoption.sellingPrice
      }))
      setCatalogProduct(null)
      setCatalogSearch('')
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'inventory-select'],
    queryFn: listBranchesRequest
  })

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'restock-select'],
    queryFn: listSuppliersRequest,
    enabled: isRestockWorkflow
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

  const supplierOptions = useMemo(
    () => [
      { label: suppliersQuery.isLoading ? 'Loading suppliers...' : 'No supplier selected', value: '' },
      ...(suppliersQuery.data ?? []).map((supplier) => ({
        label: supplier.name,
        value: String(supplier.id),
        description: [supplier.phone, supplier.email].filter(Boolean).join(' · ') || undefined
      }))
    ],
    [suppliersQuery.data, suppliersQuery.isLoading]
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

  const getStockCountAdjustmentReasonOptions = (variance: number | null) => {
    const allowedReasons = variance === null || variance === 0
      ? []
      : variance < 0
        ? ['sale_correction', 'restock_correction', 'lost', 'damaged', 'theft']
        : ['restock_correction']

    return [
      {
        label: variance === 0 ? 'No adjustment needed' : 'Select adjustment reason',
        value: ''
      },
      ...(stockCountAdjustmentReasonsQuery.data ?? [])
        .filter((reason) => allowedReasons.includes(reason.reason))
        .map((reason) => ({ label: reason.name, value: reason.reason }))
    ]
  }

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
            branch_id: selectedRestockBranchId,
            include_zero_variants: true
          }),
        enabled: isEnabled,
        staleTime: 30_000
      }
    })
  })

  const restockItemProductId = Number(restockItemDraft.productId)
  const restockItemProductQuery = useQuery({
    queryKey: [
      'products',
      'details',
      selectedRestockBranchId ?? 'none',
      restockItemProductId || 'none'
    ],
    queryFn: () =>
      getProductRequest(restockItemProductId, {
        branch_id: selectedRestockBranchId,
        include_zero_variants: true
      }),
    enabled:
      showRestockItemForm &&
      Number.isFinite(restockItemProductId) &&
      restockItemProductId > 0 &&
      typeof selectedRestockBranchId === 'number' &&
      selectedRestockBranchId > 0,
    staleTime: 30_000
  })

  const stockCountRowProductQueries = useQueries({
    queries: stockCountForm.rows.map((row) => {
      const productId = Number(row.productId)
      return {
        queryKey: [
          'products',
          'stock-count-details',
          selectedStockCountBranchId ?? 'none',
          productId || 'none'
        ],
        queryFn: () => getProductRequest(productId, {
          branch_id: selectedStockCountBranchId,
          include_zero_variants: true
        }),
        enabled: Number.isFinite(productId) && productId > 0 && Boolean(selectedStockCountBranchId),
        staleTime: 30_000
      }
    })
  })

  const stockCountRowStockQueries = useQueries({
    queries: stockCountForm.rows.map((row, index) => {
      const productId = Number(row.productId)
      const productVariantId = Number(row.productVariantId)
      const product = stockCountRowProductQueries[index]?.data
      const hasVariants = (product?.variants?.length ?? 0) > 0
      const isEnabled =
        Number.isFinite(productId) &&
        productId > 0 &&
        Boolean(product) &&
        (!hasVariants || (Number.isFinite(productVariantId) && productVariantId > 0)) &&
        typeof selectedStockCountBranchId === 'number' &&
        selectedStockCountBranchId > 0

      return {
        queryKey: [
          'inventory',
          'stock-status',
          'stock-count-row',
          selectedStockCountBranchId ?? 'none',
          productId || 'none',
          productVariantId || 'base'
        ],
        queryFn: async () => {
          const response = await getStockStatusRequest({
            branch_id: selectedStockCountBranchId,
            product_id: productId,
            product_variant_id: hasVariants ? productVariantId : undefined,
            limit: 1
          })

          return response.find((item) =>
            item.product_id === productId &&
            (!hasVariants || item.product_variant_id === productVariantId)
          ) ?? response[0] ?? null
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
      | 'productVariantId'
      | 'physicalStock'
      | 'adjustmentReason'
      | 'adjustmentReference'
      | 'valuationMethod'
      | 'adjustmentBuyingPrice'
      | 'adjustmentSellingPrice'
      | 'notes',
    value: string
  ) => {
    updateStockCountRow(rowId, (row) => ({
      ...row,
      [field]: value,
      ...(field === 'productId' ? { productVariantId: '' } : {})
    }))
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

  const openNewRestockItemForm = () => {
    setEditingRestockRowId(null)
    setRestockItemDraft(createRestockRow())
    setRestockItemError(null)
    setCatalogSearch('')
    setCatalogProduct(null)
    setShowRestockItemForm(true)
  }

  const openEditRestockItemForm = (row: RestockRowState) => {
    setEditingRestockRowId(row.id)
    setRestockItemDraft({ ...row })
    setRestockItemError(null)
    setShowRestockItemForm(true)
  }

  const closeRestockItemForm = () => {
    setShowRestockItemForm(false)
    setEditingRestockRowId(null)
    setRestockItemDraft(createRestockRow())
    setRestockItemError(null)
    setCatalogSearch('')
    setCatalogProduct(null)
  }

  const updateRestockItemDraft = (
    field: 'productId' | 'productVariantId' | 'supplierId' | 'batchNumber' | 'expiryDate' | 'quantity' | 'buyingPrice' | 'sellingPrice' | 'notes',
    value: string
  ) => {
    setRestockItemDraft((current) => {
      const next = { ...current, [field]: value } as RestockRowState
      if (field === 'productId') {
        next.productVariantId = ''
        next.variantSelections = {}
      }
      return field === 'quantity' || field === 'sellingPrice' ? syncMaxOffer(next) : next
    })
  }

  const saveRestockItemDraft = () => {
    const product = restockItemProductQuery.data
    if (!restockForm.branchId) return setRestockItemError('Select a branch first.')
    if (!restockItemDraft.productId) return setRestockItemError('Select a product.')
    if (restockItemProductQuery.isLoading || !product) {
      return setRestockItemError('Product details are still loading. Try again.')
    }
    if (toSafeNumber(restockItemDraft.quantity) < 1) {
      return setRestockItemError('Quantity must be 1 or more.')
    }
    if (toSafeNumber(restockItemDraft.buyingPrice) < 0 || toSafeNumber(restockItemDraft.sellingPrice) < 0) {
      return setRestockItemError('Buying and selling prices must be 0 or more.')
    }

    setRestockForm((current) => {
      const duplicate = current.rows.find(
        (row) => row.id !== editingRestockRowId && restockTargetKey(row) === restockTargetKey(restockItemDraft)
      )
      const targetRowId = editingRestockRowId ?? duplicate?.id
      return {
        ...current,
        rows: targetRowId
          ? current.rows.map((row) =>
              row.id === targetRowId ? { ...restockItemDraft, id: targetRowId } : row
            )
          : [...current.rows, restockItemDraft]
      }
    })
    closeRestockItemForm()
  }

  const removeRestockRow = (rowId: string) => {
    setRestockForm((prev) => ({
      ...prev,
      rows: prev.rows.filter((row) => row.id !== rowId)
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
    const productsAlreadyAdded = new Set(
      restockForm.rows
        .filter((row) => row.id !== editingRestockRowId && row.productId)
        .map((row) => row.productId)
    )
    return [
      { label: 'Select product', value: '' },
      ...((productsQuery.data ?? [])
        .map((product) => {
          const alreadyAdded = productsAlreadyAdded.has(String(product.id))
          const hasVariants = (product.variants?.length ?? 0) > 0
          return {
            label: `${product.name} (${product.sku})`,
            value: String(product.id),
            disabled: alreadyAdded && !hasVariants,
            description: alreadyAdded && !hasVariants
              ? 'Already added — adding it again updates the existing line'
              : hasVariants
                ? `${product.variants?.length} variant${product.variants?.length === 1 ? '' : 's'} available`
                : undefined
          }
        }) || [])
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
      ...((productsQuery.data ?? []).map((product) => {
        const productId = String(product.id)
        const alreadySelected = selectedInOtherRows.has(productId)
        const hasVariants = (product.variants?.length ?? 0) > 0
        return {
          label: `${product.name} (${product.sku})`,
          value: productId,
          disabled: productId !== currentProductId && alreadySelected && !hasVariants,
          description: hasVariants ? `${product.variants?.length} variants available` : undefined
        }
      }) || [])
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

      const targetKeys = payload.rows.map(restockTargetKey)
      if (new Set(targetKeys).size !== targetKeys.length) {
        throw new Error('Each product variant can appear only once. Edit the existing item.')
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
        if (
          hasVariants &&
          productVariantId !== undefined &&
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
          product_variant_id: productVariantId,
          supplier_id: row.supplierId ? Number(row.supplierId) : undefined,
          batch_number: row.batchNumber.trim() || undefined,
          expiry_date: row.expiryDate || undefined,
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
      if (isCreateRestockPage) navigate(workspacePath('/dashboard/admin/inventory/restocks'))
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

      const countTargets = payload.rows.map((row) =>
        `${row.productId}:${row.productVariantId || 'base'}`
      )
      if (new Set(countTargets).size !== countTargets.length) {
        throw new Error('Each product variant can appear only once in a stock count.')
      }

      const requests = payload.rows.map((row, index) => {
        const productId = Number(row.productId)
        const productVariantId = row.productVariantId ? Number(row.productVariantId) : undefined
        const rowProduct = stockCountRowProductQueries[index]?.data
        const hasVariants = (rowProduct?.variants?.length ?? 0) > 0
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
        if (!rowProduct) {
          throw new Error(`Row ${index + 1}: product details are still loading.`)
        }
        if (hasVariants && !productVariantId) {
          throw new Error(`Row ${index + 1}: select the exact product variant.`)
        }
        if (hasVariants && !rowProduct.variants?.some((variant) => variant.id === productVariantId)) {
          throw new Error(`Row ${index + 1}: selected variant is not valid for this product.`)
        }
        if (Number.isNaN(physicalStock) || physicalStock < 0) {
          throw new Error(`Row ${index + 1}: physical stock must be 0 or more.`)
        }
        const currentQuantity = stockCountRowStockQueries[index]?.data?.stock_quantity
        const variance = typeof currentQuantity === 'number'
          ? physicalStock - currentQuantity
          : null
        if (row.applyAdjustment && variance !== null && variance < 0 && ![
          'sale_correction',
          'restock_correction',
          'lost',
          'damaged',
          'theft'
        ].includes(adjustmentReason ?? '')) {
          throw new Error(
            `Row ${index + 1}: select Sale Correction, Restock Correction, Lost Items, Damaged Items, or Theft.`
          )
        }
        if (
          row.applyAdjustment &&
          variance !== null &&
          variance > 0 &&
          adjustmentReason !== 'restock_correction'
        ) {
          throw new Error(`Row ${index + 1}: positive variance must use Restock Correction.`)
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

        return createStockCountOrRequestApproval({
          product_id: productId,
          product_variant_id: hasVariants ? productVariantId : undefined,
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
    onError: (error: unknown) => {
      setStockCountError(extractApiErrorMessage(error, 'Could not create stock count.'))
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

  const filteredStockStatusRows = useMemo(() => {
    const term = stockStatusSearch.trim().toLocaleLowerCase()
    if (!term) return stockStatusQuery.data ?? []

    return (stockStatusQuery.data ?? []).filter((row) =>
      [
        row.product_name,
        row.sku,
        row.variant_sku,
        row.branch_name,
        row.category_name,
        ...Object.values(row.variant_options ?? {}),
        row.stock_quantity,
        row.business_stock_quantity,
        row.selling_price,
        row.in_stock_value
      ].some((value) => String(value ?? '').toLocaleLowerCase().includes(term))
    )
  }, [stockStatusQuery.data, stockStatusSearch])

  const stockStatusTotalValue = useMemo(
    () => filteredStockStatusRows.reduce((total, row) => total + row.in_stock_value, 0),
    [filteredStockStatusRows]
  )

  const stockStatusColumns: Column<ProductStockStatusResponse>[] = [
    {
      key: 'product_name',
      header: 'Product',
      sortable: true,
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
      sortable: true,
      sortValue: (row) => row.branch_name ?? '',
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
      sortable: true,
      sortValue: (row) => row.category_name ?? '',
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
      sortable: true,
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
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary">{formatCurrency(row.selling_price)}</span>
      ),
      footer: <span className="text-text-secondary">Total</span>,
      align: 'right'
    },
    {
      key: 'in_stock_value',
      header: 'Stock value',
      sortable: true,
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
    },
    {
      key: 'adjustment_effect',
      header: 'Recorded As',
      render: (row) => {
        const reasonName = stockCountAdjustmentReasonsQuery.data?.find(
          (reason) => reason.reason === row.adjustment_reason
        )?.name
        const label = row.adjustment_effect === 'sale'
          ? `Sale${row.correction_sale_id ? ` #${row.correction_sale_id}` : ''}`
          : row.adjustment_effect === 'restock_correction' || row.adjustment_effect === 'stock_top_up'
            ? 'Restock correction'
            : row.adjustment_effect === 'inventory_loss'
              ? `${reasonName ?? 'Inventory'} loss`
            : row.adjustment_effect === 'stock_adjustment'
              ? 'Stock adjustment'
              : 'Count only'
        return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          row.adjustment_effect === 'sale'
            ? 'bg-primary/10 text-primary'
            : row.adjustment_effect === 'restock_correction' || row.adjustment_effect === 'stock_top_up'
              ? 'bg-success/10 text-success'
              : row.adjustment_effect === 'inventory_loss'
                ? 'bg-error/10 text-error'
              : 'bg-background text-text-secondary'
        }`}>{label}</span>
      }
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

  const closeRestockForm = () => {
    if (createRestockMutation.isPending) return

    closeRestockItemForm()
    setShowRestockForm(false)
    setRestockForm(createEmptyRestockForm(defaultInventoryBranchId))
    setRestockError(null)
    if (isCreateRestockPage) navigate(workspacePath('/dashboard/admin/inventory/restocks'))
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

  const viewCopy = inventoryViewCopy[view]
  const draftProduct = restockItemProductQuery.data ?? null
  const draftVariants = draftProduct?.variants ?? []
  const draftSelectedVariant = draftVariants.find(
    (variant) => String(variant.id) === restockItemDraft.productVariantId
  )
  const draftVariantOptionNames = Array.from(
    new Set(draftVariants.flatMap((variant) => Object.keys(variant.options ?? {})))
  )
  const selectDraftVariant = (variantId: string, selections?: Record<string, string>) => {
    const variant = draftVariants.find((item) => String(item.id) === variantId)
    setRestockItemDraft((current) => syncMaxOffer({
      ...current,
      productVariantId: variantId,
      variantSelections: selections ?? variant?.options ?? {},
      buyingPrice: variant?.cost_price != null ? String(variant.cost_price) : current.buyingPrice,
      sellingPrice: variant ? String(variant.price_override ?? variant.price) : current.sellingPrice
    }))
  }
  const selectDraftVariantOption = (optionName: string, value: string) => {
    const selections = { ...restockItemDraft.variantSelections }
    if (value) selections[optionName] = value
    else delete selections[optionName]
    const exactVariant = draftVariants.find((variant) =>
      draftVariantOptionNames.every((name) => variant.options?.[name] === selections[name])
    )
    selectDraftVariant(exactVariant ? String(exactVariant.id) : '', selections)
  }
  const draftQuantity = toSafeNumber(restockItemDraft.quantity)
  const draftBuyingTotal = draftQuantity * toSafeNumber(restockItemDraft.buyingPrice)
  const draftSellingTotal = draftQuantity * toSafeNumber(restockItemDraft.sellingPrice)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      {approvalNotice && <p role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">{approvalNotice}</p>}
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
              {viewCopy.title}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {viewCopy.description}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {view === 'stock-counts' && <Button
              variant="outline"
              onClick={() => setShowStockCountForm(!showStockCountForm)}
              className="flex items-center gap-2"
            >
              <ScaleIcon className="h-4 w-4" />
              {showStockCountForm ? 'Close Stock Count' : 'New Stock Count'}
            </Button>}
            {view === 'status' && <Button
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
            </Button>}
            {view === 'restocks' && <Button
              onClick={() => navigate(workspacePath('/dashboard/admin/inventory/restocks/new'))}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white"
            >
              <PlusIcon className="h-4 w-4" />
              New Restock
            </Button>}
            {isCreateRestockPage && <Button
              variant="outline"
              onClick={closeRestockForm}
            >
              Back to Restocks
            </Button>}
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {view === 'status' && <motion.section
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
      </motion.section>}

      {/* Restock Form */}
      <AnimatePresence>
        {isRestockWorkflow && showRestockForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={isCreateRestockPage ? 'mb-6' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'}
            onClick={isCreateRestockPage ? undefined : closeRestockForm}
          >
            <motion.div
              role="dialog"
              aria-modal={isCreateRestockPage ? undefined : true}
              aria-labelledby="restock-form-title"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className={isCreateRestockPage
                ? 'w-full rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6'
                : 'max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-2xl sm:p-6'}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <ShoppingCartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="restock-form-title" className="text-lg font-semibold text-text">
                      Create New Restock
                    </h2>
                    <p className="mt-1 text-sm text-text-tertiary">
                      Choose the branch you are restocking for. Main branch is selected by default.
                    </p>
                  </div>
                </div>
                {!isCreateRestockPage && <button
                  type="button"
                  aria-label="Close restock form"
                  onClick={closeRestockForm}
                  disabled={createRestockMutation.isPending}
                  className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-background hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>}
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

                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex flex-col gap-3 border-b border-border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-text">Restock items</h3>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        Add products one at a time, then edit or remove them from this list.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={openNewRestockItemForm}
                      disabled={!restockForm.branchId}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  {restockForm.rows.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <CubeIcon className="mx-auto h-9 w-9 text-text-tertiary" />
                      <p className="mt-3 text-sm font-medium text-text">No items added yet</p>
                      <p className="mt-1 text-xs text-text-tertiary">
                        Select a branch, then use Add Item to build this restock.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-background/50 text-left text-xs uppercase tracking-wide text-text-tertiary">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Product</th>
                            <th className="px-4 py-3 font-semibold">Qty</th>
                            <th className="px-4 py-3 font-semibold">Buying</th>
                            <th className="px-4 py-3 font-semibold">Selling</th>
                            <th className="px-4 py-3 font-semibold">Total</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {restockForm.rows.map((row, index) => {
                            const product = restockRowProductQueries[index]?.data
                            const variant = product?.variants?.find(
                              (item) => String(item.id) === row.productVariantId
                            )
                            return (
                              <tr key={row.id}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-text">{product?.name ?? 'Loading product...'}</p>
                                  <p className="mt-0.5 text-xs text-text-tertiary">
                                    {variant ? formatVariantLabel(variant) : product?.sku ?? ''}
                                  </p>
                                  {(row.supplierId || row.batchNumber || row.expiryDate) && (
                                    <p className="mt-1 text-xs text-text-tertiary">
                                      {[
                                        suppliersQuery.data?.find((supplier) => String(supplier.id) === row.supplierId)?.name,
                                        row.batchNumber ? `Batch ${row.batchNumber}` : '',
                                        row.expiryDate ? `Expires ${row.expiryDate}` : ''
                                      ].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{row.quantity}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                                  {formatCurrency(toSafeNumber(row.buyingPrice))}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                                  {formatCurrency(toSafeNumber(row.sellingPrice))}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 font-medium text-text">
                                  {formatCurrency(toSafeNumber(row.quantity) * toSafeNumber(row.buyingPrice))}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditRestockItemForm(row)}
                                      aria-label={`Edit ${product?.name ?? 'restock item'}`}
                                    >
                                      <PencilSquareIcon className="h-4 w-4" />
                                      <span className="ml-1">Edit</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeRestockRow(row.id)}
                                      className="text-error hover:bg-error/5"
                                      aria-label={`Remove ${product?.name ?? 'restock item'}`}
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                      <span className="ml-1">Remove</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
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
                      <p className={`font-semibold ${restockTotals.expectedProfit >= 0 ? 'text-success' : 'text-error'}`}>
                        {formatCurrency(restockTotals.expectedProfit)}
                      </p>
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
                    onClick={closeRestockForm}
                    disabled={createRestockMutation.isPending}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRestockWorkflow && showRestockForm && showRestockItemForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={closeRestockItemForm}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="restock-item-form-title"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 id="restock-item-form-title" className="text-lg font-semibold text-text">
                    {editingRestockRowId ? 'Edit Restock Item' : 'Add Restock Item'}
                  </h3>
                  <p className="mt-1 text-sm text-text-tertiary">
                    Enter one product, then add it to the restock list.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close item form"
                  onClick={closeRestockItemForm}
                  className="rounded-lg p-2 text-text-tertiary hover:bg-background hover:text-text"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <TextInput
                    label="Find product or scan barcode"
                    value={catalogSearch}
                    onChange={(event) => {
                      setCatalogSearch(event.target.value)
                      setCatalogProduct(null)
                    }}
                    placeholder="Search this business first, then the shared catalogue"
                  />
                  {catalogSearch.trim().length >= 2 && businessProductSearchQuery.isLoading && (
                    <p className="mt-3 text-sm text-text-tertiary">Searching this business…</p>
                  )}
                  {businessProductMatches.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Already in this business</p>
                      {businessProductMatches.map((product) => (
                        <button
                          type="button"
                          key={product.id}
                          onClick={() => {
                            queryClient.setQueryData(
                              ['products', 'inventory-select'],
                              (current: typeof productsQuery.data) => [
                                ...(current ?? []).filter((item) => item.id !== product.id),
                                product
                              ]
                            )
                            updateRestockItemDraft('productId', String(product.id))
                            setCatalogSearch('')
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-left hover:border-primary"
                        >
                          <span><strong className="text-text">{product.name}</strong><span className="ml-2 text-xs text-text-tertiary">{product.sku}</span></span>
                          <span className="text-xs font-semibold text-primary">Select</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {canSearchCatalogue && catalogSearch.trim().length >= 2 && businessProductMatches.length === 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Shared catalogue</p>
                      {catalogSearchQuery.isLoading && <p className="text-sm text-text-tertiary">Searching catalogue…</p>}
                      {(catalogSearchQuery.data ?? []).map((product) => (
                        <button
                          type="button"
                          key={product.public_id}
                          disabled={!canAdoptCatalogueProducts}
                          onClick={() => {
                            setCatalogProduct(product)
                            setAdoption({
                              sku: suggestedBusinessSku(product),
                              sellingPrice: '',
                              costPrice: '',
                              taxRateId: '',
                              variantIds: product.variants.map((variant) => variant.public_id)
                            })
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-left hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span><strong className="text-text">{product.name}</strong><span className="ml-2 text-xs text-text-tertiary">{product.barcode || product.brand || 'Approved catalogue product'}</span></span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-primary"><LinkIcon className="h-4 w-4" />{canAdoptCatalogueProducts ? 'Add to business' : 'View only'}</span>
                        </button>
                      ))}
                      {!catalogSearchQuery.isLoading && catalogSearchQuery.data?.length === 0 && (
                        <p className="text-sm text-text-tertiary">No approved catalogue product found.</p>
                      )}
                    </div>
                  )}
                </div>

                {catalogProduct && (
                  <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-primary-dark">Add to this business</p>
                      <h4 className="mt-1 font-semibold text-text">{catalogProduct.name}</h4>
                      <p className="text-xs text-text-tertiary">Adoption creates a zero-stock business listing. This restock is submitted separately.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextInput label="Business SKU" required value={adoption.sku} onChange={(event) => setAdoption((current) => ({ ...current, sku: event.target.value }))} />
                      <TextInput label="Selling price" type="number" min={0} step="0.01" required value={adoption.sellingPrice} onChange={(event) => setAdoption((current) => ({ ...current, sellingPrice: event.target.value }))} />
                      <TextInput label="Cost price (optional)" type="number" min={0} step="0.01" value={adoption.costPrice} onChange={(event) => setAdoption((current) => ({ ...current, costPrice: event.target.value }))} />
                      {hasPermission('finance.read') && (
                        <Select
                          label="Tax rate (optional)"
                          searchable
                          value={adoption.taxRateId}
                          onChange={(event) => setAdoption((current) => ({ ...current, taxRateId: String(event.target.value) }))}
                          options={[
                            { label: adoptionTaxRatesQuery.isLoading ? 'Loading tax rates...' : 'No tax rate', value: '' },
                            ...(adoptionTaxRatesQuery.data ?? []).map((rate) => ({ label: `${rate.name} · ${rate.rate}%`, value: rate.public_id }))
                          ]}
                        />
                      )}
                    </div>
                    {catalogProduct.variants.length > 0 && (
                      <fieldset>
                        <legend className="text-sm font-semibold text-text">Enabled variants</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {catalogProduct.variants.map((variant) => (
                            <label key={variant.public_id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-secondary">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={adoption.variantIds.includes(variant.public_id)}
                                onChange={(event) => setAdoption((current) => ({
                                  ...current,
                                  variantIds: event.target.checked
                                    ? [...current.variantIds, variant.public_id]
                                    : current.variantIds.filter((id) => id !== variant.public_id)
                                }))}
                              />
                              {variant.name}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    {adoptProductMutation.isError && (
                      <p role="alert" className="text-sm text-error">{extractApiErrorMessage(adoptProductMutation.error, 'Could not add product to this business.')}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCatalogProduct(null)}>Cancel</Button>
                      <Button
                        type="button"
                        loading={adoptProductMutation.isPending}
                        disabled={!adoption.sku.trim() || !adoption.sellingPrice || (catalogProduct.variants.length > 0 && adoption.variantIds.length === 0)}
                        onClick={() => adoptProductMutation.mutate()}
                      >
                        Add and continue restock
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Product"
                    searchable
                    searchPlaceholder="Search name, business SKU or barcode"
                    options={getProductOptionsForRow()}
                    value={restockItemDraft.productId}
                    onChange={(event) => updateRestockItemDraft('productId', String(event.target.value))}
                    required
                  />
                  {draftVariantOptionNames.length > 0 ? draftVariantOptionNames.map((optionName) => {
                    const compatibleVariants = draftVariants.filter((variant) =>
                      draftVariantOptionNames.every((name) =>
                        name === optionName || !restockItemDraft.variantSelections[name] ||
                        variant.options?.[name] === restockItemDraft.variantSelections[name]
                      )
                    )
                    const values = Array.from(new Set(
                      compatibleVariants.map((variant) => variant.options?.[optionName]).filter(Boolean)
                    )) as string[]
                    return <Select
                      key={optionName}
                      label={`${optionName} (optional)`}
                      options={[
                        { label: `Select ${optionName.toLowerCase()}`, value: '' },
                        ...values.map((value) => ({ label: value, value }))
                      ]}
                      value={restockItemDraft.variantSelections[optionName] ?? ''}
                      onChange={(event) => selectDraftVariantOption(optionName, String(event.target.value))}
                    />
                  }) : <Select
                    label="Variant"
                    options={[
                      {
                        label: restockItemDraft.productId
                          ? restockItemProductQuery.isLoading
                            ? 'Loading variants...'
                            : draftVariants.length
                            ? 'Select variant'
                            : 'No variants for this product'
                          : 'Select a product first',
                        value: ''
                      },
                      ...draftVariants.map((variant) => ({
                        label: formatVariantLabel(variant),
                        value: String(variant.id)
                      }))
                    ]}
                    value={restockItemDraft.productVariantId}
                    onChange={(event) => selectDraftVariant(String(event.target.value))}
                    disabled={!draftVariants.length}
                    required={draftVariants.length > 0}
                  />}
                  <Select
                    label="Supplier (optional)"
                    searchable
                    options={supplierOptions}
                    value={restockItemDraft.supplierId}
                    onChange={(event) =>
                      updateRestockItemDraft('supplierId', String(event.target.value))
                    }
                  />
                  <TextInput
                    label="Batch number (optional)"
                    maxLength={100}
                    value={restockItemDraft.batchNumber}
                    onChange={(event) => updateRestockItemDraft('batchNumber', event.target.value)}
                    placeholder="Supplier or manufacturer batch"
                  />
                  <TextInput
                    label="Expiry date (optional)"
                    type="date"
                    min={restockForm.restockDate}
                    value={restockItemDraft.expiryDate}
                    onChange={(event) => updateRestockItemDraft('expiryDate', event.target.value)}
                  />
                  <TextInput
                    label="Quantity"
                    type="number"
                    min={1}
                    value={restockItemDraft.quantity}
                    onChange={(event) => updateRestockItemDraft('quantity', event.target.value)}
                    required
                  />
                  <TextInput
                    label="Buying Price (per unit)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={restockItemDraft.buyingPrice}
                    onChange={(event) => updateRestockItemDraft('buyingPrice', event.target.value)}
                    required
                  />
                  <TextInput
                    label="Selling Price (per unit)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={restockItemDraft.sellingPrice}
                    onChange={(event) => updateRestockItemDraft('sellingPrice', event.target.value)}
                    required
                  />
                  <TextInput
                    label="Restock Target"
                    value={
                      draftVariants.length
                        ? draftSelectedVariant
                          ? formatVariantLabel(draftSelectedVariant)
                          : 'Select the exact variant'
                        : restockItemDraft.productId
                        ? 'Base product stock'
                        : 'Select a product first'
                    }
                    readOnly
                    className="bg-background"
                  />
                </div>

                {draftProduct && (
                  <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-text-secondary">
                    Current stock in {selectedRestockBranchName}:{' '}
                    <strong className="text-text">
                      {draftSelectedVariant?.stock_quantity ?? draftProduct.stock_quantity}
                    </strong>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Max Offer (Amount)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={restockItemDraft.maxOfferAmount}
                    onChange={(event) =>
                      setRestockItemDraft((row) =>
                        syncMaxOffer({ ...row, maxOfferMode: 'amount', maxOfferAmount: event.target.value })
                      )
                    }
                  />
                  <TextInput
                    label="Max Offer (%)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={restockItemDraft.maxOfferPercent}
                    onChange={(event) =>
                      setRestockItemDraft((row) =>
                        syncMaxOffer({ ...row, maxOfferMode: 'percent', maxOfferPercent: event.target.value })
                      )
                    }
                  />
                </div>

                <TextInput
                  label="Notes"
                  value={restockItemDraft.notes}
                  onChange={(event) => updateRestockItemDraft('notes', event.target.value)}
                  placeholder="Optional notes about this item"
                />

                <div className="grid grid-cols-3 gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  <div>
                    <p className="text-xs text-text-tertiary">Total Buying</p>
                    <p className="font-semibold text-text">{formatCurrency(draftBuyingTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Total Selling</p>
                    <p className="font-semibold text-text">{formatCurrency(draftSellingTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Expected Profit</p>
                    <p className={`font-semibold ${draftSellingTotal - draftBuyingTotal >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatCurrency(draftSellingTotal - draftBuyingTotal)}
                    </p>
                  </div>
                </div>

                {restockItemError && (
                  <p role="alert" className="flex items-center gap-2 text-sm text-error">
                    <XCircleIcon className="h-4 w-4" />
                    {restockItemError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={closeRestockItemForm}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={saveRestockItemDraft}>
                    {editingRestockRowId ? 'Update Item' : 'Add to List'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Transfer Form */}
      <AnimatePresence>
        {view === 'status' && showStockTransferForm && (
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
        {view === 'stock-counts' && showStockCountForm && (
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
                    const rowProductQuery = stockCountRowProductQueries[index]
                    const rowProduct = rowProductQuery?.data
                    const rowVariants = rowProduct?.variants ?? []
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

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <Select
                            label="Product"
                            options={getProductOptionsForStockCountRow(row.id, row.productId)}
                            value={row.productId}
                            onChange={(event) =>
                              updateStockCountRowField(row.id, 'productId', String(event.target.value))
                            }
                            required
                          />
                          <Select
                            label="Variant"
                            options={[
                              {
                                label: !row.productId
                                  ? 'Select a product first'
                                  : rowProductQuery?.isLoading
                                    ? 'Loading variants...'
                                    : rowVariants.length
                                      ? 'Select exact variant'
                                      : 'Base product (no variants)',
                                value: ''
                              },
                              ...rowVariants.map((variant) => {
                                const alreadySelected = stockCountForm.rows.some((other) =>
                                  other.id !== row.id &&
                                  other.productId === row.productId &&
                                  other.productVariantId === String(variant.id)
                                )
                                return {
                                  label: formatVariantLabel(variant),
                                  value: String(variant.id),
                                  disabled: alreadySelected,
                                  description: alreadySelected ? 'Already added to this count' : undefined
                                }
                              })
                            ]}
                            value={row.productVariantId}
                            onChange={(event) =>
                              updateStockCountRowField(
                                row.id,
                                'productVariantId',
                                String(event.target.value)
                              )
                            }
                            disabled={!rowVariants.length}
                            required={rowVariants.length > 0}
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
                          ) : rowProductQuery?.isLoading ? (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              Loading product variants...
                            </div>
                          ) : rowVariants.length > 0 && !row.productVariantId ? (
                            <p className="text-xs text-text-tertiary">
                              Select the exact variant to load its stock in {selectedStockCountBranchName}.
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
                              {formatVariantOptionsSummary(currentStock.variant_options) && <span>
                                Variant:{' '}
                                <strong className="text-text">
                                  {formatVariantOptionsSummary(currentStock.variant_options)}
                                </strong>
                              </span>}
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
                              options={getStockCountAdjustmentReasonOptions(variance)}
                              value={row.adjustmentReason}
                              onChange={(event) =>
                                updateStockCountRowField(
                                  row.id,
                                  'adjustmentReason',
                                  String(event.target.value)
                                )
                              }
                              disabled={variance === null || variance === 0}
                            />
                            {row.adjustmentReason === 'sale_correction' && variance !== null && variance !== 0 && (
                              <div className={`rounded-lg border px-3 py-2 text-xs md:col-span-2 ${
                                variance < 0
                                  ? 'border-primary/20 bg-primary/5 text-primary-dark'
                                  : 'border-success/20 bg-success/5 text-success'
                              }`}>
                                {variance < 0
                                  ? `${Math.abs(variance)} missing unit${Math.abs(variance) === 1 ? '' : 's'} will be recorded as a completed sale correction using the entered or current selling price.`
                                  : `${variance} extra unit${variance === 1 ? '' : 's'} will be recorded as a stock top-up, not as a sale.`}
                              </div>
                            )}
                            {row.adjustmentReason === 'restock_correction' && variance !== null && variance !== 0 && (
                              <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-success md:col-span-2">
                                {variance > 0
                                  ? `${variance} unit${variance === 1 ? '' : 's'} will be added to stock as a restock correction.`
                                  : `${Math.abs(variance)} unit${Math.abs(variance) === 1 ? '' : 's'} will be removed from stock as a restock correction. No sale will be created.`}
                              </div>
                            )}
                            {['lost', 'damaged', 'theft'].includes(row.adjustmentReason) && variance !== null && variance < 0 && (
                              <div className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-xs text-error md:col-span-2">
                                {Math.abs(variance)} unit{Math.abs(variance) === 1 ? '' : 's'} will be removed from stock and recorded as an inventory loss. No sale will be created.
                              </div>
                            )}
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
                              helperText="For a negative sale correction, this becomes the sale unit price. Leave blank to use the current variant or product price."
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
      {view === 'status' && <motion.section
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

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end lg:justify-end">
                <TextInput
                  label="Search"
                  value={stockStatusSearch}
                  onChange={(event) => setStockStatusSearch(event.target.value)}
                  placeholder="Product, SKU, branch, category..."
                  className="min-w-[260px]"
                />
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
                    setStockStatusSearch('')
                  }}
                  disabled={
                    stockStatusBranchFilter === 'all' &&
                    stockStatusProductFilter === 'all' &&
                    !stockStatusSearch
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
            data={filteredStockStatusRows}
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
                  <p className="text-sm text-text-secondary">
                    {stockStatusSearch ? 'No stock records match your search' : 'No stock records found'}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Try another search or filter, or switch back to View All.
                  </p>
                </div>
              )
            }
          />
        </div>
      </motion.section>}

      {/* Recent Restocks */}
      {view === 'restocks' && (
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
      )}

      {/* Recent Stock Counts */}
      {view === 'stock-counts' && (
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
      )}

      {/* Alerts Section */}
      {view === 'alerts' && <motion.section
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
      </motion.section>}
    </div>
  )
}

export default InventoryManagementPage
