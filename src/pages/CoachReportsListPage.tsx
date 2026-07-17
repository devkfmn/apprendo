import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { useReports } from '@/features/reports/useReports'
import { useRoadmap } from '@/features/roadmap/useRoadmap'

export function CoachReportsListPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const { reports, loading } = useReports(learnerId, { submittedOnly: true })
  const roadmap = useRoadmap({
    learnerId,
    role: profile?.role === 'observer' ? 'observer' : 'coach',
    actorId: profile?.id ?? '',
  })
  const topicLabels = useMemo(
    () =>
      new Map(
        roadmap.quarters
          .flatMap((quarter) => [...quarter.school, ...quarter.company])
          .map(({ item }) => [item.id, item.title]),
      ),
    [roadmap.quarters],
  )

  return (
    <>
      <PageHeader
        title="Lernberichte"
        description="Eingereichte Lernberichte des Lernenden"
      />
      <ReportList
        reports={reports}
        topicLabels={topicLabels}
        loading={loading || roadmap.loading}
        reportPath={(report) => `${viewer?.learnerBase}/reports/${report.id}`}
      />
    </>
  )
}
