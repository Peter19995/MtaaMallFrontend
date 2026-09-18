import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import api from '@api/config/axios.config'
import { listMemberships, inviteMember, invitePlatformAdmin, changeMember, type Membership, type Scope } from '@api/modules/memberships.api'
import { ErrorNotice, panel, button, secondary } from './BusinessComponents'
import BusinessWorkforcePage from './BusinessWorkforcePage'
import { Select } from '@components/common'

const roles = {
  platform: ['system_admin', 'business_manager', 'support_agent', 'platform_auditor'],
  business: ['business_owner', 'business_admin', 'branch_manager', 'inventory_manager', 'sales_staff', 'accountant', 'project_manager', 'content_manager', 'business_auditor']
}
const input = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2'

function ScopedMembershipManagement({ scope }: { scope: Scope }) {
  const { user, hasPermission } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState<Membership | 'invite' | null>(null)
  const [action, setAction] = useState<'role' | 'status'>('role')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState(scope === 'business' ? 'sales_staff' : 'support_agent')
  const [branch, setBranch] = useState('')
  const [status, setStatus] = useState('suspended')
  const [reason, setReason] = useState('')
  const root = user?.roles?.includes('root_system_admin')
  const canInvite = scope === 'platform' ? hasPermission('platform.admins.manage') : hasPermission('business.members.invite') && hasPermission('business.members.assign_role')
  const canRole = scope === 'platform' ? root : hasPermission('business.members.assign_role')
  const canStatus = scope === 'platform' ? root : hasPermission('business.members.suspend')
  const members = useQuery({ queryKey: ['memberships', scope, user?.context], queryFn: () => listMemberships(scope), refetchInterval: 30000 })
  const branches = useQuery({ queryKey: ['membership-branches', user?.context], queryFn: async () => (await api.get<{ id: number; name: string; is_active: boolean }[]>('/branches/')).data, enabled: scope === 'business' && Boolean(canRole) })
  const save = useMutation({ mutationFn: async () => {
    const body = { username: username.trim(), role, branch_id: branch ? Number(branch) : null, reason: reason.trim() }
    if (editing === 'invite') return scope === 'platform'
      ? invitePlatformAdmin({ email: email.trim(), username: body.username, full_name: fullName.trim() || undefined,
          phone: phone.trim() || undefined, platform_role: role, reason: body.reason })
      : inviteMember(scope, body)
    if (!editing) throw new Error('Choose a membership')
    return changeMember(scope, editing.id, action, action === 'role' ? { role, branch_id: body.branch_id, reason: body.reason } : { status, reason: body.reason })
  }, onSuccess: () => { setEditing(null); return client.invalidateQueries({ queryKey: ['memberships'] }) } })
  const open = (m: Membership | 'invite', next: 'role' | 'status' = 'role') => {
    save.reset(); setEditing(m); setAction(next); setReason(''); setUsername(''); setEmail(''); setFullName(''); setPhone('')
    setRole(m === 'invite' ? (scope === 'business' ? 'sales_staff' : 'support_agent') : m.role)
    setBranch(m === 'invite' ? '' : String(m.branch_ids[0] ?? '')); setStatus(m !== 'invite' && m.status === 'suspended' ? 'active' : m !== 'invite' && m.status === 'invited' ? 'revoked' : 'suspended')
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">{scope === 'platform' ? 'Platform administration' : 'Current business only'}</p><h1 className="mt-1 text-3xl font-bold">{scope === 'platform' ? 'Platform team' : 'Business team'}</h1><p className="mt-2 max-w-2xl text-slate-600">{scope === 'platform' ? 'Create a passwordless invitation for a new platform administrator. Access activates only after acceptance.' : 'Invite an existing username and assign a scoped role. The recipient must accept.'}</p></div>{canInvite && <button className={button} onClick={() => open('invite')}>Invite member</button>}</header>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{scope === 'platform' ? 'Only the root administrator can change platform memberships. The seeded root membership is protected.' : 'Keep at least one active owner. Only owners can change owner memberships. Suspended or closed businesses cannot change their team.'}</p>
    {members.isError && <ErrorNotice error={members.error} />}{members.isPending && <p role="status">Loading team…</p>}
    <section className={`${panel} overflow-x-auto`}><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Username</th><th className="p-3">Role</th><th className="p-3">Scope</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{members.data?.map(m => <tr key={m.id} className="border-b border-slate-100"><td className="p-3 font-medium">{m.username}{m.user_id === Number(user?.id) ? ' (you)' : ''}</td><td className="p-3 capitalize">{m.role.replace(/_/g, ' ')}</td><td className="p-3">Platform</td><td className="p-3 capitalize">{m.status}</td><td className="p-3">{m.role !== 'root_system_admin' && m.status !== 'revoked' && <div className="flex gap-2">{canRole && <button className={secondary} onClick={() => open(m)}>Edit role</button>}{canStatus && <button className={secondary} onClick={() => open(m, 'status')}>Change access</button>}</div>}</td></tr>)}</tbody></table>{members.data?.length === 0 && <p className="p-4">No memberships found.</p>}{members.data?.length === 500 && <p>Showing the first 500 memberships. Additional records can be retrieved with API pagination.</p>}</section>
    {editing && <section className={panel}><h2 className="text-lg font-semibold">{editing === 'invite' ? 'Invite an existing account' : `Update ${editing.username}`}</h2>{save.isError && <ErrorNotice error={save.error} />}
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); save.mutate() }}>
        {editing === 'invite' && <label className="text-sm">Username<input className={input} required minLength={3} maxLength={100} value={username} onChange={e => setUsername(e.target.value)} /></label>}
        {editing === 'invite' && scope === 'platform' && <>
          <label className="text-sm">Email<input className={input} type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="text-sm">Full name <span className="text-slate-400">(optional)</span><input className={input} value={fullName} onChange={e => setFullName(e.target.value)} /></label>
          <label className="text-sm">Phone <span className="text-slate-400">(optional)</span><input className={input} value={phone} onChange={e => setPhone(e.target.value)} /></label>
        </>}
        {action === 'role' && <><label className="text-sm">Role<Select className={input} value={role} onChange={e => { setRole(e.target.value); if (e.target.value === 'business_owner') setBranch('') }}>{roles[scope].filter(r => r !== 'business_owner' || user?.roles?.includes('business_owner')).map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}</Select></label>
          {scope === 'business' && <label className="text-sm">Branch scope<Select className={input} value={branch} required={role === 'branch_manager'} disabled={role === 'business_owner'} onChange={e => setBranch(e.target.value)}><option value="">Business-wide</option>{branches.data?.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>{branches.isError && <span role="alert">Unable to load branches. Refresh before assigning a branch.</span>}</label>}</>}
        {action === 'status' && editing !== 'invite' && <label className="text-sm">New access status<Select className={input} value={status} onChange={e => setStatus(e.target.value)}>{(editing.status === 'invited' ? ['revoked'] : editing.status === 'suspended' ? ['active', 'revoked'] : ['suspended', 'revoked']).map(s => <option key={s} value={s}>{s}</option>)}</Select></label>}
        <label className="text-sm sm:col-span-2">Audit reason<textarea className={input} required minLength={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this access needed or changing?" /></label>
        <p className="text-sm text-slate-500 sm:col-span-2">Confirming records your identity, reason, and the membership changes in the audit log.</p>
        <div className="flex gap-3"><button className={button} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Confirm change'}</button><button type="button" className={secondary} disabled={save.isPending} onClick={() => setEditing(null)}>Cancel</button></div>
      </form>
    </section>}
  </div>
}

export default function MembershipManagementPage({ scope = 'business' }: { scope?: Scope }) {
  return scope === 'business' ? <BusinessWorkforcePage /> : <ScopedMembershipManagement scope={scope} />
}
