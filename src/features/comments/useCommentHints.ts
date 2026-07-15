import { useCallback, useEffect, useMemo, useState } from 'react'
import { listContentViewsForLearner } from '@/features/comments/views'
import type {
  CommentTargetKind,
  ContentViewReceipt,
  JournalEntry,
  LearningReport,
} from '@/types/domain'

export type UnreadCommentHint = {
  targetKind: CommentTargetKind
  targetId: string
  label: string
  commentedAt: string
  authorName: string
}

export type LearnerActivitySignals = {
  unreadComments: number
  unreadJournals: number
  unreadReports: number
}

function isAfterView(
  activityAt: string | null | undefined,
  viewedAt: string | undefined,
): boolean {
  if (!activityAt) return false
  if (!viewedAt) return true
  return activityAt > viewedAt
}

function viewMapFrom(views: ContentViewReceipt[]) {
  return new Map(views.map((view) => [`${view.targetKind}:${view.targetId}`, view.viewedAt]))
}

export function collectUnreadCommentHints(input: {
  journals: JournalEntry[]
  reports: LearningReport[]
  views: ContentViewReceipt[]
}): UnreadCommentHint[] {
  const viewMap = viewMapFrom(input.views)
  const hints: UnreadCommentHint[] = []

  for (const entry of input.journals) {
    if (!isAfterView(entry.lastCommentAt, viewMap.get(`journal:${entry.id}`))) continue
    hints.push({
      targetKind: 'journal',
      targetId: entry.id,
      label: `Wochenrückblick KW ${entry.calendarWeek}/${entry.year}`,
      commentedAt: entry.lastCommentAt!,
      authorName: entry.lastCommentAuthorName ?? 'Jemand',
    })
  }

  for (const report of input.reports) {
    if (!isAfterView(report.lastCommentAt, viewMap.get(`report:${report.id}`))) continue
    hints.push({
      targetKind: 'report',
      targetId: report.id,
      label: `Lernbericht «${report.title || 'Ohne Titel'}»`,
      commentedAt: report.lastCommentAt!,
      authorName: report.lastCommentAuthorName ?? 'Jemand',
    })
  }

  return hints.sort((a, b) => b.commentedAt.localeCompare(a.commentedAt))
}

/** Unread comments + newly submitted journals/reports not yet opened by the viewer. */
export function collectLearnerActivitySignals(input: {
  journals: JournalEntry[]
  reports: LearningReport[]
  views: ContentViewReceipt[]
}): LearnerActivitySignals {
  const viewMap = viewMapFrom(input.views)
  let unreadComments = 0
  let unreadJournals = 0
  let unreadReports = 0

  for (const entry of input.journals) {
    const viewedAt = viewMap.get(`journal:${entry.id}`)
    if (isAfterView(entry.lastCommentAt, viewedAt)) unreadComments += 1
    if (entry.status === 'submitted' && isAfterView(entry.submittedAt, viewedAt)) {
      unreadJournals += 1
    }
  }

  for (const report of input.reports) {
    const viewedAt = viewMap.get(`report:${report.id}`)
    if (isAfterView(report.lastCommentAt, viewedAt)) unreadComments += 1
    if (report.status === 'submitted' && isAfterView(report.submittedAt, viewedAt)) {
      unreadReports += 1
    }
  }

  return { unreadComments, unreadJournals, unreadReports }
}

export function useContentViews(viewerId: string | undefined, learnerId: string | undefined) {
  const [views, setViews] = useState<ContentViewReceipt[]>([])
  const [loading, setLoading] = useState(Boolean(viewerId && learnerId))

  const refresh = useCallback(async () => {
    if (!viewerId || !learnerId) {
      setViews([])
      return
    }
    setLoading(true)
    try {
      setViews(await listContentViewsForLearner(viewerId, learnerId))
    } finally {
      setLoading(false)
    }
  }, [viewerId, learnerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { views, loading, refresh }
}

export function useUnreadCommentHints(input: {
  viewerId: string | undefined
  learnerId: string | undefined
  journals: JournalEntry[]
  reports: LearningReport[]
}) {
  const { views, loading } = useContentViews(input.viewerId, input.learnerId)
  const hints = useMemo(
    () =>
      collectUnreadCommentHints({
        journals: input.journals,
        reports: input.reports,
        views,
      }),
    [input.journals, input.reports, views],
  )
  return { hints, loading }
}

export function useLearnerActivitySignals(input: {
  viewerId: string | undefined
  learnerId: string | undefined
  journals: JournalEntry[]
  reports: LearningReport[]
}) {
  const { views, loading } = useContentViews(input.viewerId, input.learnerId)
  const signals = useMemo(
    () =>
      collectLearnerActivitySignals({
        journals: input.journals,
        reports: input.reports,
        views,
      }),
    [input.journals, input.reports, views],
  )
  return { signals, loading }
}
