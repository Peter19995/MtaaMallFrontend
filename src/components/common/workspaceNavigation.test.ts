// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { switchWorkspace } from './WorkspaceSwitcher'
import { getMeRequest } from '@api/modules/auth.api'
vi.mock('@api/modules/auth.api', () => ({ getMeRequest: vi.fn() }))
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })
it('checks the new context before switching and avoids a stale cached application shell', async () => {
  vi.mocked(getMeRequest).mockResolvedValue({ id: 1, username: 'owner', is_active: true, is_superuser: false,
    context: 'customer', roles: ['customer'], permissions: ['self.profile.read'] })
  const assign = vi.fn()
  vi.stubGlobal('window', { location: { assign } })
  localStorage.setItem('auth_context', 'business:old')
  localStorage.setItem('auth_user', 'old grants')
  await switchWorkspace('customer')
  expect(getMeRequest).toHaveBeenCalledWith(undefined, 'customer')
  expect(localStorage.getItem('auth_context')).toBe('customer')
  expect(localStorage.getItem('auth_user')).toBeNull()
  expect(assign).toHaveBeenCalledWith(expect.stringMatching(/^\/account\?workspaceRefresh=\d+$/))
})
