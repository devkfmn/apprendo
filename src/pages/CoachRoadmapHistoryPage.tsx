import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { RoadmapQuarterView } from '@/features/roadmap/RoadmapQuarterView'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useAuth } from '@/features/auth/useAuth'
import { ALL_IMS_QUARTERS } from '@/lib/ims'

export function CoachRoadmapHistoryPage() {
  const { learnerId } = useParams()
  const { profile } = useAuth()

  const roadmap = useRoadmap({
    learnerId: learnerId!,
    imsQuarters: ALL_IMS_QUARTERS,
    includeArchivedCompany: true,
    role: 'coach',
    actorId: profile!.id,
  })

  if (!learnerId) {
    return <p className="text-sm text-danger">Lernende nicht gefunden.</p>
  }

  return (
    <>
      <PageHeader
        title="Roadmap Historie"
        description="Alle IMS-Quartale 1–16"
      />

      <div className="mb-6">
        <Link
          to={`/coach/learners/${learnerId}/roadmap`}
          className="inline-flex h-8 items-center rounded-md border border-line bg-panel px-3 text-xs font-semibold text-ink hover:bg-canvas"
        >
          Zurück zur aktuellen Roadmap
        </Link>
      </div>

      {roadmap.loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : roadmap.error ? (
        <p className="text-sm text-danger">{roadmap.error}</p>
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
