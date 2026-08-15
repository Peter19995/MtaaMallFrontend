import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EllipsisVerticalIcon, MagnifyingGlassIcon, PlusIcon, TagIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button, TextArea, TextInput } from '@components/common'
import { useConfirmDialog } from '@contexts/ConfirmDialogContext'
import {
  createCategoryRequest,
  deleteCategoryRequest,
  listCategoriesRequest,
  ProductCategoryResponse,
  updateCategoryRequest,
} from '@api/modules/products.api'

const CategoriesPage = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirmDialog()
  const categories = useQuery({ queryKey: ['products', 'categories'], queryFn: listCategoriesRequest })
  const [selected, setSelected] = useState<ProductCategoryResponse | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredCategories = (categories.data ?? []).filter((category) =>
    [category.name, category.description].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
  const fillForm = (category?: ProductCategoryResponse | null) => {
    setName(category?.name ?? '')
    setDescription(category?.description ?? '')
    setError(null)
  }
  useEffect(() => {
    if (!selected) return
    const fresh = categories.data?.find((category) => category.id === selected.id)
    if (fresh) setSelected(fresh)
  }, [categories.data, selected?.id])

  const createCategory = useMutation({
    mutationFn: () => createCategoryRequest({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: async () => { close(); await refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not create category.'),
  })
  const updateCategory = useMutation({
    mutationFn: () => updateCategoryRequest(selected!.id, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: async () => { close(); await refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not update category.'),
  })
  const deleteCategory = useMutation({
    mutationFn: () => deleteCategoryRequest(selected!.id),
    onSuccess: async () => { close(); await refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not delete category.'),
  })
  const close = () => { setSelected(null); setShowCreate(false); fillForm() }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError('Category name is required.')
    selected ? updateCategory.mutate() : createCategory.mutate()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-text"><TagIcon className="h-6 w-6 text-primary" />Product Categories</h1><p className="mt-1 text-sm text-text-secondary">Organize products into departments customers can browse.</p></div>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { fillForm(); setShowCreate(true) }}>New Category</Button>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <TextInput aria-label="Search categories" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories…" className="pl-9 pr-10" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-tertiary hover:bg-background hover:text-text" aria-label="Clear category search"><XMarkIcon className="h-4 w-4" /></button>}
          </div>
          <p className="text-xs text-text-secondary">Showing {filteredCategories.length} of {(categories.data ?? []).length}</p>
        </div>
        {categories.isLoading ? <p className="p-6 text-sm text-text-secondary">Loading categories…</p> : (
          <div className="divide-y divide-border">
            {filteredCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-background/60">
                <div><p className="font-semibold text-text">{category.name}</p><p className="mt-1 text-xs text-text-secondary">{category.description || 'No description'}</p></div>
                <button type="button" onClick={() => { setSelected(category); fillForm(category) }} className="rounded-lg border border-border p-2 text-text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary" aria-label={`Manage ${category.name}`}><EllipsisVerticalIcon className="h-5 w-5" /></button>
              </div>
            ))}
            {filteredCategories.length === 0 && <p className="p-8 text-center text-sm text-text-secondary">{search ? 'No categories match your search.' : 'No categories have been created.'}</p>}
          </div>
        )}
      </section>

      {(selected || showCreate) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <div className="w-full max-w-xl rounded-2xl border border-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4"><h2 className="text-lg font-semibold text-text">{selected ? `Manage ${selected.name}` : 'Create category'}</h2><button onClick={close} className="rounded-lg p-2 hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></div>
            <form onSubmit={submit} className="space-y-4 p-6">
              <TextInput label="Category name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sugar, Salt & Spices" />
              <TextArea label="Description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
              {error && <p className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                {selected ? <Button type="button" variant="ghost" className="!border-error !bg-error !text-white hover:!bg-error-dark disabled:!bg-error/60" loading={deleteCategory.isPending} onClick={async () => { if (await confirm({ title: 'Delete category?', message: `Delete ${selected.name}? This cannot be undone.` })) deleteCategory.mutate() }}><TrashIcon className="h-4 w-4" />Delete</Button> : <span />}
                <div className="flex gap-3"><Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="submit" loading={createCategory.isPending || updateCategory.isPending}>{selected ? 'Save Changes' : 'Create Category'}</Button></div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriesPage
