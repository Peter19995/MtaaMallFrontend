import api from '@api/config/axios.config'
import {
  ColorCombination,
  ExpertPick,
  InteriorTheme,
  SeatColor,
  StyleRecommendation,
  ThemeRecommendation,
  UploadAnalysisResult
} from '@/types/styling.types'

type CombinationQueryParams = {
  seat_color_id?: number
  seat_color_name?: string
  theme?: string
  limit?: number
}

type RecommendationPayload = {
  seat_color_id?: number
  seat_color_name?: string
  theme_id?: number
  theme_name?: string
}

type SavePreferenceParams = {
  seat_color?: string
  theme?: string
  combination_id?: number
}

export const stylingApi = {
  getSeatColors: async (activeOnly = true): Promise<SeatColor[]> => {
    const response = await api.get<SeatColor[]>('/styling/seat-colors', {
      params: { active_only: activeOnly }
    })
    return response.data
  },

  getCombinations: async (params?: CombinationQueryParams): Promise<ColorCombination[]> => {
    const response = await api.get<ColorCombination[]>('/styling/combinations', { params })
    return response.data
  },

  getCombinationById: async (id: number): Promise<ColorCombination> => {
    const response = await api.get<ColorCombination>(`/styling/combinations/${id}`)
    return response.data
  },

  getThemes: async (activeOnly = true): Promise<InteriorTheme[]> => {
    const response = await api.get<InteriorTheme[]>('/styling/themes', {
      params: { active_only: activeOnly }
    })
    return response.data
  },

  getThemeRecommendations: async (themeId: number): Promise<ThemeRecommendation[]> => {
    const response = await api.get<ThemeRecommendation[]>(`/styling/themes/${themeId}/recommendations`)
    return response.data
  },

  getExpertPicks: async (featuredOnly = false, limit = 10): Promise<ExpertPick[]> => {
    const response = await api.get<ExpertPick[]>('/styling/expert-picks', {
      params: { featured_only: featuredOnly, limit }
    })
    return response.data
  },

  getRecommendations: async (payload: RecommendationPayload): Promise<StyleRecommendation> => {
    const response = await api.post<StyleRecommendation>('/styling/recommendations', payload)
    return response.data
  },

  analyzeUpload: async (imageFile: File): Promise<UploadAnalysisResult> => {
    const reader = new FileReader()

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          if (typeof reader.result !== 'string') {
            throw new Error('Failed to read selected image.')
          }

          const response = await api.post<UploadAnalysisResult>('/styling/analyze-upload', {
            image: reader.result
          })
          resolve(response.data)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read selected image.'))
      reader.readAsDataURL(imageFile)
    })
  },

  savePreference: async (params: SavePreferenceParams): Promise<void> => {
    await api.post('/styling/preferences/save', null, { params })
  }
}
