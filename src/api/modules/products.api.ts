import api from '@api/config/axios.config'

export type ProductCategoryResponse = {
  id: number
  name: string
  description?: string | null
}

export type ProductCategoryCreate = {
  name: string
  description?: string
}

export type ProductCategoryUpdate = {
  name?: string
  description?: string | null
}

export type ProductImageRecord = {
  id: number
  image_url?: string | null
  file_url?: string | null
  file_path?: string | null
  url?: string | null
  alt_text?: string | null
}

export type ProductVariantOptionValueCreate = {
  value: string
  display_value?: string
  sort_order?: number
}

export type ProductVariantOptionValueResponse = {
  id: number
  value: string
  display_value?: string | null
  sort_order: number
}

export type ProductVariantOptionCreate = {
  option_name: string
  option_type?: string
  values?: ProductVariantOptionValueCreate[]
}

export type ProductVariantOptionUpdate = {
  option_name?: string | null
  option_type?: string | null
}

export type ProductVariantOptionValueUpdate = {
  value?: string | null
  display_value?: string | null
  sort_order?: number | null
}

export type ProductVariantOptionResponse = {
  id: number
  option_name: string
  option_type: string
  values: ProductVariantOptionValueResponse[]
}

export type ProductVariantCreate = {
  sku: string
  price_override?: number | null
  stock_quantity?: number
  weight?: number | null
  image_url?: string | null
  is_active?: boolean
  option_value_ids: number[]
}

export type ProductVariantUpdate = {
  sku?: string | null
  price_override?: number | null
  stock_quantity?: number | null
  weight?: number | null
  image_url?: string | null
  is_active?: boolean | null
  option_value_ids?: number[] | null
}

export type ProductVariantResponse = {
  id: number
  sku: string
  price: number
  price_override?: number | null
  stock_quantity: number
  weight?: number | null
  image_url?: string | null
  is_active: boolean
  is_published?: boolean
  available_online?: boolean
  options: Record<string, string>
  option_value_ids: number[]
  created_at?: string | null
}

export type ProductResponse = {
  id: number
  sku: string
  name: string
  description?: string | null
  tags?: string | null
  category_id?: number | null
  category_name?: string | null
  stock_quantity: number
  reorder_level: number
  is_active: boolean
  price: number
  selling_price?: number
  is_on_offer?: boolean
  max_offer?: number
  image_urls?: string[]
  images?: ProductImageRecord[]
  variant_options?: ProductVariantOptionResponse[]
  variants?: ProductVariantResponse[]
  branch_id?: number | null
  branch_name?: string | null
  business_id?: string | null
  business_name?: string | null
  fulfillment_methods?: string[]
  created_at: string
}

export type ProductCreate = {
  sku: string
  name: string
  description?: string
  tags?: string | null
  category_id?: number
  stock_quantity?: number
  reorder_level?: number
  is_active?: boolean
  is_published?: boolean
  available_online?: boolean
  selling_price?: number
  is_on_offer?: boolean
  max_offer?: number
}

export type ProductUpdate = {
  name?: string
  description?: string
  tags?: string | null
  category_id?: number
  stock_quantity?: number
  reorder_level?: number
  is_active?: boolean
  is_published?: boolean
  available_online?: boolean
  selling_price?: number
  is_on_offer?: boolean
  max_offer?: number
}

export type ProductPriceUpdate = {
  selling_price: number
}

export type ProductOfferUpdate = {
  is_on_offer: boolean
  max_offer?: number
}

export type ProductListParams = {
  skip?: number
  limit?: number
  search?: string
  category_id?: number
  in_stock_only?: boolean
  branch_id?: number
}

export type ProductGetParams = {
  branch_id?: number
}

export type InStockProductsScope = 'all' | 'branch' | 'online'

export type InStockProductsParams = {
  scope?: InStockProductsScope
  branch_id?: number
  skip?: number
  limit?: number
  search?: string
  category_id?: number
}

