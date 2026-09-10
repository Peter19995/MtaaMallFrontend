// @vitest-environment jsdom
import { useContext } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CartProvider, CartContext } from './CartContext'
import { GUEST_CART_KEY } from '../utils/guestCart'

const state = vi.hoisted(() => ({ user: { id: '1' } as { id: string } | null, get: vi.fn(), merge: vi.fn() }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('@api/modules/account.api', () => ({ getCart: state.get, mergeCart: state.merge, accountPost: vi.fn(), accountPut: vi.fn(), accountDelete: vi.fn() }))
function Probe() {
  const cart = useContext(CartContext)!
  return <><p data-testid="items">{cart.items.map(i => i.name).join(',')}</p><p data-testid="error">{cart.error}</p><button onClick={() => cart.refresh()}>Retry</button><button onClick={() => cart.removeItem('1:0').catch(() => {})}>Remove</button><p data-testid="editable">{String(cart.canEditPendingGuest)}</p></>
}
const guest = { merge_id: 'abb0c270-15c2-418a-b30d-6257950b6d6a', items: [{ id: '1:0', product_id: 1, quantity: 2, price: 1, name: 'Guest milk' }] }
beforeEach(() => { localStorage.clear(); state.user = { id: '1' }; state.get.mockResolvedValue({ carts: [] }); state.merge.mockReset(); localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guest)) })
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('merges only product identifiers and quantities and clears guest state after confirmation', async () => {
  state.merge.mockResolvedValue({ carts: [] })
  render(<CartProvider><Probe /></CartProvider>)
  await waitFor(() => expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull())
  expect(state.merge).toHaveBeenCalledWith(guest.merge_id, [{ product_id: 1, product_variant_id: undefined, quantity: 2 }])
})

it('retries uncertain merges with the identical key and prevents editing the pending batch', async () => {
  state.merge.mockRejectedValueOnce(new Error('Network lost')).mockResolvedValue({ carts: [] })
  render(<CartProvider><Probe /></CartProvider>)
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('Network lost'))
  expect(screen.getByTestId('editable').textContent).toBe('false')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(state.merge).toHaveBeenCalledTimes(2))
  expect(state.merge.mock.calls[1]).toEqual(state.merge.mock.calls[0])
})

it('does not replay an unresolved guest merge into a different logged-in identity', async () => {
  state.merge.mockRejectedValue(new Error('Network lost'))
  const view = render(<CartProvider><Probe /></CartProvider>)
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('Network lost'))
  state.user = { id: '2' }; view.rerender(<CartProvider><Probe /></CartProvider>)
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('previous account'))
  expect(state.merge).toHaveBeenCalledTimes(1)
  expect(screen.getByTestId('items').textContent).toBe('')
})

it('keeps an uncertain merge immutable even after logout', async () => {
  state.merge.mockRejectedValue(new Error('Network lost'))
  const view = render(<CartProvider><Probe /></CartProvider>)
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('Network lost'))
  state.user = null; view.rerender(<CartProvider><Probe /></CartProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(JSON.parse(localStorage.getItem(GUEST_CART_KEY)!)).toEqual(guest)
})
