import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { getMeRequest } from '@api/modules/auth.api'
import { landingPage } from '@utils/businessLifecycle'
import { Select } from './Input'
import { setActiveApiContext } from '@api/config/axios.config'

export async function switchWorkspace(context: string) {
  const me = await getMeRequest(undefined, context)
  // Remove legacy cached identity blobs before a different authority context
  // is made active. The fresh /users/me response remains authoritative.
  localStorage.removeItem('auth_user')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  setActiveApiContext(me.selected_context ?? me.context ?? context)
  // Full navigation destroys all query caches, pending forms and old-context views.
  // A previous deployment may have cached a different route's HTML shell.
  window.location.assign(`${landingPage(me)}?workspaceRefresh=${Date.now()}`)
}

export default function WorkspaceSwitcher() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null
  const workspaces = user.workspaces?.length ? user.workspaces : [
    { context: 'customer', type: 'customer' as const, label: 'Personal shopping', status: 'active' as const, selected: user.context === 'customer', branch_ids: [] },
    ...(user.platform_memberships ?? []).filter(m => m.status === 'active').map(m => ({
      context: 'platform', type: 'platform' as const, label: `Platform · ${m.role.replace(/_/g, ' ')}`,
      status: 'active' as const, selected: user.context === 'platform', branch_ids: []
    })),
    ...(user.business_memberships ?? []).filter(m => m.status === 'active').map(m => ({
      context: `business:${m.business_id}`, type: 'business' as const,
      label: `${m.business_name} · ${m.role.replace(/_/g, ' ')}`,
      status: 'active' as const, selected: user.context === `business:${m.business_id}`, branch_ids: []
    }))
  ]
  return <div className="max-w-56 text-xs">
    <label className="sr-only" htmlFor="workspace-context">Current workspace</label>
    <Select id="workspace-context" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-800"
      value={user.selected_context ?? user.context ?? 'customer'} disabled={busy} onChange={async event => {
        setBusy(true); setError('')
        try { await switchWorkspace(event.target.value) } catch { setError('Workspace unavailable. Refresh your memberships.'); setBusy(false) }
      }}>
      {workspaces.map(workspace => <option key={workspace.context} value={workspace.context}>{workspace.label}</option>)}
    </Select>
    <Link className="mt-1 block text-primary hover:underline" to="/account/workspaces">Workspaces & invitations</Link>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>
}
