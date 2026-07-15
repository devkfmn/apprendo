import { useCallback, useEffect, useState } from 'react'
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '@/features/comments/api'
import type { CommentTargetKind, ContentComment, UserRole } from '@/types/domain'

export function useComments(
  learnerId: string | undefined,
  targetKind: CommentTargetKind,
  targetId: string | undefined,
) {
  const [comments, setComments] = useState<ContentComment[]>([])
  const [loading, setLoading] = useState(Boolean(learnerId && targetId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!learnerId || !targetId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setComments(await listComments(learnerId, targetKind, targetId))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kommentare konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [learnerId, targetKind, targetId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const add = useCallback(
    async (input: {
      authorId: string
      authorDisplayName: string
      authorRole: UserRole
      body: string
    }) => {
      if (!learnerId || !targetId) return
      const created = await createComment({
        learnerId,
        targetKind,
        targetId,
        ...input,
      })
      setComments((current) => [...current, created])
      return created
    },
    [learnerId, targetKind, targetId],
  )

  const edit = useCallback(
    async (commentId: string, body: string) => {
      if (!learnerId || !targetId) return
      await updateComment({ learnerId, targetKind, targetId, commentId, body })
      const updatedAt = new Date().toISOString()
      setComments((current) =>
        current.map((item) =>
          item.id === commentId ? { ...item, body: body.trim(), updatedAt } : item,
        ),
      )
    },
    [learnerId, targetKind, targetId],
  )

  const remove = useCallback(
    async (commentId: string) => {
      if (!learnerId || !targetId) return
      await deleteComment({ learnerId, targetKind, targetId, commentId })
      setComments((current) => current.filter((item) => item.id !== commentId))
    },
    [learnerId, targetKind, targetId],
  )

  return { comments, loading, error, refresh, add, edit, remove }
}
