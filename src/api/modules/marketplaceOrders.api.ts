import api from '@api/config/axios.config'

export type BusinessMarketplaceOrder = {
  id: number
  customer_id: number
  branch_id: number | null
  branch_name: string | null
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  fulfillment_method: string
  total_amount: string
  created_at: string
  items: Array<{
    id: number
    product_name: string
    variant: Record<string, string>
    quantity: number
    unit_price: string
    total_price: string
  }>
}

export const listBusinessMarketplaceOrders = async (params?: {
  branch_id?: number
  status?: string
}) => (await api.get<BusinessMarketplaceOrder[]>('/business/orders', { params })).data

export const updateBusinessMarketplaceOrderStatus = async (
  orderId: number,
  status: 'shipped' | 'delivered',
) => (await api.patch<BusinessMarketplaceOrder>(
  `/business/orders/${orderId}/status`,
  { status },
)).data

export const cancelBusinessMarketplaceOrder = async (
  orderId: number,
  reason: string,
) => (await api.post<BusinessMarketplaceOrder>(
  `/business/orders/${orderId}/cancel`,
  { reason },
)).data
