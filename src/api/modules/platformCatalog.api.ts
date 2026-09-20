import api from '@api/config/axios.config'

export type CatalogReviewSummary = {
  public_id: string
  name: string
  status: string
  business_id?: string | null
  business_name?: string | null
  brand?: string | null
  category?: string | null
  package_quantity?: number | null
  package_unit?: string | null
  barcode?: string | null
  image?: string | null
  submitted_at: string
}

export type CatalogReviewDetail = CatalogReviewSummary & {
  description?: string | null
  unit_of_measure?: string | null
  merged_into_product_id?: string | null
  version: number
  potential_duplicates: CatalogReviewSummary[]
  linked_listings: Array<{
    public_id: string
    business_id: string
    business_name: string
    sku: string
    catalogue_link_status: string
  }>
  audit_history: Array<{
    action: string
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
    reason?: string | null
    actor_user_id?: number | null
    created_at: string
  }>
}

export const listCatalogProposalsRequest = async () => {
  const { data } = await api.get<CatalogReviewSummary[]>('/platform/catalog/proposals')
  return data
}

export const listPlatformCatalogProductsRequest = async (status?: string) => {
  const { data } = await api.get<CatalogReviewSummary[]>('/platform/catalog/products', { params: status ? { status } : undefined })
  return data
}

export const getPlatformCatalogProductRequest = async (id: string) => {
  const { data } = await api.get<CatalogReviewDetail>(`/platform/catalog/products/${id}`)
  return data
}

export const decideCatalogProductRequest = async (id: string, action: 'approve' | 'reject' | 'retire', reason: string) => {
  const { data } = await api.post<CatalogReviewDetail>(`/platform/catalog/products/${id}/${action}`, { reason })
  return data
}

export const mergeCatalogProductRequest = async (id: string, survivingProductId: string, reason: string) => {
  const { data } = await api.post<CatalogReviewDetail>(`/platform/catalog/products/${id}/merge`, {
    surviving_product_id: survivingProductId,
    reason,
  })
  return data
}

export const updatePlatformCatalogProductRequest = async (
  id: string,
  payload: { name?: string; description?: string | null; unit_of_measure?: string | null; package_quantity?: number | null; package_unit?: string | null; image?: string | null; reason: string },
) => {
  const { data } = await api.put<CatalogReviewDetail>(`/platform/catalog/products/${id}`, payload)
  return data
}
