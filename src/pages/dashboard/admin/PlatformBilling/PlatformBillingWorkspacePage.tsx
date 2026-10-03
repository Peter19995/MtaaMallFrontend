import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { listBusinesses } from '@api/modules/businesses.api'
import {
  createBillingAgreement, createBillingPlan, createBillingPlanVersion, createBillingRule,
  endBillingAgreement, getBillingAuditHistory, getBillingReconciliation, listBillingAgreements,
  listBillingPlans, previewBillingPrice, publishBillingVersionShadow, updateBillingRule,
  type BillingRule,
} from '@api/modules/billing.api'
import BillingPeriodsPage from '../../BillingPeriodsPage'
import BillingPlansPanel from './BillingPlansPanel'

export type PlatformBillingView = 'reconciliation' | 'plans' | 'agreements' | 'assessments' | 'audit'
const panel = 'rounded-2xl border border-border bg-surface p-5 shadow-sm'
const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary'
const button = 'rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text disabled:opacity-50'
const today = () => new Date().toISOString().slice(0, 16)

function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null
  const value = error as { response?: { data?: { detail?: string } }; message?: string }
  return <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{value.response?.data?.detail ?? value.message ?? 'The operation failed.'}</p>
}

const viewContent: Record<PlatformBillingView, { title: string; description: string }> = {
  reconciliation: { title: 'Billing reconciliation', description: 'Compare assessments, invoices, payments and outstanding balances for a business.' },
  plans: { title: 'Billing plans', description: 'Create and maintain reusable pricing plans before assigning them to businesses.' },
  agreements: { title: 'Business agreements', description: 'Assign published pricing plans and review a business’s agreement history.' },
  assessments: { title: 'Assessments & invoices', description: 'Review billing periods, assessed fees, invoices, credits and payments.' },
  audit: { title: 'Billing audit history', description: 'Inspect the immutable history of billing configuration and financial operations.' },
}

