import { useContext, useMemo, useState, useEffect, type ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  ClockIcon, 
  MagnifyingGlassIcon, 
  WrenchScrewdriverIcon,
  SparklesIcon,
  FireIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon,
  HomeModernIcon,
  PaintBrushIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import { Button, TextInput } from '@components/common'
import { CartContext } from '@contexts/CartContext'
import {
  listServiceCategoriesRequest,
  listServicesRequest,
  type ServiceOfferingResponse
} from '@api/modules/services.api'
import { AppTheme } from '@constants/theme'
import { resolveMediaUrls } from '@utils/media'

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const formatDuration = (minutes?: number): string => {
  if (!minutes) return 'Custom duration'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`
}

const getImageUrls = (service: ServiceOfferingResponse): string[] =>
  resolveMediaUrls(service.image_urls ?? [])

// Animation variants
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

// Service type icons mapping
const serviceIcons: Record<string, ElementType> = {
  'Cleaning': HomeModernIcon,
  'Installation': WrenchScrewdriverIcon,
  'Design': PaintBrushIcon,
  'Consultation': UserGroupIcon,
  'Maintenance': DevicePhoneMobileIcon,
  'default': SparklesIcon
}

const ServicesPage = () => {
  const cart = useContext(CartContext)
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | number>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceOfferingResponse | null>(null)

  if (!cart) {
    throw new Error('CartContext is required for ServicesPage.')
  }

  const categoriesQuery = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: listServiceCategoriesRequest
  })

  const servicesQuery = useQuery({
    queryKey: ['services', 'list', search, selectedCategoryId],
    queryFn: () =>
      listServicesRequest({
        limit: 200,
        is_active: true,
        search: search.trim() ? search.trim() : undefined,
        category_id: selectedCategoryId === 'all' ? undefined : selectedCategoryId
      })
  })

  const services = useMemo(
    () => (servicesQuery.data ?? []).filter((service) => service.is_active !== false),
    [servicesQuery.data]
  )

  // Filter services by price range
  const filteredServices = useMemo(() => {
    return services.filter(service => 
      service.price >= priceRange[0] && service.price <= priceRange[1]
    )
  }, [services, priceRange])

  // Get price limits for range slider
  const priceLimits = useMemo(() => {
    const prices = services.map(s => s.price)
    return {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 100000)
    }
  }, [services])

  const addServiceToCart = (service: ServiceOfferingResponse) => {
    cart.addItem({
      id: `service-${service.id}`,
      name: service.name,
      price: service.price,
      quantity: 1
    })

    toast.success(`${service.name} added to your cart`, {
      icon: '🛠️',
      style: {
        borderRadius: '10px',
        background: AppTheme.colors.successSoft,
        color: AppTheme.colors.successDark,
      }
    })
  }

  const resetFilters = () => {
    setSearch('')
    setSelectedCategoryId('all')
    setPriceRange([priceLimits.min, priceLimits.max])
  }

  // Quick view modal
  const ServiceQuickViewModal = () => {
    if (!selectedService) return null

    const IconComponent = serviceIcons[selectedService.category_name || 'default'] || serviceIcons.default
    const serviceImages = getImageUrls(selectedService)
    const primaryImage = serviceImages[0]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setSelectedService(null)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                {primaryImage ? (
                  <img src={primaryImage} alt={selectedService.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {selectedService.category_name || 'Professional Service'}
                </span>
                <h3 className="text-2xl font-bold text-text mt-1">{selectedService.name}</h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedService(null)}
              className="p-2 hover:bg-background rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-text mb-2">Description</h4>
              <p className="text-text-secondary leading-relaxed">
                {selectedService.description || 'Professional service tailored to your specific needs. Our expert team ensures high-quality results with attention to detail.'}
              </p>
              {serviceImages.length > 1 ? (
                <p className="mt-2 text-xs text-text-tertiary">{serviceImages.length} images available</p>
              ) : null}
            </div>

            {/* Service Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-xl p-4">
                <p className="text-xs text-text-tertiary mb-1">Price</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(selectedService.price)}
                </p>
              </div>
              <div className="bg-background rounded-xl p-4">
                <p className="text-xs text-text-tertiary mb-1">Duration</p>
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-secondary" />
                  <p className="text-lg font-semibold text-text">
                    {formatDuration(selectedService.duration_minutes)}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-sm font-semibold text-text mb-3">What's included</h4>
              <ul className="grid grid-cols-2 gap-2">
                {[
                  'Professional service',
                  'Quality guaranteed',
                  'Expert team',
                  'Flexible scheduling',
                  'Satisfaction assured',
                  'Follow-up support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-text-secondary">
                    <CheckCircleIcon className="w-4 h-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => {
                  addServiceToCart(selectedService)
                  setSelectedService(null)
                }}
                className="flex-1"
              >
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setSelectedService(null)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
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
              <SparklesIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Professional Services
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-4">
              Transform Your Space with{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Expert Services
              </span>
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              From installation to design consultation, our professional team delivers 
              exceptional quality for every project.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Total Services</p>
            <p className="text-2xl font-bold text-primary">{services.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Categories</p>
            <p className="text-2xl font-bold text-secondary">{(categoriesQuery.data ?? []).length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">In Your Cart</p>
            <p className="text-2xl font-bold text-accent">
              {cart.items.filter(item => item.id.startsWith('service-')).length}
            </p>
          </motion.div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services by name or description..."
                className="w-full h-12 pl-12 pr-4 bg-white border-2 border-border rounded-xl 
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

            <div className="flex gap-2">
              <select
                className="h-12 px-4 bg-white border-2 border-border rounded-xl 
                         text-text focus:border-primary focus:outline-none focus:ring-4 
                         focus:ring-primary/20 transition-all min-w-[180px]"
                value={selectedCategoryId}
                onChange={(event) =>
                  setSelectedCategoryId(
                    event.target.value === 'all' ? 'all' : Number(event.target.value)
                  )
                }
              >
                <option value="all">All Categories</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                  showFilters 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-primary" />
                    Advanced Filters
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Reset All
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-3">
                      Price Range: {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={priceLimits.min}
                        max={priceLimits.max}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${AppTheme.colors.primary} 0%, ${AppTheme.colors.primary} ${(priceRange[0] - priceLimits.min) / (priceLimits.max - priceLimits.min) * 100}%, #e0e7ef ${(priceRange[0] - priceLimits.min) / (priceLimits.max - priceLimits.min) * 100}%, #e0e7ef 100%)`
                        }}
                      />
                      <input
                        type="range"
                        min={priceLimits.min}
                        max={priceLimits.max}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #e0e7ef 0%, #e0e7ef ${(priceRange[1] - priceLimits.min) / (priceLimits.max - priceLimits.min) * 100}%, ${AppTheme.colors.primary} ${(priceRange[1] - priceLimits.min) / (priceLimits.max - priceLimits.min) * 100}%, ${AppTheme.colors.primary} 100%)`
                        }}
                      />
                    </div>
                  </div>

                  {/* Popular Filters */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => setPriceRange([0, 10000])}
                      className="px-3 py-1.5 text-xs bg-background rounded-full text-text-secondary hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      Under 10K
                    </button>
                    <button
                      onClick={() => setPriceRange([10000, 25000])}
                      className="px-3 py-1.5 text-xs bg-background rounded-full text-text-secondary hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      10K - 25K
                    </button>
                    <button
                      onClick={() => setPriceRange([25000, 50000])}
                      className="px-3 py-1.5 text-xs bg-background rounded-full text-text-secondary hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      25K - 50K
                    </button>
                    <button
                      onClick={() => setPriceRange([50000, priceLimits.max])}
                      className="px-3 py-1.5 text-xs bg-background rounded-full text-text-secondary hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      Above 50K
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {servicesQuery.isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-border p-6 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-background rounded skeleton" />
                    <div className="h-6 w-40 bg-background rounded skeleton" />
                  </div>
                  <div className="w-10 h-10 bg-background rounded-xl skeleton" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-background rounded skeleton" />
                  <div className="h-4 w-3/4 bg-background rounded skeleton" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-24 bg-background rounded skeleton" />
                  <div className="h-10 w-28 bg-background rounded skeleton" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Error State */}
        {servicesQuery.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-error/10 border border-error/20 rounded-xl text-center"
          >
            <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-error/30 mb-4" />
            <h3 className="text-lg font-semibold text-error-dark mb-2">Unable to Load Services</h3>
            <p className="text-error/80 mb-4">There was an error loading the services. Please try again later.</p>
            <Button variant="outline" onClick={() => servicesQuery.refetch()}>
              Retry
            </Button>
          </motion.div>
        )}

        {/* Empty State */}
        {!servicesQuery.isLoading && !servicesQuery.isError && filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <WrenchScrewdriverIcon className="w-20 h-20 mx-auto text-text-tertiary/30 mb-4" />
            <h3 className="text-xl font-semibold text-text mb-2">No Services Found</h3>
            <p className="text-text-secondary mb-4">Try adjusting your search or filter criteria</p>
            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
          </motion.div>
        )}

        {/* Services Grid */}
        {!servicesQuery.isLoading && !servicesQuery.isError && filteredServices.length > 0 && (
          <>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredServices.map((service) => {
                const IconComponent = serviceIcons[service.category_name || 'default'] || serviceIcons.default
                const imageUrls = getImageUrls(service)
                const primaryImage = imageUrls[0]
                
                return (
                  <motion.article
                    key={service.id}
                    variants={fadeInUp}
                    layout
                    className="group relative bg-white rounded-xl border border-border overflow-hidden 
                             hover:shadow-xl hover:border-primary/30 transition-all duration-300"
                  >
                    {primaryImage ? (
                      <div className="h-40 w-full overflow-hidden bg-background">
                        <img src={primaryImage} alt={service.name} className="h-full w-full object-cover" />
                      </div>
                    ) : null}

                    {/* Header with Icon */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-primary uppercase tracking-wider">
                              {service.category_name || 'Service'}
                            </p>
                            <h2 className="text-lg font-semibold text-text group-hover:text-primary transition-colors">
                              {service.name}
                            </h2>
                          </div>
                        </div>
                        
                        {/* Quick View Button */}
                        <button
                          onClick={() => setSelectedService(service)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-background rounded-full transition-all"
                        >
                          <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary" />
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-text-secondary text-sm line-clamp-2 mb-4">
                        {service.description || 'Professional service tailored to your specific needs.'}
                      </p>
                      {imageUrls.length > 1 ? (
                        <p className="mb-3 text-[11px] text-text-tertiary">{imageUrls.length} images</p>
                      ) : null}

                      {/* Service Details */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-text-tertiary">
                          <ClockIcon className="w-4 h-4" />
                          <span>{formatDuration(service.duration_minutes)}</span>
                        </div>
                        {service.is_popular && (
                          <div className="flex items-center gap-1 text-xs text-secondary">
                            <FireIcon className="w-3 h-3" />
                            <span>Popular</span>
                          </div>
                        )}
                      </div>

                      {/* Price and Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(service.price)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addServiceToCart(service)}
                          className="relative overflow-hidden group/btn"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Add to Cart
                          </span>
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-primary to-primaryDark"
                            initial={{ x: '100%' }}
                            whileHover={{ x: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.article>
                )
              })}
            </motion.div>

            {/* Results Count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 flex items-center justify-between text-sm text-text-tertiary"
            >
              <span className="flex items-center gap-2">
                <MagnifyingGlassIcon className="w-4 h-4" />
                Showing {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'}
              </span>
              <span>
                Page 1 of {Math.ceil(filteredServices.length / 9)}
              </span>
            </motion.div>
          </>
        )}
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selectedService && <ServiceQuickViewModal />}
      </AnimatePresence>
    </div>
  )
}

export default ServicesPage
