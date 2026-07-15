import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { weekLabel } from '@/lib/week'
import type { JournalEntry, Semester } from '@/types/domain'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

type JournalListProps = {
  entries: JournalEntry[]
  semesters: Semester[]
  topicLabels: Map<string, string>
  loading?: boolean
  entryPath: (entry: JournalEntry) => string
}

function dateRange(entry: JournalEntry) {
  return `${format(new Date(entry.weekStart), 'd. MMM', { locale: de })} – ${format(new Date(entry.weekEnd), 'd. MMM yyyy', { locale: de })}`
}

export function JournalList({ entries, semesters, topicLabels, loading, entryPath }: JournalListProps) {
  if (loading) return <div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
  if (entries.length === 0) return <p className="text-sm text-ink-muted">Keine Wochenrückblicke für diese Auswahl.</p>

  const semesterLabels = new Map(semesters.map((semester) => [semester.id, semester.label]))
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Link key={entry.id} to={entryPath(entry)} className="block">
          <Card className="transition hover:border-brand">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{weekLabel(entry.calendarWeek, entry.year)}</CardTitle>
              <Badge>{entry.status === 'draft' ? 'Entwurf' : 'Eingereicht'}</Badge>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{dateRange(entry)}</p>
            <p className="mt-1 text-sm text-ink-muted">{semesterLabels.get(entry.semesterId) ?? 'Unbekanntes Semester'}</p>
            {entry.status === 'submitted' && entry.submittedAt ? <p className="mt-1 text-xs text-ink-muted">Eingereicht am {format(new Date(entry.submittedAt), 'd. MMM yyyy, HH:mm', { locale: de })}</p> : null}
            {entry.roadmapTopicIds.length > 0 ? <p className="mt-2 text-xs text-ink-muted">Themen: {entry.roadmapTopicIds.map((id) => topicLabels.get(id) ?? id).join(', ')}</p> : null}
          </Card>
        </Link>
      ))}
    </div>
  )
}
