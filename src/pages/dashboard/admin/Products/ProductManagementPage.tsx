import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  CubeIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  BanknotesIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, type Column } from '@components/common'
import {
  getStockStatusRequest,
  type ProductStockStatusResponse as InventoryProductStockStatusResponse
} from '@api/modules/inventory.api'
import {
  createBrandRequest,
  createCategoryRequest,
  createProductRequest,
  deleteProductRequest,
  generateProductSkuRequest,
  getProductRequest,
  listCategoriesRequest,
  listBrandsRequest,
  listProductsRequest,
  type GeneratedProductSkuResponse,
  type ProductCreate,
  type ProductResponse,
  type ProductUpdate,
  updateProductPriceRequest,
  uploadProductImagesRequest,
  updateProductRequest
} from '@api/modules/products.api'
import { AppTheme, withOpacity } from '@constants/theme'
import { resolveMediaUrl, resolveMediaUrls } from '@utils/media'

type ProductFormState = {
  sku: string
  name: string
  description: string
  tags: string
  categoryId: string
  brandId: string
  stockQuantity: string
  reorderLevel: string
  sellingPrice: string
  costPrice: string
  compareAtPrice: string
  isActive: boolean
  isOnOffer: boolean
  maxOffer: string
  imageFiles: File[]
}

const EMPTY_FORM: ProductFormState = {
  sku: '',
  name: '',
  description: '',
  tags: '',
  categoryId: '',
  brandId: '',
  stockQuantity: '0',
  reorderLevel: '5',
  sellingPrice: '0',
  costPrice: '',
  compareAtPrice: '',
  isActive: true,
  isOnOffer: false,
  maxOffer: '0',
  imageFiles: []
}

const ALL_CATEGORIES = 'all'

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const getBasePrice = (product: ProductResponse): number => product.selling_price ?? product.price

const getOfferPrice = (price: number, isOnOffer?: boolean, maxOffer?: number): number =>
  isOnOffer ? Math.max(price - (maxOffer ?? 0), 0) : price

const getProductTags = (tags?: string | null): string[] =>
  (tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

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

const editDistance = (left: string, right: string) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length]
}

const findClosestName = <T,>(input: string, items: T[], getName: (item: T) => string): T | undefined => {
  const normalizedInput = input.trim().toLocaleLowerCase()
  if (!normalizedInput) return undefined
  const exact = items.find((item) => getName(item).trim().toLocaleLowerCase() === normalizedInput)
  if (exact) return exact

  return items
    .map((item) => {
      const candidate = getName(item).trim().toLocaleLowerCase()
      return { item, candidate, distance: editDistance(normalizedInput, candidate) }
    })
    .filter(({ candidate, distance }) =>
      candidate[0] === normalizedInput[0]
      && Math.abs(candidate.length - normalizedInput.length) <= 2
      && distance <= Math.max(1, Math.floor(Math.max(candidate.length, normalizedInput.length) * 0.25))
    )
    .sort((left, right) => left.distance - right.distance)[0]?.item
}

