import type { Semester, SemesterStatus } from '@/types/domain'

export type DefaultSemesterInput = {
  label: string
  academicYear: string
  startDate: string
  endDate: string
  primaryImsQuarters: [number, number]
  status: SemesterStatus
}

const SEMESTER_COUNT = 8

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Add months to a 1-based calendar month (timezone-safe, no Date math). */
function addMonths(
  year: number,
  month: number,
  months: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + months
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

function daysInMonth(year: number, month: number): number {
  // UTC Date: day 0 of next month = last day of `month`
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Last day of the month before `{year}-{month}-01`. */
function dayBeforeFirstOf(year: number, month: number): string {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return formatYmd(prevYear, prevMonth, daysInMonth(prevYear, prevMonth))
}

function schoolYearLabel(startYear: number, startMonth: number): string {
  // HS (Aug): school year starts that calendar year; FS (Feb): previous calendar year
  const ayStart = startMonth === 8 ? startYear : startYear - 1
  const ayEnd = String(ayStart + 1).slice(-2)
  return `${ayStart}/${ayEnd}`
}

function termTag(startYear: number, startMonth: number): string {
  return startMonth === 8 ? `HS ${startYear}` : `FS ${startYear}`
}

/** Today's date as YYYY-MM-DD in local calendar. */
export function todayYmd(now = new Date()): string {
  return formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * Build the standard 8 planned semesters from Lehrbeginn year.
 * Semester 1 starts 01.08.{lehrbeginnYear}; each lasts 6 months;
 * BiVo quarters map as S1→Q1+Q2 … S8→Q15+Q16.
 */
export function buildDefaultSemesters(lehrbeginnYear: number): DefaultSemesterInput[] {
  if (!Number.isInteger(lehrbeginnYear) || lehrbeginnYear < 2000 || lehrbeginnYear > 2100) {
    throw new Error('lehrbeginnYear must be an integer between 2000 and 2100')
  }

  const results: DefaultSemesterInput[] = []

  for (let i = 0; i < SEMESTER_COUNT; i += 1) {
    const { year: startYear, month: startMonth } = addMonths(lehrbeginnYear, 8, i * 6)
    const next = addMonths(startYear, startMonth, 6)
    const startDate = formatYmd(startYear, startMonth, 1)
    const endDate = dayBeforeFirstOf(next.year, next.month)
    const q1 = i * 2 + 1
    const academicYear = schoolYearLabel(startYear, startMonth)
    const tag = termTag(startYear, startMonth)

    results.push({
      label: `Semester ${i + 1} (${tag})`,
      academicYear,
      startDate,
      endDate,
      primaryImsQuarters: [q1, q1 + 1],
      status: 'planned',
    })
  }

  return results
}

/** True when `date` (YYYY-MM-DD) falls within the semester inclusive range. */
export function semesterContainsDate(
  semester: Pick<Semester, 'startDate' | 'endDate'>,
  date: string,
): boolean {
  return semester.startDate <= date && date <= semester.endDate
}

/**
 * Current semester = the open (not completed) semester whose date range contains `today`.
 * Legacy `status: 'active'` is treated as open.
 */
export function findCurrentSemester<T extends Pick<Semester, 'startDate' | 'endDate' | 'status'>>(
  semesters: T[],
  today: string = todayYmd(),
): T | null {
  return (
    semesters.find(
      (semester) =>
        semester.status !== 'completed' && semesterContainsDate(semester, today),
    ) ?? null
  )
}

/** Whether this semester is the current one by date (and not completed). */
export function isCurrentSemester(
  semester: Pick<Semester, 'startDate' | 'endDate' | 'status'>,
  today: string = todayYmd(),
): boolean {
  return semester.status !== 'completed' && semesterContainsDate(semester, today)
}
