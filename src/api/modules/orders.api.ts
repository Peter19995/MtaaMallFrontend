import api from '@api/config/axios.config'

export type CartItemResponse = {
  id: number
  product_id: number
  product_name: string
  product_variant_id?: number | null
  variant_sku?: string | null
  variant_options?: Record<string, string>
  quantity: number
  unit_price: number
  total_price: number
}

export type CartResponse = {
  id: number
  customer_id: number
  items: CartItemResponse[]
  total_items: number
  total_amount: number
}

export type CartItemAdd = {
  product_id: number
  product_variant_id?: number | null
  quantity: number
}

export type OrderItemResponse = {
  id: number
  product_id: number
  product_name: string
  product_variant_id?: number | null
  quantity: number
  unit_price: number
  total_price: number
}

export type OrderResponse = {
  id: number
  customer_id: number
  branch_id?: number | null
  branch_name?: string | null
  status: string
  channel: string
  total_amount: number
  created_at: string
  items: OrderItemResponse[]
}

export const getCartRequest = async (): Promise<CartResponse> => {
  const { data } = await api.get<CartResponse>('/orders/cart')
  return data
}

export const addCartItemRequest = async (payload: CartItemAdd): Promise<CartResponse> => {
  const { data } = await api.post<CartResponse>('/orders/cart/items', payload)
  return data
}

export const removeCartItemRequest = async (itemId: number): Promise<CartResponse> => {
  const { data } = await api.delete<CartResponse>(`/orders/cart/items/${itemId}`)
  return data
}

export const checkoutRequest = async (
  paymentMethod = 'cash',
  branchId?: number
): Promise<OrderResponse> => {
  const { data } = await api.post<OrderResponse>('/orders/checkout', {
    payment_method: paymentMethod,
    ...(branchId ? { branch_id: branchId } : {})
  })
  return data
}

export const replaceCartRequest = async (items: CartItemAdd[]): Promise<CartResponse> => {
  const currentCart = await getCartRequest()

  for (const item of currentCart.items) {
    await removeCartItemRequest(item.id)
  }

  let updatedCart = { ...currentCart, items: [], total_items: 0, total_amount: 0 }
  for (const item of items) {
    updatedCart = await addCartItemRequest(item)
  }

  return updatedCart
}
