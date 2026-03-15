import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button, Select, TextArea, TextInput } from '@components/common'
import {
  deleteProductRequest,
  getProductRequest,
  listCategoriesRequest,
  updateProductRequest,
  type ProductUpdate
} from '@api/modules/products.api'

type ManageProductFormState = {
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

const EMPTY_FORM: ManageProductFormState = {
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

const parseImageUrls = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const ManageProductPage = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { productId: productIdParam } = useParams()
  const productId = Number(productIdParam)

  const [form, setForm] = useState<ManageProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const productQuery = useQuery({
    queryKey: ['products', 'details', productId],
    queryFn: () => getProductRequest(productId),
    enabled: Number.isFinite(productId) && productId > 0
  })

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest
  })

  useEffect(() => {
    const product = productQuery.data
    if (!product) {
      return
    }

    setForm({
      name: product.name,
      description: product.description ?? '',
      categoryId: product.category_id ? String(product.category_id) : '',
      stockQuantity: String(product.stock_quantity),
      reorderLevel: String(product.reorder_level),
      isActive: product.is_active,
      isOnOffer: Boolean(product.is_on_offer),
      maxOffer: String(product.max_offer ?? 0),
      imageUrlsText: (product.image_urls ?? []).join('\n'),
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

  const updateProductMutation = useMutation({
    mutationFn: async (payload: ManageProductFormState) => {
      if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('Invalid product ID.')
      }

      const stockQuantity = Number(payload.stockQuantity)
      const reorderLevel = Number(payload.reorderLevel)
      const maxOffer = Number(payload.maxOffer)
      const categoryId = payload.categoryId ? Number(payload.categoryId) : undefined
      const imageUrls = parseImageUrls(payload.imageUrlsText)

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
        category_id: categoryId,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        is_active: payload.isActive,
        is_on_offer: payload.isOnOffer,
        max_offer: payload.isOnOffer ? maxOffer : 0,
        image_urls: imageUrls
      }

      return updateProductRequest(productId, updatePayload, payload.imageFiles)
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

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    updateProductMutation.mutate(form)
  }

  if (!Number.isFinite(productId) || productId <= 0) {
    return (
      <div className="space-y-4 text-text">
        <p className="text-sm text-error">Invalid product ID.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/admin/products')}>
          Back to Products
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-text">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/dashboard/admin/products')}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          Manage Product {productQuery.data ? `- ${productQuery.data.name}` : ''}
        </h1>
      </div>

      {productQuery.isLoading ? (
        <p className="text-sm text-text-tertiary">Loading product...</p>
      ) : productQuery.isError || !productQuery.data ? (
        <div className="space-y-2">
          <p className="text-sm text-error">Could not load product details.</p>
          <Button variant="outline" onClick={() => productQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-4 rounded-md border border-border bg-background p-3 text-xs text-text-secondary">
            <p>SKU: {productQuery.data.sku}</p>
            <p>Created: {new Date(productQuery.data.created_at).toLocaleString()}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <TextInput
                label="Product Name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <Select
                label="Category"
                options={categoryOptions}
                value={form.categoryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: String(event.target.value) }))
                }
              />
              <TextInput
                label="Stock Quantity"
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                }
                required
              />
              <TextInput
                label="Reorder Level"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, reorderLevel: event.target.value }))
                }
                required
              />
              <TextInput
                label="Max Offer Amount"
                type="number"
                min={0}
                step="0.01"
                value={form.maxOffer}
                onChange={(event) => setForm((prev) => ({ ...prev, maxOffer: event.target.value }))}
                disabled={!form.isOnOffer}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextArea
                label="Description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
              />
              <TextArea
                label="Image URLs (One per line)"
                value={form.imageUrlsText}
                onChange={(event) => setForm((prev) => ({ ...prev, imageUrlsText: event.target.value }))}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-secondary">Upload Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      imageFiles: Array.from(event.target.files ?? [])
                    }))
                  }
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs sm:text-sm"
                />
                {form.imageFiles.length > 0 ? (
                  <p className="text-xs text-text-tertiary">{form.imageFiles.length} file(s) selected</p>
                ) : null}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isOnOffer}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isOnOffer: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-text-secondary">On offer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-text-secondary">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" loading={updateProductMutation.isPending}>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                loading={deleteProductMutation.isPending}
                onClick={() => {
                  const shouldDelete = window.confirm(
                    `Delete \"${productQuery.data?.name}\"? This action cannot be undone.`
                  )
                  if (shouldDelete) {
                    deleteProductMutation.mutate()
                  }
                }}
              >
                <TrashIcon className="h-4 w-4" />
                Delete Product
              </Button>
              {formError ? <span className="text-xs text-error">{formError}</span> : null}
            </div>
          </form>
        </section>
      )}
    </div>
  )
}

export default ManageProductPage
