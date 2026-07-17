import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db, paths } from '@/lib/firebase'
import { getSemester } from '@/features/semesters/api'
import type { GoalAssessmentGrade, SemesterGoal } from '@/types/domain'

const now = () => new Date().toISOString()

function mapGoal(id: string, data: Record<string, unknown>): SemesterGoal {
  const legacyNote =
    (data.assessmentNote as string | null | undefined) ??
    (data.completionNote as string | null | undefined) ??
    null

  return {
    id,
    semesterId: String(data.semesterId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    dueDate: (data.dueDate as string | null | undefined) ?? null,
    assessmentGrade: (data.assessmentGrade as GoalAssessmentGrade | null | undefined) ?? null,
    assessmentNote: legacyNote,
    assessedAt: (data.assessedAt as string | null | undefined) ?? null,
    assessedBy: (data.assessedBy as string | null | undefined) ?? null,
    carriedOver: Boolean(data.carriedOver),
    sortOrder: Number(data.sortOrder ?? 0),
    createdBy: String(data.createdBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  }
}

export type CreateGoalInput = {
  semesterId: string
  title: string
  description: string
  dueDate?: string | null
  sortOrder: number
}

export type UpdateGoalInput = Partial<
  Omit<SemesterGoal, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
>

export async function listGoals(learnerId: string): Promise<SemesterGoal[]> {
  const q = query(collection(db, paths.goals(learnerId)), orderBy('sortOrder', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapGoal(d.id, d.data() as Record<string, unknown>))
}

export async function getGoal(
  learnerId: string,
  goalId: string,
): Promise<SemesterGoal | null> {
  const snap = await getDoc(doc(db, paths.goal(learnerId, goalId)))
  if (!snap.exists()) return null
  return mapGoal(snap.id, snap.data() as Record<string, unknown>)
}

export async function createGoal(
  learnerId: string,
  input: CreateGoalInput,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, paths.goals(learnerId)), {
    semesterId: input.semesterId,
    title: input.title,
    description: input.description,
    dueDate: input.dueDate ?? null,
    assessmentGrade: null,
    assessmentNote: null,
    assessedAt: null,
    assessedBy: null,
    carriedOver: false,
    sortOrder: input.sortOrder,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  })
  return ref.id
}

export async function updateGoal(
  learnerId: string,
  goalId: string,
  input: UpdateGoalInput,
  actorId?: string,
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...input,
    updatedAt: now(),
  }

  if ('assessmentGrade' in input) {
    if (input.assessmentGrade) {
      payload.assessedAt = input.assessedAt ?? now()
      if (actorId) payload.assessedBy = actorId
    } else {
      payload.assessmentGrade = null
      payload.assessedAt = null
      payload.assessedBy = null
    }
  }

  await updateDoc(doc(db, paths.goal(learnerId, goalId)), payload)
}

/**
 * Unassessed goals on the closed semester are marked carriedOver
 * and recreated on the target semester without an assessment.
 */
export async function carryOverOpenGoals(
  learnerId: string,
  fromSemesterId: string,
  toSemesterId: string,
): Promise<void> {
  const [goals, targetSemester] = await Promise.all([
    listGoals(learnerId),
    getSemester(learnerId, toSemesterId),
  ])
  const openGoals = goals.filter(
    (goal) =>
      goal.semesterId === fromSemesterId &&
      !goal.assessmentGrade &&
      !goal.carriedOver,
  )

  let nextSort = goals.filter((g) => g.semesterId === toSemesterId).length

  for (const goal of openGoals) {
    await updateGoal(learnerId, goal.id, {
      carriedOver: true,
      assessmentNote:
        goal.assessmentNote ??
        `Übertragen ins Folgesemester am ${now().slice(0, 10)}`,
    })
    await createGoal(
      learnerId,
      {
        semesterId: toSemesterId,
        title: goal.title,
        description: goal.description,
        dueDate: targetSemester?.endDate ?? goal.dueDate ?? null,
        sortOrder: nextSort++,
      },
      goal.createdBy,
    )
  }
}
