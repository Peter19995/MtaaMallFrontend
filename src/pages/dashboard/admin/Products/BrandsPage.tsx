import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EllipsisVerticalIcon, MagnifyingGlassIcon, PlusIcon, TagIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button, Select, TextArea, TextInput } from '@components/common'
import { useConfirmDialog } from '@contexts/ConfirmDialogContext'
import { listCountriesRequest } from '@api/modules/reference.api'
import {
  createBrandRequest,
  deleteBrandRequest,
  listBrandsRequest,
  ProductBrandResponse,
  updateBrandRequest,
} from '@api/modules/products.api'

const BrandsPage = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirmDialog()
  const brands = useQuery({ queryKey: ['products', 'brands'], queryFn: listBrandsRequest })
  const countries = useQuery({ queryKey: ['reference', 'countries'], queryFn: listCountriesRequest })
  const [selected, setSelected] = useState<ProductBrandResponse | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('Kenya')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredBrands = (brands.data ?? []).filter((brand) =>
    [brand.name, brand.country_of_origin, brand.description].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products', 'brands'] })
  const fillForm = (brand?: ProductBrandResponse | null) => {
    setName(brand?.name ?? '')
    setCountry(brand?.country_of_origin ?? 'Kenya')
    setDescription(brand?.description ?? '')
    setError(null)
  }
  useEffect(() => {
    if (!selected) return
    const fresh = brands.data?.find((brand) => brand.id === selected.id)
    if (fresh) setSelected(fresh)
  }, [brands.data, selected?.id])

  const createBrand = useMutation({
    mutationFn: () => createBrandRequest({ name: name.trim(), country_of_origin: country || undefined, description: description.trim() || undefined }),
    onSuccess: async () => { close(); await refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not create brand.'),
  })
  const updateBrand = useMutation({
    mutationFn: () => updateBrandRequest(selected!.id, { name: name.trim(), country_of_origin: country || undefined, description: description.trim() || undefined }),
    onSuccess: async () => { close(); await refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not update brand.'),
  })
  const deleteBrand = useMutation({
    mutationFn: () => deleteBrandRequest(selected!.id),
    onSuccess: async () => { close(); await refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not delete brand.'),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError('Brand name is required.')
    if (selected) updateBrand.mutate()
    else createBrand.mutate()
  }

  const close = () => { setSelected(null); setShowCreate(false); fillForm() }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-text"><TagIcon className="h-6 w-6 text-primary" />Brands</h1><p className="mt-1 text-sm text-text-secondary">Manage reusable product brands such as Kabras, Mumias and Brookside.</p></div>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { fillForm(); setShowCreate(true) }}>New Brand</Button>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <TextInput aria-label="Search brands" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search brands, countries or descriptions…" className="pl-9 pr-10" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-tertiary hover:bg-background hover:text-text" aria-label="Clear brand search"><XMarkIcon className="h-4 w-4" /></button>}
          </div>
          <p className="text-xs text-text-secondary">Showing {filteredBrands.length} of {(brands.data ?? []).length}</p>
        </div>
        {brands.isLoading ? <p className="p-6 text-sm text-text-secondary">Loading brands…</p> : (
          <div className="divide-y divide-border">
            {filteredBrands.map((brand) => (
              <div key={brand.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-background/60">
                <div><p className="font-semibold text-text">{brand.name}</p><p className="mt-1 text-xs text-text-secondary">{brand.country_of_origin || 'Origin not set'}{brand.description ? ` • ${brand.description}` : ''}</p></div>
                <button type="button" onClick={() => { setSelected(brand); fillForm(brand) }} className="rounded-lg border border-border p-2 text-text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary" aria-label={`Manage ${brand.name}`}><EllipsisVerticalIcon className="h-5 w-5" /></button>
              </div>
            ))}
            {filteredBrands.length === 0 && <p className="p-8 text-center text-sm text-text-secondary">{search ? 'No brands match your search.' : 'No brands have been created.'}</p>}
          </div>
        )}
      </section>

      {(selected || showCreate) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4"><h2 className="text-lg font-semibold text-text">{selected ? `Manage ${selected.name}` : 'Create brand'}</h2><button onClick={close} className="rounded-lg p-2 hover:bg-background"><XMarkIcon className="h-5 w-5" /></button></div>
            <form onSubmit={submit} className="space-y-4 p-6">
              <TextInput label="Brand name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kabras" />
              <Select
                label="Country of origin"
                value={country}
                onChange={(event) => setCountry(String(event.target.value))}
                disabled={countries.isLoading}
                options={[
                  { label: countries.isLoading ? 'Loading countries…' : 'Select a country', value: '' },
                  ...(countries.data ?? []).map((item) => ({
                    label: `${item.name} — ${item.currency_code}`,
                    value: item.name,
                  })),
                ]}
              />
              <TextArea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              {error && <p className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                {selected ? <Button type="button" variant="ghost" className="!border-error !bg-error !text-white hover:!bg-error-dark disabled:!bg-error/60" loading={deleteBrand.isPending} onClick={async () => { if (await confirm({ title: 'Delete brand?', message: `Delete ${selected.name}? This cannot be undone.` })) deleteBrand.mutate() }}><TrashIcon className="h-4 w-4" />Delete</Button> : <span />}
                <div className="flex gap-3"><Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="submit" loading={createBrand.isPending || updateBrand.isPending}>{selected ? 'Save Changes' : 'Create Brand'}</Button></div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrandsPage
