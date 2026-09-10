// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import api from '@api/config/axios.config'
import SecurityPage from './SecurityPage'

vi.mock('@api/config/axios.config', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ refreshIdentity: vi.fn() }) }))
vi.mock('@api/modules/auth.api', () => ({ changePasswordRequest: vi.fn(), logoutRequest: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const state = { email: 'owner@example.com', email_required: false, must_change_password: false,
  mfa_required: true, mfa_enabled: false, mfa_needed: true, ready: false }
const show = (value: typeof state) => {
  vi.mocked(api.get).mockResolvedValue({ data: value })
  render(<MemoryRouter><SecurityPage /></MemoryRouter>)
}

it('requires existing MFA before showing email or password setup controls', async () => {
  show({ ...state, mfa_enabled: true, email_required: true, must_change_password: true })
  expect(await screen.findByLabelText('MFA code')).toBeInTheDocument()
  expect(screen.queryByText('Send verification email')).not.toBeInTheDocument()
  expect(screen.queryByText('Change password and sign out')).not.toBeInTheDocument()
  expect(screen.queryByText('Continue to my account')).not.toBeInTheDocument()
})

it('holds unverified customers on email verification without dashboard access', async () => {
  show({ ...state, mfa_required: false, mfa_needed: false, email_required: true })
  expect(await screen.findByText('Send verification email')).toBeInTheDocument()
  expect(screen.queryByText('Generate setup key')).not.toBeInTheDocument()
  expect(screen.queryByText('Continue to my account')).not.toBeInTheDocument()
})

it('shows recovery codes once and requires saving them before continuing', async () => {
  show(state)
  vi.mocked(api.post).mockResolvedValueOnce({ data: { secret: 'TESTSETUPKEY' } })
  fireEvent.click(await screen.findByText('Generate setup key'))
  const input = await screen.findByLabelText('Confirm MFA code')
  vi.mocked(api.post).mockResolvedValueOnce({ data: { recovery_codes: ['one-time-recovery'] } })
  vi.mocked(api.get).mockResolvedValue({ data: { ...state, mfa_enabled: true, mfa_needed: false, ready: true } })
  fireEvent.change(input, { target: { value: '123456' } })
  fireEvent.submit(input.closest('form')!)
  expect(await screen.findByText('one-time-recovery')).toBeInTheDocument()
  await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/auth/security/mfa/confirm', { code: '123456' }))
  expect(screen.queryByText('Continue to my account')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('I saved my recovery codes'))
  expect(screen.getByText('Continue to my account')).toBeInTheDocument()
  expect(screen.queryByText('one-time-recovery')).not.toBeInTheDocument()
})
