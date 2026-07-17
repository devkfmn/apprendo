import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Semester, SemesterGoal } from '@/types/domain'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const goalSchema = z.object({
  semesterId: z.string().min(1, 'Semester erforderlich'),
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().min(1, 'Beschreibung erforderlich'),
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
    dueDate?: string | null
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
    },
  })

  const submit = handleSubmit(async (values) => {
    const semester = semesters.find((s) => s.id === values.semesterId)
    await onSubmit({
      semesterId: values.semesterId,
      title: values.title,
      description: values.description,
      dueDate: semester?.endDate ?? null,
      sortOrder: goal?.sortOrder ?? Date.now(),
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
