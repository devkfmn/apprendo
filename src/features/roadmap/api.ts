import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, paths, progressDocId } from '@/lib/firebase'
import type {
  CompanyRoadmapItem,
  ImsQuarter,
  RoadmapItemType,
  RoadmapProgress,
  SchoolRoadmapItem,
  Semester,
} from '@/types/domain'

const now = () => new Date().toISOString()

function mapSchoolItem(id: string, data: Omit<SchoolRoadmapItem, 'id'>): SchoolRoadmapItem {
  return { id, ...data }
}

function mapCompanyItem(id: string, data: Omit<CompanyRoadmapItem, 'id'>): CompanyRoadmapItem {
  return { id, ...data }
}

/** Maps current `treated` fields and legacy coach/learner flags. */
export function mapProgress(
  id: string,
  data: Record<string, unknown>,
): RoadmapProgress {
  const legacyTreated = Boolean(
    data.learnerCompleted || data.coachCompleted || data.coachConfirmed,
  )
  const treated =
    typeof data.treated === 'boolean' ? data.treated : legacyTreated

  const treatedAt =
    (data.treatedAt as string | null | undefined) ??
    (data.learnerCompletedAt as string | null | undefined) ??
    (data.coachCompletedAt as string | null | undefined) ??
    (data.coachConfirmedAt as string | null | undefined) ??
    null

  const treatedBy =
    (data.treatedBy as string | null | undefined) ??
    (data.learnerCompletedBy as string | null | undefined) ??
    (data.coachCompletedBy as string | null | undefined) ??
    (data.confirmedBy as string | null | undefined) ??
    null

  return {
    id,
    itemId: String(data.itemId ?? ''),
    itemType: data.itemType as RoadmapItemType,
    learnerId: String(data.learnerId ?? ''),
    treated,
    treatedAt,
    treatedBy,
    updatedAt: String(data.updatedAt ?? ''),
  }
}

export function isRoadmapTreated(progress: RoadmapProgress | null | undefined): boolean {
  return Boolean(progress?.treated)
}

function mapSemester(id: string, data: Omit<Semester, 'id'>): Semester {
  return { id, ...data }
}

export async function fetchSchoolItems(): Promise<SchoolRoadmapItem[]> {
  const snap = await getDocs(collection(db, paths.schoolRoadmap))
  return snap.docs
    .map((d) => mapSchoolItem(d.id, d.data() as Omit<SchoolRoadmapItem, 'id'>))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export type FetchCompanyItemsOptions = {
  includeArchived?: boolean
}

export async function fetchCompanyItems(
  learnerId: string,
  options: FetchCompanyItemsOptions = {},
): Promise<CompanyRoadmapItem[]> {
  const { includeArchived = false } = options
  const col = collection(db, paths.companyItems(learnerId))
  const snap = includeArchived
    ? await getDocs(col)
    : await getDocs(query(col, where('status', '==', 'active')))

  return snap.docs
    .map((d) => mapCompanyItem(d.id, d.data() as Omit<CompanyRoadmapItem, 'id'>))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function fetchProgress(learnerId: string): Promise<RoadmapProgress[]> {
  const snap = await getDocs(collection(db, paths.progress(learnerId)))
  return snap.docs.map((d) => mapProgress(d.id, d.data() as Record<string, unknown>))
}

export async function fetchActiveSemester(learnerId: string): Promise<Semester | null> {
  const q = query(
    collection(db, paths.semesters(learnerId)),
    where('status', '==', 'active'),
    limit(1),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]!
  return mapSemester(docSnap.id, docSnap.data() as Omit<Semester, 'id'>)
}

export type ProgressPatch = {
  treated: boolean
  treatedBy?: string | null
}

export async function upsertProgress(
  learnerId: string,
  itemType: RoadmapItemType,
  itemId: string,
  patch: ProgressPatch,
): Promise<void> {
  const id = progressDocId(itemType, itemId)
  const ref = doc(db, paths.progressItem(learnerId, id))
  const existing = await getDoc(ref)
  const timestamp = now()
  const updates: Record<string, unknown> = {
    updatedAt: timestamp,
    treated: patch.treated,
    treatedAt: patch.treated ? timestamp : null,
    treatedBy: patch.treated ? (patch.treatedBy ?? null) : null,
  }

  if (!existing.exists()) {
    await setDoc(ref, {
      itemId,
      itemType,
      learnerId,
      treated: false,
      treatedAt: null,
      treatedBy: null,
      ...updates,
    })
    return
  }

  await updateDoc(ref, updates)
}

export type CreateCompanyItemInput = {
  imsQuarter: ImsQuarter
  title: string
  description: string
  sortOrder: number
}

export async function createCompanyItem(
  learnerId: string,
  createdBy: string,
  input: CreateCompanyItemInput,
): Promise<string> {
  const ref = doc(collection(db, paths.companyItems(learnerId)))
  const timestamp = now()
  await setDoc(ref, {
    learnerId,
    imsQuarter: input.imsQuarter,
    title: input.title.trim(),
    description: input.description.trim(),
    sortOrder: input.sortOrder,
    status: 'active',
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return ref.id
}

export type UpdateCompanyItemInput = {
  title?: string
  description?: string
  imsQuarter?: ImsQuarter
}

export async function updateCompanyItem(
  learnerId: string,
  itemId: string,
  input: UpdateCompanyItemInput,
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: now() }
  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.description !== undefined) updates.description = input.description.trim()
  if (input.imsQuarter !== undefined) updates.imsQuarter = input.imsQuarter

  await updateDoc(doc(db, paths.companyItem(learnerId, itemId)), updates)
}

export async function archiveCompanyItem(
  learnerId: string,
  itemId: string,
): Promise<void> {
  await updateDoc(doc(db, paths.companyItem(learnerId, itemId)), {
    status: 'archived',
    updatedAt: now(),
  })
}

export type SortOrderUpdate = { id: string; sortOrder: number }

export async function reorderCompanyItems(
  learnerId: string,
  updates: SortOrderUpdate[],
): Promise<void> {
  const batch = writeBatch(db)
  const timestamp = now()
  for (const { id, sortOrder } of updates) {
    batch.update(doc(db, paths.companyItem(learnerId, id)), {
      sortOrder,
      updatedAt: timestamp,
    })
  }
  await batch.commit()
}
