import { useAuth } from '@hooks/useAuth'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
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
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
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
  adoptCatalogProductRequest,
  createProductRequest,
  deleteProductRequest,
  generateProductSkuRequest,
  getProductRequest,
  listCategoriesRequest,
  listProductsRequest,
  type GeneratedProductSkuResponse,
  type ProductCreate,
  type ProductResponse,
  type ProductUpdate,
  uploadProductImagesRequest,
  updateProductCatalogueOverridesRequest,
  updateProductRequest
} from '@api/modules/products.api'
import {
  listCatalogProductsRequest,
  searchCatalogProductsRequest,
  type CatalogProductSearchResult,
} from '@api/modules/catalog.api'
import { AppTheme, withOpacity } from '@constants/theme'
import { resolveMediaUrl, resolveMediaUrls } from '@utils/media'

type ProductFormState = {
  sku: string
  name: string
  description: string
  tags: string
  categoryId: string
  stockQuantity: string
  reorderLevel: string
  sellingPrice: string
  isActive: boolean
  isPublished: boolean
  availableOnline: boolean
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
  stockQuantity: '0',
  reorderLevel: '5',
  sellingPrice: '0',
  isActive: true,
  isPublished: false,
  availableOnline: false,
  isOnOffer: false,
  maxOffer: '0',
  imageFiles: []
}