type PendingImagePreview = {
  file: File
  previewUrl: string
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

const ProductManagementPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [pricingProduct, setPricingProduct] = useState<ProductResponse | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<ProductResponse | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [priceError, setPriceError] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest
  })

  const brandsQuery = useQuery({
    queryKey: ['products', 'brands'],
    queryFn: listBrandsRequest
  })

  const selectedCreateCategoryId = useMemo(() => {
    if (editingProductId) {
      return undefined
    }

    if (!form.categoryId) {
      return undefined
    }

    const parsedCategoryId = Number(form.categoryId)
    return Number.isFinite(parsedCategoryId) ? parsedCategoryId : undefined
  }, [editingProductId, form.categoryId])

  const generatedSkuQuery = useQuery({
    queryKey: ['products', 'sku-generate', selectedCreateCategoryId],
    queryFn: () => generateProductSkuRequest(selectedCreateCategoryId as number),
    enabled: selectedCreateCategoryId !== undefined
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'list', search, categoryFilter, inStockOnly],
    queryFn: () =>
      listProductsRequest({
        limit: 100,
        search: search.trim() || undefined,
        category_id:
          categoryFilter !== ALL_CATEGORIES && categoryFilter !== ''
            ? Number(categoryFilter)
            : undefined,
        in_stock_only: inStockOnly || undefined
      })
  })

  const productSuggestionsQuery = useQuery({
    queryKey: ['products', 'name-suggestions'],
    queryFn: () => listProductsRequest({ limit: 100 }),
    enabled: showProductForm
  })

  const deleteProductStockStatusQuery = useQuery({
    queryKey: ['inventory', 'stock-status', 'delete-product', deleteCandidate?.id ?? null],
    queryFn: () =>
      getStockStatusRequest({
        product_id: deleteCandidate?.id,
        limit: 300
      }),
    enabled: Boolean(deleteCandidate?.id)
  })

  const saveProductMutation = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const isEditing = Boolean(editingProductId)
      const stockQuantity = Number(payload.stockQuantity)
      const reorderLevel = Number(payload.reorderLevel)
      const maxOffer = Number(payload.maxOffer)
      const sellingPrice = Number(payload.sellingPrice)
      const costPrice = payload.costPrice === '' ? null : Number(payload.costPrice)
      const compareAtPrice = payload.compareAtPrice === '' ? null : Number(payload.compareAtPrice)
      const tags = payload.tags.trim()

      const categoryInput = payload.categoryId.trim()
      const categories = categoriesQuery.data ?? []
      const selectedCategory = categories.find((category) => String(category.id) === categoryInput)
        ?? findClosestName(categoryInput, categories, (category) => category.name)
      const category = selectedCategory
        ?? (categoryInput ? await createCategoryRequest({ name: categoryInput }) : undefined)
      const categoryId = category?.id

      const brandInput = payload.brandId.trim()
      const brands = brandsQuery.data ?? []
      const selectedBrand = brands.find((brand) => String(brand.id) === brandInput)
        ?? findClosestName(brandInput, brands, (brand) => brand.name)
      const brand = selectedBrand
        ?? (brandInput ? await createBrandRequest({ name: brandInput, country_of_origin: 'Kenya' }) : undefined)
      const brandId = brand?.id
      const productName = findClosestName(
        payload.name,
        productSuggestionsQuery.data ?? [],
        (product) => product.name
      )?.name ?? payload.name.trim()

      if (!editingProductId && !categoryId) throw new Error('Enter or select a category.')
      if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
        throw new Error('Stock quantity must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
        throw new Error('Reorder level must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(maxOffer) || maxOffer < 0) {
        throw new Error('Max offer must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(sellingPrice) || sellingPrice < 0) throw new Error('Selling price must be zero or greater.')
      if (costPrice !== null && (Number.isNaN(costPrice) || costPrice < 0)) throw new Error('Cost price must be zero or greater.')
      if (compareAtPrice !== null && compareAtPrice < sellingPrice) throw new Error('Compare-at price cannot be below the selling price.')

      if (editingProductId) {
        const updatePayload: ProductUpdate = {
          name: productName,
          description: payload.description.trim() || undefined,
          tags: tags || undefined,
          category_id: categoryId,
          brand_id: brandId,
          stock_quantity: stockQuantity,
          reorder_level: reorderLevel,
          selling_price: sellingPrice,
          cost_price: costPrice,
          compare_at_price: compareAtPrice,
          currency_code: 'KES',
          is_active: payload.isActive,
          is_on_offer: payload.isOnOffer,
          max_offer: payload.isOnOffer ? maxOffer : 0
        }
        await updateProductRequest(editingProductId, updatePayload)
        await uploadProductImagesRequest(editingProductId, payload.imageFiles)
        const product = await getProductRequest(editingProductId)
        return { product, isEditing }
      }

      const createPayload: ProductCreate = {
        sku: payload.sku.trim() || (await generateProductSkuRequest(categoryId as number)).suggested_sku,
        name: productName,
        description: payload.description.trim() || undefined,
        tags: tags || undefined,
        category_id: categoryId,
        brand_id: brandId,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        selling_price: sellingPrice,
        cost_price: costPrice,
        compare_at_price: compareAtPrice,
        currency_code: 'KES',
        pricing_strategy: 'shared',
        is_active: payload.isActive,
        is_on_offer: payload.isOnOffer,
        max_offer: payload.isOnOffer ? maxOffer : 0
      }

      const createdProduct = await createProductRequest(createPayload)
      await uploadProductImagesRequest(createdProduct.id, payload.imageFiles)
      const product = await getProductRequest(createdProduct.id)
      return { product, isEditing }
    },
    onSuccess: async () => {
      setForm(EMPTY_FORM)
      setEditingProductId(null)
      setShowProductForm(false)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not save product.')
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => deleteProductRequest(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      setDeleteCandidate(null)
    }
  })

  const updatePriceMutation = useMutation({
    mutationFn: async ({ productId, sellingPrice }: { productId: number; sellingPrice: number }) =>
      updateProductPriceRequest(productId, { selling_price: sellingPrice }),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      setSelectedProduct((current) => (current?.id === updatedProduct.id ? updatedProduct : current))
      setPricingProduct((current) => (current?.id === updatedProduct.id ? updatedProduct : current))
      setPriceValue('')
      setPriceError(null)
      setPricingProduct(null)
    },
    onError: (error: Error) => {
      setPriceError(error.message || 'Could not update product price.')
    }
  })

  const categoryOptions = useMemo(
    () => [
      { label: 'All categories', value: ALL_CATEGORIES },
      ...(categoriesQuery.data ?? []).map((category) => ({
        label: category.name,
        value: String(category.id)
      }))
    ],
    [categoriesQuery.data]
  )

  const productFormCategoryOptions = useMemo(
    () => [
      { label: editingProductId ? 'No category' : 'Select category', value: '' },
      ...(categoriesQuery.data ?? []).map((category) => ({
        label: category.name,
        value: String(category.id)
      }))
    ],
    [categoriesQuery.data, editingProductId]
  )

  const brandOptions = useMemo(
    () => [
      { label: 'No brand / unbranded', value: '' },
      ...(brandsQuery.data ?? []).map((brand) => ({ label: brand.name, value: String(brand.id) }))
    ],
    [brandsQuery.data]
  )

  const editingProduct = useMemo(
    () => (productsQuery.data ?? []).find((product) => product.id === editingProductId),
    [editingProductId, productsQuery.data]
  )

  const pendingImagePreviews = useMemo<PendingImagePreview[]>(
    () =>
      form.imageFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      })),
    [form.imageFiles]
  )

  const generatedSkuMeta = useMemo<GeneratedProductSkuResponse | null>(
    () => generatedSkuQuery.data ?? null,
    [generatedSkuQuery.data]
  )

  useEffect(
    () => () => {
      pendingImagePreviews.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    },
    [pendingImagePreviews]
  )

  useEffect(() => {
    if (editingProductId || !generatedSkuMeta?.suggested_sku) {
      return
    }

    setForm((previous) => {
      if (previous.sku === generatedSkuMeta.suggested_sku) {
        return previous
      }

      return {
        ...previous,
        sku: generatedSkuMeta.suggested_sku
      }
    })
  }, [editingProductId, generatedSkuMeta])

  const openPriceModal = (product: ProductResponse) => {
    setPricingProduct(product)
    setPriceValue(String(getBasePrice(product)))
    setPriceError(null)
  }

  const deleteBlockingStocks = useMemo(
    () => getBlockingStockStatuses(deleteProductStockStatusQuery.data ?? []),
    [deleteProductStockStatusQuery.data]
  )

  const columns: Column<ProductResponse>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            {row.image_urls?.[0] ? (
              <img 
                src={resolveMediaUrl(row.image_urls[0]) ?? row.image_urls[0]} 
                alt={row.name} 
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <CubeIcon className="h-5 w-5 text-primary/50" />
            )}
          </div>
          <div>
            <p className="font-medium text-text">{row.name}</p>
            <p className="text-xs text-text-tertiary">SKU: {row.sku}</p>
            <p className="text-xs text-text-tertiary">
              Variants: {row.variants?.length ?? 0}
            </p>
            {getProductTags(row.tags).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {getProductTags(row.tags).slice(0, 3).map((tag) => (
                  <span
                    key={`${row.id}-${tag}`}
                    className="inline-flex rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
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
              row.stock_quantity <= row.reorder_level 
                ? 'text-warning' 
                : 'text-success'
            }`}>
              {row.stock_quantity}
            </span>
            <span className="text-xs text-text-tertiary">/ {row.reorder_level}</span>
          </div>
          <div className="w-20 h-1.5 bg-background rounded-full mt-1">
            <div 
              className={`h-full rounded-full ${
                row.stock_quantity <= row.reorder_level 
                  ? 'bg-warning' 
                  : 'bg-success'
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
      key: 'price',
      header: 'Pricing',
      render: (row) => (
        <div className="text-right">
          {row.is_on_offer && (
            <p className="text-xs text-text-tertiary line-through">
              {formatCurrency(getBasePrice(row))}
            </p>
          )}
          <p className="text-sm font-bold text-primary">
            {formatCurrency(getOfferPrice(getBasePrice(row), row.is_on_offer, row.max_offer))}
          </p>
        </div>
      ),
      align: 'right'
    },
    {
      key: 'is_on_offer',
      header: 'Offer',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.is_on_offer
              ? 'bg-warning/10 text-warning'
              : 'bg-background text-text-tertiary'
          }`}
        >
          {row.is_on_offer ? (
            <>
              <SparklesIcon className="h-3 w-3" />
              {formatCurrency(row.max_offer ?? 0)} off
            </>
          ) : (
            'No offer'
          )}
        </span>
      ),
      align: 'center'
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.is_active
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {row.is_active ? (
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
      ),
      align: 'center'
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            onClick={() => setSelectedProduct(row)}
            title="View details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            onClick={() => openPriceModal(row)}
            title="Update price"
          >
            <BanknotesIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            onClick={() => navigate(`/dashboard/admin/products/${row.id}`)}
            title="Manage product"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
            onClick={() => setDeleteCandidate(row)}
            title="Delete product"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  const onSubmitProduct = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    saveProductMutation.mutate(form)
  }

  const onSubmitPriceUpdate = (event: FormEvent) => {
    event.preventDefault()

    if (!pricingProduct) {
      return
    }

    const nextPrice = Number(priceValue)

    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      setPriceError('Price must be a number greater than or equal to 0.')
      return
    }

    setPriceError(null)
    updatePriceMutation.mutate({
      productId: pricingProduct.id,
      sellingPrice: nextPrice
    })
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
              <CubeIcon className="h-6 w-6 text-primary" />
              Product Management
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage your product catalog, stock levels, and categories
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditingProductId(null)
                setForm(EMPTY_FORM)
                setFormError(null)
                setShowProductForm(true)
              }}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Product
            </Button>
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
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or tags..."
                className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg 
                         focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 
                         transition-all text-sm"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            </div>

            {/* Category Filter */}
            <div className="w-full lg:w-48">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(String(e.target.value))}
                className="h-10"
              />
            </div>

            {/* In Stock Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-text-secondary">In stock only</span>
            </label>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                showFilters 
                  ? 'bg-primary text-white border-primary' 
                  : 'border-border text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              <span className="text-sm">Advanced Filters</span>
              {showFilters ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-border"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Price Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Stock Status
                    </label>
                    <Select options={['All', 'Low Stock', 'Out of Stock'].map((label) => ({ label, value: label }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Offer Status
                    </label>
                    <Select options={['All', 'On Offer', 'Not on Offer'].map((label) => ({ label, value: label }))} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Product Form */}
      <AnimatePresence>
        {showProductForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saveProductMutation.isPending) {
                setShowProductForm(false)
                setEditingProductId(null)
                setForm(EMPTY_FORM)
                setFormError(null)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white px-6 py-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
                    <CubeIcon className="h-5 w-5 text-primary" />
                    {editingProductId ? 'Edit Product' : 'Add Product'}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">Enter the product details, stock information, and images.</p>
                </div>
                <button
                  type="button"
                  disabled={saveProductMutation.isPending}
                  onClick={() => {
                    setShowProductForm(false)
                    setEditingProductId(null)
                    setForm(EMPTY_FORM)
                    setFormError(null)
                  }}
                  className="rounded-lg p-2 text-text-secondary hover:bg-background hover:text-text disabled:opacity-50"
                  aria-label="Close product form"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={onSubmitProduct} className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Select
                    label="Category"
                    options={productFormCategoryOptions}
                    value={form.categoryId}
                    allowCustomValue
                    customValueLabel={(value) => `Create category “${value}”`}
                    helperText="Search existing categories or type a new category name. Close typos reuse the existing category."
                    onChange={(e) => {
                      const nextCategoryId = String(e.target.value)
                      setForm((previous) => ({
                        ...previous,
                        categoryId: nextCategoryId,
                        sku: editingProductId ? previous.sku : ''
                      }))
                    }}
                    required={!editingProductId}
                  />
                  <Select
                    label="Brand"
                    options={brandOptions}
                    value={form.brandId}
                    allowCustomValue
                    customValueLabel={(value) => `Create brand “${value}”`}
                    helperText="Search existing brands or type a new brand name. Close typos reuse the existing brand."
                    onChange={(e) => setForm({ ...form, brandId: String(e.target.value) })}
                  />
                  {!editingProductId ? (
                    <TextInput
                      label="SKU"
                      value={form.sku}
                      readOnly
                      required
                      placeholder={
                        form.categoryId
                          ? selectedCreateCategoryId && generatedSkuQuery.isLoading
                            ? 'Generating SKU...'
                            : selectedCreateCategoryId
                              ? 'SKU will be generated'
                              : 'SKU will be generated when saved'
                          : 'Select category first'
                      }
                      helperText={
                        form.categoryId
                          ? selectedCreateCategoryId && generatedSkuQuery.isError
                            ? 'Could not generate SKU for the selected category.'
                            : generatedSkuMeta
                              ? `${generatedSkuMeta.category_name}: ${generatedSkuMeta.sku_prefix} • next #${generatedSkuMeta.next_sequence}`
                              : 'SKU is generated from the selected category.'
                          : 'Choose a category to generate the next SKU.'
                      }
                    />
                  ) : null}
                  <Select
                    label="Product Name"
                    options={(productSuggestionsQuery.data ?? []).map((product) => ({ label: product.name, value: product.name }))}
                    value={form.name}
                    allowCustomValue
                    customValueLabel={(value) => `Use new product name “${value}”`}
                    onChange={(event) => setForm({ ...form, name: String(event.target.value) })}
                    required
                    helperText="Search existing product names or type a new one. Close spelling mistakes use the existing name."
                  />
                  <TextInput
                    label="Stock Quantity"
                    type="number"
                    min={0}
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                    required
                  />
                  <TextInput
                    label="Reorder Level"
                    type="number"
                    min={0}
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    required
                  />
                  <TextInput
                    label="Base Selling Price (KES)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })}
                    required
                    helperText="Used by every variant unless overridden later."
                  />
                  <TextInput
                    label="Cost Price (Optional)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.costPrice}
                    onChange={(event) => setForm({ ...form, costPrice: event.target.value })}
                    helperText="Internal buying cost for margin reporting."
                  />
                  <TextInput
                    label="Compare-at Price (Optional)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.compareAtPrice}
                    onChange={(event) => setForm({ ...form, compareAtPrice: event.target.value })}
                    helperText="Original/list price displayed before a discount."
                  />
                  <TextInput
                    label="Max Offer Amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.maxOffer}
                    onChange={(e) => setForm({ ...form, maxOffer: e.target.value })}
                    disabled={!form.isOnOffer}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextArea
                    label="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description..."
                    rows={4}
                  />
                  <TextArea
                    label="Tags"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="pillows, bedding, bedroom"
                    helperText="Comma-separated tags stored as one backend string."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-secondary">
                      Upload Images
                    </label>
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    <p className="text-xs text-text-tertiary">
                      {editingProductId
                        ? 'Select images any number of times. New uploads are added to the product.'
                        : 'Select images any number of times. All selected files will be uploaded when you create the product.'}
                    </p>
                    {!editingProductId && (
                      <p className="text-xs text-primary">
                        You can configure prices and variants after creating the product.
                      </p>
                    )}
                    {form.imageFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-text-tertiary">
                          {form.imageFiles.length} file(s) selected
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {pendingImagePreviews.map(({ file, previewUrl }, index) => (
                            <button
                              key={`${file.name}-${file.lastModified}-${index}`}
                              type="button"
                              className="group relative overflow-hidden rounded-xl border border-border bg-background text-left"
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
                              <span className="max-w-[160px] truncate">{file.name}</span>
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
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isOnOffer}
                        onChange={(e) => setForm({ ...form, isOnOffer: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">Product is on offer</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">Product is active</span>
                    </label>
                  </div>
                </div>

                {editingProduct && (
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-secondary">
                      Current price: <span className="font-medium text-text">{formatCurrency(editingProduct.price)}</span>
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Images: <span className="font-medium text-text">{(editingProduct.image_urls ?? []).length}</span>
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                  {formError && (
                    <span className="mr-auto rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{formError}</span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveProductMutation.isPending}
                    onClick={() => {
                      setShowProductForm(false)
                      setEditingProductId(null)
                      setForm(EMPTY_FORM)
                      setFormError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={saveProductMutation.isPending}>
                    {editingProductId ? 'Update Product' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <CubeIcon className="h-4 w-4 text-primary" />
              Product Catalog
            </h2>
            {productsQuery.isFetching && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>

          {productsQuery.isError ? (
            <div className="p-8 text-center">
              <XCircleIcon className="h-12 w-12 mx-auto text-error/30 mb-3" />
              <p className="text-sm text-error">Could not load products from API.</p>
              <Button
                variant="outline"
                onClick={() => productsQuery.refetch()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={productsQuery.data ?? []}
              getRowKey={(row) => row.id}
              emptyState={
                productsQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                    <p className="text-sm text-text-secondary">Loading products...</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <CubeIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                    <p className="text-sm text-text-secondary">No products found</p>
                    <p className="text-xs text-text-tertiary mt-1">Try adjusting your filters</p>
                  </div>
                )
              }
            />
          )}
        </div>

        {/* Summary Stats */}
        {productsQuery.data && productsQuery.data.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-border p-3">
              <p className="text-xs text-text-tertiary">Total Products</p>
              <p className="text-xl font-bold text-primary">{productsQuery.data.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-border p-3">
              <p className="text-xs text-text-tertiary">In Stock</p>
              <p className="text-xl font-bold text-success">
                {productsQuery.data.filter(p => p.stock_quantity > 0).length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-border p-3">
              <p className="text-xs text-text-tertiary">On Offer</p>
              <p className="text-xl font-bold text-warning">
                {productsQuery.data.filter(p => p.is_on_offer).length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-border p-3">
              <p className="text-xs text-text-tertiary">Categories</p>
              <p className="text-xl font-bold text-accent">
                {new Set(productsQuery.data.map(p => p.category_id)).size}
              </p>
            </div>
          </div>
        )}
      </motion.section>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-border p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Product Details
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-text">{selectedProduct.name}</h2>
                  <p className="mt-1 text-sm text-text-tertiary">SKU: {selectedProduct.sku}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-background hover:text-text"
                  onClick={() => setSelectedProduct(null)}
                  title="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Description</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {selectedProduct.description?.trim() || 'No description provided for this product yet.'}
                    </p>
                  </div>

                  {getProductTags(selectedProduct.tags).length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-text">Tags</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getProductTags(selectedProduct.tags).map((tag) => (
                          <span
                            key={`${selectedProduct.id}-${tag}`}
                            className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-text-tertiary">Category</p>
                      <p className="mt-1 font-semibold text-text">
                        {selectedProduct.category_name ?? 'Uncategorized'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-text-tertiary">Status</p>
                      <p className="mt-1 font-semibold text-text">
                        {selectedProduct.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-text-tertiary">Stock</p>
                      <p className="mt-1 font-semibold text-text">
                        {selectedProduct.stock_quantity} units
                      </p>
                      <p className="mt-1 text-xs text-text-tertiary">
                        Reorder level: {selectedProduct.reorder_level}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-text-tertiary">Price</p>
                      <p className="mt-1 font-semibold text-primary">
                        {formatCurrency(getOfferPrice(getBasePrice(selectedProduct), selectedProduct.is_on_offer, selectedProduct.max_offer))}
                      </p>
                      {selectedProduct.is_on_offer ? (
                        <p className="mt-1 text-xs text-text-tertiary">
                          Base: {formatCurrency(getBasePrice(selectedProduct))} • Offer: {formatCurrency(selectedProduct.max_offer ?? 0)} off
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs text-text-tertiary">Variants</p>
                      <p className="mt-1 font-semibold text-text">
                        {selectedProduct.variants?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text">Images</h3>
                    <span className="text-xs text-text-tertiary">
                      {selectedProduct.image_urls?.length ?? 0} image{(selectedProduct.image_urls?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {(resolveMediaUrls(selectedProduct.image_urls ?? [])).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {resolveMediaUrls(selectedProduct.image_urls ?? []).map((imageUrl, index) => (
                        <button
                          key={`${selectedProduct.id}-image-${index}`}
                          type="button"
                          className="overflow-hidden rounded-xl border border-border bg-background text-left"
                          onClick={() => setPreviewImage(imageUrl)}
                        >
                          <img
                            src={imageUrl}
                            alt={`${selectedProduct.name} ${index + 1}`}
                            className="h-36 w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center">
                      <PhotoIcon className="mx-auto h-10 w-10 text-text-tertiary/40" />
                      <p className="mt-3 text-sm text-text-secondary">No images uploaded for this product yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border p-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openPriceModal(selectedProduct)}
                >
                  Update Price
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate(`/dashboard/admin/products/${selectedProduct.id}`)}
                >
                  Manage Product
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Product Modal */}
      <AnimatePresence>
        {deleteCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!deleteProductMutation.isPending) {
                setDeleteCandidate(null)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border bg-gradient-to-r from-error/10 via-white to-warning/10 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 ring-1 ring-error/15">
                    <ExclamationTriangleIcon className="h-7 w-7 text-error" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-error">
                      Delete Product
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-text">Remove this product?</h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      You are about to permanently delete{' '}
                      <span className="font-semibold text-text">{deleteCandidate.name}</span>. This
                      action cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-white/80 hover:text-text"
                    onClick={() => {
                      if (!deleteProductMutation.isPending) {
                        setDeleteCandidate(null)
                      }
                    }}
                    title="Close"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 ring-1 ring-border">
                    {deleteCandidate.image_urls?.[0] ? (
                      <img
                        src={resolveMediaUrl(deleteCandidate.image_urls[0]) ?? deleteCandidate.image_urls[0]}
                        alt={deleteCandidate.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <CubeIcon className="h-8 w-8 text-primary/40" />
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-text-tertiary">SKU</p>
                      <p className="mt-1 font-semibold text-text">{deleteCandidate.sku}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-text-tertiary">Category</p>
                      <p className="mt-1 font-semibold text-text">
                        {deleteCandidate.category_name ?? 'Uncategorized'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-text-tertiary">Stock on Hand</p>
                      <p className="mt-1 font-semibold text-text">{deleteCandidate.stock_quantity}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-text-tertiary">Selling Price</p>
                      <p className="mt-1 font-semibold text-primary">
                        {formatCurrency(getBasePrice(deleteCandidate))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-error/15 bg-error/5 px-4 py-3">
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
                        This product cannot be deleted because it still has stock in these branches:
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
                    <>
                      <p className="text-sm font-medium text-text">This will remove:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border">
                          Product record
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border">
                          Uploaded images
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border">
                          Catalog visibility
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteCandidate(null)}
                  disabled={deleteProductMutation.isPending}
                >
                  Keep Product
                </Button>
                <Button
                  type="button"
                  className="bg-error text-white hover:bg-error-dark"
                  loading={deleteProductMutation.isPending}
                  disabled={
                    deleteProductStockStatusQuery.isLoading ||
                    deleteBlockingStocks.length > 0
                  }
                  onClick={() => deleteProductMutation.mutate(deleteCandidate.id)}
                >
                  {deleteBlockingStocks.length > 0 ? 'Stock Exists in Branches' : 'Delete Permanently'}
                </Button>
              </div>
              {deleteProductMutation.isError && (
                <div className="border-t border-border px-6 py-4">
                  <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
                    {(deleteProductMutation.error as Error).message || 'Could not delete product.'}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price Update Modal */}
      <AnimatePresence>
        {pricingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => {
              if (!updatePriceMutation.isPending) {
                setPricingProduct(null)
                setPriceError(null)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <form onSubmit={onSubmitPriceUpdate}>
                <div className="border-b border-border p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Update Product Price
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-text">{pricingProduct.name}</h2>
                  <p className="mt-1 text-sm text-text-tertiary">SKU: {pricingProduct.sku}</p>
                </div>

                <div className="space-y-5 p-6">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs text-text-tertiary">Current selling price</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      {formatCurrency(getBasePrice(pricingProduct))}
                    </p>
                    {pricingProduct.is_on_offer ? (
                      <p className="mt-1 text-xs text-text-tertiary">
                        Current offer price:{' '}
                        {formatCurrency(
                          getOfferPrice(
                            getBasePrice(pricingProduct),
                            pricingProduct.is_on_offer,
                            pricingProduct.max_offer
                          )
                        )}
                      </p>
                    ) : null}
                  </div>

                  <TextInput
                    label="New Selling Price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceValue}
                    onChange={(event) => setPriceValue(event.target.value)}
                    placeholder="Enter new selling price"
                  />

                  {priceError ? <p className="text-sm text-error">{priceError}</p> : null}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border p-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!updatePriceMutation.isPending) {
                        setPricingProduct(null)
                        setPriceError(null)
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={updatePriceMutation.isPending}>
                    Save Price
                  </Button>
                </div>
              </form>
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

export default ProductManagementPage