export default function PlatformBillingWorkspacePage({ view }: { view: PlatformBillingView }) {
  const { hasPermission } = useAuth()
  const [params, setParams] = useSearchParams()
  const [businessId, setBusinessId] = useState(params.get('business') ?? '')
  const queryClient = useQueryClient()
  const businesses = useQuery({ queryKey: ['platform-businesses', 'billing-workspace'], queryFn: () => listBusinesses(), enabled: view !== 'plans' })
  const plans = useQuery({ queryKey: ['billing-plans'], queryFn: listBillingPlans })
  const agreements = useQuery({
    queryKey: ['billing-agreements', businessId], queryFn: () => listBillingAgreements(businessId), enabled: view === 'agreements' && Boolean(businessId),
  })
  const reconciliation = useQuery({
    queryKey: ['billing-reconciliation', businessId], queryFn: () => getBillingReconciliation(businessId),
    enabled: view === 'reconciliation' && Boolean(businessId) && hasPermission('platform.billing.reconcile'),
  })
  const audit = useQuery({
    queryKey: ['billing-audit', businessId], queryFn: () => getBillingAuditHistory(businessId),
    enabled: view === 'audit' && Boolean(businessId) && hasPermission('platform.billing.audit.read'),
  })
  const publishedVersions = useMemo(() => plans.data?.filter(plan => plan.status === 'active').flatMap(plan => plan.versions
    .filter(version => ['shadow', 'active'].includes(version.status))
    .map(version => ({ ...version, planName: plan.name }))) ?? [], [plans.data])

  const selectBusiness = (value: string) => {
    setBusinessId(value)
    const next = new URLSearchParams(params)
    if (value) next.set('business', value); else next.delete('business')
    setParams(next)
  }

  return <div className="space-y-5 p-1">
    <header className="rounded-3xl bg-gradient-to-br from-primary/15 via-surface to-secondary/10 p-6">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Platform finance</p>
      <h1 className="mt-1 text-3xl font-extrabold text-text">{viewContent[view].title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-text-secondary">{viewContent[view].description}</p>
    </header>

    {view !== 'plans' && <section className={panel}>
      <label className="text-xs font-bold uppercase tracking-wide text-text-tertiary">Business workspace</label>
      <select className={`${input} mt-2`} value={businessId} onChange={event => selectBusiness(event.target.value)}>
        <option value="">Select a business for agreements and financial review</option>
        {businesses.data?.map(row => <option key={row.public_id} value={row.public_id}>{row.display_name} · {row.status}</option>)}
      </select>
    </section>}

    {view === 'reconciliation' && <ReconciliationPanel businessId={businessId} data={reconciliation.data} error={reconciliation.error} />}
    {view === 'plans' && <BillingPlansPanel businessId={businessId} plans={plans.data ?? []} canManage={hasPermission('platform.billing.plans.manage')} onChanged={() => void queryClient.invalidateQueries({ queryKey: ['billing-plans'] })} />}
    {view === 'agreements' && <AgreementsPanel businessId={businessId} versions={publishedVersions} agreements={agreements.data ?? []} canManage={hasPermission('platform.billing.agreements.manage')} onChanged={() => void queryClient.invalidateQueries({ queryKey: ['billing-agreements', businessId] })} />}
    {view === 'assessments' && <BillingPeriodsPage platform key={businessId || 'no-business'} />}
    {view === 'audit' && <AuditPanel businessId={businessId} data={audit.data ?? []} error={audit.error} />}
  </div>
}

function ReconciliationPanel({ businessId, data, error }: { businessId: string; data?: Awaited<ReturnType<typeof getBillingReconciliation>>; error: unknown }) {
  if (!businessId) return <section className={panel}><p className="text-sm text-text-secondary">Select a business to reconcile assessments, invoices, credits and payments.</p></section>
  return <div className="space-y-4">
    <ErrorNotice error={error} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Assessed', data?.assessment_total], ['Invoiced', data?.invoice_total],
        ['Paid', data?.completed_payment_total], ['Outstanding', data?.balance_due],
      ].map(([label, amount]) => <article className={panel} key={label}><p className="text-xs font-bold uppercase text-text-tertiary">{label}</p><p className="mt-2 text-2xl font-extrabold text-text">{data?.currency ?? 'KES'} {amount ?? '0.00'}</p></article>)}
    </section>
    <section className={`${panel} grid gap-5 lg:grid-cols-2`}>
      <div><h2 className="text-lg font-bold text-text">Assessment pipeline</h2><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><Metric label="Final assessment total" value={`${data?.currency ?? 'KES'} ${data?.assessment_total ?? '0.00'}`} /><Metric label="Assessment lines invoiced" value={`${data?.currency ?? 'KES'} ${data?.invoiced_assessment_total ?? '0.00'}`} /><Metric label="Awaiting invoice" value={`${data?.currency ?? 'KES'} ${data?.uninvoiced_assessment_total ?? '0.00'}`} /><Metric label="Open data reviews" value={String(data?.open_reviews ?? 0)} /></dl></div>
      <div><h2 className="text-lg font-bold text-text">Invoice state</h2><div className="mt-3 flex flex-wrap gap-2">{Object.entries(data?.invoice_counts ?? {}).map(([status, count]) => <span key={status} className="rounded-full bg-background px-3 py-1 text-xs font-semibold capitalize text-text-secondary">{status.replace(/_/g, ' ')} · {count}</span>)}</div><p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${data?.is_reconciled ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{data?.is_reconciled ? 'No balance inconsistencies detected.' : 'Review reconciliation differences before issuing or settling invoices.'}</p></div>
    </section>
    <section className={panel}><h2 className="text-lg font-bold text-text">Reconciliation issues</h2><div className="mt-3 space-y-2">{data?.issues.map(issue => <article key={`${issue.kind}-${issue.invoice_id}`} className="rounded-xl border border-error/20 bg-error/5 p-3 text-sm"><strong>{issue.invoice_number}</strong><p className="text-text-secondary">Expected {issue.expected}; recorded {issue.actual}</p></article>)}{data?.issues.length === 0 && <p className="text-sm text-text-secondary">No invoice balance mismatches found.</p>}</div></section>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-background p-3"><dt className="text-xs text-text-tertiary">{label}</dt><dd className="mt-1 font-bold text-text">{value}</dd></div>
}

