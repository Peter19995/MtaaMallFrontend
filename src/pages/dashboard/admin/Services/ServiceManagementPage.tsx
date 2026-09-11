import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, useSiteDialog, type Column } from '@components/common'
import {
  createServiceCategoryRequest,
  createServiceRequest,
  deleteServiceRequest,
  listServiceCategoriesRequest,
  listServicesRequest,
  type ServiceOfferingCreate,
  type ServiceOfferingResponse,
  type ServiceOfferingUpdate,
  uploadServiceImagesRequest,
  updateServiceRequest
} from '@api/modules/services.api'
import { AppTheme, withOpacity } from '@constants/theme'
import { resolveMediaUrl, resolveMediaUrls } from '@utils/media'

type ServiceFormState = {
  code: string
  name: string
  description: string
  categoryId: string
  price: string
  durationMinutes: string
  isActive: boolean
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
  imageFiles: []
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

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

const ServiceManagementPage = () => {
  const siteDialog = useSiteDialog()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<ServiceOfferingResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const categoriesQuery = useQuery({
    queryKey: ['services', 'categories', 'admin'],
    queryFn: listServiceCategoriesRequest
  })

  const servicesQuery = useQuery({
    queryKey: ['services', 'list', 'admin', search, statusFilter],
    queryFn: () => listServicesRequest({ 
      limit: 200, 
      search: search.trim() || undefined,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'active'
    })
  })

  const saveServiceMutation = useMutation({
    mutationFn: async (payload: ServiceFormState) => {
      const categoryId = Number(payload.categoryId)
      const price = Number(payload.price)
      const durationMinutes = payload.durationMinutes ? Number(payload.durationMinutes) : undefined

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
          is_active: payload.isActive
        }

        const updatedService = await updateServiceRequest(editingServiceId, updatePayload)
        if (payload.imageFiles.length > 0) {
          await uploadServiceImagesRequest(updatedService.id, payload.imageFiles)
        }

        return updatedService
      }

      const createPayload: ServiceOfferingCreate = {
        code: payload.code.trim(),
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        category_id: categoryId,
        price,
        duration_minutes: durationMinutes,
        is_active: payload.isActive
      }

      const createdService = await createServiceRequest(createPayload)
      if (payload.imageFiles.length > 0) {
        await uploadServiceImagesRequest(createdService.id, payload.imageFiles)
      }

      return createdService
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
      render: (row) => {
        const thumbnailUrl = resolveMediaUrl(row.image_urls?.[0]) ?? row.image_urls?.[0]

        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt={row.name} 
                  className="h-10 w-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewImage(thumbnailUrl)
                  }}
                />
              ) : (
                <WrenchScrewdriverIcon className="h-5 w-5 text-primary/50" />
              )}
            </div>
            <div>
              <p className="font-medium text-text">{row.name}</p>
              <p className="text-xs text-text-tertiary">Code: {row.code}</p>
            </div>
          </div>
        )
      }
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
      key: 'price',
      header: 'Price',
      render: (row) => (
        <span className="font-medium text-primary">{formatCurrency(row.price)}</span>
      ),
      align: 'right'
    },
    {
      key: 'duration_minutes',
      header: 'Duration',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <ClockIcon className="h-4 w-4 text-text-tertiary" />
          {row.duration_minutes ? `${row.duration_minutes} min` : 'Custom'}
        </span>
      )
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
            onClick={() => setSelectedServiceDetails(row)}
            title="View details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
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
                imageFiles: []
              })
              setShowForm(true)
              setFormError(null)
            }}
            title="Edit service"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
            onClick={async () => {
              if (await siteDialog.confirm({
                title: `Delete “${row.name}”?`,
                message: 'This action cannot be undone.',
                confirmLabel: 'Delete service',
                tone: 'danger'
              })) {
                deleteServiceMutation.mutate(row.id)
              }
            }}
            title="Delete service"
          >
            <TrashIcon className="h-4 w-4" />
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

  // Summary stats
  const stats = useMemo(() => {
    const services = servicesQuery.data ?? []
    return {
      total: services.length,
      active: services.filter(s => s.is_active).length,
      inactive: services.filter(s => !s.is_active).length,
      categories: new Set(services.map(s => s.category_id)).size
    }
  }, [servicesQuery.data])

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
              <WrenchScrewdriverIcon className="h-6 w-6 text-primary" />
              Service Management
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage your service catalog, categories, and pricing
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
                setEditingServiceId(null)
                setForm(EMPTY_FORM)
                setFormError(null)
                setShowForm(!showForm)
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white"
            >
              <PlusIcon className="h-4 w-4" />
              {showForm ? 'Close Service Form' : 'New Service'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <WrenchScrewdriverIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Services</p>
              <p className="text-lg font-bold text-primary">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Active</p>
              <p className="text-lg font-bold text-success">{stats.active}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/10 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Inactive</p>
              <p className="text-lg font-bold text-error">{stats.inactive}</p>
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
              <p className="text-lg font-bold text-accent">{stats.categories}</p>
            </div>
          </div>
        </motion.div>
      </motion.section>

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
                placeholder="Search by service name or code..."
                className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg 
                         focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 
                         transition-all text-sm"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Services</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                showAdvancedFilters 
                  ? 'bg-primary text-white border-primary' 
                  : 'border-border text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              <TagIcon className="h-4 w-4" />
              <span className="text-sm">Advanced Filters</span>
              {showAdvancedFilters ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
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
                      Duration
                    </label>
                    <select className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm">
                      <option>Any Duration</option>
                      <option>Under 30 min</option>
                      <option>30-60 min</option>
                      <option>60-120 min</option>
                      <option>Over 120 min</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Category
                    </label>
                    <select className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm">
                      <option>All Categories</option>
                      {categoriesQuery.data?.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
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
                Create New Service Category
              </h2>
              <form onSubmit={onSubmitCategory} className="grid gap-4 md:grid-cols-3">
                <TextInput
                  label="Category Name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  placeholder="e.g., Installation, Design, Cleaning"
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

      {/* Service Form */}
      <AnimatePresence>
        {showForm && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                <WrenchScrewdriverIcon className="h-4 w-4 text-primary" />
                {editingServiceId ? 'Edit Service' : 'Create New Service'}
              </h2>
              <form onSubmit={onSubmitService} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <TextInput
                    label="Service Code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="e.g., INST-001"
                  />
                  <TextInput
                    label="Service Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g., Professional Installation"
                  />
                  <Select
                    label="Category"
                    options={categoryOptions}
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: String(e.target.value) })}
                    required
                  />
                  <TextInput
                    label="Price (KES)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                  <TextInput
                    label="Duration (minutes)"
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    placeholder="e.g., 60"
                  />
                </div>

                <div>
                  <TextArea
                    label="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Service description..."
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

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">Service is active</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" loading={saveServiceMutation.isPending}>
                    {editingServiceId ? 'Update Service' : 'Create Service'}
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
                  {formError && (
                    <span className="text-xs text-error flex items-center gap-1">
                      <XCircleIcon className="h-4 w-4" />
                      {formError}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Services Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <WrenchScrewdriverIcon className="h-4 w-4 text-primary" />
              Service Catalog
            </h2>
            {servicesQuery.isFetching && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>

          {servicesQuery.isError ? (
            <div className="p-8 text-center">
              <XCircleIcon className="h-12 w-12 mx-auto text-error/30 mb-3" />
              <p className="text-sm text-error">Could not load services from API.</p>
              <Button
                variant="outline"
                onClick={() => servicesQuery.refetch()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={servicesQuery.data ?? []}
              getRowKey={(row) => row.id}
              emptyState={
                servicesQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <ArrowPathIcon className="h-8 w-8 mx-auto text-primary/30 animate-spin mb-3" />
                    <p className="text-sm text-text-secondary">Loading services...</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <WrenchScrewdriverIcon className="h-12 w-12 mx-auto text-text-tertiary/30 mb-3" />
                    <p className="text-sm text-text-secondary">No services found</p>
                    <p className="text-xs text-text-tertiary mt-1">Try adjusting your search or create a new service</p>
                  </div>
                )
              }
            />
          )}
        </div>
      </motion.section>

      {/* Service Details Modal */}
      <AnimatePresence>
        {selectedServiceDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedServiceDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-3xl rounded-2xl border border-border bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {(() => {
                const service = selectedServiceDetails
                const serviceImages = resolveMediaUrls(service.image_urls ?? [])
                const primaryImage = serviceImages[0]

                return (
                  <>
                    <div className="flex items-start justify-between border-b border-border p-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          Service Details
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-text">{service.name}</h3>
                        <p className="mt-1 text-sm text-text-tertiary">Code: {service.code}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedServiceDetails(null)}
                        className="rounded-full p-2 text-text-secondary transition-colors hover:bg-background hover:text-text"
                        aria-label="Close service details"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
                      <div className="space-y-4">
                        <div className="overflow-hidden rounded-2xl bg-background">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={service.name}
                              className="h-72 w-full cursor-pointer object-cover"
                              onClick={() => setPreviewImage(primaryImage)}
                            />
                          ) : (
                            <div className="flex h-72 items-center justify-center">
                              <WrenchScrewdriverIcon className="h-12 w-12 text-primary/30" />
                            </div>
                          )}
                        </div>

                        {serviceImages.length > 1 && (
                          <div className="grid grid-cols-4 gap-3">
                            {serviceImages.map((imageUrl, index) => (
                              <button
                                key={`${service.id}-image-${index}`}
                                type="button"
                                className="overflow-hidden rounded-xl border border-border bg-background"
                                onClick={() => setPreviewImage(imageUrl)}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`${service.name} ${index + 1}`}
                                  className="h-20 w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="text-xs text-text-tertiary">Category</p>
                            <p className="mt-1 font-semibold text-text">
                              {service.category_name ?? 'Uncategorized'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="text-xs text-text-tertiary">Price</p>
                            <p className="mt-1 font-semibold text-primary">
                              {formatCurrency(service.price)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="text-xs text-text-tertiary">Duration</p>
                            <p className="mt-1 font-semibold text-text">
                              {service.duration_minutes ? `${service.duration_minutes} minutes` : 'Custom'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="text-xs text-text-tertiary">Status</p>
                            <p className={`mt-1 font-semibold ${service.is_active ? 'text-success' : 'text-error'}`}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="text-xs text-text-tertiary">Description</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">
                            {service.description?.trim() || 'No service description provided yet.'}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              setSelectedServiceDetails(null)
                              setEditingServiceId(service.id)
                              setForm({
                                code: service.code,
                                name: service.name,
                                description: service.description ?? '',
                                categoryId: String(service.category_id),
                                price: String(service.price),
                                durationMinutes: service.duration_minutes ? String(service.duration_minutes) : '',
                                isActive: service.is_active,
                                imageFiles: []
                              })
                              setShowForm(true)
                              setFormError(null)
                            }}
                            className="flex-1"
                          >
                            Edit Service
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedServiceDetails(null)}
                            className="flex-1"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
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

export default ServiceManagementPage
