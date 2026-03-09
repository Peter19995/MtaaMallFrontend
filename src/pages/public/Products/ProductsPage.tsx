import { useContext, useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ShoppingBagIcon,
  HeartIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  SparklesIcon,
  FireIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { Button, TextInput } from '@components/common'
import { CartContext } from '@contexts/CartContext'
import { listProductsRequest, type ProductResponse } from '@api/modules/products.api'
import { AppTheme, withOpacity } from '@constants/theme'
import { resolveMediaUrls } from '@utils/media'

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

const getBasePrice = (product: ProductResponse): number => product.selling_price ?? product.price

const getOfferPrice = (product: ProductResponse): number =>
  product.is_on_offer
    ? Math.max(getBasePrice(product) - (product.max_offer ?? 0), 0)
    : getBasePrice(product)

const getImageUrls = (product: ProductResponse): string[] =>
  resolveMediaUrls(product.image_urls ?? [])

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

// Sort options
const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name: A to Z', value: 'name_asc' },
  { label: 'Name: Z to A', value: 'name_desc' },
  { label: 'Popularity', value: 'popular' }
]

const ProductsPage = () => {
  const cart = useContext(CartContext)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState('newest')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000])
  const [showFilters, setShowFilters] = useState(false)
  const [wishlist, setWishlist] = useState<number[]>([])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [onOfferOnly, setOnOfferOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (!cart) {
    throw new Error('CartContext is required for ProductsPage.')
  }

  const productsQuery = useQuery({
    queryKey: ['products', 'catalog-page'],
    queryFn: () => listProductsRequest({ limit: 200 })
  })

  const products = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.is_active !== false),
    [productsQuery.data]
  )

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = products.map(p => p.category_name).filter(Boolean)
    return ['all', ...new Set(cats)]
  }, [products])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Apply search filter
    const term = search.trim().toLowerCase()
    if (term) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(term) || 
        product.sku.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_name === selectedCategory)
    }

    // Apply price range filter
    filtered = filtered.filter(p => {
      const price = getOfferPrice(p)
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // Apply stock filter
    if (inStockOnly) {
      filtered = filtered.filter(p => p.stock_quantity > 0)
    }

    // Apply offer filter
    if (onOfferOnly) {
      filtered = filtered.filter(p => p.is_on_offer)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const priceA = getOfferPrice(a)
      const priceB = getOfferPrice(b)
      
      switch (sortBy) {
        case 'price_asc':
          return priceA - priceB
        case 'price_desc':
          return priceB - priceA
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'name_desc':
          return b.name.localeCompare(a.name)
        case 'popular':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
    })

    return filtered
  }, [products, search, selectedCategory, sortBy, priceRange, inStockOnly, onOfferOnly])

  const addProductToCart = (product: ProductResponse) => {
    if (product.stock_quantity <= 0) {
      toast.error(`${product.name} is currently out of stock`, {
        icon: '😞',
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.errorSoft,
          color: AppTheme.colors.errorDark,
        }
      })
      return
    }

    cart.addItem({
      id: String(product.id),
      name: product.name,
      price: getOfferPrice(product),
      quantity: 1
    })

    toast.success(`${product.name} added to your cart`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: AppTheme.colors.successSoft,
        color: AppTheme.colors.successDark,
      }
    })
  }

  const toggleWishlist = (productId: number) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
    
    toast.success(
      wishlist.includes(productId) 
        ? 'Removed from wishlist' 
        : 'Added to wishlist',
      {
        icon: '❤️',
        duration: 2000
      }
    )
  }

  // Get min and max prices for range slider
  const priceLimits = useMemo(() => {
    const prices = products.map(p => getOfferPrice(p))
    return {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 100000)
    }
  }, [products])

  // Reset filters
  const resetFilters = () => {
    setSearch('')
    setSelectedCategory('all')
    setSortBy('newest')
    setPriceRange([priceLimits.min, priceLimits.max])
    setInStockOnly(false)
    setOnOfferOnly(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-12">
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
                Our Collection
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Discover Our{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Premium Products
              </span>
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Explore our curated selection of high-quality interior products, 
              from elegant curtains to stylish home accessories.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with Stats and View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl border border-border p-3">
              <p className="text-xs text-text-tertiary">Total Products</p>
              <p className="text-2xl font-bold text-primary">{filteredProducts.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-3">
              <p className="text-xs text-text-tertiary">In Stock</p>
              <p className="text-2xl font-bold text-success">
                {products.filter(p => p.stock_quantity > 0).length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg border border-border p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative group">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU, or description..."
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
        </div>

        {/* Filters Panel */}
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
                    <FunnelIcon className="w-5 h-5 text-primary" />
                    Filter Products
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg 
                               text-text focus:border-primary focus:outline-none focus:ring-2 
                               focus:ring-primary/20 transition-all"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg 
                               text-text focus:border-primary focus:outline-none focus:ring-2 
                               focus:ring-primary/20 transition-all"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-2">
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

                  {/* Checkbox Filters */}
                  <div className="lg:col-span-4 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">In stock only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onOfferOnly}
                        onChange={(e) => setOnOfferOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">On offer only</span>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid/List */}
        {productsQuery.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error-dark"
          >
            <p className="text-sm">Failed to load products. Please try again later.</p>
          </motion.div>
        )}

        {productsQuery.isLoading ? (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white rounded-xl border border-border overflow-hidden ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                <div className={`${viewMode === 'list' ? 'w-48' : 'w-full'} h-48 bg-gradient-to-r from-background via-primary/5 to-background skeleton`} />
                <div className="p-4 flex-1">
                  <div className="h-4 w-24 bg-background rounded skeleton mb-2" />
                  <div className="h-6 w-40 bg-background rounded skeleton mb-2" />
                  <div className="h-4 w-full bg-background rounded skeleton" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredProducts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <ShoppingBagIcon className="w-20 h-20 mx-auto text-text-tertiary/30 mb-4" />
                <h3 className="text-xl font-semibold text-text mb-2">No products found</h3>
                <p className="text-text-secondary mb-4">Try adjusting your search or filter criteria</p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="products"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}
              >
                {filteredProducts.map((product) => {
                  const outOfStock = product.stock_quantity <= 0
                  const finalPrice = getOfferPrice(product)
                  const basePrice = getBasePrice(product)
                  const imageUrls = getImageUrls(product)
                  const primaryImage = imageUrls[0]
                  const discount = product.is_on_offer 
                    ? Math.round(((basePrice - finalPrice) / Math.max(basePrice, 1)) * 100)
                    : 0
                  const isInWishlist = wishlist.includes(product.id)

                  if (viewMode === 'list') {
                    return (
                      <motion.article
                        key={product.id}
                        variants={fadeInUp}
                        layout
                        className="flex flex-col md:flex-row bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
                      >
                        {/* Image Placeholder */}
                        <div className="md:w-48 h-48 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center relative overflow-hidden">
                          {primaryImage ? (
                            <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBagIcon className="w-16 h-16 text-primary/20" />
                          )}
                          {discount > 0 && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-gradient-to-r from-secondary to-tertiary text-white text-xs font-bold px-2 py-1 rounded-full">
                                -{discount}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs font-medium text-primary uppercase tracking-wider">
                                {product.category_name || 'Uncategorized'}
                              </p>
                              <h2 className="text-lg font-semibold text-text mt-1">{product.name}</h2>
                            </div>
                            <button
                              onClick={() => toggleWishlist(product.id)}
                              className="p-2 hover:bg-background rounded-full transition-colors"
                            >
                              {isInWishlist ? (
                                <HeartIconSolid className="w-5 h-5 text-error" />
                              ) : (
                                <HeartIcon className="w-5 h-5 text-text-tertiary hover:text-error" />
                              )}
                            </button>
                          </div>

                          <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                            {product.description || 'Premium quality interior product for your space.'}
                          </p>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-text-tertiary">SKU: {product.sku}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {product.is_on_offer && (
                                  <span className="text-sm text-text-tertiary line-through">
                                    {formatCurrency(basePrice)}
                                  </span>
                                )}
                                <span className="text-xl font-bold text-primary">
                                  {formatCurrency(finalPrice)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className={`text-sm font-medium ${
                                outOfStock ? 'text-error' : 'text-success'
                              }`}>
                                {outOfStock ? 'Out of Stock' : `${product.stock_quantity} left`}
                              </div>
                              <Button
                                onClick={() => addProductToCart(product)}
                                disabled={outOfStock}
                                className="relative overflow-hidden group/btn"
                              >
                                <span className="relative z-10">
                                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    )
                  }

                  // Grid View
                  return (
                    <motion.article
                      key={product.id}
                      variants={fadeInUp}
                      layout
                      className="group relative bg-white rounded-xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
                    >
                      {/* Discount Badge */}
                      {discount > 0 && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-gradient-to-r from-secondary to-tertiary text-white text-xs font-bold px-2 py-1 rounded-full">
                            -{discount}%
                          </span>
                        </div>
                      )}

                      {/* Wishlist Button */}
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all group/btn"
                      >
                        {isInWishlist ? (
                          <HeartIconSolid className="w-4 h-4 text-error" />
                        ) : (
                          <HeartIcon className="w-4 h-4 text-text-tertiary group-hover/btn:text-error" />
                        )}
                      </button>

                      {/* Image Placeholder */}
                      <div className="relative h-48 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                        {primaryImage ? (
                          <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <ShoppingBagIcon className="w-20 h-20 text-primary/20" />
                        )}
                        
                        {/* Quick Add Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addProductToCart(product)}
                            disabled={outOfStock}
                            className="bg-white/90 backdrop-blur-sm border-0 hover:bg-white"
                          >
                            Quick Add
                          </Button>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-4">
                        <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                          {product.category_name || 'Uncategorized'}
                        </p>
                        
                        <h3 className="text-base font-semibold text-text mb-2 line-clamp-1">
                          {product.name}
                        </h3>

                        {/* Price and Stock */}
                        <div className="flex items-end justify-between mb-3">
                          <div>
                            {product.is_on_offer && (
                              <span className="text-xs text-text-tertiary line-through block">
                                {formatCurrency(basePrice)}
                              </span>
                            )}
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(finalPrice)}
                            </span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            outOfStock 
                              ? 'bg-error/10 text-error' 
                              : 'bg-success/10 text-success'
                          }`}>
                            {outOfStock ? 'Out of Stock' : `${product.stock_quantity} left`}
                          </span>
                        </div>

                        {/* SKU */}
                        <p className="text-xs text-text-tertiary mb-3">SKU: {product.sku}</p>
                        {imageUrls.length > 1 ? (
                          <p className="mb-3 text-[11px] text-text-tertiary">{imageUrls.length} images</p>
                        ) : null}

                        {/* Add to Cart Button */}
                        <Button
                          fullWidth
                          size="sm"
                          onClick={() => addProductToCart(product)}
                          disabled={outOfStock}
                          className="relative overflow-hidden group/btn"
                        >
                          <span className="relative z-10">
                            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                          </span>
                        </Button>
                      </div>
                    </motion.article>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default ProductsPage
