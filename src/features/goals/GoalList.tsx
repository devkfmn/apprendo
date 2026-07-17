import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { updateGoal } from '@/features/goals/api'
import {
  goalAssessmentBadgeLabel,
  goalAssessmentGrades,
  goalAssessmentLabels,
} from '@/features/semesters/labels'
import { formatDate } from '@/lib/utils'
import type { GoalAssessmentGrade, Semester, SemesterGoal } from '@/types/domain'
import { Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'

type GoalRowProps = {
  goal: SemesterGoal
  /** Content edit (title etc.) — coach only. */
  canEditContent: boolean
  /** Assessment A–E — coach only; learners/observers always false. */
  canAssess: boolean
  learnerId: string
  actorId?: string
  onEdit?: (goal: SemesterGoal) => void
}

function GoalRow({
  goal,
  canEditContent,
  canAssess,
  learnerId,
  actorId,
  onEdit,
}: GoalRowProps) {
  const [updating, setUpdating] = useState(false)
  const [note, setNote] = useState(goal.assessmentNote ?? '')

  const saveAssessment = async (grade: GoalAssessmentGrade | null) => {
    setUpdating(true)
    try {
      await updateGoal(
        learnerId,
        goal.id,
        {
          assessmentGrade: grade,
          assessmentNote: note.trim() || null,
        },
        actorId,
      )
    } finally {
      setUpdating(false)
    }
  }

  const dueLabel = goal.dueDate ? formatDate(goal.dueDate) : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">{goal.title}</h4>
            {goal.carriedOver ? <Badge variant="secondary">Übertragen</Badge> : null}
            {!canAssess ? (
              <Badge variant={goal.assessmentGrade ? 'default' : 'warning'}>
                {goal.assessmentGrade
                  ? `${goal.assessmentGrade}) ${goalAssessmentLabels[goal.assessmentGrade]}`
                  : 'Ohne Beurteilung'}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-ink-muted">{goal.description}</p>
          {dueLabel ? (
            <p className="text-xs text-ink-muted">Fällig (Semesterende): {dueLabel}</p>
          ) : null}
          {!canAssess && goal.assessmentNote ? (
            <p className="text-xs text-ink-muted">Notiz: {goal.assessmentNote}</p>
          ) : null}
        </div>
        {canEditContent && onEdit ? (
          <Button variant="ghost" size="sm" onClick={() => onEdit(goal)}>
            <Pencil className="size-4" />
            <span className="sr-only">Bearbeiten</span>
          </Button>
        ) : null}
      </div>

      {canAssess ? (
        <div className="space-y-3 border-t border-line pt-3">
          <div className="space-y-2">
            <Label htmlFor={`assess-${goal.id}`}>Beurteilung (Coach)</Label>
            <Select
              id={`assess-${goal.id}`}
              value={goal.assessmentGrade ?? ''}
              disabled={updating}
              onChange={(e) => {
                const value = e.target.value
                void saveAssessment(value ? (value as GoalAssessmentGrade) : null)
              }}
            >
              <option value="">Noch nicht beurteilt</option>
              {goalAssessmentGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}) {goalAssessmentLabels[grade]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`note-${goal.id}`}>Beurteilungsnotiz (optional)</Label>
            <Textarea
              id={`note-${goal.id}`}
              rows={2}
              value={note}
              disabled={updating}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => {
                if ((goal.assessmentNote ?? '') === note.trim()) return
                void updateGoal(
                  learnerId,
                  goal.id,
                  { assessmentNote: note.trim() || null },
                  actorId,
                )
              }}
              placeholder="Kurzbegründung zur Beurteilung…"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

type GoalListProps = {
  goals: SemesterGoal[]
  semesters: Semester[]
  /** Empty = all semesters; otherwise only that semester. */
  filterSemesterId?: string
  learnerId: string
  actorId?: string
  /** Coach can edit goal content and assess. */
  canEdit?: boolean
  loading?: boolean
  onEditGoal?: (goal: SemesterGoal) => void
}

export function GoalList({
  goals,
  semesters,
  filterSemesterId = '',
  learnerId,
  actorId,
  canEdit = false,
  loading = false,
  onEditGoal,
}: GoalListProps) {
  const semesterMap = useMemo(
    () => new Map(semesters.map((s) => [s.id, s])),
    [semesters],
  )

  const filteredGoals = useMemo(
    () =>
      filterSemesterId
        ? goals.filter((g) => g.semesterId === filterSemesterId)
        : goals,
    [goals, filterSemesterId],
  )

  const groups = useMemo(() => {
    if (filterSemesterId) {
      return [{ semesterId: filterSemesterId, goals: filteredGoals }]
    }
    const ids = [...new Set(filteredGoals.map((g) => g.semesterId))]
    ids.sort((a, b) => {
      const semA = semesterMap.get(a)
      const semB = semesterMap.get(b)
      if (!semA || !semB) return 0
      return semB.startDate.localeCompare(semA.startDate)
    })
    return ids.map((semesterId) => ({
      semesterId,
      goals: filteredGoals.filter((g) => g.semesterId === semesterId),
    }))
  }, [filterSemesterId, filteredGoals, semesterMap])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (goals.length === 0) {
    return <p className="text-sm text-ink-muted">Noch keine Ziele vorhanden.</p>
  }

  if (filteredGoals.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Für dieses Semester sind noch keine Ziele definiert.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map(({ semesterId, goals: semesterGoals }) => (
        <section key={semesterId}>
          {!filterSemesterId ? (
            <h3 className="mb-3 text-lg font-medium">
              {semesterMap.get(semesterId)?.label ?? semesterId}
            </h3>
          ) : null}
          <div className="space-y-3">
            {semesterGoals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                canEditContent={canEdit}
                canAssess={canEdit}
                learnerId={learnerId}
                actorId={actorId}
                onEdit={onEditGoal}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function countGoalsByAssessment(
  goals: SemesterGoal[],
  semesterId: string | undefined,
): { unassessed: number; assessed: number; byGrade: Record<GoalAssessmentGrade, number> } {
  const filtered = semesterId ? goals.filter((g) => g.semesterId === semesterId) : goals
  const byGrade: Record<GoalAssessmentGrade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  let assessed = 0
  for (const goal of filtered) {
    if (goal.assessmentGrade) {
      assessed += 1
      byGrade[goal.assessmentGrade] += 1
    }
  }
  return {
    unassessed: filtered.length - assessed,
    assessed,
    byGrade,
  }
}

export { goalAssessmentBadgeLabel }
