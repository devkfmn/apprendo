import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { GoalList } from '@/features/goals/GoalList'
import { useGoals } from '@/features/goals/useGoals'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'

export function GoalsPage() {
  const { profile } = useAuth()
  const learnerId = profile?.id
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)

  const loading = semestersLoading || goalsLoading

  return (
    <>
      <PageHeader
        title="Ziele"
        description={
          activeSemester
            ? `Semester ${activeSemester.label}`
            : 'Ihre Semesterziele im Überblick'
        }
      />
      {activeSemester ? (
        <Badge className="mb-4">Aktiv: {activeSemester.label}</Badge>
      ) : null}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <GoalList
          goals={goals}
          semesters={semesters}
          activeSemesterId={activeSemester?.id}
          learnerId={learnerId ?? ''}
          canEdit={false}
        />
      )}
    </>
  )
}
