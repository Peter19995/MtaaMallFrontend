import { useWorkspacePath } from '@hooks/useWorkspacePath'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, ArrowPathIcon, BanknotesIcon, ShoppingBagIcon, BuildingStorefrontIcon, CubeIcon, BriefcaseIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import { getMyBusiness } from '@api/modules/businesses.api'
import { getSalesSummaryRequest, getDailySalesRequest } from '@api/modules/reports.api'
import { ErrorNotice, StatusBadge } from './BusinessComponents'
import './business-workspace.css'
import './business-overview.css'

export function overviewRange(days: number, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) }
}

export default function BusinessOverviewPage() {
  const workspacePath = useWorkspacePath()
  const { user, hasPermission } = useAuth()
  const [days, setDays] = useState(30)
  const range = overviewRange(days)
  const business = useQuery({ queryKey: ['businesses', 'mine', user?.id], queryFn: getMyBusiness, refetchInterval: 30000 })
  const canReport = hasPermission('reports.read')
  const reportEnabled = Boolean(business.data) && !business.isError && canReport
  const summary = useQuery({ queryKey: ['business-overview', 'summary', user?.id, business.data?.public_id, range], queryFn: () => getSalesSummaryRequest(range), enabled: reportEnabled, refetchInterval: 30000 })
  const daily = useQuery({ queryKey: ['business-overview', 'daily', user?.id, business.data?.public_id, range], queryFn: () => getDailySalesRequest(range), enabled: reportEnabled, refetchInterval: 30000 })
  const formatMoney = (amount: number) => {
    const currency = business.data?.currency ?? 'KES'
    try { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount) }
    catch { return `${currency} ${amount.toLocaleString()}` }
  }
  const stats = summary.data
  const shortcuts = [
    { label: 'Sales & orders', description: 'Track sales and customer orders', path: workspacePath('/dashboard/admin/sales'), permission: 'orders.read', icon: ShoppingBagIcon },
    { label: 'Inventory', description: 'Review stock and replenishment', path: workspacePath('/dashboard/admin/inventory'), permission: 'inventory.read', icon: CubeIcon },
    { label: 'Projects', description: 'Follow your ongoing work', path: workspacePath('/dashboard/admin/projects'), permission: 'projects.read', icon: BriefcaseIcon },
    { label: 'Branches', description: 'Manage business locations', path: workspacePath('/dashboard/admin/branches'), permission: 'branches.read', icon: BuildingStorefrontIcon },
  ].filter(item => hasPermission(item.permission))
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(`${range.start_date}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + index)
    const key = date.toISOString().slice(0, 10)
    return daily.data?.find(point => point.date === key) ?? { date: key, total_sales: 0, orders: 0 }
  })
  const max = Math.max(1, ...series.map(point => point.total_sales))
  return <div className="business-workspace business-overview">
    <header className="business-page-heading"><div><p className="business-eyebrow">YOUR BUSINESS AT A GLANCE</p><h1>Business overview</h1><p>Performance, priorities and the tools to keep things moving.</p></div><Link to={workspacePath('/dashboard/business/profile')} className="business-outline-button"><UserCircleIcon aria-hidden="true" />Business profile</Link></header>
    {business.isPending && <div role="status" className="business-loading">Loading your business…</div>}
    {business.isError && <div className="overview-message"><ErrorNotice error={business.error} /><button className="business-outline-button" onClick={() => business.refetch()}>Retry business</button></div>}
    {business.data && !business.isError && <>
      <section className="overview-welcome"><div><p className="business-eyebrow">BUSINESS WORKSPACE</p><h2>{business.data.display_name}</h2><p>{business.data.branches.length} registered {business.data.branches.length === 1 ? 'branch' : 'branches'} · {business.data.currency}</p></div><StatusBadge status={business.data.status} /></section>
      <div className="overview-toolbar"><div><h2>Performance summary</h2><p>Sales and orders for the selected period · UTC dates</p></div><div className="overview-controls"><label>Period<select aria-label="Reporting period" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>{canReport && <button className="business-outline-button" aria-label="Refresh performance" disabled={summary.isFetching || daily.isFetching} onClick={() => { void summary.refetch(); void daily.refetch() }}><ArrowPathIcon aria-hidden="true" /></button>}</div></div>
      {!canReport ? <p className="overview-message">Your role does not include access to performance reports. Your permitted operational tools are available below.</p> : <>
        {summary.isPending && <p role="status" className="overview-message">Loading performance summary…</p>}
        {summary.isError && <div className="overview-message"><ErrorNotice error={summary.error} /><button className="business-outline-button" onClick={() => summary.refetch()}>Retry summary</button></div>}
        {stats && !summary.isError && <>
          <section className="overview-metrics" aria-label="Performance metrics">
            {[
              { label: 'Sales revenue', value: formatMoney(stats.total_sales), hint: 'Paid, shipped and delivered orders', icon: BanknotesIcon },
              { label: 'Total orders', value: stats.total_orders.toLocaleString(), hint: 'All order statuses in this period', icon: ShoppingBagIcon },
              { label: 'POS orders', value: stats.pos_orders.toLocaleString(), hint: 'In-store point-of-sale orders', icon: BuildingStorefrontIcon },
              { label: 'Online orders', value: stats.online_orders.toLocaleString(), hint: 'Orders placed through your store', icon: ShoppingBagIcon },
            ].map(item => <article className="business-card overview-metric" key={item.label}><div><p>{item.label}</p><item.icon aria-hidden="true" /></div><strong>{item.value}</strong><p>{item.hint}</p></article>)}
          </section>
          <div className="overview-analytics-grid">
            <section className="business-card overview-chart-card"><div className="overview-section-heading"><div><h2>Sales over time</h2><p>Daily revenue from paid and fulfilled orders</p></div><span>{days} days</span></div>
              {daily.isPending && <p role="status" className="overview-message">Loading daily sales…</p>}
              {daily.isError && <><ErrorNotice error={daily.error} /><button className="business-outline-button" onClick={() => daily.refetch()}>Retry daily sales</button></>}
              {daily.data && !daily.isError && (series.some(point => point.total_sales > 0) ? <>
                <div className="overview-chart" role="img" aria-label={`Daily sales from ${range.start_date} to ${range.end_date}. Exact amounts are available in the daily sales table below.`}>{series.map(point => <div key={point.date} className="overview-bar-slot" title={`${point.date}: ${formatMoney(point.total_sales)}`}><div style={{ height: `${point.total_sales / max * 100}%` }} /></div>)}</div><div className="overview-chart-labels"><span>{range.start_date}</span><span>{range.end_date}</span></div>
                <details className="overview-daily-table"><summary>View daily sales data</summary><div><table><caption>Daily sales (UTC)</caption><thead><tr><th>Date</th><th>Revenue</th><th>Paid / fulfilled orders</th></tr></thead><tbody>{series.map(point => <tr key={point.date}><td>{point.date}</td><td>{formatMoney(point.total_sales)}</td><td>{point.orders}</td></tr>)}</tbody></table></div></details>
              </> : <div className="overview-empty"><BanknotesIcon aria-hidden="true" /><h3>No sales revenue in this period</h3><p>Paid and fulfilled orders will appear here once you start trading.</p></div>)}
            </section>
            <section className="business-card overview-operations"><div className="overview-section-heading"><div><h2>Operations snapshot</h2><p>Current status · not date-filtered</p></div></div><dl>
              <div><dt><CubeIcon aria-hidden="true" />Low-stock items</dt><dd className={stats.low_stock_products > 0 ? 'overview-warning' : ''}>{stats.low_stock_products}</dd></div>
              <div><dt><BriefcaseIcon aria-hidden="true" />Active projects</dt><dd>{stats.active_projects}</dd></div>
              <div><dt><BuildingStorefrontIcon aria-hidden="true" />Active branches</dt><dd>{business.data.branches.filter(branch => branch.is_active).length} / {business.data.branches.length}</dd></div>
            </dl><p className="overview-operation-note">{stats.low_stock_products > 0 ? 'Some branch stock items are at or below their reorder level. Review inventory for replenishment.' : 'No low-stock items are currently reported for your business.'}</p></section>
          </div>
        </>}
      </>}
      <section className="overview-tools"><div className="overview-section-heading"><div><h2>Run your business</h2><p>Go straight to your daily operations.</p></div>{hasPermission('pos.sell') && (!['suspended', 'closed'].includes(business.data.status) ? <Link to={workspacePath('/dashboard/admin/sales/create')} className="business-primary-button">New POS sale</Link> : <span className="overview-pos-locked">POS is unavailable while the business is restricted</span>)}</div><div className="overview-shortcuts">{shortcuts.map(item => <Link key={item.path} to={item.path} className="business-card"><item.icon aria-hidden="true" /><div><h3>{item.label}</h3><p>{item.description}</p></div><ArrowUpRightIcon aria-hidden="true" /></Link>)}</div></section>
    </>}
  </div>
}
