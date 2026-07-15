import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { getJournalEntry } from '@/features/journal/api'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { weekLabel } from '@/lib/week'
import { useAuth } from '@/features/auth/useAuth'
import type { JournalEntry } from '@/types/domain'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const answerLabels: Record<keyof JournalEntry['answers'], string> = {
  workedOn: 'Woran wurde gearbeitet?',
  learned: 'Was wurde gelernt?',
  wentWell: 'Was ist gut gelaufen?',
  difficulties: 'Schwierigkeiten',
  needSupport: 'Benötigte Unterstützung',
  nextWeek: 'Vorhaben für nächste Woche',
}

export function CoachJournalDetailPage() {
  const { learnerId = '', entryId = '' } = useParams<{ learnerId: string; entryId: string }>()
  const { profile } = useAuth()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const roadmap = useRoadmap({ learnerId, role: 'coach', actorId: profile?.id ?? '' })
  useEffect(() => { void getJournalEntry(learnerId, entryId).then(setEntry).catch(() => setError('Wochenrückblick konnte nicht geladen werden.')) }, [learnerId, entryId])
  const topicLabels = useMemo(() => new Map(roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company]).map(({ item }) => [item.id, item.title])), [roadmap.quarters])

  if (error) return <p className="text-sm text-danger">{error}</p>
  if (!entry || roadmap.loading) return <p className="text-sm text-ink-muted">Laden…</p>
  return (
    <>
      <PageHeader title={weekLabel(entry.calendarWeek, entry.year)} description={`${format(new Date(entry.weekStart), 'd. MMM', { locale: de })} – ${format(new Date(entry.weekEnd), 'd. MMM yyyy', { locale: de })}`} actions={<Link to={`/coach/learners/${learnerId}/journal`}><Button variant="outline">Zur Übersicht</Button></Link>} />
      <Card>
        <div className="flex items-center gap-2"><CardTitle>Wochenrückblick</CardTitle><Badge>{entry.status === 'submitted' ? 'Eingereicht' : 'Entwurf'}</Badge></div>
        {entry.submittedAt ? <p className="mt-2 text-sm text-ink-muted">Eingereicht am {format(new Date(entry.submittedAt), 'd. MMM yyyy, HH:mm', { locale: de })}</p> : null}
        <dl className="mt-6 space-y-6">
          {Object.entries(answerLabels).map(([key, label]) => entry.answers[key as keyof JournalEntry['answers']] ? <div key={key}><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{entry.answers[key as keyof JournalEntry['answers']]}</dd></div> : null)}
          <div><dt className="font-medium">Roadmap-Themen</dt><dd className="mt-1 text-sm text-ink-muted">{entry.roadmapTopicIds.length ? entry.roadmapTopicIds.map((id) => topicLabels.get(id) ?? id).join(', ') : 'Keine Themen ausgewählt.'}</dd></div>
        </dl>
      </Card>
    </>
  )
}
