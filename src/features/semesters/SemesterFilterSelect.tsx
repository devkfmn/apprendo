import { Select } from '@/components/ui/select'
import type { Semester } from '@/types/domain'

type SemesterFilterSelectProps = {
  semesters: Semester[]
  value: string
  onChange: (semesterId: string) => void
  className?: string
  id?: string
  /** Counts keyed by semester id. Shown as "· N {countLabel}". */
  countsBySemesterId?: Record<string, number>
  /** Override for "Alle Semester"; defaults to the sum of per-semester counts. */
  totalCount?: number
  /** Word after the number, e.g. "geschrieben". */
  countLabel?: string
}

type CountableBySemester = {
  semesterId?: string | null
  submittedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

function formatOptionLabel(
  label: string,
  count: number | undefined,
  countLabel?: string,
) {
  if (count === undefined) return label
  const suffix = countLabel ? `${count} ${countLabel}` : String(count)
  return `${label} · ${suffix}`
}

/**
 * Prefer a stored semesterId when it still exists; otherwise map by date
 * (submittedAt → createdAt → updatedAt) into a semester date range.
 */
export function resolveSemesterId(
  item: CountableBySemester,
  semesters: Semester[],
): string | null {
  if (item.semesterId && semesters.some((semester) => semester.id === item.semesterId)) {
    return item.semesterId
  }
  const iso = item.submittedAt || item.createdAt || item.updatedAt
  if (!iso) return null
  const day = iso.slice(0, 10)
  return (
    semesters.find(
      (semester) => semester.startDate <= day && day <= semester.endDate,
    )?.id ?? null
  )
}

/** Shared semester filter. Empty value = Alle Semester. */
export function SemesterFilterSelect({
  semesters,
  value,
  onChange,
  className,
  id = 'semester-filter',
  countsBySemesterId,
  totalCount: totalCountOverride,
  countLabel,
}: SemesterFilterSelectProps) {
  const totalCount =
    totalCountOverride ??
    (countsBySemesterId
      ? Object.values(countsBySemesterId).reduce((sum, n) => sum + n, 0)
      : undefined)

  return (
    <Select
      id={id}
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">
        {formatOptionLabel('Alle Semester', totalCount, countLabel)}
      </option>
      {semesters.map((semester) => (
        <option key={semester.id} value={semester.id}>
          {formatOptionLabel(
            semester.label,
            countsBySemesterId?.[semester.id] ?? (countsBySemesterId ? 0 : undefined),
            countLabel,
          )}
        </option>
      ))}
    </Select>
  )
}

/**
 * Count items per semester. When `semesters` is provided, orphaned or missing
 * semesterIds are resolved via date ranges so counts stay accurate after
 * semester recreations.
 */
export function countBySemesterId(
  items: CountableBySemester[],
  semesters?: Semester[],
): Record<string, number> {
  if (!semesters) {
    const counts: Record<string, number> = {}
    for (const item of items) {
      if (!item.semesterId) continue
      counts[item.semesterId] = (counts[item.semesterId] ?? 0) + 1
    }
    return counts
  }

  const counts: Record<string, number> = {}
  for (const semester of semesters) counts[semester.id] = 0
  for (const item of items) {
    const id = resolveSemesterId(item, semesters)
    if (!id || counts[id] === undefined) continue
    counts[id] += 1
  }
  return counts
}
