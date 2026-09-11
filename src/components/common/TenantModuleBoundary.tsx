import { Link, Outlet, useLocation } from 'react-router-dom'

const pending = ['customers']
export default function TenantModuleBoundary() {
  const { pathname: currentPath } = useLocation()
  const pathname = currentPath.replace(/^\/(business|employee)(?=\/)/, '/dashboard/admin')
  if (!pending.some(module => pathname === `/dashboard/admin/${module}` || pathname.startsWith(`/dashboard/admin/${module}/`))) return <Outlet />
  return <section className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
    <p className="text-sm font-semibold text-amber-700">Business data protection</p>
    <h1 className="mt-2 text-2xl font-bold">Customer directory updates are protected</h1>
    <p className="mt-4 text-slate-600">Customer login identities can be shared across businesses. Staff editing is disabled until business-specific customer contact records are available.</p>
    <p className="mt-3 text-slate-600">Products, inventory, projects, services, branches and order reports now use business-owned data. Customers can still manage their own profiles.</p>
    <Link className="mt-6 inline-block text-primary underline" to="/account/workspaces">Manage your workspaces</Link>
  </section>
}
