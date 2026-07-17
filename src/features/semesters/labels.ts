import type {
  GoalAssessmentGrade,
  JournalStatus,
  SemesterStatus,
} from '@/types/domain'

export const semesterStatusLabels: Record<SemesterStatus, string> = {
  planned: 'Geplant',
  active: 'Aktuell', // legacy stored status; UI prefers date-based "Aktuell"
  completed: 'Abgeschlossen',
}

/** Badge label: current-by-date wins over stored status. */
export function semesterBadgeLabel(
  semester: { status: SemesterStatus; startDate: string; endDate: string },
  isCurrent: boolean,
): string {
  if (semester.status === 'completed') return semesterStatusLabels.completed
  if (isCurrent) return 'Aktuell'
  return semesterStatusLabels.planned
}

export const goalAssessmentGrades: GoalAssessmentGrade[] = ['A', 'B', 'C', 'D', 'E']

export const goalAssessmentLabels: Record<GoalAssessmentGrade, string> = {
  A: 'Übertrifft die Anforderungen deutlich',
  B: 'Übertrifft die Anforderungen',
  C: 'Entspricht den Anforderungen',
  D: 'Entspricht den Anforderungen mit Einschränkungen',
  E: 'Entspricht den Anforderungen nicht',
}

export function goalAssessmentBadgeLabel(grade?: GoalAssessmentGrade | null): string {
  if (!grade) return 'Ohne Beurteilung'
  return `${grade}) ${goalAssessmentLabels[grade]}`
}

export const journalStatusLabels: Record<JournalStatus, string> = {
  draft: 'Entwurf',
  submitted: 'Eingereicht',
}

export const IMS_QUARTERS = Array.from({ length: 16 }, (_, i) => i + 1)
