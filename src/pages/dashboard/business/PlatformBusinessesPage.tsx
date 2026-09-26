import { useState, type ComponentType, type SVGProps } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon, BuildingStorefrontIcon, CheckCircleIcon, ClockIcon, CreditCardIcon, DocumentTextIcon, EnvelopeIcon, GlobeAltIcon, MagnifyingGlassIcon, MapPinIcon, PhoneIcon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import { createBusiness, decideBusiness, downloadBusinessDocument, getBusiness, listBusinesses, updateBusinessCapabilities, type Business, type BusinessCapabilities, type BusinessStatus } from '@api/modules/businesses.api'
import { statusLabels, isPlatformOperator } from '@utils/businessLifecycle'
import { BusinessForm, ErrorNotice, StatusBadge, button, secondary } from './BusinessComponents'
import { Select, useSiteDialog } from '@components/common'

const card = 'rounded-2xl border border-border bg-white shadow-sm'
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
type ReviewAction = 'activate' | 'reject' | 'suspend' | 'reactivate'
type DetailTab = 'overview' | 'documents' | 'activity'
type Icon = ComponentType<SVGProps<SVGSVGElement>>

const actionsFor = (business: Business, hasPermission: (permission: string) => boolean) => {
  const actions: { value: ReviewAction; label: string; danger?: boolean }[] = []
  if (business.status === 'pending_verification' && hasPermission('platform.businesses.activate') && hasPermission('platform.businesses.review')) actions.push({ value: 'activate', label: 'Approve & activate' })
  if (business.status === 'pending_verification' && hasPermission('platform.businesses.review')) actions.push({ value: 'reject', label: 'Reject application', danger: true })
  if (business.status === 'active' && hasPermission('platform.businesses.suspend')) actions.push({ value: 'suspend', label: 'Suspend business', danger: true })
  if (business.status === 'suspended' && hasPermission('platform.businesses.activate')) actions.push({ value: 'reactivate', label: 'Reactivate business' })
  return actions
}

