import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { GoalForm } from '@/features/goals/GoalForm'
import { GoalList } from '@/features/goals/GoalList'
import { createGoal, updateGoal } from '@/features/goals/api'
import { useGoals } from '@/features/goals/useGoals'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import type { GoalStatus, SemesterGoal } from '@/types/domain'

export function CoachGoalsPage() {
  const { learnerId } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SemesterGoal | null>(null)

  const openCreate = () => {
    setEditingGoal(null)
    setFormOpen(true)
  }

  const openEdit = (goal: SemesterGoal) => {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  const handleSubmit = async (values: {
    semesterId: string
    title: string
    description: string
    status: GoalStatus
    dueDate?: string | null
    completionNote?: string | null
    sortOrder: number
  }) => {
    if (!learnerId || !profile) return

    if (editingGoal) {
      await updateGoal(learnerId, editingGoal.id, values)
    } else {
      await createGoal(learnerId, values, profile.id)
    }

    setFormOpen(false)
    setEditingGoal(null)
  }

  return (
    <>
      <PageHeader
        title="Ziele"
        description={
          activeSemester
            ? `Ziele für ${activeSemester.label} verwalten`
            : 'Semesterziele für diese/n Lernende/n'
        }
      />

      <div className="mb-6">
        <Button onClick={openCreate} disabled={semesters.length === 0}>
          <Plus className="size-4" />
          Neues Ziel
        </Button>
        {semesters.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Zuerst ein Semester unter{' '}
            <Link
              to={`/coach/learners/${learnerId}/semesters`}
              className="text-brand underline"
            >
              Semester
            </Link>{' '}
            anlegen.
          </p>
        ) : null}
      </div>

      <GoalList
        goals={goals}
        semesters={semesters}
        activeSemesterId={activeSemester?.id}
        learnerId={learnerId ?? ''}
        loading={semestersLoading || goalsLoading}
        onEditGoal={openEdit}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Ziel bearbeiten' : 'Neues Ziel'}</DialogTitle>
          </DialogHeader>
          <GoalForm
            goal={editingGoal ?? undefined}
            semesters={semesters}
            defaultSemesterId={activeSemester?.id}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
