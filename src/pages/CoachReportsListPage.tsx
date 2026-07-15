import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { useReports } from '@/features/reports/useReports'

export function CoachReportsListPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const viewer = useViewerArea()
  const { reports, loading } = useReports(learnerId, { submittedOnly: true })

  return (
    <>
      <PageHeader
        title="Lernberichte"
        description="Eingereichte Lernberichte des Lernenden"
      />
      <ReportList
        reports={reports}
        loading={loading}
        reportPath={(report) => `${viewer?.learnerBase}/reports/${report.id}`}
      />
    </>
  )
}
