import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { updateGoal } from '@/features/goals/api'
import { goalStatusLabels } from '@/features/semesters/labels'
import type { GoalStatus, Semester, SemesterGoal } from '@/types/domain'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return format(new Date(iso), 'd. MMM yyyy', { locale: de })
  } catch {
    return iso
  }
}

type GoalRowProps = {
  goal: SemesterGoal
  readOnly: boolean
  learnerId: string
  onEdit?: (goal: SemesterGoal) => void
}

function GoalRow({ goal, readOnly, learnerId, onEdit }: GoalRowProps) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (status: GoalStatus) => {
    setUpdating(true)
    try {
      await updateGoal(learnerId, goal.id, { status })
    } finally {
      setUpdating(false)
    }
  }

  const dueLabel = formatDate(goal.dueDate)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium">{goal.title}</h4>
          {readOnly ? (
            <Badge>{goalStatusLabels[goal.status]}</Badge>
          ) : (
            <Select
              value={goal.status}
              disabled={updating}
              className="h-8 w-auto min-w-[10rem] text-xs"
              onChange={(e) => void handleStatusChange(e.target.value as GoalStatus)}
            >
              {(Object.keys(goalStatusLabels) as GoalStatus[]).map((status) => (
                <option key={status} value={status}>
                  {goalStatusLabels[status]}
                </option>
              ))}
            </Select>
          )}
        </div>
        <p className="text-sm text-ink-muted">{goal.description}</p>
        {dueLabel ? <p className="text-xs text-ink-muted">Fällig: {dueLabel}</p> : null}
        {goal.completionNote ? (
          <p className="text-xs text-ink-muted">Notiz: {goal.completionNote}</p>
        ) : null}
      </div>
      {!readOnly && onEdit ? (
        <Button variant="ghost" size="sm" onClick={() => onEdit(goal)}>
          <Pencil className="size-4" />
          <span className="sr-only">Bearbeiten</span>
        </Button>
      ) : null}
    </div>
  )
}

type GoalListProps = {
  goals: SemesterGoal[]
  semesters: Semester[]
  activeSemesterId?: string | null
  learnerId: string
  readOnly?: boolean
  loading?: boolean
  onEditGoal?: (goal: SemesterGoal) => void
}

export function GoalList({
  goals,
  semesters,
  activeSemesterId,
  learnerId,
  readOnly = false,
  loading = false,
  onEditGoal,
}: GoalListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const semesterMap = new Map(semesters.map((s) => [s.id, s]))
  const activeGoals = activeSemesterId
    ? goals.filter((g) => g.semesterId === activeSemesterId)
    : []

  const historySemesterIds = [
    ...new Set(
      goals.filter((g) => g.semesterId !== activeSemesterId).map((g) => g.semesterId),
    ),
  ].sort((a, b) => {
    const semA = semesterMap.get(a)
    const semB = semesterMap.get(b)
    if (!semA || !semB) return 0
    return semB.startDate.localeCompare(semA.startDate)
  })

  if (!activeSemesterId && goals.length === 0) {
    return <p className="text-sm text-ink-muted">Noch keine Ziele vorhanden.</p>
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-lg font-medium">
          {activeSemesterId
            ? (semesterMap.get(activeSemesterId)?.label ?? 'Aktuelles Semester')
            : 'Ziele'}
        </h3>
        {activeGoals.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {activeSemesterId
              ? 'Für dieses Semester sind noch keine Ziele definiert.'
              : 'Kein aktives Semester — Ziele werden angezeigt, sobald ein Semester aktiv ist.'}
          </p>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                readOnly={readOnly}
                learnerId={learnerId}
                onEdit={onEditGoal}
              />
            ))}
          </div>
        )}
      </section>

      {historySemesterIds.length > 0 ? (
        <>
          <Separator />
          <section>
            <h3 className="mb-3 text-lg font-medium">Frühere Semester</h3>
            <div className="space-y-6">
              {historySemesterIds.map((semesterId) => {
                const semester = semesterMap.get(semesterId)
                const semesterGoals = goals.filter((g) => g.semesterId === semesterId)
                return (
                  <div key={semesterId}>
                    <h4 className="mb-2 text-sm font-medium text-ink-muted">
                      {semester?.label ?? semesterId}
                    </h4>
                    <div className="space-y-3">
                      {semesterGoals.map((goal) => (
                        <GoalRow
                          key={goal.id}
                          goal={goal}
                          readOnly
                          learnerId={learnerId}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

export function countGoalsByStatus(
  goals: SemesterGoal[],
  semesterId: string | undefined,
): { open: number; in_progress: number; completed: number } {
  const filtered = semesterId ? goals.filter((g) => g.semesterId === semesterId) : goals

  return {
    open: filtered.filter((g) => g.status === 'open').length,
    in_progress: filtered.filter((g) => g.status === 'in_progress').length,
    completed: filtered.filter((g) => g.status === 'completed').length,
  }
}
