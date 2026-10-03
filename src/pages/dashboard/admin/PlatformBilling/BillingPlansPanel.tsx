import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { listBusinesses } from '@api/modules/businesses.api'
import {
  archiveBillingPlan, archiveBillingRule, createBillingPlan, createBillingPlanVersion, createBillingRule,
  deleteBillingPlan, deleteBillingRule, duplicateBillingPlan, getBillingPlanOverview, previewBillingPrice, publishBillingVersionShadow,
  reactivateBillingRule, updateBillingPlan, updateBillingRule,
  type BillingPlan, type BillingRule,
} from '@api/modules/billing.api'

const panel = 'rounded-2xl border border-border bg-surface p-5 shadow-sm'
const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary'
const primary = 'rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text disabled:opacity-50'
type PlanSection = 'details' | 'pricing' | 'preview' | 'remove'
const plansPath = '/platform/billing/plans'

function errorMessage(error: unknown) {
  const value = error as { response?: { data?: { detail?: string } }; message?: string }
  return value?.response?.data?.detail ?? value?.message ?? 'The operation failed.'
}

export default function BillingPlansPanel({ businessId, plans, canManage, onChanged }: {
  businessId: string; plans: BillingPlan[]; canManage: boolean; onChanged: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('all')
  const routeSuffix = location.pathname.slice(plansPath.length).replace(/^\/+|\/+$/g, '')
  const routeParts = routeSuffix ? routeSuffix.split('/') : []
  const planId = routeParts[0] && routeParts[0] !== 'new' ? decodeURIComponent(routeParts[0]) : ''
  const selected = planId ? plans.find(plan => plan.public_id === planId) : undefined
  const section: PlanSection = routeParts[1] === 'pricing' ? 'pricing' : routeParts[1] === 'calculator' ? 'preview' : routeParts[1] === 'remove' ? 'remove' : 'details'
  const go = (path: string) => navigate(`${path}${location.search}`)
  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase()
    return plans.filter(plan => (status === 'all' || plan.status === status) && (
      !term || plan.name.toLowerCase().includes(term) || plan.code.toLowerCase().includes(term) || plan.description?.toLowerCase().includes(term)
    ))
  }, [plans, search, status])
  const activePlans = plans.filter(plan => plan.status === 'active').length
  const assignedBusinesses = plans.reduce((total, plan) => total + plan.agreement_count, 0)

  if (routeParts[0] === 'new') return canManage
    ? <CreatePlan onBack={() => go(plansPath)} onCreated={plan => { onChanged(); go(`${plansPath}/${plan.public_id}`) }} />
    : <AccessNotice onBack={() => go(plansPath)} />
  if (selected && routeParts[1] === 'duplicate') return canManage
    ? <DuplicatePlan source={selected} onBack={() => go(plansPath)} onCreated={plan => { onChanged(); go(`${plansPath}/${plan.public_id}`) }} />
    : <AccessNotice onBack={() => go(plansPath)} />
  if (selected && routeParts[1] === 'edit') return canManage
    ? <EditPlan plan={selected} onBack={() => go(`${plansPath}/${planId}`)} onSaved={() => { onChanged(); go(`${plansPath}/${planId}`) }} />
    : <AccessNotice onBack={() => go(`${plansPath}/${planId}`)} />
  if (selected) return <PlanDetail businessId={businessId} plan={selected} canManage={canManage} section={section} pricingAction={routeParts.slice(2).join('/')} onPricingNavigate={value => go(`${plansPath}/${planId}/pricing${value ? `/${value}` : ''}`)} onNavigate={value => go(value === 'details' ? `${plansPath}/${planId}` : `${plansPath}/${planId}/${value === 'preview' ? 'calculator' : value}`)} onEdit={() => go(`${plansPath}/${planId}/edit`)} onDuplicate={() => go(`${plansPath}/${planId}/duplicate`)} onBack={() => go(plansPath)} onChanged={onChanged} />
  if (planId) return <section className={panel}><PageHeader title="Plan not found" subtitle="This plan may have been removed or the link is invalid." onBack={() => go(plansPath)} /></section>

  return <div className="space-y-4">
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-extrabold text-text">Your billing plans</h2><p className="mt-1 text-sm text-text-secondary">Build pricing once, publish it, then assign it from Agreements.</p></div>
        {canManage && <button className={primary} onClick={() => go(`${plansPath}/new`)}>+ Add plan</button>}
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Total plans" value={String(plans.length)} />
        <Metric label="Active plans" value={String(activePlans)} />
        <Metric label="Business assignments" value={String(assignedBusinesses)} />
      </dl>
    </section>

    <section className={panel}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block flex-1 sm:max-w-md"><span className="sr-only">Search plans</span><input className={`${input} pl-10`} placeholder="Search by plan name or code" value={search} onChange={event => setSearch(event.target.value)} /><span aria-hidden="true" className="absolute left-3 top-2.5 text-text-tertiary">⌕</span></label>
        <div className="flex rounded-xl border border-border bg-background p-1">{(['all', 'active', 'archived'] as const).map(value => <button key={value} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${status === value ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`} onClick={() => setStatus(value)}>{value}</button>)}</div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">{filteredPlans.map(plan => {
        const latest = [...plan.versions].sort((a, b) => b.version_number - a.version_number)[0]
        const ruleCount = latest?.rules.length ?? 0
        return <article key={plan.public_id} className="relative rounded-2xl border border-border bg-background p-5 transition hover:border-primary/50 hover:shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <button className="min-w-0 text-left" onClick={() => go(`${plansPath}/${plan.public_id}`)}><span className="block truncate text-lg font-extrabold text-text hover:text-primary">{plan.name}</span><span className="mt-1 block text-xs font-semibold tracking-wide text-text-tertiary">{plan.code}</span></button>
            <div className="relative"><button aria-label={`Actions for ${plan.name}`} aria-expanded={openMenu === plan.public_id} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-xl font-bold leading-none text-text hover:border-primary hover:text-primary" onClick={() => setOpenMenu(current => current === plan.public_id ? null : plan.public_id)}>⋯</button>{openMenu === plan.public_id && <div className="absolute right-0 top-11 z-30 min-w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 text-left shadow-xl"><button className="block w-full px-4 py-2.5 text-sm font-semibold text-text hover:bg-background" onClick={() => { setOpenMenu(null); go(`${plansPath}/${plan.public_id}`) }}>View plan</button>{canManage && <button className="block w-full px-4 py-2.5 text-sm font-semibold text-text hover:bg-background" onClick={() => { setOpenMenu(null); go(`${plansPath}/${plan.public_id}/edit`) }}>Edit information</button>}{canManage && <button className="block w-full px-4 py-2.5 text-sm font-semibold text-text hover:bg-background" onClick={() => { setOpenMenu(null); go(`${plansPath}/${plan.public_id}/duplicate`) }}>Duplicate</button>}{canManage && <button className="block w-full px-4 py-2.5 text-sm font-semibold text-error hover:bg-error/10" onClick={() => { setOpenMenu(null); go(`${plansPath}/${plan.public_id}/remove`) }}>{plan.can_delete ? 'Delete' : 'Archive'}</button>}</div>}</div>
          </div>
          <p className="mt-3 line-clamp-2 min-h-10 text-sm text-text-secondary">{plan.description || 'No description has been added to this plan.'}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${plan.status === 'archived' ? 'bg-surface text-text-tertiary' : 'bg-success/10 text-success'}`}>{plan.status}</span><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold capitalize text-text-secondary">{plan.charging_mode} mode</span></div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4"><CompactMetric label="Latest" value={latest ? `v${latest.version_number}` : 'None'} /><CompactMetric label="Rules" value={String(ruleCount)} /><CompactMetric label="Assigned" value={String(plan.agreement_count)} /></dl>
          <button className="mt-4 w-full rounded-xl border border-primary/30 bg-surface px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5" onClick={() => go(`${plansPath}/${plan.public_id}`)}>Open plan</button>
        </article>
      })}</div>
      {plans.length === 0 && <div className="py-12 text-center"><p className="font-semibold text-text">No billing plans yet</p><p className="mt-1 text-sm text-text-secondary">Select Add plan to create the first reusable plan.</p></div>}
      {plans.length > 0 && filteredPlans.length === 0 && <div className="py-12 text-center"><p className="font-semibold text-text">No matching plans</p><p className="mt-1 text-sm text-text-secondary">Try a different search or status filter.</p></div>}
    </section>
  </div>
}

