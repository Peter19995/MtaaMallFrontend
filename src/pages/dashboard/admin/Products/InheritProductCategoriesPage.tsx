import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, ArrowPathIcon, MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline'

import { Button } from '@components/common'
import { useAuth } from '@hooks/useAuth'
import { listCatalogCategoriesRequest } from '@api/modules/catalog.api'
import { createCategoryRequest, listCategoriesRequest } from '@api/modules/products.api'

const normalizedName = (value: string) => value.trim().toLocaleLowerCase()

const InheritProductCategoriesPage = () => {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const workspaceBase = location.pathname.startsWith('/employee') ? '/employee' : '/business'
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [inheritedIds, setInheritedIds] = useState<Set<string>>(() => new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const sharedCategoriesQuery = useQuery({
    queryKey: ['catalog', 'categories', 'inherit-page'],
    queryFn: listCatalogCategoriesRequest,
  })
  const businessCategoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest,
  })

  const existingNames = useMemo(() => new Set(
    (businessCategoriesQuery.data ?? []).map(category => normalizedName(category.name)),
  ), [businessCategoriesQuery.data])

  const categories = useMemo(() => {
    const term = normalizedName(search)
    return (sharedCategoriesQuery.data ?? []).filter(category => {
      if (existingNames.has(normalizedName(category.name)) || inheritedIds.has(category.public_id)) return false
      if (!term) return true
      return `${category.name} ${category.description ?? ''}`.toLocaleLowerCase().includes(term)
    })
  }, [existingNames, inheritedIds, search, sharedCategoriesQuery.data])

  const toggleCategory = (publicId: string) => {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(publicId)) next.delete(publicId)
      else next.add(publicId)
      return next
    })
    setNotice(null)
  }

  const inheritMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIds.size) throw new Error('Select at least one category to import.')
      const inherited: Array<{ publicId: string; name: string }> = []
      const failed: string[] = []
      for (const publicId of selectedIds) {
        const category = sharedCategoriesQuery.data?.find(item => item.public_id === publicId)
        if (!category) continue
        try {
          await createCategoryRequest({
            name: category.name,
            description: category.description ?? undefined,
          })
          inherited.push({ publicId, name: category.name })
        } catch {
          failed.push(category.name)
        }
      }
      return { inherited, failed }
    },
    onSuccess: ({ inherited, failed }) => {
      const completedIds = new Set(inherited.map(category => category.publicId))
      setInheritedIds(current => new Set([...current, ...completedIds]))
      setSelectedIds(current => new Set([...current].filter(id => !completedIds.has(id))))
      void queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      const messages = [`${inherited.length} categor${inherited.length === 1 ? 'y' : 'ies'} imported successfully.`]
      if (failed.length) messages.push(`Could not import: ${failed.join(', ')}.`)
      setNotice(messages.join(' '))
    },
    onError: error => setNotice((error as Error).message || 'Could not import categories.'),
  })

  if (!hasPermission('products.create')) {
    return <div className="rounded-2xl border border-error/20 bg-error/10 p-5 text-sm text-error">You do not have permission to import product categories.</div>
  }

  const loading = sharedCategoriesQuery.isLoading || businessCategoriesQuery.isLoading
  const loadFailed = sharedCategoriesQuery.isError || businessCategoriesQuery.isError

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link to={`${workspaceBase}/product-categories`} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"><ArrowLeftIcon className="h-4 w-4" />Back to categories</Link>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Shared catalogue</p>
        <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Import product categories</h1>
        <p className="mt-2 text-sm text-text-secondary">Select existing MtaaMall categories to add to your business.</p>
      </div>
      <Button onClick={() => inheritMutation.mutate()} loading={inheritMutation.isPending} disabled={!selectedIds.size}>Import selected categories</Button>
    </header>

    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-xl">
          <span className="sr-only">Search shared categories</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search category name or description..." className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <p className="shrink-0 text-sm text-text-secondary">{selectedIds.size} selected · {categories.length} available</p>
      </div>

      {notice && <p role="status" className="m-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary-dark">{notice}</p>}
      {loading ? <div className="py-20 text-center text-sm text-text-secondary"><ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />Loading shared categories...</div>
        : loadFailed ? <p role="alert" className="m-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">Could not load shared categories.</p>
        : categories.length === 0 ? <div className="py-20 text-center"><TagIcon className="mx-auto h-9 w-9 text-text-tertiary" /><p className="mt-3 font-semibold text-text">No categories available to import</p><p className="mt-1 text-sm text-text-secondary">Matching categories may already belong to this business.</p></div>
        : <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="w-20 px-4 py-3">Select</th><th className="w-1/3 px-4 py-3">Category name</th><th className="px-4 py-3">Description</th></tr></thead>
            <tbody className="divide-y divide-border">{categories.map(category => {
              const selected = selectedIds.has(category.public_id)
              return <tr key={category.public_id} className={selected ? 'bg-primary/5' : 'hover:bg-background/60'}>
                <td className="px-4 py-4"><input aria-label={`Select ${category.name}`} type="checkbox" checked={selected} onChange={() => toggleCategory(category.public_id)} className="h-4 w-4 accent-primary" /></td>
                <td className="px-4 py-4"><span className="inline-flex items-center gap-3 font-semibold text-text"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary-dark"><TagIcon className="h-4 w-4" /></span>{category.name}</span></td>
                <td className="px-4 py-4 text-text-secondary">{category.description?.trim() || 'No description available.'}</td>
              </tr>
            })}</tbody>
          </table>
        </div>}
    </section>

    <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur">
      <p className="text-sm font-medium text-text-secondary">{selectedIds.size} categor{selectedIds.size === 1 ? 'y' : 'ies'} selected</p>
      <Button onClick={() => inheritMutation.mutate()} loading={inheritMutation.isPending} disabled={!selectedIds.size}>Import selected categories</Button>
    </div>
  </div>
}

export default InheritProductCategoriesPage
