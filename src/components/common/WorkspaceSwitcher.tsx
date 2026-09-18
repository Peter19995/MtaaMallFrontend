import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { getMeRequest } from '@api/modules/auth.api'
import { landingPage } from '@utils/businessLifecycle'
import { Select } from './Input'

export async function switchWorkspace(context: string) {
  const me = await getMeRequest(undefined, context)
  localStorage.setItem('auth_context', me.context ?? context)
  localStorage.removeItem('auth_user')
  // Full navigation destroys all query caches, pending forms and old-context views.
  // A previous deployment may have cached a different route's HTML shell.
  window.location.assign(`${landingPage(me)}?workspaceRefresh=${Date.now()}`)
}

export default function WorkspaceSwitcher() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null
  return <div className="max-w-56 text-xs">
    <label className="sr-only" htmlFor="workspace-context">Current workspace</label>
    <Select id="workspace-context" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-800"
      value={user.context ?? 'customer'} disabled={busy} onChange={async event => {
        setBusy(true); setError('')
        try { await switchWorkspace(event.target.value) } catch { setError('Workspace unavailable. Refresh your memberships.'); setBusy(false) }
      }}>
      <option value="customer">Personal shopping</option>
      {user.platform_memberships?.filter(m => m.status === 'active').map(m => <option key={m.id} value="platform">Platform · {m.role.replace(/_/g, ' ')}</option>)}
      {user.business_memberships?.filter(m => m.status === 'active').map(m => <option key={m.id} value={`business:${m.business_id}`}>{m.business_name} · {m.role.replace(/_/g, ' ')}</option>)}
    </Select>
    <Link className="mt-1 block text-primary hover:underline" to="/account/workspaces">Workspaces & invitations</Link>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>
}
