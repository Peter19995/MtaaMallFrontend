import api from '@api/config/axios.config'

export type CountryResponse = {
  id: number
  name: string
  alpha_2_code: string
  alpha_3_code: string
  currency_code: string
  currency_name: string
  currency_symbol?: string | null
}

export const listCountriesRequest = async (): Promise<CountryResponse[]> => {
  const response = await api.get<CountryResponse[]>('/reference/countries')
  return response.data
}
