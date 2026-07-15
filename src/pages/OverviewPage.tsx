import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { countGoalsByStatus } from '@/features/goals/GoalList'
import { useGoals } from '@/features/goals/useGoals'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { useJournal } from '@/features/journal/useJournal'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { getIsoWeekInfo } from '@/lib/week'

export function OverviewPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)
  const { entries, loading: journalLoading } = useJournal(learnerId)
  const roadmap = useRoadmap({ learnerId: learnerId ?? '', role: 'learner', actorId: learnerId ?? '' })

  const loading = semestersLoading || goalsLoading || journalLoading || roadmap.loading
  const counts = countGoalsByStatus(goals, activeSemester?.id)
  const roadmapItems = roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company])
  const treatedItems = roadmapItems.filter(({ progress }) => progress?.learnerCompleted || progress?.coachCompleted || progress?.coachConfirmed).length
  const latestJournal = entries[0]
  const thisWeek = getIsoWeekInfo()
  const hasThisWeek = entries.some((entry) => entry.calendarWeek === thisWeek.calendarWeek && entry.year === thisWeek.year)

  return (
    <>
      <PageHeader title="Übersicht" description="Ihr aktueller Lernstand" />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardTitle>Aktives Semester</CardTitle>
            {activeSemester ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-medium">{activeSemester.label}</span>
                <Badge>Aktiv</Badge>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Derzeit kein aktives Semester.
              </p>
            )}
          </Card>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Wochenrückblick</CardTitle>
                {latestJournal ? <p className="mt-2 text-sm text-ink-muted">Letzter Eintrag: KW {latestJournal.calendarWeek}/{latestJournal.year} ({latestJournal.status === 'submitted' ? 'eingereicht' : 'Entwurf'})</p> : <p className="mt-2 text-sm text-ink-muted">Noch kein Wochenrückblick vorhanden.</p>}
                {!hasThisWeek ? <p className="mt-2 text-sm text-amber-800">Für diese Woche hast du noch keinen Rückblick erstellt.</p> : null}
              </div>
              <Link to="/journal/new"><Button>Wochenrückblick erstellen</Button></Link>
            </div>
          </Card>
          <Card>
            <CardTitle>Roadmap</CardTitle>
            {activeSemester ? (
              <>
                <p className="mt-2 text-sm text-ink-muted">Aktuelle IMS-Quartale: Q{activeSemester.primaryImsQuarters.join(' und Q')}</p>
                <p className="mt-3 text-2xl font-semibold">{treatedItems}/{roadmapItems.length}</p>
                <p className="text-sm text-ink-muted">Themen behandelt oder bestätigt</p>
                <Link to="/roadmap" className="mt-4 inline-block text-sm text-brand underline">Roadmap öffnen</Link>
              </>
            ) : <p className="mt-3 text-sm text-ink-muted">Die Roadmap wird mit einem aktiven Semester angezeigt.</p>}
          </Card>

          <Card>
            <CardTitle>Ziele</CardTitle>
            {activeSemester ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-line p-3 text-center">
                  <p className="text-2xl font-semibold">{counts.open}</p>
                  <p className="text-sm text-ink-muted">Offen</p>
                </div>
                <div className="rounded-md border border-line p-3 text-center">
                  <p className="text-2xl font-semibold">{counts.in_progress}</p>
                  <p className="text-sm text-ink-muted">In Bearbeitung</p>
                </div>
                <div className="rounded-md border border-line p-3 text-center">
                  <p className="text-2xl font-semibold">{counts.completed}</p>
                  <p className="text-sm text-ink-muted">Erreicht</p>
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
        </div>
      )}
    </>
  )
}
