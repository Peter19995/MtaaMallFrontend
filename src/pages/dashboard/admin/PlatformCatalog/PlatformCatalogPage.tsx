import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckBadgeIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button, Select, TextArea, TextInput } from '@components/common'
import { useAuth } from '@hooks/useAuth'
import { listCatalogBrandsRequest, listCatalogCategoriesRequest } from '@api/modules/catalog.api'
import {
  decideCatalogProductRequest,
  getPlatformCatalogProductRequest,
  listCatalogProposalsRequest,
  listPlatformCatalogProductsRequest,
  mergeCatalogProductRequest,
  updatePlatformCatalogProductRequest,
  type CatalogReviewSummary,
} from '@api/modules/platformCatalog.api'
import { resolveMediaUrl } from '@utils/media'

type View = 'overview' | 'proposals' | 'products' | 'categories' | 'brands' | 'duplicates'
type Action = 'approve' | 'reject' | 'retire' | 'merge' | 'edit'

const tabs: Array<{ view: View; label: string; path: string }> = [
  { view: 'overview', label: 'Overview', path: '/platform/catalog' },
  { view: 'proposals', label: 'Proposals', path: '/platform/catalog/proposals' },
  { view: 'products', label: 'Products', path: '/platform/catalog/products' },
  { view: 'categories', label: 'Categories', path: '/platform/catalog/categories' },
  { view: 'brands', label: 'Brands', path: '/platform/catalog/brands' },
  { view: 'duplicates', label: 'Duplicates', path: '/platform/catalog/duplicates' },
]

const ProductRow = ({ product, open }: { product: CatalogReviewSummary; open: () => void }) => <tr className="border-b border-divider last:border-0">
  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-background">{product.image ? <img src={resolveMediaUrl(product.image)} alt="" className="h-full w-full object-cover" /> : <PhotoIcon className="h-5 w-5 text-text-tertiary" />}</span><div><p className="font-semibold text-text">{product.name}</p><p className="text-xs text-text-tertiary">{product.barcode || 'No barcode'}</p></div></div></td>
  <td className="px-4 py-3 text-sm text-text-secondary">{product.business_name || 'Platform'}</td>
  <td className="px-4 py-3 text-sm text-text-secondary">{[product.brand, product.package_quantity && product.package_unit ? `${product.package_quantity} ${product.package_unit}` : null].filter(Boolean).join(' · ') || '—'}</td>
  <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-dark">{product.status.replace(/_/g, ' ')}</span></td>
  <td className="px-4 py-3 text-right"><Button variant="outline" onClick={open}>Review</Button></td>
</tr>