const ALL_CATEGORIES = 'all'
const automaticSku = () => `PRD-${Date.now().toString(36).toUpperCase()}`
const MAX_PRODUCT_IMAGES = 5
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024
const PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const PRODUCT_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export const productImageSelectionError = (files: File[], totalImageCount: number): string | null => {
  if (totalImageCount > MAX_PRODUCT_IMAGES) return `A product can have at most ${MAX_PRODUCT_IMAGES} images.`
  const invalidType = files.find(file => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    return !PRODUCT_IMAGE_TYPES.has(file.type.toLowerCase()) || !PRODUCT_IMAGE_EXTENSIONS.has(extension)
  })
  if (invalidType) return `${invalidType.name} is not supported. Select JPG, PNG, WEBP or GIF images only.`
  const oversized = files.find(file => file.size > MAX_PRODUCT_IMAGE_SIZE)
  if (oversized) return `${oversized.name} is larger than 5 MB.`
  return null
}

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
  const { user, hasPermission } = useAuth()
  const canOperate = !['suspended', 'closed'].includes(user?.business_status ?? '')
  const canCreate = hasPermission('products.create') && canOperate
  const canEdit = hasPermission('products.update') && canOperate
  const canDelete = hasPermission('products.delete') && canOperate
  const storefrontEnabled = Boolean(user?.business_capabilities?.storefront_enabled && user?.business_status === 'active')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [catalogueSearch, setCatalogueSearch] = useState('')
  const [debouncedCatalogueSearch, setDebouncedCatalogueSearch] = useState('')
  const [catalogueSuggestionsOpen, setCatalogueSuggestionsOpen] = useState(false)
  const [selectedCatalogueProduct, setSelectedCatalogueProduct] = useState<CatalogProductSearchResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<ProductResponse | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest
  })

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedCatalogueSearch(catalogueSearch.trim()),
      250
    )
    return () => window.clearTimeout(timer)
  }, [catalogueSearch])

  const catalogueBrowseQuery = useQuery({
    queryKey: ['catalog', 'products', 'product-form'],
    queryFn: () => listCatalogProductsRequest({ limit: 50 }),
    enabled: showProductForm && !editingProductId && debouncedCatalogueSearch.length < 2,
  })

  const catalogueSearchQuery = useQuery({
    queryKey: ['catalog', 'products', 'product-form-search', debouncedCatalogueSearch],
    queryFn: () => searchCatalogProductsRequest({ q: debouncedCatalogueSearch, limit: 20 }),
    enabled: showProductForm && !editingProductId && debouncedCatalogueSearch.length >= 2,
  })

  const catalogueSuggestions = debouncedCatalogueSearch.length >= 2
    ? catalogueSearchQuery.data ?? []
    : catalogueBrowseQuery.data ?? []
  const catalogueSuggestionsLoading = debouncedCatalogueSearch.length >= 2
    ? catalogueSearchQuery.isFetching
    : catalogueBrowseQuery.isFetching

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
      const sellingPrice = Number(payload.sellingPrice)
      const maxOffer = Number(payload.maxOffer)
      const categoryId = payload.categoryId ? Number(payload.categoryId) : undefined
      const tags = payload.tags.trim()
      const sku = payload.sku.trim() || automaticSku()

      if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
        throw new Error('Stock quantity must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
        throw new Error('Reorder level must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
        throw new Error('Selling price must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(maxOffer) || maxOffer < 0) {
        throw new Error('Max offer must be a number greater than or equal to 0.')
      }

      if (editingProductId) {
        const isLinkedListing = editingProduct?.catalogue_link_status === 'linked' && Boolean(editingProduct.catalog_product_public_id)
        const updatePayload: ProductUpdate = {
          ...(isLinkedListing ? {} : {
            name: payload.name.trim(),
            description: payload.description.trim() || undefined,
            category_id: categoryId,
          }),
          tags: tags || undefined,
          stock_quantity: stockQuantity,
          reorder_level: reorderLevel,
          selling_price: sellingPrice,
          is_active: payload.isActive,
          is_published: storefrontEnabled && payload.isPublished,
          available_online: storefrontEnabled && payload.availableOnline,
          is_on_offer: payload.isOnOffer,
          max_offer: payload.isOnOffer ? maxOffer : 0
        }
        await updateProductRequest(editingProductId, updatePayload)
        if (isLinkedListing && editingProduct?.catalog_product_public_id) {
          await updateProductCatalogueOverridesRequest(editingProductId, editingProduct.catalog_product_public_id, {
            description_override: payload.description.trim() || null,
          })
        }
        await uploadProductImagesRequest(editingProductId, payload.imageFiles)
        const product = await getProductRequest(editingProductId)
        return { product, isEditing }
      }

      if (selectedCatalogueProduct) {
        const adopted = await adoptCatalogProductRequest({
          catalog_product_id: selectedCatalogueProduct.public_id,
          business_sku: sku,
          selling_price: String(sellingPrice),
          available_online: storefrontEnabled && payload.availableOnline,
          description_override:
            payload.description.trim() && payload.description.trim() !== selectedCatalogueProduct.description?.trim()
              ? payload.description.trim()
              : null,
        })
        await updateProductRequest(adopted.id, {
          tags: tags || undefined,
          stock_quantity: stockQuantity,
          reorder_level: reorderLevel,
          selling_price: sellingPrice,
          is_active: payload.isActive,
          is_published: storefrontEnabled && payload.isPublished,
          available_online: storefrontEnabled && payload.availableOnline,
          is_on_offer: payload.isOnOffer,
          max_offer: payload.isOnOffer ? maxOffer : 0,
        })
        await uploadProductImagesRequest(adopted.id, payload.imageFiles)
        const product = await getProductRequest(adopted.id)
        return { product, isEditing }
      }

      const createPayload: ProductCreate = {
        sku,
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        tags: tags || undefined,
        category_id: categoryId,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        selling_price: sellingPrice,
        is_active: payload.isActive,
        is_published: storefrontEnabled && payload.isPublished,
        available_online: storefrontEnabled && payload.availableOnline,
        is_on_offer: payload.isOnOffer,
        max_offer: payload.isOnOffer ? maxOffer : 0
      }

      const product = await createProductRequest(createPayload, payload.imageFiles)
      return { product, isEditing }
    },
    onSuccess: ({ product }) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      queryClient.setQueryData(['products', 'details', product.id], product)
      setForm(EMPTY_FORM)
      setEditingProductId(null)
      setShowProductForm(false)
      setSelectedCatalogueProduct(null)
      setCatalogueSearch('')
      setCatalogueSuggestionsOpen(false)
      setFormError(null)

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

  const editingProduct = useMemo(
    () => (productsQuery.data ?? []).find((product) => product.id === editingProductId),
    [editingProductId, productsQuery.data]
  )
  const catalogueFieldsLocked = editingProduct?.catalogue_link_status === 'linked'

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
    if (!canCreate || location.state?.openProductForm !== true) {
      return
    }

    setEditingProductId(null)
    setForm({ ...EMPTY_FORM, sku: automaticSku() })
    setSelectedCatalogueProduct(null)
    setCatalogueSearch('')
    setCatalogueSuggestionsOpen(false)
    setFormError(null)
    setShowProductForm(true)
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.state, navigate, canCreate])

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

  const closeProductForm = () => {
    setShowProductForm(false)
    setEditingProductId(null)
    setForm(EMPTY_FORM)
    setSelectedCatalogueProduct(null)
    setCatalogueSearch('')
    setCatalogueSuggestionsOpen(false)
    setFormError(null)
  }

  const openCreateProduct = () => {
    setEditingProductId(null)
    setForm({ ...EMPTY_FORM, sku: automaticSku() })
    setSelectedCatalogueProduct(null)
    setCatalogueSearch('')
    setCatalogueSuggestionsOpen(true)
    setFormError(null)
    setShowProductForm(true)
  }

  const selectCatalogueProduct = (product: CatalogProductSearchResult) => {
    const matchingCategory = (categoriesQuery.data ?? []).find(
      category => category.name.trim().toLocaleLowerCase() === product.category?.trim().toLocaleLowerCase()
    )
    setSelectedCatalogueProduct(product)
    setCatalogueSearch(product.name)
    setCatalogueSuggestionsOpen(false)
    setForm(previous => ({
      ...previous,
      name: product.name,
      description: product.description ?? '',
      categoryId: matchingCategory ? String(matchingCategory.id) : '',
      sku: matchingCategory ? '' : `CAT-${product.public_id.slice(0, 8).toUpperCase()}`,
    }))
  }

  const openEditProduct = (product: ProductResponse) => {
    setSelectedCatalogueProduct(null)
    setCatalogueSearch('')
    setCatalogueSuggestionsOpen(false)
    setEditingProductId(product.id)
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.catalogue_link_status === 'linked'
        ? product.description_override ?? ''
        : product.description ?? '',
      tags: product.tags ?? '',
      categoryId: product.category_id ? String(product.category_id) : '',
      stockQuantity: String(product.stock_quantity),
      reorderLevel: String(product.reorder_level),
      sellingPrice: String(getBasePrice(product)),
      isActive: product.is_active,
      isPublished: Boolean(product.is_published),
      availableOnline: Boolean(product.available_online),
      isOnOffer: Boolean(product.is_on_offer),
      maxOffer: String(product.max_offer ?? 0),
      imageFiles: []
    })
    setFormError(null)
    setShowProductForm(true)
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
      header: 'Business price',
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
      key: 'is_published',
      header: 'Publication',
      render: (row) => (
        <div className="space-y-1">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${row.is_published ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary'}`}>
            {row.is_published ? 'Published' : 'Not published'}
          </span>
          <p className="text-xs text-text-tertiary">{row.available_online ? 'Online enabled' : 'POS only'}</p>
        </div>
      ),
      align: 'center'
    },
    {
      key: 'catalogue_link_status',
      header: 'Catalogue link',
      render: (row) => (
        <div className="space-y-1">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${row.catalogue_link_status === 'linked' ? 'bg-primary/10 text-primary-dark' : row.catalogue_link_status === 'private' ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'}`}>
            {(row.catalogue_link_status ?? 'unlinked').replace(/_/g, ' ')}
          </span>
          <p className={`text-xs ${row.is_active ? 'text-success' : 'text-error'}`}>{row.is_active ? 'Active listing' : 'Inactive listing'}</p>
        </div>
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
          {canEdit && <button
            type="button"
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            onClick={() => openEditProduct(row)}
            title="Edit product"
          >
            <PencilIcon className="h-4 w-4" />
          </button>}
          {canDelete && <button
            type="button"
            className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
            onClick={() => setDeleteCandidate(row)}
            title="Delete product"
          >
            <TrashIcon className="h-4 w-4" />
          </button>}
        </div>
      )
    }
  ]

  const onSubmitProduct = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    saveProductMutation.mutate(form)
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
              View, add and update the products sold by your business
            </p>
          </div>
          
          {canCreate && <div className="flex gap-2">
            <Button
              onClick={openCreateProduct}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add product
            </Button>
          </div>}
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
                    <Select className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm">
                      <option>All</option>
                      <option>Low Stock</option>
                      <option>Out of Stock</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Offer Status
                    </label>
                    <Select className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm">
                      <option>All</option>
                      <option>On Offer</option>
                      <option>Not on Offer</option>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Product Form */}
      <AnimatePresence>
        {(canCreate || canEdit) && showProductForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saveProductMutation.isPending) closeProductForm()
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-form-title"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">{editingProductId ? 'Update item' : 'New item'}</p><h2 id="product-form-title" className="mt-1 flex items-center gap-2 text-xl font-bold text-text"><CubeIcon className="h-5 w-5 text-primary" />{editingProductId ? 'Edit product' : 'Add product'}</h2></div>
                <button type="button" aria-label="Close product form" onClick={closeProductForm} className="rounded-lg p-2 text-text-tertiary transition hover:bg-background hover:text-text"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <form onSubmit={onSubmitProduct} className="space-y-4">
                {editingProductId && <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-primary-dark">Catalogue information</p><p className="mt-1 font-bold text-text">Shared across MtaaMall</p><p className="mt-1 text-xs text-text-secondary">{catalogueFieldsLocked ? 'Name and category come from the approved catalogue and cannot be edited by this business.' : 'This private listing is not yet linked to an approved catalogue product.'}</p></div><div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-secondary">Your listing</p><p className="mt-1 font-bold text-text">Visible and editable only by this business</p><p className="mt-1 text-xs text-text-secondary">Price, stock, publication, tags, offers and business overrides remain editable.</p></div></div>}
                {!editingProductId ? <div className="relative">
                  <label htmlFor="product-name" className="mb-1.5 block text-sm font-medium text-text">
                    Product name <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                    <input
                      id="product-name"
                      value={form.name}
                      onFocus={() => setCatalogueSuggestionsOpen(true)}
                      onBlur={() => window.setTimeout(() => setCatalogueSuggestionsOpen(false), 100)}
                      onChange={event => {
                        const name = event.target.value
                        setForm(previous => ({ ...previous, name }))
                        setCatalogueSearch(name)
                        if (selectedCatalogueProduct?.name !== name) setSelectedCatalogueProduct(null)
                        setCatalogueSuggestionsOpen(true)
                      }}
                      required
                      autoComplete="off"
                      placeholder="Start typing a product name"
                      className="h-11 w-full rounded-xl border border-border bg-background py-2 pl-10 pr-10 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    {catalogueSuggestionsLoading && <ArrowPathIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
                  </div>
                  <p className="mt-1.5 text-xs text-text-tertiary">Choose a suggestion to reuse its approved details, or keep typing to create a private product.</p>
                  {catalogueSuggestionsOpen && <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-xl">
                    {catalogueSuggestionsLoading ? <p className="px-4 py-3 text-sm text-text-secondary">Loading products...</p> : catalogueSuggestions.length > 0 ? catalogueSuggestions.map(product => <button
                      key={product.public_id}
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => selectCatalogueProduct(product)}
                      className="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-3 text-left transition hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                    >
                      <span><strong className="block text-sm text-text">{product.name}</strong><span className="mt-0.5 block text-xs text-text-secondary">{[product.brand, product.package_quantity && product.package_unit ? `${product.package_quantity} ${product.package_unit}` : null, product.category].filter(Boolean).join(' · ') || 'Approved catalogue product'}</span></span>
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">Select</span>
                    </button>) : <div className="px-4 py-3"><p className="text-sm font-medium text-text">No shared product found</p><p className="mt-1 text-xs text-text-secondary">Continue filling the form to create this as a private product.</p></div>}
                  </div>}
                  {selectedCatalogueProduct && <div className="mt-3 flex items-center justify-between rounded-xl border border-success/20 bg-success/5 px-4 py-3"><div><p className="text-sm font-semibold text-text">Using {selectedCatalogueProduct.name}</p><p className="text-xs text-text-secondary">Approved shared details will be used. Your price and stock remain private.</p></div><button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => { setSelectedCatalogueProduct(null); setCatalogueSuggestionsOpen(true) }}>Change</button></div>}
                </div> : <TextInput
                  label="Product name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={catalogueFieldsLocked}
                />}

                <div className="grid gap-4 md:grid-cols-3">
                  <Select
                    label="Category (optional)"
                    options={productFormCategoryOptions}
                    value={form.categoryId}
                    onChange={(e) => {
                      const nextCategoryId = String(e.target.value)
                      setForm((previous) => ({
                        ...previous,
                        categoryId: nextCategoryId,
                        sku: editingProductId ? previous.sku : ''
                      }))
                    }}
                    disabled={catalogueFieldsLocked}
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
                    label="Selling Price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    required
                  />
                </div>

                <details className="rounded-xl border border-border bg-background/60 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-text">More product details</summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextInput label="Reorder level" type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
                  <TextInput label="Maximum offer amount" type="number" min={0} step="0.01" value={form.maxOffer} onChange={(e) => setForm({ ...form, maxOffer: e.target.value })} disabled={!form.isOnOffer} />
                  <TextArea
                    label={catalogueFieldsLocked ? 'Your description override' : 'Description'}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description..."
                    rows={4}
                  />

                <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                  <TextArea
                    label="Tags"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="pillows, bedding, bedroom"
                    helperText="Comma-separated tags stored as one backend string."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:col-span-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <label htmlFor="product-images" className="block text-xs font-medium text-text-secondary">
                      Upload Images
                    </label>
                    <input
                      id="product-images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        const mergedFiles = mergeImageFiles(form.imageFiles, files)
                        const existingImageCount = editingProduct?.image_urls?.length ?? 0
                        const selectionError = productImageSelectionError(
                          files,
                          existingImageCount + mergedFiles.length
                        )
                        if (selectionError) {
                          setFormError(selectionError)
                        } else {
                          setForm(previous => ({ ...previous, imageFiles: mergedFiles }))
                          setFormError(null)
                        }
                        e.target.value = ''
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    <p className="text-xs text-text-tertiary">
                      JPG, PNG, WEBP or GIF only. Maximum 5 images per product and 5 MB per image.
                    </p>
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
                      <input type="checkbox" disabled={!storefrontEnabled} checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                      <span className="text-sm text-text-secondary">Published to marketplace</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" disabled={!storefrontEnabled} checked={form.availableOnline} onChange={(e) => setForm({ ...form, availableOnline: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                      <span className="text-sm text-text-secondary">Available for online orders</span>
                    </label>
                    {storefrontEnabled ? <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isOnOffer}
                        onChange={(e) => setForm({ ...form, isOnOffer: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">Product is on offer</span>
                    </label> : <span className="text-sm text-text-tertiary">Storefront publication is unavailable; this product remains a catalogue draft.</span>}
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
                  </div>
                </details>

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

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" loading={saveProductMutation.isPending}>
                    {editingProductId ? 'Update Product' : 'Create Product'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeProductForm}
                  >
                    Cancel
                  </Button>
                  {formError && (
                    <span className="text-xs text-error">{formError}</span>
                  )}
                </div>
              </form>
            </motion.section>
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
                {canEdit && <Button
                  type="button"
                  onClick={() => {
                    const product = selectedProduct
                    setSelectedProduct(null)
                    openEditProduct(product)
                  }}
                >
                  Edit product
                </Button>}
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
                    <p className="text-sm text-error">
                      Could not verify stock across branches. Deletion is disabled until stock
                      status can be checked.
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
                    deleteProductStockStatusQuery.isError ||
                    deleteBlockingStocks.length > 0
                  }
                  onClick={() => deleteProductMutation.mutate(deleteCandidate.id)}
                >
                  {deleteBlockingStocks.length > 0 ? 'Stock Exists in Branches' : 'Delete Permanently'}
                </Button>
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

export default ProductManagementPage
