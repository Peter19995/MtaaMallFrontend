export interface SeatColor {
  id: number
  name: string
  hex_code: string
  display_order: number
  is_active: boolean
  image_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ColorRecommendationItem {
  color: string
  type?: string
  style?: string
  finish?: string
  pattern?: string
  image_url?: string
  product_id?: number
}

export interface ColorCombination {
  id: number
  seat_color_id: number
  name: string
  curtain_recommendations: ColorRecommendationItem[]
  pillow_recommendations: ColorRecommendationItem[]
  paint_recommendations: ColorRecommendationItem[]
  carpet_recommendations?: ColorRecommendationItem[] | null
  themes: string[]
  visualization_url?: string | null
  popularity_score: number
  product_ids?: number[]
  seat_color?: SeatColor | null
  created_at?: string | null
  updated_at?: string | null
}

export interface InteriorTheme {
  id: number
  name: string
  description?: string | null
  image_url?: string | null
  is_active: boolean
  primary_colors: string[]
  accent_colors: string[]
  style_keywords: string[]
  created_at?: string | null
  updated_at?: string | null
}

export interface ThemeRecommendation {
  id: number
  theme_id: number
  name: string
  curtain_recommendations: Array<Record<string, unknown>>
  pillow_recommendations: Array<Record<string, unknown>>
  paint_recommendations: Array<Record<string, unknown>>
  carpet_recommendations?: Array<Record<string, unknown>> | null
  product_ids: number[]
  theme?: InteriorTheme | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ExpertPick {
  id: number
  title: string
  description?: string | null
  seat_color_id?: number | null
  theme_id?: number | null
  curtain_recommendations: ColorRecommendationItem[]
  pillow_recommendations: ColorRecommendationItem[]
  paint_recommendations: ColorRecommendationItem[]
  carpet_recommendations?: ColorRecommendationItem[] | null
  image_url?: string | null
  shop_products?: Array<Record<string, unknown>>
  is_featured: boolean
  created_at: string
  updated_at?: string | null
  seat_color?: SeatColor | null
  theme?: InteriorTheme | null
}

export interface StyleRecommendation {
  combinations: ColorCombination[]
  expert_picks: ExpertPick[]
  theme_recommendations?: ThemeRecommendation[]
}

export interface UploadAnalysisResult {
  detected_colors: string[]
  recommendations: Array<Record<string, unknown>>
  similar_combinations: ColorCombination[]
}
