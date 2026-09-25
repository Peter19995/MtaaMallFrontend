// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
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

it('shows invalid credentials on the login screen without redirecting', async () => {
  vi.mocked(loginRequest).mockRejectedValue(
    new axios.AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: {} } as any,
        data: { detail: 'Incorrect username or password' },
      },
    ),
  )

  render(<MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<p>Home page</p>} />
  </Routes></MemoryRouter>)

  fireEvent.change(screen.getByLabelText('Username, email or phone'), { target: { value: 'wrong-user' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } })
  fireEvent.submit(screen.getByLabelText('Username, email or phone').closest('form')!)

  expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument()
  expect(screen.getByText(/Welcome back to/i)).toBeInTheDocument()
  expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  expect(getMeRequest).not.toHaveBeenCalled()
})

it.each([
  [{ context: 'platform', experience: 'platform', roles: ['business_manager'], permissions: ['platform.businesses.read'] }, 'Platform landing'],
  [{ context: 'business:a', experience: 'business', roles: ['business_owner'], permissions: ['business.settings.read'] }, 'Business landing'],
  [{ context: 'business:a', experience: 'employee', roles: ['sales_staff'], permissions: ['pos.sell'] }, 'Employee landing'],
  [{ context: 'customer', experience: 'account', roles: ['customer'], permissions: ['self.profile.read'] }, 'Customer landing'],
])('lands each selected profile in its own experience', async (authority, expected) => {
  vi.mocked(loginRequest).mockResolvedValue({ access_token: 'test', refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600 })
  vi.mocked(getMeRequest).mockResolvedValue({
    id: 1, username: 'identity', email: null, full_name: null,
    is_active: true, is_superuser: false, created_at: '2026-09-06T00:00:00Z',
    business_memberships: [], platform_memberships: [], workspaces: [],
    ...authority,
  } as any)
  const paths: Record<string, string> = {
    'Platform landing': '/platform', 'Business landing': '/business',
    'Employee landing': '/employee', 'Customer landing': '/account',
  }
  render(<MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path={paths[expected]} element={<p>{expected}</p>} />
  </Routes></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Username, email or phone'), { target: { value: 'identity' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } })
  fireEvent.submit(screen.getByLabelText('Username, email or phone').closest('form')!)
  await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument())
})