const Detail = ({ label, value, Icon }: { label: string; value?: string | number | null; Icon?: Icon }) => <div className="flex gap-3 rounded-xl border border-border bg-background/60 p-4">
  {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary-dark" aria-hidden="true" /></span>}
  <div className="min-w-0"><dt className="text-xs font-medium text-text-tertiary">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-text">{value || 'Not recorded'}</dd></div>
</div>

const Summary = ({ label, value, hint, Icon }: { label: string; value: string | number; hint: string; Icon: Icon }) => <div className={`${card} flex items-center gap-4 p-4`}>
  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary-dark" aria-hidden="true" /></span>
  <div><p className="text-2xl font-bold text-text">{value}</p><p className="text-sm font-semibold text-text">{label}</p><p className="text-xs text-text-tertiary">{hint}</p></div>
</div>

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
  const [tab, setTab] = useState<DetailTab>('overview')

  const list = useQuery({ queryKey: ['businesses', 'list', user?.id], queryFn: () => listBusinesses() })
  const detail = useQuery({ queryKey: ['businesses', 'detail', user?.id, selected], queryFn: () => getBusiness(selected!), enabled: Boolean(selected), refetchInterval: 30000 })
  const create = useMutation({ mutationFn: createBusiness, onSuccess: async business => { setCreating(false); setTab('overview'); setParams({ business: business.public_id }); await queryClient.invalidateQueries({ queryKey: ['businesses'] }) } })
  const review = useMutation({ mutationFn: () => decideBusiness(selected!, decision!, reason.trim()), onSuccess: async () => { setDecision(null); setReason(''); await queryClient.invalidateQueries({ queryKey: ['businesses'] }); await queryClient.invalidateQueries({ queryKey: ['tenant-state'] }) } })
  const capabilities = useMutation({ mutationFn: (body: BusinessCapabilities & { reason: string }) => updateBusinessCapabilities(selected!, body), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['businesses'] }); await queryClient.invalidateQueries({ queryKey: ['tenant-state'] }) } })

  const query = search.trim().toLowerCase()
  const businesses = list.data?.filter(item => (!filter || item.status === filter) && `${item.display_name} ${item.legal_name} ${item.registration_number ?? ''} ${item.public_id}`.toLowerCase().includes(query)) ?? []
  const pending = list.data?.filter(item => item.status === 'pending_verification').length ?? 0
  const active = list.data?.filter(item => item.status === 'active').length ?? 0
  const suspended = list.data?.filter(item => item.status === 'suspended').length ?? 0
  const business = detail.data?.business
  const availableActions = business ? actionsFor(business, hasPermission) : []
  const enabledCapabilities = business ? [business.local_pos_enabled, business.storefront_enabled, business.online_orders_enabled, business.online_payments_enabled, business.settlements_enabled].filter(Boolean).length : 0
  const selectBusiness = (id: string) => { setDecision(null); setReason(''); setTab('overview'); setParams({ business: id }) }

  return <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-text via-text to-primary-dark px-6 py-7 text-white shadow-lg sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-light">Platform operations</p><h1 className="mt-2 text-3xl font-bold">Business management</h1><p className="mt-2 max-w-2xl text-sm text-white/75">Review registrations, manage business capabilities and keep every lifecycle decision traceable.</p></div>
        {isPlatformOperator(user) && hasPermission('platform.businesses.create') && <button className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20" onClick={() => { create.reset(); setCreating(!creating) }}>{creating ? 'Cancel creation' : 'New business'}</button>}
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">{[
        ['Awaiting review', pending, 'Needs attention', 'text-warning-light'], ['Active businesses', active, 'Trading on MtaaMall', 'text-success-light'], ['Suspended', suspended, 'Operations paused', 'text-error-light'],
      ].map(([label, count, hint, color]) => <div key={String(label)} className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10"><p className="text-xs text-white/60">{label}</p><div className="mt-1 flex items-end justify-between gap-3"><p className={`text-3xl font-bold ${color}`}>{count}</p><p className="pb-1 text-xs text-white/50">{hint}</p></div></div>)}</div>
    </header>

    {creating && <section className={`${card} p-6`}><h2 className="text-lg font-semibold text-text">Create a draft business</h2><p className="mb-5 mt-1 text-sm text-text-secondary">Connect an existing user as the first owner.</p><label className="mb-4 block text-sm font-medium text-text">Owner username<input className="mt-1 block w-full rounded-xl border border-border p-3" value={ownerUsername} onChange={event => setOwnerUsername(event.target.value)} minLength={3} required /></label>{create.isError && <ErrorNotice error={create.error} />}<BusinessForm pending={create.isPending} onSave={body => create.mutate({ ...body, owner_username: ownerUsername.trim() })} /></section>}

    <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={`${card} overflow-hidden xl:sticky xl:top-5`}>
        <div className="border-b border-divider p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-text">Businesses</h2><p className="mt-1 text-xs text-text-tertiary">{businesses.length} of {list.data?.length ?? 0} shown</p></div><button aria-label="Refresh businesses" title="Refresh businesses" className="rounded-lg border border-border p-2 text-text-secondary transition hover:border-primary hover:text-primary-dark" disabled={list.isFetching} onClick={() => list.refetch()}><ArrowPathIcon className={`h-4 w-4 ${list.isFetching ? 'animate-spin' : ''}`} /></button></div>
          <label className="relative mt-4 block"><span className="sr-only">Search businesses</span><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-tertiary" /><input aria-label="Search businesses" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Search business or ID" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <Select aria-label="Business status" className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text" value={filter} onChange={event => setFilter(event.target.value as BusinessStatus | '')}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        </div>
        {list.isPending && <p className="p-6 text-sm text-text-secondary" role="status">Loading businesses…</p>}{list.isError && <div className="p-5"><ErrorNotice error={list.error} /></div>}
        {!list.isPending && !list.isError && !businesses.length && <p className="p-8 text-center text-sm text-text-secondary">No businesses match your search.</p>}
        <div className="max-h-[calc(100vh-18rem)] divide-y divide-divider overflow-y-auto">{businesses.map(item => <button key={item.public_id} onClick={() => selectBusiness(item.public_id)} className={`w-full p-4 text-left transition hover:bg-primary/5 ${selected === item.public_id ? 'bg-primary/10 shadow-[inset_3px_0_0_#51c4d8]' : ''}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${selected === item.public_id ? 'bg-primary text-white' : 'bg-background text-text-secondary'}`}>{item.display_name.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate font-semibold text-text">{item.display_name}</p><StatusBadge status={item.status} /></div><p className="mt-1 truncate text-xs text-text-tertiary">{item.registration_number || item.business_type || 'Registration not supplied'}</p><p className="mt-2 text-[11px] text-text-tertiary">Joined {date(item.created_at)}</p></div></div></button>)}</div>
      </aside>

      <main className="min-w-0 space-y-5">
        {!selected && <section className={`${card} flex min-h-[420px] items-center justify-center p-8 text-center`}><div><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><BuildingStorefrontIcon className="h-8 w-8 text-primary-dark" /></span><h2 className="mt-5 text-xl font-semibold text-text">Select a business</h2><p className="mt-2 max-w-md text-sm text-text-secondary">Choose a business from the list to review its profile, capabilities, documents and activity.</p></div></section>}
        {detail.isPending && <section className={`${card} p-8 text-sm text-text-secondary`} role="status">Loading business workspace…</section>}
        {detail.isError && <section className={`${card} space-y-3 p-6`}><ErrorNotice error={detail.error} /><button className={secondary} onClick={() => detail.refetch()}>Retry details</button></section>}
        {detail.data && business && !detail.isError && <>
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-divider bg-gradient-to-r from-primary/10 via-white to-secondary/10 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-5"><div className="flex min-w-0 items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm">{business.display_name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Business account</p><h2 className="truncate text-2xl font-bold text-text">{business.display_name}</h2><p className="truncate text-sm text-text-secondary">{business.legal_name}</p></div></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={business.status} />{hasPermission('platform.payments.read') && <Link className={secondary} to={`/platform/businesses/${business.public_id}/payments`}><span className="inline-flex items-center gap-2"><CreditCardIcon className="h-4 w-4" />POS M-Pesa</span></Link>}</div></div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-secondary"><span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="h-4 w-4" />{business.country} · {business.currency}</span><span className="inline-flex items-center gap-1.5"><ClockIcon className="h-4 w-4" />{business.timezone}</span><span className="inline-flex items-center gap-1.5"><ShieldCheckIcon className="h-4 w-4" />ID: {business.public_id}</span></div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-4 pt-3" aria-label="Business review sections">{([['overview', 'Overview'], ['documents', `Documents (${detail.data.documents.length})`], ['activity', 'Activity & audit']] as const).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === value ? 'border-primary text-primary-dark' : 'border-transparent text-text-secondary hover:text-text'}`}>{label}</button>)}</nav>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary Icon={MapPinIcon} value={business.branches.length} label="Branches" hint="Registered locations" /><Summary Icon={UsersIcon} value={detail.data.activity.active_members} label="Active team" hint={`${detail.data.activity.total_members} total members`} /><Summary Icon={DocumentTextIcon} value={detail.data.documents.length} label="Documents" hint={detail.data.documents.length ? 'Submitted for review' : 'None submitted'} /><Summary Icon={CheckCircleIcon} value={`${enabledCapabilities}/5`} label="Capabilities" hint="Services enabled" /></div>

          {tab === 'overview' && <div className="space-y-5">
            <section className={`${card} p-5 sm:p-6`}><div><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Business profile</p><h2 className="mt-1 text-lg font-bold text-text">Identity and contact details</h2><p className="mt-1 text-sm text-text-secondary">The core information supplied during registration and onboarding.</p></div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Registration number" value={business.registration_number} Icon={ShieldCheckIcon} /><Detail label="Tax number" value={business.tax_number} /><Detail label="Business type" value={titleCase(business.business_type || 'Not recorded')} /><Detail label="Owner username" value={business.owner?.username} Icon={UsersIcon} /><Detail label="Business email" value={business.email} Icon={EnvelopeIcon} /><Detail label="Business phone" value={business.phone} Icon={PhoneIcon} /><Detail label="Address" value={business.address} Icon={MapPinIcon} /><Detail label="Created" value={date(business.created_at)} Icon={ClockIcon} /><Detail label="Approved" value={date(business.approved_at)} Icon={CheckCircleIcon} /></dl>
              {business.description && <div className="mt-4 rounded-xl border border-border p-4"><p className="text-xs font-medium text-text-tertiary">Business description</p><p className="mt-1 text-sm leading-6 text-text-secondary">{business.description}</p></div>}{business.rejection_reason && <p className="mt-4 rounded-xl border border-error/20 bg-error-light/40 p-4 text-sm text-error-dark"><strong>Latest review feedback:</strong> {business.rejection_reason}</p>}
            </section>

            <div className="grid items-start gap-5 lg:grid-cols-2">
              {hasPermission('platform.businesses.activate') && <section className={`${card} p-5 sm:p-6`}><div><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Service access</p><h2 className="mt-1 font-bold text-text">Business capabilities</h2><p className="mt-1 text-sm text-text-secondary">Enable local and marketplace services independently.</p></div>
                <form key={`${business.public_id}-${business.updated_at}`} className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); capabilities.mutate({ local_pos_enabled: form.has('local_pos_enabled'), storefront_enabled: form.has('storefront_enabled'), online_orders_enabled: form.has('online_orders_enabled'), online_payments_enabled: form.has('online_payments_enabled'), settlements_enabled: form.has('settlements_enabled'), reason: String(form.get('reason') ?? '').trim() }) }}>
                  <div className="space-y-2">{([['local_pos_enabled', 'Local POS', 'Allow in-person sales'], ['storefront_enabled', 'Marketplace storefront', 'Show this seller online'], ['online_orders_enabled', 'Online orders', 'Accept marketplace orders'], ['online_payments_enabled', 'Online payments', 'Collect digital payments'], ['settlements_enabled', 'Seller settlements', 'Make wallet funds withdrawable']] as const).map(([name, label, hint]) => <label key={name} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-3 transition hover:border-primary/60"><span><span className="block text-sm font-semibold text-text">{label}</span><span className="block text-xs text-text-tertiary">{hint}</span></span><input name={name} type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" defaultChecked={business[name]} /></label>)}</div>
                  <label className="block text-sm font-semibold text-text">Reason for change<textarea name="reason" required minLength={3} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-border p-3 text-sm" placeholder="Record why these services should change" /></label>{capabilities.isError && <ErrorNotice error={capabilities.error} />}{capabilities.isSuccess && <p role="status" className="text-sm font-medium text-success-dark">Capabilities updated and audited.</p>}<button className={button} disabled={capabilities.isPending}>{capabilities.isPending ? 'Saving…' : 'Save capabilities'}</button>
                </form></section>}

              <section className={`${card} p-5 sm:p-6`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Lifecycle</p><h2 className="mt-1 font-bold text-text">Review decision</h2><p className="mt-1 text-sm text-text-secondary">Every action records the administrator and reason.</p></div><StatusBadge status={business.status} /></div>
                {!availableActions.length && <p className="mt-5 rounded-xl bg-background p-4 text-sm text-text-secondary">No lifecycle decisions are available for your permissions and this status.</p>}{!decision && <div className="mt-5 flex flex-wrap gap-3">{availableActions.map(action => <button key={action.value} className={action.danger ? 'rounded-xl border border-error/20 bg-error-light/40 px-4 py-2.5 text-sm font-semibold text-error-dark transition hover:bg-error-light' : button} onClick={() => { review.reset(); setDecision(action.value) }}>{action.label}</button>)}</div>}
                {decision && <form className="mt-5 rounded-2xl border border-border bg-background p-4" onSubmit={event => { event.preventDefault(); review.mutate() }}><h3 className="font-semibold text-text">Confirm {titleCase(decision)}</h3><label className="mt-3 block text-sm font-medium text-text">Decision reason<textarea aria-label="Decision reason" autoFocus required minLength={3} maxLength={1000} rows={4} className="mt-1 w-full rounded-xl border border-border bg-white p-3" placeholder="Record the evidence and reason for this decision" value={reason} onChange={event => setReason(event.target.value)} /></label>{review.isError && <div className="mt-3"><ErrorNotice error={review.error} /></div>}<div className="mt-4 flex gap-3"><button className={button} disabled={review.isPending || reason.trim().length < 3}>{review.isPending ? 'Saving decision…' : 'Confirm decision'}</button><button type="button" className={secondary} disabled={review.isPending} onClick={() => { setDecision(null); setReason('') }}>Cancel</button></div></form>}
                <div className="mt-6 border-t border-divider pt-5"><p className="text-sm font-semibold text-text">POS payment configuration</p><p className="mt-1 text-xs text-text-secondary">Manage the M-Pesa merchant account used only by this business.</p>{hasPermission('platform.payments.read') && <Link className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-dark hover:underline" to={`/platform/businesses/${business.public_id}/payments`}><CreditCardIcon className="h-4 w-4" />Open payment settings</Link>}</div>
              </section>
            </div>
          </div>}

          {tab === 'documents' && <section className={`${card} p-5 sm:p-6`}><div><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Verification evidence</p><h2 className="mt-1 text-lg font-bold text-text">Submitted documents</h2><p className="mt-1 text-sm text-text-secondary">Files supplied by the business owner during onboarding.</p></div>{!detail.data.documents.length ? <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center"><DocumentTextIcon className="mx-auto h-8 w-8 text-text-tertiary" /><p className="mt-3 text-sm font-semibold text-text">No documents submitted</p><p className="mt-1 text-xs text-text-tertiary">The owner has not uploaded verification evidence yet.</p></div> : <div className="mt-5 divide-y divide-divider overflow-hidden rounded-xl border border-border">{detail.data.documents.map(document => <div key={document.public_id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><DocumentTextIcon className="h-5 w-5 text-primary-dark" /></span><div className="min-w-0"><p className="truncate font-semibold text-text">{document.file_name}</p><p className="mt-1 text-xs text-text-tertiary">{titleCase(document.document_type)} · Submitted {date(document.submitted_at)}</p></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-secondary">{titleCase(document.status)}</span><button className="text-sm font-semibold text-primary-dark hover:underline" onClick={() => downloadBusinessDocument(document).catch(() => siteDialog.alert({ title: 'Document unavailable', message: 'Ask the business owner to resubmit legacy external documents.' }))}>Download</button></div></div>)}</div>}</section>}

          {tab === 'activity' && <div className="grid items-start gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <section className={`${card} p-5 sm:p-6`}><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Account health</p><h2 className="mt-1 text-lg font-bold text-text">Recent activity</h2><dl className="mt-5 space-y-3"><Detail label="Owner email" value={detail.data.activity.owner_email_verified ? 'Verified' : 'Not verified'} Icon={EnvelopeIcon} /><Detail label="Owner last login" value={date(detail.data.activity.owner_last_login)} Icon={ClockIcon} /><Detail label="Owner account created" value={date(detail.data.activity.owner_created_at)} /><Detail label="Team members" value={`${detail.data.activity.active_members} active of ${detail.data.activity.total_members}`} Icon={UsersIcon} /><Detail label="Last status change" value={date(detail.data.activity.last_status_change_at)} Icon={ShieldCheckIcon} /></dl></section>
            {hasPermission('platform.audit.read') ? <section className={`${card} p-5 sm:p-6`}><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Traceability</p><h2 className="mt-1 text-lg font-bold text-text">Audit history</h2><p className="mt-1 text-sm text-text-secondary">Immutable lifecycle events with actor and reason.</p>{!detail.data.audit_history.length ? <p className="mt-5 rounded-xl bg-background p-4 text-sm text-text-secondary">No audit entries available.</p> : <ol className="mt-5 border-l border-border pl-5">{detail.data.audit_history.map(entry => <li key={entry.id} className="relative pb-6 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white" /><p className="text-sm font-semibold text-text">{entry.from_status ? titleCase(entry.from_status) : 'Created'} → {titleCase(entry.to_status)}</p><p className="mt-1 text-sm text-text-secondary">{entry.reason || 'No reason recorded'}</p><p className="mt-1 text-xs text-text-tertiary">{date(entry.created_at)} · {entry.actor_user_id ? `User #${entry.actor_user_id}` : 'System'} · {entry.source}</p></li>)}</ol>}</section> : <section className={`${card} p-6 text-sm text-text-secondary`}>You do not have permission to view audit history.</section>}
          </div>}
        </>}
      </main>
    </div>
  </div>
}
