import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  CubeIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import { useTenantState } from '@hooks/useTenantState'
import WorkspaceSwitcher from '@/components/common/WorkspaceSwitcher'
import TenantModuleBoundary from '@/components/common/TenantModuleBoundary'
import BusinessStatusNotice from '@pages/dashboard/business/BusinessStatusNotice'
import { experienceFor, workspaceLanding, workspaceMenu } from '@utils/experiences'
import brandLogo from '@/assets/mtaamall-logo.svg'

type MenuEntry = ReturnType<typeof workspaceMenu>[number]

const groupDefinition = (path: string) => {
  if (path.endsWith('/sales') || path.endsWith('/sales/create') || path.endsWith('/payment-modes')) return { id: 'sales', label: 'Sales & Payments', icon: CurrencyDollarIcon, order: 10 }
  if (path.includes('/products') || path.endsWith('/product-categories') || path.includes('/inventory')) return { id: 'catalog', label: 'Catalog & Inventory', icon: CubeIcon, order: 20 }
  if (path.endsWith('/branches') || path.endsWith('/projects') || path.endsWith('/services') || path.endsWith('/styling')) return { id: 'operations', label: 'Business Operations', icon: WrenchScrewdriverIcon, order: 30 }
  if (path.endsWith('/members')) return { id: 'hr', label: 'HR', icon: UserGroupIcon, order: 40 }
  if (path.endsWith('/customers')) return { id: 'crm', label: 'CRM', icon: UserGroupIcon, order: 50 }
  if (path.endsWith('/overview')) return { id: 'reports', label: 'Reports', icon: ChartBarIcon, order: 60 }
  if (path.endsWith('/audit') || path.endsWith('/approvals')) return { id: 'oversight', label: 'Audit & approval', icon: ClipboardDocumentCheckIcon, order: 70 }
  if (path.endsWith('/businesses') || path.endsWith('/admins')) return { id: 'people', label: 'People & access', icon: UserGroupIcon, order: 10 }
  return { id: 'insights', label: 'Insights', icon: ChartBarIcon, order: 60 }
}

const groupMenu = (items: MenuEntry[]) => {
  const groups = new Map<string, ReturnType<typeof groupDefinition> & { items: MenuEntry[] }>()
  items.forEach(item => {
    const definition = groupDefinition(item.path)
    const group = groups.get(definition.id) ?? { ...definition, items: [] }
    group.items.push(item)
    groups.set(definition.id, group)
  })
  return [...groups.values()].sort((left, right) => left.order - right.order)
}

const iconFor = (path: string) => {
  if (path.endsWith('/audit')) return ClipboardDocumentCheckIcon
  if (path.endsWith('/approvals')) return CheckBadgeIcon
  if (path.endsWith('/businesses')) return BuildingStorefrontIcon
  if (path.endsWith('/admins') || path.endsWith('/members')) return UserGroupIcon
  if (path.endsWith('/customers')) return UserGroupIcon
  if (path.endsWith('/overview')) return ChartBarIcon
  if (path.includes('/products')) return CubeIcon
  if (path.endsWith('/branches')) return BuildingOfficeIcon
  if (path.includes('/inventory')) return ServerStackIcon
  if (path.endsWith('/projects')) return WrenchScrewdriverIcon
  if (path.endsWith('/sales/create')) return ShoppingBagIcon
  if (path.endsWith('/sales')) return CurrencyDollarIcon
  if (path.endsWith('/payment-modes')) return CreditCardIcon
  if (path.endsWith('/services')) return SparklesIcon
  if (path.endsWith('/styling')) return SparklesIcon
  if (path.endsWith('/settings')) return Cog6ToothIcon
  return HomeIcon
}