function AccessNotice({ onBack }: { onBack: () => void }) { return <section className={panel}><PageHeader title="Permission required" subtitle="You do not have permission to manage billing plans." onBack={onBack} /></section> }

function CompactMetric({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</dt><dd className="mt-1 text-sm font-bold text-text">{value}</dd></div> }

function PageHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><button className="mb-3 text-sm font-semibold text-primary hover:underline" onClick={onBack}>← Back to plans</button><h2 className="text-xl font-extrabold text-text">{title}</h2><p className="mt-1 text-sm text-text-secondary">{subtitle}</p></div></div>
}

function CreatePlan({ onBack, onCreated }: { onBack: () => void; onCreated: (plan: BillingPlan) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const create = useMutation({ mutationFn: () => createBillingPlan({ name: name.trim(), description: description.trim() || undefined }), onSuccess: onCreated })
  return <section className={panel}><PageHeader title="Add billing plan" subtitle="Enter the plan information. An editable pricing draft is created automatically." onBack={onBack} /><div className="mt-5 max-w-2xl space-y-4"><label className="block text-sm font-semibold text-text">Plan name<input autoFocus className={`${input} mt-1`} placeholder="e.g. Standard Retail Plan" value={name} onChange={e => setName(e.target.value)} /></label><label className="block text-sm font-semibold text-text">Description <span className="font-normal text-text-tertiary">(optional)</span><textarea className={`${input} mt-1 min-h-28`} placeholder="Who this plan is for and how it charges" value={description} onChange={e => setDescription(e.target.value)} /></label>{create.error && <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(create.error)}</p>}<div className="flex gap-2"><button className={primary} disabled={name.trim().length < 2 || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create plan'}</button><button className={secondary} onClick={onBack}>Cancel</button></div></div></section>
}

function DuplicatePlan({ source, onBack, onCreated }: { source: BillingPlan; onBack: () => void; onCreated: (plan: BillingPlan) => void }) {
  const [name, setName] = useState(`${source.name} Copy`)
  const duplicate = useMutation({ mutationFn: () => duplicateBillingPlan(source.public_id, name.trim()), onSuccess: onCreated })
  return <section className={panel}><PageHeader title="Duplicate billing plan" subtitle={`Copy ${source.name}, including its latest pricing rules, into a new editable plan.`} onBack={onBack} /><div className="mt-5 max-w-2xl space-y-4"><label className="block text-sm font-semibold text-text">New plan name<input autoFocus className={`${input} mt-1`} value={name} onChange={e => setName(e.target.value)} /></label>{duplicate.error && <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(duplicate.error)}</p>}<div className="flex gap-2"><button className={primary} disabled={name.trim().length < 2 || duplicate.isPending} onClick={() => duplicate.mutate()}>{duplicate.isPending ? 'Duplicating…' : 'Duplicate plan'}</button><button className={secondary} onClick={onBack}>Cancel</button></div></div></section>
}

