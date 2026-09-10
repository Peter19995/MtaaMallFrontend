// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BusinessWorkforcePage from './BusinessWorkforcePage'
import { inviteBusinessEmployee, listBusinessInvitations, listBusinessMembers } from '@api/modules/memberships.api'
import api from '@api/config/axios.config'

const identity = vi.hoisted(() => ({ user: { id: '1', context: 'business:a', roles: ['business_owner'],
  permissions: ['business.members.read', 'business.members.invite', 'business.members.assign_role', 'business.members.suspend'] } }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: identity.user,
  hasPermission: (permission: string) => identity.user.permissions.includes(permission) }) }))
vi.mock('@api/config/axios.config', () => ({ default: { get: vi.fn() } }))
vi.mock('@api/modules/memberships.api', () => ({
  listBusinessMembers: vi.fn(), listBusinessInvitations: vi.fn(), inviteBusinessEmployee: vi.fn(),
  updateBusinessMemberRole: vi.fn(), updateBusinessMemberBranches: vi.fn(),
  setBusinessMemberAccess: vi.fn(), revokeBusinessMember: vi.fn(),
}))

const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: {
  queries: { retry: false }, mutations: { retry: false } } })}><BusinessWorkforcePage /></QueryClientProvider>)

describe('business workforce', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(listBusinessMembers).mockResolvedValue([{ id: 1, user_id: 1, username: 'owner', role: 'business_owner',
      status: 'active', business_id: 'a', business_name: 'A', branch_scope: 'all', branch_ids: [] }])
    vi.mocked(listBusinessInvitations).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 8, name: 'Main branch', is_active: true }] })
    vi.mocked(inviteBusinessEmployee).mockImplementation(() => new Promise(() => {}))
  })

  it('invites by email with an explicit business role, branch scope and audit reason', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Invite employee' }))
    fireEvent.change(screen.getByLabelText('Employee email'), { target: { value: 'staff@example.com' } })
    fireEvent.click(await screen.findByLabelText('Main branch'))
    fireEvent.change(screen.getByLabelText('Audit reason'), { target: { value: 'New salesperson' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }))
    await waitFor(() => expect(inviteBusinessEmployee).toHaveBeenCalledWith({
      email: 'staff@example.com', role: 'sales_staff', branch_scope: 'selected', branch_ids: [8], reason: 'New salesperson',
    }))
    expect(screen.getByText('owner (you)')).toBeInTheDocument()
  })
})
