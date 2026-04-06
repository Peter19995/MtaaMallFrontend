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
  CurrencyDollarIcon,
  TagIcon,
  PhoneIcon,
  ReceiptRefundIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  CalculatorIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button, Select, TextInput } from '@components/common'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  getDefaultCashCustomerRequest,
  listCustomersRequest
} from '@api/modules/customers.api'
import { getProductRequest, listInStockProductsRequest } from '@api/modules/products.api'
import {
  createPosSaleRequest,
  listPaymentModesRequest,
  processOrderPaymentRequest
} from '@api/modules/pos.api'
import { AppTheme, withOpacity } from '@constants/theme'

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
  items: [createSaleItemRow()]
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
    stock_quantity: number
    options: Record<string, string>
    price: number
  }>
) => variants.filter((variant) => Number(variant.stock_quantity ?? 0) > 0)

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
  const queryClient = useQueryClient()
  const [createSaleForm, setCreateSaleForm] = useState<CreatePosSaleFormState>(createEmptySaleForm())
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [lastCreatedSaleId, setLastCreatedSaleId] = useState<number | null>(null)
  const [lastCreatedSaleSummary, setLastCreatedSaleSummary] = useState<LastCreatedSaleSummary | null>(
    null
  )
  const [showSuccessModal, setShowSuccessModal] = useState(false)

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

  const customerOptions = useMemo(() => {
    if (customersQuery.isLoading) {
      return [{ label: 'Loading customers...', value: '' }]
    }

    const defaultCashCustomerId = defaultCashCustomerQuery.data?.id
    const customers = [...(customersQuery.data ?? [])].sort((left, right) => {
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
        label:
          `${customer.full_name?.trim() || customer.username} (${customer.email})` +
          (customer.is_cash_customer ? ' - Default cash customer' : ''),
        value: String(customer.id)
      }))
    ]
  }, [customersQuery.isLoading, customersQuery.data, defaultCashCustomerQuery.data])

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
          value: String(product.id)
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

  const activePaymentModes = useMemo(
    () => (paymentModesQuery.data ?? []).filter((mode) => mode.is_active),
    [paymentModesQuery.data]
  )

  const paymentModeOptions = useMemo(() => {
    if (!selectedBranchId) {
      return [{ label: 'Select a branch first', value: '' }]
    }

    if (paymentModesQuery.isLoading) {
      return [{ label: 'Loading payment modes...', value: '' }]
    }

    if (activePaymentModes.length === 0) {
      return [{ label: 'No active payment modes for this branch', value: '' }]
    }

    return activePaymentModes.map((mode) => ({
      label: `${mode.name} (${mode.code})`,
      value: String(mode.id)
    }))
  }, [selectedBranchId, paymentModesQuery.isLoading, activePaymentModes])

  const hasSelectablePaymentModes = activePaymentModes.length > 0
  const hasSelectableProducts = (productsQuery.data ?? []).length > 0
  const selectedCustomer = useMemo(
    () =>
      (customersQuery.data ?? []).find(
        (customer) => String(customer.id) === createSaleForm.customerId
      ) ?? null,
    [customersQuery.data, createSaleForm.customerId]
  )
  const selectedPaymentMode = useMemo(
    () => activePaymentModes.find((mode) => String(mode.id) === createSaleForm.paymentModeId),
    [activePaymentModes, createSaleForm.paymentModeId]
  )
  const requiresPhoneForPayment = useMemo(() => {
    const code = selectedPaymentMode?.code?.toLowerCase() ?? ''
    return code.includes('mpesa')
  }, [selectedPaymentMode])

  useEffect(() => {
    if (customersQuery.isLoading || defaultCashCustomerQuery.isLoading) {
      return
    }

    const activeCustomers = customersQuery.data ?? []
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
    customersQuery.data,
    defaultCashCustomerQuery.isLoading,
    defaultCashCustomerQuery.data,
    createSaleForm.customerId
  ])

  useEffect(() => {
    if (!selectedBranchId) {
      return
    }

    const defaultMode = activePaymentModes.find((mode) => mode.is_default) ?? activePaymentModes[0]
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

    const hasCurrentValue = activePaymentModes.some(
      (mode) => String(mode.id) === createSaleForm.paymentModeId
    )
    if (!hasCurrentValue) {
      setCreateSaleForm((previous) => ({
        ...previous,
        paymentModeId: String(defaultMode.id)
      }))
    }
  }, [selectedBranchId, activePaymentModes, createSaleForm.paymentModeId])

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

      const selectedMode = activePaymentModes.find((mode) => String(mode.id) === String(paymentModeId))
      if (!selectedMode) {
        throw new Error('Selected payment mode is not available for this branch.')
      }

      const phoneNumber = payload.paymentPhoneNumber.trim()
      if (requiresPhoneForPayment && phoneNumber.length < 9) {
        throw new Error('Phone number is required for M-Pesa payments (minimum 9 digits).')
      }

      const sale = await createPosSaleRequest({
        items,
        payment_mode_id: paymentModeId,
        discount_amount: discountAmount,
        branch_id: branchId,
        customer_id: parseOptionalNumber(payload.customerId)
      })

      try {
        const paymentResult = await processOrderPaymentRequest(
          sale.id,
          {
            payment_mode_id: paymentModeId,
            amount: sale.total_amount,
            phone_number: phoneNumber || undefined,
            transaction_desc: `POS sale #${sale.id}`,
            mark_completed: true
          },
          {
            branch_id: branchId
          }
        )

        return {
          sale,
          paymentStatus: paymentResult.result_status
        }
      } catch (paymentError) {
        throw new Error(
          `POS sale #${sale.id} was created, but payment failed: ${extractApiErrorMessage(paymentError)}`
        )
      }
    },
    onSuccess: (result, payload) => {
      const sale = result.sale
      const paymentModeName =
        activePaymentModes.find((mode) => String(mode.id) === payload.paymentModeId)?.name ??
        `#${payload.paymentModeId}`

      setFeedback({
        type: 'success',
        message: `POS sale #${sale.id} created and payment processed (${result.paymentStatus}).`
      })
      setLastCreatedSaleId(sale.id)
      setLastCreatedSaleSummary({
        totalAmount: sale.total_amount,
        paymentModeName,
        paymentStatus: result.paymentStatus
      })
      setShowSuccessModal(true)
      setCreateSaleForm(createEmptySaleForm(createSaleForm.branchId))
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

  const onCreateSale = (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    setLastCreatedSaleId(null)
    setLastCreatedSaleSummary(null)
    createPosSaleMutation.mutate(createSaleForm)
  }

  const updateSaleRow = (rowId: string, updater: (row: SaleItemRowState) => SaleItemRowState) => {
    setCreateSaleForm((previous) => ({
      ...previous,
      items: previous.items.map((row) => (row.id === rowId ? updater(row) : row))
    }))
  }

  const addSaleRow = () => {
    setCreateSaleForm((previous) => ({
      ...previous,
      items: [...previous.items, createSaleItemRow()]
    }))
  }

  const removeSaleRow = (rowId: string) => {
    setCreateSaleForm((previous) => ({
      ...previous,
      items:
        previous.items.length > 1 ? previous.items.filter((item) => item.id !== rowId) : previous.items
    }))
  }

  const clearAllItems = () => {
    setCreateSaleForm((previous) => ({
      ...previous,
      items: [createSaleItemRow()]
    }))
  }

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
        <Link to="/dashboard/admin/sales">
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
              Select branch and items, then payment is processed immediately after sale creation.
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
            {/* Sale Header Fields */}
            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-1">
                <Select
                  label="Branch *"
                  options={branchOptions}
                  value={createSaleForm.branchId}
                  onChange={(event) =>
                    setCreateSaleForm((previous) => ({
                      ...previous,
                      branchId: String(event.target.value),
                      paymentModeId: '',
                      items: [createSaleItemRow()]
                    }))
                  }
                  disabled={branchesQuery.isLoading}
                  required
                />
              </div>
              
              <div className="md:col-span-1">
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
                      ? `${selectedCustomer.email}${
                          selectedCustomer.is_cash_customer ? ' • default cash customer' : ''
                        }`
                      : 'Optional. Defaults to your cash customer when available.'
                  }
                />
              </div>
              
              <div className="md:col-span-1">
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

              <div className="md:col-span-1">
                <TextInput
                  label={requiresPhoneForPayment ? 'Phone Number *' : 'Phone Number'}
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={createSaleForm.paymentPhoneNumber}
                  onChange={(event) =>
                    setCreateSaleForm((previous) => ({
                      ...previous,
                      paymentPhoneNumber: event.target.value
                    }))
                  }
                  helperText={
                    requiresPhoneForPayment
                      ? 'Required for M-Pesa payment processing.'
                      : 'Optional. Used when payment mode requires phone.'
                  }
                  icon={<PhoneIcon className="h-4 w-4 text-text-tertiary" />}
                />
              </div>
              
              <div className="md:col-span-1">
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
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                  <ShoppingBagIcon className="h-4 w-4 text-primary" />
                  Sale Items
                </h3>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={clearAllItems}
                    disabled={createSaleForm.items.length === 1 && !createSaleForm.items[0].productId}
                  >
                    <MinusCircleIcon className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addSaleRow}
                    className="bg-gradient-to-r from-primary to-secondary text-white"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {createSaleForm.items.map((item, index) => {
                  const rowProduct = saleItemProductQueries[index]?.data
                  const variants = rowProduct?.variants ?? []
                  const inStockVariants = getInStockVariants(variants)
                  const hasVariants = variants.length > 0
                  const selectedVariant = inStockVariants.find(
                    (variant) => String(variant.id) === item.productVariantId
                  )
                  const orderedOptionNames = getOrderedVariantOptionNames(
                    rowProduct?.variant_options,
                    inStockVariants
                  )
                  const optionSortMap = getVariantOptionSortMap(rowProduct?.variant_options)
                  const unitPrice = selectedVariant?.price ?? productPriceById[item.productId] ?? 0
                  const quantity = Number(item.quantity)
                  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
                  const lineTotal = unitPrice * safeQuantity
                  const availableStock = hasVariants
                    ? selectedVariant?.stock_quantity
                    : productStockById[item.productId]
                  const quantityHelper = hasVariants
                    ? item.productVariantId
                      ? `${availableStock ?? 0} in stock`
                      : inStockVariants.length > 0
                      ? 'Choose the exact in-stock options first'
                      : 'No in-stock variants available'
                    : availableStock !== undefined
                    ? `${availableStock} in stock`
                    : 'Choose a product'
                  const variantSummary = selectedVariant
                    ? formatVariantLabel(selectedVariant)
                    : hasVariants
                    ? 'Choose the exact option combination'
                    : 'Base product'

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="relative bg-background rounded-lg border border-border p-4"
                    >
                      <div className="absolute -top-2 -left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                        Item {index + 1}
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-12 mt-4">
                        <div className="md:col-span-4">
                          <Select
                            label="Product"
                            options={productOptions}
                            value={item.productId}
                            onChange={(event) =>
                              updateSaleRow(item.id, (current) => ({
                                ...current,
                                productId: String(event.target.value),
                                productVariantId: '',
                                selectedVariantOptions: {},
                                quantity: '1'
                              }))
                            }
                            disabled={!selectedBranchId || productsQuery.isLoading || !hasSelectableProducts}
                            required
                          />
                        </div>

                        {hasVariants
                          ? orderedOptionNames.map((optionName) => {
                              const matchingVariantsForOption = getMatchingVariants(
                                inStockVariants,
                                item.selectedVariantOptions,
                                optionName
                              )
                              const valueOptions = Array.from(
                                new Set(
                                  matchingVariantsForOption
                                    .map((variant) => variant.options?.[optionName])
                                    .filter((value): value is string => Boolean(value))
                                )
                              ).sort((left, right) => {
                                const leftSortOrder = optionSortMap[optionName]?.[left] ?? Number.MAX_SAFE_INTEGER
                                const rightSortOrder =
                                  optionSortMap[optionName]?.[right] ?? Number.MAX_SAFE_INTEGER

                                if (leftSortOrder !== rightSortOrder) {
                                  return leftSortOrder - rightSortOrder
                                }

                                return left.localeCompare(right)
                              })

                              return (
                                <div
                                  key={`${item.id}-${optionName}`}
                                  className="md:col-span-2"
                                >
                                  <Select
                                    label={optionName}
                                    options={[
                                      {
                                        label:
                                          valueOptions.length > 0
                                            ? `Select ${optionName}`
                                            : `No in-stock ${optionName} values`,
                                        value: ''
                                      },
                                      ...valueOptions.map((value) => ({
                                        label: value,
                                        value
                                      }))
                                    ]}
                                    value={item.selectedVariantOptions[optionName] ?? ''}
                                    onChange={(event) =>
                                      updateSaleRow(item.id, (current) => {
                                        const nextOptionValue = String(event.target.value)
                                        const nextSelectedOptions = nextOptionValue
                                          ? {
                                              ...current.selectedVariantOptions,
                                              [optionName]: nextOptionValue
                                            }
                                          : (() => {
                                              const nextOptions: Record<string, string> = {}
                                              Object.entries(current.selectedVariantOptions).forEach(
                                                ([name, value]) => {
                                                  if (name !== optionName) {
                                                    nextOptions[name] = value
                                                  }
                                                }
                                              )
                                              return nextOptions
                                            })()
                                        const matches = getMatchingVariants(
                                          inStockVariants,
                                          nextSelectedOptions
                                        )
                                        const hasFullSelection = orderedOptionNames.every(
                                          (name) => Boolean(nextSelectedOptions[name])
                                        )
                                        const resolvedVariant =
                                          hasFullSelection && matches.length === 1 ? matches[0] : null

                                        return {
                                          ...current,
                                          productVariantId: resolvedVariant
                                            ? String(resolvedVariant.id)
                                            : '',
                                          selectedVariantOptions: resolvedVariant?.options ?? nextSelectedOptions,
                                          quantity: '1'
                                        }
                                      })
                                    }
                                    disabled={
                                      !item.productId ||
                                      saleItemProductQueries[index]?.isLoading ||
                                      inStockVariants.length === 0
                                    }
                                    helperText={
                                      valueOptions.length > 0
                                        ? `${valueOptions.length} in-stock option${
                                            valueOptions.length === 1 ? '' : 's'
                                          }`
                                        : 'No available values for the current selection'
                                    }
                                  />
                                </div>
                              )
                            })
                          : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-12 mt-3">
                        <div className="md:col-span-3">
                          <TextInput
                            label="Quantity"
                            type="number"
                            min={1}
                            max={availableStock !== undefined ? availableStock : undefined}
                            value={item.quantity}
                            onChange={(event) =>
                              updateSaleRow(item.id, (current) => ({
                                ...current,
                                quantity: event.target.value
                              }))
                            }
                            helperText={quantityHelper}
                            required
                          />
                        </div>

                        <div className="md:col-span-3">
                          <TextInput
                            label="Unit Price"
                            value={formatCurrency(unitPrice)}
                            readOnly
                            disabled
                            className="bg-white"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <TextInput
                            label="Line Total"
                            value={formatCurrency(lineTotal)}
                            readOnly
                            disabled
                            className="bg-white font-bold text-primary"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <div className="flex h-full items-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeSaleRow(item.id)}
                              disabled={createSaleForm.items.length === 1}
                              className="w-full text-error hover:bg-error/5"
                            >
                              <XMarkIcon className="h-4 w-4 mr-1" />
                              Remove Item
                            </Button>
                          </div>
                        </div>
                      </div>

                      {item.productId ? (
                        <div className="mt-3 rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-secondary">
                          {saleItemProductQueries[index]?.isLoading ? (
                            <div className="flex items-center gap-2">
                              <XCircleIcon className="h-3.5 w-3.5 text-text-tertiary" />
                              Loading product details...
                            </div>
                          ) : (saleItemProductQueries[index]?.data?.variants?.length ?? 0) > 0 &&
                            inStockVariants.length === 0 ? (
                            <p>No in-stock variants are available for this product in the selected branch.</p>
                          ) : (saleItemProductQueries[index]?.data?.variants?.length ?? 0) > 0 &&
                            !item.productVariantId ? (
                            <p>Select the exact in-stock option combination before processing this sale item.</p>
                          ) : (
                            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                              <span>
                                Selling:
                                <strong className="ml-1 text-text">{variantSummary}</strong>
                              </span>
                              {selectedVariant ? (
                                <span>
                                  SKU:
                                  <strong className="ml-1 text-text">{selectedVariant.sku}</strong>
                                </span>
                              ) : null}
                              <span>
                                Available stock:
                                <strong className="ml-1 text-text">{availableStock ?? 0}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

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
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Link to="/dashboard/admin/sales">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
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
                className="bg-gradient-to-r from-primary to-secondary text-white min-w-[160px]"
              >
                {createPosSaleMutation.isPending ? 'Processing...' : 'Create & Process Payment'}
              </Button>
            </div>
          </form>
        </div>
      </motion.section>

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
                <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleSolid className="h-10 w-10 text-success" />
                </div>
                <h3 className="text-xl font-bold text-text mb-2">Sale And Payment Completed</h3>
                <p className="text-text-secondary mb-4">
                  POS sale #{lastCreatedSaleId} has been created and payment processing was triggered.
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
                  <Link to={`/dashboard/admin/sales`} className="flex-1">
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
