import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserProfile } from '@/features/auth/api'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { CommentActivityHints } from '@/features/comments/CommentActivityHints'
import { useUnreadCommentHints } from '@/features/comments/useCommentHints'
import { countGoalsByAssessment } from '@/features/goals/GoalList'
import { useGoals } from '@/features/goals/useGoals'
import { useJournal } from '@/features/journal/useJournal'
import { useReports } from '@/features/reports/useReports'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { getIsoWeekInfo } from '@/lib/week'
import { isRoadmapTreated } from '@/features/roadmap/api'

export function LearnerOverviewPage() {
  const { learnerId } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const { activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)
  const { entries, loading: journalLoading } = useJournal(learnerId, { submittedOnly: true })
  const { reports, loading: reportsLoading } = useReports(learnerId, { submittedOnly: true })
  const roadmap = useRoadmap({
    learnerId: learnerId ?? '',
    role: profile?.role === 'observer' ? 'observer' : 'coach',
    actorId: profile?.id ?? '',
  })
  const { hints: commentHints } = useUnreadCommentHints({
    viewerId: profile?.id,
    learnerId,
    journals: entries,
    reports,
  })

  const [learnerName, setLearnerName] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) return
    void getUserProfile(learnerId).then((user) => {
      setLearnerName(user?.displayName ?? null)
    })
  }, [learnerId])

  const loading =
    semestersLoading || goalsLoading || journalLoading || reportsLoading || roadmap.loading
  const counts = countGoalsByAssessment(goals, activeSemester?.id)
  const base = viewer?.learnerBase ?? `/coach/learners/${learnerId}`
  const roadmapItems = roadmap.quarters.flatMap((quarter) => [
    ...quarter.school,
    ...quarter.company,
  ])
  const treatedItems = roadmapItems.filter(({ progress }) => isRoadmapTreated(progress)).length
  const latestJournal = entries[0]
  const latestReport = reports[0]
  const thisWeek = getIsoWeekInfo()
  const hasThisWeek = entries.some(
    (entry) =>
      entry.calendarWeek === thisWeek.calendarWeek && entry.year === thisWeek.year,
  )

  return (
    <>
      <PageHeader
        title="Lernenden-Übersicht"
        description={learnerName ?? learnerId}
      />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-4">
          <CommentActivityHints
            hints={commentHints}
            hrefFor={(hint) =>
              hint.targetKind === 'journal'
                ? `${base}/journal/${hint.targetId}`
                : `${base}/reports/${hint.targetId}`
            }
          />

          <Card>
            <CardTitle>Aktives Semester</CardTitle>
            {activeSemester ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-medium">{activeSemester.label}</span>
                <Badge>Aktiv</Badge>
                <span className="text-sm text-ink-muted">
                  Q{activeSemester.primaryImsQuarters.join(' & Q')}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Derzeit kein aktives Semester.
              </p>
            )}
            <Link
              to={`${base}/semesters`}
              className="mt-3 inline-block text-sm text-brand underline"
            >
              Semester {viewer?.canEdit ? 'verwalten' : 'ansehen'}
            </Link>
          </Card>

          <Card>
            <CardTitle>Wochenrückblicke</CardTitle>
            {latestJournal ? (
              <p className="mt-2 text-sm text-ink-muted">
                Letzter Eintrag: KW {latestJournal.calendarWeek}/{latestJournal.year} (eingereicht)
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">Noch kein Wochenrückblick vorhanden.</p>
            )}
            {!hasThisWeek ? (
              <p className="mt-2 text-sm text-amber-800">
                Für die aktuelle Woche liegt noch kein Wochenrückblick vor.
              </p>
            ) : null}
            <Link
              to={`${base}/journal`}
              className="mt-3 inline-block text-sm text-brand underline"
            >
              Wochenrückblicke ansehen
            </Link>
          </Card>

          <Card>
            <CardTitle>Lernberichte</CardTitle>
            {latestReport ? (
              <p className="mt-2 text-sm text-ink-muted">
                Letzter Bericht: {latestReport.title} (eingereicht)
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">Noch kein Lernbericht vorhanden.</p>
            )}
            <Link
              to={`${base}/reports`}
              className="mt-3 inline-block text-sm text-brand underline"
            >
              Berichte ansehen
            </Link>
          </Card>

          <Card>
            <CardTitle>Ziele</CardTitle>
            {activeSemester ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-line p-3 text-center">
                  <p className="text-2xl font-semibold">{counts.unassessed}</p>
                  <p className="text-sm text-ink-muted">Ohne Beurteilung</p>
                </div>
                <div className="rounded-md border border-line p-3 text-center">
                  <p className="text-2xl font-semibold">{counts.assessed}</p>
                  <p className="text-sm text-ink-muted">Beurteilt</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Zielstatistik verfügbar, sobald ein Semester aktiv ist.
              </p>
            )}
            <Link
              to={`${base}/goals`}
              className="mt-4 inline-block text-sm text-brand underline"
            >
              Ziele {viewer?.canEdit ? 'verwalten' : 'ansehen'}
            </Link>
          </Card>

          <Card>
            <CardTitle>Roadmap</CardTitle>
            {activeSemester ? (
              <>
                <p className="mt-3 text-2xl font-semibold">
                  {treatedItems}/{roadmapItems.length}
                </p>
                <p className="text-sm text-ink-muted">Themen behandelt</p>
                <Link
                  to={`${base}/roadmap`}
                  className="mt-4 inline-block text-sm text-brand underline"
                >
                  Roadmap öffnen
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Die Roadmap wird mit einem aktiven Semester angezeigt.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
