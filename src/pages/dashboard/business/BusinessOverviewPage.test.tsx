// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getMyBusiness } from '@api/modules/businesses.api'
import { getSalesSummaryRequest, getDailySalesRequest } from '@api/modules/reports.api'
import { canAccessDashboard } from '@utils/dashboardAccess'
import BusinessOverviewPage, { overviewRange } from './BusinessOverviewPage'

const identity = vi.hoisted(() => ({ user: { id: 'owner', roles: ['business_owner'], permissions: ['business.settings.read', 'reports.read', 'orders.read', 'pos.sell'] } }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: identity.user, hasPermission: (name: string) => identity.user.permissions.includes(name) }) }))
vi.mock('@api/modules/businesses.api', () => ({ getMyBusiness: vi.fn(), updateMyBusiness: vi.fn() }))
vi.mock('@api/modules/reports.api', () => ({ getSalesSummaryRequest: vi.fn(), getDailySalesRequest: vi.fn() }))
const business = { id: 'tenant', public_id: 'tenant', legal_name: 'Example Ltd', display_name: 'Example Shop', slug: 'example', country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi', status: 'active' as const, owner: null, branches: [], rejection_reason: null, created_by_user_id: 1, approved_by_user_id: 1, approved_at: null, suspended_at: null, created_at: '2026-09-06', updated_at: null }
const stats = { total_sales: 1200, total_orders: 5, pos_orders: 3, online_orders: 2, active_projects: 2, low_stock_products: 4 }
configure({ asyncUtilTimeout: 10000 })
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><BusinessOverviewPage /></MemoryRouter></QueryClientProvider>)
beforeEach(() => {
  vi.resetAllMocks()
  identity.user.permissions = ['business.settings.read', 'reports.read', 'orders.read', 'pos.sell']
  vi.mocked(getMyBusiness).mockResolvedValue(business)
  vi.mocked(getSalesSummaryRequest).mockResolvedValue(stats)
  vi.mocked(getDailySalesRequest).mockResolvedValue([])
})
afterEach(cleanup)

describe('business overview', () => {
  it('shows real metrics and links to a separate profile without rendering its form', async () => {
    mount()
    expect(await screen.findByRole('region', { name: 'Performance metrics' })).toHaveTextContent('1,200')
    expect(screen.getByRole('link', { name: 'Business profile' })).toHaveAttribute('href', '/business/profile')
    expect(screen.queryByLabelText('Legal name')).not.toBeInTheDocument()
    expect(screen.getByText('Current status · not date-filtered')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New POS sale' })).toBeInTheDocument()
    expect(canAccessDashboard(identity.user, '/dashboard/business/profile')).toBe(true)
    expect(canAccessDashboard({ permissions: [] }, '/dashboard/business/profile')).toBe(false)
  })
  it('changes the report range and shows accessible daily values', async () => {
    vi.mocked(getDailySalesRequest).mockResolvedValue([{ date: overviewRange(30).end_date, total_sales: 1200, orders: 3 }])
    mount()
    expect(await screen.findByRole('img', { name: /Daily sales from/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Reporting period'), { target: { value: '7' } })
    await waitFor(() => expect(getSalesSummaryRequest).toHaveBeenLastCalledWith(overviewRange(7)))
    await waitFor(() => expect(getDailySalesRequest).toHaveBeenLastCalledWith(overviewRange(7)))
  })
  it('uses an empty state for zero revenue and keeps local POS available before activation', async () => {
    vi.mocked(getMyBusiness).mockResolvedValue({ ...business, status: 'pending_verification' })
    vi.mocked(getSalesSummaryRequest).mockResolvedValue({ ...stats, total_sales: 0, total_orders: 0 })
    mount()
    expect(await screen.findByText('No sales revenue in this period')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New POS sale' })).toBeInTheDocument()
  })
  it('does not fetch reports or expose tools without their permissions', async () => {
    identity.user.permissions = ['business.settings.read']
    mount()
    expect(await screen.findByText(/Your role does not include access/)).toBeInTheDocument()
    expect(getSalesSummaryRequest).not.toHaveBeenCalled()
    expect(getDailySalesRequest).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: /Sales & orders/ })).not.toBeInTheDocument()
  })
  it('shows a retryable error instead of fabricated or zero metrics', async () => {
    vi.mocked(getSalesSummaryRequest).mockRejectedValue(new Error('Unavailable'))
    mount()
    expect(await screen.findByRole('button', { name: 'Retry summary' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Performance metrics' })).not.toBeInTheDocument()
    expect(screen.queryByText('No sales revenue in this period')).not.toBeInTheDocument()
  })
  it('uses inclusive UTC date ranges across month boundaries', () => {
    expect(overviewRange(7, new Date('2026-09-06T12:00:00Z'))).toEqual({ start_date: '2026-08-31', end_date: '2026-09-06' })
  })
})
