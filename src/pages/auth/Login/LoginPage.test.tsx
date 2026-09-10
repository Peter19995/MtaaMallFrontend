// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { loginRequest, getMeRequest } from '@api/modules/auth.api'
import LoginPage from './LoginPage'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ login: vi.fn() }) }))
vi.mock('@api/modules/auth.api', () => ({ loginRequest: vi.fn(), getMeRequest: vi.fn() }))
beforeEach(() => { vi.stubGlobal('scrollTo', vi.fn()) })
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals() })

it('accepts lowercase usernames without altering passwords or stored username spelling', async () => {
  vi.mocked(loginRequest).mockResolvedValue({ access_token: 'test', refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600 })
  vi.mocked(getMeRequest).mockResolvedValue({ id: 1, username: 'OSLTD', email: null, full_name: null, is_active: true, is_superuser: false, roles: ['customer'], permissions: [], created_at: '2026-09-06T00:00:00Z' })
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
  const identifier = screen.getByLabelText('Username, email or phone')
  expect(identifier).toHaveAttribute('autocapitalize', 'none')
  expect(identifier).toHaveAttribute('autocomplete', 'username')
  expect(screen.getByText('Usernames are not case-sensitive.')).toBeInTheDocument()
  fireEvent.change(identifier, { target: { value: ' osltd ' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SecurePass1!' } })
  fireEvent.submit(identifier.closest('form')!)
  await waitFor(() => expect(loginRequest).toHaveBeenCalledWith({ username: 'osltd', password: 'SecurePass1!' }))
  await waitFor(() => expect(getMeRequest).toHaveBeenCalledWith())
})
