import { useEffect } from 'react'
import { markContentViewed } from '@/features/comments/views'
import type { CommentTargetKind } from '@/types/domain'

/** Records that the viewer opened a journal/report (clears dashboard comment hints). */
export function useMarkContentViewed(input: {
  viewerId?: string
  learnerId?: string
  targetKind: CommentTargetKind
  targetId?: string
  /** Only mark when parent content is visible/submitted. */
  enabled?: boolean
}) {
  const { viewerId, learnerId, targetKind, targetId, enabled = true } = input

  useEffect(() => {
    if (!enabled || !viewerId || !learnerId || !targetId) return
    void markContentViewed({
      viewerId,
      learnerId,
      targetKind,
      targetId,
    })
  }, [viewerId, learnerId, targetKind, targetId, enabled])
}
