import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { getCoachLearnerRelation } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'

/** Ensures the signed-in coach is linked to :learnerId before rendering coach learner routes. */
export function RequireCoachLearner() {
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
      try {
        const relation = await getCoachLearnerRelation(profile.id, learnerId)
        if (!cancelled) setAllowed(Boolean(relation))
      } catch {
        if (!cancelled) setAllowed(false)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [profile?.id, learnerId])

  if (allowed === null) {
    return <p className="p-6 text-sm text-ink-muted">Laden…</p>
  }
  if (!allowed) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}
