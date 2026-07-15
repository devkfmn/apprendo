import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useReports } from '@/features/reports/useReports'

export function CoachReportsListPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const { reports, loading } = useReports(learnerId)

  return (
    <>
      <PageHeader
        title="Lernberichte"
        description="Eingereichte und gespeicherte Lernberichte des Lernenden"
      />
      <ReportList
        reports={reports}
        loading={loading}
        reportPath={(report) => `/coach/learners/${learnerId}/reports/${report.id}`}
      />
    </>
  )
}
