import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { JournalList } from '@/features/journal/JournalList'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { useJournal } from '@/features/journal/useJournal'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { SemesterFilterSelect } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'

export function CoachJournalListPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const { entries, loading } = useJournal(learnerId, { submittedOnly: true })
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { semesterId, onSemesterChange } = useSemesterFilter(
    activeSemester?.id,
    semestersLoading,
  )
  const roadmap = useRoadmap({
    learnerId,
    role: profile?.role === 'observer' ? 'observer' : 'coach',
    actorId: profile?.id ?? '',
  })
  const topics = useMemo(
    () => roadmap.quarters.flatMap((quarter) => [...quarter.school, ...quarter.company]),
    [roadmap.quarters],
  )
  const labels = useMemo(
    () => new Map(topics.map(({ item }) => [item.id, item.title])),
    [topics],
  )
  const filtered = entries.filter(
    (entry) => !semesterId || entry.semesterId === semesterId,
  )

  return (
    <>
      <PageHeader
        title="Wochenrückblicke"
        description="Eingereichte Wochenrückblicke des Lernenden"
      />
      <div className="mb-6">
        <SemesterFilterSelect
          semesters={semesters}
          value={semesterId}
          onChange={onSemesterChange}
        />
      </div>
      <JournalList
        entries={filtered}
        semesters={semesters}
        topicLabels={labels}
        loading={loading || roadmap.loading || semestersLoading}
        entryPath={(entry) => `${viewer?.learnerBase}/journal/${entry.id}`}
      />
    </>
  )
}
