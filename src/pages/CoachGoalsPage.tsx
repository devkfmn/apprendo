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
import { SemesterFilterSelect } from '@/features/semesters/SemesterFilterSelect'
import { useSemesterFilter } from '@/features/semesters/useSemesterFilter'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import type { SemesterGoal } from '@/types/domain'

export function CoachGoalsPage() {
  const { learnerId } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const canEdit = viewer?.canEdit ?? false
  const { semesters, activeSemester, loading: semestersLoading } = useSemesters(learnerId)
  const { goals, loading: goalsLoading } = useGoals(learnerId)
  const { semesterId, onSemesterChange } = useSemesterFilter(
    activeSemester?.id,
    semestersLoading,
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SemesterGoal | null>(null)

  const selected = semesters.find((s) => s.id === semesterId)

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
    dueDate?: string | null
    sortOrder: number
  }) => {
    if (!learnerId || !profile || !canEdit) return

    if (editingGoal) {
      await updateGoal(learnerId, editingGoal.id, values, profile.id)
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
          selected
            ? canEdit
              ? `Ziele für ${selected.label} verwalten und am Semesternende beurteilen`
              : `Ziele für ${selected.label}`
            : 'Semesterziele für diese/n Lernende/n'
        }
        actions={
          canEdit ? (
            <Button onClick={openCreate} disabled={semesters.length === 0}>
              <Plus className="size-4" />
              Neues Ziel
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6">
        <SemesterFilterSelect
          semesters={semesters}
          value={semesterId}
          onChange={onSemesterChange}
        />
      </div>
      {canEdit && semesters.length === 0 ? (
        <p className="mb-6 text-sm text-ink-muted">
          Zuerst ein Semester unter{' '}
          <Link
            to={`${viewer?.learnerBase}/semesters`}
            className="text-brand underline"
          >
            Semester
          </Link>{' '}
          anlegen.
        </p>
      ) : null}

      <GoalList
        goals={goals}
        semesters={semesters}
        filterSemesterId={semesterId}
        learnerId={learnerId ?? ''}
        actorId={profile?.id}
        loading={semestersLoading || goalsLoading}
        canEdit={canEdit}
        onEditGoal={canEdit ? openEdit : undefined}
      />

      {canEdit ? (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Ziel bearbeiten' : 'Neues Ziel'}</DialogTitle>
            </DialogHeader>
            <GoalForm
              goal={editingGoal ?? undefined}
              semesters={semesters}
              defaultSemesterId={semesterId || activeSemester?.id}
              onSubmit={handleSubmit}
              onCancel={() => setFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
