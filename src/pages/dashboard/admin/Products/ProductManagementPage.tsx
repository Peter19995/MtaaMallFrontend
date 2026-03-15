import { FormEvent, useMemo, useState } from 'react'
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
  SparklesIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, type Column } from '@components/common'
import {
  createCategoryRequest,
  createProductRequest,
  deleteProductRequest,
  listCategoriesRequest,
  listProductsRequest,
  type ProductCreate,
  type ProductResponse,
  type ProductUpdate,
  updateProductRequest
} from '@api/modules/products.api'
import { AppTheme, withOpacity } from '@constants/theme'

type ProductFormState = {
  sku: string
  name: string
  description: string
  categoryId: string
  stockQuantity: string
  reorderLevel: string
  isActive: boolean
  isOnOffer: boolean
  maxOffer: string
  imageUrlsText: string
  imageFiles: File[]
}

const EMPTY_FORM: ProductFormState = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  stockQuantity: '0',
  reorderLevel: '5',
  isActive: true,
  isOnOffer: false,
  maxOffer: '0',
  imageUrlsText: '',
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

const getOfferPrice = (price: number, isOnOffer?: boolean, maxOffer?: number): number =>
  isOnOffer ? Math.max(price - (maxOffer ?? 0), 0) : price

const parseImageUrls = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

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
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest
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

  const saveProductMutation = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const stockQuantity = Number(payload.stockQuantity)
      const reorderLevel = Number(payload.reorderLevel)
      const maxOffer = Number(payload.maxOffer)
      const categoryId = payload.categoryId ? Number(payload.categoryId) : undefined
      const imageUrls = parseImageUrls(payload.imageUrlsText)

      if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
        throw new Error('Stock quantity must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
        throw new Error('Reorder level must be a number greater than or equal to 0.')
      }
      if (Number.isNaN(maxOffer) || maxOffer < 0) {
        throw new Error('Max offer must be a number greater than or equal to 0.')
      }

      if (editingProductId) {
        const updatePayload: ProductUpdate = {
          name: payload.name.trim(),
          description: payload.description.trim() || undefined,
          category_id: categoryId,
          stock_quantity: stockQuantity,
          reorder_level: reorderLevel,
          is_active: payload.isActive,
          is_on_offer: payload.isOnOffer,
          max_offer: payload.isOnOffer ? maxOffer : 0,
          image_urls: imageUrls
        }
        return updateProductRequest(editingProductId, updatePayload, payload.imageFiles)
      }

      const createPayload: ProductCreate = {
        sku: payload.sku.trim(),
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        category_id: categoryId,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        is_active: payload.isActive,
        is_on_offer: payload.isOnOffer,
        max_offer: payload.isOnOffer ? maxOffer : 0,
        image_urls: imageUrls
      }

      return createProductRequest(createPayload, payload.imageFiles)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      setForm(EMPTY_FORM)
      setEditingProductId(null)
      setShowProductForm(false)
      setFormError(null)
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not save product.')
    }
  })

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createCategoryRequest({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined
      }),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      setForm((prev) => ({ ...prev, categoryId: String(category.id) }))
      setCategoryName('')
      setCategoryDescription('')
      setShowCategoryForm(false)
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => deleteProductRequest(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
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
      { label: 'No category', value: '' },
      ...(categoriesQuery.data ?? []).map((category) => ({
        label: category.name,
        value: String(category.id)
      }))
    ],
    [categoriesQuery.data]
  )

  const editingProduct = useMemo(
    () => (productsQuery.data ?? []).find((product) => product.id === editingProductId),
    [editingProductId, productsQuery.data]
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
                src={row.image_urls[0]} 
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
              {formatCurrency(row.price)}
            </p>
          )}
          <p className="text-sm font-bold text-primary">
            {formatCurrency(getOfferPrice(row.price, row.is_on_offer, row.max_offer))}
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
            onClick={() => navigate(`/dashboard/admin/products/${row.id}`)}
            title="Manage product"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
            onClick={() => {
              if (window.confirm(`Delete "${row.name}"? This action cannot be undone.`)) {
                deleteProductMutation.mutate(row.id)
              }
            }}
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

  const onSubmitCategory = (event: FormEvent) => {
    event.preventDefault()
    if (!categoryName.trim()) {
      return
    }
    createCategoryMutation.mutate()
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
              variant="outline"
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="flex items-center gap-2"
            >
              <TagIcon className="h-4 w-4" />
              {showCategoryForm ? 'Close Category Form' : 'New Category'}
            </Button>
            <Button
              onClick={() => {
                setEditingProductId(null)
                setForm(EMPTY_FORM)
                setFormError(null)
                setShowProductForm(!showProductForm)
              }}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              {showProductForm ? 'Close Product Form' : 'New Product'}
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
                placeholder="Search by name or SKU..."
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
                    <select className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm">
                      <option>All</option>
                      <option>Low Stock</option>
                      <option>Out of Stock</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Offer Status
                    </label>
                    <select className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm">
                      <option>All</option>
                      <option>On Offer</option>
                      <option>Not on Offer</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Category Form */}
      <AnimatePresence>
        {showCategoryForm && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-primary" />
                Create New Category
              </h2>
              <form onSubmit={onSubmitCategory} className="grid gap-4 md:grid-cols-3">
                <TextInput
                  label="Category Name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  placeholder="e.g., Curtains, Furniture"
                />
                <TextInput
                  label="Description (Optional)"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Brief description of the category"
                />
                <div className="flex items-end gap-2">
                  <Button 
                    type="submit" 
                    loading={createCategoryMutation.isPending}
                    className="flex-1"
                  >
                    Save Category
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCategoryForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Product Form */}
      <AnimatePresence>
        {showProductForm && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                <CubeIcon className="h-4 w-4 text-primary" />
                {editingProductId ? 'Edit Product' : 'Create New Product'}
              </h2>
              <form onSubmit={onSubmitProduct} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {!editingProductId && (
                    <TextInput
                      label="SKU"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      required
                      placeholder="e.g., PRD-001"
                    />
                  )}
                  <TextInput
                    label="Product Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g., Premium Cotton Curtains"
                  />
                  <Select
                    label="Category"
                    options={productFormCategoryOptions}
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: String(e.target.value) })}
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
                    label="Image URLs (One per line)"
                    helperText="Enter image URLs, one per line"
                    value={form.imageUrlsText}
                    onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                        setForm({ ...form, imageFiles: files })
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    {form.imageFiles.length > 0 && (
                      <p className="text-xs text-text-tertiary">
                        {form.imageFiles.length} file(s) selected
                      </p>
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

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" loading={saveProductMutation.isPending}>
                    {editingProductId ? 'Update Product' : 'Create Product'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowProductForm(false)
                      setEditingProductId(null)
                      setForm(EMPTY_FORM)
                      setFormError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  {formError && (
                    <span className="text-xs text-error">{formError}</span>
                  )}
                </div>
              </form>
            </div>
          </motion.section>
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
