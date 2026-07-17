import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AppLoadingScreen } from '@/components/brand/AppLoadingScreen'
import { useAuth } from '@/features/auth/useAuth'
import { profileHome, profileIsAdmin } from '@/lib/utils'

/**
 * Admin-only gate. Non-admins are sent to their normal home without revealing
 * that an admin surface exists (no /forbidden for this path).
 */
export function RequireAdmin({ children }: PropsWithChildren) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AppLoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile || !profileIsAdmin(profile)) {
    return <Navigate to={profile ? profileHome(profile) : '/'} replace />
  }
  return <>{children}</>
}
