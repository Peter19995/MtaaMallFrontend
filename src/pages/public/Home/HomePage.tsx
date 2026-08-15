import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  HomeModernIcon,
  NewspaperIcon,
  PaintBrushIcon,
  PhotoIcon,
  SparklesIcon,
  SwatchIcon,
  WrenchScrewdriverIcon,
  StarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  HeartIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { Button } from '@components/common'
import { listProductsRequest, type ProductResponse } from '@api/modules/products.api'
import { listServicesRequest, type ServiceOfferingResponse } from '@api/modules/services.api'
import { listPublicProjectsRequest, type PublicProjectResponse } from '@api/modules/projects.api'
import { listPublicBlogsRequest, type BlogSummaryResponse } from '@api/modules/blogs.api'
import { listSiteMediaRequest, type SiteMediaItem } from '@api/modules/site-media.api'
import { resolveMediaUrl } from '@utils/media'
import { AppTheme } from '@constants/theme'
import staticHeroImage1 from '../../../assets/images/staticHeroImages/1.jpg'
import staticHeroImage2 from '../../../assets/images/staticHeroImages/2.jpg'
import staticHeroImage3 from '../../../assets/images/staticHeroImages/3.jpg'

const staticHeroImages = [
  staticHeroImage1,
  staticHeroImage2,
  staticHeroImage3,
]

const staticServiceFallbacks = [
  'https://images.unsplash.com/photo-1618221381711-42ca8ab6e908?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600585153490-76fb20a32601?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=900&q=80',
]

const staticProjectFallbacks = [
  'https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=1200&q=80',
]

const staticBlogFallbacks = [
  'https://images.unsplash.com/photo-1615529162924-f86053884682?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=900&q=80',
]

const staticProductFallbacks = [
  'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1616593969747-4797dc75033e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1616628182509-6c4e9d1f3076?auto=format&fit=crop&w=900&q=80',
]

const toSortedMediaUrls = (items?: SiteMediaItem[]): string[] =>
  [...(items ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => resolveMediaUrl(item.image_url) ?? item.image_url)
    .filter(Boolean)

const processSteps = [
  {
    title: 'Discovery & Concept',
    description: 'Site visit, measurements, mood boards, and a practical style direction.',
    icon: PaintBrushIcon,
    color: 'from-blue-400 to-cyan-400'
  },
  {
    title: 'Design & Planning',
    description: 'Detailed materials list, budget alignment, and timeline confirmation.',
    icon: SwatchIcon,
    color: 'from-purple-400 to-pink-400'
  },
  {
    title: 'Execution',
    description: 'Professional installation, wall finishes, and fit-out quality checks.',
    icon: WrenchScrewdriverIcon,
    color: 'from-orange-400 to-red-400'
  },
  {
    title: 'Handover',
    description: 'Final styling, snag fixes, and post-project support for confidence.',
    icon: CheckBadgeIcon,
    color: 'from-green-400 to-emerald-400'
  },
]

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Homeowner',
    content: 'MtaaMall transformed our living space beyond our expectations. The attention to detail and professional service was outstanding.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1494790108777-385d3001d8e7?auto=format&fit=crop&w=200&q=80'
  },
  {
    name: 'Michael Omondi',
    role: 'Office Manager',
    content: 'The team delivered our office renovation on time and within budget. Our staff loves the new workspace design.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  },
  {
    name: 'Emily Wanjiku',
    role: 'Property Developer',
    content: 'Working with MtaaMall on multiple projects has been a pleasure. Consistent quality and reliable execution.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80'
  }
]

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateValue))
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)

const toDisplayLabel = (value: string): string =>
  value
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

const statusPillClass = (status: string): string => {
  const normalized = status.toLowerCase()
  if (normalized === 'completed' || normalized === 'approved') {
    return 'bg-success/10 text-success border-success/20'
  }
  if (normalized === 'in_progress') {
    return 'bg-primary/10 text-primary border-primary/20'
  }
  if (normalized === 'quoted') {
    return 'bg-secondary/10 text-secondary-dark border-secondary/20'
  }
  return 'bg-warning/10 text-warning-dark border-warning/20'
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
}

