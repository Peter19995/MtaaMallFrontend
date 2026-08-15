import api from '@api/config/axios.config'

export type SalesSummaryQuery = {
  start_date?: string
  end_date?: string
  branch_id?: number
}

export type SalesSummaryResponse = {
  branch_id?: number | null
  branch_name?: string | null
  total_sales: number
  total_orders: number
  online_orders: number
  pos_orders: number
  active_projects: number
  low_stock_products: number
}

export type DailySalesPoint = {
  date: string
  total_sales: number
  orders: number
}

export const getSalesSummaryRequest = async (
  params?: SalesSummaryQuery
): Promise<SalesSummaryResponse> => {
  const { data } = await api.get<SalesSummaryResponse>('/reports/summary', {
    params
  })

  return data
}

export const getDailySalesRequest = async (
  params?: SalesSummaryQuery
): Promise<DailySalesPoint[]> => {
  const { data } = await api.get<DailySalesPoint[]>('/reports/sales/daily', {
    params
  })

  return data
}
