// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import WorkspaceSwitcher from './WorkspaceSwitcher'
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: {
  context: 'business:a', selected_context: 'business:a', workspaces: [
    { context: 'customer', type: 'customer', label: 'Personal shopping', status: 'active', selected: false, branch_ids: [] },
    { context: 'business:a', type: 'business', label: 'Business A · business owner', status: 'active', selected: true, branch_ids: [] }
  ], business_memberships: [
    { id: 1, business_id: 'a', business_name: 'Business A', role: 'business_owner', status: 'active' },
    { id: 2, business_id: 'b', business_name: 'Business B', role: 'sales_staff', status: 'suspended' }
  ], platform_memberships: [{ id: 3, role: 'support_agent', status: 'invited' }]
} }) }))
afterEach(cleanup)
it('offers only active contexts and never combines platform or other-business authority', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><WorkspaceSwitcher /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Current workspace' })).toHaveTextContent('Business A · business owner')
  await user.click(screen.getByRole('button', { name: 'Current workspace' }))
  expect(screen.getAllByRole('option')).toHaveLength(2)
  expect(screen.getByRole('option', { name: 'Personal shopping' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Workspaces & invitations' })).toHaveAttribute('href', '/account/workspaces')
})
