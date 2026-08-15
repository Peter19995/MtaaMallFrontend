import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  PhotoIcon,
  CubeIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  EyeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button, Select, TextArea, TextInput } from '@components/common'
import {
  getStockStatusRequest,
  type ProductStockStatusResponse as InventoryProductStockStatusResponse
} from '@api/modules/inventory.api'
import {
  attachVariantOptionToProductRequest,
  updateProductVariantOptionValuesRequest,
  updateProductVariantPricingRequest,
  deleteProductImageRequest,
  deleteProductRequest,
  detachVariantOptionFromProductRequest,
  getProductRequest,
  listCategoriesRequest,
  listBrandsRequest,
  listProductVariantOptionsRequest,
  listVariantOptionsRequest,
  type ProductResponse,
  uploadProductImagesRequest,
  updateProductRequest,
  type ProductUpdate
} from '@api/modules/products.api'
import { AppTheme, withOpacity } from '@constants/theme'
import { resolveMediaUrl } from '@utils/media'

type ManageProductFormState = {
  name: string
  description: string
  tags: string
  categoryId: string
  brandId: string
  stockQuantity: string
  reorderLevel: string
  isActive: boolean
  isOnOffer: boolean
  maxOffer: string
  imageFiles: File[]
}

const EMPTY_FORM: ManageProductFormState = {
  name: '',
  description: '',
  tags: '',
  categoryId: '',
  brandId: '',
  stockQuantity: '0',
  reorderLevel: '5',
  isActive: true,
  isOnOffer: false,
  maxOffer: '0',
  imageFiles: []
}

