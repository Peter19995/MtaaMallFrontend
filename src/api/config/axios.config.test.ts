// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { queryClient } from './queryClient'
import { setActiveApiContext } from './axios.config'

afterEach(() => {
  queryClient.clear()
  localStorage.clear()
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
})
