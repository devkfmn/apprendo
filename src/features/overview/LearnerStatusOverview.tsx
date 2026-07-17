import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getUserProfile,
  listCoachesForLearner,
  listObserversForLearner,
} from '@/features/auth/api'
import { CommentActivityHints } from '@/features/comments/CommentActivityHints'
import { useUnreadCommentHints } from '@/features/comments/useCommentHints'
import { countGoalsByAssessment } from '@/features/goals/GoalList'
import { useGoals } from '@/features/goals/useGoals'
import { countJournalSemesterStats } from '@/features/journal/stats'
import { useJournal } from '@/features/journal/useJournal'
import { useReports } from '@/features/reports/useReports'
import { isRoadmapTreated } from '@/features/roadmap/api'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { resolveSemesterId } from '@/features/semesters/SemesterFilterSelect'
import { useSemesters } from '@/features/semesters/useSemesters'
import { getIsoWeekInfo } from '@/lib/week'
import type { UserProfile, UserRole } from '@/types/domain'

type LearnerStatusOverviewProps = {
  learnerId: string
  title: string
  description?: string | null
  /** Base path for section links, e.g. `` or `/coach/learners/:id`. */
  basePath: string
  roadmapRole: UserRole
  actorId: string
  showSemesterLink?: boolean
  semesterLinkLabel?: string
  goalsLinkLabel?: string
  /** Show assigned coaches and observers (learner overview). */
  showSupportTeam?: boolean
}

function nameList(people: UserProfile[]) {
  if (people.length === 0) return 'Noch niemand zugewiesen'
  return people.map((person) => person.displayName).join(', ')
}