function PricingPanel({ businessId, plans, publishedVersions, canManage, onChanged }: { businessId: string; plans: Awaited<ReturnType<typeof listBillingPlans>>; publishedVersions: (Awaited<ReturnType<typeof listBillingPlans>>[number]['versions'][number] & { planName: string })[]; canManage: boolean; onChanged: () => void }) {
  const [planName, setPlanName] = useState('')
  const [planCode, setPlanCode] = useState('')
  const [versionPlan, setVersionPlan] = useState('')
  const [ruleVersion, setRuleVersion] = useState('')
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null)
  const [rule, setRule] = useState({ code: 'POS_STANDARD', event_type: 'local_pos', channel: 'pos', calculation_basis: 'gross_contribution', calculation_mode: 'percentage', free_allowance: '0', fixed_amount: '0', percentage_rate: '2', minimum_fee: '0', maximum_fee: '', priority: '100', tax_treatment: 'exclusive' })
  const [brackets, setBrackets] = useState([{ up_to: '', percentage_rate: '2' }])
  const [previewVersion, setPreviewVersion] = useState('')
  const [preview, setPreview] = useState({ gross_amount: '1000', net_amount: '1000', cost_amount: '700', contribution_amount: '300', commissionable_amount: '1000', period_usage_before: '0' })
  const createPlan = useMutation({ mutationFn: () => createBillingPlan({ code: planCode.trim().toUpperCase().replace(/\s+/g, '_'), name: planName.trim() }), onSuccess: () => { setPlanName(''); setPlanCode(''); onChanged() } })
  const createVersion = useMutation({ mutationFn: () => createBillingPlanVersion(versionPlan, { currency: 'KES', timezone: 'Africa/Nairobi', effective_from: new Date().toISOString(), configuration: { shadow_only: true } }), onSuccess: onChanged })
  const saveRule = useMutation({
    mutationFn: () => {
      const body = { ...rule, priority: Number(rule.priority), maximum_fee: rule.maximum_fee || null, effective_from: new Date().toISOString(), marginal_brackets: rule.calculation_mode === 'marginal' ? brackets.map(item => ({ up_to: item.up_to || null, percentage_rate: item.percentage_rate })) : [], configuration: { calculation_mode: rule.calculation_mode, shadow_only: true }, currency: 'KES', is_enabled: true }
      return editingRule ? updateBillingRule(editingRule.public_id, body) : createBillingRule(ruleVersion, body)
    },
    onSuccess: () => { setEditingRule(null); onChanged() },
  })
  const publish = useMutation({ mutationFn: publishBillingVersionShadow, onSuccess: onChanged })
  const simulate = useMutation({ mutationFn: () => previewBillingPrice({ business_id: businessId, plan_version_id: previewVersion, event_type: 'local_pos', channel: 'pos', agreement_type: 'standard', ...preview }) })
  const loadRule = (row: BillingRule, versionId: string) => { setEditingRule(row); setRuleVersion(versionId); setBrackets(row.marginal_brackets.length ? row.marginal_brackets.map(item => ({ up_to: item.up_to ?? '', percentage_rate: item.percentage_rate })) : [{ up_to: '', percentage_rate: row.percentage_rate }]); setRule({ code: row.code, event_type: row.event_type, channel: row.channel, calculation_basis: row.calculation_basis, calculation_mode: String(row.configuration.calculation_mode ?? (row.marginal_brackets.length ? 'marginal' : Number(row.fixed_amount) && Number(row.percentage_rate) ? 'fixed_plus_percentage' : Number(row.fixed_amount) ? 'fixed' : 'percentage')), free_allowance: row.free_allowance, fixed_amount: row.fixed_amount, percentage_rate: row.percentage_rate, minimum_fee: row.minimum_fee, maximum_fee: row.maximum_fee ?? '', priority: String(row.priority), tax_treatment: row.tax_treatment }) }
  const error = createPlan.error || createVersion.error || saveRule.error || publish.error || simulate.error

  return <div className="space-y-4">
    <ErrorNotice error={error} />
    {canManage && <section className={`${panel} grid gap-5 lg:grid-cols-2`}><div><h2 className="font-bold text-text">Create plan</h2><div className="mt-3 grid gap-2 sm:grid-cols-2"><input className={input} placeholder="Plan name" value={planName} onChange={e => setPlanName(e.target.value)} /><input className={input} placeholder="PLAN_CODE" value={planCode} onChange={e => setPlanCode(e.target.value)} /><button className={`${button} sm:col-span-2`} disabled={!planName.trim() || !planCode.trim() || createPlan.isPending} onClick={() => createPlan.mutate()}>Create disabled plan</button></div></div><div><h2 className="font-bold text-text">Create draft version</h2><div className="mt-3 grid gap-2"><select className={input} value={versionPlan} onChange={e => setVersionPlan(e.target.value)}><option value="">Choose plan</option>{plans.map(plan => <option key={plan.public_id} value={plan.public_id}>{plan.name}</option>)}</select><button className={button} disabled={!versionPlan || createVersion.isPending} onClick={() => createVersion.mutate()}>Create next draft</button></div></div></section>}
    <section className={panel}><h2 className="text-lg font-bold text-text">Pricing plans</h2><p className="text-sm text-text-secondary">Published rules are immutable. Copy their values into a new draft version to change pricing.</p><div className="mt-4 space-y-4">{plans.map(plan => <article key={plan.public_id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap justify-between gap-2"><div><strong className="text-text">{plan.name}</strong><p className="text-xs text-text-tertiary">{plan.code} · {plan.charging_mode} · charges disabled</p></div></div><div className="mt-3 space-y-2">{plan.versions.map(version => <div key={version.public_id} className="rounded-lg bg-background p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">Version {version.version_number} · <span className="capitalize">{version.status}</span></span>{canManage && version.status === 'draft' && <button className={secondary} disabled={!version.rules.length || publish.isPending} onClick={() => publish.mutate(version.public_id)}>Publish shadow</button>}</div>{version.rules.map(item => <div key={item.public_id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-sm"><span><strong>{item.code}</strong> · {item.calculation_basis} · {item.percentage_rate}%</span>{canManage && version.status === 'draft' && <button className="font-semibold text-primary underline" onClick={() => loadRule(item, version.public_id)}>Edit</button>}</div>)}</div>)}</div></article>)}</div></section>
    {canManage && <section className={panel}><h2 className="text-lg font-bold text-text">{editingRule ? `Edit ${editingRule.code}` : 'Add rule to draft'}</h2><div className="mt-3 grid gap-3 md:grid-cols-3"><select className={input} value={ruleVersion} onChange={e => setRuleVersion(e.target.value)} disabled={Boolean(editingRule)}><option value="">Draft version</option>{plans.flatMap(plan => plan.versions.filter(v => v.status === 'draft').map(v => <option key={v.public_id} value={v.public_id}>{plan.name} · v{v.version_number}</option>))}</select>{Object.entries(rule).map(([key, value]) => key === 'calculation_mode' ? <select key={key} className={input} value={value} onChange={e => setRule(current => ({ ...current, [key]: e.target.value }))}><option value="fixed">Fixed fee</option><option value="percentage">Percentage</option><option value="fixed_plus_percentage">Fixed + percentage</option><option value="marginal">Marginal bracket</option></select> : key === 'tax_treatment' ? <select key={key} className={input} value={value} onChange={e => setRule(current => ({ ...current, [key]: e.target.value }))}><option value="exclusive">Tax exclusive</option><option value="inclusive">Tax inclusive</option><option value="exempt">Tax exempt</option><option value="out_of_scope">Out of scope</option></select> : <label key={key} className="text-xs font-semibold capitalize text-text-secondary">{key.replace(/_/g, ' ')}<input className={`${input} mt-1`} value={value} onChange={e => setRule(current => ({ ...current, [key]: e.target.value }))} /></label>)}</div>{rule.calculation_mode === 'marginal' && <div className="mt-4 rounded-xl bg-background p-4"><div className="flex items-center justify-between"><div><h3 className="font-bold text-text">Marginal brackets</h3><p className="text-xs text-text-secondary">Keep the last upper limit empty for the open-ended bracket.</p></div><button className={secondary} onClick={() => setBrackets(current => [...current, { up_to: '', percentage_rate: '0' }])}>Add bracket</button></div><div className="mt-3 space-y-2">{brackets.map((item, index) => <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={index}><input className={input} type="number" placeholder="Up to (blank = no limit)" value={item.up_to} onChange={e => setBrackets(current => current.map((row, i) => i === index ? { ...row, up_to: e.target.value } : row))} /><input className={input} type="number" step="0.000001" placeholder="Rate %" value={item.percentage_rate} onChange={e => setBrackets(current => current.map((row, i) => i === index ? { ...row, percentage_rate: e.target.value } : row))} /><button className={secondary} disabled={brackets.length === 1} onClick={() => setBrackets(current => current.filter((_, i) => i !== index))}>Remove</button></div>)}</div></div>}<div className="mt-3 flex gap-2"><button className={button} disabled={!ruleVersion || !rule.code || saveRule.isPending} onClick={() => saveRule.mutate()}>{editingRule ? 'Save draft rule' : 'Add rule'}</button>{editingRule && <button className={secondary} onClick={() => setEditingRule(null)}>Cancel</button>}</div></section>}
    <section className={panel}><h2 className="text-lg font-bold text-text">Pricing preview</h2><p className="text-sm text-text-secondary">This deterministic simulation creates no event, assessment, invoice, or charge.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><select className={input} value={previewVersion} onChange={e => setPreviewVersion(e.target.value)}><option value="">Published version</option>{publishedVersions.map(v => <option key={v.public_id} value={v.public_id}>{v.planName} · v{v.version_number}</option>)}</select>{Object.entries(preview).map(([key, value]) => <label key={key} className="text-xs font-semibold capitalize text-text-secondary">{key.replace(/_/g, ' ')}<input className={`${input} mt-1`} type="number" step="0.01" value={value} onChange={e => setPreview(current => ({ ...current, [key]: e.target.value }))} /></label>)}</div><button className={`${button} mt-3`} disabled={!businessId || !previewVersion || simulate.isPending} onClick={() => simulate.mutate()}>Calculate preview</button>{simulate.data && <div className="mt-4 rounded-xl bg-primary/5 p-4"><p className="text-2xl font-extrabold text-primary">{simulate.data.currency} {simulate.data.final_fee}</p><p className="mt-2 text-sm text-text-secondary">{simulate.data.explanation}</p></div>}</section>
  </div>
}

function AgreementsPanel({ businessId, versions, agreements, canManage, onChanged }: { businessId: string; versions: { public_id: string; version_number: number; planName: string }[]; agreements: Awaited<ReturnType<typeof listBillingAgreements>>; canManage: boolean; onChanged: () => void }) {
  const [versionId, setVersionId] = useState('')
  const [type, setType] = useState('standard')
  const [effectiveFrom, setEffectiveFrom] = useState(today())
  const [rate, setRate] = useState('')
  const create = useMutation({ mutationFn: () => createBillingAgreement(businessId, { plan_version_id: versionId, agreement_type: type, status: 'active', effective_from: new Date(effectiveFrom).toISOString(), custom_terms: rate ? { percentage_rate: rate } : {} }), onSuccess: onChanged })
  const end = useMutation({ mutationFn: (id: string) => endBillingAgreement(businessId, id), onSuccess: onChanged })
  if (!businessId) return <section className={panel}><p className="text-sm text-text-secondary">Select a business to manage its pricing agreement.</p></section>
  return <div className="space-y-4"><ErrorNotice error={create.error || end.error} />{canManage && <section className={panel}><h2 className="text-lg font-bold text-text">Assign agreement</h2><p className="text-sm text-text-secondary">Agreements use a published immutable version and remain shadow-only.</p><div className="mt-3 grid gap-3 md:grid-cols-4"><select className={input} value={versionId} onChange={e => setVersionId(e.target.value)}><option value="">Pricing version</option>{versions.map(v => <option key={v.public_id} value={v.public_id}>{v.planName} · v{v.version_number}</option>)}</select><select className={input} value={type} onChange={e => setType(e.target.value)}><option value="standard">Standard</option><option value="fixed">Fixed</option><option value="percentage">Percentage</option><option value="fixed_plus_percentage">Fixed + percentage</option><option value="custom">Custom</option><option value="promotional">Promotional</option></select><input className={input} type="datetime-local" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} /><input className={input} type="number" step="0.000001" placeholder="Optional % override" value={rate} onChange={e => setRate(e.target.value)} /></div><button className={`${button} mt-3`} disabled={!versionId || !effectiveFrom || create.isPending} onClick={() => create.mutate()}>Assign shadow agreement</button></section>}<section className={panel}><h2 className="text-lg font-bold text-text">Agreement history</h2><div className="mt-3 space-y-3">{agreements.map(row => <article key={row.public_id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{row.plan_name} · v{row.version_number}</strong><p className="text-sm capitalize text-text-secondary">{row.agreement_type.replace(/_/g, ' ')} · {row.status} · {row.currency}</p><p className="text-xs text-text-tertiary">From {new Date(row.effective_from).toLocaleString()}{row.effective_to ? ` to ${new Date(row.effective_to).toLocaleString()}` : ''}</p></div>{canManage && !['ended', 'cancelled'].includes(row.status) && <button className={secondary} onClick={() => end.mutate(row.public_id)}>End agreement</button>}</div></article>)}{agreements.length === 0 && <p className="text-sm text-text-secondary">No billing agreement has been assigned.</p>}</div></section></div>
}