export const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const tenant = useTenantState()
  const navigate = useNavigate()
  const location = useLocation()
  const principal = tenant.data ?? user ?? { business_id: null, permissions: [] }
  const experience = experienceFor(principal)
  const labels = { platform: 'Platform administration', business: 'Business workspace', employee: 'Employee workspace', account: 'My account', unauthorized: 'Workspace' }
  const menu = workspaceMenu(principal)
  const home = workspaceLanding(principal)
  const businessName = user?.business_memberships?.find(membership => membership.business_id === principal.business_id)?.business_name
  const profile = menu.find(item => item.path.endsWith('/profile'))?.path ?? '/account/profile'
  const settings = menu.find(item => item.path.endsWith('/settings'))
  const mainMenu = menu.filter(item => !item.path.endsWith('/profile') && !item.path.endsWith('/settings'))
  const menuGroups = groupMenu(mainMenu)
  const homeLabel = experience === 'business' ? 'Business overview' : experience === 'platform' ? 'Platform overview' : 'Workspace home'
  const [mobile, setMobile] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const active = menuGroups.find(group => group.items.some(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)))
    return active ? { [active.id]: true } : {}
  })
  const currentItem = [...menu].sort((a, b) => b.path.length - a.path.length).find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
  const title = location.pathname === home ? homeLabel : currentItem?.label ?? labels[experience]
  const workspaceName = businessName ?? (experience === 'platform' ? 'MtaaMall operations' : user?.name ?? user?.username ?? 'Your workspace')
  const initial = (user?.name ?? user?.username ?? 'M').charAt(0).toUpperCase()

  useEffect(() => {
    setMobile(false)
    setProfileOpen(false)
    const active = menuGroups.find(group => group.items.some(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)))
    if (active) setOpenGroups(previous => ({ ...previous, [active.id]: true }))
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const signOut = () => {
    logout()
    navigate('/', { replace: true })
  }

  const navLink = (isActive: boolean) => `group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary/10 text-primary-dark shadow-[inset_3px_0_0_#51c4d8]' : 'text-text-secondary hover:translate-x-0.5 hover:bg-primary/5 hover:text-primary-dark'}`

  const navigation = (isMobile = false) => <nav aria-label={labels[experience]} className="flex-1 overflow-y-auto px-3 py-4">
    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">Main menu</p>
    <div className="space-y-1">
      <NavLink to={home} end onClick={() => isMobile && setMobile(false)} className={({ isActive }) => navLink(isActive)}><HomeIcon className="h-5 w-5 shrink-0" /><span>{homeLabel}</span></NavLink>
      {menuGroups.map(group => {
        if (group.items.length === 1 && !['hr', 'crm'].includes(group.id)) {
          const item = group.items[0]
          const Icon = iconFor(item.path)
          return <NavLink key={item.path} to={item.path} end onClick={() => isMobile && setMobile(false)} className={({ isActive }) => navLink(isActive)}><Icon className="h-5 w-5 shrink-0" /><span className="truncate">{item.label}</span></NavLink>
        }
        const GroupIcon = group.icon
        const open = openGroups[group.id] ?? false
        const active = group.items.some(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
        return <div key={group.id} className="space-y-1"><button type="button" aria-expanded={open} onClick={() => setOpenGroups(previous => ({ ...previous, [group.id]: !open }))} className={navLink(active)}><GroupIcon className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate text-left">{group.label}</span><ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></button><AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="ml-5 space-y-1 border-l border-divider py-1 pl-2">{group.items.map(item => { const Icon = iconFor(item.path); return <NavLink key={item.path} to={item.path} end onClick={() => isMobile && setMobile(false)} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-primary/10 font-semibold text-primary-dark' : 'text-text-tertiary hover:bg-primary/5 hover:text-primary-dark'}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></NavLink> })}</div></motion.div>}</AnimatePresence></div>
      })}
    </div>
  </nav>

  const sidebarFooter = (isMobile = false) => <div className="border-t border-divider p-3">
    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">System</p>
    {settings && <NavLink to={settings.path} onClick={() => isMobile && setMobile(false)} className={({ isActive }) => navLink(isActive)}><Cog6ToothIcon className="h-5 w-5" /><span>{settings.label}</span></NavLink>}
    <Link to="/account/workspaces" onClick={() => isMobile && setMobile(false)} className={navLink(false)}><UserCircleIcon className="h-5 w-5" /><span>Switch workspace</span></Link>
    <Link to="/" onClick={() => isMobile && setMobile(false)} className={navLink(false)}><BuildingStorefrontIcon className="h-5 w-5" /><span>Visit storefront</span></Link>
    <button type="button" onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-error/5 hover:text-error"><ArrowRightOnRectangleIcon className="h-5 w-5" /><span>Sign out</span></button>
  </div>

  const sidebarInner = (isMobile = false) => <div className="flex h-full flex-col">
    <div className="flex h-16 items-center justify-between border-b border-divider px-4"><Link to="/" className="flex min-w-0 items-center gap-3"><img src={brandLogo} alt="MtaaMall logo" className="h-9 w-auto max-w-[145px]" /></Link>{isMobile && <button type="button" aria-label="Close workspace navigation" onClick={() => setMobile(false)} className="rounded-lg p-2 text-text-secondary hover:bg-background"><XMarkIcon className="h-5 w-5" /></button>}</div>
    <div className="border-b border-divider p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white shadow-sm">{initial}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-text">{workspaceName}</p><p className="truncate text-xs text-text-tertiary">{labels[experience]}</p></div></div></div>
    {navigation(isMobile)}
    {sidebarFooter(isMobile)}
  </div>

  return <div className="min-h-screen bg-gradient-to-br from-background via-white to-background text-text">
    <AnimatePresence>{mobile && <motion.button type="button" aria-label="Close navigation overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-text/45 backdrop-blur-sm lg:hidden" onClick={() => setMobile(false)} />}</AnimatePresence>

    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-border bg-white shadow-xl lg:block">{sidebarInner()}</aside>
    <motion.aside aria-hidden={!mobile} initial={false} animate={{ x: mobile ? 0 : '-100%' }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} className="fixed inset-y-0 left-0 z-50 w-72 max-w-[86vw] border-r border-border bg-white shadow-2xl lg:hidden">{sidebarInner(true)}</motion.aside>

    <div className="lg:pl-64">
      <header className={`sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-xl transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open workspace navigation" onClick={() => setMobile(true)} className="rounded-xl p-2 text-text-secondary transition hover:bg-background hover:text-primary-dark lg:hidden"><Bars3Icon className="h-6 w-6" /></button><div className="min-w-0"><p className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary sm:block">{labels[experience]}</p><h1 className="truncate text-sm font-bold text-text sm:text-base">{title}</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-3"><div className="hidden md:block"><WorkspaceSwitcher /></div><button type="button" aria-label="Notifications" className="relative rounded-xl p-2 text-text-secondary transition hover:bg-background hover:text-primary-dark"><BellIcon className="h-5 w-5" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-secondary ring-2 ring-white" /></button>
            <div className="relative"><button type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(open => !open)} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-background"><span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">{initial}</span><span className="hidden max-w-32 truncate text-sm font-semibold text-text sm:block">{user?.name ?? user?.username ?? 'Profile'}</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-text-tertiary transition ${profileOpen ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg></button>
              <AnimatePresence>{profileOpen && <motion.div role="menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-white shadow-xl"><div className="border-b border-divider px-4 py-3"><p className="truncate text-sm font-bold text-text">{user?.name ?? user?.username}</p><p className="truncate text-xs text-text-tertiary">{user?.email ?? labels[experience]}</p></div><div className="p-2"><Link role="menuitem" to={profile} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-primary/5 hover:text-primary-dark"><UserCircleIcon className="h-4 w-4" />Profile</Link>{settings && <Link role="menuitem" to={settings.path} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-primary/5 hover:text-primary-dark"><Cog6ToothIcon className="h-4 w-4" />Settings</Link>}<Link role="menuitem" to="/account" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-primary/5 hover:text-primary-dark"><BuildingStorefrontIcon className="h-4 w-4" />Personal account</Link><Link role="menuitem" to="/security" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-primary/5 hover:text-primary-dark"><ShieldCheckIcon className="h-4 w-4" />Account security</Link></div><div className="border-t border-divider p-2"><button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-error hover:bg-error/5"><ArrowRightOnRectangleIcon className="h-4 w-4" />Sign out</button></div></motion.div>}</AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8"><BusinessStatusNotice /><motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}><TenantModuleBoundary /></motion.div></main>
    </div>
  </div>
}

export default DashboardLayout
