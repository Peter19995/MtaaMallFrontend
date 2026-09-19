import type { BusinessStatus } from '../api/modules/businesses.api'

export type WorkspacePrincipal = {
  experience?: Experience
  landing_path?: string
  context?: string
  roles?: string[]
  permissions?: string[]
  business_permissions?: string[]
  allowed_branch_ids?: number[]
  business_status?: BusinessStatus | null
  business_capabilities?: Partial<import('../api/modules/businesses.api').BusinessCapabilities>
  business_memberships?: { status: string }[]
}
export type Experience = 'platform' | 'business' | 'employee' | 'account' | 'unauthorized'
const businessExperience = (permissions: string[]): 'business' | 'employee' =>
  permissions.some(permission => [
    'business.settings.update',
    'business.members.assign_role',
  ].includes(permission)) ? 'business' : 'employee'

// Labels select a shell, never grant permissions. Only the selected membership's
// effective permissions may enable a module; no cross-membership union is used.
export function experienceFor(user: WorkspacePrincipal): Experience {
  const permissions = user.permissions ?? []
  const hasPlatformAuthority = permissions.some(p => p.startsWith('platform.'))
  const businessGrants = user.business_permissions ?? permissions.filter(p =>
    p !== '*' && !p.startsWith('platform.') && !p.startsWith('self.') && p !== 'content.comment')
  const hasCustomerAuthority = permissions.includes('self.profile.read')
  if (user.experience && user.experience !== 'unauthorized') {
    if (user.experience === 'platform' && user.context === 'platform' && hasPlatformAuthority) return 'platform'
    if (['business', 'employee'].includes(user.experience) && user.context?.startsWith('business:') && businessGrants.length > 0) return user.experience
    if (user.experience === 'account' && user.context === 'customer' && hasCustomerAuthority) return 'account'
    return 'unauthorized'
  }
  if ((!user.context || user.context === 'platform') && hasPlatformAuthority) return 'platform'
  if ((!user.context || user.context.startsWith('business:')) && businessGrants.length > 0)
    return businessExperience(permissions)
  if ((!user.context || user.context === 'customer') && hasCustomerAuthority) return 'account'
  return 'unauthorized'
}
export function workspaceLanding(user: WorkspacePrincipal) {
  const experience = experienceFor(user)
  if (user.landing_path && user.landing_path.startsWith(`/${experience}`)) return user.landing_path
  if (experience === 'business' || experience === 'employee') {
    if (['draft', 'pending_verification', 'rejected'].includes(user.business_status ?? '')) return `/${experience}/onboarding`
    if (['suspended', 'closed'].includes(user.business_status ?? '')) return `/${experience}/suspended`
  }
  return `/${experience}`
}
export function loginLanding(user: WorkspacePrincipal) {
  return experienceFor(user) === 'account' && (user.business_memberships ?? []).filter(m => m.status === 'active').length > 1
    ? '/account/workspaces' : workspaceLanding(user)
}
export type WorkspaceModule = { path: string; label: string; permission: string; anyPermissions?: string[]; mutation?: boolean }
export const platformModules: WorkspaceModule[] = [
  { path: 'audit', label: 'Audit history', permission: 'platform.audit.read' },
  { path: 'businesses', label: 'Businesses', permission: 'platform.businesses.read' },
  { path: 'payments', label: 'Payment overview', permission: 'platform.payments.read' },
  { path: 'payments/mpesa', label: 'M-Pesa accounts', permission: 'platform.payments.read' },
  { path: 'payments/transactions', label: 'Transactions', permission: 'platform.payments.read' },
  { path: 'payments/reconciliation', label: 'Reconciliation', permission: 'platform.payments.reconcile' },
  { path: 'settlements', label: 'Settlements', permission: 'platform.settlements.read' },
  { path: 'admins', label: 'Platform team', permission: 'platform.admins.manage' },
]
export const businessModules: WorkspaceModule[] = [
  { path: 'audit', label: 'Audit history', permission: 'audit.read' },
  { path: 'approvals', label: 'Approvals', permission: 'approvals.request', anyPermissions: ['audit.read', 'approvals.discount.approve', 'approvals.refund.approve', 'approvals.stock_writeoff.approve', 'approvals.pos_void.approve', 'approvals.role_change.approve', 'approvals.financial_posting.approve'] },
  { path: 'profile', label: 'Business profile', permission: 'business.settings.read' },
  { path: 'members', label: 'Team', permission: 'business.members.read' },
  { path: 'customers', label: 'Customers', permission: 'customers.read' },
  { path: 'overview', label: 'Reports', permission: 'reports.read' },
  { path: 'products', label: 'Products', permission: 'products.read' },
  { path: 'product-categories', label: 'Product categories', permission: 'products.read' },
  { path: 'variant-options', label: 'Variant options', permission: 'products.update', mutation: true },
  { path: 'branches', label: 'Branches', permission: 'branches.read' },
  { path: 'inventory', label: 'Stock status', permission: 'inventory.read' },
  { path: 'inventory/restocks', label: 'Restocks', permission: 'inventory.read' },
  { path: 'inventory/stock-counts', label: 'Stock counts', permission: 'inventory.read' },
  { path: 'inventory/alerts', label: 'Inventory alerts', permission: 'inventory.read' },
  { path: 'projects', label: 'Projects', permission: 'projects.read' },
  { path: 'sales', label: 'Sales', permission: 'orders.read' },
  { path: 'sales/create', label: 'New POS sale', permission: 'pos.sell', mutation: true },
  { path: 'payment-modes', label: 'Payment modes', permission: 'payments.manage', mutation: true },
  { path: 'services', label: 'Services', permission: 'content.manage', mutation: true },
  { path: 'styling', label: 'Styling', permission: 'content.manage', mutation: true },
  { path: 'settings', label: 'Settings', permission: 'business.settings.update', mutation: true },
]
export function canAccessWorkspace(user: WorkspacePrincipal | null, path: string) {
  path = path.replace(/\/+$/, '') || '/'
  if (!user) return false
  const experience = experienceFor(user)
  if (!['platform', 'business', 'employee'].includes(experience)) return false
  const root = `/${experience}`
  if (path !== root && !path.startsWith(root + '/')) return false
  if (path === root) return workspaceLanding(user) === root
  const suffix = path.slice(root.length + 1)
  if (['onboarding', 'suspended'].includes(suffix)) return workspaceLanding(user) === path
  const modules = experience === 'platform' ? platformModules : businessModules
  const module = experience === 'platform' && /^businesses\/[^/]+\/payments$/.test(suffix)
    ? { path: suffix, label: 'Business POS payments', permission: 'platform.payments.read' }
    : /^products\/\d+$/.test(suffix)
    ? { path: suffix, label: 'Manage product', permission: 'products.update', mutation: true }
    : [...modules].sort((a, b) => b.path.length - a.path.length)
    .find(m => suffix === m.path)
  if (!module || ![module.permission, ...('anyPermissions' in module ? module.anyPermissions ?? [] : [])].some(p => user.permissions?.includes(p))) return false
  if (module.permission === 'pos.sell' && user.allowed_branch_ids?.length === 0) return false
  if (experience !== 'platform') {
    if (module.mutation && ['suspended', 'closed'].includes(user.business_status ?? '')) return false
    if (module.permission === 'pos.sell' && (
      !user.business_capabilities?.local_pos_enabled ||
      !['pending_verification', 'active'].includes(user.business_status ?? '')
    )) return false
  }
  return true
}
export function workspaceMenu(user: WorkspacePrincipal) {
  const experience = experienceFor(user)
  return (experience === 'platform' ? platformModules : businessModules)
    .map(module => ({ ...module, path: `/${experience}/${module.path}` }))
    .filter(module => canAccessWorkspace(user, module.path))
}
export function canonicalDashboardPath(user: WorkspacePrincipal, path: string) {
  if (path === '/dashboard' || path === '/dashboard/admin') return workspaceLanding(user)
  if (path.startsWith('/dashboard/platform/')) return path.replace('/dashboard/platform/', '/platform/')
  const experience = experienceFor(user)
  const base = experience === 'employee' ? '/employee' : '/business'
  if (path === '/dashboard/business') return base
  return path.replace(/^\/dashboard\/(admin|business)(?=\/)/, base)
}
