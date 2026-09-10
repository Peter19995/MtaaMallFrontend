import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSalesSummaryRequest } from '@api/modules/reports.api'
import { useAuth } from '@hooks/useAuth'
import { workspaceMenu } from '@utils/experiences'

export default function AdminOverview() {
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['reports', 'summary', user?.context], queryFn: () => getSalesSummaryRequest() })
  const data = query.data
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Operational reports</h1><p className="mt-2 text-slate-600">A live summary of your selected business and permitted branches.</p></header>
    {query.isPending && <p role="status">Loading reports…</p>}
    {query.isError && <div role="alert">Unable to load reports. <button className="underline" onClick={() => query.refetch()}>Retry</button></div>}
    {data && !query.isError && <section className="grid gap-4 sm:grid-cols-3">
      {[{ label: 'Orders', value: data.total_orders }, { label: 'Active projects', value: data.active_projects }, { label: 'Low-stock products', value: data.low_stock_products }].map(item =>
        <article key={item.label} className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-3 text-3xl font-bold">{item.value}</p></article>
      )}
    </section>}
    <section><h2 className="mb-4 text-lg font-semibold">Your operational tools</h2><div className="flex flex-wrap gap-3">
      {workspaceMenu(user ?? {}).filter(m => /\/(products|inventory|projects|sales)$/.test(m.path)).map(m => <Link key={m.path} to={m.path} className="rounded-xl border bg-white px-5 py-3 text-sm font-medium">{m.label}</Link>)}
    </div></section>
  </div>
}
