import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowPathIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  SquaresPlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, Select, TextArea, TextInput, type Column } from '@components/common'
import { useAuth } from '@hooks/useAuth'
import {
  assignProductCollectionsRequest,
  createBusinessCollectionRequest,
  deleteBusinessCollectionRequest,
  listBusinessCollectionsRequest,
  listProductsRequest,
  updateBusinessCollectionRequest,
  type BusinessCollectionResponse,
  type ProductResponse,
} from '@api/modules/products.api'

type CollectionForm = {
  name: string
  slug: string
  parentPublicId: string
  description: string
  image: string
  isActive: boolean
}

const EMPTY_FORM: CollectionForm = {
  name: '', slug: '', parentPublicId: '', description: '', image: '', isActive: true,
}

const listAllBusinessProducts = async () => {
  const products: ProductResponse[] = []
  const pageSize = 200
  for (let skip = 0; ; skip += pageSize) {
    const page = await listProductsRequest({ skip, limit: pageSize })
    products.push(...page)
    if (page.length < pageSize) return products
  }
}

const BusinessCollectionsPage = () => {
  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canOperate = !['suspended', 'closed'].includes(user?.business_status ?? '')
  const canManage = hasPermission('products.collections.manage') && canOperate
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BusinessCollectionResponse | null>(null)
  const [deleting, setDeleting] = useState<BusinessCollectionResponse | null>(null)
  const [assigning, setAssigning] = useState<BusinessCollectionResponse | null>(null)
  const [form, setForm] = useState<CollectionForm>(EMPTY_FORM)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set())
  const [productSearch, setProductSearch] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const collectionsQuery = useQuery({
    queryKey: ['products', 'collections'],
    queryFn: listBusinessCollectionsRequest,
  })
  const productsQuery = useQuery({
    queryKey: ['products', 'list', 'collection-assignment'],
    queryFn: listAllBusinessProducts,
    enabled: Boolean(assigning),
  })

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }
  const openEdit = (collection: BusinessCollectionResponse) => {
    setEditing(collection)
    setForm({
      name: collection.name,
      slug: collection.slug,
      parentPublicId: collection.parent_public_id ?? '',
      description: collection.description ?? '',
      image: collection.image ?? '',
      isActive: collection.is_active,
    })
    setFormError(null)
    setFormOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        parent_public_id: form.parentPublicId || null,
        description: form.description.trim() || null,
        image: form.image.trim() || null,
        is_active: form.isActive,
      }
      return editing
        ? updateBusinessCollectionRequest(editing.public_id, payload)
        : createBusinessCollectionRequest(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products', 'collections'] })
      closeForm()
    },
    onError: (error: Error) => setFormError(error.message || 'Could not save collection.'),
  })
  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteBusinessCollectionRequest(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleting(null)
    },
  })
  const assignmentMutation = useMutation({
    mutationFn: async (collection: BusinessCollectionResponse) => {
      const products = productsQuery.data ?? []
      const changed = products.filter(product => {
        const currentlyAssigned = (product.collections ?? []).some(item => item.public_id === collection.public_id)
        return currentlyAssigned !== selectedProductIds.has(product.id)
      })
      await Promise.all(changed.map(product => {
        const existing = (product.collections ?? []).map(item => item.public_id)
        const next = selectedProductIds.has(product.id)
          ? Array.from(new Set([...existing, collection.public_id]))
          : existing.filter(publicId => publicId !== collection.public_id)
        return assignProductCollectionsRequest(product.id, next)
      }))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setAssigning(null)
      setSelectedProductIds(new Set())
      setProductSearch('')
    },
  })

  const openAssignment = (collection: BusinessCollectionResponse) => {
    setAssigning(collection)
    setSelectedProductIds(new Set())
    setProductSearch('')
  }
  const assignedIds = useMemo(() => {
    if (!assigning || !productsQuery.data) return new Set<number>()
    return new Set(productsQuery.data
      .filter(product => (product.collections ?? []).some(item => item.public_id === assigning.public_id))
      .map(product => product.id))
  }, [assigning, productsQuery.data])
  useEffect(() => {
    if (assigning && productsQuery.data) setSelectedProductIds(assignedIds)
  }, [assignedIds, assigning, productsQuery.data])

  const filteredCollections = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return collectionsQuery.data ?? []
    return (collectionsQuery.data ?? []).filter(item =>
      `${item.name} ${item.slug} ${item.description ?? ''}`.toLowerCase().includes(term))
  }, [collectionsQuery.data, search])
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return productsQuery.data ?? []
    return (productsQuery.data ?? []).filter(item =>
      `${item.name} ${item.sku} ${item.category_name ?? ''}`.toLowerCase().includes(term))
  }, [productSearch, productsQuery.data])
  const parentName = (parentId?: string | null) =>
    collectionsQuery.data?.find(item => item.public_id === parentId)?.name ?? 'Top level'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (form.name.trim().length < 2) {
      setFormError('Collection name must contain at least 2 characters.')
      return
    }
    saveMutation.mutate()
  }
  const toggleProduct = (productId: number) => {
    setSelectedProductIds(current => {
      const next = new Set(current)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const columns: Column<BusinessCollectionResponse>[] = [
    {
      key: 'name', header: 'Collection',
      render: item => <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-dark"><FolderIcon className="h-5 w-5" /></span><div><p className="font-semibold text-text">{item.name}</p><p className="text-xs text-text-tertiary">/{item.slug}</p></div></div>,
    },
    { key: 'parent', header: 'Parent', render: item => parentName(item.parent_public_id) },
    { key: 'products', header: 'Products', render: item => `${item.product_count} product${item.product_count === 1 ? '' : 's'}` },
    { key: 'status', header: 'Status', render: item => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_active ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary'}`}>{item.is_active ? 'Active' : 'Hidden'}</span> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: item => <div className="flex justify-end gap-1">
        {canManage && <button type="button" title="Assign products" aria-label={`Assign products to ${item.name}`} onClick={() => openAssignment(item)} className="rounded-lg p-2 text-text-secondary hover:bg-primary/5 hover:text-primary"><SquaresPlusIcon className="h-4 w-4" /></button>}
        {canManage && <button type="button" title="Edit collection" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)} className="rounded-lg p-2 text-text-secondary hover:bg-primary/5 hover:text-primary"><PencilIcon className="h-4 w-4" /></button>}
        {canManage && <button type="button" title="Delete collection" aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)} className="rounded-lg p-2 text-text-secondary hover:bg-error/5 hover:text-error"><TrashIcon className="h-4 w-4" /></button>}
      </div>,
    },
  ]

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Storefront organization</p><h2 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Business collections</h2><p className="mt-2 text-sm text-text-secondary">Group your listings into campaigns and store sections without changing the marketplace category.</p></div>
      {canManage && <Button onClick={openCreate} className="flex items-center gap-2"><PlusIcon className="h-4 w-4" />Add collection</Button>}
    </header>
    <section className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-divider p-4 sm:flex-row sm:items-center"><div><h3 className="font-bold text-text">Collections</h3><p className="text-xs text-text-tertiary">{filteredCollections.length} item{filteredCollections.length === 1 ? '' : 's'}</p></div><label className="relative block w-full sm:w-80"><span className="sr-only">Search collections</span><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search collections..." className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label></div>
      {collectionsQuery.isError ? <div className="p-10 text-center"><p className="text-sm text-error">Could not load collections.</p><Button variant="outline" className="mt-3" onClick={() => collectionsQuery.refetch()}>Try again</Button></div> : <DataTable columns={columns} data={filteredCollections} getRowKey={item => item.public_id} className="rounded-none border-0" emptyState={collectionsQuery.isLoading ? <span className="inline-flex items-center gap-2"><ArrowPathIcon className="h-4 w-4 animate-spin" />Loading collections...</span> : 'No collections found.'} />}
    </section>

    <AnimatePresence>{formOpen && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget && !saveMutation.isPending) closeForm() }}><motion.section role="dialog" aria-modal="true" aria-labelledby="collection-form-title" initial={{ opacity: 0, scale: .96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96, y: 16 }} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-divider px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">{editing ? 'Update collection' : 'New collection'}</p><h3 id="collection-form-title" className="mt-1 text-xl font-bold text-text">{editing ? 'Edit collection' : 'Add collection'}</h3></div><button type="button" aria-label="Close collection form" onClick={closeForm} className="rounded-lg p-2 text-text-tertiary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></header><form onSubmit={submit} className="space-y-4 p-6"><TextInput label="Collection name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} required minLength={2} maxLength={200} autoFocus placeholder="e.g. Weekend Offers" /><TextInput label="Slug (optional)" value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value }))} maxLength={220} helperText="Leave blank to generate it from the name." placeholder="weekend-offers" /><Select label="Parent collection (optional)" searchable value={form.parentPublicId} onChange={event => setForm(current => ({ ...current, parentPublicId: event.target.value }))} options={[{ label: 'No parent', value: '' }, ...(collectionsQuery.data ?? []).filter(item => item.public_id !== editing?.public_id).map(item => ({ label: item.name, value: item.public_id }))]} /><TextArea label="Description" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} rows={3} /><TextInput label="Image URL (optional)" type="url" value={form.image} onChange={event => setForm(current => ({ ...current, image: event.target.value }))} placeholder="https://..." /><label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 accent-primary" /><span><span className="block text-sm font-semibold text-text">Active collection</span><span className="block text-xs text-text-tertiary">Active collections may be shown on the storefront.</span></span></label>{formError && <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}<div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? 'Update collection' : 'Create collection'}</Button></div></form></motion.section></motion.div>}</AnimatePresence>

    <AnimatePresence>{assigning && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="dialog" aria-modal="true" aria-labelledby="assignment-title" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-divider px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Collection products</p><h3 id="assignment-title" className="mt-1 text-xl font-bold text-text">{assigning.name}</h3><p className="mt-1 text-sm text-text-secondary">Select business listings to include. Existing memberships in other collections are preserved.</p></div><button type="button" aria-label="Close product assignment" onClick={() => setAssigning(null)} className="rounded-lg p-2 text-text-tertiary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></header><div className="border-b border-divider p-4"><label className="relative block"><span className="sr-only">Search products</span><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" /><input value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Search products by name or SKU..." className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label></div><div className="min-h-48 flex-1 overflow-y-auto p-4">{productsQuery.isLoading ? <p className="py-10 text-center text-sm text-text-secondary">Loading products...</p> : productsQuery.isError ? <p role="alert" className="py-10 text-center text-sm text-error">Could not load products.</p> : filteredProducts.length === 0 ? <p className="py-10 text-center text-sm text-text-secondary">No products found.</p> : <div className="space-y-2">{filteredProducts.map(product => <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5"><input type="checkbox" checked={selectedProductIds.has(product.id)} onChange={() => toggleProduct(product.id)} className="h-4 w-4 accent-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text">{product.name}</span><span className="block truncate text-xs text-text-tertiary">{product.sku}{product.category_name ? ` · ${product.category_name}` : ''}</span></span></label>)}</div>}</div>{assignmentMutation.isError && <p role="alert" className="mx-6 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{(assignmentMutation.error as Error).message || 'Could not update collection products.'}</p>}<footer className="flex items-center justify-between border-t border-divider px-6 py-4"><p className="text-sm text-text-secondary">{selectedProductIds.size} selected</p><div className="flex gap-3"><Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button><Button onClick={() => assignmentMutation.mutate(assigning)} loading={assignmentMutation.isPending} disabled={productsQuery.isLoading || productsQuery.isError}>Save products</Button></div></footer></motion.section></motion.div>}</AnimatePresence>

    <AnimatePresence>{deleting && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="alertdialog" aria-modal="true" aria-labelledby="delete-collection-title" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><span className="grid h-12 w-12 place-items-center rounded-xl bg-error/10 text-error"><TrashIcon className="h-6 w-6" /></span><h3 id="delete-collection-title" className="mt-4 text-xl font-bold text-text">Delete {deleting.name}?</h3><p className="mt-2 text-sm text-text-secondary">The collection and its product links will be removed. The products, prices, stock and marketplace categories will not be deleted or changed.</p>{deleteMutation.isError && <p role="alert" className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{(deleteMutation.error as Error).message || 'Could not delete collection.'}</p>}<div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button onClick={() => deleteMutation.mutate(deleting.public_id)} loading={deleteMutation.isPending} className="bg-error hover:bg-error/90">Delete collection</Button></div></motion.section></motion.div>}</AnimatePresence>
  </div>
}

export default BusinessCollectionsPage
