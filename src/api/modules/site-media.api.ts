import api from '@api/config/axios.config'

export type SiteMediaItem = {
  id: number
  group_name: string
  image_url: string
  alt_text?: string | null
  sort_order: number
  created_at: string
}

export type SiteMediaGroups = {
  heroImages?: SiteMediaItem[]
  serviceFallbackImages?: SiteMediaItem[]
  projectFallbacks?: SiteMediaItem[]
  blogFallbacks?: SiteMediaItem[]
  productFallbacks?: SiteMediaItem[]
  [key: string]: SiteMediaItem[] | undefined
}

export type SiteMediaResponse = {
  groups: SiteMediaGroups
}

export type SiteMediaGroupResponse = {
  group_name: string
  assets: SiteMediaItem[]
}

export const listSiteMediaRequest = async (): Promise<SiteMediaResponse> => {
  const { data } = await api.get<SiteMediaResponse>('/site-media/')
  return data
}

export const listSiteMediaGroupsRequest = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/site-media/groups')
  return data
}

export const getSiteMediaGroupRequest = async (
  groupName: string
): Promise<SiteMediaGroupResponse> => {
  const normalizedGroupName = encodeURIComponent(groupName.trim())
  const { data } = await api.get<SiteMediaGroupResponse>(`/site-media/${normalizedGroupName}`)
  return data
}

export const uploadSiteMediaRequest = async (
  groupName: string,
  files: File[]
): Promise<SiteMediaGroupResponse> => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const normalizedGroupName = encodeURIComponent(groupName.trim())
  const { data } = await api.post<SiteMediaGroupResponse>(
    `/site-media/${normalizedGroupName}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )

  return data
}

export const deleteSiteMediaAssetRequest = async (assetId: number): Promise<void> => {
  await api.delete(`/site-media/assets/${assetId}`)
}
