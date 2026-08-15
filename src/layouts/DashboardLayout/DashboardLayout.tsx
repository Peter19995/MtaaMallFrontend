import { useState, useEffect } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  CubeIcon,
  ServerStackIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import brandLogo from '@/assets/business-logo.svg'

type NavChildItem = {
  path?: string
  label: string
  state?: Record<string, unknown>
  end?: boolean
  action?: 'openProductForm'
}

type NavItem = {
  path?: string
  label: string
  icon: typeof HomeIcon
  end?: boolean
  children?: NavChildItem[]
}

// Navigation items configuration
const navItems: NavItem[] = [
  { path: '/dashboard/admin', label: 'Overview', icon: HomeIcon, end: true },
  {
    label: 'Products',
    icon: CubeIcon,
    children: [
      { path: '/dashboard/admin/products', label: 'Catalog', end: true },
      { label: 'New Product', action: 'openProductForm' },
      { path: '/dashboard/admin/products/settings', label: 'Product Settings' }
    ]
  },
  { path: '/dashboard/admin/branches', label: 'Branches', icon: BuildingStorefrontIcon },
  { path: '/dashboard/admin/customers', label: 'Customers', icon: UserIcon },
  { path: '/dashboard/admin/inventory', label: 'Inventory', icon: ServerStackIcon },
  { path: '/dashboard/admin/services', label: 'Services', icon: WrenchScrewdriverIcon },
  { path: '/dashboard/admin/projects', label: 'Projects', icon: BuildingOfficeIcon },
  { path: '/dashboard/admin/sales', label: 'Sales', icon: CurrencyDollarIcon, end: true },
  { path: '/dashboard/admin/sales/create', label: 'Create POS Sale', icon: ShoppingBagIcon },
  { path: '/dashboard/admin/payment-modes', label: 'Payment Modes', icon: CreditCardIcon },
  { path: '/dashboard/admin/styling', label: 'Styling', icon: SparklesIcon },
  { path: '/dashboard/admin/users', label: 'Users', icon: UsersIcon },
  { path: '/dashboard/admin/reports', label: 'Reports', icon: ChartBarIcon },
]

