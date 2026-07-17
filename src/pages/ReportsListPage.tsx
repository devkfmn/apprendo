import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useAuth } from '@/features/auth/useAuth'
import { useReports } from '@/features/reports/useReports'
import { useRoadmap } from '@/features/roadmap/useRoadmap'

export function ReportsListPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { reports, loading } = useReports(learnerId)
  const roadmap = useRoadmap({ learnerId: learnerId ?? '', role: 'learner', actorId: learnerId ?? '' })
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
        description="Freie Aufsätze zu deiner Ausbildung – mit Text und Bildern."
        actions={
          <Link to="/reports/new">
            <Button>Lernbericht erstellen</Button>
          </Link>
        }
      />
      <ReportList
        reports={reports}
        topicLabels={topicLabels}
        loading={loading || roadmap.loading}
        reportPath={(report) => `/reports/${report.id}`}
      />
    </>
  )
}
