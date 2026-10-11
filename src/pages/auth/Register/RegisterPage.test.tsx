// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { registerBusinessRequest, registerCustomerRequest } from '@api/modules/auth.api'
import RegisterPage from './RegisterPage'
import { listPublicBusinessTypes } from '@api/modules/businesses.api'

vi.mock('@api/modules/auth.api', () => ({
  registerBusinessRequest: vi.fn(),
  registerCustomerRequest: vi.fn(),
}))
vi.mock('@api/modules/businesses.api', () => ({ listPublicBusinessTypes: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('separates business and administrator information and reuses the legal name', async () => {
  vi.mocked(registerBusinessRequest).mockResolvedValue({})
  vi.mocked(listPublicBusinessTypes).mockResolvedValue([{ public_id: 'type-1', code: 'retail', name: 'Retail', description: null, is_active: true, created_at: '', updated_at: null }])
  render(<MemoryRouter initialEntries={['/register?type=business']}><RegisterPage /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: 'Business information' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Administrator information' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Login information' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Business display name')).not.toBeInTheDocument()
  await screen.findByRole('option', { name: 'Retail' })

  fireEvent.change(screen.getByLabelText(/^Legal business name/), { target: { value: 'Operating Software Limited' } })
  fireEvent.change(screen.getByLabelText('Registration number'), { target: { value: 'PVT-200' } })
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'osltd' } })
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Business Administrator' } })
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0791335490' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Peter@1490' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Peter@1490' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create business account' }))

  await waitFor(() => expect(registerBusinessRequest).toHaveBeenCalledOnce())
  expect(vi.mocked(registerBusinessRequest).mock.calls[0][0]).toMatchObject({
    name: 'Operating Software Limited',
    legal_name: 'Operating Software Limited',
    registration_number: 'PVT-200',
    business_type: 'retail',
    owner: {
      username: 'osltd',
      full_name: 'Business Administrator',
      phone: '0791335490',
      password: 'Peter@1490',
    },
  })
  expect(registerCustomerRequest).not.toHaveBeenCalled()
})

it('allows customer registration without an email address', async () => {
  vi.mocked(registerCustomerRequest).mockResolvedValue({})
  render(<MemoryRouter initialEntries={['/register']}><RegisterPage /></MemoryRouter>)

  expect(screen.getByLabelText(/^Email address/)).not.toBeRequired()
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'shopper' } })
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0791335490' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Peter@1490' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Peter@1490' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create customer account' }))

  await waitFor(() => expect(registerCustomerRequest).toHaveBeenCalledWith({
    username: 'shopper', phone: '0791335490', password: 'Peter@1490', email: undefined,
  }))
})
