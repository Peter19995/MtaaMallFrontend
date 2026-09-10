import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import api from '@api/config/axios.config'
import { myMemberships, acceptMembership, type Scope } from '@api/modules/memberships.api'
import { type BusinessProfile } from '@api/modules/businesses.api'
import { switchWorkspace } from '@/components/common/WorkspaceSwitcher'
import { BusinessForm, ErrorNotice, panel, button, secondary } from '../dashboard/business/BusinessComponents'

export default function WorkspacesPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [switchError, setSwitchError] = useState<unknown>(null)
  const memberships = useQuery({ queryKey: ['memberships', 'me', user?.id], queryFn: myMemberships, refetchInterval: 30000 })
  const accept = useMutation({ mutationFn: ({ scope, id }: { scope: Scope; id: number }) => acceptMembership(scope, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['memberships'] }) })
  const create = useMutation({ mutationFn: (body: BusinessProfile) => api.post('/businesses/mine', body),
    onSuccess: () => { setCreating(false); return client.invalidateQueries({ queryKey: ['memberships'] }) } })
  const switchTo = async (context: string) => { try { await switchWorkspace(context) } catch (error) { setSwitchError(error) } }
  const rows = [
    ...(memberships.data?.platform_memberships ?? []).map(m => ({ ...m, scope: 'platform' as const, context: 'platform' })),
    ...(memberships.data?.business_memberships ?? []).map(m => ({ ...m, scope: 'business' as const, context: `business:${m.business_id}` }))
  ]
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
    <header><p className="text-sm font-semibold text-primary">One account, separate workspaces</p><h1 className="mt-2 text-3xl font-bold">Your workspaces</h1><p className="mt-3 text-slate-600">Shop personally, accept an invitation, or open a business. Permissions apply only to the workspace you choose.</p></header>
    <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="font-semibold">Personal shopping</h2><p className="text-sm text-slate-500">Your profile, cart, checkout and orders—even when you work for a business.</p></div><button className={button} onClick={() => switchTo('customer')}>Open personal profile</button></section>
    {memberships.isPending && <p role="status">Loading memberships…</p>}
    {memberships.isError && <ErrorNotice error={memberships.error} />}
    {accept.isError && <ErrorNotice error={accept.error} />}{switchError != null && <ErrorNotice error={switchError} />}
    <div className="grid gap-4 sm:grid-cols-2">{rows.map(m => <section key={`${m.scope}-${m.id}`} className={panel}>
      <div className="flex justify-between gap-3"><h2 className="font-semibold">{m.business_name}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">{m.status}</span></div>
      <p className="my-3 text-sm capitalize text-slate-600">{m.role.replace(/_/g, ' ')}{m.branch_scope === 'all' ? ' · All branches' : m.branch_ids.length ? ` · ${m.branch_ids.length} branch${m.branch_ids.length === 1 ? '' : 'es'}` : ' · No branch access'}</p>
      {m.status === 'active' && <button className={button} onClick={() => switchTo(m.context)}>Open workspace</button>}
      {m.status === 'invited' && <button className={button} disabled={accept.isPending} onClick={() => accept.mutate({ scope: m.scope, id: m.id })}>Accept invitation</button>}
      {['suspended', 'revoked'].includes(m.status) && <p className="text-sm text-slate-500">Access is unavailable. Contact the workspace owner.</p>}
    </section>)}</div>
    {rows.length === 0 && !memberships.isPending && !memberships.isError && <p>You have no business or platform invitations yet.</p>}
    <section className={panel}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Start another business</h2><p className="text-sm text-slate-500">You will be its first owner. No second login is needed.</p></div><button className={secondary} onClick={() => setCreating(!creating)}>{creating ? 'Cancel' : 'Create business'}</button></div>
      {create.isError && <ErrorNotice error={create.error} />}
      {creating && <div className="mt-6"><BusinessForm pending={create.isPending} onSave={body => create.mutate(body)} /></div>}
    </section>
    <Link className="text-primary hover:underline" to="/">Back to storefront</Link>
  </main>
}
