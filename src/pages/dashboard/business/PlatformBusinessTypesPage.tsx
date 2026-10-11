import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  createBusinessType, deleteBusinessType, listPlatformBusinessTypes, updateBusinessType,
  type BusinessType,
} from '@api/modules/businesses.api'
import { useAuth } from '@hooks/useAuth'
import { useSiteDialog } from '@components/common'

const field = 'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const message = (error: unknown) => axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
  ? error.response.data.detail : 'The operation could not be completed.'

export default function PlatformBusinessTypesPage() {
  const { hasPermission } = useAuth()
  const dialog = useSiteDialog()
  const client = useQueryClient()
  const [editing, setEditing] = useState<BusinessType | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const list = useQuery({ queryKey: ['platform-business-types'], queryFn: listPlatformBusinessTypes })
  const refresh = () => client.invalidateQueries({ queryKey: ['platform-business-types'] })
  const save = useMutation({
    mutationFn: () => editing === 'new'
      ? createBusinessType({ name: name.trim(), description: description.trim() || undefined })
      : updateBusinessType(editing!.public_id, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: async () => { setEditing(null); await refresh() },
  })
  const toggle = useMutation({ mutationFn: (type: BusinessType) => updateBusinessType(type.public_id, { is_active: !type.is_active }), onSuccess: refresh })
  const remove = useMutation({ mutationFn: deleteBusinessType, onSuccess: refresh })
  const open = (type: BusinessType | 'new') => {
    setEditing(type); setName(type === 'new' ? '' : type.name); setDescription(type === 'new' ? '' : type.description ?? ''); save.reset()
  }
  const canManage = hasPermission('platform.admins.manage')

  return <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-gradient-to-br from-text via-text to-primary-dark p-7 text-white shadow-lg">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-primary-light">Platform settings</p><h1 className="mt-2 text-3xl font-bold">Business types</h1><p className="mt-2 text-sm text-white/70">Control the choices shown during business registration.</p></div>
      {canManage && <button onClick={() => open('new')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-text"><PlusIcon className="h-4 w-4" />Add business type</button>}
    </header>

    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-divider px-5 py-4"><h2 className="font-semibold text-text">Available types</h2><p className="text-xs text-text-tertiary">Inactive types are hidden from new registrations but remain on existing businesses.</p></div>
      {list.isPending && <p className="p-6 text-sm text-text-secondary">Loading business types…</p>}
      {list.isError && <p className="m-5 rounded-xl bg-error/10 p-4 text-sm text-error">{message(list.error)}</p>}
      <div className="divide-y divide-divider">{list.data?.map(type => <article key={type.public_id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-semibold text-text">{type.name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${type.is_active ? 'bg-success/10 text-success-dark' : 'bg-background text-text-tertiary'}`}>{type.is_active ? 'Active' : 'Inactive'}</span></div><p className="mt-1 text-sm text-text-secondary">{type.description || 'No description'}</p><p className="mt-1 text-xs text-text-tertiary">Code: {type.code}</p></div>
        {canManage && <div className="flex items-center gap-2"><button onClick={() => open(type)} className="rounded-lg border border-border p-2 text-text-secondary hover:border-primary hover:text-primary" title="Edit"><PencilSquareIcon className="h-4 w-4" /></button><button onClick={() => toggle.mutate(type)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:border-primary">{type.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={async () => { if (await dialog.confirm({ title: 'Delete business type?', message: 'Only unused business types can be deleted.', tone: 'danger' })) remove.mutate(type.public_id, { onError: error => dialog.alert({ title: 'Cannot delete business type', message: message(error) }) }) }} className="rounded-lg border border-error/20 p-2 text-error hover:bg-error/10" title="Delete"><TrashIcon className="h-4 w-4" /></button></div>}
      </article>)}</div>
    </section>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="business-type-title"><form onSubmit={event => { event.preventDefault(); save.mutate() }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 id="business-type-title" className="text-xl font-bold text-text">{editing === 'new' ? 'Add business type' : 'Edit business type'}</h2><p className="mt-1 text-sm text-text-secondary">This name will appear in the registration dropdown.</p><label className="mt-5 block text-sm font-semibold text-text">Name<input autoFocus required minLength={2} maxLength={150} className={field} value={name} onChange={event => setName(event.target.value)} /></label><label className="mt-4 block text-sm font-semibold text-text">Description <span className="font-normal text-text-tertiary">(optional)</span><textarea rows={3} maxLength={1000} className={field} value={description} onChange={event => setDescription(event.target.value)} /></label>{save.isError && <p className="mt-4 rounded-xl bg-error/10 p-3 text-sm text-error">{message(save.error)}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary">Cancel</button><button disabled={save.isPending || name.trim().length < 2} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save business type'}</button></div></form></div>}
  </div>
}
