import api from '@api/config/axios.config'

export type SalesSummaryQuery = {
  start_date?: string
  end_date?: string
}

export type SalesSummaryResponse = {
  total_sales: number
  total_orders: number
  online_orders: number
  pos_orders: number
  active_projects: number
  low_stock_products: number
}

export const getSalesSummaryRequest = async (
  params?: SalesSummaryQuery
): Promise<SalesSummaryResponse> => {
  const { data } = await api.get<SalesSummaryResponse>('/reports/summary', {
    params
  })

  return data
}
