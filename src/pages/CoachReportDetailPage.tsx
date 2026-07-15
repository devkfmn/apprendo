import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportEditor } from '@/features/reports/ReportEditor'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { CommentThread } from '@/features/comments/CommentThread'
import { useMarkContentViewed } from '@/features/comments/useMarkContentViewed'
import { getLearningReport, getReportMarkdown } from '@/features/reports/api'
import type { LearningReport } from '@/types/domain'
import { formatDateTime } from '@/lib/utils'

export function CoachReportDetailPage() {
  const { learnerId = '', reportId = '' } = useParams<{
    learnerId: string
    reportId: string
  }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const [report, setReport] = useState<LearningReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getLearningReport(learnerId, reportId).then((result) => {
      if (cancelled) return
      if (!result) {
        setError('Lernbericht nicht gefunden oder noch nicht eingereicht.')
        return
      }
      setReport(result)
    })
    return () => {
      cancelled = true
    }
  }, [learnerId, reportId])

  useMarkContentViewed({
    viewerId: profile?.id,
    learnerId,
    targetKind: 'report',
    targetId: report?.id,
    enabled: Boolean(report?.id && report.status === 'submitted'),
  })

  if (error) return <p className="text-sm text-danger">{error}</p>
  if (!report) return <p className="text-sm text-ink-muted">Laden…</p>

  return (
    <>
      <PageHeader
        title={report.title || 'Lernbericht'}
        description={
          report.submittedAt
            ? `Eingereicht am ${formatDateTime(report.submittedAt)}`
            : `Zuletzt geändert ${formatDateTime(report.updatedAt)}`
        }
        actions={
          <Link to={`${viewer?.learnerBase}/reports`}>
            <Button variant="outline">Zur Übersicht</Button>
          </Link>
        }
      />
      <Card>
        <div className="mb-6 flex items-center gap-2">
          <CardTitle>Lernbericht</CardTitle>
          <Badge variant={report.status === 'submitted' ? 'default' : 'warning'}>
            {report.status === 'submitted' ? 'Eingereicht' : 'Entwurf'}
          </Badge>
        </div>
        <ReportEditor
          value={getReportMarkdown(report)}
          readOnly
          onChange={() => undefined}
        />
      </Card>
      {profile ? (
        <CommentThread
          learnerId={learnerId}
          targetKind="report"
          targetId={report.id}
          parentSubmitted={report.status === 'submitted'}
          profile={profile}
        />
      ) : null}
    </>
  )
}
