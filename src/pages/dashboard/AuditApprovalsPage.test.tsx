// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuditApprovalsPage from './AuditApprovalsPage'

const state = vi.hoisted(() => ({ user: { id: '2', context: 'business:one', business_status: 'active', permissions: ['business.audit.read'] }, list: vi.fn(), audit: vi.fn(), decide: vi.fn() }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('@api/modules/audit.api', () => ({ listApprovals: state.list, listAudit: state.audit, decideApproval: state.decide }))
const request = { id: 'request-1', kind: 'discount', status: 'pending', reason: 'Customer promotion', branch_id: 1, requested_by_user_id: 1, expires_at: '2099-01-01T00:00:00Z', payload: { discount_amount: 20 }, snapshot: { products: [[1, 100]] } }
function mount(approvals = true) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuditApprovalsPage approvals={approvals} /></QueryClientProvider>)
}
beforeEach(() => {
  state.user = { id: '2', context: 'business:one', business_status: 'active', permissions: ['business.audit.read'] }
  state.list.mockResolvedValue([request]); state.audit.mockResolvedValue([]); state.decide.mockResolvedValue({ ...request, status: 'executed' })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks() })
describe('audit and sensitive approvals', () => {
  it('keeps auditors read-only while exposing the exact request', async () => {
    mount(); await screen.findByText('Customer promotion')
    expect(screen.queryByRole('button', { name: 'Approve & execute' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull()
    expect(screen.getByText(/"discount_amount": 20/)).toBeTruthy()
  })
  it.each(['self', 'suspended', 'expired', 'wrong permission'])('hides decision controls for %s', async (caseName) => {
    state.user.permissions = ['approvals.discount.approve']
    if (caseName === 'self') state.user.id = '1'
    if (caseName === 'suspended') state.user.business_status = 'suspended'
    if (caseName === 'expired') state.list.mockResolvedValue([{ ...request, expires_at: '2000-01-01T00:00:00Z' }])
    if (caseName === 'wrong permission') state.user.permissions = ['approvals.refund.approve']
    mount(); await screen.findByText('Customer promotion')
    expect(screen.queryByRole('button', { name: 'Approve & execute' })).toBeNull()
  })
  it('requires a reason and explicit execution confirmation', async () => {
    state.user.permissions = ['approvals.discount.approve']
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mount(); const button = await screen.findByRole('button', { name: 'Approve & execute' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Decision reason request-1'), { target: { value: 'Reviewed promotion' } })
    fireEvent.click(button); expect(state.decide).not.toHaveBeenCalled()
    confirm.mockReturnValue(true); fireEvent.click(button)
    await waitFor(() => expect(state.decide).toHaveBeenCalledWith('request-1', 'approve', 'Reviewed promotion'))
  })
  it('displays before and after values with no editing controls', async () => {
    state.audit.mockResolvedValue([{ id: 'event', action: 'products.price.changed', resource_type: 'products', resource_id: '1', actor_user_id: 2, business_id: 'one', created_at: '2026-09-09T00:00:00Z', before: { price: 100 }, after: { price: 125 }, details: {} }])
    mount(false); await screen.findByText('products.price.changed')
    expect(screen.getByText(/"price": 100/)).toBeTruthy()
    expect(screen.getByText(/"price": 125/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })
})
