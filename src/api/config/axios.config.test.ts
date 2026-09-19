// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from './queryClient'
import { clearAuthentication, recoverRevokedWorkspace, setActiveApiContext } from './axios.config'

afterEach(() => {
  queryClient.clear()
  localStorage.clear()
  sessionStorage.clear()
})

describe('active API context', () => {
  it('clears old workspace data before switching businesses', () => {
    localStorage.setItem('auth_context', 'business:a')
    queryClient.setQueryData(['inventory'], ['Business A stock'])

    setActiveApiContext('business:b')

    expect(localStorage.getItem('auth_context')).toBe('business:b')
    expect(queryClient.getQueryData(['inventory'])).toBeUndefined()
  })

  it('does not discard caches when the context did not change', () => {
    localStorage.setItem('auth_context', 'customer')
    queryClient.setQueryData(['orders'], ['Order 1'])

    setActiveApiContext('customer')

    expect(queryClient.getQueryData(['orders'])).toEqual(['Order 1'])
  })

  it('clears authentication and sensitive checkout state on logout', () => {
    localStorage.setItem('auth_user', '12')
    localStorage.setItem('auth_context', 'customer')
    sessionStorage.setItem('mtaamall:online-mpesa:12', '{"orderId":1}')
    sessionStorage.setItem('unrelated', 'keep')

    clearAuthentication()

    expect(localStorage.getItem('auth_user')).toBeNull()
    expect(localStorage.getItem('auth_context')).toBeNull()
    expect(sessionStorage.getItem('mtaamall:online-mpesa:12')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('keep')
  })

  it('drops tenant caches and returns revoked memberships to workspace discovery', () => {
    localStorage.setItem('auth_context', 'business:a')
    queryClient.setQueryData(['business:a', 'inventory'], ['private stock'])
    const replace = vi.fn()

    recoverRevokedWorkspace(replace, () => 12345)

    expect(localStorage.getItem('auth_context')).toBe('customer')
    expect(queryClient.getQueryData(['business:a', 'inventory'])).toBeUndefined()
    expect(replace).toHaveBeenCalledWith('/account/workspaces?workspaceRefresh=12345')
  })
})
