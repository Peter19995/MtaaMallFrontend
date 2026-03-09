import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  PhotoIcon,
  ShoppingBagIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  HeartIcon,
  ShareIcon,
  DownloadIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  TagIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { listPublicProjectsRequest } from '@api/modules/projects.api'
import { listProductsRequest } from '@api/modules/products.api'
import { listServicesRequest } from '@api/modules/services.api'
import { listPublicBlogsRequest } from '@api/modules/blogs.api'
import { resolveMediaUrl } from '@utils/media'
import { Button } from '@components/common'
import { AppTheme } from '@constants/theme'

type GallerySource = 'projects' | 'products' | 'services' | 'blogs' | 'inspiration'

type GalleryItem = {
  id: string
  source: GallerySource
  imageUrl: string
  title: string
  subtitle?: string
  description?: string
  date?: string | null
  link: string
  tags?: string[]
  likes?: number
  views?: number
}

const fallbackInspiration: GalleryItem[] = [
  {
    id: 'inspiration-1',
    source: 'inspiration',
    imageUrl:
      'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1400&q=80',
    title: 'Modern Living Room Mood',
    subtitle: 'Inspiration board',
    description: 'Contemporary living space with neutral tones and natural light',
    link: '/services',
    tags: ['living room', 'modern', 'neutral'],
    likes: 234,
    views: 1250
  },
  {
    id: 'inspiration-2',
    source: 'inspiration',
    imageUrl:
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
    title: 'Soft Tone Curtain Styling',
    subtitle: 'Inspiration board',
    description: 'Elegant curtain designs with soft, flowing fabrics',
    link: '/projects',
    tags: ['curtains', 'soft tones', 'elegant'],
    likes: 189,
    views: 980
  },
  {
    id: 'inspiration-3',
    source: 'inspiration',
    imageUrl:
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=80',
    title: 'Curated Office Interior',
    subtitle: 'Inspiration board',
    description: 'Modern office space with ergonomic design and natural elements',
    link: '/services',
    tags: ['office', 'workspace', 'modern'],
    likes: 156,
    views: 876
  },
  {
    id: 'inspiration-4',
    source: 'inspiration',
    imageUrl:
      'https://images.unsplash.com/photo-1616594039964-87f5c6d0fb8d?auto=format&fit=crop&w=1200&q=80',
    title: 'Accent Wall and Decor',
    subtitle: 'Inspiration board',
    description: 'Bold accent wall with complementary decor pieces',
    link: '/products',
    tags: ['accent wall', 'decor', 'bold'],
    likes: 210,
    views: 1100
  },
  {
    id: 'inspiration-5',
    source: 'inspiration',
    imageUrl:
      'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=1200&q=80',
    title: 'Project Finishing Details',
    subtitle: 'Inspiration board',
    description: 'Attention to detail in final project touches',
    link: '/projects',
    tags: ['details', 'finishing', 'quality'],
    likes: 145,
    views: 765
  },
]

const sourceConfig: Record<
  GallerySource,
  { label: string; icon: typeof PhotoIcon; className: string; gradient: string }
> = {
  projects: {
    label: 'Projects',
    icon: WrenchScrewdriverIcon,
    className: 'bg-primary/10 text-primary border-primary/20',
    gradient: 'from-primary/20 to-primary/5',
  },
  products: {
    label: 'Products',
    icon: ShoppingBagIcon,
    className: 'bg-secondary/10 text-secondary-dark border-secondary/20',
    gradient: 'from-secondary/20 to-secondary/5',
  },
  services: {
    label: 'Services',
    icon: SparklesIcon,
    className: 'bg-success/10 text-success border-success/20',
    gradient: 'from-success/20 to-success/5',
  },
  blogs: {
    label: 'Blogs',
    icon: NewspaperIcon,
    className: 'bg-accent/15 text-accent-dark border-accent/20',
    gradient: 'from-accent/20 to-accent/5',
  },
  inspiration: {
    label: 'Inspiration',
    icon: PhotoIcon,
    className: 'bg-warning/10 text-warning-dark border-warning/20',
    gradient: 'from-warning/20 to-warning/5',
  },
}

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-KE', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateValue))
}

const humanize = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
}

