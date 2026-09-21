import api from '@api/config/axios.config'

export type CatalogCategory = {
  public_id: string
  parent_public_id?: string | null
  name: string
  slug: string
  description?: string | null
  image?: string | null
  status: string
}

export type CatalogBrand = {
  public_id: string
  name: string
  logo?: string | null
  website?: string | null
  status: string
}

export type CatalogIdentifier = {
  identifier_type: string
  identifier_value: string
  is_primary: boolean
}

export type CatalogProductSearchResult = {
  public_id: string
  name: string
  brand?: string | null
  brand_public_id?: string | null
  category?: string | null
  category_public_id?: string | null
  package_quantity?: number | null
  package_unit?: string | null
  unit_of_measure?: string | null
  barcode?: string | null
  identifiers: CatalogIdentifier[]
  variants: Array<{
    public_id: string
    catalog_product_public_id: string
    name: string
    normalized_attributes: Record<string, string>
    image?: string | null
    status: string
  }>
  image?: string | null
  description?: string | null
  approval_status: string
  businesses_using: number
  match_type: 'browse' | 'exact_identifier' | 'exact_manufacturer' | 'exact_product' | 'fuzzy'
  match_score: number
  requires_confirmation: boolean
}

export type CatalogSearchParams = {
  q: string
  brand?: string
  manufacturer_code?: string
  package_quantity?: string
  package_unit?: string
  limit?: number
}

export type CatalogProductProposal = {
  name: string
  category_id?: string | null
  brand_id?: string | null
  barcode?: string | null
  description?: string | null
  unit_of_measure?: string | null
  package_quantity?: number | null
  package_unit?: string | null
  image?: string | null
  confirm_create?: boolean
}

export type CatalogProductProposalResult = {
  outcome: 'matches_found' | 'created'
  requires_confirmation: boolean
  can_confirm_create: boolean
  suggestions: Array<{
    public_id: string
    name: string
    brand?: string | null
    package_quantity?: number | null
    package_unit?: string | null
    barcode?: string | null
    status: string
    match_type: 'exact_identifier' | 'exact_product' | 'likely_product'
    match_score: number
  }>
  proposal?: { public_id: string; name: string; status: string } | null
  business_listing?: {
    public_id: string
    sku: string
    name: string
    catalogue_link_status: string
    is_published: boolean
    available_online: boolean
    stock_quantity: number
  } | null
}

export const listCatalogCategoriesRequest = async (): Promise<CatalogCategory[]> => {
  const { data } = await api.get<CatalogCategory[]>('/catalog/categories')
  return data
}

export const listCatalogBrandsRequest = async (): Promise<CatalogBrand[]> => {
  const { data } = await api.get<CatalogBrand[]>('/catalog/brands')
  return data
}

export const listCatalogProductsRequest = async (
  params?: { skip?: number; limit?: number }
): Promise<CatalogProductSearchResult[]> => {
  const { data } = await api.get<CatalogProductSearchResult[]>('/catalog/products', { params })
  return data
}

export const searchCatalogProductsRequest = async (
  params: CatalogSearchParams
): Promise<CatalogProductSearchResult[]> => {
  const { data } = await api.get<CatalogProductSearchResult[]>('/catalog/products/search', { params })
  return data
}

export const proposeCatalogProductRequest = async (
  payload: CatalogProductProposal
): Promise<CatalogProductProposalResult> => {
  const { data } = await api.post<CatalogProductProposalResult>(
    '/catalog/product-proposals', payload
  )
  return data
}
