import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { RoadmapQuarterView } from '@/features/roadmap/RoadmapQuarterView'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useAuth } from '@/features/auth/useAuth'
import { SemesterFilterSelect } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'
import type { ImsQuarter } from '@/types/domain'

export function RoadmapPage() {
  const { user } = useAuth()
  const learnerId = user!.uid

  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { semesterId, onSemesterChange } = useSemesterFilter(
    activeSemester?.id,
    semestersLoading,
  )

  const selectedSemester = useMemo(
    () => semesters.find((s) => s.id === semesterId) ?? null,
    [semesters, semesterId],
  )

  const imsQuarters = useMemo((): ImsQuarter[] | undefined => {
    if (!semesterId) return undefined
    return selectedSemester?.primaryImsQuarters ?? []
  }, [semesterId, selectedSemester])

  const roadmap = useRoadmap({
    learnerId,
    role: 'learner',
    actorId: learnerId,
    imsQuarters,
  })

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
          Noch keine Semester. Bitte wende dich an deine Coach-Person.
        </p>
      ) : roadmap.quarters.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Für dieses Semester sind keine IMS-Quartale konfiguriert.
        </p>
      ) : (
        <div className="space-y-6">
          {roadmap.quarters.map((quarter) => (
            <RoadmapQuarterView
              key={quarter.imsQuarter}
              quarter={quarter}
              roadmap={roadmap}
            />
          ))}
        </div>
      )}
    </>
  )
}
