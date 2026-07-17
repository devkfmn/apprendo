import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { useReports } from '@/features/reports/useReports'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { SemesterFilterSelect } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'

export function CoachReportsListPage() {
  const { learnerId = '' } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const { reports, loading } = useReports(learnerId, { submittedOnly: true })
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
  const topicLabels = useMemo(
    () =>
      new Map(
        roadmap.quarters
          .flatMap((quarter) => [...quarter.school, ...quarter.company])
          .map(({ item }) => [item.id, item.title]),
      ),
    [roadmap.quarters],
  )
  const filtered = useMemo(
    () =>
      semesterId
        ? reports.filter((report) => report.semesterId === semesterId)
        : reports,
    [reports, semesterId],
  )

  return (
    <>
      <PageHeader
        title="Lernberichte"
        description="Eingereichte Lernberichte des Lernenden"
      />
      <div className="mb-6">
        <SemesterFilterSelect
          semesters={semesters}
          value={semesterId}
          onChange={onSemesterChange}
        />
      </div>
      <ReportList
        reports={filtered}
        topicLabels={topicLabels}
        loading={loading || roadmap.loading || semestersLoading}
        reportPath={(report) => `${viewer?.learnerBase}/reports/${report.id}`}
      />
    </>
  )
}
