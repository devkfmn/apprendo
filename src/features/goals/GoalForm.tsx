import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { goalStatusLabels } from '@/features/semesters/labels'
import type { GoalStatus, Semester, SemesterGoal } from '@/types/domain'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const goalSchema = z.object({
  semesterId: z.string().min(1, 'Semester erforderlich'),
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().min(1, 'Beschreibung erforderlich'),
  status: z.enum([
    'open',
    'in_progress',
    'completed',
    'not_completed',
    'carried_over',
  ] as const),
  dueDate: z.string().optional(),
  completionNote: z.string().optional(),
  sortOrder: z.number().int().min(0),
})

type GoalFormValues = z.infer<typeof goalSchema>

type GoalFormProps = {
  goal?: SemesterGoal
  semesters: Semester[]
  defaultSemesterId?: string
  onSubmit: (values: {
    semesterId: string
    title: string
    description: string
    status: GoalStatus
    dueDate?: string | null
    completionNote?: string | null
    sortOrder: number
  }) => Promise<void>
  onCancel: () => void
}

export function GoalForm({
  goal,
  semesters,
  defaultSemesterId,
  onSubmit,
  onCancel,
}: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      semesterId: goal?.semesterId ?? defaultSemesterId ?? '',
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      status: goal?.status ?? 'open',
      dueDate: goal?.dueDate ?? '',
      completionNote: goal?.completionNote ?? '',
      sortOrder: goal?.sortOrder ?? 0,
    },
  })

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      semesterId: values.semesterId,
      title: values.title,
      description: values.description,
      status: values.status,
      dueDate: values.dueDate?.trim() || null,
      completionNote: values.completionNote?.trim() || null,
      sortOrder: values.sortOrder,
    })
  })

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="semesterId">Semester</Label>
        <Select id="semesterId" {...register('semesterId')}>
          <option value="">Semester wählen…</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        {errors.semesterId ? (
          <p className="text-sm text-danger">{errors.semesterId.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" {...register('title')} />
        {errors.title ? <p className="text-sm text-danger">{errors.title.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" rows={3} {...register('description')} />
        {errors.description ? (
          <p className="text-sm text-danger">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register('status')}>
            {(Object.keys(goalStatusLabels) as GoalStatus[]).map((status) => (
              <option key={status} value={status}>
                {goalStatusLabels[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Fälligkeitsdatum (optional)</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Reihenfolge</Label>
        <Input
          id="sortOrder"
          type="number"
          min={0}
          {...register('sortOrder', { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="completionNote">Abschlussnotiz (optional)</Label>
        <Textarea
          id="completionNote"
          rows={2}
          placeholder="Notiz beim Abschliessen des Ziels…"
          {...register('completionNote')}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Speichern…' : goal ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </form>
  )
}
