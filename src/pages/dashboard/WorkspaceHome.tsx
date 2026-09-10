import { Link } from 'react-router-dom'
import { useTenantState } from '@hooks/useTenantState'
import { experienceFor, workspaceMenu } from '@utils/experiences'

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
    <section><h2 className="mb-4 text-xl font-semibold">Available tools</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {workspaceMenu(user).map(item => <Link key={item.path} to={item.path} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400 hover:shadow-md"><span className="font-semibold">{item.label}</span><span aria-hidden="true" className="float-right">↗</span><p className="mt-2 text-sm text-slate-500">Open {item.label.toLowerCase()}</p></Link>)}
    </div>{workspaceMenu(user).length === 0 && <p className="rounded-xl border bg-white p-6 text-slate-600">No frontend tools are available for your current permissions. Contact your administrator if you need access.</p>}</section>
    <Link to="/account/workspaces" className="inline-block font-medium text-primary underline">Choose another workspace</Link>
  </div>
}