function AuditPanel({ businessId, data, error }: { businessId: string; data: Awaited<ReturnType<typeof getBillingAuditHistory>>; error: unknown }) {
  if (!businessId) return <section className={panel}><p className="text-sm text-text-secondary">Select a business to inspect its immutable billing history.</p></section>
  return <section className={panel}><div><h2 className="text-lg font-bold text-text">Immutable billing audit</h2><p className="text-sm text-text-secondary">These records are append-only and preserve actor, context, values and time.</p></div><ErrorNotice error={error} /><div className="mt-4 space-y-3">{data.map(row => <article key={row.id} className="rounded-xl border border-border bg-background p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-text">{row.action.replace(/\./g, ' · ')}</strong><time className="text-xs text-text-tertiary">{new Date(row.created_at).toLocaleString()}</time></div><p className="mt-1 text-xs text-text-secondary">{row.resource_type} · {row.resource_id} · actor {row.actor_user_id ?? row.actor_kind} · {row.context}</p>{(row.before || row.after || Object.keys(row.details ?? {}).length > 0) && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-primary">View captured values</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-text-secondary">{JSON.stringify({ before: row.before, after: row.after, details: row.details }, null, 2)}</pre></details>}</article>)}{data.length === 0 && <p className="text-sm text-text-secondary">No billing audit events have been recorded for this business.</p>}</div></section>
}
