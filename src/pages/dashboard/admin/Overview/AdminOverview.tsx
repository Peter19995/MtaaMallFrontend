import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSalesSummaryRequest } from '@api/modules/reports.api'
import { useAuth } from '@hooks/useAuth'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0
  }).format(amount)
}

const AdminOverview = () => {
  const { user } = useAuth()
  const isBusinessOwner = user?.role === 'business_owner'
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => getSalesSummaryRequest()
  })

  const cards: { label: string; value: string; hint: string }[] = data
    ? [
        {
          label: 'Total sales',
          value: formatCurrency(data.total_sales),
          hint: `${data.total_orders} orders (${data.online_orders} online, ${data.pos_orders} POS)`
        },
        {
          label: 'Open projects',
          value: String(data.active_projects),
          hint: 'Active projects currently in progress.'
        },
        {
          label: 'Low-stock SKUs',
          value: String(data.low_stock_products),
          hint: 'Products near or below reorder level.'
        }
      ]
    : [
        { label: 'Total sales', value: 'Loading...', hint: 'Fetching from reports API' },
        { label: 'Open projects', value: 'Loading...', hint: 'Fetching from reports API' },
        { label: 'Low-stock SKUs', value: 'Loading...', hint: 'Fetching from reports API' }
      ]

  return (
    <div className="space-y-6 text-text">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          {isBusinessOwner ? 'Business overview' : 'Admin overview'}
        </h1>
        <p className="text-xs text-text-tertiary sm:text-sm">
          {isBusinessOwner
            ? 'Manage products, branches, inventory, online orders and POS sales.'
            : 'High-level snapshot across projects, sales, inventory and staff activity.'}
        </p>
        {isLoading ? (
          <p className="text-xs text-text-tertiary">Loading live summary from `/api/v1/reports/summary`…</p>
        ) : null}
        {isError ? (
          <p className="text-xs text-error">
            Could not load live dashboard summary from the API. Showing fallback values.
          </p>
        ) : null}
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {card.label}
            </p>
            <p className="mt-2 text-xl font-semibold">{card.value}</p>
            <p className="mt-1 text-xs text-text-tertiary">{card.hint}</p>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Operations
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/dashboard/admin/products"
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-text-inverse hover:bg-primary-dark"
          >
            Product management
          </Link>
          <Link
            to="/dashboard/admin/inventory"
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-secondary-light"
          >
            Inventory operations
          </Link>
          <Link
            to="/dashboard/admin/projects"
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-secondary-light"
          >
            Projects
          </Link>
          <Link
            to="/dashboard/admin/sales"
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-secondary-light"
          >
            Sales
          </Link>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Operational pipeline
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            Here we will plug in real charts for inquiries → quotes → approvals → ongoing projects.
          </p>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              AI insights
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              “Weekend traffic is highest for curtain rods. Consider a targeted promotion this
              Saturday.”
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Alerts
            </p>
            <ul className="mt-2 space-y-1 text-xs text-text-secondary">
              <li>• 2 projects approaching deadlines this week.</li>
              <li>• Inventory below threshold in Westlands branch.</li>
              <li>• Payroll approval required for March.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminOverview
