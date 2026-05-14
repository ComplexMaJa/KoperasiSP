import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/** Redirect unauthenticated users to /login */
export function ProtectedRoute() {
  const token    = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

/** Render children only if user has one of the allowed roles */
export function RoleGuard({
  roles,
  children,
  fallback = null,
}: {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const hasRole = useAuthStore((s) => s.hasRole)
  return hasRole(roles) ? <>{children}</> : <>{fallback}</>
}

/** Render children only if user has the given permission */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}
