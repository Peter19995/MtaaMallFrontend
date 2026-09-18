import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowPathIcon, BanknotesIcon, BuildingStorefrontIcon, CreditCardIcon } from '@heroicons/react/24/outline'

import { listBusinesses } from '@api/modules/businesses.api'
import {
  approveSettlement, getPaymentAlerts, getPaymentMetrics, getPaymentReconciliation, getPaymentTransactions,
  getSettlementSummaries, listSettlements, markSettlementPaid,
  prepareSettlement, reconcilePayment, rejectSettlement, resolvePaymentAlert,
  saveCommissionPolicy, submitSettlement,
  type PaymentTransaction,
} from '@api/modules/platformPayments.api'
import { useAuth } from '@hooks/useAuth'
import { Select, useSiteDialog } from '@components/common'

const panel = 'rounded-2xl border border-border bg-white shadow-sm'
const input = 'rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
const linkButton = 'rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90'
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'

function Header({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="rounded-3xl bg-gradient-to-r from-primary-dark to-secondary-dark px-6 py-7 text-white shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{eyebrow}</p><h1 className="mt-1 text-3xl font-bold">{title}</h1><p className="mt-2 max-w-2xl text-sm text-white/80">{text}</p></header>
}

export function PlatformPaymentsOverviewPage() {
  const businesses = useQuery({ queryKey: ['platform-businesses-for-payments'], queryFn: () => listBusinesses() })
  const transactions = useQuery({ queryKey: ['platform-payment-transactions-overview'], queryFn: () => getPaymentTransactions() })
  const successful = transactions.data?.filter(item => item.state === 'successful').length ?? 0
  return <div className="mx-auto max-w-6xl space-y-6 pb-12"><Header eyebrow="Platform administration" title="Payments" text="Monitor payment activity and safely manage the online system account and business POS accounts." />
    <section className="grid gap-4 sm:grid-cols-3">{[
      { label: 'Recent attempts', value: transactions.data?.length ?? 0, Icon: CreditCardIcon },
      { label: 'Successful', value: successful, Icon: BanknotesIcon },
      { label: 'Businesses', value: businesses.data?.length ?? 0, Icon: BuildingStorefrontIcon },
    ].map(({ label, value, Icon }) => <div className={`${panel} p-5`} key={label}><Icon className="h-6 w-6 text-primary-dark" /><p className="mt-4 text-2xl font-bold text-text">{value}</p><p className="text-sm text-text-secondary">{label}</p></div>)}</section>
    <section className="grid gap-4 md:grid-cols-2">{[
      ['/platform/payments/mpesa', 'Online system M-Pesa', 'Configure the platform account used by online checkout.'],
      ['/platform/payments/transactions', 'Transactions', 'Review payment attempts across online and POS channels.'],
      ['/platform/payments/reconciliation', 'Reconciliation', 'Investigate unknown, timed-out and failed callback records.'],
      ['/platform/settlements', 'Settlements', 'See successful collections grouped by seller business.'],
    ].map(([to, title, text]) => <Link className={`${panel} block p-5 transition hover:border-primary`} to={to} key={to}><h2 className="font-bold text-text">{title}</h2><p className="mt-2 text-sm text-text-secondary">{text}</p><span className="mt-4 inline-block text-sm font-bold text-primary-dark">Open →</span></Link>)}</section>
    <section className={`${panel} p-5`}><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-text">Business POS configurations</h2><p className="text-sm text-text-secondary">Open a business to manage its separate merchant account.</p></div></div><div className="mt-4 divide-y divide-border">{businesses.data?.map(item => <div key={item.public_id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold text-text">{item.display_name}</p><p className="text-xs capitalize text-text-tertiary">{item.status}</p></div><Link className={linkButton} to={`/platform/businesses/${item.public_id}/payments`}>Manage POS</Link></div>)}</div></section>
  </div>
}

function TransactionsTable({ rows }: { rows: PaymentTransaction[] }) {
  return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase text-text-tertiary"><tr><th className="px-3 py-3">Business</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">State</th><th className="px-3 py-3">Receipt</th><th className="px-3 py-3">Created</th></tr></thead><tbody className="divide-y divide-border">{rows.map(row => <tr key={row.public_id}><td className="px-3 py-3 font-semibold text-text">{row.business_name}</td><td className="px-3 py-3 uppercase text-text-secondary">{row.channel}</td><td className="px-3 py-3">{row.currency} {row.amount}</td><td className="px-3 py-3 capitalize">{row.state.replace(/_/g, ' ')}</td><td className="px-3 py-3">{row.mpesa_receipt_number ?? '—'}</td><td className="px-3 py-3 text-text-secondary">{date(row.created_at)}</td></tr>)}{rows.length === 0 && <tr><td className="px-3 py-8 text-center text-text-secondary" colSpan={6}>No matching payment attempts.</td></tr>}</tbody></table></div>
}

export function PlatformTransactionsPage() {
  const [channel, setChannel] = useState(''); const [state, setState] = useState(''); const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['platform-payment-transactions', channel, state], queryFn: () => getPaymentTransactions({ channel: channel || undefined, state: state || undefined }) })
  const rows = useMemo(() => (query.data ?? []).filter(row => `${row.business_name} ${row.mpesa_receipt_number ?? ''} ${row.checkout_request_id ?? ''}`.toLowerCase().includes(search.toLowerCase())), [query.data, search])
  return <div className="mx-auto max-w-7xl space-y-6 pb-12"><Header eyebrow="Platform payments" title="Transactions" text="Read-only payment attempts from the system online account and all business POS accounts." /><section className={`${panel} p-4`}><div className="flex flex-wrap gap-3"><input className={`${input} min-w-64 flex-1`} placeholder="Search business, receipt or request ID" value={search} onChange={e => setSearch(e.target.value)} /><Select className={input} value={channel} onChange={e => setChannel(e.target.value)}><option value="">All channels</option><option value="online">Online</option><option value="pos">POS</option></Select><Select className={input} value={state} onChange={e => setState(e.target.value)}><option value="">All states</option>{['created','initiating','pending_customer','successful','failed','cancelled','timed_out','unknown'].map(value => <option value={value} key={value}>{value.replace(/_/g,' ')}</option>)}</Select></div><div className="mt-4"><TransactionsTable rows={rows} /></div></section></div>
}

