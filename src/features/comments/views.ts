import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, paths } from '@/lib/firebase'
import type { CommentTargetKind, ContentViewReceipt } from '@/types/domain'

export function contentViewId(
  learnerId: string,
  targetKind: CommentTargetKind,
  targetId: string,
): string {
  return `${learnerId}_${targetKind}_${targetId}`
}

export async function markContentViewed(input: {
  viewerId: string
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
}): Promise<void> {
  const id = contentViewId(input.learnerId, input.targetKind, input.targetId)
  const receipt: ContentViewReceipt = {
    id,
    viewerId: input.viewerId,
    learnerId: input.learnerId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    viewedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, paths.contentView(input.viewerId, id)), receipt)
}

export async function listContentViewsForLearner(
  viewerId: string,
  learnerId: string,
): Promise<ContentViewReceipt[]> {
  const result = await getDocs(
    query(collection(db, paths.contentViews(viewerId)), where('learnerId', '==', learnerId)),
  )
  return result.docs.map((item) => ({ id: item.id, ...item.data() }) as ContentViewReceipt)
}

/** Touch parent journal/report so dashboards can detect new comments. */
export async function touchParentCommentMeta(input: {
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  authorId: string
  authorDisplayName: string
  at: string
}): Promise<void> {
  const parentPath =
    input.targetKind === 'journal'
      ? paths.journalEntry(input.learnerId, input.targetId)
      : paths.report(input.learnerId, input.targetId)

  await updateDoc(doc(db, parentPath), {
    lastCommentAt: input.at,
    lastCommentAuthorId: input.authorId,
    lastCommentAuthorName: input.authorDisplayName,
  })
}
