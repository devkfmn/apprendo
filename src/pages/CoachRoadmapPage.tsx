import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { RoadmapQuarterView } from '@/features/roadmap/RoadmapQuarterView'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useAuth } from '@/features/auth/useAuth'

export function CoachRoadmapPage() {
  const { learnerId } = useParams()
  const { profile } = useAuth()

  const roadmap = useRoadmap({
    learnerId: learnerId!,
    role: 'coach',
    actorId: profile!.id,
  })

  if (!learnerId) {
    return <p className="text-sm text-danger">Lernende nicht gefunden.</p>
  }

  return (
    <>
      <PageHeader
        title="Roadmap"
        description={
          roadmap.activeSemester
            ? `Aktuelles Semester: ${roadmap.activeSemester.label}`
            : undefined
        }
      />

      <div className="mb-6 flex justify-end">
        <Link
          to={`/coach/learners/${learnerId}/roadmap/all`}
          className="inline-flex h-8 items-center rounded-md border border-line bg-panel px-3 text-xs font-semibold text-ink hover:bg-canvas"
        >
          Historie anzeigen
        </Link>
      </div>

      {roadmap.loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : roadmap.error ? (
        <p className="text-sm text-danger">{roadmap.error}</p>
      ) : !roadmap.activeSemester ? (
        <p className="text-sm text-ink-muted">
          Kein aktives Semester für diese lernende Person.
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
              canManageCompany
            />
          ))}
        </div>
      )}
    </>
  )
}