export function LearnerStatusOverview({
  learnerId,
  title,
  description,
  basePath,
  roadmapRole,
  actorId,
  showSemesterLink = false,
  semesterLinkLabel = 'Semester ansehen',
  goalsLinkLabel = 'Ziele ansehen',
  showSupportTeam = false,
}: LearnerStatusOverviewProps) {
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)
  const { entries, loading: journalLoading } = useJournal(learnerId, { submittedOnly: true })
  const { reports, loading: reportsLoading } = useReports(learnerId, { submittedOnly: true })
  const roadmap = useRoadmap({
    learnerId,
    role: roadmapRole,
    actorId,
  })
  const { hints: commentHints } = useUnreadCommentHints({
    viewerId: actorId,
    learnerId,
    journals: entries,
    reports,
  })

  const [lehrbeginnYear, setLehrbeginnYear] = useState<number | null>(null)
  const [coaches, setCoaches] = useState<UserProfile[]>([])
  const [observers, setObservers] = useState<UserProfile[]>([])
  const [supportLoading, setSupportLoading] = useState(showSupportTeam)

  useEffect(() => {
    if (!learnerId) return
    void getUserProfile(learnerId).then((user) => {
      setLehrbeginnYear(user?.lehrbeginnYear ?? null)
    })
  }, [learnerId])

  useEffect(() => {
    if (!showSupportTeam || !learnerId) {
      setCoaches([])
      setObservers([])
      setSupportLoading(false)
      return
    }
    let cancelled = false
    setSupportLoading(true)
    void Promise.all([
      listCoachesForLearner(learnerId),
      listObserversForLearner(learnerId),
    ])
      .then(([nextCoaches, nextObservers]) => {
        if (cancelled) return
        setCoaches(nextCoaches)
        setObservers(nextObservers)
      })
      .finally(() => {
        if (!cancelled) setSupportLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [learnerId, showSupportTeam])

  const loading =
    semestersLoading ||
    goalsLoading ||
    journalLoading ||
    reportsLoading ||
    roadmap.loading ||
    supportLoading
  const counts = countGoalsByAssessment(goals, activeSemester?.id)
  const journalStats = countJournalSemesterStats(entries, activeSemester, {
    throughDate: new Date(),
  })
  const reportsThisSemester = activeSemester
    ? reports.filter(
        (report) => resolveSemesterId(report, semesters) === activeSemester.id,
      ).length
    : 0
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

  const href = (path: string) => `${basePath}${path}`

  return (
    <>
      <PageHeader title={title} description={description ?? undefined} />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-4">
          <CommentActivityHints
            hints={commentHints}
            hrefFor={(hint) =>
              hint.targetKind === 'journal'
                ? href(`/journal/${hint.targetId}`)
                : href(`/reports/${hint.targetId}`)
            }
          />

          {showSupportTeam ? (
            <Card>
              <CardTitle>Dein Begleitteam</CardTitle>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="text-ink-muted">
                    {coaches.length === 1 ? 'Coach: ' : 'Coaches: '}
                  </span>
                  <span className="font-medium">{nameList(coaches)}</span>
                </p>
                <p>
                  <span className="text-ink-muted">Beobachter: </span>
                  <span className="font-medium">{nameList(observers)}</span>
                </p>
              </div>
            </Card>
          ) : null}
          <Card>
            <CardTitle>Aktuelles Semester</CardTitle>
            {activeSemester ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-medium">{activeSemester.label}</span>
                <Badge>Aktuell</Badge>
                <span className="text-sm text-ink-muted">
                  Q{activeSemester.primaryImsQuarters.join(' & Q')}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Derzeit kein aktuelles Semester (kein Datumsbereich trifft zu).
              </p>
            )}
            {lehrbeginnYear != null ? (
              <p className="mt-2 text-sm text-ink-muted">Lehrbeginn {lehrbeginnYear}</p>
            ) : null}
            {showSemesterLink ? (
              <Link
                to={href('/semesters')}
                className="mt-3 inline-block text-sm text-brand underline"
              >
                {semesterLinkLabel}
              </Link>
            ) : null}
          </Card>

          <Card>
            <CardTitle>Wochenrückblicke</CardTitle>
            {activeSemester ? (
              <>
                <CardDescription>
                  Im aktuellen Semester ({activeSemester.label})
                </CardDescription>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">{journalStats.submitted}</p>
                    <p className="text-sm text-ink-muted">Geschrieben</p>
                  </div>
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">{journalStats.missing}</p>
                    <p className="text-sm text-ink-muted">Fehlend</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Statistik verfügbar, sobald ein Semester aktiv ist.
              </p>
            )}
            {latestJournal ? (
              <p className="mt-3 text-sm text-ink-muted">
                Letzter Eintrag: KW {latestJournal.calendarWeek}/{latestJournal.year} (eingereicht)
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Noch kein Wochenrückblick vorhanden.</p>
            )}
            {!hasThisWeek ? (
              <p className="mt-2 text-sm text-amber-800">
                Für die aktuelle Woche liegt noch kein Wochenrückblick vor.
              </p>
            ) : null}
            <Link
              to={href('/journal')}
              className="mt-3 inline-block text-sm text-brand underline"
            >
              Wochenrückblicke ansehen
            </Link>
          </Card>

          <Card>
            <CardTitle>Lernberichte</CardTitle>
            {activeSemester ? (
              <>
                <CardDescription>
                  Im aktuellen Semester ({activeSemester.label})
                </CardDescription>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">{reportsThisSemester}</p>
                    <p className="text-sm text-ink-muted">Geschrieben</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Statistik verfügbar, sobald ein Semester aktiv ist.
              </p>
            )}
            {latestReport ? (
              <p className="mt-3 text-sm text-ink-muted">
                Letzter Bericht: {latestReport.title} (eingereicht)
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Noch kein Lernbericht vorhanden.</p>
            )}
            <Link
              to={href('/reports')}
              className="mt-3 inline-block text-sm text-brand underline"
            >
              Berichte ansehen
            </Link>
          </Card>

          <Card>
            <CardTitle>Ziele</CardTitle>
            {activeSemester ? (
              <>
                <CardDescription>
                  Im aktuellen Semester ({activeSemester.label})
                </CardDescription>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">{counts.assessed}</p>
                    <p className="text-sm text-ink-muted">Beurteilt</p>
                  </div>
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">{counts.unassessed}</p>
                    <p className="text-sm text-ink-muted">Nicht beurteilt</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Zielstatistik verfügbar, sobald ein Semester aktiv ist.
              </p>
            )}
            <Link
              to={href('/goals')}
              className="mt-4 inline-block text-sm text-brand underline"
            >
              {goalsLinkLabel}
            </Link>
          </Card>

          <Card>
            <CardTitle>Roadmap</CardTitle>
            {activeSemester ? (
              <>
                <CardDescription>
                  Im aktuellen Semester ({activeSemester.label})
                </CardDescription>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">{treatedItems}</p>
                    <p className="text-sm text-ink-muted">Behandelt</p>
                  </div>
                  <div className="rounded-md border border-line p-3 text-center">
                    <p className="text-2xl font-semibold">
                      {roadmapItems.length - treatedItems}
                    </p>
                    <p className="text-sm text-ink-muted">Nicht behandelt</p>
                  </div>
                </div>
                <Link
                  to={href('/roadmap')}
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
