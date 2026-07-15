import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  activateSemester,
  closeSemester,
  createSemester,
  reopenSemester,
  updateSemester,
} from '@/features/semesters/api'
import { carryOverOpenGoals, listGoals } from '@/features/goals/api'
import { listJournalEntries } from '@/features/journal/api'
import {
  fetchCompanyItems,
  fetchProgress,
  fetchSchoolItems,
} from '@/features/roadmap/api'
import {
  SemesterCloseDialog,
  type SemesterCloseSummary,
} from '@/features/semesters/SemesterCloseDialog'
import { SemesterForm } from '@/features/semesters/SemesterForm'
import { semesterStatusLabels } from '@/features/semesters/labels'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { weeksBetween } from '@/lib/week'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Semester } from '@/types/domain'

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), 'd. MMM yyyy', { locale: de })
  } catch {
    return iso
  }
}

export function CoachSemestersPage() {
  const { learnerId } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const { semesters, loading, error } = useSemesters(learnerId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null)
  const [closingSemester, setClosingSemester] = useState<Semester | null>(null)
  const [closeSummary, setCloseSummary] = useState<SemesterCloseSummary | null>(null)

  const openCreate = () => {
    setEditingSemester(null)
    setFormOpen(true)
  }

  const openEdit = (semester: Semester) => {
    setEditingSemester(semester)
    setFormOpen(true)
  }

  const handleSubmit = async (values: {
    label: string
    academicYear?: string
    startDate: string
    endDate: string
    primaryImsQuarters: [number, number]
  }) => {
    if (!learnerId || !profile) return

    if (editingSemester) {
      await updateSemester(learnerId, editingSemester.id, values)
    } else {
      await createSemester(learnerId, values, profile.id)
    }

    setFormOpen(false)
    setEditingSemester(null)
  }

  const handleActivate = async (semesterId: string) => {
    if (!learnerId) return
    await activateSemester(learnerId, semesterId)
  }

  const openCloseDialog = async (semester: Semester) => {
    if (!learnerId) return
    setClosingSemester(semester)
    setCloseSummary(null)

    const [goals, journals, schoolItems, companyItems, progress] = await Promise.all([
      listGoals(learnerId),
      listJournalEntries(learnerId),
      fetchSchoolItems(),
      fetchCompanyItems(learnerId, { includeArchived: true }),
      fetchProgress(learnerId),
    ])

    const semesterGoals = goals.filter((goal) => goal.semesterId === semester.id)
    const semesterJournals = journals.filter(
      (entry) => entry.semesterId === semester.id && entry.status === 'submitted',
    )
    const quarterSet = new Set(semester.primaryImsQuarters)
    const relevantSchool = schoolItems.filter((item) => quarterSet.has(item.imsQuarter))
    const relevantCompany = companyItems.filter(
      (item) => item.status === 'active' && quarterSet.has(item.imsQuarter),
    )
    const roadmapIds = new Set([
      ...relevantSchool.map((item) => item.id),
      ...relevantCompany.map((item) => item.id),
    ])
    const relevantProgress = progress.filter((item) => roadmapIds.has(item.itemId))
    const expectedWeeks = weeksBetween(semester.startDate, semester.endDate)
    const submittedKeys = new Set(
      semesterJournals.map((entry) => `${entry.year}-${entry.calendarWeek}`),
    )
    const missingWeeksEstimate = expectedWeeks.filter(
      (week) => !submittedKeys.has(`${week.year}-${week.calendarWeek}`),
    ).length

    setCloseSummary({
      goalsTotal: semesterGoals.length,
      goalsOpen: semesterGoals.filter((goal) => goal.status === 'open').length,
      goalsInProgress: semesterGoals.filter((goal) => goal.status === 'in_progress').length,
      goalsCompleted: semesterGoals.filter((goal) => goal.status === 'completed').length,
      goalsNotCompleted: semesterGoals.filter((goal) => goal.status === 'not_completed')
        .length,
      journalsSubmitted: semesterJournals.length,
      missingWeeksEstimate,
      roadmapTreated: relevantProgress.filter(
        (item) => item.learnerCompleted || item.coachCompleted || item.coachConfirmed,
      ).length,
      roadmapTotal: roadmapIds.size,
      roadmapUnconfirmed: relevantProgress.filter(
        (item) =>
          (item.learnerCompleted || item.coachCompleted) && !item.coachConfirmed,
      ).length,
    })
  }

  const handleClose = async (summaryNote: string, carryOverToSemesterId?: string) => {
    if (!learnerId || !closingSemester) return
    await closeSemester(learnerId, closingSemester.id, summaryNote)
    if (carryOverToSemesterId) {
      await carryOverOpenGoals(learnerId, closingSemester.id, carryOverToSemesterId)
    }
    setClosingSemester(null)
    setCloseSummary(null)
  }

  return (
    <>
      <PageHeader
        title="Semester"
        description="Semester anlegen, aktivieren und abschliessen"
      />

      <div className="mb-6">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Neues Semester
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Laden…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : semesters.length === 0 ? (
        <p className="text-sm text-ink-muted">Noch keine Semester angelegt.</p>
      ) : (
        <div className="space-y-4">
          {semesters.map((semester) => (
            <Card key={semester.id}>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{semester.label}</CardTitle>
                <Badge>{semesterStatusLabels[semester.status]}</Badge>
              </div>
              {semester.academicYear ? (
                <CardDescription>Schuljahr {semester.academicYear}</CardDescription>
              ) : null}
              <p className="mt-3 text-sm">
                {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
              </p>
              <p className="text-sm text-ink-muted">
                IMS-Quartale: {semester.primaryImsQuarters.join(', ')}
              </p>
              {semester.summaryNote ? (
                <p className="text-sm text-ink-muted">
                  <span className="font-medium">Abschluss:</span> {semester.summaryNote}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(semester)}>
                  Bearbeiten
                </Button>
                {semester.status === 'planned' ? (
                  <Button size="sm" onClick={() => void handleActivate(semester.id)}>
                    Aktivieren
                  </Button>
                ) : null}
                {semester.status === 'active' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void openCloseDialog(semester)}
                  >
                    Abschliessen
                  </Button>
                ) : null}
                {semester.status === 'completed' ? (
                  <Button size="sm" onClick={() => void reopenSemester(learnerId!, semester.id)}>
                    Wieder öffnen
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSemester ? 'Semester bearbeiten' : 'Neues Semester'}
            </DialogTitle>
          </DialogHeader>
          <SemesterForm
            semester={editingSemester ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <SemesterCloseDialog
        semester={closingSemester}
        summary={closeSummary}
        targetSemesters={semesters.filter(
          (semester) =>
            semester.id !== closingSemester?.id &&
            (semester.status === 'planned' || semester.status === 'active'),
        )}
        open={closingSemester !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClosingSemester(null)
            setCloseSummary(null)
          }
        }}
        onConfirm={handleClose}
      />
    </>
  )
}
