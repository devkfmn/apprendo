import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportEditor } from '@/features/reports/ReportEditor'
import { getLearningReport, getReportMarkdown } from '@/features/reports/api'
import type { LearningReport } from '@/types/domain'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export function CoachReportDetailPage() {
  const { learnerId = '', reportId = '' } = useParams<{
    learnerId: string
    reportId: string
  }>()
  const [report, setReport] = useState<LearningReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getLearningReport(learnerId, reportId)
      .then(setReport)
      .catch(() => setError('Lernbericht konnte nicht geladen werden.'))
  }, [learnerId, reportId])

  if (error) return <p className="text-sm text-danger">{error}</p>
  if (!report) return <p className="text-sm text-ink-muted">Laden…</p>

  return (
    <>
      <PageHeader
        title={report.title || 'Lernbericht'}
        description={
          report.submittedAt
            ? `Eingereicht am ${format(new Date(report.submittedAt), 'd. MMM yyyy, HH:mm', { locale: de })}`
            : `Zuletzt geändert ${format(new Date(report.updatedAt), 'd. MMM yyyy, HH:mm', { locale: de })}`
        }
        actions={
          <Link to={`/coach/learners/${learnerId}/reports`}>
            <Button variant="outline">Zur Übersicht</Button>
          </Link>
        }
      />
      <Card>
        <div className="mb-6 flex items-center gap-2">
          <CardTitle>Lernbericht</CardTitle>
          <Badge>{report.status === 'submitted' ? 'Eingereicht' : 'Entwurf'}</Badge>
        </div>
        <ReportEditor
          value={getReportMarkdown(report)}
          readOnly
          onChange={() => undefined}
        />
      </Card>
    </>
  )
}
