import { Select } from '@/components/ui/select'
import type { Semester } from '@/types/domain'

type SemesterFilterSelectProps = {
  semesters: Semester[]
  value: string
  onChange: (semesterId: string) => void
  className?: string
  id?: string
}

/** Shared semester filter. Empty value = Alle Semester. */
export function SemesterFilterSelect({
  semesters,
  value,
  onChange,
  className,
  id = 'semester-filter',
}: SemesterFilterSelectProps) {
  return (
    <Select
      id={id}
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Alle Semester</option>
      {semesters.map((semester) => (
        <option key={semester.id} value={semester.id}>
          {semester.label}
        </option>
      ))}
    </Select>
  )
}