const PlatformCatalogPage = ({ view }: { view: View }) => {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [survivor, setSurvivor] = useState('')
  const [edit, setEdit] = useState({ name: '', description: '', unit: '', quantity: '', packageUnit: '', image: '' })
  const proposals = useQuery({ queryKey: ['platform-catalog', 'proposals'], queryFn: listCatalogProposalsRequest, enabled: ['overview', 'proposals', 'duplicates'].includes(view) })
  const products = useQuery({ queryKey: ['platform-catalog', 'products'], queryFn: () => listPlatformCatalogProductsRequest(), enabled: ['overview', 'products'].includes(view) || Boolean(selectedId) })
  const categories = useQuery({ queryKey: ['catalog', 'categories'], queryFn: listCatalogCategoriesRequest, enabled: view === 'categories' })
  const brands = useQuery({ queryKey: ['catalog', 'brands'], queryFn: listCatalogBrandsRequest, enabled: view === 'brands' })
  const detail = useQuery({ queryKey: ['platform-catalog', 'product', selectedId], queryFn: () => getPlatformCatalogProductRequest(selectedId!), enabled: Boolean(selectedId) })

  const rows = useMemo(() => {
    const source = view === 'products' ? products.data ?? [] : proposals.data ?? []
    const needle = search.trim().toLowerCase()
    return source.filter(item => !needle || [item.name, item.barcode, item.business_name, item.brand].some(value => value?.toLowerCase().includes(needle)))
  }, [products.data, proposals.data, search, view])

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['platform-catalog'] })
    setAction(null)
    setReason('')
  }
  const decision = useMutation({ mutationFn: () => decideCatalogProductRequest(selectedId!, action as 'approve' | 'reject' | 'retire', reason), onSuccess: refresh })
  const merge = useMutation({ mutationFn: () => mergeCatalogProductRequest(selectedId!, survivor, reason), onSuccess: data => { refresh(); setSelectedId(data.public_id) } })
  const update = useMutation({ mutationFn: () => updatePlatformCatalogProductRequest(selectedId!, { name: edit.name.trim(), description: edit.description.trim() || null, unit_of_measure: edit.unit.trim() || null, package_quantity: edit.quantity ? Number(edit.quantity) : null, package_unit: edit.packageUnit.trim() || null, image: edit.image.trim() || null, reason }), onSuccess: refresh })
  const submit = (event: FormEvent) => { event.preventDefault(); if (action === 'merge') merge.mutate(); else if (action === 'edit') update.mutate(); else decision.mutate() }
  const begin = (next: Action) => {
    setAction(next); setReason(''); setSurvivor('')
    if (next === 'edit' && detail.data) setEdit({ name: detail.data.name, description: detail.data.description ?? '', unit: detail.data.unit_of_measure ?? '', quantity: detail.data.package_quantity?.toString() ?? '', packageUnit: detail.data.package_unit ?? '', image: detail.data.image ?? '' })
  }

  const counts = { pending: proposals.data?.length ?? 0, approved: products.data?.filter(item => item.status === 'approved').length ?? 0, duplicates: detail.data?.potential_duplicates.length ?? 0 }
  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-dark">Platform quality control</p><h2 className="mt-1 text-3xl font-bold text-text">Global catalogue</h2><p className="mt-2 text-sm text-text-secondary">Review shared product identity without changing any seller's pricing, inventory or sales history.</p></header>
    <nav className="flex gap-2 overflow-x-auto border-b border-divider pb-3">{tabs.map(tab => <Link key={tab.view} to={tab.path} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${view === tab.view ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-primary/5'}`}>{tab.label}</Link>)}</nav>

    {view === 'overview' && <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-white p-5"><p className="text-sm text-text-secondary">Pending review</p><p className="mt-2 text-3xl font-bold text-text">{counts.pending}</p></div><div className="rounded-2xl border border-border bg-white p-5"><p className="text-sm text-text-secondary">Approved products</p><p className="mt-2 text-3xl font-bold text-text">{counts.approved}</p></div><div className="rounded-2xl border border-border bg-white p-5"><p className="text-sm text-text-secondary">Quality policy</p><p className="mt-2 font-bold text-text">Review before reuse</p></div></div>}

    {['proposals', 'products', 'duplicates'].includes(view) && <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-divider p-4 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-bold text-text">{view === 'products' ? 'Catalogue products' : view === 'duplicates' ? 'Duplicate review queue' : 'Pending proposals'}</h3><p className="text-xs text-text-tertiary">{rows.length} record{rows.length === 1 ? '' : 's'}</p></div><TextInput label="Search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, barcode, brand or business" /></div><div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead className="bg-background text-left text-xs uppercase tracking-wide text-text-tertiary"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Proposed by</th><th className="px-4 py-3">Identity</th><th className="px-4 py-3">Status</th><th /></tr></thead><tbody>{rows.map(product => <ProductRow key={product.public_id} product={product} open={() => setSelectedId(product.public_id)} />)}</tbody></table></div></section>}

    {view === 'categories' && <section className="rounded-2xl border border-border bg-white p-5"><h3 className="font-bold text-text">Approved global categories</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.data?.map(item => <div key={item.public_id} className="rounded-xl border border-divider p-4"><p className="font-semibold text-text">{item.name}</p><p className="mt-1 text-xs text-text-tertiary">{item.slug}</p></div>)}</div></section>}
    {view === 'brands' && <section className="rounded-2xl border border-border bg-white p-5"><h3 className="font-bold text-text">Approved global brands</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{brands.data?.map(item => <div key={item.public_id} className="rounded-xl border border-divider p-4"><p className="font-semibold text-text">{item.name}</p><p className="mt-1 text-xs text-text-tertiary">Approved</p></div>)}</div></section>}

    <AnimatePresence>{selectedId && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl" initial={{ scale: .97 }} animate={{ scale: 1 }} exit={{ scale: .97 }}><header className="flex items-start justify-between border-b border-divider p-6"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-dark">Catalogue review</p><h3 className="mt-1 text-2xl font-bold text-text">{detail.data?.name ?? 'Loading product…'}</h3></div><button onClick={() => setSelectedId(null)} className="rounded-lg p-2 hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></header>{detail.data && <div className="space-y-6 p-6"><div className="grid gap-5 md:grid-cols-[180px_1fr]"><div className="grid h-44 place-items-center overflow-hidden rounded-2xl bg-background">{detail.data.image ? <img src={resolveMediaUrl(detail.data.image)} alt="" className="h-full w-full object-cover" /> : <PhotoIcon className="h-12 w-12 text-text-tertiary" />}</div><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-text-tertiary">Proposed business</dt><dd className="font-semibold text-text">{detail.data.business_name || 'Platform'}</dd></div><div><dt className="text-xs text-text-tertiary">Status</dt><dd className="font-semibold text-text">{detail.data.status.replace(/_/g, ' ')}</dd></div><div><dt className="text-xs text-text-tertiary">Barcode</dt><dd className="font-semibold text-text">{detail.data.barcode || 'None'}</dd></div><div><dt className="text-xs text-text-tertiary">Package</dt><dd className="font-semibold text-text">{[detail.data.package_quantity, detail.data.package_unit, detail.data.unit_of_measure].filter(Boolean).join(' · ') || 'Not provided'}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-text-tertiary">Description</dt><dd className="text-sm text-text-secondary">{detail.data.description || 'No description provided.'}</dd></div></dl></div>
      <div><h4 className="font-bold text-text">Potential duplicates</h4><div className="mt-2 space-y-2">{detail.data.potential_duplicates.length ? detail.data.potential_duplicates.map(item => <button key={item.public_id} onClick={() => setSelectedId(item.public_id)} className="flex w-full justify-between rounded-xl border border-warning/20 bg-warning/5 p-3 text-left"><span><strong className="text-text">{item.name}</strong><span className="ml-2 text-xs text-text-tertiary">{item.barcode}</span></span><span className="text-xs font-semibold text-warning">Compare</span></button>) : <p className="text-sm text-text-tertiary">No strong duplicate candidates.</p>}</div></div>
      <div><h4 className="font-bold text-text">Linked business listings</h4><div className="mt-2 divide-y divide-divider rounded-xl border border-border">{detail.data.linked_listings.length ? detail.data.linked_listings.map(item => <div key={item.public_id} className="flex justify-between p-3 text-sm"><span>{item.business_name}</span><span className="text-text-secondary">{item.sku}</span></div>) : <p className="p-3 text-sm text-text-tertiary">No linked listings.</p>}</div></div>
      <div><h4 className="font-bold text-text">Audit history</h4><div className="mt-2 space-y-2">{detail.data.audit_history.map((item, index) => <details key={`${item.created_at}-${index}`} className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold text-text">{item.action} · {new Date(item.created_at).toLocaleString()}</summary><p className="mt-2 text-sm text-text-secondary">{item.reason || 'No reason recorded'}</p><pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-xs">{JSON.stringify({ before: item.before, after: item.after }, null, 2)}</pre></details>)}</div></div>
      <div className="flex flex-wrap justify-end gap-2">{hasPermission('catalog.products.update') && <Button variant="outline" onClick={() => begin('edit')}>Edit</Button>}{hasPermission('catalog.products.merge') && detail.data.status !== 'merged' && <Button variant="outline" onClick={() => begin('merge')}>Merge</Button>}{hasPermission('catalog.products.retire') && detail.data.status === 'approved' && <Button variant="outline" onClick={() => begin('retire')}>Retire</Button>}{hasPermission('catalog.products.review') && detail.data.status === 'pending_review' && <><Button variant="outline" onClick={() => begin('reject')}>Reject</Button><Button onClick={() => begin('approve')}><CheckBadgeIcon className="mr-2 h-4 w-4" />Approve</Button></>}</div></div>}</motion.section></motion.div>}</AnimatePresence>

    <AnimatePresence>{action && <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form onSubmit={submit} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl" initial={{ scale: .97 }} animate={{ scale: 1 }}><div className="flex justify-between"><h3 className="text-xl font-bold capitalize text-text">{action} product</h3><button type="button" onClick={() => setAction(null)}><XMarkIcon className="h-5 w-5" /></button></div>{action === 'edit' && <div className="grid gap-4 sm:grid-cols-2"><TextInput label="Name" required value={edit.name} onChange={event => setEdit(current => ({ ...current, name: event.target.value }))} /><TextInput label="Unit" value={edit.unit} onChange={event => setEdit(current => ({ ...current, unit: event.target.value }))} /><TextInput label="Package quantity" type="number" min="0.001" step="any" value={edit.quantity} onChange={event => setEdit(current => ({ ...current, quantity: event.target.value }))} /><TextInput label="Package unit" value={edit.packageUnit} onChange={event => setEdit(current => ({ ...current, packageUnit: event.target.value }))} /><div className="sm:col-span-2"><TextInput label="Image URL" type="url" value={edit.image} onChange={event => setEdit(current => ({ ...current, image: event.target.value }))} /></div><div className="sm:col-span-2"><TextArea label="Description" value={edit.description} onChange={event => setEdit(current => ({ ...current, description: event.target.value }))} /></div></div>}{action === 'merge' && <Select label="Surviving approved product" searchable value={survivor} onChange={event => setSurvivor(event.target.value)} options={[{ label: 'Select survivor', value: '' }, ...(products.data ?? []).filter(item => item.status === 'approved' && item.public_id !== selectedId).map(item => ({ label: `${item.name}${item.barcode ? ` · ${item.barcode}` : ''}`, value: item.public_id }))]} />}<TextArea label="Reason" required minLength={3} value={reason} onChange={event => setReason(event.target.value)} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button type="submit" disabled={reason.trim().length < 3 || (action === 'merge' && !survivor)} loading={decision.isPending || merge.isPending || update.isPending}>Confirm {action}</Button></div></motion.form></motion.div>}</AnimatePresence>
  </div>
}

export default PlatformCatalogPage
