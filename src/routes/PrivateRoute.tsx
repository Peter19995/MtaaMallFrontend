import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { canAccessDashboard } from '@utils/dashboardAccess'
import { useTenantState } from '@hooks/useTenantState'
import { canAccessWorkspace, experienceFor, workspaceLanding } from '@utils/experiences'

type PrivateRouteProps = {
  requiredRoles?: string[]
  dashboard?: boolean
}

export const PrivateRoute = ({ requiredRoles, dashboard }: PrivateRouteProps) => {
  const { user, isLoading, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.some((r) => hasRole(r))) {
    return <Navigate to="/unauthorized" replace />
  }

  if (dashboard && !canAccessDashboard(user, location.pathname)) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}

export const ActiveBusinessRoute = () => {
  const query = useTenantState()
  if (query.isPending) return <p role="status" className="p-6">Checking business status…</p>
  if (query.isError) return <div role="alert" className="p-6">Unable to verify business status. <button onClick={() => query.refetch()}>Retry</button></div>
  if (['suspended', 'closed'].includes(query.data?.business_status ?? '')) return <p role="alert" className="p-6">POS is unavailable while this business is suspended or closed. Existing sales remain available in Sales.</p>
  return <Outlet />
}

// Verify live membership before mounting operational screens.
export const WorkspaceRoute = () => {
  const query = useTenantState()
  const { pathname } = useLocation()
  if (query.isPending) return <p role="status" className="p-6">Checking workspace access…</p>
  if (query.isError || !query.data) return <div role="alert" className="p-6">Unable to verify workspace access. <button onClick={() => query.refetch()}>Retry</button></div>
  const home = `/${experienceFor(query.data)}`
  const landing = workspaceLanding(query.data)
  if (pathname === home && home !== landing) return <Navigate to={landing} replace />
  if (!canAccessWorkspace(query.data, pathname)) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}
