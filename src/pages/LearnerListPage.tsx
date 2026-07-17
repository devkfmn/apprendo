import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { listLearnersForViewer } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { useLearnerActivitySignals } from '@/features/comments/useCommentHints'
import { useGoals } from '@/features/goals/useGoals'
import { useJournal } from '@/features/journal/useJournal'
import { useReports } from '@/features/reports/useReports'
import { isRoadmapTreated } from '@/features/roadmap/api'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useSemesters } from '@/features/semesters/useSemesters'
import { getIsoWeekInfo } from '@/lib/week'
import { formatDate } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types/domain'

function LearnerCard({
  learner,
  viewerId,
  viewerRole,
  areaBase,
}: {
  learner: UserProfile
  viewerId: string
  viewerRole: UserRole
  areaBase: '/coach' | '/beobachter'
}) {
  const { activeSemester } = useSemesters(learner.id)
  const { goals } = useGoals(learner.id)
  const { entries } = useJournal(learner.id, { submittedOnly: true })
  const { reports } = useReports(learner.id, { submittedOnly: true })
  const roadmap = useRoadmap({
    learnerId: learner.id,
    role: viewerRole,
    actorId: viewerId,
  })
  const { signals } = useLearnerActivitySignals({
    viewerId,
    learnerId: learner.id,
    journals: entries,
    reports,
  })
  const currentWeek = getIsoWeekInfo()
  const activeGoals = goals.filter((goal) => goal.semesterId === activeSemester?.id)
  const assessedGoals = activeGoals.filter((goal) => Boolean(goal.assessmentGrade)).length
  const roadmapItems = roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company])
  const treated = roadmapItems.filter(({ progress }) => isRoadmapTreated(progress)).length
  const latestJournal = entries.find((entry) => entry.status === 'submitted')
  const latestReport = reports[0]
  const hasCurrentJournal = entries.some(
    (entry) =>
      entry.calendarWeek === currentWeek.calendarWeek && entry.year === currentWeek.year,
  )
  const hasActivity =
    signals.unreadComments > 0 ||
    signals.unreadJournals > 0 ||
    signals.unreadReports > 0

  return (
    <Link to={`${areaBase}/learners/${learner.id}`} className="block">
      <Card className="transition hover:border-brand">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>{learner.displayName}</CardTitle>
          {hasActivity ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {signals.unreadComments > 0 ? (
                <Badge variant="warning">
                  {signals.unreadComments === 1
                    ? 'Neuer Kommentar'
                    : `${signals.unreadComments} neue Kommentare`}
                </Badge>
              ) : null}
              {signals.unreadJournals > 0 ? (
                <Badge variant="warning">
                  {signals.unreadJournals === 1
                    ? 'Neuer Wochenrückblick'
                    : `${signals.unreadJournals} neue Wochenrückblicke`}
                </Badge>
              ) : null}
              {signals.unreadReports > 0 ? (
                <Badge variant="warning">
                  {signals.unreadReports === 1
                    ? 'Neuer Lernbericht'
                    : `${signals.unreadReports} neue Lernberichte`}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
          <p>
            Aktuelles Semester:{' '}
            <span className="text-ink">{activeSemester?.label ?? 'Keines'}</span>
          </p>
          <p>
            Ziele:{' '}
            <span className="text-ink">
              {assessedGoals}/{activeGoals.length} beurteilt
            </span>
          </p>
          <p>
            Roadmap (Q{activeSemester?.primaryImsQuarters.join(' & Q') ?? '–'}):{' '}
            <span className="text-ink">
              {treated}/{roadmapItems.length} behandelt
            </span>
          </p>
          <p>
            Letzter Wochenrückblick:{' '}
            <span className="text-ink">
              {latestJournal?.submittedAt
                ? formatDate(latestJournal.submittedAt)
                : 'Noch keiner'}
            </span>
          </p>
          <p>
            Letzter Lernbericht:{' '}
            <span className="text-ink">
              {latestReport?.submittedAt
                ? formatDate(latestReport.submittedAt)
                : latestReport
                  ? formatDate(latestReport.updatedAt)
                  : 'Noch keiner'}
            </span>
          </p>
        </div>
        {!hasCurrentJournal ? (
          <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-800">
            Für die aktuelle Kalenderwoche liegt noch kein Wochenrückblick vor.
          </p>
        ) : null}
      </Card>
    </Link>
  )
}

export function LearnerListPage() {
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || (profile.role !== 'coach' && profile.role !== 'observer')) return
    void listLearnersForViewer(profile.id, profile.role)
      .then(setLearners)
      .catch(() => setError('Lernende konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [profile])

  const content = useMemo(() => {
    if (!viewer || !profile) return null
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )
    }
    if (error) return <p className="text-sm text-danger">{error}</p>
    if (!learners.length) {
      return (
        <p className="text-sm text-ink-muted">Dir sind noch keine Lernenden zugeordnet.</p>
      )
    }
    return (
      <div className="space-y-4">
        {learners.map((learner) => (
          <LearnerCard
            key={learner.id}
            learner={learner}
            viewerId={profile.id}
            viewerRole={profile.role}
            areaBase={viewer.areaBase}
          />
        ))}
      </div>
    )
  }, [error, learners, loading, profile, viewer])

  return (
    <>
      <PageHeader
        title="Lernende"
        description={
          profile?.role === 'observer'
            ? 'Lernstände einsehen (nur Lesen)'
            : 'Lernstand und aktuelle Wochenrückblicke im Überblick'
        }
      />
      {content}
    </>
  )
}
