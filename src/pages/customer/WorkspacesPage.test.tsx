// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkspacesPage from './WorkspacesPage'
import { myMemberships, acceptMembership } from '@api/modules/memberships.api'
import { switchWorkspace } from '@/components/common/WorkspaceSwitcher'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { id: '1' } }) }))
vi.mock('@api/modules/memberships.api', () => ({ myMemberships: vi.fn(), acceptMembership: vi.fn() }))
vi.mock('@/components/common/WorkspaceSwitcher', () => ({ switchWorkspace: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('keeps personal shopping available alongside separate business roles and invitations', async () => {
  vi.mocked(myMemberships).mockResolvedValue({ platform_memberships: [], business_memberships: [
    { id: 1, user_id: 1, username: 'employee', business_id: 'business-a', business_name: 'Shop A', role: 'sales_staff', status: 'active', branch_scope: 'selected', branch_ids: [] },
    { id: 2, user_id: 1, username: 'employee', business_id: 'business-b', business_name: 'Shop B', role: 'accountant', status: 'invited', branch_scope: 'all', branch_ids: [] },
    { id: 3, user_id: 1, username: 'employee', business_id: 'business-c', business_name: 'Shop C', role: 'sales_staff', status: 'revoked', branch_scope: 'selected', branch_ids: [] }
  ] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><WorkspacesPage /></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByText('Shop A')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Open workspace' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Open workspace' }))
  await waitFor(() => expect(switchWorkspace).toHaveBeenCalledWith('business:business-a'))
  fireEvent.click(screen.getByRole('button', { name: 'Open personal profile' }))
  await waitFor(() => expect(switchWorkspace).toHaveBeenCalledWith('customer'))
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  await waitFor(() => expect(acceptMembership).toHaveBeenCalledWith('business', 2))
  client.clear()
})
