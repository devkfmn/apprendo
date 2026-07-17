import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { CommentActivityHints } from '@/features/comments/CommentActivityHints'
import { useUnreadCommentHints } from '@/features/comments/useCommentHints'
import { countGoalsByAssessment } from '@/features/goals/GoalList'
import { useGoals } from '@/features/goals/useGoals'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { useJournal } from '@/features/journal/useJournal'
import { useReports } from '@/features/reports/useReports'
import { isRoadmapTreated } from '@/features/roadmap/api'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { getIsoWeekInfo } from '@/lib/week'

export function OverviewPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)
  const { entries, loading: journalLoading } = useJournal(learnerId)
  const { reports, loading: reportsLoading } = useReports(learnerId)
  const roadmap = useRoadmap({ learnerId: learnerId ?? '', role: 'learner', actorId: learnerId ?? '' })
  const { hints: commentHints } = useUnreadCommentHints({
    viewerId: profile?.id,
    learnerId,
    journals: entries.filter((entry) => entry.status === 'submitted'),
    reports: reports.filter((report) => report.status === 'submitted'),
  })

  const loading =
    semestersLoading || goalsLoading || journalLoading || reportsLoading || roadmap.loading
  const counts = countGoalsByAssessment(goals, activeSemester?.id)
  const roadmapItems = roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company])
  const treatedItems = roadmapItems.filter(({ progress }) => isRoadmapTreated(progress)).length
  const latestJournal = entries[0]
  const latestReport = reports[0]
  const thisWeek = getIsoWeekInfo()
  const hasThisWeek = entries.some(
    (entry) => entry.calendarWeek === thisWeek.calendarWeek && entry.year === thisWeek.year,
  )

  return (
    <>
      <PageHeader title="Übersicht" description="Ihr aktueller Lernstand" />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-4">
          <CommentActivityHints
            hints={commentHints}
            hrefFor={(hint) =>
              hint.targetKind === 'journal'
                ? `/journal/${hint.targetId}`
                : `/reports/${hint.targetId}`
            }
          />

          <Card>
            <CardTitle>Aktuelles Semester</CardTitle>
            {activeSemester ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-medium">{activeSemester.label}</span>
                <Badge>Aktuell</Badge>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Derzeit kein aktuelles Semester.</p>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Wochenrückblicke</CardTitle>
                {latestJournal ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    Letzter Eintrag: KW {latestJournal.calendarWeek}/{latestJournal.year} (
                    {latestJournal.status === 'submitted' ? 'eingereicht' : 'Entwurf'})
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">Noch kein Wochenrückblick vorhanden.</p>
                )}
                {!hasThisWeek ? (
                  <p className="mt-2 text-sm text-amber-800">
                    Für diese Woche hast du noch keinen Wochenrückblick erstellt.
                  </p>
                ) : null}
              </div>
              <Link to="/journal/new">
                <Button>Wochenrückblick erstellen</Button>
              </Link>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Lernberichte</CardTitle>
                {latestReport ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    Letzter Bericht: {latestReport.title} (
                    {latestReport.status === 'submitted' ? 'eingereicht' : 'Entwurf'})
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">Noch kein Lernbericht vorhanden.</p>
                )}
              </div>
              <Link to="/reports/new">
                <Button>Lernbericht erstellen</Button>
              </Link>
            </div>
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
            <Link to="/goals" className="mt-4 inline-block text-sm text-brand underline">
              Alle Ziele anzeigen
            </Link>
          </Card>

          <Card>
            <CardTitle>Roadmap</CardTitle>
            {activeSemester ? (
              <>
                <p className="mt-2 text-sm text-ink-muted">
                  Aktuelle IMS-Quartale: Q{activeSemester.primaryImsQuarters.join(' und Q')}
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {treatedItems}/{roadmapItems.length}
                </p>
                <p className="text-sm text-ink-muted">Themen behandelt</p>
                <Link to="/roadmap" className="mt-4 inline-block text-sm text-brand underline">
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
