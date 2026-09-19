import { landingPage } from "@utils/businessLifecycle";
import { useContext, useMemo, useState, useEffect } from "react";
import WorkspaceSwitcher from "@/components/common/WorkspaceSwitcher";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBagIcon,
  HomeIcon,
  SparklesIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  ArrowPathRoundedSquareIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  GiftIcon,
  MapPinIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { CartContext } from "@contexts/CartContext";
import { useAuth } from "@hooks/useAuth";
import { AppTheme, withOpacity } from "@constants/theme";
import brandLogo from "@/assets/mtaamall-logo.svg";

// Navigation items with icons
const navItems = [
  { path: "/", label: "The mall", icon: HomeIcon, public: true },
  { path: "/products", label: "Shop all", icon: ShoppingBagIcon, public: true },
  { path: "/account/orders", label: "My orders", icon: UserIcon, public: true },
  {
    path: "/register?type=business",
    label: "Sell on MtaaMall",
    icon: SparklesIcon,
    public: true,
  },
];

export const MainLayout = () => {
  const cart = useContext(CartContext);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cartCount = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [cart?.items],
  );

  const cartTotal = useMemo(() => cart?.total ?? 0, [cart?.total]);

  const isAuthenticated = Boolean(user);
  const dashboardPath = landingPage(user ?? {});
  const hasCustomerAccount = Boolean(user?.workspaces?.some((workspace) => workspace.type === "customer"));

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Modern Header with Glass Effect */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 backdrop-blur-lg shadow-lg border-b border-primary/10"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo with Animation */}
            <Link to="/" className="relative group flex items-center gap-2">
              <motion.img
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                src={brandLogo}
                alt="MtaaMall logo"
                className="h-9 w-auto sm:h-10"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" &&
                    location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative group px-4 py-2"
                  >
                    <div className="relative flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? "text-primary"
                            : "text-text-tertiary group-hover:text-primary"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isActive
                            ? "text-primary"
                            : "text-text-secondary group-hover:text-primary"
                        }`}
                      >
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
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Search Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open product search"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="relative p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/5 transition-all"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </motion.button>

              {/* Cart with Modern Badge */}
              <Link to="/cart" aria-label={`Shopping cart, ${cartCount} items`}>
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
                          {cartCount > 99 ? "99+" : cartCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Cart Preview Tooltip */}
                  {cartCount > 0 && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none">
                      <div className="p-3 border-b border-border">
                        <p className="text-xs font-medium text-text-secondary">
                          Cart Summary
                        </p>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-text">{cartCount} items</p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {new Intl.NumberFormat("en-KE", {
                            style: "currency",
                            currency: "KES",
                            minimumFractionDigits: 0,
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
                <Link to="/wishlist" className="hidden sm:block">
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
              {Boolean(
                user?.business_memberships?.length ||
                user?.platform_memberships?.length,
              ) && (
                <div className="hidden lg:block">
                  <WorkspaceSwitcher />
                </div>
              )}
              {isAuthenticated ? (
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-label="Open profile menu"
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                    onClick={() => setIsProfileMenuOpen((open) => !open)}
                    className="relative group overflow-hidden rounded-full bg-gradient-to-r from-primary to-secondary p-0.5"
                  >
                    <div className="relative flex items-center gap-2 rounded-full bg-white px-4 py-2 transition-all group-hover:bg-transparent">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-xs font-semibold text-white">
                        {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:text-white">
                        {dashboardPath === "/account"
                          ? "My account"
                          : "Workspace"}
                      </span>
                      <ChevronDownIcon className={`hidden h-4 w-4 text-primary transition sm:block ${isProfileMenuOpen ? "rotate-180" : ""}`} />
                    </div>
                  </motion.button>
                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        role="menu"
                        aria-label="Profile menu"
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.16 }}
                        className="absolute right-0 top-full z-50 mt-3 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
                      >
                        <div className="border-b border-divider bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
                          <p className="truncate font-bold text-text">{user?.name || user?.username}</p>
                          <p className="truncate text-xs text-text-tertiary">{user?.email || `@${user?.username}`}</p>
                        </div>
                        {hasCustomerAccount && <div className="p-2">
                          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Shopping</p>
                          <Link role="menuitem" to="/account/orders" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-primary/5 hover:text-primary-dark"><ClipboardDocumentListIcon className="h-5 w-5" /><span>My orders</span></Link>
                          <Link role="menuitem" to="/account/cart" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-primary/5 hover:text-primary-dark"><ShoppingBagIcon className="h-5 w-5" /><span>My cart</span>{cartCount > 0 && <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-white">{cartCount}</span>}</Link>
                          <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Account settings</p>
                          <div className="grid grid-cols-2 gap-1">
                            {[{ to: "/account/profile", label: "Profile", icon: UserIcon }, { to: "/account/addresses", label: "Addresses", icon: MapPinIcon }, { to: "/account/payments", label: "Payments", icon: CreditCardIcon }, { to: "/account/loyalty", label: "Loyalty", icon: GiftIcon }, { to: "/account/returns", label: "Returns", icon: ArrowPathRoundedSquareIcon }, { to: "/account/saved", label: "Saved", icon: HeartIcon }, { to: "/security", label: "Security", icon: ShieldCheckIcon }, { to: "/account/workspaces", label: "Workspaces", icon: Squares2X2Icon }].map(({ to, label, icon: Icon }) => <Link key={to} role="menuitem" to={to} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-primary/5 hover:text-primary-dark"><Icon className="h-4 w-4" /><span>{label}</span></Link>)}
                          </div>
                        </div>}
                        {dashboardPath !== "/account" && <div className="border-t border-divider p-2"><Link role="menuitem" to={dashboardPath} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-primary/5 hover:text-primary-dark"><SparklesIcon className="h-5 w-5" />Open workspace</Link></div>}
                        <div className="border-t border-divider p-2"><button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-error transition hover:bg-error/5"><ArrowRightOnRectangleIcon className="h-5 w-5" />Sign out</button></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
                aria-label="Toggle navigation"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative xl:hidden p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary/5 transition-all"
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
                animate={{ height: "auto", opacity: 1 }}
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
                      placeholder="Search products in the mall..."
                      className="w-full h-12 pl-12 pr-4 bg-white border-2 border-border rounded-xl 
                               focus:border-primary focus:outline-none focus:ring-4 
                               focus:ring-primary/20 transition-all text-text"
                      autoFocus
                    />
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
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
            className="fixed inset-0 top-16 z-40 xl:hidden"
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl"
            >
              <div className="p-4">
                <div className="mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || "G"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {user?.name || "Guest User"}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {isAuthenticated ? "Signed in" : "Not signed in"}
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-primary/10 to-secondary/10 text-primary"
                            : "text-text-secondary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}

                  {isAuthenticated && (
                    <>
                      <hr className="my-2 border-border" />
                      <Link
                        to={dashboardPath}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-primary/5 hover:text-primary transition-all"
                      >
                        <UserIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {dashboardPath === "/account"
                            ? "My account"
                            : "Workspace"}
                        </span>
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
                  src={brandLogo}
                  alt="MtaaMall logo"
                  className="h-12 w-auto sm:h-14"
                />
              </Link>
              <p className="text-text-secondary text-sm mb-4 max-w-md">
                Your neighbourhood, online. Discover everyday essentials and new
                finds from businesses on MtaaMall — one place to browse, shop
                and manage your orders.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2">
                {[
                  { label: "Shop the mall", to: "/products" },
                  { label: "Your orders", to: "/account/orders" },
                  { label: "Your account", to: "/account" },
                  { label: "Sell on MtaaMall", to: "/register?type=business" },
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
                <Link
                  to="/privacy"
                  className="text-xs text-text-tertiary hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="text-xs text-text-tertiary hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
              <p className="text-xs text-text-tertiary hidden sm:block">
                Your neighbourhood. Your online mall.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
