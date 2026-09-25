import { requestApproval } from '@api/modules/audit.api'
import { useWorkspacePath } from '@hooks/useWorkspacePath'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  PlusIcon,
  XMarkIcon,
  ShoppingBagIcon,
  TagIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  CalculatorIcon,
  MinusCircleIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button, Select, TextInput, useSiteDialog } from '@components/common'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  getDefaultCashCustomerRequest,
  listCustomersRequest
} from '@api/modules/customers.api'
import { getProductRequest, listInStockProductsRequest, type ProductResponse } from '@api/modules/products.api'
import {
  createPosSaleRequest,
  getPosMpesaAvailabilityRequest,
  getPosMpesaPaymentStatusRequest,
  initiatePosMpesaPaymentRequest,
  listPaymentModesRequest,
} from '@api/modules/pos.api'
import { AppTheme, withOpacity } from '@constants/theme'
import { requiresExternalPosPayment } from '@utils/paymentModes'
import { resolveMediaUrl } from '@utils/media'

type SaleItemRowState = {
  id: string
  productId: string
  productVariantId: string
  selectedVariantOptions: Record<string, string>
  quantity: string
}

type CreatePosSaleFormState = {
  branchId: string
  customerId: string
  paymentModeId: string
  paymentPhoneNumber: string
  discountAmount: string
  items: SaleItemRowState[]
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
}

type LastCreatedSaleSummary = {
  totalAmount: number
  paymentModeName: string
  paymentStatus: string
  branchId: number
  isMpesa: boolean
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

const createSaleItemRow = (): SaleItemRowState => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  productVariantId: '',
  selectedVariantOptions: {},
  quantity: '1'
})

const createEmptySaleForm = (branchId = ''): CreatePosSaleFormState => ({
  branchId,
  customerId: '',
  paymentModeId: '',
  paymentPhoneNumber: '',
  discountAmount: '0',
  items: []
})

const extractApiErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Failed to create POS sale.'
  }

  const responseData = error.response?.data as
    | string
    | { detail?: string | Array<{ msg?: string }>; message?: string }
    | undefined

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
      const joined = responseData.detail
        .map((item) => item?.msg)
        .filter((msg): msg is string => Boolean(msg))
        .join('; ')
      if (joined) {
        return joined
      }
    }
  }

  if (error.response?.status) {
    return `Request failed with status code ${error.response.status}`
  }

  return error.message || 'Failed to create POS sale.'
}

const formatVariantLabel = (variant: { sku: string; options: Record<string, string> }) => {
  const optionSummary = Object.entries(variant.options)
    .map(([optionName, value]) => `${optionName}: ${value}`)
    .join(' / ')

  return optionSummary ? `${optionSummary} (${variant.sku})` : variant.sku
}

const getInStockVariants = (
  variants: Array<{
    id: number
    sku: string
    barcode?: string | null
    stock_quantity: number
    options: Record<string, string>
    price: number
    is_active: boolean
  }>
) => variants.filter((variant) => variant.is_active && Number(variant.stock_quantity ?? 0) > 0)

const getOrderedVariantOptionNames = (
  productVariantOptions:
    | Array<{
        option_name: string
      }>
    | undefined,
  variants: Array<{
    options: Record<string, string>
  }>
) => {
  const names = new Set<string>()
  const ordered: string[] = []

  ;(productVariantOptions ?? []).forEach((option) => {
    if (!names.has(option.option_name)) {
      names.add(option.option_name)
      ordered.push(option.option_name)
    }
  })

  variants.forEach((variant) => {
    Object.keys(variant.options ?? {}).forEach((optionName) => {
      if (!names.has(optionName)) {
        names.add(optionName)
        ordered.push(optionName)
      }
    })
  })

  return ordered
}

const getVariantOptionSortMap = (
  productVariantOptions:
    | Array<{
        option_name: string
        values: Array<{
          value: string
          display_value?: string | null
          sort_order: number
        }>
      }>
    | undefined
) => {
  const sortMap: Record<string, Record<string, number>> = {}

  ;(productVariantOptions ?? []).forEach((option) => {
    const optionSortMap: Record<string, number> = {}

    option.values.forEach((value) => {
      optionSortMap[value.value] = value.sort_order
      if (value.display_value) {
        optionSortMap[value.display_value] = value.sort_order
      }
    })

    sortMap[option.option_name] = optionSortMap
  })

  return sortMap
}

const getMatchingVariants = (
  variants: Array<{
    id: number
    sku: string
    stock_quantity: number
    options: Record<string, string>
    price: number
  }>,
  selectedOptions: Record<string, string>,
  ignoredOptionName?: string
) =>
  variants.filter((variant) =>
    Object.entries(selectedOptions).every(([optionName, optionValue]) => {
      if (!optionValue || optionName === ignoredOptionName) {
        return true
      }

      return variant.options?.[optionName] === optionValue
    })
  )

const sanitizeSelectedVariantOptions = (
  selectedOptions: Record<string, string>,
  optionNames: string[],
  variants: Array<{
    id: number
    sku: string
    stock_quantity: number
    options: Record<string, string>
    price: number
  }>
) => {
  if (!optionNames.length || !Object.keys(selectedOptions).length) {
    return {}
  }

  const nextSelections: Record<string, string> = {}

  optionNames.forEach((optionName) => {
    const nextValue = selectedOptions[optionName]
    if (!nextValue) {
      return
    }

    const matches = getMatchingVariants(variants, { ...nextSelections, [optionName]: nextValue })
    if (matches.length > 0) {
      nextSelections[optionName] = nextValue
    }
  })

  return nextSelections
}

const areSelectedVariantOptionsEqual = (
  left: Record<string, string>,
  right: Record<string, string>
) => {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => left[key] === right[key])
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

