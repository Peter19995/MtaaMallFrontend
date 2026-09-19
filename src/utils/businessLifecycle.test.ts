import { describe, expect, it } from 'vitest'
import { allowedStatusChanges, isBusinessReadOnly, landingPage, needsReason, transitions } from './businessLifecycle'
import { canAccessDashboard } from './dashboardAccess'

describe('business lifecycle UI permissions', () => {
  const root = { context: 'platform', experience: 'platform' as const, roles: ['root_system_admin'], permissions: ['platform.businesses.read', 'platform.businesses.review', 'platform.businesses.activate', 'platform.businesses.suspend', 'platform.businesses.close'] }
  const owner = { context: 'business:one', experience: 'business' as const, roles: ['business_owner'], permissions: ['business.settings.read', 'business.settings.update'] }
  it('does not give a role label or wildcard implicit grants', () => {
    expect(allowedStatusChanges('pending_verification', { roles: ['root_system_admin'], permissions: ['*'] })).toEqual([])
    expect(allowedStatusChanges('active', null)).toEqual([])
    expect(canAccessDashboard(root, '/dashboard/admin/branches')).toBe(false)
    expect(canAccessDashboard({ roles: ['root_system_admin'] }, '/dashboard/admin')).toBe(false)
  })
  it('requires platform context and review permission for activation, not a role label', () => {
    expect(allowedStatusChanges('pending_verification', { roles: ['business_manager'], permissions: ['platform.businesses.activate'] })).toEqual([])
    expect(allowedStatusChanges('pending_verification', { ...root, roles: ['business_owner'] })).toEqual(['active', 'rejected'])
    expect(allowedStatusChanges('pending_verification', root)).toEqual(['active', 'rejected'])
  })
  it('restricts owner actions to submission and correction', () => {
    expect(allowedStatusChanges('draft', owner, true)).toEqual(['pending_verification'])
    expect(allowedStatusChanges('rejected', owner, true)).toEqual(['draft'])
    for (const status of ['pending_verification', 'active', 'suspended', 'closed'] as const)
      expect(allowedStatusChanges(status, owner, true)).toEqual([])
  })
  it('has a terminal closed status and reasons for sensitive decisions', () => {
    expect(transitions.closed).toEqual([])
    expect(isBusinessReadOnly('suspended')).toBe(true)
    expect(isBusinessReadOnly('closed')).toBe(true)
    expect(isBusinessReadOnly('draft')).toBe(false)
    for (const state of ['rejected', 'suspended', 'closed'] as const) expect(needsReason(state)).toBe(true)
  })
  it('uses permission-based landing pages and denies unknown dashboard routes', () => {
    expect(landingPage(root)).toBe('/platform')
    expect(landingPage(owner)).toBe('/business')
    expect(landingPage({ ...owner, business_status: 'pending_verification' })).toBe('/business/onboarding')
    expect(canAccessDashboard({ ...owner, business_status: 'pending_verification' }, '/dashboard/business')).toBe(false)
    expect(canAccessDashboard({ ...owner, business_status: 'pending_verification' }, '/dashboard/business/profile')).toBe(true)
    expect(landingPage({ roles: ['customer'], permissions: ['self.profile.read'] })).toBe('/account')
    expect(landingPage({ roles: [] })).toBe('/unauthorized')
    expect(canAccessDashboard(owner, '/dashboard/platform/businesses')).toBe(false)
    expect(canAccessDashboard(root, '/dashboard/admin/future-sensitive-page')).toBe(false)
  })
})
