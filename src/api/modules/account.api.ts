import api from '@api/config/axios.config'

export type CartLine = { id: number; product_id: number; product_variant_id: number | null; name: string; quantity: number; unit_price: number; available: boolean }
export type SellerCart = { business_id: string; business_name: string; currency: string; items: CartLine[]; total_amount: number }
export type AccountAddress = { id: string; label: string; recipient: string; phone: string; address: string; city: string; country: string }
export type AccountOrder = { id: number; business_id: string; business_name: string; currency: string; total_amount: number; status: string; created_at: string; delivery_address?: Omit<AccountAddress, 'id' | 'label'> | null; items: { id: number; product_name: string; quantity: number; unit_price: number; total_price: number }[] }
export type AccountPayment = { id: number; order_id: number; business_name: string; currency: string; amount: number; method: string; status: string; created_at: string }
export type ReturnRequest = { id: number; order_id: number; kind: string; reason: string; status: string; created_at: string }
export type GuestLine = { product_id: number; product_variant_id?: number | null; quantity: number }

// Personal endpoints are context-independent on the server as well.
const config = { headers: { 'X-Context': 'customer' } }
export const accountGet = async <T,>(path: string): Promise<T> => (await api.get(`/account${path}`, config)).data
export const accountPost = async <T,>(path: string, body: unknown): Promise<T> => (await api.post(`/account${path}`, body, config)).data
export const accountPut = async <T,>(path: string, body: unknown): Promise<T> => (await api.put(`/account${path}`, body, config)).data
export const accountDelete = async (path: string) => (await api.delete(`/account${path}`, config)).data
export const getCart = () => accountGet<{ carts: SellerCart[] }>('/cart')
export const mergeCart = (merge_id: string, items: GuestLine[]) => accountPost<{ carts: SellerCart[] }>('/cart/merge', { merge_id, items })
