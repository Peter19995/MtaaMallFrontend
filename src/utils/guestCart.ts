export type GuestCartItem = { id: string; product_id: number; product_variant_id?: number | null; name: string; price: number; quantity: number }
export type GuestCart = { merge_id: string; items: GuestCartItem[] }
export const GUEST_CART_KEY = 'mtaamall_guest_cart_v1'
export const emptyGuestCart = (): GuestCart => ({ merge_id: crypto.randomUUID(), items: [] })

export function readGuestCart(raw: string | null): GuestCart {
  try {
    const value = JSON.parse(raw ?? 'null')
    if (!value || typeof value.merge_id !== 'string' || !Array.isArray(value.items) || value.items.length > 100) return emptyGuestCart()
    if (!value.items.every((i: GuestCartItem) => Number.isSafeInteger(i.product_id) && i.product_id > 0 &&
      (i.product_variant_id == null || Number.isSafeInteger(i.product_variant_id) && i.product_variant_id > 0) &&
      Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= 1000 &&
      Number.isFinite(i.price) && i.price >= 0 && typeof i.name === 'string' && typeof i.id === 'string')) return emptyGuestCart()
    return value
  } catch { return emptyGuestCart() }
}
