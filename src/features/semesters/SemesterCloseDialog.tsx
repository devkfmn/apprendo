import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Semester } from '@/types/domain'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'

const closeSchema = z.object({
  summaryNote: z.string().min(1, 'Abschlussnotiz erforderlich'),
})

type CloseFormValues = z.infer<typeof closeSchema>

export type SemesterCloseSummary = {
  goalsTotal: number
  goalsUnassessed: number
  goalsAssessed: number
  goalsByGrade: Record<'A' | 'B' | 'C' | 'D' | 'E', number>
  journalsSubmitted: number
  missingWeeksEstimate: number
  roadmapTreated: number
  roadmapTotal: number
}

type SemesterCloseDialogProps = {
  semester: Semester | null
  targetSemesters: Semester[]
  summary?: SemesterCloseSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (summaryNote: string, carryOverToSemesterId?: string) => Promise<void>
}

export function SemesterCloseDialog({
  semester,
  targetSemesters,
  summary,
  open,
  onOpenChange,
  onConfirm,
}: SemesterCloseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CloseFormValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: { summaryNote: '' },
  })

  const [carryOverToSemesterId, setCarryOverToSemesterId] = useState('')
  const submit = handleSubmit(async (values) => {
    await onConfirm(values.summaryNote, carryOverToSemesterId || undefined)
    reset()
    setCarryOverToSemesterId('')
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Semester abschliessen</DialogTitle>
          <DialogDescription>
            {semester
              ? `«${semester.label}» wird als abgeschlossen markiert.`
              : 'Semester abschliessen'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {summary ? (
            <div className="space-y-2 rounded-lg border border-line bg-canvas/60 p-3 text-sm">
              <p className="font-medium">Kurzüberblick</p>
              <ul className="list-inside list-disc space-y-1 text-ink-muted">
                <li>
                  Ziele: {summary.goalsTotal} gesamt · {summary.goalsUnassessed} ohne Beurteilung
                  · {summary.goalsAssessed} beurteilt
                  {summary.goalsAssessed > 0
                    ? ` (A ${summary.goalsByGrade.A}, B ${summary.goalsByGrade.B}, C ${summary.goalsByGrade.C}, D ${summary.goalsByGrade.D}, E ${summary.goalsByGrade.E})`
                    : ''}
                </li>
                <li>
                  Wochenrückblicke eingereicht: {summary.journalsSubmitted}
                  {summary.missingWeeksEstimate > 0
                    ? ` · ca. ${summary.missingWeeksEstimate} Wochen ohne Einreichung`
                    : ''}
                </li>
                <li>
                  Roadmap: {summary.roadmapTreated}/{summary.roadmapTotal} behandelt
                </li>
              </ul>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="summaryNote">Abschlussauswertung</Label>
            <Textarea
              id="summaryNote"
              rows={4}
              placeholder="Zusammenfassung des Semesters…"
              {...register('summaryNote')}
            />
            {errors.summaryNote ? (
              <p className="text-sm text-danger">{errors.summaryNote.message}</p>
            ) : null}
          </div>
          {targetSemesters.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="carry-over">Nicht beurteilte Ziele übernehmen</Label>
              <Select
                id="carry-over"
                value={carryOverToSemesterId}
                onChange={(event) => setCarryOverToSemesterId(event.target.value)}
              >
                <option value="">Nicht beurteilte Ziele nicht übernehmen</option>
                {targetSemesters.map((target) => (
                  <option key={target.id} value={target.id}>
                    Nach «{target.label}» übernehmen
                  </option>
                ))}
              </Select>
              <p className="text-xs text-ink-muted">
                Ziele ohne Beurteilung bleiben im abgeschlossenen Semester als «übertragen»
                sichtbar und werden im Folgesemester neu angelegt.
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Kein geplantes oder aktives Folgesemester vorhanden. Lege zuerst das nächste Semester
              an, wenn Ziele übernommen werden sollen.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichern…' : 'Abschliessen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
