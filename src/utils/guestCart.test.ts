import { describe, expect, it } from 'vitest'
import { readGuestCart } from './guestCart'

describe('persisted guest cart', () => {
  const cart = { merge_id: 'abb0c270-15c2-418a-b30d-6257950b6d6a', items: [{ id: '1:0', product_id: 1, name: 'Milk', price: 100, quantity: 2 }] }
  it('preserves the retry identifier and bounded product quantities', () => {
    expect(readGuestCart(JSON.stringify(cart))).toEqual(cart)
  })
  it('discards corrupt, non-product and unbounded stored payloads', () => {
    expect(readGuestCart('broken').items).toEqual([])
    expect(readGuestCart(JSON.stringify({ ...cart, items: [{ ...cart.items[0], product_id: 'service-1' }] })).items).toEqual([])
    expect(readGuestCart(JSON.stringify({ ...cart, items: [{ ...cart.items[0], quantity: 1000000 }] })).items).toEqual([])
    expect(readGuestCart(JSON.stringify({ ...cart, items: [{ ...cart.items[0], price: -100 }] })).items).toEqual([])
  })
})
