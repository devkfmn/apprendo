import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, paths } from '@/lib/firebase'
import { markContentViewed, touchParentCommentMeta } from '@/features/comments/views'
import type { CommentTargetKind, ContentComment, UserRole } from '@/types/domain'

function commentsPath(learnerId: string, targetKind: CommentTargetKind, targetId: string) {
  return targetKind === 'journal'
    ? paths.journalComments(learnerId, targetId)
    : paths.reportComments(learnerId, targetId)
}

function commentPath(
  learnerId: string,
  targetKind: CommentTargetKind,
  targetId: string,
  commentId: string,
) {
  return targetKind === 'journal'
    ? paths.journalComment(learnerId, targetId, commentId)
    : paths.reportComment(learnerId, targetId, commentId)
}

export async function listComments(
  learnerId: string,
  targetKind: CommentTargetKind,
  targetId: string,
): Promise<ContentComment[]> {
  const result = await getDocs(collection(db, commentsPath(learnerId, targetKind, targetId)))
  return result.docs
    .map((item) => ({ id: item.id, ...item.data() }) as ContentComment)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function createComment(input: {
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  authorId: string
  authorDisplayName: string
  authorRole: UserRole
  body: string
}): Promise<ContentComment> {
  const body = input.body.trim()
  if (!body) throw new Error('Kommentar darf nicht leer sein.')
  if (body.length > 4000) throw new Error('Kommentar ist zu lang (max. 4000 Zeichen).')

  const reference = doc(collection(db, commentsPath(input.learnerId, input.targetKind, input.targetId)))
  const timestamp = new Date().toISOString()
  const comment: ContentComment = {
    id: reference.id,
    learnerId: input.learnerId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    authorRole: input.authorRole,
    body,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await setDoc(reference, comment)
  await touchParentCommentMeta({
    learnerId: input.learnerId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    at: timestamp,
  })
  // Author already sees the thread; keep their dashboard clear for this item.
  await markContentViewed({
    viewerId: input.authorId,
    learnerId: input.learnerId,
    targetKind: input.targetKind,
    targetId: input.targetId,
  })
  return comment
}

export async function updateComment(input: {
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  commentId: string
  body: string
}): Promise<void> {
  const body = input.body.trim()
  if (!body) throw new Error('Kommentar darf nicht leer sein.')
  if (body.length > 4000) throw new Error('Kommentar ist zu lang (max. 4000 Zeichen).')

  await updateDoc(
    doc(db, commentPath(input.learnerId, input.targetKind, input.targetId, input.commentId)),
    { body, updatedAt: new Date().toISOString() },
  )
}

export async function deleteComment(input: {
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  commentId: string
}): Promise<void> {
  await deleteDoc(
    doc(db, commentPath(input.learnerId, input.targetKind, input.targetId, input.commentId)),
  )
}
