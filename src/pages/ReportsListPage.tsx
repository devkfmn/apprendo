import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportList } from '@/features/reports/ReportList'
import { useAuth } from '@/features/auth/useAuth'
import { useReports } from '@/features/reports/useReports'
import { useRoadmap } from '@/features/roadmap/useRoadmap'
import { SemesterFilterSelect, countBySemesterId, resolveSemesterId } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'

export function ReportsListPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { reports, loading } = useReports(learnerId)
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { semesterId, onSemesterChange } = useSemesterFilter(
    activeSemester?.id,
    semestersLoading,
  )
  const roadmap = useRoadmap({ learnerId: learnerId ?? '', role: 'learner', actorId: learnerId ?? '' })
  const topicLabels = useMemo(
    () =>
      new Map(
        roadmap.quarters
          .flatMap((quarter) => [...quarter.school, ...quarter.company])
          .map(({ item }) => [item.id, item.title]),
      ),
    [roadmap.quarters],
  )
  const submittedReports = useMemo(
    () => reports.filter((report) => report.status === 'submitted'),
    [reports],
  )
  const countsBySemesterId = useMemo(
    () => countBySemesterId(submittedReports, semesters),
    [submittedReports, semesters],
  )
  const filtered = useMemo(
    () =>
      semesterId
        ? reports.filter((report) => resolveSemesterId(report, semesters) === semesterId)
        : reports,
    [reports, semesterId, semesters],
  )

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
      <div className="mb-6">
        <SemesterFilterSelect
          semesters={semesters}
          value={semesterId}
          onChange={onSemesterChange}
          countsBySemesterId={countsBySemesterId}
          totalCount={submittedReports.length}
          countLabel="geschrieben"
        />
      </div>
      <ReportList
        reports={filtered}
        topicLabels={topicLabels}
        loading={loading || roadmap.loading || semestersLoading}
        reportPath={(report) => `/reports/${report.id}`}
      />
    </>
  )
}
