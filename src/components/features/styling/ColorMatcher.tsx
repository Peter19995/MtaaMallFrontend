import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  CameraIcon,
  SwatchIcon,
  PaintBrushIcon,
  ShoppingBagIcon,
  HeartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { stylingApi } from '@api/modules/styling.api'
import { Button } from '@components/common'
import { AppTheme } from '@constants/theme'
import type { ColorCombination } from '@/types/styling.types'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const getReadableTextColor = (hexColor: string): string => {
  const normalized = hexColor.replace('#', '')
  if (normalized.length !== 6) {
    return '#1e2b32'
  }

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.6 ? '#1e2b32' : '#ffffff'
}

const handleShopThisLook = (combination: ColorCombination) => {
  const productIds = [
    ...combination.curtain_recommendations
      .map((item) => item.product_id)
      .filter((value): value is number => typeof value === 'number'),
    ...combination.pillow_recommendations
      .map((item) => item.product_id)
      .filter((value): value is number => typeof value === 'number'),
    ...combination.paint_recommendations
      .map((item) => item.product_id)
      .filter((value): value is number => typeof value === 'number')
  ]

  if (productIds.length === 0) {
    toast.success('Look saved. Product mapping is still being configured.')
    return
  }

  toast.success(`Added ${productIds.length} mapped product(s) to your shopping list.`)
}

