import { downloadBusinessDocument } from '@api/modules/businesses.api'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { createBusiness, decideBusiness, getBusiness, listBusinesses, type Business, type BusinessStatus } from '@api/modules/businesses.api'
import { statusLabels, isPlatformOperator } from '@utils/businessLifecycle'
import { BusinessDetails, BusinessForm, ErrorNotice, StatusBadge, button, secondary } from './BusinessComponents'
import { useSiteDialog } from '@components/common'

const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm'
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
type ReviewAction = 'activate' | 'reject' | 'suspend' | 'reactivate'

const actionsFor = (business: Business, hasPermission: (permission: string) => boolean) => {
  const actions: { value: ReviewAction; label: string; danger?: boolean }[] = []
  if (business.status === 'pending_verification' && hasPermission('platform.businesses.activate') && hasPermission('platform.businesses.review'))
    actions.push({ value: 'activate', label: 'Approve & activate' })
  if (business.status === 'pending_verification' && hasPermission('platform.businesses.review'))
    actions.push({ value: 'reject', label: 'Reject application', danger: true })
  if (business.status === 'active' && hasPermission('platform.businesses.suspend'))
    actions.push({ value: 'suspend', label: 'Suspend business', danger: true })
  if (business.status === 'suspended' && hasPermission('platform.businesses.activate'))
    actions.push({ value: 'reactivate', label: 'Reactivate business' })
  return actions
}

