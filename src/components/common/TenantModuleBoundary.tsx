import { Link, Outlet, useLocation } from 'react-router-dom'

const pending = ['customers']
export default function TenantModuleBoundary() {
  const { pathname: currentPath } = useLocation()
  const pathname = currentPath.replace(/^\/(business|employee)(?=\/)/, '/dashboard/admin')
  const scopedModule = /^\/dashboard\/admin\/(products|inventory|projects|services|styling|finance|branches|orders|pos|reports|settings|blogs)(\/|$)/.test(pathname)
  if (!scopedModule && !pathname.startsWith('/dashboard/admin/customers')) return <Outlet />
  if (!pending.some(module => pathname === `/dashboard/admin/${module}` || pathname.startsWith(`/dashboard/admin/${module}/`))) return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <span>Operational data is limited to your selected business and assigned branches.</span>
      <Link className="font-semibold underline" to="/account/workspaces">Switch workspace</Link>
    </div>
    <Outlet />
  </>
  return <section className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
    <p className="text-sm font-semibold text-amber-700">Business data protection</p>
    <h1 className="mt-2 text-2xl font-bold">Customer directory updates are protected</h1>
    <p className="mt-4 text-slate-600">Customer login identities can be shared across businesses. Staff editing is disabled until business-specific customer contact records are available.</p>
    <p className="mt-3 text-slate-600">Products, inventory, projects, services, branches and order reports now use business-owned data. Customers can still manage their own profiles.</p>
    <Link className="mt-6 inline-block text-primary underline" to="/account/workspaces">Manage your workspaces</Link>
  </section>
}