export const ColorMatcher = () => {
  const [selectedStep, setSelectedStep] = useState<'color' | 'theme' | 'upload'>('color')
  const [selectedSeatColor, setSelectedSeatColor] = useState<number | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [savedCombinations, setSavedCombinations] = useState<number[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { data: seatColors, isLoading: seatColorsLoading } = useQuery({
    queryKey: ['styling', 'seat-colors'],
    queryFn: () => stylingApi.getSeatColors()
  })

  const { data: themes, isLoading: themesLoading } = useQuery({
    queryKey: ['styling', 'themes'],
    queryFn: () => stylingApi.getThemes()
  })

  const { data: expertPicks, isLoading: expertPicksLoading } = useQuery({
    queryKey: ['styling', 'expert-picks', 'featured'],
    queryFn: () => stylingApi.getExpertPicks(true, 6)
  })

  const { data: recommendations } = useQuery({
    queryKey: ['styling', 'recommendations', selectedSeatColor, selectedTheme],
    queryFn: () =>
      stylingApi.getRecommendations({
        seat_color_id: selectedSeatColor ?? undefined,
        theme_id: selectedTheme ?? undefined
      }),
    enabled: Boolean(selectedSeatColor || selectedTheme)
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => stylingApi.analyzeUpload(file),
    onSuccess: () => {
      toast.success('Image analyzed successfully.', {
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.successLight,
          color: AppTheme.colors.successDark
        }
      })
    },
    onError: () => {
      toast.error('Failed to analyze image. Please try again.')
    }
  })

  const savePreferenceMutation = useMutation({
    mutationFn: (data: { seat_color?: string; theme?: string; combination_id?: number }) =>
      stylingApi.savePreference(data),
    onError: () => {
      toast.error('Unable to save preference right now.')
    }
  })

  const displayedCombinations = useMemo(() => {
    if ((recommendations?.combinations ?? []).length > 0) {
      return recommendations?.combinations ?? []
    }

    return uploadMutation.data?.similar_combinations ?? []
  }, [recommendations?.combinations, uploadMutation.data?.similar_combinations])

  const handleSeatColorSelect = (colorId: number, colorName: string) => {
    setSelectedSeatColor(colorId)
    setSelectedTheme(null)
    savePreferenceMutation.mutate({ seat_color: colorName })
  }

  const handleThemeSelect = (themeId: number, themeName: string) => {
    setSelectedTheme(themeId)
    setSelectedSeatColor(null)
    savePreferenceMutation.mutate({ theme: themeName })
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploadFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setUploadedImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
    uploadMutation.mutate(file)
  }

  const toggleSaveCombination = (combinationId: number) => {
    setSavedCombinations((previous) =>
      previous.includes(combinationId)
        ? previous.filter((id) => id !== combinationId)
        : [...previous, combinationId]
    )

    savePreferenceMutation.mutate({ combination_id: combinationId })
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-background via-white to-background p-6">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <SparklesIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Interior Styling Assistant
          </span>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-text md:text-3xl">
          Find Your Perfect{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Color Match
          </span>
        </h2>
        <p className="mx-auto max-w-2xl text-text-secondary">
          Choose your seat color, select a theme, or upload a photo to get personalized interior
          recommendations.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setSelectedStep('color')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
            selectedStep === 'color'
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <SwatchIcon className="h-4 w-4" />
          <span>Choose Color</span>
        </button>
        <button
          onClick={() => setSelectedStep('theme')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
            selectedStep === 'theme'
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <PaintBrushIcon className="h-4 w-4" />
          <span>Select Theme</span>
        </button>
        <button
          onClick={() => setSelectedStep('upload')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
            selectedStep === 'upload'
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <CameraIcon className="h-4 w-4" />
          <span>Upload Photo</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {selectedStep === 'color' && (
          <motion.div
            key="color"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h3 className="mb-4 text-lg font-semibold text-text">Select Your Seat Color</h3>

            {seatColorsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl bg-gradient-to-r from-background via-primary/5 to-background"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(seatColors ?? []).map((color) => (
                  <motion.button
                    key={color.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSeatColorSelect(color.id, color.name)}
                    className={`relative overflow-hidden rounded-xl border-2 p-4 transition-all ${
                      selectedSeatColor === color.id
                        ? 'border-primary shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: color.hex_code }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: getReadableTextColor(color.hex_code) }}
                    >
                      {color.name}
                    </span>
                    {selectedSeatColor === color.id && (
                      <div className="absolute right-2 top-2 h-3 w-3 animate-pulse rounded-full bg-primary" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {selectedStep === 'theme' && (
          <motion.div
            key="theme"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h3 className="mb-4 text-lg font-semibold text-text">Select Your Style Theme</h3>

            {themesLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-xl bg-gradient-to-r from-background via-primary/5 to-background"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(themes ?? []).map((theme) => (
                  <motion.button
                    key={theme.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleThemeSelect(theme.id, theme.name)}
                    className={`relative overflow-hidden rounded-xl border-2 p-6 text-left transition-all ${
                      selectedTheme === theme.id
                        ? 'border-primary bg-gradient-to-r from-primary/5 to-secondary/5 shadow-lg'
                        : 'border-border bg-white hover:border-primary/50'
                    }`}
                  >
                    <h4 className="mb-2 text-lg font-semibold text-text">{theme.name}</h4>
                    <p className="line-clamp-2 text-sm text-text-secondary">{theme.description}</p>
                    <div className="mt-3 flex gap-2">
                      {theme.primary_colors.slice(0, 3).map((color) => (
                        <div
                          key={`${theme.id}-${color}`}
                          className="h-6 w-6 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {selectedStep === 'upload' && (
          <motion.div
            key="upload"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <div
              className={`relative rounded-xl border-2 border-dashed p-8 transition-all ${
                uploadedImage
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {uploadedImage ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null)
                      setUploadFile(null)
                    }}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-1 text-text-secondary hover:text-error"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <img
                    src={uploadedImage}
                    alt="Uploaded sofa"
                    className="mx-auto max-h-64 rounded-lg object-contain"
                  />
                  <div className="flex justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Different
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (uploadFile) {
                          uploadMutation.mutate(uploadFile)
                        }
                      }}
                      loading={uploadMutation.isPending}
                    >
                      Analyze Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <CameraIcon className="mx-auto h-16 w-16 text-primary/50" />
                  <div>
                    <p className="mb-2 text-lg font-semibold text-text">Upload a photo of your sofa</p>
                    <p className="mb-4 text-sm text-text-secondary">
                      We will analyze the colors and suggest matching curtains, pillows, and paint.
                    </p>
                  </div>
                  <Button type="button" onClick={() => fileInputRef.current?.click()}>
                    Choose Photo
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {uploadMutation.data && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-border bg-background p-4"
              >
                <h4 className="mb-2 text-sm font-semibold text-text">Detected Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {uploadMutation.data.detected_colors.map((color) => (
                    <span
                      key={color}
                      className="rounded-full border border-border bg-white px-3 py-1 text-xs"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {(selectedSeatColor || selectedTheme || uploadMutation.data) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
            <SparklesIcon className="h-5 w-5 text-primary" />
            Perfect Matches for You
          </h3>

          {displayedCombinations.length === 0 && (
            <div className="rounded-xl border border-border bg-white p-6 text-sm text-text-secondary">
              No combinations found for this selection yet.
            </div>
          )}

          {displayedCombinations.map((combo) => (
            <motion.div
              key={combo.id}
              variants={fadeInUp}
              className="mb-6 overflow-hidden rounded-xl border border-border bg-white"
            >
              <div className="border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-text">{combo.name}</h4>
                    <p className="text-xs text-text-tertiary">Popularity: {combo.popularity_score}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaveCombination(combo.id)}
                    className="rounded-full p-2 transition-colors hover:bg-background"
                    aria-label="Save combination"
                  >
                    {savedCombinations.includes(combo.id) ? (
                      <HeartIconSolid className="h-5 w-5 text-error" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-text-tertiary" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h5 className="mb-2 text-sm font-medium text-text">Curtains</h5>
                  <div className="flex flex-wrap gap-2">
                    {combo.curtain_recommendations.map((item, index) => (
                      <span
                        key={`${combo.id}-curtain-${index}-${item.color}`}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        {item.color} {item.type ? `(${item.type})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="mb-2 text-sm font-medium text-text">Throw Pillows</h5>
                  <div className="flex flex-wrap gap-2">
                    {combo.pillow_recommendations.map((item, index) => (
                      <span
                        key={`${combo.id}-pillow-${index}-${item.color}`}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        {item.color} {item.style ? `(${item.style})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="mb-2 text-sm font-medium text-text">Paint</h5>
                  <div className="flex flex-wrap gap-2">
                    {combo.paint_recommendations.map((item, index) => (
                      <span
                        key={`${combo.id}-paint-${index}-${item.color}`}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        {item.color} {item.finish ? `(${item.finish})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="button" size="sm" onClick={() => handleShopThisLook(combo)}>
                    <ShoppingBagIcon className="h-4 w-4" />
                    Shop This Look
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mt-12"
      >
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <SparklesIcon className="h-5 w-5 text-primary" />
          MtaaMall&apos;s Expert Picks
        </h3>

        {expertPicksLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl bg-gradient-to-r from-background via-primary/5 to-background"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(expertPicks ?? []).map((pick) => (
              <motion.div
                key={pick.id}
                variants={fadeInUp}
                className="overflow-hidden rounded-xl border border-border bg-white transition-all hover:shadow-lg"
              >
                {pick.image_url && (
                  <img src={pick.image_url} alt={pick.title} className="h-48 w-full object-cover" />
                )}
                <div className="p-4">
                  <h4 className="mb-2 font-semibold text-text">{pick.title}</h4>
                  <p className="mb-3 text-sm text-text-secondary">{pick.description}</p>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-text">Curtains:</span>{' '}
                      {pick.curtain_recommendations.map((item) => item.color).join(', ')}
                    </p>
                    <p>
                      <span className="font-medium text-text">Pillows:</span>{' '}
                      {pick.pillow_recommendations.map((item) => item.color).join(', ')}
                    </p>
                    <p>
                      <span className="font-medium text-text">Paint:</span>{' '}
                      {pick.paint_recommendations.map((item) => item.color).join(', ')}
                    </p>
                  </div>

                  <Button type="button" size="sm" fullWidth className="mt-4">
                    Shop This Look
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ColorMatcher
