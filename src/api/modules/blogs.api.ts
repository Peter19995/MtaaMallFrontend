import api from '@api/config/axios.config'

export type BlogCategoryResponse = {
  id: number
  name: string
  slug?: string | null
  description?: string | null
  is_active?: boolean
}

export type BlogSummaryResponse = {
  id: number
  title: string
  slug: string
  excerpt?: string | null
  category_id?: number | null
  category_name?: string | null
  author_name?: string | null
  status: 'draft' | 'published' | 'archived'
  is_featured: boolean
  publish_date?: string | null
  branch_id?: number | null
  image_urls?: string[]
  created_at?: string | null
}

export type BlogResponse = {
  id: number
  title: string
  slug: string
  excerpt?: string | null
  content: string
  category_id?: number | null
  category_name?: string | null
  author_id: number
  author_name?: string | null
  status: 'draft' | 'published' | 'archived'
  is_featured: boolean
  meta_title?: string | null
  meta_description?: string | null
  publish_date?: string | null
  branch_id?: number | null
  image_urls?: string[]
  created_at?: string | null
  updated_at?: string | null
}

export type BlogCommentResponse = {
  id: number
  blog_id: number
  user_id: number
  user_name?: string | null
  content: string
  status: 'pending' | 'approved' | 'rejected' | 'spam'
  created_at?: string | null
}

export type PublicBlogListParams = {
  skip?: number
  limit?: number
  search?: string
  category_id?: number
  is_featured?: boolean
  branch_id?: number
}

export type PublicBlogCommentsParams = {
  skip?: number
  limit?: number
}

export const listPublicBlogCategoriesRequest = async (): Promise<BlogCategoryResponse[]> => {
  const { data } = await api.get<BlogCategoryResponse[]>('/blogs/categories', {
    params: { active_only: true }
  })
  return data
}

export const listPublicBlogsRequest = async (
  params?: PublicBlogListParams
): Promise<BlogSummaryResponse[]> => {
  const { data } = await api.get<BlogSummaryResponse[]>('/blogs/public', { params })
  return data
}

export const getPublicBlogRequest = async (slug: string): Promise<BlogResponse> => {
  const { data } = await api.get<BlogResponse>(`/blogs/public/${slug}`)
  return data
}

export const listPublicBlogCommentsRequest = async (
  blogId: number,
  params?: PublicBlogCommentsParams
): Promise<BlogCommentResponse[]> => {
  const { data } = await api.get<BlogCommentResponse[]>(`/blogs/public/${blogId}/comments`, { params })
  return data
}
