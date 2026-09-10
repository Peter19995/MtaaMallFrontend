import { expect, it } from 'vitest'
import { canAccessDashboard } from './dashboardAccess'
it('guards member management separately from profiles and platform management', () => {
  const business = { roles: ['business_admin'], permissions: ['business.members.read'] }
  expect(canAccessDashboard(business, '/dashboard/business/members')).toBe(true)
  expect(canAccessDashboard(business, '/dashboard/platform/admins')).toBe(false)
  expect(canAccessDashboard({ roles: ['business_owner'], permissions: [] }, '/dashboard/business/members')).toBe(false)
  expect(canAccessDashboard({ permissions: ['platform.admins.manage'] }, '/dashboard/platform/admins')).toBe(true)
})
