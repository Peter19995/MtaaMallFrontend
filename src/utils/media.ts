const getMediaBaseUrl = (): string => {
  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

  if (!rawApiUrl) {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(rawApiUrl, base)
    const normalizedPath = parsed.pathname.replace(/\/+$/, '')
    const mediaPath = normalizedPath.replace(/\/api\/v\d+$/, '')
    return `${parsed.origin}${mediaPath}`.replace(/\/+$/, '')
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
}

export const resolveMediaUrl = (value?: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized
  if (normalized.startsWith('//')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:'
    return `${protocol}${normalized}`
  }

  const baseUrl = getMediaBaseUrl()
  if (!baseUrl) return normalized
  return `${baseUrl}${normalized.startsWith('/') ? normalized : `/${normalized}`}`
}

export const resolveMediaUrls = (values?: Array<unknown>): string[] =>
  (values ?? [])
    .map((item) => resolveMediaUrl(item))
    .filter((item): item is string => Boolean(item))
