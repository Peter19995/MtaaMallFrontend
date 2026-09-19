// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createBranchRequest,
  deleteBranchRequest,
  getBranchRequest,
  listBranchesRequest,
  updateBranchRequest
} from '@api/modules/branches.api'
import { listBusinessMembers } from '@api/modules/memberships.api'
import BranchesManagementPage from './BranchesManagementPage'

vi.mock('@api/modules/branches.api', () => ({
  assignBranchManagerRequest: vi.fn(),
  createBranchRequest: vi.fn(),
  deleteBranchRequest: vi.fn(),
  getBranchRequest: vi.fn(),
  listBranchesRequest: vi.fn(),
  updateBranchRequest: vi.fn()
}))
vi.mock('@api/modules/memberships.api', () => ({ listBusinessMembers: vi.fn() }))

const branch = {
  id: 1,
  name: 'Main Branch',
  code: 'MAIN',
  location: 'Nairobi',
  is_active: true,
  is_online_shop_source: true,
  manager_user_id: null,
  manager_name: null,
  created_at: '2026-09-01T08:00:00Z'
}

const mount = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      })}
    >
      <BranchesManagementPage />
    </QueryClientProvider>
  )

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listBranchesRequest).mockResolvedValue([branch])
  vi.mocked(listBusinessMembers).mockResolvedValue([])
  vi.mocked(createBranchRequest).mockResolvedValue(branch)
  vi.mocked(getBranchRequest).mockResolvedValue(branch)
  vi.mocked(updateBranchRequest).mockResolvedValue(branch)
  vi.mocked(deleteBranchRequest).mockResolvedValue({})
})

afterEach(cleanup)

it('shows a branch list and reuses one popup for create and edit', async () => {
  mount()

  expect(await screen.findByText('Main Branch')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'New Branch' }))
  expect(screen.getByRole('dialog', { name: 'Create Branch' })).toBeInTheDocument()
  expect(screen.getByLabelText('Branch Name')).toHaveValue('')

  fireEvent.click(screen.getByRole('button', { name: 'Close branch form' }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit Main Branch' }))
  expect(screen.getByRole('dialog', { name: 'Edit Branch' })).toBeInTheDocument()
  expect(screen.getByLabelText('Branch Name')).toHaveValue('Main Branch')
  expect(screen.getByLabelText('Code')).toHaveValue('MAIN')
})
