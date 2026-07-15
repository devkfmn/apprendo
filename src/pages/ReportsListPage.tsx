import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useAuth } from '@/features/auth/useAuth'
import { useReports } from '@/features/reports/useReports'

export function ReportsListPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { reports, loading } = useReports(learnerId)

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
        loading={loading}
        reportPath={(report) => `/reports/${report.id}`}
      />
    </>
  )
}
