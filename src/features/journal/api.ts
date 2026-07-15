import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { JournalAnswers, JournalEntry } from '@/types/domain'

const now = () => new Date().toISOString()
const entries = (learnerId: string) => collection(db, 'learners', learnerId, 'journalEntries')

export async function listJournalEntries(learnerId: string): Promise<JournalEntry[]> {
  const result = await getDocs(entries(learnerId))
  return result.docs
    .map((item) => ({ id: item.id, ...item.data() }) as JournalEntry)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

export async function getJournalEntry(
  learnerId: string,
  entryId: string,
): Promise<JournalEntry | null> {
  const result = await getDoc(doc(entries(learnerId), entryId))
  return result.exists() ? ({ id: result.id, ...result.data() } as JournalEntry) : null
}

/** Learner-only write operation; the coach role must not receive write access in rules. */
export async function saveJournalDraft(
  learnerId: string,
  values: Omit<JournalEntry, 'id' | 'learnerId' | 'createdAt' | 'updatedAt' | 'status' | 'submittedAt'>,
  entryId?: string,
): Promise<JournalEntry> {
  const reference = entryId ? doc(entries(learnerId), entryId) : doc(entries(learnerId))
  const existing = entryId ? await getJournalEntry(learnerId, entryId) : null
  if (existing?.status === 'submitted') throw new Error('Eingereichte Wochenrückblicke können nicht geändert werden.')
  const timestamp = now()
  const entry: JournalEntry = {
    ...values,
    id: reference.id,
    learnerId,
    status: 'draft',
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    submittedAt: null,
  }
  await setDoc(reference, entry, { merge: true })
  return entry
}

/** Learner-only write operation; submission timestamps are immutable audit data. */
export async function submitJournalEntry(learnerId: string, entryId: string): Promise<void> {
  const entry = await getJournalEntry(learnerId, entryId)
  if (!entry) throw new Error('Wochenrückblick nicht gefunden.')
  if (entry.status === 'submitted') return
  const timestamp = now()
  await updateDoc(doc(entries(learnerId), entryId), {
    status: 'submitted',
    submittedAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function deleteJournalDraft(learnerId: string, entryId: string): Promise<void> {
  const entry = await getJournalEntry(learnerId, entryId)
  if (!entry) return
  if (entry.status === 'submitted') {
    throw new Error('Eingereichte Wochenrückblicke können nicht gelöscht werden.')
  }
  await deleteDoc(doc(entries(learnerId), entryId))
}

export type JournalDraftInput = Omit<
  JournalEntry,
  'id' | 'learnerId' | 'createdAt' | 'updatedAt' | 'status' | 'submittedAt' | 'answers'
> & { answers: JournalAnswers }
