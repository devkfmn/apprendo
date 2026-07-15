import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { IMS_QUARTERS } from '@/features/semesters/labels'
import type { Semester } from '@/types/domain'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const semesterSchema = z
  .object({
    label: z.string().min(1, 'Bezeichnung erforderlich'),
    academicYear: z.string().optional(),
    startDate: z.string().min(1, 'Startdatum erforderlich'),
    endDate: z.string().min(1, 'Enddatum erforderlich'),
    primaryImsQuarter1: z.number().int().min(1).max(16),
    primaryImsQuarter2: z.number().int().min(1).max(16),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Enddatum muss nach Startdatum liegen',
    path: ['endDate'],
  })

type SemesterFormValues = z.infer<typeof semesterSchema>

type SemesterFormProps = {
  semester?: Semester
  onSubmit: (values: {
    label: string
    academicYear?: string
    startDate: string
    endDate: string
    primaryImsQuarters: [number, number]
  }) => Promise<void>
  onCancel: () => void
}

export function SemesterForm({ semester, onSubmit, onCancel }: SemesterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      label: semester?.label ?? '',
      academicYear: semester?.academicYear ?? '',
      startDate: semester?.startDate ?? '',
      endDate: semester?.endDate ?? '',
      primaryImsQuarter1: semester?.primaryImsQuarters[0] ?? 1,
      primaryImsQuarter2: semester?.primaryImsQuarters[1] ?? 2,
    },
  })

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      label: values.label,
      academicYear: values.academicYear?.trim() || undefined,
      startDate: values.startDate,
      endDate: values.endDate,
      primaryImsQuarters: [values.primaryImsQuarter1, values.primaryImsQuarter2],
    })
  })

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Bezeichnung</Label>
        <Input id="label" placeholder="z. B. HS 2026" {...register('label')} />
        {errors.label ? <p className="text-sm text-danger">{errors.label.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="academicYear">Schuljahr (optional)</Label>
        <Input id="academicYear" placeholder="z. B. 2026/27" {...register('academicYear')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Startdatum</Label>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DateInput
                id="startDate"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                required
              />
            )}
          />
          {errors.startDate ? (
            <p className="text-sm text-danger">{errors.startDate.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Enddatum</Label>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DateInput
                id="endDate"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                required
              />
            )}
          />
          {errors.endDate ? (
            <p className="text-sm text-danger">{errors.endDate.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primaryImsQuarter1">IMS-Quartal 1</Label>
          <Select
            id="primaryImsQuarter1"
            {...register('primaryImsQuarter1', { valueAsNumber: true })}
          >
            {IMS_QUARTERS.map((q) => (
              <option key={q} value={q}>
                Quartal {q}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryImsQuarter2">IMS-Quartal 2</Label>
          <Select
            id="primaryImsQuarter2"
            {...register('primaryImsQuarter2', { valueAsNumber: true })}
          >
            {IMS_QUARTERS.map((q) => (
              <option key={q} value={q}>
                Quartal {q}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Speichern…' : semester ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </form>
  )
}
