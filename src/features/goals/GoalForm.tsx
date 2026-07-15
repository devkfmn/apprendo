import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Semester, SemesterGoal } from '@/types/domain'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const goalSchema = z.object({
  semesterId: z.string().min(1, 'Semester erforderlich'),
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().min(1, 'Beschreibung erforderlich'),
  dueDate: z.string().optional(),
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
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      semesterId: goal?.semesterId ?? defaultSemesterId ?? '',
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      dueDate: goal?.dueDate ?? '',
      sortOrder: goal?.sortOrder ?? 0,
    },
  })

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      semesterId: values.semesterId,
      title: values.title,
      description: values.description,
      dueDate: values.dueDate?.trim() || null,
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
          <Label htmlFor="dueDate">Fälligkeitsdatum (optional)</Label>
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DateInput
                id="dueDate"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
              />
            )}
          />
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
