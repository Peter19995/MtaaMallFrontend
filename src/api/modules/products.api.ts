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
  is_on_offer?: boolean
  max_offer?: number
  image_urls?: string[]
}

export type ProductUpdate = {
  name?: string
  description?: string
  category_id?: number
  stock_quantity?: number
  reorder_level?: number
  is_active?: boolean
  is_on_offer?: boolean
  max_offer?: number
  image_urls?: string[]
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

const buildProductFormData = (payload: ProductCreate | ProductUpdate, images: File[]): FormData => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, String(item)))
      return
    }
    formData.append(key, String(value))
  })
  images.forEach((image) => {
    formData.append('images', image)
  })
  return formData
}

export const createProductRequest = async (
  payload: ProductCreate,
  images: File[] = []
): Promise<ProductResponse> => {
  const requestBody = images.length > 0 ? buildProductFormData(payload, images) : payload
  const { data } = await api.post<ProductResponse>('/products/', requestBody)
  return data
}

export const updateProductRequest = async (
  productId: number,
  payload: ProductUpdate,
  images: File[] = []
): Promise<ProductResponse> => {
  const requestBody = images.length > 0 ? buildProductFormData(payload, images) : payload
  const { data } = await api.put<ProductResponse>(`/products/${productId}`, requestBody)
  return data
}

export const deleteProductRequest = async (productId: number): Promise<void> => {
  await api.delete(`/products/${productId}`)
}