const CreatePosSalePage = () => {
  const siteDialog = useSiteDialog()
  const workspacePath = useWorkspacePath()
  const queryClient = useQueryClient()
  const [createSaleForm, setCreateSaleForm] = useState<CreatePosSaleFormState>(createEmptySaleForm())
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [lastCreatedSaleId, setLastCreatedSaleId] = useState<number | null>(null)
  const [lastCreatedSaleSummary, setLastCreatedSaleSummary] = useState<LastCreatedSaleSummary | null>(
    null
  )
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [itemEditor, setItemEditor] = useState<{
    mode: 'add' | 'edit'
    draft: SaleItemRowState
  } | null>(null)
  const [itemEditorError, setItemEditorError] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const selectedBranchId = useMemo(
    () => parseOptionalNumber(createSaleForm.branchId),
    [createSaleForm.branchId]
  )

  const branchesQuery = useQuery({
    queryKey: ['branches', 'pos-create'],
    queryFn: listBranchesRequest
  })

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos-create'],
    queryFn: () =>
      listCustomersRequest({
        include_inactive: false,
        limit: 200
      })
  })

  const defaultCashCustomerQuery = useQuery({
    queryKey: ['customers', 'default-cash', 'pos-create'],
    queryFn: getDefaultCashCustomerRequest
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'in-stock', 'pos-create-options', selectedBranchId],
    queryFn: () =>
      listInStockProductsRequest({
        scope: 'branch',
        branch_id: selectedBranchId,
        limit: 200
      }),
    enabled: selectedBranchId !== undefined
  })

  const editorProductId = Number(itemEditor?.draft.productId)
  const itemEditorProductQuery = useQuery({
    queryKey: [
      'products',
      'details',
      'pos-item-editor',
      selectedBranchId ?? 'none',
      Number.isFinite(editorProductId) ? editorProductId : 'none'
    ],
    queryFn: () =>
      getProductRequest(editorProductId, {
        branch_id: selectedBranchId
      }),
    enabled:
      Boolean(itemEditor) &&
      Number.isFinite(editorProductId) &&
      editorProductId > 0 &&
      typeof selectedBranchId === 'number' &&
      selectedBranchId > 0,
    staleTime: 30_000
  })

  const saleItemProductQueries = useQueries({
    queries: createSaleForm.items.map((item) => {
      const productId = Number(item.productId)
      const isEnabled =
        Number.isFinite(productId) &&
        productId > 0 &&
        typeof selectedBranchId === 'number' &&
        selectedBranchId > 0

      return {
        queryKey: ['products', 'details', 'pos-create', selectedBranchId ?? 'none', productId || 'none'],
        queryFn: () =>
          getProductRequest(productId, {
            branch_id: selectedBranchId
          }),
        enabled: isEnabled,
        staleTime: 30_000
      }
    })
  })

  const paymentModesQuery = useQuery({
    queryKey: ['pos', 'payment-modes', 'create-sale', selectedBranchId],
    queryFn: () =>
      listPaymentModesRequest({
        branch_id: selectedBranchId
      }),
    enabled: selectedBranchId !== undefined
  })

  const posMpesaAvailabilityQuery = useQuery({
    queryKey: ['pos', 'mpesa-availability', selectedBranchId],
    queryFn: () => getPosMpesaAvailabilityRequest(selectedBranchId as number),
    enabled: selectedBranchId !== undefined,
    retry: false
  })

  const posMpesaStatusQuery = useQuery({
    queryKey: ['pos', 'mpesa-status', lastCreatedSaleId, lastCreatedSaleSummary?.branchId],
    queryFn: () =>
      getPosMpesaPaymentStatusRequest(
        lastCreatedSaleId as number,
        lastCreatedSaleSummary?.branchId as number
      ),
    enabled:
      showSuccessModal &&
      Boolean(lastCreatedSaleId) &&
      Boolean(lastCreatedSaleSummary?.isMpesa) &&
      ['created', 'initiating', 'pending_customer', 'unknown'].includes(
        lastCreatedSaleSummary?.paymentStatus ?? ''
      ),
    refetchInterval: 3000,
    retry: false
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

  const posCustomers = useMemo(() => {
    const customers = [...(customersQuery.data ?? [])]
    const defaultCashCustomer = defaultCashCustomerQuery.data
    if (defaultCashCustomer && !customers.some((customer) => customer.id === defaultCashCustomer.id)) {
      customers.push(defaultCashCustomer)
    }
    return customers
  }, [customersQuery.data, defaultCashCustomerQuery.data])

  const customerOptions = useMemo(() => {
    if (customersQuery.isLoading) {
      return [{ label: 'Loading customers...', value: '' }]
    }

    const defaultCashCustomerId = defaultCashCustomerQuery.data?.id
    const customers = [...posCustomers].sort((left, right) => {
      if (left.id === defaultCashCustomerId) {
        return -1
      }

      if (right.id === defaultCashCustomerId) {
        return 1
      }

      return (left.full_name ?? left.username).localeCompare(right.full_name ?? right.username)
    })

    return [
      { label: 'No customer selected', value: '' },
      ...customers.map((customer) => ({
        label: customer.is_cash_customer
          ? 'Cash Sale — Default walk-in customer'
          : `${customer.full_name?.trim() || customer.username} (${customer.email})`,
        value: String(customer.id)
      }))
    ]
  }, [customersQuery.isLoading, posCustomers, defaultCashCustomerQuery.data])

  const productOptions = useMemo(
    () => {
      if (!selectedBranchId) {
        return [{ label: 'Select a branch first', value: '' }]
      }

      if (productsQuery.isLoading) {
        return [{ label: 'Loading in-stock products...', value: '' }]
      }

      if ((productsQuery.data ?? []).length === 0) {
        return [{ label: 'No in-stock products for this branch', value: '' }]
      }

      return [
        { label: 'Select product', value: '' },
        ...(productsQuery.data ?? []).map((product) => ({
          label: `${product.name} (${product.sku}) - ${product.stock_quantity} in stock`,
          value: String(product.id),
          description: [
            `${formatCurrency(product.price)} selling price`,
            ...(product.variants ?? []).map((variant) => variant.barcode).filter(Boolean)
          ].join(' · ')
        }))
      ]
    },
    [selectedBranchId, productsQuery.isLoading, productsQuery.data]
  )

  const productPriceById = useMemo(() => {
    const priceMap: Record<string, number> = {}
    ;(productsQuery.data ?? []).forEach((product) => {
      priceMap[String(product.id)] = Number(product.selling_price ?? product.price ?? 0)
    })
    return priceMap
  }, [productsQuery.data])

  const productStockById = useMemo(() => {
    const stockMap: Record<string, number> = {}
    ;(productsQuery.data ?? []).forEach((product) => {
      stockMap[String(product.id)] = Number(product.stock_quantity ?? 0)
    })
    return stockMap
  }, [productsQuery.data])

  const productCategories = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          (productsQuery.data ?? [])
            .map((product) => product.category_name?.trim())
            .filter((category): category is string => Boolean(category))
        )
      ).sort((left, right) => left.localeCompare(right))
    ],
    [productsQuery.data]
  )

  const visibleProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    return (productsQuery.data ?? []).filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category_name === selectedCategory
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category_name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      return matchesCategory && matchesSearch
    })
  }, [productsQuery.data, productSearch, selectedCategory])

  const activePaymentModes = useMemo(
    () => (paymentModesQuery.data ?? []).filter((mode) => mode.is_active),
    [paymentModesQuery.data]
  )

  const availablePaymentModes = useMemo(
    () =>
      activePaymentModes.filter(
        (mode) =>
          !requiresExternalPosPayment(mode.code) ||
          posMpesaAvailabilityQuery.data?.available === true
      ),
    [activePaymentModes, posMpesaAvailabilityQuery.data?.available]
  )
  const branchHasMpesaMode = activePaymentModes.some((mode) =>
    requiresExternalPosPayment(mode.code)
  )

  const paymentModeOptions = useMemo(() => {
    if (!selectedBranchId) {
      return [{ label: 'Select a branch first', value: '' }]
    }

    if (paymentModesQuery.isLoading) {
      return [{ label: 'Loading payment modes...', value: '' }]
    }

    if (availablePaymentModes.length === 0) {
      return [{ label: 'No active payment modes for this branch', value: '' }]
    }

    return availablePaymentModes.map((mode) => ({
      label: `${mode.name} (${mode.code})`,
      value: String(mode.id)
    }))
  }, [selectedBranchId, paymentModesQuery.isLoading, availablePaymentModes])

  const hasSelectablePaymentModes = availablePaymentModes.length > 0
  const hasSelectableProducts = (productsQuery.data ?? []).length > 0
  const selectedCustomer = useMemo(
    () =>
      posCustomers.find(
        (customer) => String(customer.id) === createSaleForm.customerId
      ) ?? null,
    [posCustomers, createSaleForm.customerId]
  )
  const selectedPaymentMode = useMemo(
    () => availablePaymentModes.find((mode) => String(mode.id) === createSaleForm.paymentModeId),
    [availablePaymentModes, createSaleForm.paymentModeId]
  )
  const requiresPhoneForPayment = useMemo(() => {
    return requiresExternalPosPayment(selectedPaymentMode?.code)
  }, [selectedPaymentMode])

  useEffect(() => {
    if (customersQuery.isLoading || defaultCashCustomerQuery.isLoading) {
      return
    }

    const activeCustomers = posCustomers
    const selectedCustomerId = parseOptionalNumber(createSaleForm.customerId)
    const hasSelectedCustomer =
      selectedCustomerId !== undefined &&
      activeCustomers.some((customer) => customer.id === selectedCustomerId)

    if (hasSelectedCustomer) {
      return
    }

    const defaultCashCustomerId = defaultCashCustomerQuery.data?.id
    const fallbackCustomerId =
      defaultCashCustomerId && activeCustomers.some((customer) => customer.id === defaultCashCustomerId)
        ? String(defaultCashCustomerId)
        : ''

    if (createSaleForm.customerId === fallbackCustomerId) {
      return
    }

    setCreateSaleForm((previous) => ({
      ...previous,
      customerId: fallbackCustomerId
    }))
  }, [
    customersQuery.isLoading,
    posCustomers,
    defaultCashCustomerQuery.isLoading,
    defaultCashCustomerQuery.data,
    createSaleForm.customerId
  ])

  useEffect(() => {
    if (!selectedBranchId) {
      return
    }

    const defaultMode = availablePaymentModes.find((mode) => mode.is_default) ?? availablePaymentModes[0]
    if (!defaultMode) {
      setCreateSaleForm((previous) =>
        previous.paymentModeId
          ? {
              ...previous,
              paymentModeId: ''
            }
          : previous
      )
      return
    }

    const hasCurrentValue = availablePaymentModes.some(
      (mode) => String(mode.id) === createSaleForm.paymentModeId
    )
    if (!hasCurrentValue) {
      setCreateSaleForm((previous) => ({
        ...previous,
        paymentModeId: String(defaultMode.id)
      }))
    }
  }, [selectedBranchId, availablePaymentModes, createSaleForm.paymentModeId])

  useEffect(() => {
    if (!requiresPhoneForPayment) return
    setCreateSaleForm((previous) => ({
      ...previous,
      paymentPhoneNumber: selectedCustomer?.phone ?? ''
    }))
  }, [requiresPhoneForPayment, selectedCustomer?.id, selectedCustomer?.phone])

  useEffect(() => {
    const intent = posMpesaStatusQuery.data
    if (!intent) return
    setLastCreatedSaleSummary((previous) =>
      previous ? { ...previous, paymentStatus: intent.state } : previous
    )
    if (intent.state === 'successful') {
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    }
  }, [posMpesaStatusQuery.data, queryClient])

  useEffect(() => {
    if (!productsQuery.data) {
      return
    }

    const inStockProductIds = new Set(productsQuery.data.map((product) => String(product.id)))
    setCreateSaleForm((previous) => {
      let hasChanges = false

      const nextItems = previous.items.map((row, index) => {
        if (!row.productId) {
          return row
        }

        if (!inStockProductIds.has(row.productId)) {
          hasChanges = true
          return {
            ...row,
            productId: '',
            productVariantId: '',
            selectedVariantOptions: {},
            quantity: '1'
          }
        }

        const rowProduct = saleItemProductQueries[index]?.data
        const variants = getInStockVariants(rowProduct?.variants ?? [])
        const hasVariants = (rowProduct?.variants?.length ?? 0) > 0
        const selectedVariant = variants.find(
          (variant) => String(variant.id) === row.productVariantId
        )
        const optionNames = getOrderedVariantOptionNames(rowProduct?.variant_options, variants)
        const availableStock = hasVariants
          ? selectedVariant?.stock_quantity
          : productStockById[row.productId]

        const sanitizedOptions = sanitizeSelectedVariantOptions(
          row.selectedVariantOptions,
          optionNames,
          variants
        )
        const hasOptionChanges = !areSelectedVariantOptionsEqual(
          sanitizedOptions,
          row.selectedVariantOptions
        )

        if (hasVariants && !selectedVariant && row.productVariantId) {
          hasChanges = true
          return {
            ...row,
            productVariantId: '',
            selectedVariantOptions: sanitizedOptions,
            quantity: '1'
          }
        }

        if (selectedVariant) {
          const nextSelectedOptions = selectedVariant.options ?? {}
          if (!areSelectedVariantOptionsEqual(nextSelectedOptions, row.selectedVariantOptions)) {
            hasChanges = true
            return {
              ...row,
              selectedVariantOptions: nextSelectedOptions
            }
          }
        }

        if (!selectedVariant && hasOptionChanges) {
          hasChanges = true
          return {
            ...row,
            selectedVariantOptions: sanitizedOptions
          }
        }

        const quantity = Number(row.quantity)
        if (
          Number.isFinite(quantity) &&
          availableStock !== undefined &&
          quantity > availableStock &&
          availableStock > 0
        ) {
          hasChanges = true
          return {
            ...row,
            quantity: String(availableStock)
          }
        }

        return row
      })

      return hasChanges
        ? {
            ...previous,
            items: nextItems
          }
        : previous
    })
  }, [productsQuery.data, productStockById, saleItemProductQueries])

  const saleEstimate = useMemo(() => {
    const subtotal = createSaleForm.items.reduce((sum, item) => {
      const quantity = Number(item.quantity)
      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
      const itemIndex = createSaleForm.items.findIndex((row) => row.id === item.id)
      const rowProduct = saleItemProductQueries[itemIndex]?.data
      const selectedVariant = getInStockVariants(rowProduct?.variants ?? []).find(
        (variant) => String(variant.id) === item.productVariantId
      )
      const unitPrice = selectedVariant?.price ?? productPriceById[item.productId] ?? 0
      return sum + safeQuantity * unitPrice
    }, 0)

    const discountInput = Number(createSaleForm.discountAmount)
    const discount = Number.isFinite(discountInput) && discountInput > 0 ? discountInput : 0

    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount)
    }
  }, [createSaleForm.items, createSaleForm.discountAmount, productPriceById, saleItemProductQueries])

  const hasMissingVariantSelections = useMemo(
    () =>
      createSaleForm.items.some((item, index) => {
        const rowProduct = saleItemProductQueries[index]?.data
        const hasVariants = (rowProduct?.variants?.length ?? 0) > 0
        return Boolean(item.productId) && hasVariants && !item.productVariantId
      }),
    [createSaleForm.items, saleItemProductQueries]
  )

  const createPosSaleMutation = useMutation({
    mutationFn: async (payload: CreatePosSaleFormState) => {
      const branchId = parseOptionalNumber(payload.branchId)
      if (!branchId) {
        throw new Error('Select a branch before creating a POS sale.')
      }

      const items = payload.items.map((item, index) => {
        const productId = Number(item.productId)
        const productVariantId = item.productVariantId ? Number(item.productVariantId) : undefined
        const quantity = Number(item.quantity)
        const rowProduct = saleItemProductQueries[index]?.data
        const hasVariants = (rowProduct?.variants?.length ?? 0) > 0
        const selectedVariant = getInStockVariants(rowProduct?.variants ?? []).find(
          (variant) => variant.id === productVariantId
        )

        if (!productId || Number.isNaN(productId)) {
          throw new Error(`Item ${index + 1}: choose a product.`)
        }
        if (!rowProduct) {
          throw new Error(`Item ${index + 1}: product details are still loading. Try again.`)
        }
        if (hasVariants && !productVariantId) {
          throw new Error(`Item ${index + 1}: choose the exact variant.`)
        }
        if (hasVariants && !selectedVariant) {
          throw new Error(`Item ${index + 1}: selected variant is not valid for this product.`)
        }

        if (!quantity || Number.isNaN(quantity) || quantity < 1) {
          throw new Error(`Item ${index + 1}: quantity must be 1 or more.`)
        }
        if (!Number.isInteger(quantity)) {
          throw new Error(`Item ${index + 1}: quantity must be a whole number.`)
        }

        const availableStock = hasVariants
          ? selectedVariant?.stock_quantity
          : productStockById[String(productId)]
        if (availableStock === undefined || availableStock < 1) {
          throw new Error(
            `Item ${index + 1}: selected ${hasVariants ? 'variant' : 'product'} is out of stock for this branch.`
          )
        }
        if (quantity > availableStock) {
          throw new Error(
            `Item ${index + 1}: quantity (${quantity}) exceeds available stock (${availableStock}).`
          )
        }

        return {
          product_id: productId,
          product_variant_id: hasVariants ? productVariantId : undefined,
          quantity
        }
      })

      if (!items.length) {
        throw new Error('Add at least one item before creating a sale.')
      }

      const paymentModeId = Number(payload.paymentModeId)
      if (!Number.isFinite(paymentModeId) || paymentModeId < 1) {
        throw new Error('Choose a valid payment mode for the selected branch.')
      }

      const discountAmount = Number(payload.discountAmount)
      if (Number.isNaN(discountAmount) || discountAmount < 0) {
        throw new Error('Discount amount must be 0 or more.')
      }

      const selectedMode = availablePaymentModes.find((mode) => String(mode.id) === String(paymentModeId))
      if (!selectedMode) {
        throw new Error('Selected payment mode is not available for this branch.')
      }

      const phoneNumber = payload.paymentPhoneNumber.trim()
      if (requiresPhoneForPayment && phoneNumber.length < 9) {
        throw new Error('Phone number is required for M-Pesa payments (minimum 9 digits).')
      }

      if (discountAmount > 0) {
        const reason = await siteDialog.prompt({
          title: 'Request discount approval',
          message: 'This discounted sale requires approval from a branch manager.',
          inputLabel: 'Discount reason',
          placeholder: 'Explain why this discount should be approved',
          confirmLabel: 'Request approval',
          minLength: 3
        })
        if (!reason || reason.trim().length < 3) throw new Error('An approval reason is required. No sale was created.')
        const approval = await requestApproval('discount', reason.trim(), {
          items, payment_mode_id: paymentModeId, discount_amount: discountAmount,
          branch_id: branchId, customer_id: parseOptionalNumber(payload.customerId)
        })
        return { kind: 'approval' as const, approval }
      }
      const sale = await createPosSaleRequest({
        items,
        payment_mode_id: paymentModeId,
        discount_amount: discountAmount,
        branch_id: branchId,
        customer_id: parseOptionalNumber(payload.customerId)
      })

      // Cash, card, and other immediate modes are paid atomically by the POS
      // sale endpoint. Only M-Pesa needs the separate STK initiation request.
      if (!requiresExternalPosPayment(selectedMode.code)) {
        return {
          kind: 'sale' as const,
          sale,
          paymentStatus: 'completed',
          isMpesa: false,
          branchId,
          paymentError: null
        }
      }

      try {
        const intent = await initiatePosMpesaPaymentRequest(
          sale.id,
          phoneNumber,
          branchId,
          crypto.randomUUID()
        )

        return {
          kind: 'sale' as const,
          sale,
          paymentStatus: intent.state,
          isMpesa: true,
          branchId,
          paymentError: null
        }
      } catch (paymentError) {
        return {
          kind: 'sale' as const,
          sale,
          paymentStatus: 'failed',
          isMpesa: true,
          branchId,
          paymentError: extractApiErrorMessage(paymentError)
        }
      }
    },
    onSuccess: (result, payload) => {
      if (result.kind === 'approval') {
        setFeedback({ type: 'success', message: 'Approval requested. No sale or payment has been completed. Follow progress in Approvals.' })
        setCreateSaleForm(createEmptySaleForm(createSaleForm.branchId))
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        return
      }
      const sale = result.sale
      const paymentModeName =
        activePaymentModes.find((mode) => String(mode.id) === payload.paymentModeId)?.name ??
        `#${payload.paymentModeId}`

      setFeedback(result.paymentError
        ? { type: 'error', message: `POS sale #${sale.id} was saved but M-Pesa could not start: ${result.paymentError}` }
        : {
            type: 'success',
            message: result.isMpesa
              ? `POS sale #${sale.id} saved. M-Pesa confirmation is pending.`
              : `POS sale #${sale.id} created and paid.`
          })
      setLastCreatedSaleId(sale.id)
      setLastCreatedSaleSummary({
        totalAmount: sale.total_amount,
        paymentModeName,
        paymentStatus: result.paymentStatus,
        branchId: result.branchId,
        isMpesa: result.isMpesa
      })
      setShowSuccessModal(true)
      setCreateSaleForm(createEmptySaleForm(createSaleForm.branchId))
      setIsCheckingOut(false)
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['reports', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['reports', 'daily-sales'] })
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: extractApiErrorMessage(error)
      })
    }
  })

  const retryPosMpesaMutation = useMutation({
    mutationFn: async () => {
      if (!lastCreatedSaleId || !lastCreatedSaleSummary?.branchId) {
        throw new Error('The POS sale could not be identified for retry.')
      }
      const phoneNumber = await siteDialog.prompt({
        title: 'Retry M-Pesa payment',
        message: `Send a new STK Push for POS sale #${lastCreatedSaleId}.`,
        inputLabel: 'Customer M-Pesa number',
        placeholder: 'e.g. 0712345678',
        confirmLabel: 'Send STK Push',
        minLength: 9
      })
      if (!phoneNumber) throw new Error('Retry cancelled.')
      return initiatePosMpesaPaymentRequest(
        lastCreatedSaleId,
        phoneNumber.trim(),
        lastCreatedSaleSummary.branchId,
        crypto.randomUUID()
      )
    },
    onSuccess: (intent) => {
      setLastCreatedSaleSummary((previous) =>
        previous ? { ...previous, paymentStatus: intent.state } : previous
      )
      setFeedback({ type: 'success', message: 'A new M-Pesa STK Push was sent.' })
    },
    onError: (error: unknown) => {
      const message = extractApiErrorMessage(error)
      if (message !== 'Retry cancelled.') setFeedback({ type: 'error', message })
    }
  })

  const onCreateSale = (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    setLastCreatedSaleId(null)
    setLastCreatedSaleSummary(null)
    createPosSaleMutation.mutate(createSaleForm)
  }

  const openEditItem = (item: SaleItemRowState) => {
    setItemEditorError(null)
    setItemEditor({
      mode: 'edit',
      draft: {
        ...item,
        selectedVariantOptions: { ...item.selectedVariantOptions }
      }
    })
  }

  const updateItemDraft = (updater: (draft: SaleItemRowState) => SaleItemRowState) => {
    setItemEditor((current) =>
      current
        ? {
            ...current,
            draft: updater(current.draft)
          }
        : current
    )
    setItemEditorError(null)
  }

  const setSaleRowQuantity = (
    rowId: string,
    nextQuantity: number,
    availableStock: number | undefined
  ) => {
    if (availableStock === undefined || availableStock < 1) return

    const quantity = Math.max(1, Math.min(Math.trunc(nextQuantity), availableStock))
    setCreateSaleForm((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === rowId ? { ...item, quantity: String(quantity) } : item
      )
    }))
  }

  const removeSaleRow = (rowId: string) => {
    setCreateSaleForm((previous) => ({
      ...previous,
      items: previous.items.filter((item) => item.id !== rowId)
    }))
  }

  const clearAllItems = () => {
    setCreateSaleForm((previous) => ({
      ...previous,
      items: []
    }))
  }

  const editorProduct = itemEditorProductQuery.data
  const editorVariants = editorProduct?.variants ?? []
  const editorInStockVariants = getInStockVariants(editorVariants)
  const editorHasVariants = editorVariants.length > 0
  const editorOptionNames = getOrderedVariantOptionNames(
    editorProduct?.variant_options,
    editorInStockVariants
  )
  const editorOptionSortMap = getVariantOptionSortMap(editorProduct?.variant_options)
  const editorSelectedVariant = editorInStockVariants.find(
    (variant) => String(variant.id) === itemEditor?.draft.productVariantId
  )
  const editorUnitPrice =
    editorSelectedVariant?.price ?? productPriceById[itemEditor?.draft.productId ?? ''] ?? 0
  const editorAvailableStock = editorHasVariants
    ? editorSelectedVariant?.stock_quantity
    : productStockById[itemEditor?.draft.productId ?? '']
  const editorQuantity = Number(itemEditor?.draft.quantity ?? 0)
  const editorLineTotal =
    Number.isFinite(editorQuantity) && editorQuantity > 0 ? editorUnitPrice * editorQuantity : 0

  const saveItemDraft = () => {
    if (!itemEditor?.draft.productId) {
      setItemEditorError('Choose a product.')
      return
    }
    if (!editorProduct) {
      setItemEditorError('Product details are still loading. Try again.')
      return
    }
    if (editorHasVariants && !itemEditor.draft.productVariantId) {
      setItemEditorError('Choose all required product options.')
      return
    }
    if (!Number.isInteger(editorQuantity) || editorQuantity < 1) {
      setItemEditorError('Quantity must be a whole number greater than zero.')
      return
    }
    if (editorAvailableStock === undefined || editorQuantity > editorAvailableStock) {
      setItemEditorError(`Only ${editorAvailableStock ?? 0} item(s) are available in this branch.`)
      return
    }

    setCreateSaleForm((previous) => {
      if (itemEditor.mode === 'edit') {
        return {
          ...previous,
          items: previous.items.map((row) =>
            row.id === itemEditor.draft.id ? itemEditor.draft : row
          )
        }
      }

      const existing = previous.items.find(
        (row) =>
          row.productId === itemEditor.draft.productId &&
          row.productVariantId === itemEditor.draft.productVariantId
      )
      if (!existing) return { ...previous, items: [...previous.items, itemEditor.draft] }

      const combinedQuantity = Math.min(
        Number(existing.quantity) + editorQuantity,
        editorAvailableStock
      )
      return {
        ...previous,
        items: previous.items.map((row) =>
          row.id === existing.id ? { ...row, quantity: String(combinedQuantity) } : row
        )
      }
    })
    setItemEditor(null)
    setItemEditorError(null)
  }

  const addProductToSale = (productId: number) => {
    const product = (productsQuery.data ?? []).find((item) => item.id === productId)
    if (!product) return

    if ((product.variants?.length ?? 0) > 0) {
      setItemEditorError(null)
      setItemEditor({
        mode: 'add',
        draft: { ...createSaleItemRow(), productId: String(product.id) }
      })
      return
    }

    setCreateSaleForm((previous) => {
      const existing = previous.items.find(
        (item) => item.productId === String(product.id) && !item.productVariantId
      )
      if (!existing) {
        return {
          ...previous,
          items: [...previous.items, { ...createSaleItemRow(), productId: String(product.id) }]
        }
      }
      const nextQuantity = Math.min(Number(existing.quantity) + 1, product.stock_quantity)
      return {
        ...previous,
        items: previous.items.map((item) =>
          item.id === existing.id ? { ...item, quantity: String(nextQuantity) } : item
        )
      }
    })
  }

  const productImage = (product: ProductResponse) =>
    resolveMediaUrl(
      product.primary_image_override ||
      product.image_urls?.[0] ||
      product.images?.[0]?.image_url ||
      product.images?.[0]?.file_url ||
      product.images?.[0]?.url
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link to={workspacePath('/dashboard/admin/sales')}>
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to sales operations
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <ShoppingBagIcon className="h-6 w-6 text-primary" />
              Create POS Sale
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Browse branch products, add them to the cart, then choose cash or M-Pesa at checkout.
            </p>
          </div>
          
          {lastCreatedSaleId && (
            <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <CheckCircleSolid className="h-5 w-5 text-success" />
              <span className="text-sm font-medium text-success">
                Last sale: #{lastCreatedSaleId}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Cards */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-4 md:grid-cols-2 mb-6"
      >
        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BuildingStorefrontIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Branch stock filter enabled</p>
              <p className="text-sm text-text-secondary mt-1">
                Sale items only show products currently in stock for the selected branch
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <CreditCardIcon className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Last created sale</p>
              <p className="text-lg font-bold text-text">
                {lastCreatedSaleId ? `#${lastCreatedSaleId}` : '--'}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Main Form */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-white rounded-xl border border-border shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-primary" />
              Sale Details
            </h2>
          </div>

          <form onSubmit={onCreateSale} className="p-4 space-y-6">
            {/* Branch is selected before shopping so prices and stock stay branch-specific. */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Select
                  label="Branch *"
                  options={branchOptions}
                  value={createSaleForm.branchId}
                  onChange={(event) => {
                    setIsCheckingOut(false)
                    setSelectedCategory('all')
                    setCreateSaleForm((previous) => ({
                      ...previous,
                      branchId: String(event.target.value),
                      paymentModeId: '',
                      items: []
                    }))
                  }}
                  disabled={branchesQuery.isLoading}
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <p className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-text-secondary">
                  {selectedBranchId
                    ? `${(productsQuery.data ?? []).length} in-stock products available in this branch.`
                    : 'Select a branch to load its available products and prices.'}
                </p>
              </div>
            </div>

            {isCheckingOut && (
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Checkout</p>
                    <h3 className="mt-1 text-lg font-bold text-text">Customer and payment</h3>
                    <p className="text-sm text-text-secondary">Choose cash or M-Pesa. M-Pesa will ask for the phone that receives the STK Push.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsCheckingOut(false)}>
                    Continue shopping
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Select
                  label="Customer"
                  options={customerOptions}
                  value={createSaleForm.customerId}
                  onChange={(event) =>
                    setCreateSaleForm((previous) => ({ ...previous, customerId: event.target.value }))
                  }
                  disabled={customersQuery.isLoading}
                  helperText={
                    selectedCustomer
                      ? selectedCustomer.is_cash_customer
                        ? 'Used automatically for walk-in sales without customer details.'
                        : selectedCustomer.email
                      : 'Defaults to Cash Sale for walk-in customers.'
                  }
                />
              </div>

              <div>
                <Select
                  label="Payment Mode *"
                  options={paymentModeOptions}
                  value={createSaleForm.paymentModeId}
                  onChange={(event) =>
                    setCreateSaleForm((previous) => ({ ...previous, paymentModeId: String(event.target.value) }))
                  }
                  disabled={!selectedBranchId || paymentModesQuery.isLoading || !hasSelectablePaymentModes}
                  required
                />
              </div>

              {requiresPhoneForPayment && <div>
                <TextInput
                  label="Customer M-Pesa Number *"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={createSaleForm.paymentPhoneNumber}
                  onChange={(event) =>
                    setCreateSaleForm((previous) => ({
                      ...previous,
                      paymentPhoneNumber: event.target.value
                    }))
                  }
                  helperText="Confirm the number that should receive the STK Push."
                  icon={<PhoneIcon className="h-4 w-4 text-text-tertiary" />}
                />
              </div>}

              <div>
                <TextInput
                  label="Discount Amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={createSaleForm.discountAmount}
                  onChange={(event) =>
                    setCreateSaleForm((previous) => ({ ...previous, discountAmount: event.target.value }))
                  }
                  icon={<TagIcon className="h-4 w-4 text-text-tertiary" />}
                />
              </div>

              {branchHasMpesaMode && posMpesaAvailabilityQuery.data?.available === false && (
                <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-secondary">
                  {posMpesaAvailabilityQuery.data.message}
                </div>
              )}
                </div>
              </div>
            )}

            {/* Product shelf */}
            <section className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text">Products</h3>
                  <p className="text-sm text-text-secondary">Select products just like the online shop.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-64">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
                    <input
                      aria-label="Search POS products"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Search name, SKU or category"
                      className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <Select
                    aria-label="Filter POS products by category"
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(String(event.target.value))}
                    disabled={!selectedBranchId}
                  >
                    {productCategories.map((category) => (
                      <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {!selectedBranchId ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-background/50 px-6 py-12 text-center text-sm text-text-secondary">
                  Select a branch to start shopping.
                </div>
              ) : productsQuery.isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-background" />)}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background/50 px-6 py-12 text-center">
                  <ShoppingBagIcon className="mx-auto h-9 w-9 text-text-tertiary" />
                  <p className="mt-3 font-semibold text-text">No matching products</p>
                  <p className="mt-1 text-sm text-text-secondary">Try another search or category.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleProducts.map((product) => {
                    const image = productImage(product)
                    const cartQuantity = createSaleForm.items
                      .filter((item) => item.productId === String(product.id))
                      .reduce((total, item) => total + Number(item.quantity || 0), 0)
                    return (
                      <article key={product.id} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/10">
                          {image ? (
                            <img src={image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="grid h-full place-items-center"><PhotoIcon className="h-12 w-12 text-primary/30" /></div>
                          )}
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-text shadow-sm">{product.stock_quantity} in stock</span>
                          {cartQuantity > 0 && <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-sm">{cartQuantity} in cart</span>}
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{product.category_name || 'General'}</p>
                          <h4 className="mt-1 line-clamp-2 min-h-12 font-bold text-text">{product.name}</h4>
                          <p className="mt-1 truncate text-xs text-text-tertiary">SKU {product.sku}</p>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div><p className="text-xs text-text-tertiary">Selling price</p><p className="text-lg font-bold text-primary">{formatCurrency(product.selling_price ?? product.price)}</p></div>
                            <Button type="button" size="sm" onClick={() => addProductToSale(product.id)} className="shrink-0 bg-gradient-to-r from-primary to-secondary text-white">
                              <PlusIcon className="mr-1 h-4 w-4" /> Add to cart
                            </Button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
                    <ShoppingBagIcon className="h-4 w-4 text-primary" />
                    Cart
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {createSaleForm.items.length}
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Review quantities and variants before checkout.
                  </p>
                </div>
                <div className="flex gap-2">
                  {createSaleForm.items.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearAllItems}
                      className="text-error hover:bg-error/5"
                    >
                      <MinusCircleIcon className="mr-1 h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {createSaleForm.items.length === 0 ? (
                <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/50 px-6 py-10 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShoppingBagIcon className="h-6 w-6" />
                  </span>
                  <span className="mt-3 font-semibold text-text">
                    {selectedBranchId ? 'Your cart is empty' : 'Select a branch first'}
                  </span>
                  <span className="mt-1 text-sm text-text-secondary">
                    {selectedBranchId
                      ? 'Use Add to cart on a product above.'
                      : 'Products and stock are loaded for the selected branch.'}
                  </span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="hidden grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_128px_120px_120px] gap-3 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary md:grid">
                    <span>Product</span>
                    <span>Variant</span>
                    <span className="text-right">Quantity</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {createSaleForm.items.map((item, index) => {
                      const rowProduct = saleItemProductQueries[index]?.data
                      const selectedVariant = getInStockVariants(rowProduct?.variants ?? []).find(
                        (variant) => String(variant.id) === item.productVariantId
                      )
                      const productOption = (productsQuery.data ?? []).find(
                        (product) => String(product.id) === item.productId
                      )
                      const productName = rowProduct?.name ?? productOption?.name ?? 'Loading product…'
                      const productSku = selectedVariant?.sku ?? rowProduct?.sku ?? productOption?.sku
                      const variantSummary = selectedVariant
                        ? formatVariantLabel(selectedVariant)
                        : (rowProduct?.variants?.length ?? 0) > 0
                          ? 'Variant loading…'
                          : 'Base product'
                      const unitPrice = selectedVariant?.price ?? productPriceById[item.productId] ?? 0
                      const quantity = Number(item.quantity)
                      const safeQuantity = Number.isFinite(quantity) && quantity >= 1 ? quantity : 1
                      const availableStock = (rowProduct?.variants?.length ?? 0) > 0
                        ? selectedVariant?.stock_quantity
                        : productStockById[item.productId]
                      const lineTotal =
                        Number.isFinite(quantity) && quantity > 0 ? unitPrice * quantity : 0

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="grid gap-3 border-t border-border px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_128px_120px_120px] md:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-text">{productName}</p>
                            <p className="mt-0.5 truncate text-xs text-text-tertiary">
                              {productSku || 'Product'} · {formatCurrency(unitPrice)} each
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-text-tertiary md:hidden">Variant: </span>
                            <span className="text-sm text-text-secondary">{variantSummary}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 md:justify-end">
                            <span className="text-xs text-text-tertiary md:hidden">Quantity</span>
                            <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-border bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() =>
                                  setSaleRowQuantity(item.id, safeQuantity - 1, availableStock)
                                }
                                disabled={availableStock === undefined || safeQuantity <= 1}
                                className="grid h-full w-9 place-items-center text-text-secondary transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                                title="Reduce quantity"
                                aria-label={`Reduce quantity of ${productName}`}
                              >
                                <MinusCircleIcon className="h-4 w-4" />
                              </button>
                              <span className="w-9 text-center text-sm font-semibold text-text">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSaleRowQuantity(item.id, safeQuantity + 1, availableStock)
                                }
                                disabled={
                                  availableStock === undefined || safeQuantity >= availableStock
                                }
                                className="grid h-full w-9 place-items-center text-text-secondary transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                                title="Increase quantity"
                                aria-label={`Increase quantity of ${productName}`}
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between md:block md:text-right">
                            <span className="text-xs text-text-tertiary md:hidden">Line total</span>
                            <span className="font-bold text-primary">{formatCurrency(lineTotal)}</span>
                          </div>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditItem(item)}
                              className="rounded-lg p-2 text-text-secondary transition hover:bg-primary/10 hover:text-primary"
                              title="Edit item"
                              aria-label={`Edit ${productName}`}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSaleRow(item.id)}
                              className="rounded-lg p-2 text-text-secondary transition hover:bg-error/10 hover:text-error"
                              title="Remove item"
                              aria-label={`Remove ${productName}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>


              {/* Sale Summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-4 border border-primary/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CalculatorIcon className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-text">Sale Summary</h4>
                </div>
                
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-tertiary">Subtotal</p>
                    <p className="text-lg font-bold text-text">{formatCurrency(saleEstimate.subtotal)}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-tertiary">Discount</p>
                    <p className="text-lg font-bold text-warning">-{formatCurrency(saleEstimate.discount)}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-primary to-secondary rounded-lg p-3">
                    <p className="text-xs text-white/80">Total</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(saleEstimate.total)}</p>
                  </div>
                </div>
              </motion.div>
            {/* Checkout actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Link to={workspacePath('/dashboard/admin/sales')}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              {!isCheckingOut ? (
                <Button
                  type="button"
                  onClick={() => setIsCheckingOut(true)}
                  disabled={!selectedBranchId || hasMissingVariantSelections || createSaleForm.items.length === 0}
                  className="min-w-[160px] bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Checkout · {formatCurrency(saleEstimate.total)}
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={createPosSaleMutation.isPending}
                  disabled={
                    !selectedBranchId ||
                    !hasSelectablePaymentModes ||
                    !hasSelectableProducts ||
                    (requiresPhoneForPayment && createSaleForm.paymentPhoneNumber.trim().length < 9) ||
                    hasMissingVariantSelections ||
                    createSaleForm.items.every((item) => !item.productId)
                  }
                  className="min-w-[190px] bg-gradient-to-r from-primary to-secondary text-white"
                >
                  {createPosSaleMutation.isPending
                    ? 'Processing...'
                    : requiresPhoneForPayment
                      ? `Send STK Push · ${formatCurrency(saleEstimate.total)}`
                      : `Complete Cash Sale · ${formatCurrency(saleEstimate.total)}`}
                </Button>
              )}
            </div>
          </form>
        </div>
      </motion.section>

      {/* Add/Edit Sale Item Modal */}
      <AnimatePresence>
        {itemEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-text/55 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) {
                setItemEditor(null)
                setItemEditorError(null)
              }
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pos-item-editor-title"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-gradient-to-r from-primary/10 via-white to-secondary/10 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Sale item
                  </p>
                  <h2 id="pos-item-editor-title" className="mt-1 text-xl font-bold text-text">
                    {itemEditor.mode === 'add' ? 'Add an item' : 'Edit item'}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Choose the product and quantity, then save it to the sale.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close item form"
                  className="rounded-lg p-2 text-text-tertiary transition hover:bg-white hover:text-text"
                  onClick={() => {
                    setItemEditor(null)
                    setItemEditorError(null)
                  }}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <Select
                  label="Product *"
                  searchable
                  searchPlaceholder="Search name, business SKU or scan barcode"
                  options={productOptions}
                  value={itemEditor.draft.productId}
                  onChange={(event) =>
                    updateItemDraft((draft) => ({
                      ...draft,
                      productId: String(event.target.value),
                      productVariantId: '',
                      selectedVariantOptions: {},
                      quantity: '1'
                    }))
                  }
                  disabled={productsQuery.isLoading || !hasSelectableProducts}
                  required
                />
                <p className="-mt-3 text-xs text-text-tertiary">
                  Product not listed after scanning?{' '}
                  <Link
                    to={workspacePath('/dashboard/admin/catalogue')}
                    className="font-semibold text-primary hover:text-primary-dark"
                  >
                    Add it from the shared catalogue
                  </Link>{' '}
                  and restock it before completing the sale.
                </p>

                {itemEditor.draft.productId && itemEditorProductQuery.isLoading && (
                  <div className="flex items-center gap-2 rounded-lg bg-background p-3 text-sm text-text-secondary">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading product options…
                  </div>
                )}

                {editorProduct && editorHasVariants && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {editorOptionNames.map((optionName) => {
                      const matchingVariants = getMatchingVariants(
                        editorInStockVariants,
                        itemEditor.draft.selectedVariantOptions,
                        optionName
                      )
                      const values = Array.from(
                        new Set(
                          matchingVariants
                            .map((variant) => variant.options?.[optionName])
                            .filter((value): value is string => Boolean(value))
                        )
                      ).sort((left, right) => {
                        const leftOrder =
                          editorOptionSortMap[optionName]?.[left] ?? Number.MAX_SAFE_INTEGER
                        const rightOrder =
                          editorOptionSortMap[optionName]?.[right] ?? Number.MAX_SAFE_INTEGER
                        return leftOrder === rightOrder
                          ? left.localeCompare(right)
                          : leftOrder - rightOrder
                      })

                      return (
                        <Select
                          key={optionName}
                          label={`${optionName} *`}
                          options={[
                            {
                              label: values.length
                                ? `Select ${optionName}`
                                : `No in-stock ${optionName} values`,
                              value: ''
                            },
                            ...values.map((value) => ({ label: value, value }))
                          ]}
                          value={itemEditor.draft.selectedVariantOptions[optionName] ?? ''}
                          onChange={(event) =>
                            updateItemDraft((draft) => {
                              const value = String(event.target.value)
                              const selectedOptions = { ...draft.selectedVariantOptions }
                              if (value) selectedOptions[optionName] = value
                              else delete selectedOptions[optionName]

                              const matches = getMatchingVariants(
                                editorInStockVariants,
                                selectedOptions
                              )
                              const isComplete = editorOptionNames.every(
                                (name) => Boolean(selectedOptions[name])
                              )
                              const resolvedVariant =
                                isComplete && matches.length === 1 ? matches[0] : null

                              return {
                                ...draft,
                                productVariantId: resolvedVariant
                                  ? String(resolvedVariant.id)
                                  : '',
                                selectedVariantOptions:
                                  resolvedVariant?.options ?? selectedOptions,
                                quantity: '1'
                              }
                            })
                          }
                          disabled={editorInStockVariants.length === 0}
                        />
                      )
                    })}
                  </div>
                )}

                {editorProduct && editorHasVariants && editorInStockVariants.length === 0 && (
                  <p className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning-dark">
                    This product has no in-stock variants in the selected branch.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <label htmlFor="pos-item-quantity" className="block font-medium text-text-secondary">
                      Quantity *
                    </label>
                    <div className="flex h-10 overflow-hidden rounded-md border border-border bg-white shadow-sm">
                      <button
                        type="button"
                        aria-label="Reduce item quantity"
                        onClick={() =>
                          updateItemDraft((draft) => ({
                            ...draft,
                            quantity: String(Math.max(1, editorQuantity - 1))
                          }))
                        }
                        disabled={
                          !editorProduct ||
                          (editorHasVariants && !editorSelectedVariant) ||
                          editorQuantity <= 1
                        }
                        className="grid w-10 place-items-center border-r border-border text-text-secondary transition hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <MinusCircleIcon className="h-4 w-4" />
                      </button>
                      <input
                        id="pos-item-quantity"
                        aria-label="Item quantity"
                        type="number"
                        min={1}
                        max={editorAvailableStock}
                        step={1}
                        value={itemEditor.draft.quantity}
                        onChange={(event) =>
                          updateItemDraft((draft) => ({ ...draft, quantity: event.target.value }))
                        }
                        disabled={
                          !editorProduct ||
                          (editorHasVariants && !editorSelectedVariant) ||
                          editorAvailableStock === 0
                        }
                        className="min-w-0 flex-1 bg-white px-2 text-center font-semibold text-text outline-none [appearance:textfield] focus:bg-primary/5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        required
                      />
                      <button
                        type="button"
                        aria-label="Increase item quantity"
                        onClick={() =>
                          updateItemDraft((draft) => ({
                            ...draft,
                            quantity: String(
                              Math.min(editorAvailableStock ?? 1, Math.max(1, editorQuantity) + 1)
                            )
                          }))
                        }
                        disabled={
                          !editorProduct ||
                          (editorHasVariants && !editorSelectedVariant) ||
                          editorAvailableStock === undefined ||
                          editorQuantity >= editorAvailableStock
                        }
                        className="grid w-10 place-items-center border-l border-border text-text-secondary transition hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-text-tertiary">
                      {itemEditor.draft.productId
                        ? editorHasVariants && !editorSelectedVariant
                          ? 'Choose all product options first.'
                          : `${editorAvailableStock ?? 0} available`
                        : 'Choose a product first.'}
                    </p>
                  </div>
                  <TextInput
                    label="Unit Price"
                    value={formatCurrency(editorUnitPrice)}
                    readOnly
                    disabled
                    className="bg-background"
                  />
                  <TextInput
                    label="Line Total"
                    value={formatCurrency(editorLineTotal)}
                    readOnly
                    disabled
                    className="bg-primary/5 font-bold text-primary"
                  />
                </div>

                {editorSelectedVariant && (
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-secondary">
                    <span className="font-semibold text-text">
                      {formatVariantLabel(editorSelectedVariant)}
                    </span>
                    <span className="mx-2 text-text-tertiary">·</span>
                    SKU {editorSelectedVariant.sku}
                  </div>
                )}

                {itemEditorError && (
                  <p role="alert" className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
                    {itemEditorError}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setItemEditor(null)
                      setItemEditorError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveItemDraft}
                    disabled={itemEditorProductQuery.isLoading}
                    className="min-w-28 bg-gradient-to-r from-primary to-secondary text-white"
                  >
                    {itemEditor.mode === 'add' ? 'Add to Sale' : 'Save Changes'}
                  </Button>
                </div>
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

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastCreatedSaleId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${lastCreatedSaleSummary?.isMpesa && lastCreatedSaleSummary.paymentStatus !== 'successful' ? 'bg-warning/10' : 'bg-success/10'}`}>
                  {lastCreatedSaleSummary?.isMpesa && lastCreatedSaleSummary.paymentStatus !== 'successful'
                    ? <CreditCardIcon className="h-10 w-10 text-warning" />
                    : <CheckCircleSolid className="h-10 w-10 text-success" />}
                </div>
                <h3 className="text-xl font-bold text-text mb-2">
                  {lastCreatedSaleSummary?.isMpesa
                    ? lastCreatedSaleSummary.paymentStatus === 'successful'
                      ? 'Sale And Payment Completed'
                      : ['failed', 'cancelled', 'timed_out'].includes(lastCreatedSaleSummary.paymentStatus)
                        ? 'M-Pesa Payment Not Completed'
                        : 'Awaiting M-Pesa Confirmation'
                    : 'Sale And Payment Completed'}
                </h3>
                <p className="text-text-secondary mb-4">
                  {lastCreatedSaleSummary?.isMpesa && lastCreatedSaleSummary.paymentStatus !== 'successful'
                    ? `POS sale #${lastCreatedSaleId} is saved and remains unpaid. Payment is recorded only after M-Pesa verification succeeds.`
                    : `POS sale #${lastCreatedSaleId} has been created and payment recorded successfully.`}
                </p>
                
                <div className="bg-background rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-secondary">Total Amount</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(lastCreatedSaleSummary?.totalAmount ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Payment Method</span>
                    <span className="text-sm font-semibold text-text">
                      {lastCreatedSaleSummary?.paymentModeName ?? '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-text-secondary">Payment Status</span>
                    <span className="text-sm font-semibold text-text">
                      {lastCreatedSaleSummary?.paymentStatus ?? '--'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {lastCreatedSaleSummary?.isMpesa && ['failed', 'cancelled', 'timed_out'].includes(lastCreatedSaleSummary.paymentStatus) && (
                    <Button
                      onClick={() => retryPosMpesaMutation.mutate()}
                      loading={retryPosMpesaMutation.isPending}
                      className="flex-1"
                    >
                      Retry M-Pesa
                    </Button>
                  )}
                  {lastCreatedSaleSummary?.isMpesa && lastCreatedSaleSummary.paymentStatus !== 'successful' && (
                    <Button
                      variant="outline"
                      onClick={() => posMpesaStatusQuery.refetch()}
                      loading={posMpesaStatusQuery.isFetching}
                      className="flex-1"
                    >
                      Check Status
                    </Button>
                  )}
                  <Link to={workspacePath('/dashboard/admin/sales')} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View All Sales
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => {
                      setShowSuccessModal(false)
                      setCreateSaleForm(createEmptySaleForm(createSaleForm.branchId))
                    }}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
                  >
                    Create Another
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CreatePosSalePage
