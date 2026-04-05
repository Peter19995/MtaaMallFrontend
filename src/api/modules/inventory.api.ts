import api from '@api/config/axios.config'

export type RestockItemCreate = {
  product_id: number
  quantity: number
  buying_price: number
  selling_price: number
  max_offer?: number
  notes?: string
}

export type RestockBatchCreate = {
  branch_id?: number
  restock_date: string
  location?: string
  items: RestockItemCreate[]
}

export type RestockResponse = {
  id: number
  branch_id?: number | null
  branch_name?: string | null
  product_id: number
  product_name: string
  quantity: number
  buying_price: number
  selling_price: number
  max_offer: number
  restock_date: string
  location: string
  previous_stock: number
  new_stock: number
  category_id?: number | null
  category_name?: string | null
  category_in_stock_value: number
  category_in_stock_quantity: number
  created_at?: string | null
}

export type RestockListParams = {
  restock_date?: string
  branch_id?: number
  skip?: number
  limit?: number
  product_id?: number
}

export type StockCountCreate = {
  product_id: number
  branch_id?: number
  count_date: string
  physical_stock: number
  apply_adjustment?: boolean
  adjustment_reason?: StockCountAdjustmentReason
  adjustment_reference?: string
  valuation_method?: InventoryValuationMethod
  adjustment_buying_price?: number
  adjustment_selling_price?: number
  notes?: string
}

export type StockCountResponse = {
  id: number
  branch_id?: number | null
  branch_name?: string | null
  product_id: number
  product_name: string
  count_date: string
  system_stock: number
  physical_stock: number
  variance: number
  apply_adjustment: boolean
  adjustment_reason?: StockCountAdjustmentReason | null
  adjustment_reference?: string | null
  valuation_method_used?: InventoryValuationMethod | null
  accounting_entry_id?: number | null
  accounting_entry_number?: string | null
  accounting_amount?: number | null
  location: string
  notes?: string | null
  category_id?: number | null
  category_name?: string | null
  category_in_stock_value: number
  category_in_stock_quantity: number
  created_at?: string | null
}

export type StockCountListParams = {
  branch_id?: number
  skip?: number
  limit?: number
  product_id?: number
}

export type StockTransferCreate = {
  product_id: number
  from_branch_id: number
  to_branch_id: number
  quantity: number
  transfer_date: string
  notes?: string
}

export type StockTransferResponse = {
  id: number
  product_id: number
  product_name: string
  from_branch_id: number
  from_branch_name: string
  to_branch_id: number
  to_branch_name: string
  quantity: number
  transfer_date: string
  from_location?: string | null
  to_location?: string | null
  from_previous_stock: number
  from_new_stock: number
  to_previous_stock: number
  to_new_stock: number
  business_stock_quantity: number
  notes?: string | null
  created_at?: string | null
}

export type ProductStockStatusResponse = {
  branch_id?: number | null
  branch_name?: string | null
  product_id: number
  product_name: string
  sku: string
  category_id?: number | null
  category_name?: string | null
  stock_quantity: number
  business_stock_quantity: number
  selling_price: number
  in_stock_value: number
  reorder_level: number
  is_low_stock?: boolean
}

export type StockStatusListParams = {
  branch_id?: number
  product_id?: number
  skip?: number
  limit?: number
}

export type CategoryStockValueResponse = {
  category_id: number
  category_name: string
  branch_id?: number | null
  branch_name?: string | null
  in_stock_quantity: number
  in_stock_value: number
}

export type CategoryStockValueParams = {
  branch_id?: number
}

export type InventoryDashboardAlert = {
  type: string
  severity: string
  product_id?: number
  message: string
}

export type InventoryDashboardSummary = {
  total_stock_value: number
  total_products: number
  low_stock_items: number
  out_of_stock_items: number
  tracked_categories: number
}

export type InventoryDashboardResponse = {
  generated_at: string
  summary: InventoryDashboardSummary
  category_stock_values: CategoryStockValueResponse[]
  stock_status: ProductStockStatusResponse[]
  recent_restocks: RestockResponse[]
  recent_stock_counts: StockCountResponse[]
  alerts: InventoryDashboardAlert[]
}

