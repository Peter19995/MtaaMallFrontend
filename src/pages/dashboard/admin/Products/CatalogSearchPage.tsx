import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckBadgeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button, Select, TextArea, TextInput } from '@components/common'
import { useAuth } from '@hooks/useAuth'
import {
  listCatalogBrandsRequest,
  listCatalogCategoriesRequest,
  proposeCatalogProductRequest,
  searchCatalogProductsRequest,
  type CatalogProductSearchResult,
} from '@api/modules/catalog.api'
import {
  adoptCatalogProductRequest,
  listProductsRequest,
  updateProductCatalogueLinkRequest,
  type ProductResponse,
} from '@api/modules/products.api'
import { listTaxRatesRequest } from '@api/modules/finance.api'
import { resolveMediaUrl } from '@utils/media'

type SearchForm = {
  query: string
  brand: string
  manufacturerCode: string
  packageQuantity: string
  packageUnit: string
}
type ProposalForm = {
  name: string
  categoryId: string
  brandId: string
  description: string
  unitOfMeasure: string
  packageQuantity: string
  packageUnit: string
  identifierType: string
  identifierValue: string
  image: string
}

const EMPTY_SEARCH: SearchForm = { query: '', brand: '', manufacturerCode: '', packageQuantity: '', packageUnit: '' }
const EMPTY_PROPOSAL: ProposalForm = { name: '', categoryId: '', brandId: '', description: '', unitOfMeasure: '', packageQuantity: '', packageUnit: '', identifierType: 'ean', identifierValue: '', image: '' }

const listAllProducts = async () => {
  const products: ProductResponse[] = []
  for (let skip = 0; ; skip += 200) {
    const page = await listProductsRequest({ skip, limit: 200 })
    products.push(...page)
    if (page.length < 200) return products
  }
}

const matchLabel = (type: CatalogProductSearchResult['match_type']) => ({
  exact_identifier: 'Exact barcode',
  exact_manufacturer: 'Exact manufacturer code',
  exact_product: 'Exact product details',
  fuzzy: 'Suggested match',
  browse: 'Catalogue product',
}[type])

const suggestedSku = (product: CatalogProductSearchResult) =>
  `${product.name}${product.package_quantity ?? ''}${product.package_unit ?? ''}`
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)

type CatalogSearchPageProps = {
  initialView?: 'search' | 'proposal'
}

const CatalogSearchPage = ({ initialView = 'search' }: CatalogSearchPageProps) => {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const workspaceBase = location.pathname.startsWith('/employee') ? '/employee' : '/business'
  const queryClient = useQueryClient()
  const canLink = hasPermission('products.update')
  const canAdopt = hasPermission('products.create')
  const canPropose = hasPermission('catalog.products.propose')
  const [form, setForm] = useState<SearchForm>(EMPTY_SEARCH)
  const [submitted, setSubmitted] = useState<SearchForm | null>(null)
  const [linking, setLinking] = useState<CatalogProductSearchResult | null>(null)
  const [businessProductId, setBusinessProductId] = useState('')
  const [confirmedSuggestion, setConfirmedSuggestion] = useState(false)
  const [adoptionMode, setAdoptionMode] = useState<'new' | 'existing'>('new')
  const [adoption, setAdoption] = useState({ sku: '', sellingPrice: '', costPrice: '', taxRateId: '', availableOnline: false, descriptionOverride: '', imageOverride: '' })
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposal, setProposal] = useState<ProposalForm>(EMPTY_PROPOSAL)
  const [confirmProposal, setConfirmProposal] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (initialView === 'proposal' && canPropose) setProposalOpen(true)
  }, [canPropose, initialView])

  const searchQuery = useQuery({
    queryKey: ['catalog', 'search', submitted],
    queryFn: () => searchCatalogProductsRequest({
      q: submitted?.query.trim() ?? '',
      brand: submitted?.brand.trim() || undefined,
      manufacturer_code: submitted?.manufacturerCode.trim() || undefined,
      package_quantity: submitted?.packageQuantity.trim() || undefined,
      package_unit: submitted?.packageUnit.trim() || undefined,
    }),
    enabled: Boolean(submitted),
  })
  const productsQuery = useQuery({
    queryKey: ['products', 'list', 'catalog-link'],
    queryFn: listAllProducts,
    enabled: Boolean(linking),
  })
  const taxRatesQuery = useQuery({
    queryKey: ['finance', 'tax-rates'], queryFn: listTaxRatesRequest,
    enabled: Boolean(linking) && adoptionMode === 'new' && hasPermission('finance.read'),
  })
  const categoriesQuery = useQuery({
    queryKey: ['catalog', 'categories'], queryFn: listCatalogCategoriesRequest,
    enabled: proposalOpen,
  })
  const brandsQuery = useQuery({
    queryKey: ['catalog', 'brands'], queryFn: listCatalogBrandsRequest,
    enabled: proposalOpen,
  })

  const availableListings = useMemo(() => (productsQuery.data ?? []).filter(product =>
    !product.catalog_product_public_id || product.catalog_product_public_id === linking?.public_id
  ), [linking?.public_id, productsQuery.data])

  const linkMutation = useMutation({
    mutationFn: () => updateProductCatalogueLinkRequest(Number(businessProductId), linking!.public_id),
    onSuccess: product => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setNotice(`${product.name} is now linked to the approved catalogue product.`)
      setLinking(null)
      setBusinessProductId('')
      setConfirmedSuggestion(false)
    },
  })
  const adoptionMutation = useMutation({
    mutationFn: () => adoptCatalogProductRequest({
      catalog_product_id: linking!.public_id,
      business_sku: adoption.sku.trim(),
      selling_price: adoption.sellingPrice,
      cost_price: adoption.costPrice || null,
      tax_rate_id: adoption.taxRateId || null,
      available_online: adoption.availableOnline,
      description_override: adoption.descriptionOverride.trim() || null,
      image_override: adoption.imageOverride.trim() || null,
    }),
    onSuccess: product => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setNotice(`${product.name} was added to your business. Stock remains zero and the listing is not published online.`)
      setLinking(null)
    },
  })
  const proposalMutation = useMutation({
    mutationFn: () => proposeCatalogProductRequest({
      name: proposal.name.trim(),
      category_id: proposal.categoryId || null,
      brand_id: proposal.brandId || null,
      barcode: proposal.identifierValue.trim() || null,
      description: proposal.description.trim() || null,
      unit_of_measure: proposal.unitOfMeasure.trim() || null,
      package_quantity: proposal.packageQuantity ? Number(proposal.packageQuantity) : null,
      package_unit: proposal.packageUnit.trim() || null,
      image: proposal.image.trim() || null,
      confirm_create: confirmProposal,
    }),
    onSuccess: result => {
      if (result.outcome === 'matches_found') return
      setProposalOpen(false)
      setProposal(EMPTY_PROPOSAL)
      setConfirmProposal(false)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setNotice(`${result.proposal?.name ?? proposal.name} was submitted for review and a private, zero-stock business listing was created.`)
    },
  })

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    if (!form.query.trim() && !form.manufacturerCode.trim()) return
    setNotice(null)
    setSubmitted({ ...form })
  }
  const openProposal = () => {
    setProposal({
      ...EMPTY_PROPOSAL,
      name: form.query,
      packageQuantity: form.packageQuantity,
      packageUnit: form.packageUnit,
    })
    setProposalOpen(true)
    setConfirmProposal(false)
  }
  const submitProposal = (event: FormEvent) => {
    event.preventDefault()
    proposalMutation.mutate()
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Shared product data</p><h2 className="mt-1 text-2xl font-bold text-text sm:text-3xl">{initialView === 'proposal' ? 'Create product proposal' : 'Import existing product'}</h2><p className="mt-2 max-w-3xl text-sm text-text-secondary">Search approved products before creating duplicates. Your SKU, pricing, suppliers, stock and publication settings remain private to your business.</p></div><div className="flex flex-wrap gap-2"><Link to={`${workspaceBase}/products/import`} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${initialView === 'search' ? 'bg-primary text-white' : 'border border-border bg-white text-text-secondary hover:border-primary'}`}>Import existing product</Link>{canPropose && <button type="button" onClick={openProposal} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${initialView === 'proposal' ? 'bg-primary text-white' : 'border border-border bg-white text-text-secondary hover:border-primary'}`}>Create new product proposal</button>}</div></header>

    <section className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-primary-dark">Catalogue information</p><h3 className="mt-1 font-bold text-text">Shared across MtaaMall</h3><p className="mt-1 text-sm text-text-secondary">Choose a shared product as your starting point. After importing it, you can customize the name, category, description and selling details for your business without changing the shared source.</p></div>
      <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-secondary">Your listing</p><h3 className="mt-1 font-bold text-text">Visible and editable only by this business</h3><p className="mt-1 text-sm text-text-secondary">Your SKU, prices, tax, stock, overrides and marketplace publication remain under your business control.</p></div>
    </section>

    {notice && <div role="status" className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div>}

    <form onSubmit={submitSearch} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row"><TextInput label="Product name, barcode or code" value={form.query} onChange={event => setForm(current => ({ ...current, query: event.target.value }))} placeholder="Scan barcode or search product name" className="flex-1" /><Button type="submit" className="mt-auto flex h-11 items-center gap-2" disabled={!form.query.trim() && !form.manufacturerCode.trim()}><MagnifyingGlassIcon className="h-4 w-4" />Search catalogue</Button></div>
      <details className="mt-4 rounded-xl bg-background px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-text">Refine manufacturer or package details</summary><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><TextInput label="Brand" value={form.brand} onChange={event => setForm(current => ({ ...current, brand: event.target.value }))} placeholder="e.g. Coca-Cola" /><TextInput label="Manufacturer code" value={form.manufacturerCode} onChange={event => setForm(current => ({ ...current, manufacturerCode: event.target.value }))} placeholder="Requires brand" /><TextInput label="Package quantity" type="number" min="0.001" step="any" value={form.packageQuantity} onChange={event => setForm(current => ({ ...current, packageQuantity: event.target.value }))} placeholder="500" /><TextInput label="Package unit" value={form.packageUnit} onChange={event => setForm(current => ({ ...current, packageUnit: event.target.value }))} placeholder="ml" /></div></details>
    </form>

    {searchQuery.isFetching && <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-secondary">Searching approved catalogue products...</div>}
    {searchQuery.isError && <div role="alert" className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{(searchQuery.error as Error).message || 'Catalogue search failed.'}</div>}
    {submitted && !searchQuery.isFetching && !searchQuery.isError && searchQuery.data?.length === 0 && <section className="rounded-2xl border border-dashed border-border bg-white p-10 text-center"><MagnifyingGlassIcon className="mx-auto h-9 w-9 text-text-tertiary" /><h3 className="mt-3 font-bold text-text">No approved match found</h3><p className="mt-1 text-sm text-text-secondary">Try the exact barcode, brand and package size. If it is genuinely new, submit it for platform review.</p>{canPropose && <Button onClick={openProposal} className="mt-5 inline-flex items-center gap-2"><PlusIcon className="h-4 w-4" />Propose product</Button>}</section>}

    {(searchQuery.data?.length ?? 0) > 0 && <section className="space-y-3"><div className="flex items-end justify-between"><div><h3 className="font-bold text-text">Catalogue matches</h3><p className="text-xs text-text-tertiary">{searchQuery.data?.length} result{searchQuery.data?.length === 1 ? '' : 's'}</p></div>{canPropose && <Button variant="outline" onClick={openProposal}>No correct match? Propose one</Button>}</div>{searchQuery.data?.map(product => <article key={product.public_id} className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-[88px_1fr_auto] sm:items-center"><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl bg-background">{product.image ? <img src={resolveMediaUrl(product.image)} alt="" className="h-full w-full object-cover" /> : <PhotoIcon className="h-8 w-8 text-text-tertiary" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-text">{product.name}</h4><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.requires_confirmation ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{matchLabel(product.match_type)}</span></div><p className="mt-1 text-sm text-text-secondary">{[product.brand, product.package_quantity && product.package_unit ? `${product.package_quantity} ${product.package_unit}` : null, product.unit_of_measure].filter(Boolean).join(' · ') || 'No package details'}</p><p className="mt-1 text-xs text-text-tertiary">{product.category || 'Uncategorized'}{product.barcode ? ` · Barcode ${product.barcode}` : ''} · Used by {product.businesses_using} business{product.businesses_using === 1 ? '' : 'es'}</p>{product.requires_confirmation && <p className="mt-2 text-xs font-medium text-warning">This is a fuzzy suggestion. Compare the brand, package and barcode before linking.</p>}</div>{(canAdopt || canLink) && <Button variant="outline" className="flex items-center gap-2" onClick={() => { setLinking(product); setAdoptionMode(canAdopt ? 'new' : 'existing'); setAdoption({ sku: suggestedSku(product), sellingPrice: '', costPrice: '', taxRateId: '', availableOnline: false, descriptionOverride: '', imageOverride: '' }); setBusinessProductId(''); setConfirmedSuggestion(false) }}><LinkIcon className="h-4 w-4" />Use product</Button>}</article>)}</section>}

    <AnimatePresence>{linking && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="catalog-link-title" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-divider px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Use approved catalogue product</p><h3 id="catalog-link-title" className="mt-1 text-xl font-bold text-text">{linking.name}</h3></div><button type="button" aria-label="Close" onClick={() => setLinking(null)} className="rounded-lg p-2 text-text-tertiary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></header>
        <div className="space-y-4 p-6">
          {canAdopt && canLink && <div className="grid grid-cols-2 rounded-xl bg-background p-1"><button type="button" onClick={() => setAdoptionMode('new')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${adoptionMode === 'new' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Create new listing</button><button type="button" onClick={() => setAdoptionMode('existing')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${adoptionMode === 'existing' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Link existing listing</button></div>}

          {adoptionMode === 'new' && canAdopt ? <>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-primary/20 bg-primary/5 p-3"><strong className="text-sm text-text">Catalogue source</strong><p className="mt-1 text-xs text-text-secondary">The original shared product stays unchanged.</p></div><div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3"><strong className="text-sm text-text">Your listing</strong><p className="mt-1 text-xs text-text-secondary">After importing, its name, category, description, SKU, price and other selling details can be customized.</p></div></div>
            <p className="text-sm text-text-secondary">Create a business-owned listing from the shared product. No branch stock is created and the listing stays unpublished until you publish it separately.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Business SKU" required value={adoption.sku} onChange={event => setAdoption(current => ({ ...current, sku: event.target.value }))} />
              <TextInput label="Selling price" required type="number" min="0" step="0.01" value={adoption.sellingPrice} onChange={event => setAdoption(current => ({ ...current, sellingPrice: event.target.value }))} />
              <TextInput label="Cost price (optional)" type="number" min="0" step="0.01" value={adoption.costPrice} onChange={event => setAdoption(current => ({ ...current, costPrice: event.target.value }))} />
              {hasPermission('finance.read') && <Select label="Tax rate (optional)" searchable value={adoption.taxRateId} onChange={event => setAdoption(current => ({ ...current, taxRateId: event.target.value }))} options={[{ label: taxRatesQuery.isLoading ? 'Loading tax rates...' : 'No tax rate', value: '' }, ...(taxRatesQuery.data ?? []).map(rate => ({ label: `${rate.name} · ${rate.rate}%`, value: rate.public_id }))]} />}
              <div className="sm:col-span-2"><TextArea label="Description override (optional)" rows={3} value={adoption.descriptionOverride} onChange={event => setAdoption(current => ({ ...current, descriptionOverride: event.target.value }))} helperText="Leave blank to use the approved catalogue description." /></div>
              <div className="sm:col-span-2"><TextInput label="Image override URL (optional)" type="url" value={adoption.imageOverride} onChange={event => setAdoption(current => ({ ...current, imageOverride: event.target.value }))} helperText="Leave blank to use the approved catalogue image." /></div>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"><input type="checkbox" checked={adoption.availableOnline} onChange={event => setAdoption(current => ({ ...current, availableOnline: event.target.checked }))} className="mt-1 h-4 w-4 accent-primary" /><span className="text-sm text-text-secondary"><strong className="block text-text">Mark as eligible for online sale</strong>This does not publish the listing. Online publication remains a separate controlled action.</span></label>
            {linking.requires_confirmation && <label className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4"><input type="checkbox" checked={confirmedSuggestion} onChange={event => setConfirmedSuggestion(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span className="text-sm text-text-secondary"><strong className="block text-text">I confirmed this suggested match</strong>I compared the product name, brand, package size and available identifier.</span></label>}
            {adoptionMutation.isError && <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{(adoptionMutation.error as Error).message || 'Could not adopt product.'}</p>}
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setLinking(null)}>Cancel</Button><Button onClick={() => adoptionMutation.mutate()} loading={adoptionMutation.isPending} disabled={!adoption.sku.trim() || adoption.sellingPrice === '' || (linking.requires_confirmation && !confirmedSuggestion)}><CheckBadgeIcon className="mr-2 h-4 w-4" />Create listing</Button></div>
          </> : <>
            <p className="text-sm text-text-secondary">Choose an existing unlinked business listing. Its SKU, prices, tax and inventory remain unchanged.</p>
            <Select label="Business product" searchable value={businessProductId} onChange={event => setBusinessProductId(event.target.value)} options={[{ label: 'Select a product', value: '' }, ...availableListings.map(product => ({ label: `${product.name} · ${product.sku}`, value: product.id }))]} />
            {linking.requires_confirmation && <label className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4"><input type="checkbox" checked={confirmedSuggestion} onChange={event => setConfirmedSuggestion(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span className="text-sm text-text-secondary"><strong className="block text-text">I confirmed this suggested match</strong>I compared the product name, brand, package size and available identifier.</span></label>}
            {linkMutation.isError && <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{(linkMutation.error as Error).message || 'Could not link product.'}</p>}
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setLinking(null)}>Cancel</Button><Button onClick={() => linkMutation.mutate()} loading={linkMutation.isPending} disabled={!businessProductId || (linking.requires_confirmation && !confirmedSuggestion)}><CheckBadgeIcon className="mr-2 h-4 w-4" />Confirm link</Button></div>
          </>}
        </div>
      </motion.section>
    </motion.div>}</AnimatePresence>

    <AnimatePresence>{proposalOpen && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="dialog" aria-modal="true" aria-labelledby="proposal-title" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-divider px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Catalogue review</p><h3 id="proposal-title" className="mt-1 text-xl font-bold text-text">Propose a new product</h3></div><button type="button" aria-label="Close proposal" onClick={() => setProposalOpen(false)} className="rounded-lg p-2 text-text-tertiary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></header><form onSubmit={submitProposal} className="grid gap-4 p-6 sm:grid-cols-2"><TextInput label="Product name" required minLength={2} value={proposal.name} onChange={event => setProposal(current => ({ ...current, name: event.target.value }))} /><Select label="Global category (optional)" searchable value={proposal.categoryId} onChange={event => setProposal(current => ({ ...current, categoryId: event.target.value }))} options={[{ label: 'Select category', value: '' }, ...(categoriesQuery.data ?? []).map(item => ({ label: item.name, value: item.public_id }))]} /><Select label="Brand (optional)" searchable value={proposal.brandId} onChange={event => setProposal(current => ({ ...current, brandId: event.target.value }))} options={[{ label: 'Select brand', value: '' }, ...(brandsQuery.data ?? []).map(item => ({ label: item.name, value: item.public_id }))]} /><TextInput label="Unit of measure" value={proposal.unitOfMeasure} onChange={event => setProposal(current => ({ ...current, unitOfMeasure: event.target.value }))} placeholder="bottle, packet, piece" /><TextInput label="Package quantity" type="number" min="0.001" step="any" value={proposal.packageQuantity} onChange={event => setProposal(current => ({ ...current, packageQuantity: event.target.value }))} /><TextInput label="Package unit" value={proposal.packageUnit} onChange={event => setProposal(current => ({ ...current, packageUnit: event.target.value }))} placeholder="ml, g, kg" /><Select label="Barcode type" value={proposal.identifierType} onChange={event => setProposal(current => ({ ...current, identifierType: event.target.value }))} options={[{ label: 'EAN', value: 'ean' }, { label: 'GTIN', value: 'gtin' }, { label: 'UPC', value: 'upc' }]} /><TextInput label="Barcode (optional)" value={proposal.identifierValue} onChange={event => setProposal(current => ({ ...current, identifierValue: event.target.value }))} /><div className="sm:col-span-2"><TextInput label="Image URL (optional)" type="url" value={proposal.image} onChange={event => setProposal(current => ({ ...current, image: event.target.value }))} /></div><div className="sm:col-span-2"><TextArea label="Description" value={proposal.description} onChange={event => setProposal(current => ({ ...current, description: event.target.value }))} rows={3} /></div>{proposalMutation.data?.outcome === 'matches_found' && <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:col-span-2"><p className="text-sm font-bold text-text">Possible catalogue matches found</p>{proposalMutation.data.suggestions.map(match => <div key={match.public_id} className="rounded-lg bg-white p-3 text-sm"><strong>{match.name}</strong><p className="text-text-secondary">{[match.brand, match.package_quantity && match.package_unit ? `${match.package_quantity} ${match.package_unit}` : null, match.barcode].filter(Boolean).join(' · ')}</p></div>)}{proposalMutation.data.can_confirm_create ? <label className="flex gap-3 text-sm text-text-secondary"><input type="checkbox" checked={confirmProposal} onChange={event => setConfirmProposal(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />I checked these suggestions and confirm this is a different product.</label> : <p className="text-sm font-medium text-warning">This barcode already belongs to a catalogue product. Search and adopt that product instead.</p>}</div>}{proposalMutation.isError && <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error sm:col-span-2">{(proposalMutation.error as Error).message || 'Could not submit proposal.'}</p>}<div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setProposalOpen(false)}>Cancel</Button><Button type="submit" loading={proposalMutation.isPending} disabled={proposalMutation.data?.outcome === 'matches_found' && (!proposalMutation.data.can_confirm_create || !confirmProposal)}>{confirmProposal ? 'Confirm new product' : 'Check and submit'}</Button></div></form></motion.section></motion.div>}</AnimatePresence>
  </div>
}

export default CatalogSearchPage
