import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { JournalList } from '@/features/journal/JournalList'
import { useAuth } from '@/features/auth/useAuth'
import { useJournal } from '@/features/journal/useJournal'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useMemo, useState } from 'react'

export function JournalListPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { entries, loading } = useJournal(learnerId)
  const { semesters } = useSemesters(learnerId)
  const roadmap = useRoadmap({ learnerId: learnerId ?? '', role: 'learner', actorId: learnerId ?? '' })
  const [semesterId, setSemesterId] = useState('')

  const topics = useMemo(() => roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company]), [roadmap.quarters])
  const topicLabels = useMemo(() => new Map(topics.map(({ item }) => [item.id, item.title])), [topics])
  const filtered = entries.filter((entry) => !semesterId || entry.semesterId === semesterId)

  return (
    <>
      <PageHeader title="Wochenrückblicke" description="Deine wöchentlichen Lernreflexionen" actions={<Link to="/journal/new"><Button>Wochenrückblick erstellen</Button></Link>} />
      <div className="mb-6">
        <Select value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>
          <option value="">Alle Semester</option>
          {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.label}</option>)}
        </Select>
      </div>
      <JournalList entries={filtered} semesters={semesters} topicLabels={topicLabels} loading={loading || roadmap.loading} entryPath={(entry) => `/journal/${entry.id}`} />
    </>
  )
}