export type InventoryDashboardParams = {
  branch_id?: number
  status_limit?: number
  recent_limit?: number
}

export type InventoryValuationMethod = 'fifo' | 'lifo' | 'weighted_average'

export type StockCountAdjustmentReason =
  | 'restock_correction'
  | 'sale_correction'
  | 'lost'
  | 'damaged'
  | 'theft'
  | 'found'
  | 'other'

export type InventoryValuationMethodInfoResponse = {
  method: InventoryValuationMethod
  name: string
  description: string
}

export type StockCountAdjustmentReasonInfoResponse = {
  reason: StockCountAdjustmentReason
  name: string
  description: string
}

export type InventoryValuationMethodResponse = {
  branch_id?: number | null
  branch_name?: string | null
  default_method: InventoryValuationMethod
}

export type InventoryValuationMethodParams = {
  branch_id?: number
}

export type InventoryValuationMethodUpdate = {
  branch_id?: number
  default_method: InventoryValuationMethod
}

export const createRestockRequest = async (
  payload: RestockBatchCreate | RestockItemCreate[]
): Promise<RestockResponse[]> => {
  const { data } = await api.post<RestockResponse[]>('/inventory/restocks', payload)
  return data
}

export const getRestocksRequest = async (
  params?: RestockListParams
): Promise<RestockResponse[]> => {
  const { data } = await api.get<RestockResponse[]>('/inventory/restocks', { params })
  return data
}

export const createStockCountRequest = async (
  payload: StockCountCreate
): Promise<StockCountResponse> => {
  const { data } = await api.post<StockCountResponse>('/inventory/stock-counts', payload)
  return data
}

export const createStockTransferRequest = async (
  payload: StockTransferCreate
): Promise<StockTransferResponse> => {
  const { data } = await api.post<StockTransferResponse>('/inventory/stock-transfers', payload)
  return data
}

export const getStockCountsRequest = async (
  params?: StockCountListParams
): Promise<StockCountResponse[]> => {
  const { data } = await api.get<StockCountResponse[]>('/inventory/stock-counts', { params })
  return data
}

export const getCategoryStockValuesRequest = async (
  params?: CategoryStockValueParams
): Promise<CategoryStockValueResponse[]> => {
  const { data } = await api.get<CategoryStockValueResponse[]>('/inventory/category-stock-values', {
    params
  })
  return data
}

export const getStockStatusRequest = async (
  params?: StockStatusListParams
): Promise<ProductStockStatusResponse[]> => {
  const { data } = await api.get<ProductStockStatusResponse[]>('/inventory/stock-status', { params })
  return data
}

export const getInventoryDashboardRequest = async (
  params?: InventoryDashboardParams
): Promise<InventoryDashboardResponse> => {
  const { data } = await api.get<InventoryDashboardResponse>('/inventory/dashboard', { params })
  return data
}

export const getSupportedValuationMethodsRequest = async (): Promise<
  InventoryValuationMethodInfoResponse[]
> => {
  const { data } = await api.get<InventoryValuationMethodInfoResponse[]>('/inventory/valuation-methods')
  return data
}

export const getStockCountAdjustmentReasonsRequest = async (): Promise<
  StockCountAdjustmentReasonInfoResponse[]
> => {
  const { data } = await api.get<StockCountAdjustmentReasonInfoResponse[]>(
    '/inventory/stock-count-adjustment-reasons'
  )
  return data
}

export const getDefaultValuationMethodRequest = async (
  params?: InventoryValuationMethodParams
): Promise<InventoryValuationMethodResponse> => {
  const { data } = await api.get<InventoryValuationMethodResponse>('/inventory/valuation-method', {
    params
  })
  return data
}

export const updateDefaultValuationMethodRequest = async (
  payload: InventoryValuationMethodUpdate
): Promise<InventoryValuationMethodResponse> => {
  const { data } = await api.put<InventoryValuationMethodResponse>(
    '/inventory/valuation-method',
    payload
  )
  return data
}
