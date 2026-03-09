import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, DataTable, Select, TextArea, TextInput, type Column } from '@components/common'
import {
  createServiceCategoryRequest,
  createServiceRequest,
  deleteServiceRequest,
  listServiceCategoriesRequest,
  listServicesRequest,
  type ServiceOfferingCreate,
  type ServiceOfferingResponse,
  type ServiceOfferingUpdate,
  updateServiceRequest
} from '@api/modules/services.api'

type ServiceFormState = {
  code: string
  name: string
  description: string
  categoryId: string
  price: string
  durationMinutes: string
  isActive: boolean
  imageUrlsText: string
  imageFiles: File[]
}

const EMPTY_FORM: ServiceFormState = {
  code: '',
  name: '',
  description: '',
  categoryId: '',
  price: '',
  durationMinutes: '',
  isActive: true,
  imageUrlsText: '',
  imageFiles: []
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2
  }).format(amount)

const parseImageUrls = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const ServiceManagementPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')

  const categoriesQuery = useQuery({
    queryKey: ['services', 'categories', 'admin'],
    queryFn: listServiceCategoriesRequest
  })

  const servicesQuery = useQuery({
    queryKey: ['services', 'list', 'admin', search],
    queryFn: () => listServicesRequest({ limit: 200, search: search.trim() || undefined })
  })

  const saveServiceMutation = useMutation({
    mutationFn: async (payload: ServiceFormState) => {
      const categoryId = Number(payload.categoryId)
      const price = Number(payload.price)
      const durationMinutes = payload.durationMinutes ? Number(payload.durationMinutes) : undefined
      const imageUrls = parseImageUrls(payload.imageUrlsText)

      if (!payload.name.trim() || !payload.code.trim()) {
        throw new Error('Service name and code are required.')
      }
      if (!payload.categoryId || Number.isNaN(categoryId)) {
        throw new Error('Select a service category.')
      }
      if (Number.isNaN(price) || price < 0) {
        throw new Error('Price must be a valid number greater than or equal to 0.')
      }
      if (durationMinutes !== undefined && (Number.isNaN(durationMinutes) || durationMinutes < 1)) {
        throw new Error('Duration must be at least 1 minute when provided.')
      }

      if (editingServiceId) {
        const updatePayload: ServiceOfferingUpdate = {
          code: payload.code.trim(),
          name: payload.name.trim(),
          description: payload.description.trim() || undefined,
          category_id: categoryId,
          price,
          duration_minutes: durationMinutes,
          is_active: payload.isActive,
          image_urls: imageUrls
        }
        return updateServiceRequest(editingServiceId, updatePayload, payload.imageFiles)
      }

      const createPayload: ServiceOfferingCreate = {
        code: payload.code.trim(),
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        category_id: categoryId,
        price,
        duration_minutes: durationMinutes,
        is_active: payload.isActive,
        image_urls: imageUrls
      }
      return createServiceRequest(createPayload, payload.imageFiles)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', 'list'] })
      setForm(EMPTY_FORM)
      setShowForm(false)
      setEditingServiceId(null)
      setFormError(null)
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not save service.')
    }
  })

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createServiceCategoryRequest({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
        is_active: true
      }),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['services', 'categories'] })
      setForm((prev) => ({ ...prev, categoryId: String(category.id) }))
      setCategoryName('')
      setCategoryDescription('')
      setShowCategoryForm(false)
    }
  })

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId: number) => deleteServiceRequest(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', 'list'] })
    }
  })

  const categoryOptions = useMemo(
    () => [
      { label: 'Select category', value: '' },
      ...(categoriesQuery.data ?? []).map((category) => ({
        label: category.name,
        value: String(category.id)
      }))
    ],
    [categoriesQuery.data]
  )

  const columns: Column<ServiceOfferingResponse>[] = [
    {
      key: 'name',
      header: 'Service',
      render: (row) => (
        <div>
          <p className="font-medium text-text">{row.name}</p>
          <p className="text-[11px] text-text-tertiary">Code: {row.code}</p>
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row) => row.category_name ?? '-'
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => formatCurrency(row.price)
    },
    {
      key: 'duration_minutes',
      header: 'Duration',
      render: (row) => (row.duration_minutes ? `${row.duration_minutes} min` : 'Custom')
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
      render: (row) => (row.is_active ? 'Active' : 'Inactive')
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
              setEditingServiceId(row.id)
              setForm({
                code: row.code,
                name: row.name,
                description: row.description ?? '',
                categoryId: String(row.category_id),
                price: String(row.price),
                durationMinutes: row.duration_minutes ? String(row.duration_minutes) : '',
                isActive: row.is_active,
                imageUrlsText: (row.image_urls ?? []).join('\n'),
                imageFiles: []
              })
              setShowForm(true)
              setFormError(null)
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded border border-error px-2 py-1 text-[11px] text-error hover:bg-error-light/20"
            onClick={() => {
              const confirmed = window.confirm(`Delete "${row.name}"?`)
              if (confirmed) {
                deleteServiceMutation.mutate(row.id)
              }
            }}
          >
            Delete
          </button>
        </div>
      )
    }
  ]

  const onSubmitService = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    saveServiceMutation.mutate(form)
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
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Service management</h1>
          <p className="text-xs text-text-tertiary sm:text-sm">
            Manage services and optional multiple images per service.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryForm((prev) => !prev)}>
            {showCategoryForm ? 'Close category form' : 'New category'}
          </Button>
          <Button
            onClick={() => {
              setEditingServiceId(null)
              setForm(EMPTY_FORM)
              setFormError(null)
              setShowForm((prev) => !prev)
            }}
          >
            {showForm ? 'Close service form' : 'New service'}
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4">
        <TextInput
          label="Search services"
          placeholder="Search by code or name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      {showCategoryForm ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">Create service category</h2>
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

      {showForm ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">
            {editingServiceId ? 'Edit service' : 'Create service'}
          </h2>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmitService}>
            <TextInput
              label="Code"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              required
            />
            <TextInput
              label="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Select
              label="Category"
              options={categoryOptions}
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: String(event.target.value) }))}
              required
            />
            <TextInput
              label="Price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              required
            />
            <TextInput
              label="Duration (minutes)"
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
            />
            <label className="mt-6 inline-flex items-center gap-2 text-xs text-text-secondary sm:text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
              />
              Service is active
            </label>
            <div className="md:col-span-3">
              <TextArea
                label="Description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <TextArea
                label="Image URLs (optional)"
                helperText="One URL per line."
                value={form.imageUrlsText}
                onChange={(event) => setForm((prev) => ({ ...prev, imageUrlsText: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm">
              <label className="block font-medium text-text-secondary" htmlFor="service-image-files">
                Upload images (optional)
              </label>
              <input
                id="service-image-files"
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
                <p className="text-[11px] text-text-tertiary">{form.imageFiles.length} file(s) selected.</p>
              ) : null}
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit" loading={saveServiceMutation.isPending}>
                {editingServiceId ? 'Update service' : 'Create service'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setEditingServiceId(null)
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
        <h2 className="text-sm font-semibold text-text">Services</h2>
        <DataTable
          columns={columns}
          data={servicesQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyState={servicesQuery.isLoading ? 'Loading services…' : 'No services found.'}
        />
      </section>
    </div>
  )
}

export default ServiceManagementPage
