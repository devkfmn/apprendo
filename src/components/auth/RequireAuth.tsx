import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AppLoadingScreen } from '@/components/brand/AppLoadingScreen'
import type { UserRole } from '@/types/domain'
import { useAuth } from '@/features/auth/useAuth'

export function RequireAuth({
  roles,
  children,
}: PropsWithChildren<{ roles?: UserRole | UserRole[] }>) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AppLoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile) return <Navigate to="/forbidden" replace />

  const allowedRoles = roles ? (Array.isArray(roles) ? roles : [roles]) : undefined
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}
