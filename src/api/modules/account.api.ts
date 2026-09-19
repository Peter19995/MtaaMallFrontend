import api from '@api/config/axios.config'

export type CartLine = { id: number; product_id: number; product_variant_id: number | null; name: string; quantity: number; unit_price: number; available: boolean }
export type SellerCart = { business_id: string; business_name: string; currency: string; items: CartLine[]; total_amount: number; fulfillment_methods: string[]; collection_branch: { id: number; name: string } | null }
export type AccountAddress = { id: string; label: string; recipient: string; phone: string; address: string; city: string; country: string }
export type AccountOrder = { id: number; business_id: string; business_name: string; currency: string; total_amount: number; status: string; payment_status: string; fulfillment_method: 'collection' | 'delivery'; branch_id?: number | null; branch_name?: string | null; created_at: string; delivery_address?: Omit<AccountAddress, 'id' | 'label'> | null; items: { id: number; product_name: string; quantity: number; unit_price: number; total_price: number; tax_amount: number; discount_amount: number }[] }
export type AccountPayment = { id: number; order_id: number; business_name: string; currency: string; amount: number; method: string; status: string; created_at: string }
export type ReturnRequest = { id: number; order_id: number; kind: string; reason: string; status: string; created_at: string }
export type SavedProduct = { id: string; product_id: number; name: string; description: string | null; price: number; currency_code: string; image_urls: string[]; is_active: boolean; business_id: string; business_name: string; saved_at: string }
export type GuestLine = { product_id: number; product_variant_id?: number | null; quantity: number }
export type OnlinePaymentIntent = {
  public_id: string; order_id: number; state: 'created' | 'initiating' | 'pending_customer' | 'successful' | 'failed' | 'cancelled' | 'timed_out' | 'unknown'
  amount: string; currency: string; phone_masked: string; attempt_number: number
  result_code: string | null; result_description: string | null; mpesa_receipt_number: string | null
  expires_at: string | null; initiated_at: string | null; completed_at: string | null
  failed_at: string | null; retry_available: boolean
}

// Personal endpoints are context-independent on the server as well.
const config = { headers: { 'X-Context': 'customer' } }
export const accountGet = async <T,>(path: string): Promise<T> => (await api.get(`/account${path}`, config)).data
export const accountPost = async <T,>(path: string, body: unknown): Promise<T> => (await api.post(`/account${path}`, body, config)).data
export const checkoutAccount = async (body: unknown, idempotencyKey: string): Promise<AccountOrder> =>
  (await api.post('/account/checkout', body, { headers: { 'X-Context': 'customer', 'Idempotency-Key': idempotencyKey } })).data
export const accountPut = async <T,>(path: string, body: unknown): Promise<T> => (await api.put(`/account${path}`, body, config)).data
export const accountDelete = async (path: string) => (await api.delete(`/account${path}`, config)).data
export const getCart = () => accountGet<{ carts: SellerCart[] }>('/cart')
export const mergeCart = (merge_id: string, items: GuestLine[]) => accountPost<{ carts: SellerCart[] }>('/cart/merge', { merge_id, items })
export const getSavedProducts = () => accountGet<SavedProduct[]>('/saved-products')
export const saveProduct = (productId: number) => accountPost<SavedProduct>(`/saved-products/${productId}`, {})
export const removeSavedProduct = (productId: number) => accountDelete(`/saved-products/${productId}`)
export const initiateOnlineMpesa = async (orderId: number, phoneNumber: string, idempotencyKey: string) =>
  (await api.post<OnlinePaymentIntent>(`/orders/${orderId}/payments/mpesa`,
    phoneNumber.trim() ? { phone_number: phoneNumber.trim() } : {},
    { headers: { 'X-Context': 'customer', 'Idempotency-Key': idempotencyKey } })).data
export const getOnlineMpesaIntent = async (publicId: string) =>
  (await api.get<OnlinePaymentIntent>(`/payments/mpesa/intents/${encodeURIComponent(publicId)}`,
    { headers: { 'X-Context': 'customer' } })).data
