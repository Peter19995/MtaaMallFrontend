import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTenantState } from '@hooks/useTenantState'
import { experienceFor, workspaceMenu } from '@utils/experiences'
import { getDailyPosSummaryRequest, listPosSalesRequest } from '@api/modules/pos.api'
import { listBranchesRequest } from '@api/modules/branches.api'
import type { UserResponse } from '@api/modules/auth.api'

const money = (value: number) => new Intl.NumberFormat('en-KE', {
  style: 'currency', currency: 'KES', maximumFractionDigits: 0
}).format(value)

function EmployeeSnapshot({ user }: { user: UserResponse }) {
  const salesStaff = user.roles?.includes('sales_staff') ?? false
  const branchManager = user.roles?.includes('branch_manager') ?? false
  const summary = useQuery({
    queryKey: ['employee-home', 'pos-summary', user.business_id],
    queryFn: () => getDailyPosSummaryRequest(),
    enabled: salesStaff
  })
  const sales = useQuery({
    queryKey: ['employee-home', 'pos-sales', user.business_id],
    queryFn: () => listPosSalesRequest({ limit: 5 }),
    enabled: salesStaff
  })
  const branches = useQuery({
    queryKey: ['employee-home', 'branches', user.business_id],
    queryFn: listBranchesRequest,
    enabled: branchManager
  })

  if (salesStaff) return <section aria-label="My sales today" className="grid gap-4 md:grid-cols-3">
    <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">My sales today</p><strong className="mt-2 block text-2xl text-primary">{money(summary.data?.net_sales ?? 0)}</strong></article>
    <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">My transactions</p><strong className="mt-2 block text-2xl">{summary.data?.total_transactions ?? 0}</strong></article>
    <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Recent sales</p><strong className="mt-2 block text-2xl">{sales.data?.length ?? 0}</strong><p className="mt-1 text-xs text-slate-500">Only sales recorded against your membership</p></article>
  </section>

  if (branchManager) return <section className="rounded-2xl border bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold">Assigned branch operations</h2>
    <p className="mt-1 text-sm text-slate-500">Team, stock, orders and reports are limited to these branches.</p>
    <div className="mt-4 flex flex-wrap gap-2">{(branches.data ?? []).map(branch => <span key={branch.id} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{branch.name}</span>)}</div>
    {!branches.isLoading && !branches.data?.length && <p className="mt-4 text-sm text-amber-700">No branch is assigned. Branch operations are unavailable.</p>}
  </section>
  return null
}

export default function WorkspaceHome({ lifecycle = false }: { lifecycle?: boolean }) {
  const { data: user } = useTenantState()
  if (!user) return null
  const experience = experienceFor(user)
  const restricted = ['suspended', 'closed'].includes(user.business_status ?? '')
  const title = lifecycle ? (restricted ? 'Business access is restricted' : 'Business onboarding') : experience === 'platform' ? 'Platform overview' : 'Your employee workspace'
  const business = user.business_memberships?.find(m => m.business_id === user.business_id)
  return <div className="space-y-8">
    <section className="rounded-3xl bg-slate-900 p-7 text-white md:p-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">{business?.business_name ?? 'MtaaMall'} · {experience === 'platform' ? 'Platform' : 'Selected business'}</p>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-300">{lifecycle ? restricted
        ? 'Sales and management changes are disabled. Permitted historical records remain available. Contact platform support about restoring access.'
        : 'Complete your business profile and follow the review status. Operational tools become available after platform approval.'
        : 'Your tools reflect the permissions of this workspace. Switch workspace to work with another business or shop using your personal account.'}</p>
      {user.business_status && <p className="mt-5 inline-block rounded-full border border-white/30 px-4 py-2 text-sm">Status: {user.business_status.replace(/_/g, ' ')}</p>}
      {experience === 'employee' && <p className="mt-4 text-sm text-slate-300">{user.branch_scope === 'all' ? 'All branches in this business' : `${user.allowed_branch_ids?.length ?? 0} assigned branches`}{user.branch_scope === 'selected' && !user.allowed_branch_ids?.length ? ' — ask your manager for a branch assignment before branch work.' : ''}</p>}
    </section>
    {experience === 'employee' && <EmployeeSnapshot user={user} />}
    <section><h2 className="mb-4 text-xl font-semibold">Available tools</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {workspaceMenu(user).map(item => <Link key={item.path} to={item.path} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400 hover:shadow-md"><span className="font-semibold">{item.label}</span><span aria-hidden="true" className="float-right">↗</span><p className="mt-2 text-sm text-slate-500">Open {item.label.toLowerCase()}</p></Link>)}
    </div>{workspaceMenu(user).length === 0 && <p className="rounded-xl border bg-white p-6 text-slate-600">No frontend tools are available for your current permissions. Contact your administrator if you need access.</p>}</section>
    <Link to="/account/workspaces" className="inline-block font-medium text-primary underline">Choose another workspace</Link>
  </div>
}
