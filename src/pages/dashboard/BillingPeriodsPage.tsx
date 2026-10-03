import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { listBusinesses } from '@api/modules/businesses.api'
import {
  addBillingCreditNote, calculateBillingPeriod, calculateCurrentBillingPeriod, closeBillingPeriod,
  createMonthlyBillingInvoice, disputeBillingInvoice, getBusinessSellerWallet, issueBillingInvoice,
  listBusinessBillingPeriods, listBusinessBillingReviews, listPlatformBillingPeriods,
  listBusinessBillingInvoices, listPlatformBillingInvoices, listPlatformBillingReviews,
  payBillingInvoiceMpesa, processLateBillingEvents, resolveBillingInvoiceDispute,
  resolvePlatformBillingReview,
} from '@api/modules/billing.api'

export default function BillingPeriodsPage({ platform = false }: { platform?: boolean }) {
  const { hasPermission } = useAuth()
  const [params, setParams] = useSearchParams()
  const [businessId, setBusinessId] = useState(params.get('business') ?? '')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const now = new Date()
  const [invoiceMonth, setInvoiceMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [invoiceReason, setInvoiceReason] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const queryClient = useQueryClient()
  const key = ['billing-periods', platform ? businessId : 'current']
  const periods = useQuery({
    queryKey: key,
    queryFn: () => platform ? listPlatformBillingPeriods(businessId) : listBusinessBillingPeriods(),
    enabled: !platform || Boolean(businessId),
  })
  const wallet = useQuery({ queryKey: ['business-seller-wallet'], queryFn: getBusinessSellerWallet, enabled: !platform })
  const reviews = useQuery({
    queryKey: ['billing-review-queue', platform ? businessId : 'current'],
    queryFn: () => platform ? listPlatformBillingReviews(businessId) : listBusinessBillingReviews(),
    enabled: !platform || Boolean(businessId),
  })
  const invoicesKey = ['billing-invoices', platform ? businessId : 'current']
  const invoices = useQuery({
    queryKey: invoicesKey,
    queryFn: () => platform ? listPlatformBillingInvoices(businessId) : listBusinessBillingInvoices(),
    enabled: !platform || Boolean(businessId),
    refetchInterval: query => query.state.data?.some(invoice => Number(invoice.pending_payment_total) > 0) ? 5000 : false,
  })
  const businesses = useQuery({ queryKey: ['platform-businesses', 'billing'], queryFn: () => listBusinesses(), enabled: platform })
  const action = useMutation({
    mutationFn: async ({ kind, periodId }: { kind: 'current' | 'calculate' | 'close' | 'late'; periodId?: string }) => {
      if (!businessId) throw new Error('Enter a business UUID first.')
      if (kind === 'current') return calculateCurrentBillingPeriod(businessId)
      if (kind === 'late') return processLateBillingEvents(businessId)
      if (!periodId) throw new Error('A billing period is required.')
      return kind === 'close' ? closeBillingPeriod(businessId, periodId) : calculateBillingPeriod(businessId, periodId)
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: key }); void queryClient.invalidateQueries({ queryKey: ['billing-review-queue'] }) },
  })
  const resolveReview = useMutation({
    mutationFn: async (itemId: string) => {
      const note = reviewNotes[itemId]?.trim()
      if (!note) throw new Error('A resolution note is required.')
      return resolvePlatformBillingReview(businessId, itemId, note)
    },
    onSuccess: (_, itemId) => { setReviewNotes(current => ({ ...current, [itemId]: '' })); void queryClient.invalidateQueries({ queryKey: ['billing-review-queue'] }) },
  })
  const canReview = platform && hasPermission('platform.billing.assessments.review')
  const canClose = platform && hasPermission('platform.billing.assessments.close')
  const canManageInvoices = platform && hasPermission('platform.billing.invoices.manage')
  const canCredit = platform && hasPermission('platform.billing.credit_notes.manage')
  const canPay = !platform && hasPermission('business.billing.pay')
  const canDispute = !platform && hasPermission('business.billing.dispute')
  const invoiceAction = useMutation({
    mutationFn: async ({ kind, invoiceId }: { kind: 'create' | 'issue' | 'credit' | 'resolve' | 'pay' | 'dispute'; invoiceId?: string }) => {
      if (kind === 'create') {
        if (!businessId) throw new Error('Select a business first.')
        const [year, month] = invoiceMonth.split('-').map(Number)
        return createMonthlyBillingInvoice(businessId, year, month)
      }
      if (!invoiceId) throw new Error('Select an invoice first.')
      if (kind === 'issue') return issueBillingInvoice(businessId, invoiceId)
      if (kind === 'credit') return addBillingCreditNote(businessId, invoiceId, creditAmount, invoiceReason)
      if (kind === 'resolve') return resolveBillingInvoiceDispute(businessId, invoiceId, invoiceReason)
      if (kind === 'pay') return payBillingInvoiceMpesa(invoiceId, phone, paymentAmount || undefined)
      return disputeBillingInvoice(invoiceId, invoiceReason)
    },
    onSuccess: () => {
      setInvoiceReason(''); setCreditAmount(''); setPaymentAmount('')
      void queryClient.invalidateQueries({ queryKey: invoicesKey })
    },
  })

  return <div className="space-y-5 p-1">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Value-based billing</p><h1 className="text-2xl font-extrabold text-text">Weekly assessments</h1><p className="text-sm text-text-secondary">Completed POS sales are measured across all branches. Marketplace payment creates an estimate only; commission is recognized after delivery and credited after refunds. Fees remain shadow-only and a closed week is immutable.</p></header>
    {!platform && wallet.data && <section className="grid gap-3 sm:grid-cols-4">{[['Available', wallet.data.available_amount], ['Wallet balance', wallet.data.ledger_balance], ['Active reserves', wallet.data.active_reserve_amount], ['Projected billing', wallet.data.projected_reserve_amount]].map(([label, amount]) => <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm" key={label}><p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">{label}</p><p className="mt-2 text-xl font-extrabold text-text">{wallet.data.currency} {amount}</p></article>)}{Number(wallet.data.negative_balance) > 0 && <p className="sm:col-span-4 rounded-xl bg-error/10 p-3 text-sm text-error">Negative balance {wallet.data.currency} {wallet.data.negative_balance} will be recovered from future seller credits.</p>}</section>}
    {platform && <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm"><label className="block text-sm font-semibold text-text">Business</label><div className="mt-2 flex flex-wrap gap-2"><select className="min-w-72 flex-1 rounded-xl border border-border bg-background px-3 py-2" value={businessId} onChange={event => { const id = event.target.value; setBusinessId(id); setParams(id ? { business: id } : {}); }}><option value="">Select a business</option>{businesses.data?.map(business => <option value={business.public_id} key={business.public_id}>{business.display_name}</option>)}</select><button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white" disabled={!businessId} onClick={() => void periods.refetch()}>Load</button>{canReview && <><button className="rounded-xl border border-border px-4 py-2 font-semibold disabled:opacity-50" disabled={!businessId} onClick={() => action.mutate({ kind: 'current' })}>Calculate current week</button><button className="rounded-xl border border-border px-4 py-2 font-semibold disabled:opacity-50" disabled={!businessId} onClick={() => action.mutate({ kind: 'late' })}>Process late events</button></>}</div></section>}
    {periods.isPending && (!platform || businessId) && <p>Loading billing periods…</p>}
    {periods.isError && <p className="rounded-xl bg-error/10 p-3 text-error">{periods.error instanceof Error ? periods.error.message : 'Unable to load billing periods.'}</p>}
    {action.isError && <p className="rounded-xl bg-error/10 p-3 text-error">{action.error instanceof Error ? action.error.message : 'Billing action failed.'}</p>}
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-background text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-3">Week</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Provisional fee</th><th className="px-4 py-3">Events</th><th className="px-4 py-3">Review</th><th className="px-4 py-3">Status</th>{(canReview || canClose) && <th className="px-4 py-3">Actions</th>}</tr></thead><tbody className="divide-y divide-border">{periods.data?.map(period => <tr key={period.public_id}><td className="px-4 py-4 font-semibold">{new Date(period.starts_at).toLocaleDateString()} – {new Date(period.ends_at).toLocaleDateString()}<span className="block text-xs font-normal text-text-tertiary">Grace to {new Date(period.grace_ends_at).toLocaleString()}</span></td><td className="px-4 py-4">{period.currency} {period.provisional_usage_total}</td><td className="px-4 py-4 font-bold">{period.currency} {period.provisional_fee_total}</td><td className="px-4 py-4">{period.recognized_event_count}<span className="block text-xs text-text-tertiary">{period.late_event_count} late</span></td><td className="px-4 py-4">{period.incomplete_event_count}</td><td className="px-4 py-4 capitalize">{period.status}</td>{(canReview || canClose) && <td className="px-4 py-4"><div className="flex gap-2">{canReview && <button className="text-primary underline" onClick={() => action.mutate({ kind: 'calculate', periodId: period.public_id })}>Recalculate</button>}{canClose && period.status !== 'closed' && <button className="text-primary underline" onClick={() => action.mutate({ kind: 'close', periodId: period.public_id })}>Close</button>}</div></td>}</tr>)}{periods.data?.length === 0 && <tr><td className="px-4 py-10 text-center text-text-secondary" colSpan={(canReview || canClose) ? 7 : 6}>No weekly assessments have been calculated.</td></tr>}</tbody></table></div></section>
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-text">Monthly invoices</h2><p className="text-sm text-text-secondary">Closed weekly assessments are consolidated once. Shadow invoices are previews and cannot be collected.</p></div>{canManageInvoices && <div className="flex gap-2"><input aria-label="Invoice month" type="month" className="rounded-xl border border-border bg-background px-3 py-2" value={invoiceMonth} onChange={event => setInvoiceMonth(event.target.value)} /><button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={!businessId || invoiceAction.isPending} onClick={() => invoiceAction.mutate({ kind: 'create' })}>Create invoice</button></div>}</div>
      {(invoices.isError || invoiceAction.isError) && <p className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">{invoiceAction.error instanceof Error ? invoiceAction.error.message : invoices.error instanceof Error ? invoices.error.message : 'Invoice action failed.'}</p>}
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-background text-xs uppercase text-text-tertiary"><tr><th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Period</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Paid / credit</th><th className="px-3 py-3">Balance</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y divide-border">{invoices.data?.map(invoice => <tr key={invoice.public_id} className={selectedInvoice === invoice.public_id ? 'bg-primary/5' : ''}><td className="px-3 py-3 font-semibold">{invoice.invoice_number}<span className="block text-xs font-normal text-text-tertiary">eTIMS: {invoice.etims_status.replace(/_/g, ' ')}</span></td><td className="px-3 py-3">{new Date(invoice.period_start).toLocaleDateString()} – {new Date(invoice.period_end).toLocaleDateString()}</td><td className="px-3 py-3">{invoice.currency} {invoice.total_amount}</td><td className="px-3 py-3">{invoice.paid_total} / {invoice.credit_total}{Number(invoice.pending_payment_total) > 0 && <span className="block text-xs text-warning">{invoice.pending_payment_total} pending</span>}</td><td className="px-3 py-3 font-bold">{invoice.currency} {invoice.balance_due}</td><td className="px-3 py-3 capitalize">{invoice.is_shadow ? 'Shadow preview' : invoice.status.replace(/_/g, ' ')}</td><td className="px-3 py-3"><button className="font-semibold text-primary underline" onClick={() => setSelectedInvoice(current => current === invoice.public_id ? '' : invoice.public_id)}>{selectedInvoice === invoice.public_id ? 'Close' : 'Manage'}</button></td></tr>)}{invoices.data?.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-text-secondary">No monthly invoices yet.</td></tr>}</tbody></table></div>
      {selectedInvoice && (() => { const invoice = invoices.data?.find(row => row.public_id === selectedInvoice); if (!invoice) return null; return <div className="mt-4 rounded-xl border border-border bg-background p-4"><div className="flex flex-wrap gap-2">{canManageInvoices && invoice.status === 'draft' && <button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={invoice.is_shadow || invoiceAction.isPending} title={invoice.is_shadow ? 'Shadow invoices cannot be issued' : ''} onClick={() => invoiceAction.mutate({ kind: 'issue', invoiceId: invoice.public_id })}>Issue invoice</button>}</div>{canPay && !invoice.is_shadow && ['issued', 'partially_paid', 'overdue'].includes(invoice.status) && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="rounded-xl border border-border bg-surface px-3 py-2" placeholder="M-Pesa phone" value={phone} onChange={event => setPhone(event.target.value)} /><input className="rounded-xl border border-border bg-surface px-3 py-2" type="number" min="0.01" step="0.01" placeholder={`Amount, max ${invoice.balance_due}`} value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} /><button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={!phone || invoiceAction.isPending} onClick={() => invoiceAction.mutate({ kind: 'pay', invoiceId: invoice.public_id })}>Pay with M-Pesa</button></div>}<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input className="rounded-xl border border-border bg-surface px-3 py-2" placeholder={platform ? 'Credit or dispute resolution reason' : 'Explain the invoice dispute'} value={invoiceReason} onChange={event => setInvoiceReason(event.target.value)} />{canCredit && <><input className="w-40 rounded-xl border border-border bg-surface px-3 py-2" type="number" min="0.01" step="0.01" placeholder="Credit amount" value={creditAmount} onChange={event => setCreditAmount(event.target.value)} /><button className="rounded-xl border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-50" disabled={!invoiceReason.trim() || !creditAmount || invoiceAction.isPending} onClick={() => invoiceAction.mutate({ kind: 'credit', invoiceId: invoice.public_id })}>Issue credit</button></>}{canDispute && invoice.status !== 'disputed' && <button className="rounded-xl border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-50" disabled={!invoiceReason.trim() || invoiceAction.isPending} onClick={() => invoiceAction.mutate({ kind: 'dispute', invoiceId: invoice.public_id })}>Dispute</button>}{canManageInvoices && invoice.status === 'disputed' && <button className="rounded-xl border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-50" disabled={!invoiceReason.trim() || invoiceAction.isPending} onClick={() => invoiceAction.mutate({ kind: 'resolve', invoiceId: invoice.public_id })}>Resolve dispute</button>}</div>{invoice.dispute_reason && <p className="mt-3 rounded-lg bg-warning/10 p-3 text-sm text-text">Dispute: {invoice.dispute_reason}</p>}<div className="mt-4"><h3 className="text-sm font-bold text-text">Weekly assessment lines</h3><div className="mt-2 space-y-2">{invoice.lines?.map(line => <div key={line.public_id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-sm"><span>{line.description}</span><strong>{invoice.currency} {line.total_amount}</strong></div>)}</div></div>{Boolean(invoice.payments?.length) && <div className="mt-4"><h3 className="text-sm font-bold text-text">Payments</h3>{invoice.payments?.map(payment => <p className="mt-1 text-sm text-text-secondary" key={payment.public_id}>{payment.provider.toUpperCase()} · {invoice.currency} {payment.amount} · <span className="capitalize">{payment.status}</span>{payment.provider_receipt ? ` · ${payment.provider_receipt}` : ''}</p>)}</div>}{Boolean(invoice.credit_notes?.length) && <div className="mt-4"><h3 className="text-sm font-bold text-text">Credit notes</h3>{invoice.credit_notes?.map(note => <p className="mt-1 text-sm text-text-secondary" key={note.public_id}>{note.credit_note_number} · {invoice.currency} {note.amount} · {note.reason}</p>)}</div>}</div> })()}
    </section>
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-bold text-text">Incomplete-data review</h2><p className="text-sm text-text-secondary">A period cannot close while these source-data issues remain open.</p><div className="mt-4 space-y-3">{reviews.data?.map(item => <article className="rounded-xl border border-border bg-background p-4" key={item.public_id}><div><strong className="capitalize text-text">{item.reason_code.replace(/_/g, ' ')}</strong><p className="mt-1 text-xs text-text-tertiary">Detected {new Date(item.detected_at).toLocaleString()} · Period {item.period_id}</p><pre className="mt-2 whitespace-pre-wrap text-xs text-text-secondary">{JSON.stringify(item.details, null, 2)}</pre>{canReview && <div className="mt-3 flex flex-wrap gap-2"><input className="min-w-64 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Resolution note after correcting the source data" value={reviewNotes[item.public_id] ?? ''} onChange={event => setReviewNotes(current => ({ ...current, [item.public_id]: event.target.value }))} /><button className="rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50" disabled={!reviewNotes[item.public_id]?.trim() || resolveReview.isPending} onClick={() => resolveReview.mutate(item.public_id)}>Mark resolved</button></div>}</div></article>)}{reviews.data?.length === 0 && <p className="py-5 text-sm text-text-secondary">No billing data needs review.</p>}</div></section>
  </div>
}
