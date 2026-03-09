import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    maximumFractionDigits: 2
  }).format(amount)

const getOfferPrice = (price: number, isOnOffer?: boolean, maxOffer?: number): number =>
  isOnOffer ? Math.max(price - (maxOffer ?? 0), 0) : price

const parseImageUrls = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const ProductManagementPage = () => {
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
        <div>
          <p className="font-medium text-text">{row.name}</p>
          <p className="text-[11px] text-text-tertiary">SKU: {row.sku}</p>
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row) => row.category_name ?? 'Uncategorized'
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (row) => (
        <div>
          <p className={row.stock_quantity <= row.reorder_level ? 'text-warning-dark' : 'text-text-secondary'}>
            {row.stock_quantity}
          </p>
          <p className="text-[11px] text-text-tertiary">Reorder: {row.reorder_level}</p>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Pricing',
      render: (row) => (
        <div className="text-right">
          <p className={row.is_on_offer ? 'text-[11px] text-text-tertiary line-through' : 'text-text-secondary'}>
            {formatCurrency(row.price)}
          </p>
          <p className="font-medium text-text">
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
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            row.is_on_offer
              ? 'bg-warning-light text-warning-dark'
              : 'bg-divider text-text-tertiary'
          }`}
        >
          {row.is_on_offer
            ? `On offer (${formatCurrency(row.max_offer ?? 0)} off)`
            : 'No offer'}
        </span>
      ),
      align: 'center'
    },
    {
      key: 'image_urls',
      header: 'Images',
      render: (row) => {
        const images = row.image_urls ?? []
        if (images.length === 0) {
          return <span className="text-[11px] text-text-tertiary">None</span>
        }
        return (
          <div className="flex items-center gap-2">
            <img src={images[0]} alt={row.name} className="h-8 w-8 rounded object-cover" />
            <span className="text-[11px] text-text-secondary">{images.length} image(s)</span>
          </div>
        )
      }
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            row.is_active
              ? 'bg-success-light text-success-dark'
              : 'bg-divider text-text-tertiary'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      align: 'center'
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => new Date(row.created_at).toLocaleDateString(),
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
            className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-secondary-light"
            onClick={() => {
              setEditingProductId(row.id)
              setForm({
                sku: row.sku,
                name: row.name,
                description: row.description ?? '',
                categoryId: row.category_id ? String(row.category_id) : '',
                stockQuantity: String(row.stock_quantity),
                reorderLevel: String(row.reorder_level),
                isActive: row.is_active,
                isOnOffer: Boolean(row.is_on_offer),
                maxOffer: String(row.max_offer ?? 0),
                imageUrlsText: (row.image_urls ?? []).join('\n'),
                imageFiles: []
              })
              setShowProductForm(true)
              setFormError(null)
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded border border-error px-2 py-1 text-[11px] text-error hover:bg-error-light/20"
            onClick={() => {
              const confirmed = window.confirm(`Delete "${row.name}"? This action cannot be undone.`)
              if (confirmed) {
                deleteProductMutation.mutate(row.id)
              }
            }}
          >
            Delete
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
    <div className="space-y-6 text-text">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Product management</h1>
          <p className="text-xs text-text-tertiary sm:text-sm">
            Manage product catalog, stock settings, and categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowCategoryForm((prev) => !prev)
            }}
          >
            {showCategoryForm ? 'Close category form' : 'New category'}
          </Button>
          <Button
            onClick={() => {
              setEditingProductId(null)
              setForm(EMPTY_FORM)
              setFormError(null)
              setShowProductForm((prev) => !prev)
            }}
          >
            {showProductForm ? 'Close product form' : 'New product'}
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <TextInput
            label="Search"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(String(event.target.value))}
          />
          <label className="mt-6 inline-flex items-center gap-2 text-xs text-text-secondary sm:text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
              className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
            />
            Show in-stock only
          </label>
        </div>
      </section>

      {showCategoryForm ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">Create category</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmitCategory}>
            <TextInput
              label="Category name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              required
            />
            <TextInput
              label="Description"
              value={categoryDescription}
              onChange={(event) => setCategoryDescription(event.target.value)}
            />
            <div className="flex items-end">
              <Button type="submit" loading={createCategoryMutation.isPending}>
                Save category
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {showProductForm ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">
            {editingProductId ? 'Edit product' : 'Create product'}
          </h2>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmitProduct}>
            {!editingProductId ? (
              <TextInput
                label="SKU"
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                required
              />
            ) : null}
            <TextInput
              label="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Select
              label="Category"
              options={productFormCategoryOptions}
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: String(event.target.value) }))}
            />
            <TextInput
              label="Stock quantity"
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
              }
              required
            />
            <TextInput
              label="Reorder level"
              type="number"
              min={0}
              value={form.reorderLevel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reorderLevel: event.target.value }))
              }
              required
            />
            <div className="md:col-span-2">
              <TextArea
                label="Description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <TextArea
                label="Image URLs (optional)"
                helperText="One image URL per line."
                value={form.imageUrlsText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageUrlsText: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm">
              <label className="block font-medium text-text-secondary" htmlFor="product-image-files">
                Upload images (optional)
              </label>
              <input
                id="product-image-files"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  setForm((prev) => ({ ...prev, imageFiles: files }))
                }}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs sm:text-sm"
              />
              {form.imageFiles.length > 0 ? (
                <p className="text-[11px] text-text-tertiary">
                  {form.imageFiles.length} file(s) selected.
                </p>
              ) : null}
            </div>
            <TextInput
              label="Max offer amount"
              type="number"
              min={0}
              step="0.01"
              value={form.maxOffer}
              onChange={(event) => setForm((prev) => ({ ...prev, maxOffer: event.target.value }))}
              disabled={!form.isOnOffer}
            />
            <label className="mt-6 inline-flex items-center gap-2 text-xs text-text-secondary sm:text-sm">
              <input
                type="checkbox"
                checked={form.isOnOffer}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isOnOffer: event.target.checked }))
                }
                className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
              />
              Product is on offer
            </label>
            <label className="mt-6 inline-flex items-center gap-2 text-xs text-text-secondary sm:text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
              />
              Product is active
            </label>
            {editingProduct ? (
              <div className="md:col-span-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-text-secondary sm:text-sm">
                <p>
                  Normal selling price: <span className="font-medium text-text">{formatCurrency(editingProduct.price)}</span>
                </p>
                <p>
                  Offer price:{' '}
                  <span className="font-medium text-text">
                    {formatCurrency(
                      getOfferPrice(
                        editingProduct.price,
                        form.isOnOffer,
                        Number.isNaN(Number(form.maxOffer)) ? 0 : Number(form.maxOffer)
                      )
                    )}
                  </span>
                </p>
                <p>
                  Images: <span className="font-medium text-text">{(editingProduct.image_urls ?? []).length}</span>
                </p>
              </div>
            ) : null}
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit" loading={saveProductMutation.isPending}>
                {editingProductId ? 'Update product' : 'Create product'}
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
              {formError ? <p className="text-xs text-error">{formError}</p> : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Catalog</h2>
          {productsQuery.isFetching ? (
            <span className="text-[11px] text-text-tertiary">Refreshing…</span>
          ) : null}
        </div>
        {productsQuery.isError ? (
          <p className="text-xs text-error">Could not load products from API.</p>
        ) : null}
        <DataTable
          columns={columns}
          data={productsQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyState={
            productsQuery.isLoading ? 'Loading products…' : 'No products found for current filter.'
          }
        />
      </section>
    </div>
  )
}

export default ProductManagementPage
