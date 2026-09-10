import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { listAudit, listApprovals, decideApproval, type Approval } from '@api/modules/audit.api'

const labels = { discount: 'Discounted POS sale', refund: 'POS refund', stock_writeoff: 'Stock write-off' }
const pretty = (value: unknown) => JSON.stringify(value, null, 2)
function Decision({ row }: { row: Approval }) {
  const { user } = useAuth()
  const client = useQueryClient()
  const [reason, setReason] = useState('')
  const mutation = useMutation({ mutationFn: (decision: 'approve' | 'reject') => decideApproval(row.id, decision, reason.trim()),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['approvals'] }); client.invalidateQueries({ queryKey: ['audit'] }) } })
  const canDecide = user?.business_status === 'active' && row.status === 'pending' &&
    new Date(row.expires_at).getTime() > Date.now() && String(row.requested_by_user_id) !== user?.id &&
    user?.permissions?.includes(`approvals.${row.kind}.approve`)
  if (!canDecide) return null
  return <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
    <label className="block text-sm font-medium">Decision reason<textarea aria-label={`Decision reason ${row.id}`} className="mt-2 w-full rounded-lg border p-3" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} /></label>
    <p className="text-xs text-slate-600">Approval immediately executes this exact request. Review the branch, amounts and stock/payment snapshot first. Refunds record the POS ledger adjustment; external payment-provider payouts are not issued by this screen.</p>
    <div className="flex gap-3"><button className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40" disabled={mutation.isPending || reason.trim().length < 3} onClick={() => { if (window.confirm(`Approve and execute ${labels[row.kind].toLowerCase()}?`)) mutation.mutate('approve') }}>Approve & execute</button><button className="rounded-lg border px-4 py-2 disabled:opacity-40" disabled={mutation.isPending || reason.trim().length < 3} onClick={() => mutation.mutate('reject')}>Reject</button></div>
    {mutation.isError && <p role="alert" className="text-red-700">{mutation.error.message}</p>}
  </div>
}

export default function AuditApprovalsPage({ approvals = false }: { approvals?: boolean }) {
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const [action, setAction] = useState('')
  const platform = user?.context === 'platform'
  const audit = useQuery({ queryKey: ['audit', user?.context, offset, action], queryFn: () => listAudit(platform, offset, action), enabled: !approvals, refetchInterval: 30000 })
  const requests = useQuery({ queryKey: ['approvals', user?.context, offset], queryFn: () => listApprovals(offset), enabled: approvals, refetchInterval: 15000 })
  const query = approvals ? requests : audit
  return <div className="space-y-6">
    <header className="rounded-2xl bg-slate-900 p-7 text-white"><p className="text-xs uppercase tracking-widest text-slate-300">Accountability & control</p><h1 className="mt-3 text-3xl font-bold">{approvals ? 'Sensitive action approvals' : 'Audit history'}</h1><p className="mt-3 max-w-3xl text-sm text-slate-300">{approvals ? 'Discounts, refunds and stock write-offs require a different authorized approver. Requests expire after 24 hours and cannot execute if the relevant data or permissions change.' : 'Append-only events from your authorized scope. Expand an event to compare before and after values. Records cannot be edited or deleted.'}</p></header>
    {approvals && <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">Submit discounts from New POS sale, refunds from Sales, and stock reductions from Inventory. Requesting approval does not complete the operation or reserve stock.</p>}
    <div className="flex flex-wrap items-center gap-3">{!approvals && <input className="rounded-lg border p-3" placeholder="Exact action, e.g. products.price.changed" aria-label="Filter by action" value={action} onChange={e => { setAction(e.target.value); setOffset(0) }} />}<button className="rounded-lg border bg-white px-4 py-3" onClick={() => query.refetch()}>Refresh</button></div>
    {query.isPending && <p role="status">Loading records…</p>}
    {query.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{query.error.message}</p>}
    {!query.isError && query.data?.length === 0 && <p className="rounded-xl border bg-white p-6">No records in your permitted scope.</p>}
    {!approvals && !audit.isError && audit.data?.map(event => <article className="rounded-2xl border bg-white p-5 shadow-sm" key={event.id}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{event.action}</h2><time className="text-sm text-slate-500">{new Date(event.created_at).toLocaleString()}</time></div><p className="mt-2 break-all text-sm text-slate-600">Actor: {event.actor_user_id ? `User #${event.actor_user_id}` : event.actor_kind} · {event.resource_type} #{event.resource_id} · {event.business_id ? `Business ${event.business_id}` : 'Platform / identity'}{event.branch_id ? ` · Branch #${event.branch_id}` : ''}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Before / after & event details</summary><div className="mt-3 grid gap-3 md:grid-cols-2">{[['Before', event.before], ['After', event.after]].map(([label, value]) => <div key={String(label)}><h3 className="text-sm font-semibold">{String(label)}</h3><pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">{pretty(value)}</pre></div>)}</div><pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">{pretty(event.details)}</pre></details></article>)}
    {approvals && !requests.isError && requests.data?.map(row => <article className="rounded-2xl border bg-white p-6 shadow-sm" key={row.id}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{labels[row.kind]}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{row.status === 'pending' && new Date(row.expires_at).getTime() <= Date.now() ? 'expired' : row.status}</span></div><p className="mt-3">{row.reason}</p><p className="mt-2 text-sm text-slate-500">Branch #{row.branch_id} · Requested by #{row.requested_by_user_id} · Expires {new Date(row.expires_at).toLocaleString()}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Review exact request and snapshot</summary><pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">{pretty({ payload: row.payload, snapshot: row.snapshot })}</pre></details>{row.decision_reason && <p className="mt-3 text-sm">Decision by #{row.decided_by_user_id}: {row.decision_reason}</p>}{row.result && <pre className="mt-3 overflow-auto rounded-lg bg-green-50 p-3 text-xs">{pretty(row.result)}</pre>}<Decision row={row} /></article>)}
    <div className="flex items-center gap-4"><button className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><span className="text-sm">Page {offset / 50 + 1}</span><button className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40" disabled={query.data?.length !== 50} onClick={() => setOffset(offset + 50)}>Next</button></div>
  </div>
}
