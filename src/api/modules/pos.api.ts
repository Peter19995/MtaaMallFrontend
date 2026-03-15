import api from '@api/config/axios.config'

export type PosSaleItemCreate = {
  product_id: number
  quantity: number
}

export type PaymentModeCreate = {
  name: string
  code: string
  description?: string
  is_active?: boolean
  is_default?: boolean
  branch_id?: number
}

export type PaymentModeUpdate = {
  name?: string
  code?: string
  description?: string
  is_active?: boolean
  is_default?: boolean
}

export type PaymentModeResponse = {
  id: number
  name: string
  code: string
  description?: string | null
  is_active: boolean
  is_default: boolean
  branch_id: number
  branch_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type PaymentModeListParams = {
  branch_id?: number
  include_inactive?: boolean
}

export type PaymentRecordResponse = {
  id: number
  order_id: number
  amount: number
  method: string
  status: string
  created_at: string
}

export type MpesaStkPushResponse = {
  order_id: number
  payment_id?: number | null
  merchant_request_id?: string | null
  checkout_request_id: string
  response_code?: string | null
  response_description?: string | null
  customer_message?: string | null
  amount: number
  phone_number: string
  status: string
}

export type OrderPaymentProcessRequest = {
  payment_mode_id: number
  amount?: number
  phone_number?: string
  account_reference?: string
  transaction_desc?: string
  mark_completed?: boolean
  external_reference?: string
}

export type OrderPaymentProcessResponse = {
  order_id: number
  branch_id?: number | null
  channel: string
  order_status: string
  payment_mode_code: string
  result_status: string
  message: string
  payment?: PaymentRecordResponse | null
  mpesa?: MpesaStkPushResponse | null
}

export type PaymentProcessBranchParam = {
  branch_id?: number
}

export type PosSaleRequest = {
  items: PosSaleItemCreate[]
  payment_mode_id: number
  discount_amount?: number
  customer_id?: number
  branch_id?: number
}

export type PosSaleOrderItemResponse = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export type PosSaleResponse = {
  id: number
  customer_id: number
  branch_id?: number | null
  branch_name?: string | null
  status: string
  channel: string
  total_amount: number
  created_at: string
  items: PosSaleOrderItemResponse[]
}

export type PosSaleListParams = {
  branch_id?: number
  status?: string
  date_from?: string
  date_to?: string
  customer_id?: number
  skip?: number
  limit?: number
}

export type PosSaleBranchParam = {
  branch_id?: number
}

export type PosSaleStatusUpdateRequest = {
  status: string
}

export type PosSaleCancelRequest = {
  reason?: string
  restock_items?: boolean
}

export type PosSaleRefundItemRequest = {
  order_item_id: number
  quantity: number
}

export type PosSaleRefundRequest = {
  items?: PosSaleRefundItemRequest[]
  reason?: string
  restock_items?: boolean
}

export type PosSaleRefundResponse = {
  sale: PosSaleResponse
  refunded_amount: number
}

export type PosDailySummaryParams = {
  summary_date?: string
  branch_id?: number
}

export type PosDailySummaryResponse = {
  branch_id?: number | null
  branch_name?: string | null
  summary_date: string
  total_transactions: number
  total_items_sold: number
  gross_sales: number
  refunds: number
  net_sales: number
}

export const listPaymentModesRequest = async (
  params?: PaymentModeListParams
): Promise<PaymentModeResponse[]> => {
  const { data } = await api.get<PaymentModeResponse[]>('/payments/modes', { params })
  return data
}

export const createPaymentModeRequest = async (
  payload: PaymentModeCreate
): Promise<PaymentModeResponse> => {
  const { data } = await api.post<PaymentModeResponse>('/payments/modes', payload)
  return data
}

export const getPaymentModeRequest = async (modeId: number): Promise<PaymentModeResponse> => {
  const { data } = await api.get<PaymentModeResponse>(`/payments/modes/${modeId}`)
  return data
}

export const updatePaymentModeRequest = async (
  modeId: number,
  payload: PaymentModeUpdate
): Promise<PaymentModeResponse> => {
  const { data } = await api.put<PaymentModeResponse>(`/payments/modes/${modeId}`, payload)
  return data
}

export const deletePaymentModeRequest = async (modeId: number): Promise<void> => {
  await api.delete(`/payments/modes/${modeId}`)
}

export const processOrderPaymentRequest = async (
  orderId: number,
  payload: OrderPaymentProcessRequest,
  params?: PaymentProcessBranchParam
): Promise<OrderPaymentProcessResponse> => {
  const { data } = await api.post<OrderPaymentProcessResponse>(
    `/payments/orders/${orderId}/process`,
    payload,
    { params }
  )
  return data
}

export const createPosSaleRequest = async (payload: PosSaleRequest): Promise<PosSaleResponse> => {
  const { data } = await api.post<PosSaleResponse>('/pos/sales', payload)
  return data
}

export const listPosSalesRequest = async (params?: PosSaleListParams): Promise<PosSaleResponse[]> => {
  const { data } = await api.get<PosSaleResponse[]>('/pos/sales', { params })
  return data
}

export const getPosSaleRequest = async (
  saleId: number,
  params?: PosSaleBranchParam
): Promise<PosSaleResponse> => {
  const { data } = await api.get<PosSaleResponse>(`/pos/sales/${saleId}`, { params })
  return data
}

export const updatePosSaleStatusRequest = async (
  saleId: number,
  payload: PosSaleStatusUpdateRequest,
  params?: PosSaleBranchParam
): Promise<PosSaleResponse> => {
  const { data } = await api.patch<PosSaleResponse>(`/pos/sales/${saleId}/status`, payload, {
    params
  })
  return data
}

export const cancelPosSaleRequest = async (
  saleId: number,
  payload: PosSaleCancelRequest,
  params?: PosSaleBranchParam
): Promise<PosSaleResponse> => {
  const { data } = await api.post<PosSaleResponse>(`/pos/sales/${saleId}/cancel`, payload, {
    params
  })
  return data
}

export const refundPosSaleRequest = async (
  saleId: number,
  payload: PosSaleRefundRequest,
  params?: PosSaleBranchParam
): Promise<PosSaleRefundResponse> => {
  const { data } = await api.post<PosSaleRefundResponse>(`/pos/sales/${saleId}/refund`, payload, {
    params
  })
  return data
}

export const getDailyPosSummaryRequest = async (
  params?: PosDailySummaryParams
): Promise<PosDailySummaryResponse> => {
  const { data } = await api.get<PosDailySummaryResponse>('/pos/summary/daily', { params })
  return data
}
