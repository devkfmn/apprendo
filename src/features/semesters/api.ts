import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, paths } from '@/lib/firebase'
import type { Semester, SemesterStatus } from '@/types/domain'
import { buildDefaultSemesters } from './defaultTimeline'

const now = () => new Date().toISOString()

function mapSemester(id: string, data: Omit<Semester, 'id'>): Semester {
  return { id, ...data }
}

export type CreateSemesterInput = {
  label: string
  academicYear?: string
  startDate: string
  endDate: string
  primaryImsQuarters: [number, number]
  status?: SemesterStatus
}

export type UpdateSemesterInput = Partial<
  Omit<Semester, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
>

export async function listSemesters(learnerId: string): Promise<Semester[]> {
  const q = query(collection(db, paths.semesters(learnerId)), orderBy('startDate', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapSemester(d.id, d.data() as Omit<Semester, 'id'>))
}

export async function getSemester(
  learnerId: string,
  semesterId: string,
): Promise<Semester | null> {
  const snap = await getDoc(doc(db, paths.semester(learnerId, semesterId)))
  if (!snap.exists()) return null
  return mapSemester(snap.id, snap.data() as Omit<Semester, 'id'>)
}

export async function createSemester(
  learnerId: string,
  input: CreateSemesterInput,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, paths.semesters(learnerId)), {
    label: input.label,
    academicYear: input.academicYear ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    primaryImsQuarters: input.primaryImsQuarters,
    status: input.status ?? 'planned',
    summaryNote: null,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
    completedAt: null,
  })
  return ref.id
}

/**
 * Create the standard 8 planned semesters from Lehrbeginn.
 * Refuses if the learner already has any semester documents.
 */
export async function createDefaultSemesters(
  learnerId: string,
  lehrbeginnYear: number,
  createdBy: string,
): Promise<string[]> {
  const existing = await getDocs(collection(db, paths.semesters(learnerId)))
  if (!existing.empty) {
    throw new Error('Semester existieren bereits — automatische Planung nur bei leerer Liste.')
  }

  const defaults = buildDefaultSemesters(lehrbeginnYear)
  const batch = writeBatch(db)
  const timestamp = now()
  const ids: string[] = []

  for (const input of defaults) {
    const ref = doc(collection(db, paths.semesters(learnerId)))
    ids.push(ref.id)
    batch.set(ref, {
      label: input.label,
      academicYear: input.academicYear ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      primaryImsQuarters: input.primaryImsQuarters,
      status: input.status ?? 'planned',
      summaryNote: null,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    })
  }

  await batch.commit()
  return ids
}

export async function updateSemester(
  learnerId: string,
  semesterId: string,
  input: UpdateSemesterInput,
): Promise<void> {
  await updateDoc(doc(db, paths.semester(learnerId, semesterId)), {
    ...input,
    updatedAt: now(),
  })
}

/** Reopen a completed semester so it can become current again by date. */
export async function reopenSemester(learnerId: string, semesterId: string): Promise<void> {
  const timestamp = now()
  await updateDoc(doc(db, paths.semester(learnerId, semesterId)), {
    status: 'planned',
    completedAt: null,
    updatedAt: timestamp,
  })
}

export async function closeSemester(
  learnerId: string,
  semesterId: string,
  summaryNote: string,
): Promise<void> {
  const timestamp = now()
  await updateDoc(doc(db, paths.semester(learnerId, semesterId)), {
    status: 'completed',
    summaryNote,
    completedAt: timestamp,
    updatedAt: timestamp,
  })
}
