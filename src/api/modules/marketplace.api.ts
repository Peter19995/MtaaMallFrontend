import api from '@api/config/axios.config'

export type MarketplaceOffer = {
  business_id: string
  business_name: string
  business_product_id: string
  business_variant_id: string
  catalog_variant_id?: string | null
  variant: Record<string, unknown>
  sku: string
  price: string
  currency: string
  available: boolean
  available_quantity: number
  fulfillment_branch_id: string
  fulfillment_branch_name: string
  image?: string | null
}

export type MarketplaceProduct = {
  product: {
    public_id: string
    name: string
    package?: string | null
    brand?: string | null
    image?: string | null
    description?: string | null
  }
  offers: MarketplaceOffer[]
}

export const listMarketplaceProductsRequest = async (params?: {
  skip?: number
  limit?: number
}): Promise<MarketplaceProduct[]> => {
  const { data } = await api.get<MarketplaceProduct[]>('/marketplace/products', { params })
  return data
}

export const getMarketplaceProductRequest = async (
  catalogProductId: string
): Promise<MarketplaceProduct> => {
  const { data } = await api.get<MarketplaceProduct>(`/marketplace/products/${catalogProductId}`)
  return data
}

export const listMarketplaceProductSellersRequest = async (
  catalogProductId: string
): Promise<MarketplaceOffer[]> => {
  const { data } = await api.get<MarketplaceOffer[]>(
    `/marketplace/products/${catalogProductId}/sellers`
  )
  return data
}

export const listMarketplaceBusinessProductsRequest = async (
  businessId: string,
  params?: { skip?: number; limit?: number }
): Promise<MarketplaceProduct[]> => {
  const { data } = await api.get<MarketplaceProduct[]>(
    `/marketplace/businesses/${businessId}/products`,
    { params }
  )
  return data
}
