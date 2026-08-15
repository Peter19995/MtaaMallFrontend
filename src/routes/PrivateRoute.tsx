import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

type PrivateRouteProps = {
  requiredRoles?: string[]
}

export const PrivateRoute = ({ requiredRoles }: PrivateRouteProps) => {
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

  return <Outlet />
}

