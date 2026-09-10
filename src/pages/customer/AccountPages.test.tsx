// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AccountLayout, AccountOrders, AccountOrderDetails } from './AccountPages'
import { canAccessDashboard } from '../../utils/dashboardAccess'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { id: '1', roles: ['customer'], permissions: ['self.profile.read', 'self.orders.read'] } }) }))
const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@api/modules/account.api', () => ({ accountGet: api.get }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
function mount(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><Routes><Route path="/account" element={<AccountLayout />}><Route path="orders" element={<AccountOrders />} /><Route path="orders/:id" element={<AccountOrderDetails />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
}
describe('customer account', () => {
  it('has only shopper navigation and denies business dashboard access', async () => {
    api.get.mockResolvedValue([]); mount('/account/orders')
    await screen.findByText('No orders on this page.')
    expect(screen.getByRole('navigation', { name: 'Customer account' }).textContent).not.toMatch(/Business|Employees|Platform|Inventory/)
    expect(screen.getByRole('link', { name: 'My orders' }).getAttribute('href')).toBe('/account/orders')
    expect(screen.getByRole('link', { name: 'My cart' }).getAttribute('href')).toBe('/account/cart')
    expect(screen.queryByRole('link', { name: 'Address book' })).toBeNull()
    expect(canAccessDashboard({ roles: ['customer'], permissions: ['self.profile.read', 'self.orders.read'] }, '/dashboard/business')).toBe(false)
    expect(canAccessDashboard({ roles: ['customer'], permissions: ['self.orders.read'] }, '/dashboard/admin/sales')).toBe(false)
  })
  it('shows an API ownership denial without displaying another customer’s order', async () => {
    api.get.mockImplementation((path: string) => path === '/returns' ? Promise.resolve([]) : Promise.reject(new Error('Order not found')))
    mount('/account/orders/999')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Order not found'))
    expect(screen.queryByRole('button', { name: 'Submit request' })).toBeNull()
  })
})
