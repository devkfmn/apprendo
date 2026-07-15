import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { listLearnersForCoach } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'
import { useGoals } from '@/features/goals/useGoals'
import { useJournal } from '@/features/journal/useJournal'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useSemesters } from '@/features/semesters/useSemesters'
import { getIsoWeekInfo } from '@/lib/week'
import type { UserProfile } from '@/types/domain'

function LearnerCard({ learner, coachId }: { learner: UserProfile; coachId: string }) {
  const { activeSemester } = useSemesters(learner.id)
  const { goals } = useGoals(learner.id)
  const { entries } = useJournal(learner.id)
  const roadmap = useRoadmap({ learnerId: learner.id, role: 'coach', actorId: coachId })
  const currentWeek = getIsoWeekInfo()
  const activeGoals = goals.filter((goal) => goal.semesterId === activeSemester?.id)
  const completedGoals = activeGoals.filter((goal) => goal.status === 'completed').length
  const roadmapItems = roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company])
  const treated = roadmapItems.filter(({ progress }) => progress?.coachConfirmed || progress?.learnerCompleted || progress?.coachCompleted).length
  const latestSubmitted = entries.find((entry) => entry.status === 'submitted')
  const hasCurrentJournal = entries.some((entry) => entry.calendarWeek === currentWeek.calendarWeek && entry.year === currentWeek.year)

  return (
    <Link to={`/coach/learners/${learner.id}`} className="block">
      <Card className="transition hover:border-brand">
        <CardTitle>{learner.displayName}</CardTitle>
        <div className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
          <p>Aktives Semester: <span className="text-ink">{activeSemester?.label ?? 'Keines'}</span></p>
          <p>Ziele: <span className="text-ink">{completedGoals}/{activeGoals.length} erreicht</span></p>
          <p>Roadmap (Q{activeSemester?.primaryImsQuarters.join(' & Q') ?? '–'}): <span className="text-ink">{treated}/{roadmapItems.length} behandelt</span></p>
          <p>Letzter Rückblick: <span className="text-ink">{latestSubmitted?.submittedAt ? new Date(latestSubmitted.submittedAt).toLocaleDateString('de-CH') : 'Noch keiner'}</span></p>
        </div>
        {!hasCurrentJournal ? <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-800">Für die aktuelle Kalenderwoche liegt noch kein Wochenrückblick vor.</p> : null}
      </Card>
    </Link>
  )
}

export function LearnerListPage() {
  const { profile } = useAuth()
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!profile) return
    void listLearnersForCoach(profile.id).then(setLearners).catch(() => setError('Lernende konnten nicht geladen werden.')).finally(() => setLoading(false))
  }, [profile])
  const content = useMemo(() => {
    if (loading) return <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
    if (error) return <p className="text-sm text-danger">{error}</p>
    if (!learners.length) return <p className="text-sm text-ink-muted">Dir sind noch keine Lernenden zugeordnet.</p>
    return <div className="space-y-4">{learners.map((learner) => <LearnerCard key={learner.id} learner={learner} coachId={profile?.id ?? ''} />)}</div>
  }, [error, learners, loading, profile?.id])
  return <><PageHeader title="Lernende" description="Lernstand und aktuelle Rückblicke im Überblick" />{content}</>
}
