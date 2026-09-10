import { describe, expect, it } from 'vitest'
import { hasNamedPermission, authorizationFingerprint } from './authorization'

describe('named permissions', () => {
  it('invalidates changed branch assignments, status and membership without a role change', () => {
    const user = { permissions: ['products.read'], roles: ['sales_staff'],
      membership_id: 1, business_status: 'active', allowed_branch_ids: [1, 2] }
    const fingerprint = authorizationFingerprint(user)
    expect(authorizationFingerprint({ ...user, allowed_branch_ids: [2, 1] })).toBe(fingerprint)
    expect(authorizationFingerprint({ ...user, allowed_branch_ids: [] })).not.toBe(fingerprint)
    expect(authorizationFingerprint({ ...user, business_status: 'suspended' })).not.toBe(fingerprint)
    expect(authorizationFingerprint({ ...user, membership_id: 2 })).not.toBe(fingerprint)
  })
  it('denies missing identities and permissions', () => {
    expect(hasNamedPermission(null, 'finance.manage')).toBe(false)
    expect(hasNamedPermission({}, 'finance.manage')).toBe(false)
    expect(hasNamedPermission({ permissions: [] }, 'finance.manage')).toBe(false)
  })

  it('requires the exact grant without an admin or wildcard shortcut', () => {
    const user = { role: 'root_system_admin', permissions: ['platform.admins.manage', '*'] }
    expect(hasNamedPermission(user, 'platform.admins.manage')).toBe(true)
    expect(hasNamedPermission(user, 'finance.manage')).toBe(false)
  })
})