export function PlatformReconciliationPage() {
  const { hasPermission } = useAuth()
  const dialog = useSiteDialog()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['platform-payment-reconciliation'], queryFn: getPaymentReconciliation })
  const metrics = useQuery({ queryKey: ['platform-payment-metrics'], queryFn: () => getPaymentMetrics(24) })
  const alerts = useQuery({ queryKey: ['platform-payment-alerts'], queryFn: getPaymentAlerts })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-payment-reconciliation'] })
    queryClient.invalidateQueries({ queryKey: ['platform-payment-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts'] })
  }
  const reconcile = useMutation({
    mutationFn: reconcilePayment,
    onSuccess: result => { refresh(); dialog.alert({ title: 'Reconciliation complete', message: `Current payment state: ${result.status.replace(/_/g, ' ')}.` }) },
  })
  const resolve = useMutation({
    mutationFn: async (alertId: string) => {
      const note = await dialog.prompt({ title: 'Resolve payment alert', message: 'Record what was checked or corrected.', inputLabel: 'Resolution note', confirmLabel: 'Resolve', minLength: 3 })
      if (!note) throw new Error('Action cancelled')
      return resolvePaymentAlert(alertId, note)
    },
    onSuccess: refresh,
  })
  const metricRows = [
    ['Initiation success', `${metrics.data?.initiation_success_rate ?? 0}%`],
    ['Payment success', `${metrics.data?.payment_success_rate ?? 0}%`],
    ['Average callback delay', metrics.data?.average_callback_delay_seconds == null ? '—' : `${metrics.data.average_callback_delay_seconds}s`],
    ['Pending', String(metrics.data?.pending_transactions ?? 0)],
    ['Reconciliation failures', String(metrics.data?.reconciliation_failures ?? 0)],
    ['Open alerts', String(metrics.data?.open_alerts ?? 0)],
  ]
  return <div className="mx-auto max-w-7xl space-y-6 pb-12"><Header eyebrow="Platform payments" title="Reconciliation & monitoring" text="Recover delayed M-Pesa results and review operational warnings without exposing provider payloads or credentials." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{metricRows.map(([label, value]) => <div className={`${panel} p-4`} key={label}><p className="text-2xl font-bold text-text">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">{label}</p></div>)}</section>
    <section className={`${panel} overflow-hidden`}><div className="flex items-center gap-2 border-b border-border px-5 py-4"><ArrowPathIcon className="h-5 w-5 text-primary-dark" /><div><h2 className="font-bold text-text">Unresolved payment intents</h2><p className="text-sm text-text-secondary">Manual checks use the same amount, receipt and order locks as automatic reconciliation.</p></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-background text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-3">Business</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Review</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-border">{query.data?.payment_intents.map(row => <tr key={row.public_id}><td className="px-4 py-4 font-semibold">{row.business_name}<span className="block text-xs font-normal text-text-tertiary">Order #{row.order_id}</span></td><td className="px-4 py-4">{row.currency} {row.amount}</td><td className="px-4 py-4 capitalize">{row.state.replace(/_/g, ' ')}</td><td className="px-4 py-4">{row.reconciliation_attempt_count}</td><td className="max-w-xs px-4 py-4 text-error">{row.review_reason ?? (row.review_required ? 'Review required' : '—')}</td><td className="px-4 py-4">{hasPermission('platform.payments.reconcile') && <button className={linkButton} disabled={reconcile.isPending} onClick={() => reconcile.mutate(row.public_id)}>Reconcile now</button>}</td></tr>)}{query.data?.payment_intents.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No unresolved payment intents.</td></tr>}</tbody></table></div></section>
    <section className={`${panel} p-5`}><h2 className="font-bold text-text">Operational alerts</h2><div className="mt-4 divide-y divide-border">{alerts.data?.map(alert => <div className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_1fr_2fr_auto] md:items-center" key={alert.public_id}><div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${alert.severity === 'critical' ? 'bg-red-50 text-error' : 'bg-amber-50 text-amber-700'}`}>{alert.severity}</span><p className="mt-2 font-semibold capitalize text-text">{alert.alert_type.replace(/_/g, ' ')}</p></div><div><p className="font-semibold">{alert.business_name ?? 'Platform callback'}</p><p className="text-xs text-text-tertiary">Seen {alert.occurrence_count} time(s)</p></div><p className="text-text-secondary">{alert.message}</p>{hasPermission('platform.payments.reconcile') && <button className={`${input} font-bold`} disabled={resolve.isPending} onClick={() => resolve.mutate(alert.public_id)}>Resolve</button>}</div>)}{alerts.data?.length === 0 && <p className="py-4 text-sm text-text-secondary">No open operational alerts.</p>}</div></section>
    <section className={`${panel} p-5`}><h2 className="font-bold text-text">Callback exceptions</h2><div className="mt-4 divide-y divide-border">{query.data?.callback_events.map(event => <div className="grid gap-1 py-3 text-sm sm:grid-cols-4" key={event.id}><span className="font-semibold text-text">{event.checkout_request_id ?? 'Unknown request'}</span><span className="capitalize">{event.processing_status}</span><span className="text-error">{event.error_message ?? 'Review required'}</span><span className="text-text-secondary">{date(event.received_at)}</span></div>)}{query.data?.callback_events.length === 0 && <p className="py-4 text-sm text-text-secondary">No callback exceptions require attention.</p>}</div></section></div>
}

export function PlatformSettlementsPage() {
  const { hasPermission } = useAuth()
  const dialog = useSiteDialog()
  const queryClient = useQueryClient()
  const wallets = useQuery({ queryKey: ['platform-settlement-wallets'], queryFn: getSettlementSummaries })
  const settlements = useQuery({ queryKey: ['platform-settlements'], queryFn: listSettlements })
  const businesses = useQuery({ queryKey: ['platform-businesses-for-settlements'], queryFn: () => listBusinesses() })
  const [policy, setPolicy] = useState({ businessId: '', name: 'Standard agreement', percentage: '0', fixed: '0', providerPercentage: '0', providerFixed: '0' })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-settlement-wallets'] })
    queryClient.invalidateQueries({ queryKey: ['platform-settlements'] })
  }
  const action = useMutation({
    mutationFn: async ({ kind, id }: { kind: string; id: string }) => {
      if (kind === 'submit') return submitSettlement(id)
      if (kind === 'approve') return approveSettlement(id)
      if (kind === 'reject') {
        const reason = await dialog.prompt({ title: 'Reject settlement', message: 'The ledger entries will return to the available wallet balance.', inputLabel: 'Reason', confirmLabel: 'Reject', minLength: 3 })
        if (!reason) throw new Error('Action cancelled')
        return rejectSettlement(id, reason)
      }
      const reference = await dialog.prompt({ title: 'Record completed payout', message: 'Enter the external bank or M-Pesa payout reference. This cannot be reused.', inputLabel: 'Payout reference', confirmLabel: 'Mark paid', minLength: 3 })
      if (!reference) throw new Error('Action cancelled')
      return markSettlementPaid(id, reference)
    },
    onSuccess: refresh
  })
  const prepare = useMutation({
    mutationFn: ({ businessId, currency }: { businessId: string; currency: string }) => prepareSettlement(businessId, currency),
    onSuccess: refresh
  })
  const savePolicy = useMutation({
    mutationFn: () => saveCommissionPolicy(policy.businessId, {
      name: policy.name, percentage_rate: Number(policy.percentage), fixed_fee: Number(policy.fixed),
      provider_fee_percentage: Number(policy.providerPercentage), provider_fee_fixed: Number(policy.providerFixed)
    }),
    onSuccess: () => dialog.alert({ title: 'Commission policy saved', message: 'New online payments will use this agreement. Historical ledger entries are unchanged.' })
  })
  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <Header eyebrow="Platform payments" title="Seller wallets & settlements" text="Reconcile online collections, fees and commission before approving external seller payouts." />
    <section className={`${panel} p-5`}>
      <h2 className="font-bold text-text">Commission policy</h2>
      <p className="mt-1 text-sm text-text-secondary">Policies apply to future successful online payments only.</p>
      {hasPermission('platform.settlements.configure_commission') && <form className="mt-4 grid gap-3 md:grid-cols-6" onSubmit={e => { e.preventDefault(); savePolicy.mutate() }}>
        <Select className={input} required value={policy.businessId} onChange={e => setPolicy({ ...policy, businessId: e.target.value })}><option value="">Select business</option>{businesses.data?.map(item => <option value={item.public_id} key={item.public_id}>{item.display_name}</option>)}</Select>
        <input className={input} required value={policy.name} onChange={e => setPolicy({ ...policy, name: e.target.value })} placeholder="Agreement name" />
        <input className={input} type="number" min="0" max="100" step="0.0001" value={policy.percentage} onChange={e => setPolicy({ ...policy, percentage: e.target.value })} placeholder="Commission %" aria-label="Commission percentage" />
        <input className={input} type="number" min="0" step="0.01" value={policy.fixed} onChange={e => setPolicy({ ...policy, fixed: e.target.value })} placeholder="Fixed commission" aria-label="Fixed commission" />
        <input className={input} type="number" min="0" max="100" step="0.0001" value={policy.providerPercentage} onChange={e => setPolicy({ ...policy, providerPercentage: e.target.value })} placeholder="Provider fee %" aria-label="Provider fee percentage" />
        <div className="flex gap-2"><input className={`${input} min-w-0 flex-1`} type="number" min="0" step="0.01" value={policy.providerFixed} onChange={e => setPolicy({ ...policy, providerFixed: e.target.value })} placeholder="Provider fixed" aria-label="Provider fixed fee" /><button className={linkButton} disabled={savePolicy.isPending}>Save</button></div>
      </form>}
    </section>
    <section className={`${panel} overflow-hidden`}><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-background text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-4">Business</th><th className="px-4 py-4">Gross</th><th className="px-4 py-4">Provider fees</th><th className="px-4 py-4">Commission</th><th className="px-4 py-4">Net ledger</th><th className="px-4 py-4">Available</th><th className="px-4 py-4">Action</th></tr></thead><tbody className="divide-y divide-border">{wallets.data?.map(row => <tr key={`${row.business_id}-${row.currency}`}><td className="px-4 py-4 font-semibold">{row.business_name}<span className="block text-xs font-normal text-text-tertiary">{row.entry_count} entries</span></td><td className="px-4 py-4">{row.currency} {row.gross_amount}</td><td className="px-4 py-4 text-error">− {row.provider_fee}</td><td className="px-4 py-4 text-error">− {row.platform_commission}</td><td className="px-4 py-4 font-bold">{row.currency} {row.net_amount}</td><td className="px-4 py-4 font-bold text-primary-dark">{row.currency} {row.available_amount}</td><td className="px-4 py-4">{hasPermission('platform.settlements.prepare') && <button className={linkButton} disabled={Number(row.available_amount) <= 0 || prepare.isPending} onClick={() => prepare.mutate({ businessId: row.business_id, currency: row.currency })}>Prepare</button>}</td></tr>)}{wallets.data?.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-text-secondary">No successful online collections have reached the seller ledger.</td></tr>}</tbody></table></div></section>
    <section className={`${panel} overflow-hidden`}><div className="border-b border-border px-5 py-4"><h2 className="font-bold text-text">Settlement statements</h2><p className="text-sm text-text-secondary">A different authorized administrator must approve a submitted statement.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-background text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-3">Statement</th><th className="px-4 py-3">Business</th><th className="px-4 py-3">Net payable</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payout reference</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-border">{settlements.data?.map(row => <tr key={row.public_id}><td className="px-4 py-4 font-mono text-xs">{row.settlement_number}<span className="block font-sans text-text-tertiary">{row.item_count} entries</span></td><td className="px-4 py-4 font-semibold">{row.business_name}</td><td className="px-4 py-4 font-bold">{row.currency} {row.net_amount}</td><td className="px-4 py-4 capitalize">{row.status.replace(/_/g, ' ')}</td><td className="px-4 py-4">{row.external_payout_reference ?? '—'}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{row.status === 'draft' && hasPermission('platform.settlements.prepare') && <button className={linkButton} onClick={() => action.mutate({ kind: 'submit', id: row.public_id })}>Submit</button>}{row.status === 'pending_approval' && hasPermission('platform.settlements.approve') && <><button className={linkButton} onClick={() => action.mutate({ kind: 'approve', id: row.public_id })}>Approve</button><button className={`${input} text-error`} onClick={() => action.mutate({ kind: 'reject', id: row.public_id })}>Reject</button></>}{row.status === 'approved' && hasPermission('platform.settlements.payout') && <button className={linkButton} onClick={() => action.mutate({ kind: 'pay', id: row.public_id })}>Record payout</button>}</div></td></tr>)}{settlements.data?.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-text-secondary">No settlement statements have been prepared.</td></tr>}</tbody></table></div></section>
  </div>
}