export type ProductImagesResponse = {
  image_urls: string[]
  images?: ProductImageRecord[]
}

export type GeneratedProductSkuResponse = {
  category_id: number
  category_name: string
  sku_prefix: string
  next_sequence: number
  suggested_sku: string
}

export const listCategoriesRequest = async (): Promise<ProductCategoryResponse[]> => {
  const { data } = await api.get<ProductCategoryResponse[]>('/products/categories/list')
  return data
}

export const generateProductSkuRequest = async (
  categoryId: number
): Promise<GeneratedProductSkuResponse> => {
  const { data } = await api.get<GeneratedProductSkuResponse>('/products/sku/generate', {
    params: {
      category_id: categoryId
    }
  })
  return data
}

export const listVariantOptionsRequest = async (): Promise<ProductVariantOptionResponse[]> => {
  const { data } = await api.get<ProductVariantOptionResponse[]>('/products/variant-options')
  return data
}

export const createVariantOptionRequest = async (
  payload: ProductVariantOptionCreate
): Promise<ProductVariantOptionResponse> => {
  const { data } = await api.post<ProductVariantOptionResponse>('/products/variant-options', payload)
  return data
}

export const getVariantOptionRequest = async (
  optionId: number
): Promise<ProductVariantOptionResponse> => {
  const { data } = await api.get<ProductVariantOptionResponse>(`/products/variant-options/${optionId}`)
  return data
}

export const updateVariantOptionRequest = async (
  optionId: number,
  payload: ProductVariantOptionUpdate
): Promise<ProductVariantOptionResponse> => {
  const { data } = await api.put<ProductVariantOptionResponse>(
    `/products/variant-options/${optionId}`,
    payload
  )
  return data
}

export const deleteVariantOptionRequest = async (optionId: number): Promise<void> => {
  await api.delete(`/products/variant-options/${optionId}`)
}

export const createVariantOptionValueRequest = async (
  optionId: number,
  payload: ProductVariantOptionValueCreate
): Promise<ProductVariantOptionValueResponse> => {
  const { data } = await api.post<ProductVariantOptionValueResponse>(
    `/products/variant-options/${optionId}/values`,
    payload
  )
  return data
}

export const updateVariantOptionValueRequest = async (
  valueId: number,
  payload: ProductVariantOptionValueUpdate
): Promise<ProductVariantOptionValueResponse> => {
  const { data } = await api.put<ProductVariantOptionValueResponse>(
    `/products/variant-options/values/${valueId}`,
    payload
  )
  return data
}

export const deleteVariantOptionValueRequest = async (valueId: number): Promise<void> => {
  await api.delete(`/products/variant-options/values/${valueId}`)
}

export const listProductVariantOptionsRequest = async (
  productId: number
): Promise<ProductVariantOptionResponse[]> => {
  const { data } = await api.get<ProductVariantOptionResponse[]>(
    `/products/${productId}/variant-options`
  )
  return data
}

export const attachVariantOptionToProductRequest = async (
  productId: number,
  optionId: number
): Promise<void> => {
  await api.post(`/products/${productId}/variant-options/${optionId}`)
}

export const detachVariantOptionFromProductRequest = async (
  productId: number,
  optionId: number
): Promise<void> => {
  await api.delete(`/products/${productId}/variant-options/${optionId}`)
}

export const createCategoryRequest = async (
  payload: ProductCategoryCreate
): Promise<ProductCategoryResponse> => {
  const { data } = await api.post<ProductCategoryResponse>('/products/categories', payload)
  return data
}

export const getCategoryRequest = async (categoryId: number): Promise<ProductCategoryResponse> => {
  const { data } = await api.get<ProductCategoryResponse>(`/products/categories/${categoryId}`)
  return data
}

export const updateCategoryRequest = async (
  categoryId: number,
  payload: ProductCategoryUpdate
): Promise<ProductCategoryResponse> => {
  const { data } = await api.put<ProductCategoryResponse>(
    `/products/categories/${categoryId}`,
    payload
  )
  return data
}