const HomePage = () => {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])

  const servicesQuery = useQuery({
    queryKey: ['home', 'services'],
    queryFn: () => listServicesRequest({ limit: 200 }),
  })

  const projectsQuery = useQuery({
    queryKey: ['home', 'projects'],
    queryFn: () => listPublicProjectsRequest({ skip: 0, limit: 6 }),
  })

  const productsQuery = useQuery({
    queryKey: ['home', 'products'],
    queryFn: () => listProductsRequest({ skip: 0, limit: 6 }),
  })

  const blogsQuery = useQuery({
    queryKey: ['home', 'blogs'],
    queryFn: () => listPublicBlogsRequest({ skip: 0, limit: 3 }),
  })

  const siteMediaQuery = useQuery({
    queryKey: ['site-media'],
    queryFn: listSiteMediaRequest,
  })

  const services = useMemo<ServiceOfferingResponse[]>(
    () =>
      (Array.isArray(servicesQuery.data) ? servicesQuery.data : []).filter(
        (item) => item?.is_active !== false
      ),
    [servicesQuery.data]
  )

  const projects = useMemo<PublicProjectResponse[]>(
    () => (Array.isArray(projectsQuery.data) ? projectsQuery.data : []),
    [projectsQuery.data]
  )

  const products = useMemo<ProductResponse[]>(
    () =>
      (Array.isArray(productsQuery.data) ? productsQuery.data : []).filter(
        (item) => item?.is_active !== false
      ),
    [productsQuery.data]
  )

  const blogs = useMemo<BlogSummaryResponse[]>(
    () =>
      [...(Array.isArray(blogsQuery.data) ? blogsQuery.data : [])].sort((a, b) => {
        const aDate = new Date(a.publish_date ?? a.created_at ?? 0).getTime()
        const bDate = new Date(b.publish_date ?? b.created_at ?? 0).getTime()
        return bDate - aDate
      }),
    [blogsQuery.data]
  )

  const heroImages = useMemo<string[]>(
    () => {
      const remoteImages = toSortedMediaUrls(siteMediaQuery.data?.groups.heroImages)
      return remoteImages.length > 0 ? remoteImages : staticHeroImages
    },
    [siteMediaQuery.data?.groups.heroImages]
  )

  const serviceFallbacks = useMemo<string[]>(
    () => {
      const remoteImages = toSortedMediaUrls(siteMediaQuery.data?.groups.serviceFallbackImages)
      return remoteImages.length > 0 ? remoteImages : staticServiceFallbacks
    },
    [siteMediaQuery.data?.groups.serviceFallbackImages]
  )

  const projectFallbacks = useMemo<string[]>(
    () => {
      const remoteImages = toSortedMediaUrls(siteMediaQuery.data?.groups.projectFallbacks)
      return remoteImages.length > 0 ? remoteImages : staticProjectFallbacks
    },
    [siteMediaQuery.data?.groups.projectFallbacks]
  )

  const blogFallbacks = useMemo<string[]>(
    () => {
      const remoteImages = toSortedMediaUrls(siteMediaQuery.data?.groups.blogFallbacks)
      return remoteImages.length > 0 ? remoteImages : staticBlogFallbacks
    },
    [siteMediaQuery.data?.groups.blogFallbacks]
  )

  const productFallbacks = useMemo<string[]>(
    () => {
      const remoteImages = toSortedMediaUrls(siteMediaQuery.data?.groups.productFallbacks)
      return remoteImages.length > 0 ? remoteImages : staticProductFallbacks
    },
    [siteMediaQuery.data?.groups.productFallbacks]
  )

  const displayedServices = useMemo<ServiceOfferingResponse[]>(
    () => services.slice(0, 6),
    [services]
  )

  useEffect(() => {
    setCurrentHeroIndex((prev) => (prev < heroImages.length ? prev : 0))
  }, [heroImages.length])

  useEffect(() => {
    if (heroImages.length <= 1) {
      return
    }

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [heroImages.length])

  const highlights = useMemo(
    () => [
      { label: 'Active Services', value: `${services.length || 6}+`, icon: SparklesIcon },
      { label: 'Completed Projects', value: `${projects.filter(p => p.status === 'completed').length || 30}+`, icon: HomeModernIcon },
      { label: 'Quality Products', value: `${products.length || 120}+`, icon: ShoppingBagIcon },
      { label: 'Happy Clients', value: '500+', icon: UserGroupIcon },
    ],
    [projects, products.length, services.length]
  )

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-background via-white to-background">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Hero Section with Parallax */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(81,196,216,0.28),_transparent_45%),radial-gradient(circle_at_85%_10%,_rgba(255,138,92,0.22),_transparent_40%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_48%,#f8fafc_100%)]" />
        
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 backdrop-blur-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-lg"
            >
              <SparklesIcon className="h-4 w-4" />
              MtaaMall
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 max-w-3xl text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Transform Your Space into{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Timeless Art
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary"
            >
              We design and deliver curated interiors for homes, offices, and developments,
              including curtain installation, furniture customization, wall painting, and
              post-construction cleaning, all managed end-to-end by one team.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link to="/projects">
                <Button 
                  size="lg" 
                  rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                  className="group relative overflow-hidden"
                >
                  <span className="relative z-10">View Our Work</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primaryDark"
                    initial={{ x: '100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" size="lg">
                  Explore Services
                </Button>
              </Link>
              <Link to="/gallery">
                <Button variant="ghost" size="lg" leftIcon={<PhotoIcon className="h-4 w-4" />}>
                  Gallery
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 grid gap-4 sm:grid-cols-4"
            >
              {highlights.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.label}
                    whileHover={{ y: -5 }}
                    className="group rounded-2xl border border-border bg-white/70 p-4 backdrop-blur-sm hover:shadow-lg transition-all"
                  >
                    <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                    <p className="mt-2 text-2xl font-bold text-primary">{item.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-text-tertiary">{item.label}</p>
                  </motion.div>
                )
              })}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentHeroIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <motion.img
                    whileHover={{ scale: 1.02 }}
                    src={heroImages[currentHeroIndex]}
                    alt="Elegant interior living room"
                    className="h-72 w-full rounded-3xl object-cover sm:col-span-2 shadow-2xl"
                    loading="lazy"
                  />
                  <motion.img
                    whileHover={{ scale: 1.02 }}
                    src={heroImages[(currentHeroIndex + 1) % heroImages.length]}
                    alt="Premium curtain and upholstery styling"
                    className="h-52 w-full rounded-3xl object-cover shadow-xl"
                    loading="lazy"
                  />
                  <motion.img
                    whileHover={{ scale: 1.02 }}
                    src={heroImages[(currentHeroIndex + 2) % heroImages.length]}
                    alt="Modern workspace interior setup"
                    className="h-52 w-full rounded-3xl object-cover shadow-xl"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-5 left-6 rounded-2xl border border-primary/25 bg-white/95 p-4 shadow-xl backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Our Promise</p>
              <p className="mt-1 text-sm font-semibold text-text">Clear timelines, quality finishes, and visual impact.</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Trust Badges */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl border border-border bg-white/50 backdrop-blur-sm p-6 shadow-lg">
          <p className="text-center text-xs uppercase tracking-[0.22em] text-text-tertiary">
            Trusted by leading residential, hospitality, and commercial clients
          </p>
          <div className="mt-4 grid gap-4 text-center text-sm text-text-secondary md:grid-cols-3">
            <motion.p 
              whileHover={{ scale: 1.05, backgroundColor: AppTheme.colors.primarySoft }}
              className="rounded-xl bg-background px-4 py-3 transition-all cursor-default"
            >
              Custom interior styling and fit-out
            </motion.p>
            <motion.p 
              whileHover={{ scale: 1.05, backgroundColor: AppTheme.colors.primarySoft }}
              className="rounded-xl bg-background px-4 py-3 transition-all cursor-default"
            >
              Reliable site coordination and project updates
            </motion.p>
            <motion.p 
              whileHover={{ scale: 1.05, backgroundColor: AppTheme.colors.primarySoft }}
              className="rounded-xl bg-background px-4 py-3 transition-all cursor-default"
            >
              A single team from concept to handover
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Services Section */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <motion.p variants={fadeInUp} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              What We Offer
            </motion.p>
            <motion.h2 variants={fadeInUp} className="mt-2 text-4xl font-bold text-text">
              Design and execution services built for real spaces
            </motion.h2>
          </div>
          <motion.div variants={fadeInUp}>
            <Link to="/services" className="group flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark">
              All services
              <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {servicesQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`service-loading-${index}`}
                className="overflow-hidden rounded-3xl border border-border bg-white shadow-lg"
              >
                <div className="h-56 w-full animate-pulse bg-background" />
                <div className="space-y-3 p-6">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-background" />
                  <div className="h-4 w-full animate-pulse rounded bg-background" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-background" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-5 w-24 animate-pulse rounded bg-background" />
                    <div className="h-4 w-16 animate-pulse rounded bg-background" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedServices.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayedServices.map((service, index) => {
              const image =
                resolveMediaUrl(service.image_urls?.[0]) ??
                serviceFallbacks[index % serviceFallbacks.length] ??
                staticServiceFallbacks[index % staticServiceFallbacks.length]

              return (
                <motion.article
                  key={service.id}
                  variants={fadeInUp}
                  whileHover={{ y: -8 }}
                  className="group overflow-hidden rounded-3xl border border-border bg-white shadow-lg hover:shadow-2xl transition-all"
                >
                  <div className="relative overflow-hidden">
                    <img 
                      src={image} 
                      alt={service.name} 
                      className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      loading="lazy" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-text group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-text-secondary line-clamp-2">
                      {service.description ??
                        'Professional planning, quality materials, and sharp finishing delivered by our team.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {service.price ? `From ${formatCurrency(service.price)}` : 'Custom quotation'}
                      </span>
                      {service.duration_minutes ? (
                        <span className="inline-flex items-center gap-1 text-sm text-text-tertiary">
                          <ClockIcon className="h-4 w-4" />
                          {service.duration_minutes} min
                        </span>
                      ) : null}
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-white/70 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-text">No services available right now</p>
            <p className="mt-2 text-sm text-text-secondary">
              This section now loads directly from the services API.
            </p>
          </div>
        )}
      </motion.section>

      {/* Projects Showcase */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="relative bg-gradient-to-br from-primary/5 to-secondary/5 py-20"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <motion.p variants={fadeInUp} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Project Showcase
              </motion.p>
              <motion.h2 variants={fadeInUp} className="mt-2 text-4xl font-bold text-text">
                Recent work and ongoing transformations
              </motion.h2>
            </div>
            <motion.div variants={fadeInUp}>
              <Link to="/projects" className="group flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark">
                View all projects
                <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {(projects.length > 0 ? projects : new Array(3).fill(null)).slice(0, 3).map((project, index) => {
              const image = resolveMediaUrl(project?.image_urls?.[0]) ?? projectFallbacks[index % projectFallbacks.length]
              const status = project?.status ? toDisplayLabel(project.status) : 'In Review'
              return (
                <motion.article
                  key={`${project?.project_title ?? 'project'}-${index}`}
                  variants={fadeInUp}
                  whileHover={{ y: -8 }}
                  className="group overflow-hidden rounded-3xl border border-border bg-white shadow-lg hover:shadow-2xl transition-all"
                >
                  <div className="relative overflow-hidden h-64">
                    <img 
                      src={image} 
                      alt={project?.project_title ?? 'Project space'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      loading="lazy" 
                    />
                    <div className="absolute top-4 left-4">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${statusPillClass(project?.status ?? 'inquiry')}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        {toDisplayLabel(project?.project_type ?? 'interior_design')}
                      </span>
                      <div className="flex items-center gap-1 text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-text group-hover:text-primary transition-colors">
                      {project?.project_title ?? 'Signature Interior Upgrade'}
                    </h3>
                    <p className="mt-2 text-text-secondary line-clamp-2">
                      {project?.description ?? 'Detailed planning, execution, and finishing for a premium client experience.'}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-text-tertiary">
                      <CalendarDaysIcon className="h-4 w-4 text-primary" />
                      <span>{formatDate(project?.start_date)} - {formatDate(project?.expected_end_date)}</span>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Shop & Blog Section */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8"
      >
        {/* Shop Highlights */}
        <motion.div variants={fadeInUp} className="rounded-3xl border border-border bg-white p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-text">Shop Highlights</h3>
            <Link to="/products" className="group flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
              Shop all
              <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
            {(products.length > 0 ? products : new Array(3).fill(null)).slice(0, 3).map((product, index) => {
              const image = resolveMediaUrl(product?.image_urls?.[0]) ?? productFallbacks[index % productFallbacks.length]
              const amount = product ? product.selling_price ?? product.price : 0
              return (
                <motion.article
                  key={product?.id ?? `product-fallback-${index}`}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 rounded-2xl bg-background p-3 cursor-pointer hover:bg-primary/5 transition-all"
                >
                  <img 
                    src={image} 
                    alt={product?.name ?? 'Interior product'} 
                    className="h-20 w-20 rounded-xl object-cover" 
                    loading="lazy" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-text">{product?.name ?? 'Premium Home Accessory'}</p>
                    <p className="text-sm text-text-tertiary">{product?.category_name ?? 'Interior collection'}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {product ? formatCurrency(amount) : 'Request quote'}
                  </p>
                </motion.article>
              )
            })}
          </div>
        </motion.div>

        {/* Blog Highlights */}
        <motion.div variants={fadeInUp} className="rounded-3xl border border-border bg-white p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-text">From Our Blog</h3>
            <Link to="/blog" className="group flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
              Read all
              <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
            {(blogs.length > 0 ? blogs : new Array(3).fill(null)).slice(0, 3).map((blog, index) => {
              const image = resolveMediaUrl(blog?.image_urls?.[0]) ?? blogFallbacks[index % blogFallbacks.length]
              return (
                <motion.article
                  key={blog?.id ?? `blog-fallback-${index}`}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 rounded-2xl bg-background p-3 cursor-pointer hover:bg-primary/5 transition-all"
                >
                  <img 
                    src={image} 
                    alt={blog?.title ?? 'Interior blog article'} 
                    className="h-20 w-20 rounded-xl object-cover" 
                    loading="lazy" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-text">{blog?.title ?? 'Interior styling insights for modern spaces'}</p>
                    <p className="text-sm text-text-tertiary">{formatDate(blog?.publish_date ?? blog?.created_at)}</p>
                  </div>
                  <Link
                    to={blog?.slug ? `/blog/${blog.slug}` : '/blog'}
                    className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    Read
                    <ArrowRightIcon className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.article>
              )
            })}
          </div>
        </motion.div>
      </motion.section>

      {/* Process Section */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <motion.div variants={fadeInUp} className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Our Process</p>
          <h2 className="mt-2 text-4xl font-bold text-text">How we deliver polished interiors</h2>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            A proven methodology that ensures quality, consistency, and client satisfaction at every step.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {processSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.article
                key={step.title}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className="group relative rounded-3xl border border-border bg-white p-6 shadow-lg hover:shadow-2xl transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text group-hover:text-primary transition-colors">{step.title}</h3>
                  <p className="mt-2 text-text-secondary">{step.description}</p>
                </div>
              </motion.article>
            )
          })}
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="relative bg-gradient-to-br from-primary/5 to-secondary/5 py-20"
      >
        <div className="absolute inset-0 bg-dot-pattern opacity-5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Testimonials</p>
            <h2 className="mt-2 text-4xl font-bold text-text">What our clients say</h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className="rounded-3xl border border-border bg-white p-6 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-text">{testimonial.name}</p>
                    <p className="text-sm text-text-tertiary">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 text-yellow-400 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-text-secondary italic">"{testimonial.content}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary to-secondary">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1617104551722-3b2d51366499?auto=format&fit=crop&w=1800&q=80"
              alt="Elegant fully styled interior space"
              className="h-96 w-full object-cover opacity-20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/40 to-black/30" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-3xl px-8 sm:px-12">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                >
                  <HomeModernIcon className="h-4 w-4" />
                  Ready To Start
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  Turn your idea into a space that sells your brand and lifestyle.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 text-lg text-white/90"
                >
                  Browse our services, explore finished projects, and pick the design direction
                  that fits your property goals.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex flex-wrap gap-4"
                >
                  <Link to="/services">
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                      className="bg-white text-primary hover:bg-white/90"
                    >
                      Start with Services
                    </Button>
                  </Link>
                  <Link to="/blog">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 bg-transparent text-white hover:bg-white/20"
                      leftIcon={<NewspaperIcon className="h-4 w-4" />}
                    >
                      Read Design Tips
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

export default HomePage
