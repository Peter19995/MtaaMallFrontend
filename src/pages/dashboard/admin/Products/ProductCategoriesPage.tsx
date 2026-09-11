import { FormEvent, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button, DataTable, TextArea, TextInput, type Column } from '@components/common'
import { useAuth } from '@hooks/useAuth'
import {
  createCategoryRequest,
  deleteCategoryRequest,
  listCategoriesRequest,
  updateCategoryRequest,
  type ProductCategoryResponse,
} from '@api/modules/products.api'

type CategoryForm = { name: string; description: string }
const EMPTY_FORM: CategoryForm = { name: '', description: '' }

const ProductCategoriesPage = () => {
  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canOperate = !['suspended', 'closed'].includes(user?.business_status ?? '')
  const canCreate = hasPermission('products.create') && canOperate
  const canEdit = hasPermission('products.update') && canOperate
  const canDelete = hasPermission('products.delete') && canOperate
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductCategoryResponse | null>(null)
  const [viewing, setViewing] = useState<ProductCategoryResponse | null>(null)
  const [deleting, setDeleting] = useState<ProductCategoryResponse | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest,
  })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? updateCategoryRequest(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
      : createCategoryRequest({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      closeForm()
    },
    onError: (error: Error) => setFormError(error.message || 'Could not save category.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (categoryId: number) => deleteCategoryRequest(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      setDeleting(null)
    },
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

  const openEdit = (category: ProductCategoryResponse) => {
    setEditing(category)
    setForm({ name: category.name, description: category.description ?? '' })
    setFormError(null)
    setFormOpen(true)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (form.name.trim().length < 2) {
      setFormError('Category name must contain at least 2 characters.')
      return
    }
    setFormError(null)
    saveMutation.mutate()
  }

  const categories = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return categoriesQuery.data ?? []
    return (categoriesQuery.data ?? []).filter(category =>
      `${category.name} ${category.description ?? ''}`.toLowerCase().includes(term)
    )
  }, [categoriesQuery.data, search])

  const columns: Column<ProductCategoryResponse>[] = [
    {
      key: 'name',
      header: 'Category',
      render: category => <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-dark"><TagIcon className="h-5 w-5" /></span><div><p className="font-semibold text-text">{category.name}</p><p className="text-xs text-text-tertiary">Category #{category.id}</p></div></div>,
    },
    {
      key: 'description',
      header: 'Description',
      render: category => <span className="line-clamp-2">{category.description?.trim() || 'No description'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: category => <div className="flex justify-end gap-1">
        <button type="button" title="View category" aria-label={`View ${category.name}`} onClick={() => setViewing(category)} className="rounded-lg p-2 text-text-secondary transition hover:bg-primary/5 hover:text-primary"><EyeIcon className="h-4 w-4" /></button>
        {canEdit && <button type="button" title="Edit category" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)} className="rounded-lg p-2 text-text-secondary transition hover:bg-primary/5 hover:text-primary"><PencilIcon className="h-4 w-4" /></button>}
        {canDelete && <button type="button" title="Delete category" aria-label={`Delete ${category.name}`} onClick={() => setDeleting(category)} className="rounded-lg p-2 text-text-secondary transition hover:bg-error/5 hover:text-error"><TrashIcon className="h-4 w-4" /></button>}
      </div>,
    },
  ]

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Catalog setup</p><h2 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Product categories</h2><p className="mt-2 text-sm text-text-secondary">Organize products into clear, reusable categories.</p></div>
      {canCreate && <Button onClick={openCreate} className="flex items-center gap-2"><PlusIcon className="h-4 w-4" />Add category</Button>}
    </header>

    <section className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-divider p-4 sm:flex-row sm:items-center">
        <div><h3 className="font-bold text-text">Categories</h3><p className="text-xs text-text-tertiary">{categories.length} item{categories.length === 1 ? '' : 's'}</p></div>
        <label className="relative block w-full sm:w-80"><span className="sr-only">Search categories</span><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search categories..." className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
      </div>
      {categoriesQuery.isError ? <div className="p-10 text-center"><p className="text-sm text-error">Could not load categories.</p><Button variant="outline" className="mt-3" onClick={() => categoriesQuery.refetch()}>Try again</Button></div> : <DataTable columns={columns} data={categories} getRowKey={category => category.id} className="rounded-none border-0" emptyState={categoriesQuery.isLoading ? <span className="inline-flex items-center gap-2"><ArrowPathIcon className="h-4 w-4 animate-spin" />Loading categories...</span> : 'No categories found.'} />}
    </section>

    <AnimatePresence>{formOpen && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget && !saveMutation.isPending) closeForm() }}><motion.section role="dialog" aria-modal="true" aria-labelledby="category-form-title" initial={{ opacity: 0, scale: .96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96, y: 16 }} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-divider px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">{editing ? 'Update item' : 'New item'}</p><h3 id="category-form-title" className="mt-1 text-xl font-bold text-text">{editing ? 'Edit category' : 'Add category'}</h3></div><button type="button" aria-label="Close category form" onClick={closeForm} className="rounded-lg p-2 text-text-tertiary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></header><form onSubmit={submit} className="space-y-4 p-6"><TextInput label="Category name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} minLength={2} maxLength={100} required autoFocus placeholder="e.g. Electronics" /><TextArea label="Description" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} rows={4} placeholder="Briefly describe the products in this category" />{formError && <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>}<div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? 'Update category' : 'Create category'}</Button></div></form></motion.section></motion.div>}</AnimatePresence>

    <AnimatePresence>{viewing && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => event.target === event.currentTarget && setViewing(null)}><motion.section role="dialog" aria-modal="true" aria-labelledby="category-view-title" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary-dark"><TagIcon className="h-6 w-6" /></span><button type="button" aria-label="Close category details" onClick={() => setViewing(null)} className="rounded-lg p-2 text-text-tertiary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Category #{viewing.id}</p><h3 id="category-view-title" className="mt-1 text-2xl font-bold text-text">{viewing.name}</h3><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{viewing.description?.trim() || 'No description has been provided.'}</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setViewing(null)}>Close</Button>{canEdit && <Button onClick={() => { const category = viewing; setViewing(null); openEdit(category) }}>Edit category</Button>}</div></motion.section></motion.div>}</AnimatePresence>

    <AnimatePresence>{deleting && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="alertdialog" aria-modal="true" aria-labelledby="delete-category-title" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><span className="grid h-12 w-12 place-items-center rounded-xl bg-error/10 text-error"><TrashIcon className="h-6 w-6" /></span><h3 id="delete-category-title" className="mt-4 text-xl font-bold text-text">Delete {deleting.name}?</h3><p className="mt-2 text-sm text-text-secondary">This category can only be deleted when no products use it.</p>{deleteMutation.isError && <p role="alert" className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{(deleteMutation.error as Error).message || 'Could not delete category.'}</p>}<div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button onClick={() => deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} className="bg-error hover:bg-error/90">Delete category</Button></div></motion.section></motion.div>}</AnimatePresence>
  </div>
}

export default ProductCategoriesPage
