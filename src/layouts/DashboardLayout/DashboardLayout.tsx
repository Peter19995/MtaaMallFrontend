import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

export const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-md px-3 py-2 ${isActive ? 'bg-secondary-light text-primary-dark' : 'hover:bg-secondary-light'}`

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r border-border bg-surface/80 px-4 py-6 sm:block">
        <div className="mb-8">
          <Link to="/" className="text-lg font-semibold tracking-tight text-text">
            <span className="text-primary">Julian</span> Admin
          </Link>
        </div>
        <nav className="space-y-1 text-sm text-text-secondary">
          <NavLink
            to="/dashboard/admin"
            end
            className={navClass}
          >
            Overview
          </NavLink>
          <NavLink
            to="/dashboard/admin/products"
            className={navClass}
          >
            Products
          </NavLink>
          <NavLink
            to="/dashboard/admin/inventory"
            className={navClass}
          >
            Inventory
          </NavLink>
          <NavLink
            to="/dashboard/admin/services"
            className={navClass}
          >
            Services
          </NavLink>
          <NavLink
            to="/dashboard/admin/projects"
            className={navClass}
          >
            Projects
          </NavLink>
          <NavLink
            to="/dashboard/admin/sales"
            className={navClass}
          >
            Sales
          </NavLink>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3">
          <div className="text-sm font-medium text-text-secondary">Operations dashboard</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-text-secondary sm:inline">
              {user ? `Hi, ${user.name}` : 'Not signed in'}
            </span>
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:bg-secondary-light"
              >
                Sign out
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
