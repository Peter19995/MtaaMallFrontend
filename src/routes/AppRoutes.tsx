import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PrivateRoute, ActiveBusinessRoute, WorkspaceRoute } from './PrivateRoute'
import { useAuth } from '@hooks/useAuth'
import { canonicalDashboardPath } from '@utils/experiences'
import WorkspaceHome from '@pages/dashboard/WorkspaceHome'
import AuditApprovalsPage from '@pages/dashboard/AuditApprovalsPage'
import SecurityPage from '@pages/auth/SecurityPage'
import VerifyEmailPage from '@pages/auth/VerifyEmail/VerifyEmailPage'
import ResetPasswordPage from '@pages/auth/ResetPassword/ResetPasswordPage'
import { MainLayout } from '@layouts/MainLayout/MainLayout'
import { DashboardLayout } from '@layouts/DashboardLayout/DashboardLayout'
import { AccountLayout, AccountOverview, AccountProfile, AccountAddresses, AccountOrders, AccountOrderDetails, AccountPayments, AccountReturns, AccountLoyalty, AccountCheckout, AccountSavedProducts } from '@pages/customer/AccountPages'

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
const RegisterPage = lazy(() => import('@pages/auth/Register/RegisterPage'))
const AcceptInvitationPage = lazy(() => import('@pages/auth/AcceptInvitation/AcceptInvitationPage'))
const BusinessInvitationAcceptPage = lazy(() => import('@pages/auth/AcceptInvitation/BusinessInvitationAcceptPage'))
const PlatformBusinessesPage = lazy(() => import('@pages/dashboard/business/PlatformBusinessesPage'))
const PlatformMpesaPage = lazy(() => import('@pages/dashboard/admin/PlatformPayments/PlatformMpesaPage'))
const PlatformPaymentsOverviewPage = lazy(() => import('@pages/dashboard/admin/PlatformPayments/PlatformPaymentPages').then(module => ({ default: module.PlatformPaymentsOverviewPage })))
const PlatformTransactionsPage = lazy(() => import('@pages/dashboard/admin/PlatformPayments/PlatformPaymentPages').then(module => ({ default: module.PlatformTransactionsPage })))
const PlatformReconciliationPage = lazy(() => import('@pages/dashboard/admin/PlatformPayments/PlatformPaymentPages').then(module => ({ default: module.PlatformReconciliationPage })))
const PlatformSettlementsPage = lazy(() => import('@pages/dashboard/admin/PlatformPayments/PlatformPaymentPages').then(module => ({ default: module.PlatformSettlementsPage })))
const MyBusinessPage = lazy(() => import('@pages/dashboard/business/MyBusinessPage'))
const WorkspacesPage = lazy(() => import('@pages/customer/WorkspacesPage'))
const MembershipManagementPage = lazy(() => import('@pages/dashboard/business/MembershipManagementPage'))
const BusinessOverviewPage = lazy(() => import('@pages/dashboard/business/BusinessOverviewPage'))
const UnauthorizedPage = lazy(() => import('@pages/errors/Unauthorized/UnauthorizedPage'))
const AdminOverview = lazy(
  () => import('@pages/dashboard/admin/Overview/AdminOverview')
)
const ProductManagementPage = lazy(
  () => import('@pages/dashboard/admin/Products/ProductManagementPage')
)
const ProductCategoriesPage = lazy(
  () => import('@pages/dashboard/admin/Products/ProductCategoriesPage')
)
const ManageProductPage = lazy(
  () => import('@pages/dashboard/admin/Products/ManageProductPage')
)
const VariantOptionsPage = lazy(
  () => import('@pages/dashboard/admin/Products/ProductSettingsPage')
)
const ServiceManagementPage = lazy(
  () => import('@pages/dashboard/admin/Services/ServiceManagementPage')
)
const InventoryManagementPage = lazy(
  () => import('@pages/dashboard/admin/Inventory/InventoryManagementPage')
)
const BranchesManagementPage = lazy(
  () => import('@pages/dashboard/admin/Branches/BranchesManagementPage')
)
const CustomersManagementPage = lazy(
  () => import('@pages/dashboard/admin/Customers/CustomersManagementPage')
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

const LegacyDashboard = () => {
  const { user } = useAuth()
  const location = useLocation()
  return <Navigate to={canonicalDashboardPath(user ?? {}, location.pathname) + location.search + location.hash} state={location.state} replace />
}

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
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/customer/profile" element={<Navigate to="/account/profile" replace />} />
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<AccountOverview />} />
              <Route path="profile" element={<AccountProfile />} />
              <Route path="addresses" element={<AccountAddresses />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<AccountCheckout />} />
              <Route path="orders" element={<AccountOrders />} />
              <Route path="orders/:id" element={<AccountOrderDetails />} />
              <Route path="payments" element={<AccountPayments />} />
              <Route path="returns" element={<AccountReturns />} />
              <Route path="loyalty" element={<AccountLoyalty />} />
              <Route path="saved" element={<AccountSavedProducts />} />
            </Route>
          </Route>
        </Route>

        <Route element={<PrivateRoute />}><Route element={<MainLayout />}>
          <Route path="/account/workspaces" element={<WorkspacesPage />} />
        </Route></Route>
        <Route element={<PrivateRoute />}>
          <Route path="/business/invitations/accept" element={<BusinessInvitationAcceptPage />} />
        </Route>

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard/*" element={<LegacyDashboard />} />
          <Route element={<WorkspaceRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/platform" element={<WorkspaceHome />} />
              <Route path="/platform/audit" element={<AuditApprovalsPage />} />
              <Route path="/platform/businesses" element={<PlatformBusinessesPage />} />
              <Route path="/platform/payments" element={<PlatformPaymentsOverviewPage />} />
              <Route path="/platform/payments/mpesa" element={<PlatformMpesaPage />} />
              <Route path="/platform/payments/transactions" element={<PlatformTransactionsPage />} />
              <Route path="/platform/payments/reconciliation" element={<PlatformReconciliationPage />} />
              <Route path="/platform/settlements" element={<PlatformSettlementsPage />} />
              <Route path="/platform/businesses/:id/payments" element={<PlatformMpesaPage />} />
              <Route path="/platform/admins" element={<MembershipManagementPage scope="platform" />} />
              {['business', 'employee'].map(experience => <Route key={experience}>
                <Route path={`/${experience}/audit`} element={<AuditApprovalsPage />} />
                <Route path={`/${experience}/approvals`} element={<AuditApprovalsPage approvals />} />
                <Route path={`/${experience}`} element={experience === 'business' ? <BusinessOverviewPage /> : <WorkspaceHome />} />
                <Route path={`/${experience}/onboarding`} element={<WorkspaceHome lifecycle />} />
                <Route path={`/${experience}/suspended`} element={<WorkspaceHome lifecycle />} />
                <Route path={`/${experience}/profile`} element={<MyBusinessPage />} />
                <Route path={`/${experience}/members`} element={<MembershipManagementPage />} />
                <Route path={`/${experience}/overview`} element={<AdminOverview />} />
                <Route path={`/${experience}/products`} element={<ProductManagementPage />} />
                <Route path={`/${experience}/product-categories`} element={<ProductCategoriesPage />} />
                <Route path={`/${experience}/products/new`} element={<Navigate to={`/${experience}/products`} state={{ openProductForm: true }} replace />} />
                <Route path={`/${experience}/variant-options`} element={<VariantOptionsPage />} />
                <Route path={`/${experience}/products/:productId`} element={<ManageProductPage />} />
                <Route path={`/${experience}/services`} element={<ServiceManagementPage />} />
                <Route path={`/${experience}/branches`} element={<BranchesManagementPage />} />
                <Route path={`/${experience}/customers`} element={<CustomersManagementPage />} />
                <Route path={`/${experience}/inventory`} element={<InventoryManagementPage view="status" />} />
                <Route path={`/${experience}/inventory/restocks`} element={<InventoryManagementPage view="restocks" />} />
                <Route path={`/${experience}/inventory/stock-counts`} element={<InventoryManagementPage view="stock-counts" />} />
                <Route path={`/${experience}/inventory/alerts`} element={<InventoryManagementPage view="alerts" />} />
                <Route path={`/${experience}/projects`} element={<ProjectsOperationsPage />} />
                <Route path={`/${experience}/sales`} element={<SalesOperationsPage />} />
                <Route element={<ActiveBusinessRoute />}>
                  <Route path={`/${experience}/sales/create`} element={<CreatePosSalePage />} />
                </Route>
                <Route path={`/${experience}/payment-modes`} element={<PaymentModesPage />} />
                <Route path={`/${experience}/styling`} element={<StylingManagementPage />} />
                <Route path={`/${experience}/settings`} element={<SettingsPage />} />
              </Route>)}
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
