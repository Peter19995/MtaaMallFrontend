import { useContext, useMemo, useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBagIcon, 
  HomeIcon,
  SparklesIcon,
  NewspaperIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline'
import { CartContext } from '@contexts/CartContext'
import { useAuth } from '@hooks/useAuth'
import { AppTheme, withOpacity } from '@constants/theme'

// Navigation items with icons
const navItems = [
  { path: '/', label: 'Home', icon: HomeIcon, public: true },
  { path: '/about', label: 'About', icon: UserIcon, public: true },
  { path: '/products', label: 'Shop', icon: ShoppingBagIcon, public: true },
  { path: '/services', label: 'Services', icon: SparklesIcon, public: true },
  { path: '/register-business', label: 'Sell', icon: BuildingOffice2Icon, public: true },
  { path: '/blog', label: 'Blogs', icon: NewspaperIcon, public: true },
]

export const MainLayout = () => {
  const cart = useContext(CartContext)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const cartCount = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [cart?.items]
  )

  const cartTotal = useMemo(
    () => cart?.total ?? 0,
    [cart?.total]
  )

  const isAuthenticated = Boolean(user)
  const dashboardPath = '/dashboard/admin'

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`)
      setIsSearchOpen(false)
      setSearchQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Modern Header with Glass Effect */}
      <header 
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-lg shadow-lg border-b border-primary/10' 
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo with Animation */}
            <Link 
              to="/" 
              className="relative group flex items-center gap-2"
            >
              <motion.img
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                src="/mtaamall-logo.png"
                alt="MtaaMall logo"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative group px-4 py-2"
                  >
                    <div className="relative flex items-center gap-2">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-primary' : 'text-text-tertiary group-hover:text-primary'
                      }`} />
                      <span className={`text-sm font-medium transition-colors ${
                        isActive 
                          ? 'text-primary' 
                          : 'text-text-secondary group-hover:text-primary'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    
                    {/* Hover Indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </Link>
                )
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Search Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="relative p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/5 transition-all"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </motion.button>

              {/* Cart with Modern Badge */}
              <Link to="/cart">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-2 text-text-secondary group-hover:text-primary transition-colors">
                    <ShoppingBagIcon className="w-5 h-5" />
                    <AnimatePresence>
                      {cartCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-[10px] font-bold text-white shadow-lg"
                        >
                          {cartCount > 99 ? '99+' : cartCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Cart Preview Tooltip */}
                  {cartCount > 0 && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none">
                      <div className="p-3 border-b border-border">
                        <p className="text-xs font-medium text-text-secondary">Cart Summary</p>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-text">{cartCount} items</p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {new Intl.NumberFormat('en-KE', {
                            style: 'currency',
                            currency: 'KES',
                            minimumFractionDigits: 0
                          }).format(cartTotal)}
                        </p>
                      </div>
                      <div className="p-2 bg-background rounded-b-xl">
                        <p className="text-[10px] text-text-tertiary text-center">
                          Click to view full cart
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </Link>

              {/* Wishlist (for logged in users) */}
              {isAuthenticated && (
                <Link to="/wishlist">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/5 transition-all"
                  >
                    <HeartIcon className="w-5 h-5" />
                  </motion.div>
                </Link>
              )}

              {/* Dashboard / Sign In */}
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group overflow-hidden rounded-full bg-gradient-to-r from-primary to-secondary p-0.5"
                  >
                    <div className="relative flex items-center gap-2 rounded-full bg-white px-4 py-2 transition-all group-hover:bg-transparent">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-xs font-semibold text-white">
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </div>
                      <span className="text-sm font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:text-white">
                        Dashboard
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ) : (
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group overflow-hidden rounded-full bg-gradient-to-r from-primary to-secondary p-0.5"
                  >
                    <div className="relative bg-white px-4 py-2 rounded-full group-hover:bg-transparent transition-all">
                      <span className="text-sm font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:text-white">
                        Sign In
                      </span>
                    </div>
                  </motion.button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative md:hidden p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/5 transition-all"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Bars3Icon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleSearch} className="py-4">
                  <div className="relative group">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products, categories, or sellers..."
                      className="w-full h-12 pl-12 pr-4 bg-white border-2 border-border rounded-xl 
                               focus:border-primary focus:outline-none focus:ring-4 
                               focus:ring-primary/20 transition-all text-text"
                      autoFocus
                    />
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-full transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 text-text-tertiary" />
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 top-16 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl"
            >
              <div className="p-4">
                <div className="mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold">
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {user?.name || 'Guest User'}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {isAuthenticated ? 'Signed in' : 'Not signed in'}
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive 
                            ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary' 
                            : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                  
                  {isAuthenticated && (
                    <>
                      <hr className="my-2 border-border" />
                      <Link
                        to={dashboardPath}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-primary/5 hover:text-primary transition-all"
                      >
                        <UserIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Dashboard</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:bg-error/5 transition-all"
                      >
                        <XMarkIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Sign Out</span>
                      </button>
                    </>
                  )}
                </nav>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Top Padding for Fixed Header */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Modern Footer */}
      <footer className="relative mt-auto border-t border-border bg-white">
        {/* Decorative Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
        
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="mb-4 inline-flex items-center gap-3">
                <img
                  src="/mtaamall-logo.png"
                  alt="MtaaMall logo"
                  className="h-16 w-auto object-contain"
                />
              </Link>
              <p className="text-text-secondary text-sm mb-4 max-w-md">
                Kenya's online marketplace for quality products, trusted sellers,
                convenient payments, and dependable delivery.
              </p>
              <div className="flex gap-4">
                {/* Social Icons */}
                {['facebook', 'instagram', 'pinterest', 'twitter'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="p-2 bg-background rounded-lg text-text-secondary hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5 bg-current rounded" style={{ mask: `url(/icons/${social}.svg) center/contain no-repeat` }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {[
                  { label: 'About Us', to: '/about' },
                  { label: 'Contact', to: '/contact' },
                  { label: 'FAQ', to: '/faq' },
                  { label: 'Shipping', to: '/shipping' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.to}
                      className="text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>Nairobi, Kenya</li>
                <li>+254 700 000 000</li>
                <li>info@mtaamall.com</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-text-tertiary">
                © {new Date().getFullYear()} MtaaMall. All rights reserved.
              </p>
              <div className="flex gap-6">
                <Link to="/privacy" className="text-xs text-text-tertiary hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-xs text-text-tertiary hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </div>
              <p className="text-xs text-text-tertiary">
                Built by{' '}
                <a
                  href="https://operatingsoftwareltd.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  Operating Software
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
