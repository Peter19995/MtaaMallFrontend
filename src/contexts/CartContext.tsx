import { createContext, ReactNode, useEffect, useRef, useState } from 'react'
import { useAuth } from '@hooks/useAuth'
import { accountPost, accountPut, accountDelete, getCart, mergeCart, SellerCart } from '@api/modules/account.api'
import { emptyGuestCart, GUEST_CART_KEY, readGuestCart, GuestCartItem } from '../utils/guestCart'

type CartItem = { id: string; name: string; price: number; quantity: number; product_id?: number; product_variant_id?: number | null }
type CartContextValue = {
  items: CartItem[]; total: number; carts: SellerCart[]; isBusy: boolean; error: string
  addItem: (item: CartItem) => Promise<void>; removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>; clear: () => Promise<void>; refresh: () => Promise<void>
  pendingGuestItems: GuestCartItem[]; canEditPendingGuest: boolean; removePendingGuestItem: (id: string) => void
}
export const CartContext = createContext<CartContextValue | undefined>(undefined)
const message = (error: any) => error?.response?.data?.message || error?.response?.data?.detail || error?.message || 'Unable to update cart. Please retry.'

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [guest, setGuest] = useState(() => readGuestCart(localStorage.getItem(GUEST_CART_KEY)))
  const [carts, setCarts] = useState<SellerCart[]>([])
  const [owner, setOwner] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [canEditPendingGuest, setCanEditPendingGuest] = useState(false)
  const identity = useRef(user?.id)
  identity.current = user?.id
  const storeGuest = (items: GuestCartItem[]) => {
    const next = { ...emptyGuestCart(), items }
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next))
    setGuest(next)
  }

  const refresh = async () => {
    const id = user?.id
    if (!id) return
    setBusy(true); setError(''); setCanEditPendingGuest(false)
    try {
      const snapshot = readGuestCart(localStorage.getItem(GUEST_CART_KEY))
      const claim = localStorage.getItem(GUEST_CART_KEY + ':owner')
      if (snapshot.items.length && claim && claim !== id) throw new Error('Sign in to the previous account to finish syncing its guest cart.')
      if (snapshot.items.length) {
        // Bind pending merges to the first login. Never replay them into another identity.
        localStorage.setItem(GUEST_CART_KEY + ':owner', id)
        await mergeCart(snapshot.merge_id, snapshot.items.map(i => ({
          product_id: i.product_id, product_variant_id: i.product_variant_id, quantity: i.quantity
        })))
        if (readGuestCart(localStorage.getItem(GUEST_CART_KEY)).merge_id === snapshot.merge_id) {
          localStorage.removeItem(GUEST_CART_KEY); localStorage.removeItem(GUEST_CART_KEY + ':owner')
          setGuest(emptyGuestCart())
        }
      }
      const result = await getCart()
      if (identity.current === id) { setCarts(result.carts); setOwner(id) }
    } catch (e: any) { if (identity.current === id) {
      setError(String(message(e)))
      // Network failures have an unknown outcome: retry the identical merge ID.
      setCanEditPendingGuest([400, 404, 422].includes(e?.response?.status))
    } }
    finally { if (identity.current === id) setBusy(false) }
  }

  useEffect(() => {
    setCarts([]); setOwner(null); setError(''); setBusy(false)
    if (user?.id) void refresh()
  }, [user?.id])
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === GUEST_CART_KEY) setGuest(readGuestCart(e.newValue)) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const mutate = async (action: () => Promise<unknown>) => {
    const id = user?.id
    if (isBusy) throw new Error('Please wait for your cart to finish syncing.')
    setBusy(true); setError('')
    try {
      await action()
      const result = await getCart()
      if (identity.current === id) { setCarts(result.carts); setOwner(id ?? null) }
    } catch (e) { if (identity.current === id) setError(String(message(e))); throw e }
    finally { if (identity.current === id) setBusy(false) }
  }
  const addItem = async (item: CartItem) => {
    const product_id = item.product_id ?? Number(item.id)
    if (!Number.isSafeInteger(product_id) || product_id <= 0) throw new Error('Services require an enquiry, not product checkout.')
    if (user) {
      if (error) throw new Error('Resolve the cart sync error before adding more items.')
      await mutate(() => accountPost('/cart/items', { product_id, product_variant_id: item.product_variant_id, quantity: item.quantity }))
      return
    }
    if (localStorage.getItem(GUEST_CART_KEY + ':owner')) throw new Error('Sign in to finish syncing your previous cart first.')
    const key = product_id + ':' + (item.product_variant_id ?? 0)
    const previous = guest.items.find(i => i.id === key)
    const quantity = (previous?.quantity ?? 0) + item.quantity
    if (quantity > 1000 || guest.items.length >= 100 && !previous) throw new Error('Cart limit reached.')
    storeGuest(previous ? guest.items.map(i => i.id === key ? { ...i, quantity } : i) :
      [...guest.items, { ...item, id: key, product_id }])
  }
  const removeItem = async (id: string) => {
    if (user) await mutate(() => accountDelete('/cart/items/' + id))
    else {
      if (localStorage.getItem(GUEST_CART_KEY + ':owner')) throw new Error('Sign in to finish syncing before editing this cart.')
      storeGuest(guest.items.filter(i => i.id !== id))
    }
  }
  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1 || quantity > 1000) return
    if (user) await mutate(() => accountPut('/cart/items/' + id, { quantity }))
    else {
      if (localStorage.getItem(GUEST_CART_KEY + ':owner')) throw new Error('Sign in to finish syncing before editing this cart.')
      storeGuest(guest.items.map(i => i.id === id ? { ...i, quantity } : i))
    }
  }
  const visibleCarts = owner === user?.id ? carts : []
  const items = user ? visibleCarts.flatMap(c => c.items.map(i => ({
    id: String(i.id), name: i.name, price: i.unit_price, quantity: i.quantity
  }))) : guest.items
  const clear = async () => {
    if (user) await mutate(async () => { for (const i of items) await accountDelete('/cart/items/' + i.id) })
    else {
      if (localStorage.getItem(GUEST_CART_KEY + ':owner')) throw new Error('Sign in to finish syncing before editing this cart.')
      storeGuest([])
    }
  }
  const removePendingGuestItem = (id: string) => {
    if (isBusy || !canEditPendingGuest || localStorage.getItem(GUEST_CART_KEY + ':owner') !== user?.id) return
    const remaining = guest.items.filter(i => i.id !== id)
    storeGuest(remaining)
    if (!remaining.length) localStorage.removeItem(GUEST_CART_KEY + ':owner')
    void refresh()
  }
  return <CartContext.Provider value={{ items, carts: visibleCarts, total: items.reduce((n, i) => n + i.price * i.quantity, 0),
    pendingGuestItems: localStorage.getItem(GUEST_CART_KEY + ':owner') === user?.id ? guest.items : [], canEditPendingGuest, removePendingGuestItem,
    isBusy, error, addItem, removeItem, updateQuantity, clear, refresh }}>{children}</CartContext.Provider>
}