type VariantPriceDraft = {
  useBasePrice: boolean
  sellingPrice: string
  costPrice: string
  compareAtPrice: string
  offerPrice: string
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const getProductTags = (tags?: string | null): string[] =>
  (tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const getProductImageId = (product: ProductResponse, index: number) =>
  product.images?.[index]?.id ?? index + 1

const getProductImageSrc = (product: ProductResponse, index: number) =>
  resolveMediaUrl(product.images?.[index]?.image_url ?? product.images?.[index]?.file_url ?? product.images?.[index]?.url ?? product.image_urls?.[index]) ??
  product.image_urls?.[index] ??
  ''

const getBlockingStockStatuses = (statuses: InventoryProductStockStatusResponse[]) =>
  statuses.filter((status) => status.stock_quantity > 0 || status.business_stock_quantity > 0)

const mergeImageFiles = (existingFiles: File[], incomingFiles: File[]) => {
  const mergedFiles = [...existingFiles]

  incomingFiles.forEach((incomingFile) => {
    const alreadySelected = mergedFiles.some(
      (currentFile) =>
        currentFile.name === incomingFile.name &&
        currentFile.size === incomingFile.size &&
        currentFile.lastModified === incomingFile.lastModified
    )

    if (!alreadySelected) {
      mergedFiles.push(incomingFile)
    }
  })

  return mergedFiles
}

type PendingImagePreview = {
  file: File
  previewUrl: string
}

const ManageProductPage = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { productId: productIdParam } = useParams()
  const productId = Number(productIdParam)

  const [form, setForm] = useState<ManageProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const initialTab =
    location.state?.initialTab === 'images' || location.state?.initialTab === 'variants'
      ? location.state.initialTab
      : 'details'
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'variants'>(initialTab)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedVariantOptionId, setSelectedVariantOptionId] = useState('')
  const [selectedVariantValueIds, setSelectedVariantValueIds] = useState<number[]>([])
  const [variantValueSelections, setVariantValueSelections] = useState<Record<number, number[]>>({})
  const [pricingStrategy, setPricingStrategy] = useState<'shared' | 'mixed' | 'variant'>('shared')
  const [baseSellingPrice, setBaseSellingPrice] = useState('0')
  const [baseCostPrice, setBaseCostPrice] = useState('')
  const [baseCompareAtPrice, setBaseCompareAtPrice] = useState('')
  const [variantPriceDrafts, setVariantPriceDrafts] = useState<Record<number, VariantPriceDraft>>({})
  const [variantActionError, setVariantActionError] = useState<string | null>(null)

  const brandsQuery = useQuery({
    queryKey: ['products', 'brands'],
    queryFn: listBrandsRequest
  })

  const productQuery = useQuery({
    queryKey: ['products', 'details', productId],
    queryFn: () => getProductRequest(productId),
    enabled: Number.isFinite(productId) && productId > 0
  })

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest
  })

  const variantOptionsQuery = useQuery({
    queryKey: ['products', 'variant-options'],
    queryFn: listVariantOptionsRequest
  })

  const productVariantOptionsQuery = useQuery({
    queryKey: ['products', 'details', productId, 'variant-options'],
    queryFn: () => listProductVariantOptionsRequest(productId),
    enabled: Number.isFinite(productId) && productId > 0
  })

  const deleteProductStockStatusQuery = useQuery({
    queryKey: ['inventory', 'stock-status', 'manage-delete-product', productId],
    queryFn: () =>
      getStockStatusRequest({
        product_id: productId,
        limit: 300
      }),
    enabled: showDeleteConfirm && Number.isFinite(productId) && productId > 0
  })

  useEffect(() => {
    const product = productQuery.data
    if (!product) {
      return
    }

    setForm({
      name: product.name,
      description: product.description ?? '',
      tags: product.tags ?? '',
      categoryId: product.category_id ? String(product.category_id) : '',
      brandId: product.brand_id ? String(product.brand_id) : '',
      stockQuantity: String(product.stock_quantity),
      reorderLevel: String(product.reorder_level),
      isActive: product.is_active,
      isOnOffer: Boolean(product.is_on_offer),
      maxOffer: String(product.max_offer ?? 0),
      imageFiles: []
    })
  }, [productQuery.data])

  const categoryOptions = useMemo(
    () => [
      { label: 'No category', value: '' },
      ...(categoriesQuery.data ?? []).map((category) => ({
        label: category.name,
        value: String(category.id)
      }))
    ],
    [categoriesQuery.data]
  )

  const brandOptions = useMemo(
    () => [
      { label: 'No brand / unbranded', value: '' },
      ...(brandsQuery.data ?? []).map((brand) => ({ label: brand.name, value: String(brand.id) }))
    ],
    [brandsQuery.data]
  )

  const pendingImagePreviews = useMemo<PendingImagePreview[]>(
    () =>
      form.imageFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      })),
    [form.imageFiles]
  )

  const deleteBlockingStocks = useMemo(
    () => getBlockingStockStatuses(deleteProductStockStatusQuery.data ?? []),
    [deleteProductStockStatusQuery.data]
  )

  const variantOptions = variantOptionsQuery.data ?? []
  const attachedVariantOptions =
    productVariantOptionsQuery.data ?? productQuery.data?.variant_options ?? []
  const attachedVariantOptionIds = useMemo(
    () => new Set(attachedVariantOptions.map((option) => option.id)),
    [attachedVariantOptions]
  )
  const availableVariantOptions = useMemo(
    () => variantOptions.filter((option) => !attachedVariantOptionIds.has(option.id)),
    [attachedVariantOptionIds, variantOptions]
  )
  const variantCount = productQuery.data?.variants?.length ?? 0
  const activeVariantCount =
    productQuery.data?.variants?.filter((variant) => variant.is_active).length ?? 0

  useEffect(() => {
    setVariantValueSelections(
      Object.fromEntries(attachedVariantOptions.map((option) => [option.id, option.values.map((value) => value.id)]))
    )
  }, [attachedVariantOptions])

  useEffect(() => {
    const product = productQuery.data
    if (!product) return
    setPricingStrategy(product.pricing_strategy ?? 'shared')
    setBaseSellingPrice(String(product.selling_price ?? product.price ?? 0))
    setBaseCostPrice(product.cost_price == null ? '' : String(product.cost_price))
    setBaseCompareAtPrice(product.compare_at_price == null ? '' : String(product.compare_at_price))
    setVariantPriceDrafts(Object.fromEntries((product.variants ?? []).map((variant) => [
      variant.id,
      {
        useBasePrice: variant.inherits_price ?? variant.price_override == null,
        sellingPrice: variant.price_override == null ? '' : String(variant.price_override),
        costPrice: variant.cost_price == null ? '' : String(variant.cost_price),
        compareAtPrice: variant.compare_at_price == null ? '' : String(variant.compare_at_price),
        offerPrice: variant.offer_price == null ? '' : String(variant.offer_price),
      },
    ])))
  }, [productQuery.data])

  useEffect(
    () => () => {
      pendingImagePreviews.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    },
    [pendingImagePreviews]
  )

  const updateProductMutation = useMutation({
    mutationFn: async (payload: ManageProductFormState) => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }

      const stockQuantity = Number(payload.stockQuantity)
      const reorderLevel = Number(payload.reorderLevel)
      const maxOffer = Number(payload.maxOffer)
      const categoryId = payload.categoryId ? Number(payload.categoryId) : undefined
      const brandId = payload.brandId ? Number(payload.brandId) : undefined
      const tags = payload.tags.trim()

      if (!payload.name.trim()) {
        throw new Error('Product name is required.')
      }
      if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
        throw new Error('Stock quantity must be 0 or more.')
      }
      if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
        throw new Error('Reorder level must be 0 or more.')
      }
      if (Number.isNaN(maxOffer) || maxOffer < 0) {
        throw new Error('Max offer must be 0 or more.')
      }

      const updatePayload: ProductUpdate = {
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        tags: tags || undefined,
        category_id: categoryId,
        brand_id: brandId,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        is_active: payload.isActive,
        is_on_offer: payload.isOnOffer,
        max_offer: payload.isOnOffer ? maxOffer : 0
      }

      await updateProductRequest(productId, updatePayload)

      return getProductRequest(productId)
    },
    onSuccess: () => {
      setFormError(null)
      setForm((prev) => ({ ...prev, imageFiles: [] }))
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId] })
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not update product.')
    }
  })

  const uploadProductImagesMutation = useMutation({
    mutationFn: async (imageFiles: File[]) => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }
      if (imageFiles.length === 0) {
        throw new Error('Select one or more images to upload.')
      }

      setUploadProgress(0)
      const interval = setInterval(() => {
        setUploadProgress((previous) => {
          if (previous >= 90) {
            return previous
          }

          return previous + 10
        })
      }, 200)

      try {
        await uploadProductImagesRequest(productId, imageFiles)
      } finally {
        clearInterval(interval)
      }

      setUploadProgress(100)
      return getProductRequest(productId)
    },
    onSuccess: (updatedProduct) => {
      setFormError(null)
      setForm((previous) => ({ ...previous, imageFiles: [] }))
      queryClient.setQueryData(['products', 'details', productId], updatedProduct)
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      setTimeout(() => setUploadProgress(0), 1000)
    },
    onError: (error: Error) => {
      setUploadProgress(0)
      setFormError(error.message || 'Could not upload product images.')
    }
  })

  const attachVariantOptionMutation = useMutation({
    mutationFn: async ({ optionId, valueIds }: { optionId: number; valueIds: number[] }) => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }

      return attachVariantOptionToProductRequest(productId, optionId, valueIds)
    },
    onSuccess: () => {
      setVariantActionError(null)
      setSelectedVariantOptionId('')
      setSelectedVariantValueIds([])
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId, 'variant-options'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      setVariantActionError(error.message || 'Could not attach variant option to product.')
    }
  })

  const updateVariantValuesMutation = useMutation({
    mutationFn: ({ optionId, valueIds }: { optionId: number; valueIds: number[] }) =>
      updateProductVariantOptionValuesRequest(productId, optionId, valueIds),
    onSuccess: () => {
      setVariantActionError(null)
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId, 'variant-options'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => setVariantActionError(error.message || 'Could not update variant values.')
  })

  const updateVariantPricingMutation = useMutation({
    mutationFn: () => updateProductVariantPricingRequest(productId, {
      pricing_strategy: pricingStrategy,
      selling_price: Number(baseSellingPrice || 0),
      cost_price: baseCostPrice === '' ? null : Number(baseCostPrice),
      compare_at_price: baseCompareAtPrice === '' ? null : Number(baseCompareAtPrice),
      currency_code: productQuery.data?.currency_code ?? 'KES',
      variants: (productQuery.data?.variants ?? []).map((variant) => {
        const draft = variantPriceDrafts[variant.id]
        return {
          variant_id: variant.id,
          use_base_price: draft?.useBasePrice ?? true,
          selling_price: draft?.useBasePrice || !draft?.sellingPrice ? null : Number(draft.sellingPrice),
          cost_price: !draft?.costPrice ? null : Number(draft.costPrice),
          compare_at_price: !draft?.compareAtPrice ? null : Number(draft.compareAtPrice),
          offer_price: !draft?.offerPrice ? null : Number(draft.offerPrice),
        }
      }),
    }),
    onSuccess: (updated) => {
      setVariantActionError(null)
      queryClient.setQueryData(['products', 'details', productId], updated)
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => setVariantActionError(error.message || 'Could not save variant pricing.')
  })

  const detachVariantOptionMutation = useMutation({
    mutationFn: async (optionId: number) => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }

      return detachVariantOptionFromProductRequest(productId, optionId)
    },
    onSuccess: () => {
      setVariantActionError(null)
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId, 'variant-options'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'details', productId] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      setVariantActionError(error.message || 'Could not detach variant option from product.')
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }
      await deleteProductRequest(productId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      navigate('/dashboard/admin/products')
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not delete product.')
    }
  })

  const deleteProductImageMutation = useMutation({
    mutationFn: async ({ imageId }: { imageId: number }) => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }

      return deleteProductImageRequest(productId, imageId)
    },
    onSuccess: (data) => {
      setFormError(null)
      setPreviewImage((currentPreview) => {
        if (!currentPreview) {
          return currentPreview
        }

        const remainingUrls = (data.image_urls ?? [])
          .map((url) => resolveMediaUrl(url) ?? url)
          .filter(Boolean)

        return remainingUrls.includes(currentPreview) ? currentPreview : null
      })

      queryClient.setQueryData<ProductResponse | undefined>(
        ['products', 'details', productId],
        (current) =>
          current
            ? {
                ...current,
                image_urls: data.image_urls ?? [],
                images: data.images ?? current.images
              }
            : current
      )
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not delete product image.')
    }
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    updateProductMutation.mutate(form)
  }

  const onAttachVariantOption = (event: FormEvent) => {
    event.preventDefault()
    setVariantActionError(null)

    const optionId = Number(selectedVariantOptionId)
    if (!Number.isFinite(optionId) || optionId <= 0) {
      setVariantActionError('Select a variant option to attach to this product.')
      return
    }

    if (selectedVariantValueIds.length === 0) {
      setVariantActionError('Select at least one value for this product.')
      return
    }

    attachVariantOptionMutation.mutate({ optionId, valueIds: selectedVariantValueIds })
  }

  if (!Number.isFinite(productId) || productId <= 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-error/30 mb-4" />
          <h2 className="text-2xl font-bold text-text mb-2">Invalid Product ID</h2>
          <p className="text-text-secondary mb-6">The product ID provided is not valid.</p>
          <Button onClick={() => navigate('/dashboard/admin/products')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

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
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard/admin/products')}
            className="!p-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <CubeIcon className="h-6 w-6 text-primary" />
              Manage Product
            </h1>
            {productQuery.data && (
              <p className="text-text-secondary mt-1">
                Editing: {productQuery.data.name} • SKU: {productQuery.data.sku}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Loading State */}
      {productQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 animate-spin text-primary/50 mx-auto mb-4" />
            <p className="text-text-secondary">Loading product details...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {productQuery.isError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center py-12"
        >
          <XCircleIcon className="h-16 w-16 mx-auto text-error/30 mb-4" />
          <h2 className="text-2xl font-bold text-text mb-2">Failed to Load Product</h2>
          <p className="text-text-secondary mb-6">Could not load product details. Please try again.</p>
          <Button onClick={() => productQuery.refetch()}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </motion.div>
      )}

      {/* Main Content */}
      {productQuery.data && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-xl border border-border shadow-lg overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
                <nav className="flex gap-2 p-2">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'details'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    <PencilIcon className="h-4 w-4" />
                    Product Details
                  </button>
                  <button
                    onClick={() => setActiveTab('images')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'images'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    <PhotoIcon className="h-4 w-4" />
                    Images ({productQuery.data.image_urls?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('variants')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'variants'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    <TagIcon className="h-4 w-4" />
                    Variants ({variantCount})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'details' && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <form onSubmit={onSubmit} className="space-y-6">
                        {/* Product Info Grid */}
                        <div className="grid gap-6 md:grid-cols-2">
                          <TextInput
                            label="Product Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            placeholder="e.g., Premium Cotton Curtains"
                            icon={<CubeIcon className="h-4 w-4 text-text-tertiary" />}
                          />

                          <Select
                            label="Category"
                            options={categoryOptions}
                            value={form.categoryId}
                            onChange={(e) => setForm({ ...form, categoryId: String(e.target.value) })}
                            icon={<TagIcon className="h-4 w-4 text-text-tertiary" />}
                          />

                          <Select
                            label="Brand"
                            options={brandOptions}
                            value={form.brandId}
                            onChange={(e) => setForm({ ...form, brandId: String(e.target.value) })}
                          />

                          <TextInput
                            label="Stock Quantity"
                            type="number"
                            min={0}
                            value={form.stockQuantity}
                            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                            required
                            helperText="Current available stock"
                          />

                          <TextInput
                            label="Reorder Level"
                            type="number"
                            min={0}
                            value={form.reorderLevel}
                            onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                            required
                            helperText="Alert when stock falls below this"
                          />
                        </div>

                        {/* Description */}
                        <TextArea
                          label="Description"
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          rows={4}
                          placeholder="Product description..."
                        />

                        <TextArea
                          label="Tags"
                          value={form.tags}
                          onChange={(e) => setForm({ ...form, tags: e.target.value })}
                          rows={3}
                          placeholder="pillows, bedding, bedroom"
                          helperText="Comma-separated tags stored as a single backend value."
                        />

                        {/* Offer Section */}
                        <div className="bg-background rounded-lg p-4 border border-border">
                          <div className="flex items-center gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.isOnOffer}
                                onChange={(e) => setForm({ ...form, isOnOffer: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm font-medium text-text">Product is on offer</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm font-medium text-text">Product is active</span>
                            </label>
                          </div>

                          {form.isOnOffer && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="overflow-hidden"
                            >
                              <TextInput
                                label="Max Offer Amount (KES)"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.maxOffer}
                                onChange={(e) => setForm({ ...form, maxOffer: e.target.value })}
                                icon={<SparklesIcon className="h-4 w-4 text-text-tertiary" />}
                                helperText="Maximum discount amount"
                              />
                            </motion.div>
                          )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center gap-3 pt-4 border-t border-border">
                          <Button 
                            type="submit" 
                            loading={updateProductMutation.isPending}
                            className="min-w-[140px]"
                          >
                            Save Changes
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-error hover:bg-error/5 border-error/20"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete Product
                          </Button>

                          {formError && (
                            <span className="text-xs text-error flex items-center gap-1">
                              <XCircleIcon className="h-4 w-4" />
                              {formError}
                            </span>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === 'images' && (
                    <motion.div
                      key="images"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      {formError && (
                        <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                          <XCircleIcon className="h-4 w-4 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      )}

                      {/* Existing Images */}
                      <div>
                        <h3 className="text-sm font-semibold text-text mb-3">Current Images</h3>
                        {productQuery.data.image_urls?.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {productQuery.data.image_urls.map((url, index) => {
                              const imageSrc = getProductImageSrc(productQuery.data, index)
                              const imageId = getProductImageId(productQuery.data, index)

                              return (
                                <motion.div
                                  key={`${url}-${imageId}`}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-background cursor-pointer"
                                  onClick={() => setPreviewImage(imageSrc)}
                                >
                                  <img
                                    src={imageSrc}
                                    alt={`${productQuery.data.name} ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <EyeIcon className="h-6 w-6 text-white" />
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-error shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setFormError(null)
                                      deleteProductImageMutation.mutate({ imageId })
                                    }}
                                    disabled={deleteProductImageMutation.isPending}
                                    title="Delete image"
                                  >
                                    {deleteProductImageMutation.isPending ? (
                                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <TrashIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                </motion.div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-background rounded-lg border border-dashed border-border">
                            <PhotoIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-2" />
                            <p className="text-sm text-text-secondary">No images uploaded yet</p>
                          </div>
                        )}
                      </div>

                      {/* Upload New Images */}
                      <div>
                        <h3 className="text-sm font-semibold text-text mb-3">
                          {productQuery.data.image_urls?.length ? 'Add More Images' : 'Upload Images'}
                        </h3>
                        <div className="bg-background rounded-lg p-6 border border-dashed border-primary/30">
                          <div className="text-center">
                            <CloudArrowUpIcon className="h-12 w-12 mx-auto text-primary/50 mb-3" />
                            <p className="text-sm text-text-secondary mb-2">
                              Select one or more images to upload
                            </p>
                            <p className="text-xs text-text-tertiary mb-4">
                              Each upload is added to the existing product gallery.
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files ?? [])
                                setForm((previous) => ({
                                  ...previous,
                                  imageFiles: mergeImageFiles(previous.imageFiles, files)
                                }))
                                e.target.value = ''
                              }}
                              className="mx-auto block w-full max-w-sm rounded-lg border border-border bg-white px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-dark"
                            />
                          </div>

                          {form.imageFiles.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 space-y-3"
                            >
                              <p className="text-sm font-medium text-text">
                                {form.imageFiles.length} file(s) selected
                              </p>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {pendingImagePreviews.map(({ file, previewUrl }, index) => (
                                  <button
                                    key={`${file.name}-${file.lastModified}-${index}`}
                                    type="button"
                                    className="group relative overflow-hidden rounded-xl border border-border bg-white text-left"
                                    onClick={() => setPreviewImage(previewUrl)}
                                    title="Preview selected image"
                                  >
                                    <img
                                      src={previewUrl}
                                      alt={file.name}
                                      className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2">
                                      <p className="truncate text-xs font-medium text-white">{file.name}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {form.imageFiles.map((file, index) => (
                                  <span
                                    key={`${file.name}-${file.lastModified}-${index}`}
                                    className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                                  >
                                    <span className="max-w-[180px] truncate">{file.name}</span>
                                    <button
                                      type="button"
                                      className="rounded-full p-0.5 text-primary transition hover:bg-primary/10"
                                      onClick={() =>
                                        setForm((previous) => ({
                                          ...previous,
                                          imageFiles: previous.imageFiles.filter((_, fileIndex) => fileIndex !== index)
                                        }))
                                      }
                                      title="Remove image"
                                    >
                                      <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              
                              {uploadProgress > 0 && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-text-secondary">Uploading...</span>
                                    <span className="text-primary">{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full bg-background rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2 transition-all duration-300"
                                      style={{ width: `${uploadProgress}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setFormError(null)
                                    uploadProductImagesMutation.mutate(form.imageFiles)
                                  }}
                                  loading={uploadProductImagesMutation.isPending}
                                >
                                  Upload Images
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setForm({ ...form, imageFiles: [] })}
                                >
                                  Clear Selection
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'variants' && (
                    <motion.div
                      key="variants"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-6"
                    >
                      {variantActionError && (
                        <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                          <XCircleIcon className="h-4 w-4 shrink-0" />
                          <span>{variantActionError}</span>
                        </div>
                      )}
                      <div className="order-1 rounded-xl border border-primary/15 bg-primary/5 p-5">
                        <div className="flex items-start gap-3">
                          <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div>
                            <h3 className="text-sm font-semibold text-text">Set up variants in 3 simple steps</h3>
                            <p className="mt-1 text-sm text-text-secondary">
                              Choose what the product comes in, review the generated combinations,
                              then decide whether they share a price or use different prices.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {[
                            ['1', 'Choose options', 'Select values such as Vanilla, Strawberry, 250ml and 500ml.'],
                            ['2', 'Review combinations', 'The system creates only the combinations from your selections.'],
                            ['3', 'Set prices', 'Use one price for all, or override only the variants that differ.'],
                          ].map(([number, title, description]) => (
                            <div key={number} className="rounded-xl border border-primary/10 bg-white p-3">
                              <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{number}</span><p className="text-sm font-semibold text-text">{title}</p></div>
                              <p className="mt-2 text-xs leading-5 text-text-secondary">{description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="order-3 rounded-xl border border-border bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-text">Step 2: Review generated combinations</h3>
                            <p className="mt-1 text-xs text-text-secondary">These are the exact items customers and cashiers will choose from.</p>
                          </div>
                          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-secondary">{variantCount} combination{variantCount === 1 ? '' : 's'}</span>
                        </div>
                        {variantCount > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {(productQuery.data?.variants ?? []).map((variant) => (
                              <div key={variant.id} className="rounded-xl border border-border bg-background p-3">
                                <p className="text-sm font-semibold text-text">{Object.values(variant.options).join(' / ') || 'Default variant'}</p>
                                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-secondary"><span>{variant.sku}</span><span className="font-semibold text-primary">{formatCurrency(variant.price)}</span></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-6 text-center"><CubeIcon className="mx-auto h-8 w-8 text-text-tertiary/40" /><p className="mt-2 text-sm text-text-secondary">Choose an option and its values first. Combinations will appear here automatically.</p></div>
                        )}
                      </div>

                      <div className="order-4 rounded-xl border border-border bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-text">Step 3: Set prices</h3>
                            <p className="mt-1 text-xs text-text-secondary">
                              Use one price for every variant, individual prices, or a mixture where only some variants override the base price.
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {productQuery.data?.currency_code ?? 'KES'}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {[
                            { value: 'shared' as const, title: 'Same price for all', description: 'Best for colour or shape choices that do not change the price.' },
                            { value: 'mixed' as const, title: 'Mostly the same price', description: 'Use the base price, then override only larger or premium variants.' },
                            { value: 'variant' as const, title: 'Every variant has a price', description: 'Best when each size, weight, or pack has its own price.' },
                          ].map((choice) => (
                            <button
                              key={choice.value}
                              type="button"
                              onClick={() => {
                                setPricingStrategy(choice.value)
                                setVariantPriceDrafts((current) => Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, {
                                  ...draft,
                                  useBasePrice: choice.value === 'shared' ? true : choice.value === 'variant' ? false : draft.useBasePrice,
                                  sellingPrice: choice.value === 'variant' && !draft.sellingPrice ? baseSellingPrice : draft.sellingPrice,
                                }])) )
                              }}
                              className={`rounded-xl border p-4 text-left transition ${pricingStrategy === choice.value ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border bg-white hover:border-primary/40'}`}
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold text-text"><span className={`h-3 w-3 rounded-full border-2 ${pricingStrategy === choice.value ? 'border-primary bg-primary' : 'border-border'}`} />{choice.title}</span>
                              <span className="mt-2 block text-xs leading-5 text-text-secondary">{choice.description}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                          <TextInput label="Base selling price" type="number" min="0" step="0.01" value={baseSellingPrice} onChange={(event) => setBaseSellingPrice(event.target.value)} />
                          <TextInput label="Base cost price (optional)" type="number" min="0" step="0.01" value={baseCostPrice} onChange={(event) => setBaseCostPrice(event.target.value)} />
                          <TextInput label="Compare-at price (optional)" type="number" min="0" step="0.01" value={baseCompareAtPrice} onChange={(event) => setBaseCompareAtPrice(event.target.value)} helperText="Original/list price shown before a discount." />
                        </div>

                        {(productQuery.data?.variants ?? []).length > 0 ? (
                          <div className="mt-5 space-y-3 border-t border-border pt-5">
                            {(productQuery.data?.variants ?? []).map((variant) => {
                              const draft = variantPriceDrafts[variant.id] ?? { useBasePrice: true, sellingPrice: '', costPrice: '', compareAtPrice: '', offerPrice: '' }
                              const updateDraft = (changes: Partial<VariantPriceDraft>) => setVariantPriceDrafts((current) => ({ ...current, [variant.id]: { ...draft, ...changes } }))
                              return (
                                <div key={variant.id} className="rounded-xl border border-border bg-background p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-text">{Object.values(variant.options).join(' / ') || variant.sku}</p>
                                      <p className="mt-1 text-xs text-text-tertiary">{variant.sku} • Current {formatCurrency(variant.price)}</p>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                                      <input type="checkbox" checked={draft.useBasePrice} disabled={pricingStrategy === 'shared'} onChange={(event) => updateDraft({ useBasePrice: event.target.checked })} className="h-4 w-4 rounded border-border text-primary" />
                                      Use base price
                                    </label>
                                  </div>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <TextInput label="Selling price" type="number" min="0" step="0.01" value={draft.sellingPrice} disabled={draft.useBasePrice} onChange={(event) => updateDraft({ sellingPrice: event.target.value })} placeholder={baseSellingPrice} />
                                    <TextInput label="Offer price" type="number" min="0" step="0.01" value={draft.offerPrice} onChange={(event) => updateDraft({ offerPrice: event.target.value })} placeholder="Optional" />
                                  </div>
                                  <details className="mt-3 rounded-lg border border-border bg-white px-3 py-2">
                                    <summary className="cursor-pointer text-xs font-medium text-text-secondary">
                                      Advanced pricing: cost and original price
                                    </summary>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <TextInput label="Cost price" type="number" min="0" step="0.01" value={draft.costPrice} onChange={(event) => updateDraft({ costPrice: event.target.value })} placeholder={baseCostPrice || 'Optional'} />
                                      <TextInput label="Compare-at price" type="number" min="0" step="0.01" value={draft.compareAtPrice} onChange={(event) => updateDraft({ compareAtPrice: event.target.value })} placeholder="Optional" />
                                    </div>
                                  </details>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-lg bg-background p-3 text-xs text-text-secondary">Attach variant options to generate combinations. Products without variants use the base price.</p>
                        )}

                        <div className="mt-5 flex justify-end">
                          <Button type="button" onClick={() => updateVariantPricingMutation.mutate()} loading={updateVariantPricingMutation.isPending}>
                            Save Pricing
                          </Button>
                        </div>
                      </div>

                      <div className="order-2 rounded-xl border border-border bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-text">Step 1: Choose the available values</h3>
                            <p className="mt-1 text-xs text-text-secondary">
                              Click values to include or exclude them, then save. Selected values become product variants.
                            </p>
                          </div>
                          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-secondary">
                            {attachedVariantOptions.length} attached
                          </span>
                        </div>

                        <div className="mt-4">
                          {productVariantOptionsQuery.isLoading ? (
                            <div className="rounded-xl border border-border bg-background px-4 py-8 text-center">
                              <ArrowPathIcon className="mx-auto h-10 w-10 animate-spin text-primary/40" />
                              <p className="mt-3 text-sm text-text-secondary">
                                Loading attached variant options...
                              </p>
                            </div>
                          ) : attachedVariantOptions.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              {attachedVariantOptions.map((option) => {
                                const globalOption = variantOptions.find((candidate) => candidate.id === option.id) ?? option
                                const selectedIds = variantValueSelections[option.id] ?? option.values.map((value) => value.id)
                                return (
                                <div
                                  key={option.id}
                                  className="rounded-xl border border-border bg-background p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-text">{option.option_name}</p>
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-tertiary">
                                        {option.option_type}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="text-error hover:bg-error/5"
                                      loading={
                                        detachVariantOptionMutation.isPending &&
                                        detachVariantOptionMutation.variables === option.id
                                      }
                                      onClick={() => {
                                        setVariantActionError(null)
                                        detachVariantOptionMutation.mutate(option.id)
                                      }}
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {globalOption.values.map((value) => (
                                      <label
                                        key={value.id}
                                        className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${selectedIds.includes(value.id) ? 'bg-primary text-white ring-primary' : 'bg-white text-text-secondary ring-border hover:ring-primary'}`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="sr-only"
                                          checked={selectedIds.includes(value.id)}
                                          onChange={() => setVariantValueSelections((current) => ({
                                            ...current,
                                            [option.id]: selectedIds.includes(value.id)
                                              ? selectedIds.filter((id) => id !== value.id)
                                              : [...selectedIds, value.id],
                                          }))}
                                        />
                                        {value.display_value || value.value}
                                      </label>
                                    ))}
                                  </div>
                                  <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-xs text-text-tertiary">{selectedIds.length} of {globalOption.values.length} selected</p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={selectedIds.length === 0}
                                      loading={updateVariantValuesMutation.isPending && updateVariantValuesMutation.variables?.optionId === option.id}
                                      onClick={() => updateVariantValuesMutation.mutate({ optionId: option.id, valueIds: selectedIds })}
                                    >
                                      Update {option.option_name}
                                    </Button>
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center">
                              <TagIcon className="mx-auto h-10 w-10 text-text-tertiary/40" />
                              <p className="mt-3 text-sm text-text-secondary">
                                No variant options are attached yet. Attach an option like Size or
                                Color to let the backend generate variants.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="order-2 rounded-xl border border-border bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-text">Add another option (optional)</h3>
                            <p className="mt-1 text-xs text-text-secondary">
                              Add another choice such as Flavour, Volume, Weight, Colour, or Pack Quantity.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/dashboard/admin/products/variant-options')}
                          >
                            Manage Options
                          </Button>
                        </div>

                        <form onSubmit={onAttachVariantOption} className="mt-4 space-y-4">
                          {variantOptionsQuery.isLoading ? (
                            <div className="rounded-xl border border-border bg-background px-4 py-8 text-center">
                              <ArrowPathIcon className="mx-auto h-10 w-10 animate-spin text-primary/40" />
                              <p className="mt-3 text-sm text-text-secondary">
                                Loading global variant options...
                              </p>
                            </div>
                          ) : variantOptions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center">
                              <TagIcon className="mx-auto h-10 w-10 text-text-tertiary/40" />
                              <p className="mt-3 text-sm text-text-secondary">
                                Create reusable variant options in Product Settings before attaching
                                them to this product.
                              </p>
                              <div className="mt-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => navigate('/dashboard/admin/products/variant-options')}
                                >
                                  Open Product Settings
                                </Button>
                              </div>
                            </div>
                          ) : availableVariantOptions.length === 0 ? (
                            <div className="rounded-xl border border-border bg-background px-4 py-8 text-center">
                              <CheckCircleIcon className="mx-auto h-10 w-10 text-success/70" />
                              <p className="mt-3 text-sm text-text-secondary">
                                All available variant options are already attached to this product.
                              </p>
                            </div>
                          ) : (
                            <>
                              <Select
                                label="Variant Option"
                                value={selectedVariantOptionId}
                                onChange={(event) => {
                                  setSelectedVariantOptionId(String(event.target.value))
                                  setSelectedVariantValueIds([])
                                }}
                                options={[
                                  { label: 'Select a variant option', value: '' },
                                  ...availableVariantOptions.map((option) => ({
                                    label: `${option.option_name} (${option.values.length} value${option.values.length === 1 ? '' : 's'})`,
                                    value: String(option.id)
                                  }))
                                ]}
                                icon={<TagIcon className="h-4 w-4 text-text-tertiary" />}
                              />

                              {selectedVariantOptionId && (() => {
                                const selectedOption = availableVariantOptions.find((option) => String(option.id) === selectedVariantOptionId)
                                if (!selectedOption) return null
                                return (
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-text-secondary">Select the values this product carries</p>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedOption.values.map((value) => (
                                        <label key={value.id} className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${selectedVariantValueIds.includes(value.id) ? 'bg-primary text-white ring-primary' : 'bg-background text-text-secondary ring-border hover:ring-primary'}`}>
                                          <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={selectedVariantValueIds.includes(value.id)}
                                            onChange={() => setSelectedVariantValueIds((current) => current.includes(value.id) ? current.filter((id) => id !== value.id) : [...current, value.id])}
                                          />
                                          {value.display_value || value.value}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()}

                              <div className="flex items-center gap-3">
                                <Button
                                  type="submit"
                                  loading={attachVariantOptionMutation.isPending}
                                  disabled={!selectedVariantOptionId || selectedVariantValueIds.length === 0}
                                >
                                  Add {selectedVariantValueIds.length} Selected Value{selectedVariantValueIds.length === 1 ? '' : 's'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => { setSelectedVariantOptionId(''); setSelectedVariantValueIds([]) }}
                                >
                                  Clear
                                </Button>
                              </div>
                            </>
                          )}
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Product Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Product Stats Card */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <CubeIcon className="h-4 w-4 text-primary" />
                Product Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-tertiary">SKU</span>
                  <span className="text-sm font-mono font-medium">{productQuery.data.sku}</span>
                </div>

                {getProductTags(productQuery.data.tags).length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs text-text-tertiary">Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {getProductTags(productQuery.data.tags).map((tag) => (
                        <span
                          key={`${productQuery.data.id}-${tag}`}
                          className="inline-flex rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-medium text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-tertiary">Price</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(productQuery.data.selling_price || productQuery.data.price)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-tertiary">Variants</span>
                  <span className="text-sm font-medium text-text">
                    {variantCount} total • {activeVariantCount} active
                  </span>
                </div>

                {productQuery.data.is_on_offer && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-tertiary">Offer Price</span>
                    <span className="text-sm font-medium text-success">
                      {formatCurrency((productQuery.data.selling_price || productQuery.data.price) - (productQuery.data.max_offer || 0))}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-text-tertiary">Stock Status</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      productQuery.data.stock_quantity > productQuery.data.reorder_level
                        ? 'bg-success/10 text-success'
                        : productQuery.data.stock_quantity > 0
                        ? 'bg-warning/10 text-warning'
                        : 'bg-error/10 text-error'
                    }`}>
                      {productQuery.data.stock_quantity > productQuery.data.reorder_level
                        ? 'In Stock'
                        : productQuery.data.stock_quantity > 0
                        ? 'Low Stock'
                        : 'Out of Stock'}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        productQuery.data.stock_quantity > productQuery.data.reorder_level
                          ? 'bg-success'
                          : productQuery.data.stock_quantity > 0
                          ? 'bg-warning'
                          : 'bg-error'
                      }`}
                      style={{
                        width: `${Math.min((productQuery.data.stock_quantity / (productQuery.data.reorder_level * 2)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <TagIcon className="h-3 w-3 text-text-tertiary" />
                    <span className="text-text-tertiary">Created:</span>
                    <span className="text-text">{new Date(productQuery.data.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-text mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate('/dashboard/admin/products')}
                >
                  View All Products
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => {
                    // Navigate to create new product
                    navigate('/dashboard/admin/products/new')
                  }}
                >
                  Create New Product
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                  <ExclamationTriangleIcon className="h-8 w-8 text-error" />
                </div>
                <h3 className="text-xl font-bold text-text mb-2">Delete Product?</h3>
                <p className="text-text-secondary mb-4">
                  Are you sure you want to delete <span className="font-semibold text-text">"{productQuery.data?.name}"</span>? 
                  This action cannot be undone and will remove all associated data.
                </p>
                
                <div className="bg-background rounded-lg p-3 mb-6">
                  <p className="text-sm text-text-secondary">
                    SKU: {productQuery.data?.sku}<br />
                    Stock: {productQuery.data?.stock_quantity} units
                  </p>
                </div>

                <div className="bg-background rounded-lg p-3 mb-6 text-left">
                  {deleteProductStockStatusQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <ArrowPathIcon className="h-4 w-4 animate-spin text-primary" />
                      Checking stock across branches before deletion...
                    </div>
                  ) : deleteProductStockStatusQuery.isError ? (
                    <p className="text-sm text-warning">
                      Branch stock preview is unavailable. The server will still verify stock safely
                      when you delete.
                    </p>
                  ) : deleteBlockingStocks.length > 0 ? (
                    <>
                      <p className="text-sm font-medium text-text">
                        This product cannot be deleted because stock still exists in:
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {deleteBlockingStocks.map((stock) => (
                          <span
                            key={`${stock.branch_id ?? 'global'}-${stock.product_id}`}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border"
                          >
                            {(stock.branch_name ?? 'Unknown branch')}: {stock.stock_quantity}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      No branch stock found. This product can be deleted.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      deleteProductMutation.mutate()
                    }}
                    className="flex-1 bg-error text-white hover:bg-error-dark"
                    loading={deleteProductMutation.isPending}
                    disabled={
                      deleteProductStockStatusQuery.isLoading ||
                      deleteBlockingStocks.length > 0
                    }
                  >
                    {deleteBlockingStocks.length > 0 ? 'Stock Exists in Branches' : 'Delete Product'}
                  </Button>
                </div>
                {deleteProductMutation.isError && (
                  <p className="mt-3 rounded-lg bg-error/10 p-3 text-sm text-error">
                    {(deleteProductMutation.error as Error).message || 'Could not delete product.'}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
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

export default ManageProductPage
