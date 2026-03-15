import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { MainLayout } from '@layouts/MainLayout/MainLayout'
import { DashboardLayout } from '@layouts/DashboardLayout/DashboardLayout'

const HomePage = lazy(() => import('@pages/public/Home/HomePage'))
const AboutPage = lazy(() => import('@pages/public/About/AboutPage'))
const ContactPage = lazy(() => import('@pages/public/Contact/ContactPage'))
const FAQPage = lazy(() => import('@pages/public/FAQ/FAQPage'))
const ProductsPage = lazy(() => import('@pages/public/Products/ProductsPage'))
const ServicesPage = lazy(() => import('@pages/public/Services/ServicesPage'))
const ProjectsPage = lazy(() => import('@pages/public/Projects/ProjectsPage'))
const BlogPage = lazy(() => import('@pages/public/Blog/BlogPage'))
const BlogPostPage = lazy(() => import('@pages/public/Blog/BlogPost'))
const GalleryPage = lazy(() => import('@pages/public/Gallery/GalleryPage'))
const StylingStudioPage = lazy(() => import('@pages/public/StylingStudio/StylingStudioPage'))
const CheckoutPage = lazy(() => import('@pages/public/Checkout/CheckoutPage'))
const CartPage = lazy(() => import('@pages/public/Cart/CartPage'))
const LoginPage = lazy(() => import('@pages/auth/Login/LoginPage'))
const AdminOverview = lazy(
  () => import('@pages/dashboard/admin/Overview/AdminOverview')
)
const ProductManagementPage = lazy(
  () => import('@pages/dashboard/admin/Products/ProductManagementPage')
)
const ManageProductPage = lazy(
  () => import('@pages/dashboard/admin/Products/ManageProductPage')
)
const ServiceManagementPage = lazy(
  () => import('@pages/dashboard/admin/Services/ServiceManagementPage')
)
const InventoryManagementPage = lazy(
  () => import('@pages/dashboard/admin/Inventory/InventoryManagementPage')
)
const ProjectsOperationsPage = lazy(
  () => import('@pages/dashboard/admin/Operations/ProjectsOperationsPage')
)
const SalesOperationsPage = lazy(
  () => import('@pages/dashboard/admin/Operations/SalesOperationsPage')
)
const CreatePosSalePage = lazy(
  () => import('@pages/dashboard/admin/Operations/CreatePosSalePage')
)
const PaymentModesPage = lazy(
  () => import('@pages/dashboard/admin/PaymentModes/PaymentModesPage')
)
const StylingManagementPage = lazy(
  () => import('@pages/dashboard/admin/Styling/StylingManagementPage')
)
const SettingsPage = lazy(
  () => import('@pages/dashboard/admin/Settings/SettingsPage')
)
const NotFoundPage = lazy(() => import('@pages/errors/NotFound/NotFoundPage'))

const Loader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

export const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/styling-studio" element={<StylingStudioPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute requiredRoles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/admin" element={<AdminOverview />} />
            <Route path="/dashboard/admin/products" element={<ProductManagementPage />} />
            <Route path="/dashboard/admin/products/:productId" element={<ManageProductPage />} />
            <Route path="/dashboard/admin/services" element={<ServiceManagementPage />} />
            <Route path="/dashboard/admin/inventory" element={<InventoryManagementPage />} />
            <Route path="/dashboard/admin/projects" element={<ProjectsOperationsPage />} />
            <Route path="/dashboard/admin/sales" element={<SalesOperationsPage />} />
            <Route path="/dashboard/admin/sales/create" element={<CreatePosSalePage />} />
            <Route path="/dashboard/admin/payment-modes" element={<PaymentModesPage />} />
            <Route path="/dashboard/admin/styling" element={<StylingManagementPage />} />
            <Route path="/dashboard/admin/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
