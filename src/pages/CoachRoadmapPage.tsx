import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { isRoadmapTreated } from '@/features/roadmap/api'
import { RoadmapQuarterView } from '@/features/roadmap/RoadmapQuarterView'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { SemesterFilterSelect } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'

export function CoachRoadmapPage() {
  const { learnerId } = useParams()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const canEdit = viewer?.canEdit ?? false

  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { semesterId, onSemesterChange } = useSemesterFilter(
    activeSemester?.id,
    semestersLoading,
  )

  const selectedSemester = useMemo(
    () => semesters.find((s) => s.id === semesterId) ?? null,
    [semesters, semesterId],
  )

  const roadmap = useRoadmap({
    learnerId: learnerId!,
    role: profile?.role === 'observer' ? 'observer' : 'coach',
    actorId: profile!.id,
  })

  const displayedQuarters = useMemo(() => {
    if (!semesterId) return roadmap.quarters
    const allowed = new Set(selectedSemester?.primaryImsQuarters ?? [])
    return roadmap.quarters.filter((quarter) => allowed.has(quarter.imsQuarter))
  }, [roadmap.quarters, semesterId, selectedSemester])

  const countsBySemesterId = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const semester of semesters) {
      const allowed = new Set(semester.primaryImsQuarters)
      const items = roadmap.quarters
        .filter((quarter) => allowed.has(quarter.imsQuarter))
        .flatMap((quarter) => [...quarter.school, ...quarter.company])
      counts[semester.id] = items.filter(({ progress }) =>
        isRoadmapTreated(progress),
      ).length
    }
    return counts
  }, [semesters, roadmap.quarters])

  if (!learnerId) {
    return <p className="text-sm text-danger">Lernende nicht gefunden.</p>
  }

  const description = selectedSemester
    ? selectedSemester.label
    : activeSemester
      ? `Alle Semester · Aktuell: ${activeSemester.label}`
      : semesters.length > 0
        ? 'Alle Semester'
        : undefined

  return (
    <>
      <PageHeader title="Roadmap" description={description} />

      <div className="mb-6">
        <SemesterFilterSelect
          semesters={semesters}
          value={semesterId}
          onChange={onSemesterChange}
          countsBySemesterId={countsBySemesterId}
          countLabel="behandelt"
        />
      </div>

      {roadmap.loading || semestersLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : roadmap.error ? (
        <p className="text-sm text-danger">{roadmap.error}</p>
      ) : semesters.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Noch keine Semester für diese lernende Person.
        </p>
      ) : displayedQuarters.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Für dieses Semester sind keine IMS-Quartale konfiguriert.
        </p>
      ) : (
        <div className="space-y-6">
          {displayedQuarters.map((quarter) => (
            <RoadmapQuarterView
              key={quarter.imsQuarter}
              quarter={quarter}
              roadmap={roadmap}
              canManageCompany={canEdit}
            />
          ))}
        </div>
      )}
    </>
  )
}
