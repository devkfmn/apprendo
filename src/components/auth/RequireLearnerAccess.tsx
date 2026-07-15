import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { hasViewerLearnerAccess } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'

/** Ensures the signed-in coach or observer is linked to :learnerId. */
export function RequireLearnerAccess() {
  const { learnerId } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!profile?.id || !learnerId) {
        if (!cancelled) setAllowed(false)
        return
      }
      if (profile.role !== 'coach' && profile.role !== 'observer') {
        if (!cancelled) setAllowed(false)
        return
      }
      try {
        const ok = await hasViewerLearnerAccess(profile.id, profile.role, learnerId)
        if (!cancelled) setAllowed(ok)
      } catch {
        if (!cancelled) setAllowed(false)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [profile?.id, profile?.role, learnerId])

  if (allowed === null) {
    return <p className="p-6 text-sm text-ink-muted">Laden…</p>
  }
  if (!allowed) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}
