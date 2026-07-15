import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, paths } from '@/lib/firebase'
import type { Semester, SemesterStatus } from '@/types/domain'

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
  const q = query(collection(db, paths.semesters(learnerId)), orderBy('startDate', 'desc'))
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

export async function activateSemester(
  learnerId: string,
  semesterId: string,
): Promise<void> {
  const activeQuery = query(
    collection(db, paths.semesters(learnerId)),
    where('status', '==', 'active'),
  )
  const activeSnap = await getDocs(activeQuery)
  const batch = writeBatch(db)
  const timestamp = now()

  for (const docSnap of activeSnap.docs) {
    if (docSnap.id !== semesterId) {
      batch.update(docSnap.ref, {
        status: 'planned',
        completedAt: null,
        updatedAt: timestamp,
      })
    }
  }

  batch.update(doc(db, paths.semester(learnerId, semesterId)), {
    status: 'active',
    updatedAt: timestamp,
  })

  await batch.commit()
}

export async function reopenSemester(learnerId: string, semesterId: string): Promise<void> {
  await activateSemester(learnerId, semesterId)
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
