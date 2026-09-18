import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import api from '@api/config/axios.config'
import { inviteBusinessEmployee, listBusinessInvitations, listBusinessMembers, revokeBusinessMember,
  setBusinessMemberAccess, updateBusinessMemberBranches, updateBusinessMemberRole,
  type Membership } from '@api/modules/memberships.api'
import { ErrorNotice, button, secondary } from './BusinessComponents'
import { Select } from '@components/common'

const roles = ['business_owner', 'business_admin', 'branch_manager', 'inventory_manager', 'sales_staff', 'accountant', 'project_manager', 'content_manager', 'business_auditor']
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm'
const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'
const nice = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
type Mode = 'invite' | 'role' | 'branches' | 'access'

export default function BusinessWorkforcePage() {
  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode | null>(null)
  const [selected, setSelected] = useState<Membership | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('sales_staff')
  const [branchScope, setBranchScope] = useState<'all' | 'selected'>('selected')
  const [branchIds, setBranchIds] = useState<number[]>([])
  const [access, setAccess] = useState<'suspend' | 'reactivate' | 'revoke'>('suspend')
  const [reason, setReason] = useState('')

  const members = useQuery({ queryKey: ['business-workforce', 'members', user?.context], queryFn: listBusinessMembers, refetchInterval: 30000 })
  const invitations = useQuery({ queryKey: ['business-workforce', 'invitations', user?.context], queryFn: listBusinessInvitations, refetchInterval: 30000 })
  const branches = useQuery({ queryKey: ['business-workforce', 'branches', user?.context], queryFn: async () =>
    (await api.get<{ id: number; name: string; is_active: boolean }[]>('/branches/')).data })
  const activeCount = members.data?.filter(member => member.status === 'active').length ?? 0
  const pendingCount = invitations.data?.filter(invitation => invitation.status === 'pending').length ?? 0
  const branchNames = useMemo(() => new Map(branches.data?.map(branch => [branch.id, branch.name]) ?? []), [branches.data])
  const owner = user?.roles?.includes('business_owner')

  const close = () => { setMode(null); setSelected(null); setReason(''); setEmail(''); setBranchScope('selected'); setBranchIds([]) }
  const open = (next: Mode, member?: Membership) => {
    setMode(next); setSelected(member ?? null); setReason(''); setEmail('')
    setRole(member?.role ?? 'sales_staff'); setBranchScope(member?.branch_scope ?? 'selected'); setBranchIds(member?.branch_ids ?? [])
    setAccess(member?.status === 'suspended' ? 'reactivate' : 'suspend')
  }
  const save = useMutation({ mutationFn: async () => {
    if (mode === 'invite') return inviteBusinessEmployee({ email: email.trim(), role, branch_scope: branchScope, branch_ids: branchScope === 'all' ? [] : branchIds, reason: reason.trim() })
    if (!selected) throw new Error('Choose a team member')
    if (mode === 'role') return updateBusinessMemberRole(selected.id, role, reason.trim())
    if (mode === 'branches') return updateBusinessMemberBranches(selected.id, branchScope, branchScope === 'all' ? [] : branchIds, reason.trim())
    if (access === 'revoke') return revokeBusinessMember(selected.id, reason.trim())
    return setBusinessMemberAccess(selected.id, access, reason.trim())
  }, onSuccess: async () => { close(); await queryClient.invalidateQueries({ queryKey: ['business-workforce'] }); await queryClient.invalidateQueries({ queryKey: ['memberships'] }) } })

  const allOnly = role === 'business_owner' || role === 'business_admin'
  const selectedOnly = role === 'branch_manager' || role === 'sales_staff'
  const toggleBranch = (id: number) => setBranchIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-7 text-white shadow-xl sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">People & access</p><h1 className="mt-2 text-3xl font-bold">Business workforce</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Invite employees securely, assign the right role and branches, and remove access instantly.</p></div>{hasPermission('business.members.invite') && hasPermission('business.members.assign_role') && <button className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300" onClick={() => open('invite')}>Invite employee</button>}</div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">{[['Active employees', activeCount], ['Pending invitations', pendingCount], ['Business branches', branches.data?.filter(branch => branch.is_active).length ?? 0]].map(([label, count]) => <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10" key={String(label)}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-3xl font-bold">{count}</p></div>)}</div>
    </header>

    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Roles apply only to this business. Employees cannot promote themselves, platform roles are unavailable here, and the last active owner is protected.</p>
    {(members.isError || invitations.isError || branches.isError) && <ErrorNotice error={members.error || invitations.error || branches.error} />}

    <section className={`${card} overflow-hidden`}><div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="text-lg font-semibold">Team members</h2><p className="mt-1 text-sm text-slate-500">Active, suspended and revoked memberships for this business.</p></div>
      {members.isPending ? <p className="p-6" role="status">Loading workforce…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Employee</th><th className="p-4">Role</th><th className="p-4">Branches</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{members.data?.map(member => { const self = member.user_id === Number(user?.id); return <tr key={member.id}><td className="p-4"><p className="font-semibold text-slate-900">{member.full_name || member.username}{self ? ' (you)' : ''}</p><p className="mt-1 text-xs text-slate-500">{member.email || `@${member.username}`}</p></td><td className="p-4">{nice(member.role)}</td><td className="p-4">{member.branch_scope === 'all' ? 'All branches' : member.branch_ids.length ? member.branch_ids.map(id => branchNames.get(id) || `Branch ${id}`).join(', ') : <span className="font-medium text-amber-700">No branch access</span>}</td><td className="p-4 capitalize">{member.status}</td><td className="p-4"><div className="flex flex-wrap gap-2">{!self && member.status !== 'revoked' && hasPermission('business.members.assign_role') && <><button className={secondary} onClick={() => open('role', member)}>Role</button>{member.role !== 'business_owner' && member.role !== 'business_admin' && <button className={secondary} onClick={() => open('branches', member)}>Branches</button>}</>}{!self && member.status !== 'revoked' && hasPermission('business.members.suspend') && <button className={secondary} onClick={() => open('access', member)}>Access</button>}</div></td></tr> })}</tbody></table>{members.data?.length === 0 && <p className="p-8 text-center text-slate-500">No team members found in your branch scope.</p>}</div>}
    </section>

    <section className={`${card} p-5 sm:p-6`}><h2 className="text-lg font-semibold">Invitation history</h2><p className="mt-1 text-sm text-slate-500">Pending links expire after 72 hours and can be accepted only once.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{invitations.data?.map(invitation => <article className="rounded-xl border border-slate-200 p-4" key={invitation.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{invitation.email}</p><p className="mt-1 text-xs text-slate-500">{nice(invitation.role)} · {invitation.branch_scope === 'all' ? 'All branches' : invitation.branch_ids.length ? `${invitation.branch_ids.length} selected` : 'No branch access'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{invitation.status}</span></div><p className="mt-3 text-xs text-slate-400">Expires {new Date(invitation.expires_at).toLocaleString()}</p></article>)}</div>{invitations.data?.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No invitations sent yet.</p>}</section>

    {mode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Workforce change"><section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">{mode === 'invite' ? 'Invite an employee' : mode === 'role' ? `Change ${selected?.username}'s role` : mode === 'branches' ? `Assign ${selected?.username}'s branches` : `Change ${selected?.username}'s access`}</h2><p className="mt-1 text-sm text-slate-500">The reason and your identity will be saved to the audit history.</p>{save.isError && <div className="mt-4"><ErrorNotice error={save.error} /></div>}
      <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); save.mutate() }}>
        {mode === 'invite' && <label className="block text-sm font-medium">Employee email<input aria-label="Employee email" className={field} type="email" required value={email} onChange={event => setEmail(event.target.value)} /><span className="mt-1 block text-xs text-slate-500">They must sign in or register using this exact email.</span></label>}
        {(mode === 'invite' || mode === 'role') && <label className="block text-sm font-medium">Business role<Select aria-label="Business role" className={field} value={role} onChange={event => { const next = event.target.value; setRole(next); if (next === 'business_owner' || next === 'business_admin') { setBranchScope('all'); setBranchIds([]) } else if (next === 'branch_manager' || next === 'sales_staff') setBranchScope('selected') }}>{roles.filter(value => value !== 'business_owner' || owner).map(value => <option key={value} value={value}>{nice(value)}</option>)}</Select></label>}
        {(mode === 'invite' || mode === 'branches') && <fieldset><legend className="text-sm font-medium">Branch scope</legend><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input aria-label="All branches" type="radio" checked={branchScope === 'all'} disabled={selectedOnly} onChange={() => { setBranchScope('all'); setBranchIds([]) }} />All branches</label><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input aria-label="Selected branches" type="radio" checked={branchScope === 'selected'} disabled={allOnly} onChange={() => setBranchScope('selected')} />Selected branches</label></div>{branchScope === 'selected' && <><p className="mt-2 text-xs text-slate-500">Leaving every branch unchecked gives this employee no branch access.</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{branches.data?.filter(branch => branch.is_active).map(branch => <label key={branch.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />{branch.name}</label>)}</div></>}</fieldset>}
        {mode === 'access' && <label className="block text-sm font-medium">Access action<Select aria-label="Access action" className={field} value={access} onChange={event => setAccess(event.target.value as typeof access)}>{selected?.status === 'suspended' && <option value="reactivate">Reactivate access</option>}{selected?.status === 'active' && <option value="suspend">Suspend access</option>}<option value="revoke">Revoke permanently</option></Select></label>}
        <label className="block text-sm font-medium">Audit reason<textarea aria-label="Audit reason" className={field} required minLength={3} maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <div className="flex gap-3"><button className={button} disabled={save.isPending || reason.trim().length < 3}>{save.isPending ? 'Saving…' : 'Confirm change'}</button><button className={secondary} type="button" disabled={save.isPending} onClick={close}>Cancel</button></div>
      </form></section></div>}
  </div>
}
