import { describe, it, expect } from 'vitest'
import { experienceFor, workspaceLanding, loginLanding, workspaceMenu, canAccessWorkspace, canonicalDashboardPath } from './experiences'
import { requestTenantContext } from '../api/config/tenantContext'

const owner = { context: 'business:a', experience: 'business' as const, roles: ['business_owner'], permissions: ['business.settings.read', 'business.settings.update', 'products.read', 'products.create', 'pos.sell', 'orders.read'], business_status: 'active' as const, business_capabilities: { local_pos_enabled: true } }
const employee = { context: 'business:a', experience: 'employee' as const, roles: ['sales_staff'], permissions: ['products.read', 'orders.read', 'pos.sell'], business_status: 'active' as const, business_capabilities: { local_pos_enabled: true } }
const customer = { context: 'customer', experience: 'account' as const, roles: ['customer'], permissions: ['self.profile.read', 'self.orders.read'] }
describe('separate application experiences', () => {
  it('lands platform roles on a platform home even without business review permission', () => {
    expect(workspaceLanding({ context: 'platform', roles: ['platform_auditor'], permissions: ['platform.audit.read'] })).toBe('/platform')
    expect(workspaceLanding({ context: 'platform', roles: ['support_agent'], permissions: ['platform.support.manage'] })).toBe('/platform')
  })
  it('separates owners, administrators, employees and shoppers', () => {
    expect(workspaceLanding(owner)).toBe('/business')
    expect(workspaceLanding({ ...owner, roles: ['business_admin'] })).toBe('/business')
    for (const role of ['branch_manager', 'sales_staff', 'accountant', 'inventory_manager', 'content_manager', 'project_manager'])
      expect(workspaceLanding({ ...employee, roles: [role] })).toBe('/employee')
    expect(workspaceLanding(customer)).toBe('/account')
  })
  it('treats role names as labels and never as authority', () => {
    expect(experienceFor({ context: 'customer', roles: ['root_system_admin'], permissions: ['self.profile.read'] })).toBe('account')
    expect(experienceFor({ context: 'business:a', roles: ['business_owner'], permissions: [] })).toBe('unauthorized')
    expect(experienceFor({ context: 'platform', roles: ['customer'], permissions: ['platform.audit.read'] })).toBe('platform')
  })
  it('uses permissions, not role names or wildcard flags, for menus and guards', () => {
    expect(workspaceLanding({ roles: ['root_system_admin'], permissions: ['*'] })).toBe('/unauthorized')
    expect(workspaceMenu({ ...owner, permissions: [] })).toEqual([])
    expect(canAccessWorkspace({ ...owner, permissions: [] }, '/business')).toBe(false)
    expect(workspaceMenu(employee).map(m => m.path)).toEqual(['/employee/products', '/employee/product-categories', '/employee/sales', '/employee/sales/create'])
    expect(canAccessWorkspace(employee, '/employee/members')).toBe(false)
    expect(canAccessWorkspace(employee, '/employee/products/new')).toBe(false)
    expect(canAccessWorkspace(employee, '/employee/products/123')).toBe(false)
    expect(canAccessWorkspace({ ...employee, allowed_branch_ids: [] }, '/employee/sales/create')).toBe(false)
  })
  it('allows product inheritance only with the product creation permission', () => {
    expect(canAccessWorkspace(owner, '/business/products/add-from-catalog')).toBe(true)
    expect(canAccessWorkspace(owner, '/business/catalogue')).toBe(true)
    expect(canAccessWorkspace(owner, '/business/product-categories/inherit')).toBe(true)
    expect(canAccessWorkspace({ ...owner, permissions: ['products.read'] }, '/business/products/add-from-catalog')).toBe(false)
    expect(canAccessWorkspace({ ...owner, permissions: ['products.read'] }, '/business/product-categories/inherit')).toBe(false)
    expect(canAccessWorkspace(employee, '/employee/products/add-from-catalog')).toBe(false)
  })
  it('keeps local business tools available while online verification is pending', () => {
    const pending = { ...owner, business_status: 'pending_verification' as const }
    expect(workspaceLanding(pending)).toBe('/business/onboarding')
    expect(workspaceMenu(pending).map(m => m.path)).toContain('/business/sales/create')
    expect(canAccessWorkspace(pending, '/business/products')).toBe(true)
    expect(canAccessWorkspace(pending, '/business/sales/create')).toBe(true)
    for (const status of ['draft', 'rejected'] as const)
      expect(canAccessWorkspace({ ...owner, business_status: status }, '/business/sales/create')).toBe(false)
  })
  it('retains permitted historical reads but hides mutation routes when suspended', () => {
    const user = { ...owner, business_status: 'suspended' as const }
    expect(workspaceLanding(user)).toBe('/business/suspended')
    expect(canAccessWorkspace(user, '/business/sales')).toBe(true)
    expect(canAccessWorkspace(user, '/business/sales/create')).toBe(false)
    expect(canAccessWorkspace(user, '/business/products/new')).toBe(false)
    expect(canAccessWorkspace(user, '/business/settings')).toBe(false)
  })
  it('exposes inventory workflows as separate permission-protected pages', () => {
    const inventoryUser = { ...owner, permissions: ['inventory.read'] }
    expect(workspaceMenu(inventoryUser).map(module => module.path)).toEqual([
      '/business/inventory',
      '/business/inventory/restocks',
      '/business/inventory/stock-counts',
      '/business/inventory/alerts'
    ])
    expect(canAccessWorkspace(inventoryUser, '/business/inventory/restocks')).toBe(true)
    expect(canAccessWorkspace(inventoryUser, '/business/inventory/restocks/new')).toBe(false)

    const restockUser = {
      ...inventoryUser,
      permissions: [...(inventoryUser.permissions ?? []), 'inventory.restock'],
    }
    expect(canAccessWorkspace(restockUser, '/business/inventory/restocks/new')).toBe(true)
    expect(canAccessWorkspace({ ...inventoryUser, permissions: [] }, '/business/inventory/alerts')).toBe(false)
  })
  it('protects each platform payment route with its named permission', () => {
    const reader = {
      context: 'platform', roles: ['platform_auditor'],
      permissions: ['platform.payments.read', 'platform.settlements.read']
    }
    expect(workspaceMenu(reader).map(module => module.path)).toEqual([
      '/platform/payments', '/platform/payments/mpesa', '/platform/payments/transactions', '/platform/settlements'
    ])
    expect(canAccessWorkspace(reader, '/platform/businesses/tenant-uuid/payments')).toBe(true)
    expect(canAccessWorkspace({ ...reader, permissions: ['platform.payments.read'] }, '/platform/settlements')).toBe(false)
    expect(canAccessWorkspace(reader, '/platform/payments/reconciliation')).toBe(false)
    expect(canAccessWorkspace({ ...reader, permissions: ['platform.payments.reconcile'] }, '/platform/payments/reconciliation')).toBe(true)
    expect(canAccessWorkspace({ ...reader, permissions: [] }, '/platform/businesses/tenant-uuid/payments')).toBe(false)
  })
  it('does not combine contexts or use business membership presence as a grant', () => {
    const personal = { ...customer, business_memberships: [{ status: 'active' }, { status: 'active' }] }
    expect(loginLanding(personal)).toBe('/account/workspaces')
    expect(workspaceLanding(personal)).toBe('/account') // Explicit personal selection stays personal.
    expect(canAccessWorkspace(personal, '/business/products')).toBe(false)
    expect(canAccessWorkspace(owner, '/employee/products')).toBe(false)
    expect(canAccessWorkspace(employee, '/business/products')).toBe(false)
    expect(canAccessWorkspace(owner, '/platform/businesses')).toBe(false)
    expect(experienceFor({ ...customer, permissions: ['platform.admins.manage'] })).toBe('unauthorized')
  })
  it('redirects legacy operational links into the active experience', () => {
    expect(canonicalDashboardPath(employee, '/dashboard/admin/products/123')).toBe('/employee/products/123')
    expect(canonicalDashboardPath(owner, '/dashboard/business/profile')).toBe('/business/profile')
    expect(canonicalDashboardPath(owner, '/dashboard/platform/businesses')).toBe('/platform/businesses')
    expect(canAccessWorkspace(owner, '/business/future-unprotected-page')).toBe(false)
  })
  it('preserves selected tenant requests in every operational route group', () => {
    for (const prefix of ['/business', '/employee', '/platform', '/dashboard/admin'])
      expect(requestTenantContext(prefix + '/products', '/products/', 'business:a')).toBe('business:a')
    for (const path of ['/', '/products', '/account/orders', '/business-news'])
      expect(requestTenantContext(path, '/products/', 'business:a')).toBe('customer')
  })
})
