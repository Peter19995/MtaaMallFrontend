import { describe, expect, it } from 'vitest'
import { requestTenantContext } from './tenantContext'

describe('tenant request context', () => {
  it('keeps dashboard requests in the selected business', () => {
    expect(requestTenantContext('/dashboard/admin/products', '/products/', 'business:a')).toBe('business:a')
  })
  it('uses the customer context for the storefront and checkout', () => {
    expect(requestTenantContext('/shop', '/products/', 'platform')).toBe('customer')
    expect(requestTenantContext('/checkout', '/orders/checkout', 'business:a')).toBe('customer')
  })
  it('does not change business profile or membership requests', () => {
    expect(requestTenantContext('/profile', '/businesses/me', 'business:a')).toBe('business:a')
  })
})
