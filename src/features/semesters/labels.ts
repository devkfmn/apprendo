import type { GoalStatus, JournalStatus, SemesterStatus } from '@/types/domain'

export const semesterStatusLabels: Record<SemesterStatus, string> = {
  planned: 'Geplant',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
}

export const goalStatusLabels: Record<GoalStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  completed: 'Erreicht',
  not_completed: 'Nicht erreicht',
  carried_over: 'Übertragen',
}

export const journalStatusLabels: Record<JournalStatus, string> = {
  draft: 'Entwurf',
  submitted: 'Eingereicht',
}

export const IMS_QUARTERS = Array.from({ length: 16 }, (_, i) => i + 1)
