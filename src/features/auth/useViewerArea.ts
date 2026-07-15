import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { viewerAreaBase } from '@/lib/utils'
import type { UserRole } from '@/types/domain'

export type ViewerArea = {
  /** `/coach` or `/beobachter` */
  areaBase: '/coach' | '/beobachter'
  /** Base for the current learner scope, e.g. `/coach/learners/:id` */
  learnerBase: string
  learnerId?: string
  /** Coach can write; observer is read-only. */
  canEdit: boolean
  role: UserRole
}

/**
 * Coach/observer shared area helpers derived from the signed-in role (and URL prefix).
 */
export function useViewerArea(): ViewerArea | null {
  const { profile } = useAuth()
  const { learnerId } = useParams<{ learnerId: string }>()
  const location = useLocation()

  if (!profile) return null

  const fromUrl = location.pathname.startsWith('/beobachter')
    ? ('/beobachter' as const)
    : location.pathname.startsWith('/coach')
      ? ('/coach' as const)
      : null
  const fromRole = viewerAreaBase(profile.role)
  const areaBase = fromRole ?? fromUrl
  if (!areaBase) return null

  return {
    areaBase,
    learnerBase: learnerId ? `${areaBase}/learners/${learnerId}` : `${areaBase}/learners`,
    learnerId,
    canEdit: profile.role === 'coach',
    role: profile.role,
  }
}
