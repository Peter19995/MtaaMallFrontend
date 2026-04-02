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

export type ProductImageRecord = {
  id: number
  image_url?: string | null
  file_url?: string | null
  file_path?: string | null
  url?: string | null
  alt_text?: string | null
}

export type ProductResponse = {
  id: number
  sku: string
  name: string
  description?: string | null
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
  branch_id?: number | null
  branch_name?: string | null
  created_at: string
}

export type ProductCreate = {
  sku: string
  name: string
  description?: string
  category_id?: number
  stock_quantity?: number
  reorder_level?: number
  is_active?: boolean
  selling_price?: number
  is_on_offer?: boolean
  max_offer?: number
}

export type ProductUpdate = {
  name?: string
  description?: string
  category_id?: number
  stock_quantity?: number
  reorder_level?: number
  is_active?: boolean
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

export type InStockProductsScope = 'all' | 'branch'

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

export const listCategoriesRequest = async (): Promise<ProductCategoryResponse[]> => {
  const { data } = await api.get<ProductCategoryResponse[]>('/products/categories/list')
  return data
}

export const createCategoryRequest = async (
  payload: ProductCategoryCreate
): Promise<ProductCategoryResponse> => {
  const { data } = await api.post<ProductCategoryResponse>('/products/categories', payload)
  return data
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

export const createProductRequest = async (payload: ProductCreate): Promise<ProductResponse> => {
  const { data } = await api.post<ProductResponse>('/products/', payload)
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