const GalleryPage = () => {
  const [sourceFilter, setSourceFilter] = useState<GallerySource | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry')
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const projectsQuery = useQuery({
    queryKey: ['gallery', 'projects'],
    queryFn: () => listPublicProjectsRequest({ skip: 0, limit: 120 }),
  })

  const productsQuery = useQuery({
    queryKey: ['gallery', 'products'],
    queryFn: () => listProductsRequest({ skip: 0, limit: 120 }),
  })

  const servicesQuery = useQuery({
    queryKey: ['gallery', 'services'],
    queryFn: () => listServicesRequest({ skip: 0, limit: 120, is_active: true }),
  })

  const blogsQuery = useQuery({
    queryKey: ['gallery', 'blogs'],
    queryFn: () => listPublicBlogsRequest({ skip: 0, limit: 120 }),
  })

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const projectImages =
      projectsQuery.data?.flatMap((project, index) =>
        (project.image_urls ?? []).flatMap((rawUrl, imageIndex) => {
          const imageUrl = resolveMediaUrl(rawUrl)
          if (!imageUrl) return []
          return [
            {
              id: `project-${index}-${imageIndex}`,
              source: 'projects' as const,
              imageUrl,
              title: project.project_title,
              subtitle: humanize(project.project_type),
              description: project.description,
              date: project.start_date ?? project.expected_end_date,
              link: '/projects',
              tags: ['project', project.project_type],
              likes: Math.floor(Math.random() * 200) + 50,
              views: Math.floor(Math.random() * 1000) + 200,
            },
          ]
        })
      ) ?? []

    const productImages =
      productsQuery.data?.flatMap((product) =>
        (product.image_urls ?? []).flatMap((rawUrl, imageIndex) => {
          const imageUrl = resolveMediaUrl(rawUrl)
          if (!imageUrl) return []
          return [
            {
              id: `product-${product.id}-${imageIndex}`,
              source: 'products' as const,
              imageUrl,
              title: product.name,
              subtitle: product.category_name ?? 'Product',
              description: product.description,
              date: product.created_at,
              link: '/products',
              tags: ['product', product.category_name],
              likes: Math.floor(Math.random() * 150) + 30,
              views: Math.floor(Math.random() * 800) + 100,
            },
          ]
        })
      ) ?? []

    const serviceImages =
      servicesQuery.data?.flatMap((service) =>
        (service.image_urls ?? []).flatMap((rawUrl, imageIndex) => {
          const imageUrl = resolveMediaUrl(rawUrl)
          if (!imageUrl) return []
          return [
            {
              id: `service-${service.id}-${imageIndex}`,
              source: 'services' as const,
              imageUrl,
              title: service.name,
              subtitle: service.category_name ?? 'Service',
              description: service.description,
              date: service.updated_at ?? service.created_at,
              link: '/services',
              tags: ['service', service.category_name],
              likes: Math.floor(Math.random() * 100) + 20,
              views: Math.floor(Math.random() * 500) + 50,
            },
          ]
        })
      ) ?? []

    const blogImages =
      blogsQuery.data?.flatMap((blog) =>
        (blog.image_urls ?? []).flatMap((rawUrl, imageIndex) => {
          const imageUrl = resolveMediaUrl(rawUrl)
          if (!imageUrl) return []
          return [
            {
              id: `blog-${blog.id}-${imageIndex}`,
              source: 'blogs' as const,
              imageUrl,
              title: blog.title,
              subtitle: blog.category_name ?? 'Blog',
              description: blog.excerpt,
              date: blog.publish_date ?? blog.created_at,
              link: blog.slug ? `/blog/${blog.slug}` : '/blog',
              tags: ['blog', blog.category_name],
              likes: Math.floor(Math.random() * 80) + 10,
              views: Math.floor(Math.random() * 300) + 30,
            },
          ]
        })
      ) ?? []

    const all = [...projectImages, ...productImages, ...serviceImages, ...blogImages]
    if (all.length === 0) {
      return fallbackInspiration
    }
    return all.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
  }, [blogsQuery.data, productsQuery.data, projectsQuery.data, servicesQuery.data])

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    galleryItems.forEach(item => {
      item.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  }, [galleryItems])

  const sourceCounts = useMemo(
    () =>
      galleryItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.source] = (acc[item.source] ?? 0) + 1
        return acc
      }, {}),
    [galleryItems]
  )

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return galleryItems.filter((item) => {
      const sourceMatches = sourceFilter === 'all' ? true : item.source === sourceFilter
      if (!sourceMatches) return false
      
      // Search filter
      if (query) {
        const text = `${item.title} ${item.subtitle ?? ''} ${item.description ?? ''} ${sourceConfig[item.source].label}`.toLowerCase()
        if (!text.includes(query)) return false
      }
      
      // Tag filter
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some(tag => item.tags?.includes(tag))
        if (!hasTag) return false
      }
      
      return true
    })
  }, [galleryItems, search, sourceFilter, selectedTags])

  const selectedIndex = useMemo(
    () => filteredItems.findIndex((item) => item.id === selectedId),
    [filteredItems, selectedId]
  )

  const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null

  const isLoading =
    projectsQuery.isLoading || productsQuery.isLoading || servicesQuery.isLoading || blogsQuery.isLoading

  const hasError =
    projectsQuery.isError && productsQuery.isError && servicesQuery.isError && blogsQuery.isError

  const openNext = () => {
    if (!selectedItem || filteredItems.length < 2) return
    const next = (selectedIndex + 1) % filteredItems.length
    setSelectedId(filteredItems[next].id)
  }

  const openPrevious = () => {
    if (!selectedItem || filteredItems.length < 2) return
    const previous = (selectedIndex - 1 + filteredItems.length) % filteredItems.length
    setSelectedId(filteredItems[previous].id)
  }

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLikedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <PhotoIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Visual Showcase
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-4">
              Our Visual{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Gallery
              </span>
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              A curated stream of visuals from projects, products, services, and blogs so clients
              can quickly understand our design style and execution quality.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-border p-6 shadow-lg"
          >
            <p className="text-xs text-text-tertiary mb-1">Total Images</p>
            <p className="text-3xl font-bold text-primary">{galleryItems.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-border p-6 shadow-lg"
          >
            <p className="text-xs text-text-tertiary mb-1">Project Shots</p>
            <p className="text-3xl font-bold text-secondary">{sourceCounts.projects ?? 0}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-border p-6 shadow-lg"
          >
            <p className="text-xs text-text-tertiary mb-1">Collections</p>
            <p className="text-3xl font-bold text-accent">{Object.keys(sourceCounts).length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-border p-6 shadow-lg"
          >
            <p className="text-xs text-text-tertiary mb-1">Total Views</p>
            <p className="text-3xl font-bold text-success">
              {galleryItems.reduce((sum, item) => sum + (item.views || 0), 0).toLocaleString()}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filter Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-xl border border-border p-4 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative group">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, type, or source..."
                className="w-full h-12 pl-12 pr-4 bg-background border-2 border-border rounded-xl 
                         focus:border-primary focus:outline-none focus:ring-4 
                         focus:ring-primary/20 transition-all text-text"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-text-tertiary" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background rounded-lg border border-border p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                  }`}
                  title="Grid View"
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'masonry' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                  }`}
                  title="Masonry View"
                >
                  <ViewColumnsIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                  showFilters 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Filters</span>
              </button>
            </div>
          </div>

          {/* Source Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setSourceFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sourceFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <PhotoIcon className="w-4 h-4" />
              All ({galleryItems.length})
            </button>
            {(
              ['projects', 'products', 'services', 'blogs', 'inspiration'] as Array<GallerySource>
            ).map((source) => {
              const Icon = sourceConfig[source].icon
              return (
                <button
                  key={source}
                  onClick={() => setSourceFilter(source)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    sourceFilter === source
                      ? sourceConfig[source].className
                      : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {sourceConfig[source].label} ({sourceCounts[source] ?? 0})
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-hidden mt-4"
          >
            <div className="bg-white rounded-xl border border-border p-6 shadow-lg">
              <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-primary" />
                Filter by Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Gallery Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {hasError ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-error/20 bg-error/5 p-8 text-center"
          >
            <PhotoIcon className="w-16 h-16 mx-auto text-error/30 mb-4" />
            <h3 className="text-lg font-semibold text-error-dark mb-2">Unable to Load Gallery</h3>
            <p className="text-error/80">Could not load gallery images from the server right now.</p>
          </motion.div>
        ) : isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'columns-1 sm:columns-2 xl:columns-3 gap-4'}>
            {new Array(9).fill(null).map((_, index) => (
              <div key={`gallery-skeleton-${index}`} className="mb-4 break-inside-avoid">
                <div className="h-64 rounded-2xl bg-gradient-to-r from-background via-primary/5 to-background skeleton" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-white p-12 text-center"
          >
            <PhotoIcon className="w-16 h-16 mx-auto text-text-tertiary/30 mb-4" />
            <h2 className="text-xl font-semibold text-text mb-2">No images match this filter</h2>
            <p className="text-text-secondary mb-4">Try another source filter or clear the search phrase.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('')
                setSourceFilter('all')
                setSelectedTags([])
              }}
            >
              Clear All Filters
            </Button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredItems.map((item, index) => {
              const source = sourceConfig[item.source]
              const Icon = source.icon
              const isLiked = likedItems.has(item.id)

              return (
                <motion.article
                  key={item.id}
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Like Button */}
                    <button
                      onClick={(e) => toggleLike(item.id, e)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all z-10"
                    >
                      {isLiked ? (
                        <HeartIconSolid className="w-4 h-4 text-error" />
                      ) : (
                        <HeartIcon className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>

                    {/* Source Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${source.className}`}>
                        <Icon className="w-3 h-3" />
                        {source.label}
                      </span>
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-sm text-white/80 mt-1">{item.subtitle}</p>
                      )}
                      
                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                        {item.likes && (
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-3 h-3" />
                            {item.likes}
                          </span>
                        )}
                        {item.views && (
                          <span className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            {item.views}
                          </span>
                        )}
                        {item.date && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {formatDate(item.date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Info (visible when not hovered) */}
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-text line-clamp-1">{item.title}</p>
                    <p className="text-xs text-text-tertiary mt-1">{item.subtitle || source.label}</p>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        ) : (
          // Masonry Layout
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-6">
            {filteredItems.map((item, index) => {
              const source = sourceConfig[item.source]
              const Icon = source.icon
              const isLiked = likedItems.has(item.id)

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.4, delay: index * 0.02 }}
                  className="group relative mb-6 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-white shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="relative">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Like Button */}
                    <button
                      onClick={(e) => toggleLike(item.id, e)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      {isLiked ? (
                        <HeartIconSolid className="w-4 h-4 text-error" />
                      ) : (
                        <HeartIcon className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>

                    {/* Source Badge */}
                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${source.className}`}>
                        <Icon className="w-3 h-3" />
                        {source.label}
                      </span>
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-sm text-white/80 mt-1">{item.subtitle}</p>
                      )}
                      
                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                        {item.likes && (
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-3 h-3" />
                            {item.likes}
                          </span>
                        )}
                        {item.views && (
                          <span className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            {item.views}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </section>

      {/* Results Summary */}
      {!isLoading && !hasError && filteredItems.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between text-sm text-text-tertiary">
            <span className="flex items-center gap-2">
              <PhotoIcon className="w-4 h-4" />
              Showing {filteredItems.length} image{filteredItems.length === 1 ? '' : 's'}
            </span>
            <span>
              Page 1 of {Math.ceil(filteredItems.length / 12)}
            </span>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 mb-16">
        <div className="bg-gradient-to-r from-primary/10 via-white to-secondary/10 rounded-3xl border border-border p-8 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-text mb-2">Like what you see?</h2>
              <p className="text-text-secondary">
                Explore the full project pipeline or request services based on this gallery style.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/projects">
                <Button size="lg" rightIcon={<ArrowRightIcon className="w-4 h-4" />}>
                  View Projects
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" size="lg">
                  Explore Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full max-h-[80vh] object-contain"
                />

                {/* Image Info Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${sourceConfig[selectedItem.source].className}`}
                        >
                          {sourceConfig[selectedItem.source].label}
                        </span>
                        {selectedItem.tags?.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-xs text-white/90"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-2xl font-bold text-white">{selectedItem.title}</h3>
                      <p className="text-white/80 mt-1">{selectedItem.subtitle}</p>
                      {selectedItem.description && (
                        <p className="text-white/60 text-sm mt-2 max-w-2xl">
                          {selectedItem.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
                        {selectedItem.likes && (
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-4 h-4" />
                            {selectedItem.likes} likes
                          </span>
                        )}
                        {selectedItem.views && (
                          <span className="flex items-center gap-1">
                            <EyeIcon className="w-4 h-4" />
                            {selectedItem.views} views
                          </span>
                        )}
                        {selectedItem.date && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(selectedItem.date)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Link
                      to={selectedItem.link}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 border border-white/30"
                    >
                      View Source
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="absolute top-4 right-4 rounded-full bg-black/50 backdrop-blur-sm p-3 text-white hover:bg-black/70 transition-colors border border-white/30"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>

                {/* Navigation Buttons */}
                {filteredItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={openPrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 backdrop-blur-sm p-3 text-white hover:bg-black/70 transition-colors border border-white/30"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={openNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 backdrop-blur-sm p-3 text-white hover:bg-black/70 transition-colors border border-white/30"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>

                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm border border-white/30">
                      {selectedIndex + 1} / {filteredItems.length}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GalleryPage