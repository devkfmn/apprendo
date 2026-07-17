import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { getUserProfile, updateLearnerLehrbeginn } from '@/features/auth/api'
import {
  closeSemester,
  createDefaultSemesters,
  createSemester,
  reopenSemester,
  updateSemester,
} from '@/features/semesters/api'
import { isCurrentSemester } from '@/features/semesters/defaultTimeline'
import { carryOverOpenGoals, listGoals } from '@/features/goals/api'
import { listJournalEntries } from '@/features/journal/api'
import { countJournalSemesterStats } from '@/features/journal/stats'
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
import { semesterBadgeLabel } from '@/features/semesters/labels'
import { useSemesters } from '@/features/semesters/useSemesters'
import { useAuth } from '@/features/auth/useAuth'
import { useViewerArea } from '@/features/auth/useViewerArea'
import { formatDate } from '@/lib/utils'
import type { Semester } from '@/types/domain'

export function CoachSemestersPage() {
  const { learnerId } = useParams<{ learnerId: string }>()
  const { profile } = useAuth()
  const viewer = useViewerArea()
  const canEdit = viewer?.canEdit ?? false
  const { semesters, loading, error } = useSemesters(learnerId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null)
  const [closingSemester, setClosingSemester] = useState<Semester | null>(null)
  const [closeSummary, setCloseSummary] = useState<SemesterCloseSummary | null>(null)
  const [lehrbeginnYear, setLehrbeginnYear] = useState<number | null>(null)
  const [lehrbeginnInput, setLehrbeginnInput] = useState(String(new Date().getFullYear()))
  const [planning, setPlanning] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [savingLehrbeginn, setSavingLehrbeginn] = useState(false)

  useEffect(() => {
    if (!learnerId) return
    void getUserProfile(learnerId).then((user) => {
      const year = user?.lehrbeginnYear ?? null
      setLehrbeginnYear(year)
      if (year != null) setLehrbeginnInput(String(year))
    })
  }, [learnerId])

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
    if (!learnerId || !profile || !canEdit) return

    if (editingSemester) {
      await updateSemester(learnerId, editingSemester.id, values)
    } else {
      await createSemester(learnerId, values, profile.id)
    }

    setFormOpen(false)
    setEditingSemester(null)
  }

  const parseLehrbeginnYear = (): number | null => {
    const year = Number.parseInt(lehrbeginnInput, 10)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null
    return year
  }

  const handlePlanDefaults = async () => {
    if (!learnerId || !profile || !canEdit) return
    const year = parseLehrbeginnYear()
    if (year == null) {
      setPlanError('Bitte ein gültiges Lehrbeginn-Jahr zwischen 2000 und 2100 eingeben.')
      return
    }

    setPlanning(true)
    setPlanError(null)
    try {
      await updateLearnerLehrbeginn(learnerId, year)
      setLehrbeginnYear(year)
      await createDefaultSemesters(learnerId, year, profile.id)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Planung fehlgeschlagen.')
    } finally {
      setPlanning(false)
    }
  }

  const handleSaveLehrbeginn = async () => {
    if (!learnerId || !canEdit) return
    const year = parseLehrbeginnYear()
    if (year == null) {
      setPlanError('Bitte ein gültiges Lehrbeginn-Jahr zwischen 2000 und 2100 eingeben.')
      return
    }
    setSavingLehrbeginn(true)
    setPlanError(null)
    try {
      await updateLearnerLehrbeginn(learnerId, year)
      setLehrbeginnYear(year)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingLehrbeginn(false)
    }
  }

  const openCloseDialog = async (semester: Semester) => {
    if (!learnerId || !canEdit) return
    setClosingSemester(semester)
    setCloseSummary(null)

    const [goals, journals, schoolItems, companyItems, progress] = await Promise.all([
      listGoals(learnerId),
      listJournalEntries(learnerId, { submittedOnly: true }),
      fetchSchoolItems(),
      fetchCompanyItems(learnerId, { includeArchived: true }),
      fetchProgress(learnerId),
    ])

    const semesterGoals = goals.filter((goal) => goal.semesterId === semester.id)
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
    const journalStats = countJournalSemesterStats(journals, semester)

    setCloseSummary({
      goalsTotal: semesterGoals.length,
      goalsUnassessed: semesterGoals.filter((goal) => !goal.assessmentGrade).length,
      goalsAssessed: semesterGoals.filter((goal) => Boolean(goal.assessmentGrade)).length,
      goalsByGrade: {
        A: semesterGoals.filter((goal) => goal.assessmentGrade === 'A').length,
        B: semesterGoals.filter((goal) => goal.assessmentGrade === 'B').length,
        C: semesterGoals.filter((goal) => goal.assessmentGrade === 'C').length,
        D: semesterGoals.filter((goal) => goal.assessmentGrade === 'D').length,
        E: semesterGoals.filter((goal) => goal.assessmentGrade === 'E').length,
      },
      journalsSubmitted: journalStats.submitted,
      missingWeeksEstimate: journalStats.missing,
      roadmapTreated: relevantProgress.filter((item) => item.treated).length,
      roadmapTotal: roadmapIds.size,
    })
  }

  const handleClose = async (summaryNote: string, carryOverToSemesterId?: string) => {
    if (!learnerId || !closingSemester || !canEdit) return
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
        description={
          canEdit
            ? 'Semester planen und abschliessen'
            : 'Semesterübersicht (nur Lesen)'
        }
      />

      {canEdit && semesters.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lehrbeginn-year">Lehrbeginn (Jahr)</Label>
            <Input
              id="lehrbeginn-year"
              type="number"
              min={2000}
              max={2100}
              className="w-32"
              value={lehrbeginnInput}
              onChange={(event) => setLehrbeginnInput(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            disabled={savingLehrbeginn}
            onClick={() => void handleSaveLehrbeginn()}
          >
            {savingLehrbeginn ? 'Speichern…' : 'Lehrbeginn speichern'}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Neues Semester
          </Button>
          {lehrbeginnYear != null ? (
            <p className="w-full text-sm text-ink-muted">
              Lehrbeginn {lehrbeginnYear} (ändert bestehende Semester nicht)
            </p>
          ) : null}
          {planError ? <p className="w-full text-sm text-danger">{planError}</p> : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">Laden…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : semesters.length === 0 ? (
        canEdit ? (
          <Card>
            <CardTitle>Semester automatisch planen</CardTitle>
            <CardDescription className="mt-1">
              8 Semester ab 01.08. des Lehrbeginn-Jahrs, je 6 Monate, mit BiVo-Quartalen Q1–Q16.
              Danach kannst du einzeln abschliessen und anpassen. Das aktuelle Semester ergibt sich aus dem Datumsbereich.
            </CardDescription>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lehrbeginn-year-empty">Lehrbeginn (Jahr)</Label>
                <Input
                  id="lehrbeginn-year-empty"
                  type="number"
                  min={2000}
                  max={2100}
                  className="w-32"
                  value={lehrbeginnInput}
                  onChange={(event) => setLehrbeginnInput(event.target.value)}
                />
              </div>
              <Button disabled={planning} onClick={() => void handlePlanDefaults()}>
                {planning ? 'Planen…' : '8 Semester planen'}
              </Button>
              <Button variant="outline" onClick={openCreate}>
                <Plus className="size-4" />
                Einzeln anlegen
              </Button>
            </div>
            {planError ? <p className="mt-3 text-sm text-danger">{planError}</p> : null}
          </Card>
        ) : (
          <p className="text-sm text-ink-muted">Noch keine Semester angelegt.</p>
        )
      ) : (
        <div className="space-y-4">
          {semesters.map((semester) => {
            const current = isCurrentSemester(semester)
            const isOpen = semester.status !== 'completed'
            return (
              <Card key={semester.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{semester.label}</CardTitle>
                  <Badge variant={current ? 'default' : 'secondary'}>
                    {semesterBadgeLabel(semester, current)}
                  </Badge>
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
                  {canEdit ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(semester)}>
                        Bearbeiten
                      </Button>
                      {isOpen ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void openCloseDialog(semester)}
                        >
                          Abschliessen
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void reopenSemester(learnerId!, semester.id)}
                        >
                          Wieder öffnen
                        </Button>
                      )}
                    </>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {canEdit ? (
        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setEditingSemester(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSemester ? 'Semester bearbeiten' : 'Neues Semester'}
              </DialogTitle>
            </DialogHeader>
            {formOpen ? (
              <SemesterForm
                key={editingSemester?.id ?? 'create'}
                semester={editingSemester ?? undefined}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setFormOpen(false)
                  setEditingSemester(null)
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {canEdit ? (
        <SemesterCloseDialog
          semester={closingSemester}
          summary={closeSummary}
          targetSemesters={semesters.filter(
            (semester) =>
              semester.id !== closingSemester?.id && semester.status !== 'completed',
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
      ) : null}
    </>
  )
}