function EditPlan({ plan, onBack, onSaved }: { plan: BillingPlan; onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const update = useMutation({ mutationFn: () => updateBillingPlan(plan.public_id, { name: name.trim(), description: description.trim() || undefined }), onSuccess: onSaved })
  return <section className={panel}>
    <PageHeader title="Edit plan information" subtitle="Change the plan name and description. Pricing rules and business agreements are managed separately." onBack={onBack} />
    <div className="mt-5 max-w-2xl space-y-4">
      <label className="block text-sm font-semibold text-text">Plan name<input autoFocus className={`${input} mt-1`} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="block text-sm font-semibold text-text">Description <span className="font-normal text-text-tertiary">(optional)</span><textarea className={`${input} mt-1 min-h-36`} value={description} onChange={event => setDescription(event.target.value)} /></label>
      {update.error && <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(update.error)}</p>}
      <div className="flex gap-2"><button className={primary} disabled={name.trim().length < 2 || update.isPending} onClick={() => update.mutate()}>{update.isPending ? 'Saving…' : 'Save changes'}</button><button className={secondary} onClick={onBack}>Cancel</button></div>
    </div>
  </section>
}

function PlanDetail({ businessId, plan, canManage, section, pricingAction, onPricingNavigate, onNavigate, onEdit, onDuplicate, onBack, onChanged }: { businessId: string; plan: BillingPlan; canManage: boolean; section: PlanSection; pricingAction: string; onPricingNavigate: (path: string) => void; onNavigate: (section: PlanSection) => void; onEdit: () => void; onDuplicate: () => void; onBack: () => void; onChanged: () => void }) {
  const overview = useQuery({ queryKey: ['billing-plan-overview', plan.public_id], queryFn: () => getBillingPlanOverview(plan.public_id), enabled: section === 'details' })
  const archive = useMutation({ mutationFn: () => archiveBillingPlan(plan.public_id), onSuccess: () => { onChanged(); onBack() } })
  const remove = useMutation({ mutationFn: () => deleteBillingPlan(plan.public_id), onSuccess: () => { onChanged(); onBack() } })
  const error = archive.error || remove.error
  const latest = [...plan.versions].sort((a, b) => b.version_number - a.version_number)[0]
  const published = [...plan.versions].filter(version => ['shadow', 'active'].includes(version.status)).sort((a, b) => b.version_number - a.version_number)[0]
  const overviewRules = (published ?? latest)?.rules ?? []
  const rules = latest?.rules.length ?? 0
  const hasDraft = plan.versions.some(version => version.status === 'draft')
  const hasPublishedVersion = plan.versions.some(version => ['shadow', 'active'].includes(version.status))
  const setupSteps = [
    { label: 'Plan information', complete: Boolean(plan.name && plan.description) },
    { label: 'Pricing rules', complete: plan.versions.some(version => version.rules.length > 0) },
    { label: 'Published version', complete: hasPublishedVersion },
    { label: 'Business agreement', complete: plan.agreement_count > 0 },
  ]
  return <div className="space-y-4"><section className={panel}>
    <button className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" onClick={onBack}>← Billing plans</button>
    <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold text-text sm:text-3xl">{plan.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${plan.status === 'archived' ? 'bg-background text-text-tertiary' : 'bg-success/10 text-success'}`}>{plan.status}</span></div><p className="mt-2 text-sm font-semibold tracking-wide text-text-tertiary">{plan.code}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">{plan.description || 'Add a description so administrators understand who this plan is designed for.'}</p></div>{plan.status === 'active' && canManage && <button className={`${primary} self-start`} onClick={() => hasDraft ? onPricingNavigate('new') : onNavigate('pricing')}>{hasDraft && rules === 0 ? 'Add first pricing rule' : 'Manage pricing rules'}</button>}</div>
    <dl className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Latest version" value={latest ? `Version ${latest.version_number} · ${latest.status}` : 'Not configured'} /><Metric label="Rules in latest version" value={String(rules)} /><Metric label="Business assignments" value={String(plan.agreement_count)} /></dl>
  </section>
    {error && <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(error)}</p>}
    {section === 'details' && <div className="space-y-4">
      <section className={panel}><PlanNavigation active={section} onNavigate={onNavigate} /></section>
      {overview.error && <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(overview.error)}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Assessed plan revenue" value={`${overview.data?.currency ?? latest?.currency ?? 'KES'} ${Number(overview.data?.assessed_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hint="Final and provisional assessments" />
        <OverviewMetric label="Finalized revenue" value={`${overview.data?.currency ?? latest?.currency ?? 'KES'} ${Number(overview.data?.finalized_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hint="Closed assessments and adjustments" />
        <OverviewMetric label="Linked businesses" value={String(overview.data?.linked_business_count ?? plan.agreement_count)} hint={`${overview.data?.active_agreement_count ?? 0} active agreement(s)`} />
        <OverviewMetric label="Assessments" value={String(overview.data?.assessment_count ?? 0)} hint={`Usage: ${overview.data?.currency ?? latest?.currency ?? 'KES'} ${Number(overview.data?.usage_total ?? 0).toLocaleString()}`} />
      </section>
      {Number(overview.data?.provisional_revenue ?? 0) > 0 && <p className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-sm text-text-secondary"><strong className="text-text">Provisional amount:</strong> {overview.data?.currency} {Number(overview.data?.provisional_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Shadow and provisional assessments are calculated estimates, not collected money.</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <section className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-text">Pricing rules</h3><p className="mt-1 text-sm text-text-secondary">Rules currently defining how this plan calculates charges.</p></div><button className={secondary} onClick={() => onNavigate('pricing')}>View all rules</button></div>
            <div className="mt-4 space-y-2">{overviewRules.map(rule => <div key={rule.public_id} className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center"><div><strong className="text-text">{humanize(rule.code)}</strong><p className="mt-1 text-sm text-text-secondary">{pricingFormula(rule)}</p></div><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{humanize(rule.event_type)}</span></div>)}{overviewRules.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-secondary">No pricing rules have been configured.</div>}</div>
          </section>
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-text">Linked businesses</h3><p className="mt-1 text-sm text-text-secondary">Businesses assigned to a version of this plan and their assessed fees.</p></div><span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-text-secondary">{overview.data?.linked_business_count ?? 0} businesses</span></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-tertiary"><th className="px-3 py-2">Business</th><th className="px-3 py-2">Agreement</th><th className="px-3 py-2">Plan version</th><th className="px-3 py-2 text-right">Assessed revenue</th></tr></thead><tbody>{overview.data?.linked_businesses.map(row => <tr key={row.business_id} className="border-b border-border last:border-0"><td className="px-3 py-3"><strong className="text-text">{row.business_name}</strong><span className="ml-2 text-xs capitalize text-text-tertiary">{row.business_status}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${row.agreement_status === 'active' ? 'bg-success/10 text-success' : 'bg-background text-text-secondary'}`}>{row.agreement_status}</span></td><td className="px-3 py-3 text-text-secondary">Version {row.plan_version_number}</td><td className="px-3 py-3 text-right font-bold text-text">{row.currency} {Number(row.assessed_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}</tbody></table>{!overview.isLoading && (overview.data?.linked_businesses.length ?? 0) === 0 && <p className="py-8 text-center text-sm text-text-secondary">No business has been assigned to this plan yet.</p>}{overview.isLoading && <p className="py-8 text-center text-sm text-text-secondary">Loading linked businesses…</p>}</div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className={panel}><h3 className="font-bold text-text">Plan information</h3><dl className="mt-4 space-y-3"><CompactMetric label="Plan code" value={plan.code} /><CompactMetric label="Status" value={humanize(plan.status)} /><CompactMetric label="Charging mode" value={humanize(plan.charging_mode)} /><CompactMetric label="Current version" value={latest ? `Version ${latest.version_number} · ${latest.status}` : 'Not configured'} /></dl><p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-text-secondary">{plan.description || 'No plan description has been added.'}</p></section>
          <section className={panel}><h3 className="font-bold text-text">Setup progress</h3><ol className="mt-4 space-y-3">{setupSteps.map((step, index) => <li key={step.label} className="flex items-center gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step.complete ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary'}`}>{step.complete ? '✓' : index + 1}</span><span className="text-sm font-semibold text-text-secondary">{step.label}</span></li>)}</ol>{!hasPublishedVersion && <button className={`${secondary} mt-5 w-full`} onClick={() => onNavigate('pricing')}>Continue setup</button>}</section>
          {canManage && <section className={panel}><h3 className="font-bold text-text">Plan actions</h3><div className="mt-3 space-y-2">{plan.status === 'active' && <button className={`${secondary} w-full`} onClick={onEdit}>Edit plan information</button>}<button className={`${secondary} w-full`} onClick={onDuplicate}>Duplicate plan</button><button className="w-full rounded-xl border border-error/30 px-4 py-2 text-sm font-semibold text-error hover:bg-error/5" onClick={() => onNavigate('remove')}>{plan.can_delete ? 'Delete plan' : 'Archive plan'}</button></div></section>}
        </aside>
      </div>
    </div>}
    {section === 'pricing' && <PricingRules key={pricingAction || 'list'} plan={plan} canManage={canManage} actionPath={pricingAction} onActionNavigate={onPricingNavigate} onChanged={onChanged} navigation={<PlanNavigation active={section} onNavigate={onNavigate} />} />}
    {section === 'preview' && <PlanPreview businessId={businessId} plan={plan} navigation={<PlanNavigation active={section} onNavigate={onNavigate} />} />}
    {section === 'remove' && <section className="rounded-2xl border border-error/30 bg-error/5 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-error">Danger zone</p><h3 className="mt-1 text-lg font-bold text-text">{plan.can_delete ? 'Delete this plan?' : 'Archive this plan?'}</h3><p className="mt-2 max-w-2xl text-sm text-text-secondary">{plan.can_delete ? 'This unused plan and its draft pricing configuration will be permanently deleted. This action cannot be undone.' : `This plan has been assigned ${plan.agreement_count} time(s), so it must be retained for billing history. Archiving prevents new assignments and keeps all previous records.`}</p><div className="mt-4 flex gap-2"><button className="rounded-xl bg-error px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={archive.isPending || remove.isPending} onClick={() => plan.can_delete ? remove.mutate() : archive.mutate()}>{plan.can_delete ? 'Delete plan permanently' : 'Archive plan'}</button><button className={secondary} onClick={() => onNavigate('details')}>Cancel</button></div></section>}
  </div>
}

function OverviewMetric({ label, value, hint }: { label: string; value: string; hint: string }) { return <article className={panel}><p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">{label}</p><p className="mt-2 text-2xl font-extrabold text-text">{value}</p><p className="mt-1 text-xs text-text-secondary">{hint}</p></article> }

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-background p-3"><dt className="text-xs text-text-tertiary">{label}</dt><dd className="mt-1 font-bold capitalize text-text">{value}</dd></div> }

function PlanNavigation({ active, onNavigate }: { active: PlanSection; onNavigate: (section: PlanSection) => void }) {
  const tabs = [
    { value: 'details' as const, label: 'Overview', hint: 'Plan information' },
    { value: 'pricing' as const, label: 'Pricing rules', hint: 'Fees and limits' },
    { value: 'preview' as const, label: 'Test calculator', hint: 'Preview a charge' },
  ]
  return <div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-text-tertiary">Plan navigation</p><nav aria-label="Plan sections" className="grid gap-2 sm:grid-cols-3">{tabs.map((tab, index) => <button key={tab.value} type="button" aria-current={active === tab.value ? 'page' : undefined} className={`rounded-xl border px-4 py-3 text-left transition ${active === tab.value ? 'border-primary bg-primary text-white shadow-sm' : 'border-border bg-background text-text hover:border-primary/50 hover:bg-primary/5'}`} onClick={() => onNavigate(tab.value)}><span className={`block text-xs font-bold uppercase tracking-wide ${active === tab.value ? 'text-white/75' : 'text-text-tertiary'}`}>Step {index + 1}</span><span className="mt-1 block text-sm font-extrabold">{tab.label}</span><span className={`mt-0.5 block text-xs ${active === tab.value ? 'text-white/80' : 'text-text-secondary'}`}>{tab.hint}</span></button>)}</nav></div>
}

const blankRule = { code: 'POS_STANDARD', event_type: 'local_pos', channel: 'pos', calculation_basis: 'gross_contribution', calculation_mode: 'percentage', free_allowance: '0', fixed_amount: '0', percentage_rate: '2', minimum_fee: '0', maximum_fee: '', priority: '100', tax_treatment: 'out_of_scope' }

function billingEventForChannel(channel: string) {
  if (channel === 'marketplace_product') return 'marketplace_product'
  if (channel === 'marketplace_service') return 'marketplace_service'
  return 'local_pos'
}

function ruleFormValue(item: BillingRule) { return { code: item.code, event_type: item.event_type, channel: item.channel, calculation_basis: item.calculation_basis, calculation_mode: String(item.configuration.calculation_mode ?? (item.marginal_brackets.length ? 'marginal' : 'percentage')), free_allowance: item.free_allowance, fixed_amount: item.fixed_amount, percentage_rate: item.percentage_rate, minimum_fee: item.minimum_fee, maximum_fee: item.maximum_fee ?? '', priority: String(item.priority), tax_treatment: item.tax_treatment } }

function PricingRules({ plan, canManage, actionPath, onActionNavigate, onChanged, navigation }: { plan: BillingPlan; canManage: boolean; actionPath: string; onActionNavigate: (path: string) => void; onChanged: () => void; navigation: ReactNode }) {
  const draft = plan.versions.find(version => version.status === 'draft')
  const channelOptions = ['pos', 'marketplace_product', 'marketplace_service']
  const actionParts = actionPath.split('/').filter(Boolean)
  const actionRule = actionParts[0] === 'new' ? null : draft?.rules.find(item => item.public_id === actionParts[0])
  const editing = actionParts[0] === 'new' ? 'new' : actionParts[1] === 'edit' ? actionRule : null
  const removing = actionParts[1] === 'remove' ? actionRule : null
  const enabledChannels = draft?.rules.filter(item => item.is_enabled && item.public_id !== (editing && editing !== 'new' ? editing.public_id : '')).map(item => item.channel) ?? []
  const firstAvailableChannel = channelOptions.find(channel => !enabledChannels.includes(channel)) ?? 'pos'
  const [rule, setRule] = useState(() => editing && editing !== 'new' ? ruleFormValue(editing) : { ...blankRule, channel: firstAvailableChannel, event_type: billingEventForChannel(firstAvailableChannel) })
  const [brackets, setBrackets] = useState(() => editing && editing !== 'new' && editing.marginal_brackets.length ? editing.marginal_brackets.map(row => ({ up_to: row.up_to ?? '', percentage_rate: row.percentage_rate })) : [{ up_to: '', percentage_rate: editing && editing !== 'new' ? editing.percentage_rate : '2' }])
  const createVersion = useMutation({ mutationFn: () => createBillingPlanVersion(plan.public_id, { currency: 'KES', timezone: 'Africa/Nairobi', effective_from: new Date().toISOString(), configuration: { shadow_only: true } }), onSuccess: onChanged })
  const publish = useMutation({ mutationFn: (id: string) => publishBillingVersionShadow(id), onSuccess: onChanged })
  const save = useMutation({ mutationFn: () => {
    if (!draft) throw new Error('Create an editable version first.')
    const body = { ...rule, event_type: billingEventForChannel(rule.channel), priority: Number(rule.priority), maximum_fee: rule.maximum_fee || null, effective_from: new Date().toISOString(), marginal_brackets: rule.calculation_mode === 'marginal' ? brackets.map(item => ({ up_to: item.up_to || null, percentage_rate: item.percentage_rate })) : [], configuration: { calculation_mode: rule.calculation_mode, shadow_only: true }, currency: 'KES', is_enabled: editing && editing !== 'new' ? editing.is_enabled : true }
    return editing && editing !== 'new' ? updateBillingRule(editing.public_id, body) : createBillingRule(draft.public_id, body)
  }, onSuccess: () => { onChanged(); onActionNavigate('') } })
  const remove = useMutation({ mutationFn: () => {
    if (!removing) throw new Error('Pricing rule not found.')
    return deleteBillingRule(removing.public_id)
  }, onSuccess: () => { onChanged(); onActionNavigate('') } })
  const toggleActive = useMutation({ mutationFn: (item: BillingRule) => item.is_enabled ? archiveBillingRule(item.public_id) : reactivateBillingRule(item.public_id), onSuccess: onChanged })
  const error = createVersion.error || publish.error || save.error || remove.error || toggleActive.error
  if (actionPath && !canManage) return <AccessNotice onBack={() => onActionNavigate('')} />
  if (editing && draft) return <RuleForm navigation={navigation} rule={rule} setRule={setRule} brackets={brackets} setBrackets={setBrackets} blockedChannels={editing !== 'new' && !editing.is_enabled ? [] : enabledChannels} title={editing === 'new' ? 'Add pricing rule' : `Edit ${editing.code}`} error={error} saving={save.isPending} onSave={() => save.mutate()} onCancel={() => onActionNavigate('')} />
  if (removing) return <section className={panel}>{navigation}<div className="mt-6 border-t border-border pt-6"><p className="text-xs font-bold uppercase tracking-wide text-error">Delete draft rule</p><h3 className="mt-1 text-lg font-bold text-text">Delete {humanize(removing.code)}?</h3><p className="mt-2 max-w-2xl text-sm text-text-secondary">This rule is still in a draft version and has not been used for billing. Deleting it cannot be undone.</p>{remove.error && <p className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(remove.error)}</p>}<div className="mt-4 flex gap-2"><button className="rounded-xl bg-error px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Deleting…' : 'Delete pricing rule'}</button><button className={secondary} onClick={() => onActionNavigate('')}>Cancel</button></div></div></section>
  if (actionPath) return <section className={panel}>{navigation}<div className="mt-6 border-t border-border pt-6"><h3 className="font-bold text-text">Pricing rule not found</h3><button className={`${secondary} mt-4`} onClick={() => onActionNavigate('')}>Back to pricing rules</button></div></section>
  return <section className={panel}>{navigation}<div className="mt-6 border-t border-border pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-text">Pricing rules</h3><p className="text-sm text-text-secondary">Each draft version allows one enabled rule per sales channel. Archive a rule before replacing it.</p></div>{canManage && plan.status === 'active' && (draft ? <button className={primary} disabled={enabledChannels.length >= channelOptions.length} onClick={() => onActionNavigate('new')}>{enabledChannels.length >= channelOptions.length ? 'All channels covered' : 'Add rule'}</button> : <button className={primary} disabled={createVersion.isPending} onClick={() => createVersion.mutate()}>Create editable version</button>)}</div>{error && <p className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(error)}</p>}<div className="mt-5 space-y-5">{plan.versions.map(version => <article key={version.public_id} className="rounded-2xl border border-border bg-background p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-base font-extrabold text-text">{version.rules.length === 1 ? humanize(version.rules[0].code) : version.rules.length > 1 ? `${version.rules.length} pricing rules` : version.status === 'draft' ? `Draft version ${version.version_number}` : `Version ${version.version_number}`}</h4><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-text-secondary">v{version.version_number}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${version.status === 'draft' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>{version.status}</span><span className="text-xs text-text-tertiary">{version.currency} · effective {new Date(version.effective_from).toLocaleDateString()}</span></div></div>{canManage && version.status === 'draft' && version.rules.some(item => item.is_enabled) && <button className={secondary} disabled={publish.isPending} onClick={() => publish.mutate(version.public_id)}>Publish for assignment</button>}</div><div className="mt-4 space-y-3">{version.rules.map(item => <PricingRuleCard key={item.public_id} rule={item} editable={canManage && version.status === 'draft'} changing={toggleActive.isPending} onEdit={() => onActionNavigate(`${item.public_id}/edit`)} onToggle={() => toggleActive.mutate(item)} onRemove={() => onActionNavigate(`${item.public_id}/remove`)} />)}{version.rules.length === 0 && <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center"><p className="font-semibold text-text">No pricing rules in this draft</p><p className="mt-1 text-sm text-text-secondary">This is an empty draft version. Add its first rule to define a fee calculation.</p>{canManage && version.status === 'draft' && <button className={`${primary} mt-4`} onClick={() => onActionNavigate('new')}>Add first rule</button>}</div>}</div></article>)}</div></div></section>
}

function humanize(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }
function money(value: string | null, currency: string) { return value === null || value === '' ? 'No limit' : `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function pricingFormula(rule: BillingRule) {
  const mode = String(rule.configuration.calculation_mode ?? (rule.marginal_brackets.length ? 'marginal' : Number(rule.fixed_amount) && Number(rule.percentage_rate) ? 'fixed_plus_percentage' : Number(rule.fixed_amount) ? 'fixed' : 'percentage'))
  const basis = humanize(rule.calculation_basis)
  if (mode === 'fixed') return `${money(rule.fixed_amount, rule.currency)} for each qualifying event`
  if (mode === 'fixed_plus_percentage') return `${money(rule.fixed_amount, rule.currency)} plus ${Number(rule.percentage_rate)}% of ${basis.toLowerCase()}`
  if (mode === 'marginal') return `Marginal bracket rates applied progressively to ${basis.toLowerCase()}`
  return `${Number(rule.percentage_rate)}% of ${basis.toLowerCase()}`
}

function PricingRuleCard({ rule, editable, changing, onEdit, onToggle, onRemove }: { rule: BillingRule; editable: boolean; changing: boolean; onEdit: () => void; onToggle: () => void; onRemove: () => void }) {
  const mode = String(rule.configuration.calculation_mode ?? (rule.marginal_brackets.length ? 'marginal' : Number(rule.fixed_amount) && Number(rule.percentage_rate) ? 'fixed_plus_percentage' : Number(rule.fixed_amount) ? 'fixed' : 'percentage'))
  const basis = humanize(rule.calculation_basis)
  const formula = pricingFormula(rule)
  return <section className={`rounded-xl border bg-surface p-4 shadow-sm ${rule.is_enabled ? 'border-border' : 'border-border opacity-75'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h5 className="font-extrabold text-text">{humanize(rule.code)}</h5><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${rule.is_enabled ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary'}`}>{rule.is_enabled ? 'Enabled' : 'Archived'}</span></div><p className="mt-1 text-xs font-semibold text-text-tertiary">{rule.code}</p></div>{editable && <div className="flex flex-wrap gap-2"><button className={secondary} onClick={onEdit}>Edit</button><button className={secondary} disabled={changing} onClick={onToggle}>{rule.is_enabled ? 'Archive' : 'Reactivate'}</button><button className="rounded-xl border border-error/30 px-4 py-2 text-sm font-semibold text-error hover:bg-error/5" onClick={onRemove}>Delete</button></div>}</div><div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-wide text-primary">How the fee is calculated</p><p className="mt-1 text-base font-extrabold text-text">{formula}</p>{Number(rule.free_allowance) > 0 && <p className="mt-1 text-sm text-text-secondary">The first {money(rule.free_allowance, rule.currency)} in period usage is free before this calculation applies.</p>}</div><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><CompactMetric label="Applies to" value={`${humanize(rule.event_type)} · ${humanize(rule.channel)}`} /><CompactMetric label="Calculation basis" value={basis} /><CompactMetric label="Minimum fee" value={money(rule.minimum_fee, rule.currency)} /><CompactMetric label="Maximum fee" value={money(rule.maximum_fee, rule.currency)} /><CompactMetric label="Tax treatment" value={humanize(rule.tax_treatment)} /><CompactMetric label="Priority" value={String(rule.priority)} /><CompactMetric label="Business type" value={rule.business_type ? humanize(rule.business_type) : 'All businesses'} /><CompactMetric label="Service category" value={rule.service_category_key ? humanize(rule.service_category_key) : 'All categories'} /></dl>{mode === 'marginal' && <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">Marginal brackets</p><div className="mt-2 overflow-hidden rounded-xl border border-border">{rule.marginal_brackets.map((bracket, index) => <div key={`${bracket.up_to}-${index}`} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0"><span className="text-text-secondary">{index === rule.marginal_brackets.length - 1 && bracket.up_to === null ? 'Remaining usage' : `Up to ${money(bracket.up_to, rule.currency)}`}</span><strong className="text-text">{Number(bracket.percentage_rate)}%</strong></div>)}</div></div>}<div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-text-tertiary"><span>Effective from {new Date(rule.effective_from).toLocaleString()}</span><span>{rule.effective_to ? `Ends ${new Date(rule.effective_to).toLocaleString()}` : 'No end date'}</span></div></section>
}

function RuleForm({ navigation, rule, setRule, brackets, setBrackets, blockedChannels, title, error, saving, onSave, onCancel }: { navigation: ReactNode; rule: typeof blankRule; setRule: React.Dispatch<React.SetStateAction<typeof blankRule>>; brackets: { up_to: string; percentage_rate: string }[]; setBrackets: React.Dispatch<React.SetStateAction<{ up_to: string; percentage_rate: string }[]>>; blockedChannels: string[]; title: string; error: unknown; saving: boolean; onSave: () => void; onCancel: () => void }) {
  const field = (key: keyof typeof blankRule, label: string, type = 'text') => <label className="text-sm font-semibold text-text">{label}<input className={`${input} mt-1`} type={type} value={rule[key]} onChange={e => setRule(current => ({ ...current, [key]: e.target.value }))} /></label>
  const channelBlocked = blockedChannels.includes(rule.channel)
  return <section className={panel}>{navigation}<div className="mt-6 border-t border-border pt-6"><h3 className="text-lg font-bold text-text">{title}</h3><p className="mt-1 text-sm text-text-secondary">Configure only this pricing rule, then return to the plan.</p><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{field('code', 'Rule name')}<label className="text-sm font-semibold text-text">Sales channel<select className={`${input} mt-1`} value={rule.channel} onChange={e => setRule(current => ({ ...current, channel: e.target.value, event_type: billingEventForChannel(e.target.value) }))}><option value="pos" disabled={blockedChannels.includes('pos')}>Local POS sales{blockedChannels.includes('pos') ? ' — already covered' : ''}</option><option value="marketplace_product" disabled={blockedChannels.includes('marketplace_product')}>Online marketplace products{blockedChannels.includes('marketplace_product') ? ' — already covered' : ''}</option><option value="marketplace_service" disabled={blockedChannels.includes('marketplace_service')}>Online marketplace services{blockedChannels.includes('marketplace_service') ? ' — already covered' : ''}</option></select><span className="mt-1 block text-xs font-normal text-text-tertiary">The corresponding billing event is selected automatically. Archive the current rule before replacing a covered channel.</span></label><label className="text-sm font-semibold text-text">Calculation basis<select className={`${input} mt-1`} value={rule.calculation_basis} onChange={e => setRule(current => ({ ...current, calculation_basis: e.target.value }))}><option value="gross_contribution">Gross contribution</option><option value="commissionable_amount">Commissionable amount</option><option value="net_amount">Net amount</option><option value="gross_amount">Gross amount</option></select></label><label className="text-sm font-semibold text-text">Calculation type<select className={`${input} mt-1`} value={rule.calculation_mode} onChange={e => setRule(current => ({ ...current, calculation_mode: e.target.value }))}><option value="fixed">Fixed fee</option><option value="percentage">Percentage</option><option value="fixed_plus_percentage">Fixed + percentage</option><option value="marginal">Marginal brackets</option></select></label>{field('free_allowance', 'Free allowance', 'number')}{field('fixed_amount', 'Fixed fee', 'number')}{field('percentage_rate', 'Percentage rate', 'number')}{field('minimum_fee', 'Minimum fee', 'number')}{field('maximum_fee', 'Maximum fee (optional)', 'number')}{field('priority', 'Priority', 'number')}<label className="text-sm font-semibold text-text">Tax treatment<select className={`${input} mt-1`} value={rule.tax_treatment} onChange={e => setRule(current => ({ ...current, tax_treatment: e.target.value }))}><option value="out_of_scope">Out of scope</option><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option><option value="exempt">Exempt</option></select></label></div>{rule.calculation_mode === 'marginal' && <div className="mt-4 rounded-xl bg-background p-4"><div className="flex justify-between gap-2"><strong>Marginal brackets</strong><button className={secondary} onClick={() => setBrackets(current => [...current, { up_to: '', percentage_rate: '0' }])}>Add bracket</button></div><div className="mt-3 space-y-2">{brackets.map((item, index) => <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={index}><input className={input} type="number" placeholder="Up to; blank for final" value={item.up_to} onChange={e => setBrackets(current => current.map((row, i) => i === index ? { ...row, up_to: e.target.value } : row))} /><input className={input} type="number" placeholder="Rate %" value={item.percentage_rate} onChange={e => setBrackets(current => current.map((row, i) => i === index ? { ...row, percentage_rate: e.target.value } : row))} /><button className={secondary} disabled={brackets.length === 1} onClick={() => setBrackets(current => current.filter((_, i) => i !== index))}>Remove</button></div>)}</div></div>}{channelBlocked && <p className="mt-3 rounded-xl bg-warning/10 p-3 text-sm text-warning">This sales channel already has an enabled rule in this draft. Archive that rule before creating another.</p>}{error && <p className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(error)}</p>}<div className="mt-4 flex gap-2"><button className={primary} disabled={!rule.code || saving || channelBlocked} onClick={onSave}>Save rule</button><button className={secondary} onClick={onCancel}>Cancel</button></div></div></section>
}

function PlanPreview({ businessId, plan, navigation }: { businessId: string; plan: BillingPlan; navigation: ReactNode }) {
  const versions = useMemo(() => plan.versions.filter(version => ['shadow', 'active'].includes(version.status)), [plan])
  const businesses = useQuery({ queryKey: ['platform-businesses', 'billing-preview'], queryFn: () => listBusinesses() })
  const [previewBusinessId, setPreviewBusinessId] = useState(businessId)
  const [versionId, setVersionId] = useState(versions[0]?.public_id ?? '')
  const [values, setValues] = useState({ gross_amount: '1000', net_amount: '1000', cost_amount: '700', contribution_amount: '300', commissionable_amount: '1000', period_usage_before: '0' })
  const simulate = useMutation({ mutationFn: () => previewBillingPrice({ business_id: previewBusinessId, plan_version_id: versionId, event_type: 'local_pos', channel: 'pos', agreement_type: 'standard', ...values }) })
  return <section className={panel}>{navigation}<div className="mt-6 border-t border-border pt-6"><h3 className="text-lg font-bold text-text">Test calculator</h3><p className="mt-1 text-sm text-text-secondary">Preview this plan against sample business values. Nothing is saved, invoiced, or charged.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-text">Business used for this test<select className={`${input} mt-1`} value={previewBusinessId} onChange={e => setPreviewBusinessId(e.target.value)}><option value="">Choose a business</option>{businesses.data?.map(row => <option key={row.public_id} value={row.public_id}>{row.display_name}</option>)}</select></label><label className="text-sm font-semibold text-text">Pricing version<select className={`${input} mt-1`} value={versionId} onChange={e => setVersionId(e.target.value)}><option value="">Choose a published version</option>{versions.map(version => <option key={version.public_id} value={version.public_id}>Version {version.version_number}</option>)}</select></label></div><div className="mt-4 grid gap-3 md:grid-cols-3">{Object.entries(values).map(([key, value]) => <label className="text-xs font-semibold capitalize text-text-secondary" key={key}>{key.replace(/_/g, ' ')}<input className={`${input} mt-1`} type="number" value={value} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} /></label>)}</div><button className={`${primary} mt-4`} disabled={!previewBusinessId || !versionId || simulate.isPending} onClick={() => simulate.mutate()}>{simulate.isPending ? 'Calculating…' : 'Calculate preview'}</button>{simulate.error && <p className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">{errorMessage(simulate.error)}</p>}{simulate.data && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-wide text-primary">Estimated fee</p><p className="mt-1 text-3xl font-extrabold text-primary">{simulate.data.currency} {simulate.data.final_fee}</p><p className="mt-2 text-sm text-text-secondary">{simulate.data.explanation}</p></div>}</div></section>
}
