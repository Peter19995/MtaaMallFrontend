import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CubeIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button, Select, TextInput } from '@components/common'
import { useConfirmDialog } from '@contexts/ConfirmDialogContext'
import {
  createVariantOptionRequest,
  createVariantOptionValueRequest,
  deleteVariantOptionRequest,
  deleteVariantOptionValueRequest,
  listVariantOptionsRequest,
  ProductVariantOptionResponse,
  updateVariantOptionRequest,
  updateVariantOptionValueRequest,
} from '@api/modules/products.api'

const typeOptions = [
  { label: 'Select', value: 'select' },
  { label: 'Radio', value: 'radio' },
  { label: 'Swatch', value: 'swatch' },
  { label: 'Button', value: 'button' },
]

const VariantOptionsPage = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirmDialog()
  const variants = useQuery({ queryKey: ['products', 'variant-options'], queryFn: listVariantOptionsRequest })
  const [selected, setSelected] = useState<ProductVariantOptionResponse | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [optionName, setOptionName] = useState('')
  const [optionType, setOptionType] = useState('select')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('select')
  const [newValue, setNewValue] = useState('')
  const [editingValueId, setEditingValueId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredVariants = (variants.data ?? []).filter((option) =>
    [option.option_name, option.option_type, ...option.values.flatMap((value) => [value.value, value.display_value])]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products', 'variant-options'] })
  useEffect(() => {
    if (!selected) return
    const fresh = variants.data?.find((option) => option.id === selected.id)
    if (fresh) {
      setSelected(fresh)
      setOptionName(fresh.option_name)
      setOptionType(fresh.option_type)
    }
  }, [variants.data, selected?.id])

  const openManager = (option: ProductVariantOptionResponse) => {
    setSelected(option); setOptionName(option.option_name); setOptionType(option.option_type)
    setNewValue(''); setEditingValueId(null); setError(null)
  }

  const createOption = useMutation({
    mutationFn: () => createVariantOptionRequest({ option_name: newName.trim(), option_type: newType }),
    onSuccess: () => { setShowCreate(false); setNewName(''); setNewType('select'); setError(null); refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not create variant.'),
  })
  const updateOption = useMutation({
    mutationFn: () => updateVariantOptionRequest(selected!.id, { option_name: optionName.trim(), option_type: optionType }),
    onSuccess: refresh,
    onError: (caught: Error) => setError(caught.message || 'Could not update variant.'),
  })
  const removeOption = useMutation({
    mutationFn: () => deleteVariantOptionRequest(selected!.id),
    onSuccess: () => { setSelected(null); refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not delete variant.'),
  })
  const addValue = useMutation({
    mutationFn: () => createVariantOptionValueRequest(selected!.id, { value: newValue.trim(), display_value: newValue.trim(), sort_order: selected!.values.length }),
    onSuccess: () => { setNewValue(''); setError(null); refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not add value.'),
  })
  const updateValue = useMutation({
    mutationFn: () => updateVariantOptionValueRequest(editingValueId!, { value: editingValue.trim(), display_value: editingValue.trim() }),
    onSuccess: () => { setEditingValueId(null); setEditingValue(''); refresh() },
    onError: (caught: Error) => setError(caught.message || 'Could not update value.'),
  })
  const removeValue = useMutation({
    mutationFn: (id: number) => deleteVariantOptionValueRequest(id),
    onSuccess: refresh,
    onError: (caught: Error) => setError(caught.message || 'Could not delete value.'),
  })

  const submitCreate = (event: FormEvent) => {
    event.preventDefault()
    if (!newName.trim()) return setError('Variant name is required.')
    createOption.mutate()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-text"><CubeIcon className="h-6 w-6 text-primary" />Variant Options</h1><p className="mt-1 text-sm text-text-secondary">Manage reusable choices such as Weight, Volume, Size and Colour.</p></div>
        <Button onClick={() => { setShowCreate(true); setError(null) }} leftIcon={<PlusIcon className="h-4 w-4" />}>New Variant</Button>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <TextInput aria-label="Search variant options" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search variants, types or options…" className="pl-9 pr-10" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-tertiary hover:bg-background hover:text-text" aria-label="Clear variant search"><XMarkIcon className="h-4 w-4" /></button>}
          </div>
          <p className="text-xs text-text-secondary">Showing {filteredVariants.length} of {(variants.data ?? []).length}</p>
        </div>
        {variants.isLoading ? <p className="p-6 text-sm text-text-secondary">Loading variants…</p> : (
          <div className="divide-y divide-border">
            {filteredVariants.map((option) => (
              <div key={option.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-background/60">
                <div><p className="font-semibold text-text">{option.option_name}</p><p className="mt-1 text-xs text-text-secondary">{option.values.length} options • {option.option_type}</p></div>
                <button type="button" onClick={() => openManager(option)} className="rounded-lg border border-border p-2 text-text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary" aria-label={`Manage ${option.option_name}`}><EllipsisVerticalIcon className="h-5 w-5" /></button>
              </div>
            ))}
            {filteredVariants.length === 0 && <p className="p-8 text-center text-sm text-text-secondary">{search ? 'No variants match your search.' : 'No variants have been created.'}</p>}
          </div>
        )}
      </section>

      {(selected || showCreate) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) { setSelected(null); setShowCreate(false) } }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-text">{showCreate ? 'Create variant' : `Manage ${selected?.option_name}`}</h2>
              <button onClick={() => { setSelected(null); setShowCreate(false) }} className="rounded-lg p-2 hover:bg-background"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            {showCreate ? (
              <form onSubmit={submitCreate} className="space-y-4 p-6">
                <TextInput label="Variant name" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Flavour" />
                <Select label="Display type" options={typeOptions} value={newType} onChange={(e) => setNewType(String(e.target.value))} />
                {error && <p className="text-sm text-error">{error}</p>}
                <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" loading={createOption.isPending}>Create</Button></div>
              </form>
            ) : selected ? (
              <div className="space-y-6 p-6">
                <section className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Variant name" value={optionName} onChange={(e) => setOptionName(e.target.value)} />
                  <Select label="Display type" options={typeOptions} value={optionType} onChange={(e) => setOptionType(String(e.target.value))} />
                  <div className="sm:col-span-2 flex justify-between gap-3"><Button onClick={() => updateOption.mutate()} loading={updateOption.isPending}>Save Details</Button><Button variant="ghost" className="!border-error !bg-error !text-white hover:!bg-error-dark disabled:!bg-error/60" onClick={async () => { if (await confirm({ title: 'Delete variant?', message: `Delete ${selected.option_name} and all its options? This cannot be undone.` })) removeOption.mutate() }} loading={removeOption.isPending}><TrashIcon className="h-4 w-4" />Delete Variant</Button></div>
                </section>

                <section className="border-t border-border pt-5">
                  <h3 className="font-semibold text-text">Options</h3>
                  <div className="mt-3 space-y-2">
                    {selected.values.map((value) => (
                      <div key={value.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                        {editingValueId === value.id ? <TextInput value={editingValue} onChange={(e) => setEditingValue(e.target.value)} className="flex-1" /> : <span className="flex-1 text-sm font-medium text-text">{value.display_value || value.value}</span>}
                        {editingValueId === value.id ? <><Button size="sm" onClick={() => updateValue.mutate()} loading={updateValue.isPending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingValueId(null)}>Cancel</Button></> : <><Button size="sm" variant="ghost" onClick={() => { setEditingValueId(value.id); setEditingValue(value.display_value || value.value) }}>Edit</Button><button onClick={async () => { if (await confirm({ title: 'Delete option?', message: `Delete ${value.display_value || value.value}? This cannot be undone.` })) removeValue.mutate(value.id) }} className="rounded-md border border-error bg-error p-2 text-white hover:bg-error-dark disabled:bg-error/60" aria-label={`Delete ${value.value}`}><TrashIcon className="h-4 w-4" /></button></>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-end gap-3"><div className="flex-1"><TextInput label="Add option" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Enter a new option" /></div><Button onClick={() => { if (newValue.trim()) addValue.mutate() }} loading={addValue.isPending}><PlusIcon className="h-4 w-4" />Add</Button></div>
                </section>
                {error && <p className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default VariantOptionsPage
