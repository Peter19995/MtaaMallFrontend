import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

import { Button } from '@components/common'
import { useAuth } from '@hooks/useAuth'
import {
  listCatalogProductsRequest,
  type CatalogProductSearchResult,
} from '@api/modules/catalog.api'
import {
  adoptCatalogProductRequest,
  listProductsRequest,
  updateProductRequest,
  type ProductResponse,
} from '@api/modules/products.api'

type InheritValues = {
  reorderLevel: string
  stockQuantity: string
  sellingPrice: string
  maxOffer: string
}

const DEFAULT_VALUES: InheritValues = {
  reorderLevel: '5',
  stockQuantity: '0',
  sellingPrice: '0',
  maxOffer: '0',
}

const loadAllCatalogueProducts = async () => {
  const products: CatalogProductSearchResult[] = []
  for (let skip = 0; ; skip += 200) {
    const page = await listCatalogProductsRequest({ skip, limit: 200 })
    products.push(...page)
    if (page.length < 200) return products
  }
}

const loadAllBusinessProducts = async () => {
  const products: ProductResponse[] = []
  for (let skip = 0; ; skip += 200) {
    const page = await listProductsRequest({ skip, limit: 200 })
    products.push(...page)
    if (page.length < 200) return products
  }
}

const numberValue = (value: string, label: string, productName: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} for ${productName} must be 0 or greater.`)
  }
  return parsed
}

const InheritProductsPage = () => {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const workspaceBase = location.pathname.startsWith('/employee') ? '/employee' : '/business'
  const [search, setSearch] = useState('')
  const [selections, setSelections] = useState<Record<string, InheritValues>>({})
  const [inheritedIds, setInheritedIds] = useState<Set<string>>(() => new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const catalogueQuery = useQuery({
    queryKey: ['catalog', 'products', 'inherit-page'],
    queryFn: loadAllCatalogueProducts,
  })
  const businessProductsQuery = useQuery({
    queryKey: ['products', 'inherit-existing', 'all'],
    queryFn: loadAllBusinessProducts,
  })

  const adoptedIds = useMemo(() => new Set(
    (businessProductsQuery.data ?? [])
      .map(product => product.catalog_product_public_id)
      .filter((value): value is string => Boolean(value)),
  ), [businessProductsQuery.data])

  const products = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return (catalogueQuery.data ?? []).filter(product => {
      if (adoptedIds.has(product.public_id) || inheritedIds.has(product.public_id)) return false
      if (!query) return true
      return [product.name, product.category, product.description]
        .some(value => value?.toLocaleLowerCase().includes(query))
    })
  }, [adoptedIds, catalogueQuery.data, inheritedIds, search])

  const selectedCount = Object.keys(selections).length

  const toggleProduct = (productId: string) => {
    setSelections(current => {
      const next = { ...current }
      if (next[productId]) delete next[productId]
      else next[productId] = { ...DEFAULT_VALUES }
      return next
    })
    setNotice(null)
  }

  const updateValue = (productId: string, key: keyof InheritValues, value: string) => {
    setSelections(current => ({
      ...current,
      [productId]: { ...(current[productId] ?? DEFAULT_VALUES), [key]: value },
    }))
  }

  const inheritMutation = useMutation({
    mutationFn: async () => {
      const selected = Object.entries(selections)
      if (!selected.length) throw new Error('Select at least one product to inherit.')

      const inherited: Array<{ publicId: string; name: string }> = []
      const failed: string[] = []
      const updateWarnings: string[] = []
      for (const [publicId, values] of selected) {
        const product = (catalogueQuery.data ?? []).find(item => item.public_id === publicId)
        if (!product) continue
        try {
          const reorderLevel = numberValue(values.reorderLevel, 'Reorder level', product.name)
          const stockQuantity = numberValue(values.stockQuantity, 'Stock quantity', product.name)
          const sellingPrice = numberValue(values.sellingPrice, 'Selling price', product.name)
          const maxOffer = numberValue(values.maxOffer, 'Maximum offer', product.name)
          const adopted = await adoptCatalogProductRequest({
            catalog_product_id: product.public_id,
            business_sku: `CAT-${product.public_id.slice(0, 8).toUpperCase()}`,
            selling_price: String(sellingPrice),
            available_online: false,
          })
          inherited.push({ publicId: product.public_id, name: product.name })
          try {
            await updateProductRequest(adopted.id, {
              reorder_level: reorderLevel,
              stock_quantity: stockQuantity,
              selling_price: sellingPrice,
              max_offer: maxOffer,
              is_on_offer: maxOffer > 0,
              is_active: true,
              is_published: false,
              available_online: false,
            })
          } catch {
            updateWarnings.push(product.name)
          }
        } catch {
          failed.push(product.name)
        }
      }
      return { inherited, failed, updateWarnings }
    },
    onSuccess: ({ inherited, failed, updateWarnings }) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      const inheritedPublicIds = new Set(inherited.map(product => product.publicId))
      setInheritedIds(current => new Set([...current, ...inheritedPublicIds]))
      setSelections(current => Object.fromEntries(
        Object.entries(current).filter(([id]) => !inheritedPublicIds.has(id)),
      ))
      const messages = [`${inherited.length} product(s) inherited successfully.`]
      if (failed.length) messages.push(`Could not inherit: ${failed.join(', ')}.`)
      if (updateWarnings.length) messages.push(`Review stock or pricing for: ${updateWarnings.join(', ')}.`)
      setNotice(messages.join(' '))
    },
    onError: error => setNotice((error as Error).message || 'Could not inherit products.'),
  })

  if (!hasPermission('products.create')) {
    return <div className="rounded-2xl border border-error/20 bg-error/10 p-5 text-sm text-error">You do not have permission to inherit products.</div>
  }

  const loading = catalogueQuery.isLoading || businessProductsQuery.isLoading
  const failedToLoad = catalogueQuery.isError || businessProductsQuery.isError

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={`${workspaceBase}/products`} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark">
            <ArrowLeftIcon className="h-4 w-4" /> Back to products
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Shared catalogue</p>
          <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Inherit products</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Select multiple existing products and enter the stock and pricing values for your business.</p>
        </div>
        <Button
          onClick={() => inheritMutation.mutate()}
          loading={inheritMutation.isPending}
          disabled={!selectedCount}
        >
          Inherit {selectedCount || ''} selected product{selectedCount === 1 ? '' : 's'}
        </Button>
      </header>

      <section className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-xl">
            <span className="sr-only">Search shared products</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name, category or description..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <p className="shrink-0 text-sm text-text-secondary">{selectedCount} selected · {products.length} available</p>
        </div>

        {notice && <p role="status" className="m-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary-dark">{notice}</p>}
        {loading ? (
          <div className="py-20 text-center text-sm text-text-secondary"><ArrowPathIcon className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />Loading shared products...</div>
        ) : failedToLoad ? (
          <p role="alert" className="m-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">Could not load shared products.</p>
        ) : products.length === 0 ? (
          <div className="py-20 text-center"><p className="font-semibold text-text">No products available to inherit</p><p className="mt-1 text-sm text-text-secondary">Try another search, or the matching products already belong to this business.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="w-12 px-4 py-3">Select</th>
                  <th className="min-w-48 px-4 py-3">Product name</th>
                  <th className="min-w-40 px-4 py-3">Category</th>
                  <th className="min-w-64 px-4 py-3">Description</th>
                  <th className="w-32 px-3 py-3">Reorder level</th>
                  <th className="w-32 px-3 py-3">Stock quantity</th>
                  <th className="w-32 px-3 py-3">Selling price</th>
                  <th className="w-36 px-3 py-3">Maximum offer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map(product => {
                  const values = selections[product.public_id]
                  const selected = Boolean(values)
                  return (
                    <tr key={product.public_id} className={selected ? 'bg-primary/5' : 'hover:bg-background/60'}>
                      <td className="px-4 py-3 align-top">
                        <input aria-label={`Select ${product.name}`} type="checkbox" checked={selected} onChange={() => toggleProduct(product.public_id)} className="h-4 w-4 accent-primary" />
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-text">{product.name}</td>
                      <td className="px-4 py-3 align-top text-primary-dark">{product.category ?? 'Uncategorized'}</td>
                      <td className="px-4 py-3 align-top text-xs leading-5 text-text-secondary">{product.description || 'No description available.'}</td>
                      {([
                        ['reorderLevel', 'Reorder level'],
                        ['stockQuantity', 'Stock quantity'],
                        ['sellingPrice', 'Selling price'],
                        ['maxOffer', 'Maximum offer'],
                      ] as const).map(([key, label]) => (
                        <td key={key} className="px-3 py-3 align-top">
                          <input
                            aria-label={`${label} for ${product.name}`}
                            type="number"
                            min={0}
                            step={key === 'sellingPrice' || key === 'maxOffer' ? '0.01' : '1'}
                            value={values?.[key] ?? DEFAULT_VALUES[key]}
                            disabled={!selected}
                            onChange={event => updateValue(product.public_id, key, event.target.value)}
                            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-divider/30 disabled:text-text-tertiary"
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm font-medium text-text-secondary">{selectedCount} product{selectedCount === 1 ? '' : 's'} selected</p>
        <Button onClick={() => inheritMutation.mutate()} loading={inheritMutation.isPending} disabled={!selectedCount}>
          Inherit selected products
        </Button>
      </div>
    </div>
  )
}

export default InheritProductsPage
