import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { GoalList } from '@/features/goals/GoalList'
import { useGoals } from '@/features/goals/useGoals'
import { SemesterFilterSelect, countBySemesterId } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'

export function GoalsPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)
  const { semesterId, onSemesterChange } = useSemesterFilter(
    activeSemester?.id,
    semestersLoading,
  )

  const loading = semestersLoading || goalsLoading
  const selected = semesters.find((s) => s.id === semesterId)
  const countsBySemesterId = useMemo(() => countBySemesterId(goals), [goals])

  return (
    <>
      <PageHeader
        title="Ziele"
        description={
          selected
            ? `Semester ${selected.label}`
            : 'Ihre Semesterziele im Überblick'
        }
      />
      <div className="mb-6">
        <SemesterFilterSelect
          semesters={semesters}
          value={semesterId}
          onChange={onSemesterChange}
          countsBySemesterId={countsBySemesterId}
          countLabel="Ziele"
        />
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <GoalList
          goals={goals}
          semesters={semesters}
          filterSemesterId={semesterId}
          learnerId={learnerId ?? ''}
          canEdit={false}
        />
      )}
    </>
  )
}
