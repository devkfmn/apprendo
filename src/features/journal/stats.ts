import { startOfISOWeek } from 'date-fns'
import { weeksBetween } from '@/lib/week'
import type { JournalEntry, Semester } from '@/types/domain'

export function countJournalSemesterStats(
  entries: JournalEntry[],
  semester: Pick<Semester, 'id' | 'startDate' | 'endDate'> | null | undefined,
  options?: { throughDate?: Date },
): { submitted: number; missing: number; expectedWeeks: number } {
  if (!semester) return { submitted: 0, missing: 0, expectedWeeks: 0 }

  const semesterEntries = entries.filter(
    (entry) => entry.semesterId === semester.id && entry.status === 'submitted',
  )
  const submittedKeys = new Set(
    semesterEntries.map((entry) => `${entry.year}-${entry.calendarWeek}`),
  )

  let expectedWeeks = weeksBetween(semester.startDate, semester.endDate)
  if (options?.throughDate) {
    const through = startOfISOWeek(options.throughDate)
    expectedWeeks = expectedWeeks.filter((week) => new Date(week.weekStart) <= through)
  }

  const missing = expectedWeeks.filter(
    (week) => !submittedKeys.has(`${week.year}-${week.calendarWeek}`),
  ).length

  return {
    submitted: semesterEntries.length,
    missing,
    expectedWeeks: expectedWeeks.length,
  }
}