export default function PlatformBusinessesPage() {
  const siteDialog = useSiteDialog()
  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const selected = params.get('business')
  const [filter, setFilter] = useState<BusinessStatus | ''>('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [ownerUsername, setOwnerUsername] = useState('')
  const [decision, setDecision] = useState<ReviewAction | null>(null)
  const [reason, setReason] = useState('')

  const list = useQuery({ queryKey: ['businesses', 'list', user?.id, filter], queryFn: () => listBusinesses(filter || undefined) })
  const detail = useQuery({ queryKey: ['businesses', 'detail', user?.id, selected], queryFn: () => getBusiness(selected!), enabled: Boolean(selected), refetchInterval: 30000 })
  const create = useMutation({ mutationFn: createBusiness, onSuccess: async business => {
    setCreating(false)
    setParams({ business: business.public_id })
    await queryClient.invalidateQueries({ queryKey: ['businesses'] })
  } })
  const review = useMutation({
    mutationFn: () => decideBusiness(selected!, decision!, reason.trim()),
    onSuccess: async () => {
      setDecision(null)
      setReason('')
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
      await queryClient.invalidateQueries({ queryKey: ['tenant-state'] })
    },
  })

  const businesses = list.data?.filter(item => `${item.display_name} ${item.legal_name} ${item.public_id}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const pending = list.data?.filter(item => item.status === 'pending_verification').length ?? 0
  const active = list.data?.filter(item => item.status === 'active').length ?? 0
  const suspended = list.data?.filter(item => item.status === 'suspended').length ?? 0
  const business = detail.data?.business
  const availableActions = business ? actionsFor(business, hasPermission) : []

  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Trust & operations</p><h1 className="mt-2 text-3xl font-bold">Business review centre</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Review registrations, verify evidence and make traceable lifecycle decisions from one workspace.</p></div>
        {isPlatformOperator(user) && hasPermission('platform.businesses.create') && <button className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20" onClick={() => { create.reset(); setCreating(!creating) }}>{creating ? 'Cancel creation' : 'New business'}</button>}
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[['Awaiting review', pending, 'text-amber-300'], ['Active businesses', active, 'text-emerald-300'], ['Suspended', suspended, 'text-rose-300']].map(([label, count, color]) => <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10"><p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{count}</p></div>)}
      </div>
    </header>

    {creating && <section className={`${card} p-6`}><h2 className="text-lg font-semibold">Create a draft business</h2><p className="mb-5 mt-1 text-sm text-slate-500">Connect an existing user as the first owner.</p><label className="mb-4 block text-sm font-medium">Owner username<input className="mt-1 block w-full rounded-xl border border-slate-200 p-3" value={ownerUsername} onChange={event => setOwnerUsername(event.target.value)} minLength={3} required /></label>{create.isError && <ErrorNotice error={create.error} />}<BusinessForm pending={create.isPending} onSave={body => create.mutate({ ...body, owner_username: ownerUsername.trim() })} /></section>}

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.5fr)]">
      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Review queue</h2><p className="mt-1 text-xs text-slate-500">{businesses.length} businesses in this view</p></div><button className={secondary} disabled={list.isFetching} onClick={() => list.refetch()}>Refresh</button></div>
          <input aria-label="Search businesses" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" placeholder="Search name or business ID" value={search} onChange={event => setSearch(event.target.value)} />
          <select aria-label="Business status" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" value={filter} onChange={event => setFilter(event.target.value as BusinessStatus | '')}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        {list.isPending && <p className="p-6" role="status">Loading review queue…</p>}{list.isError && <div className="p-5"><ErrorNotice error={list.error} /></div>}
        {!list.isPending && !list.isError && !businesses.length && <p className="p-8 text-center text-sm text-slate-500">No businesses match this view.</p>}
        <div className="max-h-[720px] divide-y divide-slate-100 overflow-y-auto">{businesses.map(item => <button key={item.public_id} onClick={() => { setDecision(null); setReason(''); setParams({ business: item.public_id }) }} className={`w-full p-5 text-left transition hover:bg-slate-50 ${selected === item.public_id ? 'bg-emerald-50/70 shadow-[inset_3px_0_0_#10b981]' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{item.display_name}</p><p className="mt-1 truncate text-xs text-slate-500">{item.registration_number || 'No registration number'}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-xs text-slate-400">Submitted {date(item.created_at)}</p></button>)}</div>
      </section>

      <main className="min-w-0 space-y-5">
        {!selected && <section className={`${card} flex min-h-[360px] items-center justify-center p-8 text-center`}><div><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">✓</div><h2 className="mt-4 text-xl font-semibold">Select a business to review</h2><p className="mt-2 max-w-md text-sm text-slate-500">Open a queue item to inspect its profile, submitted documents, account activity and decision history.</p></div></section>}
        {detail.isPending && <section className={`${card} p-8`} role="status">Loading business review…</section>}
        {detail.isError && <section className={`${card} space-y-3 p-6`}><ErrorNotice error={detail.error} /><button className={secondary} onClick={() => detail.refetch()}>Retry details</button></section>}
        {detail.data && business && !detail.isError && <>
          <BusinessDetails business={business} />

          <section className={`${card} p-5 sm:p-6`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Review decision</h2><p className="mt-1 text-sm text-slate-500">Every action records your identity and a required reason.</p></div><StatusBadge status={business.status} /></div>
            {!availableActions.length && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No lifecycle decisions are available for your permissions and this status.</p>}
            {!decision && <div className="mt-5 flex flex-wrap gap-3">{availableActions.map(action => <button key={action.value} className={action.danger ? 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100' : button} onClick={() => { review.reset(); setDecision(action.value) }}>{action.label}</button>)}</div>}
            {decision && <form className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" onSubmit={event => { event.preventDefault(); review.mutate() }}><h3 className="font-semibold">Confirm {titleCase(decision)}</h3><label className="mt-3 block text-sm font-medium">Decision reason<textarea aria-label="Decision reason" autoFocus required minLength={3} maxLength={1000} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3" placeholder="Record the evidence and reason for this decision" value={reason} onChange={event => setReason(event.target.value)} /></label>{review.isError && <div className="mt-3"><ErrorNotice error={review.error} /></div>}<div className="mt-4 flex gap-3"><button className={button} disabled={review.isPending || reason.trim().length < 3}>{review.isPending ? 'Saving decision…' : 'Confirm decision'}</button><button type="button" className={secondary} disabled={review.isPending} onClick={() => { setDecision(null); setReason('') }}>Cancel</button></div></form>}
          </section>

          <section className={`${card} p-5 sm:p-6`}><h2 className="font-semibold">Submitted documents</h2><p className="mt-1 text-sm text-slate-500">Evidence supplied by the business owner during onboarding.</p>{!detail.data.documents.length ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No verification documents submitted.</p> : <div className="mt-4 divide-y divide-slate-100">{detail.data.documents.map(document => <div key={document.public_id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{document.file_name}</p><p className="mt-1 text-xs text-slate-500">{titleCase(document.document_type)} · {date(document.submitted_at)}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{titleCase(document.status)}</span><button className="text-sm font-semibold text-primary hover:underline" onClick={() => downloadBusinessDocument(document).catch(() => siteDialog.alert({ title: 'Document unavailable', message: 'Ask the business owner to resubmit legacy external documents.' }))}>Download document</button></div></div>)}</div>}</section>

          <section className={`${card} p-5 sm:p-6`}><h2 className="font-semibold">Account activity</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[
            ['Owner email', detail.data.activity.owner_email_verified ? 'Verified' : 'Not verified'], ['Owner last login', date(detail.data.activity.owner_last_login)], ['Owner account created', date(detail.data.activity.owner_created_at)], ['Team members', `${detail.data.activity.active_members} active of ${detail.data.activity.total_members}`], ['Last status change', date(detail.data.activity.last_status_change_at)], ['Registered branches', String(business.branches.length)],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}</div></section>

          {hasPermission('platform.audit.read') && <section className={`${card} p-5 sm:p-6`}><h2 className="font-semibold">Audit history</h2><p className="mt-1 text-sm text-slate-500">Immutable lifecycle events with actor and reason.</p>{!detail.data.audit_history.length ? <p className="mt-4 text-sm text-slate-500">No audit entries available.</p> : <ol className="mt-4 border-l border-slate-200 pl-5">{detail.data.audit_history.map(entry => <li key={entry.id} className="relative pb-5 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" /><p className="text-sm font-semibold">{entry.from_status ? titleCase(entry.from_status) : 'Created'} → {titleCase(entry.to_status)}</p><p className="mt-1 text-sm text-slate-600">{entry.reason || 'No reason recorded'}</p><p className="mt-1 text-xs text-slate-400">{date(entry.created_at)} · {entry.actor_user_id ? `User #${entry.actor_user_id}` : 'System'} · {entry.source}</p></li>)}</ol>}</section>}
        </>}
      </main>
    </div>
  </div>
}
