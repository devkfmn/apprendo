import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import type { LearningReport } from '@/types/domain'

type ReportListProps = {
  reports: LearningReport[]
  topicLabels?: Map<string, string>
  loading?: boolean
  reportPath: (report: LearningReport) => string
}

export function ReportList({ reports, topicLabels, loading, reportPath }: ReportListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return <p className="text-sm text-ink-muted">Noch keine Lernberichte vorhanden.</p>
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Link key={report.id} to={reportPath(report)} className="block">
          <Card className="transition hover:border-brand">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{report.title || 'Ohne Titel'}</CardTitle>
                <p className="mt-1 text-sm text-ink-muted">
                  Zuletzt geändert {formatDateTime(report.updatedAt)}
                </p>
                {report.roadmapTopicIds.length > 0 && topicLabels ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    Themen: {report.roadmapTopicIds.map((id) => topicLabels.get(id) ?? id).join(', ')}
                  </p>
                ) : null}
              </div>
              <Badge variant={report.status === 'submitted' ? 'default' : 'warning'}>
                {report.status === 'submitted' ? 'Eingereicht' : 'Entwurf'}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
