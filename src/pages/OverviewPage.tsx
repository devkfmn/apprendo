import { useAuth } from '@/features/auth/useAuth'
import { LearnerStatusOverview } from '@/features/overview/LearnerStatusOverview'

export function OverviewPage() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <LearnerStatusOverview
      learnerId={profile.id}
      title="Übersicht"
      description="Ihr aktueller Lernstand"
      basePath=""
      roadmapRole="learner"
      actorId={profile.id}
      goalsLinkLabel="Ziele ansehen"
      showSupportTeam
    />
  )
}
