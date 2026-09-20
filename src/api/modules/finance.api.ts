import api from '@api/config/axios.config'

export type TaxRate = {
  id: number
  public_id: string
  name: string
  rate: number
  is_active: boolean
  created_at: string
}

export const listTaxRatesRequest = async (): Promise<TaxRate[]> => {
  const { data } = await api.get<TaxRate[]>('/finance/tax-rates', {
    params: { active_only: true },
  })
  return data
}
