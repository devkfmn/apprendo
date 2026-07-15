import {
  addDays,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
} from 'date-fns'

export function getIsoWeekInfo(date = new Date()) {
  const weekStart = startOfISOWeek(date)
  const weekEnd = endOfISOWeek(date)
  return {
    calendarWeek: getISOWeek(date),
    year: getISOWeekYear(date),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  }
}

export function weekLabel(calendarWeek: number, year: number) {
  return `KW ${calendarWeek}/${year}`
}

export function weeksBetween(startIso: string, endIso: string) {
  const start = startOfISOWeek(new Date(startIso))
  const end = startOfISOWeek(new Date(endIso))
  const weeks: Array<{ calendarWeek: number; year: number; weekStart: string }> =
    []
  let cursor = start
  while (cursor <= end) {
    weeks.push({
      calendarWeek: getISOWeek(cursor),
      year: getISOWeekYear(cursor),
      weekStart: cursor.toISOString(),
    })
    cursor = addDays(cursor, 7)
  }
  return weeks
}
