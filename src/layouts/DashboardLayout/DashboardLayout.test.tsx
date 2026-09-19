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
  state.user = { username: 'sales', context: 'business:a', experience: 'employee', roles: ['sales_staff'], permissions: ['products.read', 'pos.sell', 'orders.read'], business_status: 'active', business_capabilities: { local_pos_enabled: true }, allowed_branch_ids: [1] }
  render(<MemoryRouter><DashboardLayout /></MemoryRouter>)
  const menu = screen.getByRole('navigation', { name: 'Employee workspace' })
  expect(menu.textContent).toContain('Sales & Payments')
  expect(menu.textContent).not.toContain('New POS sale')
  expect(menu.textContent).not.toMatch(/Platform team|Business profile|Settings|New product/)
  fireEvent.click(screen.getByRole('button', { name: 'Catalog & Inventory' }))
  expect(screen.getByRole('link', { name: 'Products' }).getAttribute('href')).toBe('/employee/products')
  expect(screen.getByRole('link', { name: 'Product categories' }).getAttribute('href')).toBe('/employee/product-categories')
  fireEvent.click(screen.getByRole('button', { name: 'Sales & Payments' }))
  expect(screen.getByRole('link', { name: 'New POS sale' }).getAttribute('href')).toBe('/employee/sales/create')
})
it('orders the business menu by operational workflow', () => {
  state.user = {
    username: 'owner',
    context: 'business:a',
    experience: 'business',
    roles: ['business_owner'],
    permissions: [
      'orders.read', 'pos.sell', 'payments.manage',
      'products.read', 'products.update', 'inventory.read',
      'business.members.read', 'customers.read', 'branches.read', 'projects.read', 'content.manage',
      'reports.read', 'audit.read', 'approvals.request'
    ],
    business_status: 'active',
    allowed_branch_ids: [1]
  }
  render(<MemoryRouter><DashboardLayout /></MemoryRouter>)
  const menuText = screen.getByRole('navigation', { name: 'Business workspace' }).textContent ?? ''
  const labels = ['Business overview', 'Sales & Payments', 'Catalog & Inventory', 'Business Operations', 'HR', 'CRM', 'Reports', 'Audit & approval']
  labels.reduce((previousIndex, label) => {
    const currentIndex = menuText.indexOf(label)
    expect(currentIndex).toBeGreaterThan(previousIndex)
    return currentIndex
  }, -1)

  fireEvent.click(screen.getByRole('button', { name: 'HR' }))
  expect(screen.getByRole('link', { name: 'Team' }).getAttribute('href')).toBe('/business/members')
  fireEvent.click(screen.getByRole('button', { name: 'CRM' }))
  expect(screen.getByRole('link', { name: 'Customers' }).getAttribute('href')).toBe('/business/customers')
})
it('keeps a business owner’s profile separate from the overview', () => {
  state.user = { username: 'owner', context: 'business:a', experience: 'business', roles: ['business_owner'], permissions: ['business.settings.read'], business_status: 'active' }
  render(<MemoryRouter><DashboardLayout /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Business overview' }).getAttribute('href')).toBe('/business')
  fireEvent.click(screen.getByRole('button', { name: /owner/ }))
  expect(screen.getByRole('menuitem', { name: 'Profile' }).getAttribute('href')).toBe('/business/profile')
})
