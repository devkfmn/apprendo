import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getUserProfile } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { LearnerStatusOverview } from '@/features/overview/LearnerStatusOverview'

export function LearnerOverviewPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const [learnerName, setLearnerName] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) return
    void getUserProfile(learnerId).then((user) => {
      setLearnerName(user?.displayName ?? null)
    })
  }, [learnerId])

  if (!learnerId || !profile) return null

  return (
    <LearnerStatusOverview
      learnerId={learnerId}
      title="Lernenden-Übersicht"
      description={learnerName ?? learnerId}
      basePath={viewer?.learnerBase ?? `/coach/learners/${learnerId}`}
      roadmapRole={profile.role === 'observer' ? 'observer' : 'coach'}
      actorId={profile.id}
      showSemesterLink
      semesterLinkLabel={viewer?.canEdit ? 'Semester verwalten' : 'Semester ansehen'}
      goalsLinkLabel={viewer?.canEdit ? 'Ziele verwalten' : 'Ziele ansehen'}
    />
  )
}