export const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    Products: location.pathname.startsWith('/dashboard/admin/products')
  }))

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/admin/products')) {
      setOpenMenus((previous) => ({ ...previous, Products: true }))
    }
  }, [location.pathname])

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 w-full ${
      isActive 
        ? 'bg-primary/10 text-primary border-l-4 border-primary' 
        : 'text-text-secondary hover:bg-primary/5 hover:text-primary hover:translate-x-1'
    }`
  }

  const childNavClass = (isActive: boolean) =>
    `ml-11 flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-text-tertiary hover:bg-primary/5 hover:text-primary'
    }`

  const isChildActive = (child: NavChildItem) => {
    if (!child.path) {
      return false
    }

    if (child.end) {
      return location.pathname === child.path
    }

    return location.pathname.startsWith(child.path)
  }

  const isItemActive = (item: NavItem) => {
    if (item.children?.length) {
      return item.children.some((child) => {
        if (isChildActive(child)) {
          return true
        }

        return Boolean(child.path && location.pathname.startsWith(`${child.path}/`))
      })
    }

    if (!item.path) {
      return false
    }

    return item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  }

  const getCurrentPageLabel = () => {
    for (const item of navItems) {
      if (item.children?.length) {
        const activeChild = item.children.find((child) => isChildActive(child))
        if (activeChild) {
          return activeChild.label
        }

        const activeNestedChild = item.children.find(
          (child) => child.path && location.pathname.startsWith(`${child.path}/`)
        )
        if (activeNestedChild) {
          return item.label
        }
      }

      if (item.path && (item.end ? location.pathname === item.path : location.pathname.startsWith(item.path))) {
        return item.label
      }
    }

    return 'Dashboard'
  }

  const handleChildAction = (child: NavChildItem) => {
    if (child.action === 'openProductForm') {
      navigate('/dashboard/admin/products', { state: { openProductForm: true } })
      return
    }

    if (child.path) {
      navigate(child.path, child.state ? { state: child.state } : undefined)
    }
  }

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon

    if (item.children?.length) {
      const isOpen = openMenus[item.label] ?? false
      const isActive = isItemActive(item)

      return (
        <div key={item.label} className="space-y-1">
          <button
            type="button"
            onClick={() =>
              setOpenMenus((previous) => ({
                ...previous,
                [item.label]: !isOpen
              }))
            }
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-primary/10 text-primary border-l-4 border-primary'
                : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 py-1">
                  {item.children.map((child) => {
                    if (child.action) {
                      return (
                        <button
                          key={`${item.label}-${child.label}`}
                          type="button"
                          onClick={() => {
                            handleChildAction(child)
                            if (isMobile) {
                              setIsMobileMenuOpen(false)
                            }
                          }}
                          className={childNavClass(false)}
                        >
                          {child.label}
                        </button>
                      )
                    }

                    return (
                      <NavLink
                        key={`${item.label}-${child.label}`}
                        to={child.path ?? '/dashboard/admin'}
                        end={child.end}
                        className={() => childNavClass(isChildActive(child))}
                        onClick={() => {
                          if (isMobile) {
                            setIsMobileMenuOpen(false)
                          }
                        }}
                      >
                        {child.label}
                      </NavLink>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    return (
      <NavLink
        key={item.path}
        to={item.path ?? '/dashboard/admin'}
        end={item.end}
        className={navClass}
        onClick={() => {
          if (isMobile) {
            setIsMobileMenuOpen(false)
          }
        }}
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Always visible on desktop */}
      <aside className="fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-border shadow-xl hidden lg:block">
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex h-16 items-center border-b border-border px-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={brandLogo}
                alt="MtaaMall logo"
                className="h-9 w-auto rounded-full border border-primary/10 bg-white p-0.5"
              />
              <div className="leading-tight">
                <p className="text-sm font-bold text-primary">MtaaMall</p>
                <p className="text-xs font-medium text-text-tertiary">Admin</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text truncate">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-text-tertiary truncate">{user?.email || 'admin@mtaamall.com'}</p>
              </div>
            </div>
          </div>

          {/* Navigation - Main Menu */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Main Menu
            </p>
            <div className="space-y-1">
              {navItems.map((item) => renderNavItem(item))}
            </div>
          </nav>

          {/* Settings & Logout */}
          <div className="border-t border-border p-3">
            <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              System
            </p>
            <NavLink
              to="/dashboard/admin/settings"
              className={({ isActive }) => 
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 w-full ${
                  isActive 
                    ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                    : 'text-text-secondary hover:bg-primary/5 hover:text-primary hover:translate-x-1'
                }`
              }
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Settings</span>
            </NavLink>
            
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-error/5 hover:text-error transition-all duration-200 hover:translate-x-1"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar - Slide out */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-border shadow-xl lg:hidden"
      >
        <div className="flex h-full flex-col">
          {/* Mobile Logo with Close */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={brandLogo}
                alt="MtaaMall logo"
                className="h-9 w-auto rounded-full border border-primary/10 bg-white p-0.5"
              />
              <div className="leading-tight">
                <p className="text-sm font-bold text-primary">MtaaMall</p>
                <p className="text-xs font-medium text-text-tertiary">Admin</p>
              </div>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg p-1.5 hover:bg-background"
            >
              <XMarkIcon className="h-5 w-5 text-text-secondary" />
            </button>
          </div>

          {/* Mobile User Info */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text truncate">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-text-tertiary truncate">{user?.email || 'admin@mtaamall.com'}</p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Main Menu
            </p>
            <div className="space-y-1">
              {navItems.map((item) => renderNavItem(item, true))}
            </div>
          </nav>

          {/* Mobile Settings & Logout */}
          <div className="border-t border-border p-3">
            <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              System
            </p>
            <NavLink
              to="/dashboard/admin/settings"
              className={({ isActive }) => 
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 w-full ${
                  isActive 
                    ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                    : 'text-text-secondary hover:bg-primary/5 hover:text-primary hover:translate-x-1'
                }`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Settings</span>
            </NavLink>
            
            <button
              onClick={() => {
                setIsMobileMenuOpen(false)
                handleLogout()
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-error/5 hover:text-error transition-all duration-200 hover:translate-x-1"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content - with margin to accommodate sidebar */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 transition-all duration-300 bg-white ${
          isScrolled ? 'shadow-sm' : ''
        }`}>
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            {/* Left Section - Mobile menu button and page title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 hover:bg-background lg:hidden"
              >
                <Bars3Icon className="h-5 w-5 text-text-secondary" />
              </button>
              <span className="text-sm font-medium text-text-secondary hidden sm:inline">
                {getCurrentPageLabel()}
              </span>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 hover:bg-background rounded-lg transition-colors">
                <BellIcon className="h-5 w-5 text-text-secondary" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error" />
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-background transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-xs">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-text">
                    {user?.name || 'Admin'}
                  </span>
                  <ChevronDownIcon className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
                    isProfileMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-white shadow-lg overflow-hidden z-50"
                    >
                      <Link
                        to="/dashboard/admin/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <UserIcon className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        to="/dashboard/admin/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                        Settings
                      </Link>
                      <hr className="border-border" />
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          handleLogout()
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