export const deleteCategoryRequest = async (categoryId: number): Promise<void> => {
  await api.delete(`/products/categories/${categoryId}`)
}

export const listProductsRequest = async (
  params?: ProductListParams
): Promise<ProductResponse[]> => {
  const { data } = await api.get<ProductResponse[]>('/products/', { params })
  return data
}

export const listInStockProductsRequest = async (
  params?: InStockProductsParams
): Promise<ProductResponse[]> => {
  const { data } = await api.get<ProductResponse[]>('/products/in-stock', { params })
  return data
}

export const getProductRequest = async (
  productId: number,
  params?: ProductGetParams
): Promise<ProductResponse> => {
  const { data } = await api.get<ProductResponse>(`/products/${productId}`, { params })
  return data
}

const buildProductImagesFormData = (images: File[]): FormData => {
  const formData = new FormData()
  images.forEach((image) => {
    formData.append('files', image)
  })
  return formData
}

export const createProductRequest = async (
  payload: ProductCreate,
  images: File[] = []
): Promise<ProductResponse> => {
  if (images.length === 0) {
    const { data } = await api.post<ProductResponse>('/products/', payload)
    return data
  }

  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value))
  })
  images.forEach(image => formData.append('files', image))
  const { data } = await api.post<ProductResponse>('/products/', formData)
  return data
}

export const updateProductRequest = async (
  productId: number,
  payload: ProductUpdate
): Promise<ProductResponse> => {
  const { data } = await api.put<ProductResponse>(`/products/${productId}`, payload)
  return data
}

export const updateProductPriceRequest = async (
  productId: number,
  payload: ProductPriceUpdate
): Promise<ProductResponse> => {
  const { data } = await api.patch<ProductResponse>(`/products/${productId}/price`, payload)
  return data
}

export const updateProductOfferRequest = async (
  productId: number,
  payload: ProductOfferUpdate
): Promise<ProductResponse> => {
  const { data } = await api.patch<ProductResponse>(`/products/${productId}/offer`, payload)
  return data
}

export const uploadProductImagesRequest = async (
  productId: number,
  images: File[]
): Promise<void> => {
  if (images.length === 0) {
    return
  }

  const formData = buildProductImagesFormData(images)
  await api.post(`/products/${productId}/images`, formData)
}

export const deleteProductImageRequest = async (
  productId: number,
  imageId: number
): Promise<ProductImagesResponse> => {
  const { data } = await api.delete<ProductImagesResponse>(`/products/${productId}/images/${imageId}`)
  return data
}

export const deleteProductRequest = async (productId: number): Promise<void> => {
  await api.delete(`/products/${productId}`)
}

export const listProductVariantsRequest = async (
  productId: number
): Promise<ProductVariantResponse[]> => {
  const { data } = await api.get<ProductVariantResponse[]>(`/products/${productId}/variants`)
  return data
}

export const createProductVariantRequest = async (
  productId: number,
  payload: ProductVariantCreate
): Promise<ProductVariantResponse> => {
  const { data } = await api.post<ProductVariantResponse>(`/products/${productId}/variants`, payload)
  return data
}

export const getProductVariantRequest = async (
  productId: number,
  variantId: number
): Promise<ProductVariantResponse> => {
  const { data } = await api.get<ProductVariantResponse>(
    `/products/${productId}/variants/${variantId}`
  )
  return data
}

export const updateProductVariantRequest = async (
  productId: number,
  variantId: number,
  payload: ProductVariantUpdate
): Promise<ProductVariantResponse> => {
  const { data } = await api.put<ProductVariantResponse>(
    `/products/${productId}/variants/${variantId}`,
    payload
  )
  return data
}

export const deleteProductVariantRequest = async (
  productId: number,
  variantId: number
): Promise<void> => {
  await api.delete(`/products/${productId}/variants/${variantId}`)
}
