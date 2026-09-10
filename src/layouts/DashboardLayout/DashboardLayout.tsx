import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useTenantState } from '@hooks/useTenantState'
import WorkspaceSwitcher from '@/components/common/WorkspaceSwitcher'
import TenantModuleBoundary from '@/components/common/TenantModuleBoundary'
import BusinessStatusNotice from '@pages/dashboard/business/BusinessStatusNotice'
import { experienceFor, workspaceLanding, workspaceMenu } from '@utils/experiences'
import brandLogo from '@/assets/mtaamall-mark.svg'

export const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const tenant = useTenantState()
  const principal = tenant.data ?? user ?? { business_id: null, permissions: [] }
  const experience = experienceFor(principal)
  const labels = { platform: 'Platform administration', business: 'Business workspace', employee: 'Employee workspace', account: 'My account', unauthorized: 'Workspace' }
  const menu = workspaceMenu(principal)
  const home = workspaceLanding(principal)
  const businessName = user?.business_memberships?.find(m => m.business_id === principal.business_id)?.business_name
  const profile = menu.find(m => m.path.endsWith('/profile'))?.path ?? '/account'
  const [mobile, setMobile] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const title = menu.find(m => m.path === location.pathname)?.label ?? labels[experience]
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {mobile && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobile(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link to="/" className="flex items-center gap-3 border-b p-6"><img src={brandLogo} alt="" className="h-9 w-9" /><span className="text-xl font-bold">MtaaMall</span></Link>
      <div className="px-5 py-6"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{labels[experience]}</p><p className="mt-2 truncate font-semibold">{businessName ?? user?.name ?? user?.username ?? 'Your workspace'}</p></div>
      <nav aria-label={labels[experience]} className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {[{ path: home, label: experience === 'business' ? 'Business overview' : 'Workspace home' }, ...menu].map(item =>
          <NavLink key={item.path} to={item.path} end onClick={() => setMobile(false)} className={({ isActive }) => `block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</NavLink>
        )}
      </nav>
      <div className="space-y-3 border-t p-5 text-sm"><Link className="block text-slate-600 hover:underline" to="/account/workspaces">Switch workspace</Link><Link className="block text-slate-600 hover:underline" to="/">Visit storefront ↗</Link></div>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><button aria-label="Open workspace navigation" className="rounded-lg border px-3 py-2 lg:hidden" onClick={() => setMobile(true)}>☰</button><div><p className="text-xs text-slate-500">{labels[experience]}</p><p className="font-semibold">{title}</p></div></div>
        <div className="flex items-center gap-3"><WorkspaceSwitcher /><div className="relative">
          <button aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(!profileOpen)} className="rounded-full border px-4 py-2 text-sm font-medium">{user?.name ?? user?.username ?? 'Profile'} ▾</button>
          {profileOpen && <div role="menu" className="absolute right-0 mt-2 w-48 rounded-xl border bg-white p-2 shadow-lg">
            <Link role="menuitem" to={profile} onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50">Profile</Link>
            <Link role="menuitem" to="/account" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50">Personal account</Link>
            <Link role="menuitem" to="/security" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50">Account security</Link>
            <button role="menuitem" className="w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50" onClick={() => { logout(); navigate('/', { replace: true }) }}>Sign out</button>
          </div>}
        </div></div>
      </header>
      <main className="mx-auto max-w-screen-2xl p-4 md:p-8"><BusinessStatusNotice /><TenantModuleBoundary /></main>
    </div>
  </div>
}
