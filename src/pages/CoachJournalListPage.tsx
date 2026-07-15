import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { JournalList } from '@/features/journal/JournalList'
import { useAuth } from '@/features/auth/useAuth'
import { useJournal } from '@/features/journal/useJournal'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useSemesters } from '@/features/semesters/useSemesters'

export function CoachJournalListPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const { entries, loading } = useJournal(learnerId)
  const { semesters } = useSemesters(learnerId)
  const roadmap = useRoadmap({ learnerId, role: 'coach', actorId: profile?.id ?? '' })
  const [semesterId, setSemesterId] = useState('')
  const [calendarWeek, setCalendarWeek] = useState('')
  const [topicId, setTopicId] = useState('')
  const topics = useMemo(() => roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company]), [roadmap.quarters])
  const labels = useMemo(() => new Map(topics.map(({ item }) => [item.id, item.title])), [topics])
  const filtered = entries.filter((entry) => (!semesterId || entry.semesterId === semesterId) && (!calendarWeek || entry.calendarWeek === Number(calendarWeek)) && (!topicId || entry.roadmapTopicIds.includes(topicId)))

  return (
    <>
      <PageHeader title="Wochenrückblicke" description="Eingereichte und gespeicherte Rückblicke des Lernenden" />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Select value={semesterId} onChange={(event) => setSemesterId(event.target.value)}><option value="">Alle Semester</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.label}</option>)}</Select>
        <Select value={calendarWeek} onChange={(event) => setCalendarWeek(event.target.value)}><option value="">Alle Kalenderwochen</option>{[...new Set(entries.map((entry) => entry.calendarWeek))].sort((a, b) => b - a).map((week) => <option key={week} value={week}>KW {week}</option>)}</Select>
        <Select value={topicId} onChange={(event) => setTopicId(event.target.value)}><option value="">Alle Roadmap-Themen</option>{topics.map(({ item, itemType }) => <option key={`${itemType}_${item.id}`} value={item.id}>{item.title}</option>)}</Select>
      </div>
      <JournalList entries={filtered} semesters={semesters} topicLabels={labels} loading={loading || roadmap.loading} entryPath={(entry) => `/coach/learners/${learnerId}/journal/${entry.id}`} />
    </>
  )
}
