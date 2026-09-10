// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardLayout } from './DashboardLayout'

const state = vi.hoisted(() => ({ user: {} as any }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: state.user, logout: vi.fn() }) }))
vi.mock('@hooks/useTenantState', () => ({ useTenantState: () => ({ data: state.user }) }))
vi.mock('@/components/common/WorkspaceSwitcher', () => ({ default: () => <span>Workspace selector</span> }))
vi.mock('@pages/dashboard/business/BusinessStatusNotice', () => ({ default: () => null }))
afterEach(cleanup)
it('renders an employee menu without owner or platform functions', () => {
  state.user = { username: 'sales', context: 'business:a', roles: ['sales_staff'], permissions: ['products.read', 'pos.sell', 'orders.read'], business_status: 'active', allowed_branch_ids: [1] }
  render(<MemoryRouter><DashboardLayout /></MemoryRouter>)
  const menu = screen.getByRole('navigation', { name: 'Employee workspace' })
  expect(menu.textContent).toContain('New POS sale')
  expect(menu.textContent).not.toMatch(/Platform team|Business profile|Settings|New product/)
  expect(screen.getByRole('link', { name: 'Products' }).getAttribute('href')).toBe('/employee/products')
})
it('keeps a business owner’s profile separate from the overview', () => {
  state.user = { username: 'owner', context: 'business:a', roles: ['business_owner'], permissions: ['business.settings.read'], business_status: 'active' }
  render(<MemoryRouter><DashboardLayout /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Business overview' }).getAttribute('href')).toBe('/business')
  fireEvent.click(screen.getByRole('button', { name: /owner/ }))
  expect(screen.getByRole('menuitem', { name: 'Profile' }).getAttribute('href')).toBe('/business/profile')
})
