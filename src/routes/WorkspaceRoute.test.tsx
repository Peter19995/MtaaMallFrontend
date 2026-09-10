// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { WorkspaceRoute } from './PrivateRoute'

const state = vi.hoisted(() => ({ query: {} as any }))
vi.mock('@hooks/useTenantState', () => ({ useTenantState: () => state.query }))
afterEach(cleanup)
function mount(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<WorkspaceRoute />}>
    <Route path="/business" element={<p>Business content</p>} />
    <Route path="/business/products" element={<p>Product content</p>} />
    <Route path="/business/sales/create" element={<p>POS content</p>} />
    <Route path="/business/onboarding" element={<p>Complete onboarding</p>} />
  </Route><Route path="/unauthorized" element={<p>Access denied</p>} /></Routes></MemoryRouter>)
}
it('never mounts protected content while membership verification is pending or failed', () => {
  state.query = { isPending: true }; mount('/business/products')
  expect(screen.queryByText('Product content')).toBeNull()
  cleanup(); state.query = { isError: true }; mount('/business/products')
  expect(screen.getByRole('alert').textContent).toContain('Unable to verify')
  expect(screen.queryByText('Product content')).toBeNull()
})
it('denies a shopper who navigates directly to a business route', () => {
  state.query = { data: { context: 'customer', roles: ['customer'], permissions: ['self.profile.read'] } }
  mount('/business/products'); expect(screen.getByText('Access denied')).toBeTruthy()
})
it('redirects pending owners to onboarding while permitting granted local tools', () => {
  state.query = { data: { context: 'business:a', roles: ['business_owner'], permissions: ['business.settings.read', 'products.read', 'pos.sell'], allowed_branch_ids: [1], business_status: 'pending_verification' } }
  mount('/business'); expect(screen.getByText('Complete onboarding')).toBeTruthy()
  cleanup(); mount('/business/products'); expect(screen.getByText('Product content')).toBeTruthy()
  cleanup(); mount('/business/sales/create'); expect(screen.getByText('POS content')).toBeTruthy()
})
