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
import type { GoalStatus, SemesterGoal } from '@/types/domain'

const now = () => new Date().toISOString()

function mapGoal(id: string, data: Omit<SemesterGoal, 'id'>): SemesterGoal {
  return { id, ...data }
}

export type CreateGoalInput = {
  semesterId: string
  title: string
  description: string
  status?: GoalStatus
  dueDate?: string | null
  completionNote?: string | null
  sortOrder: number
}

export type UpdateGoalInput = Partial<
  Omit<SemesterGoal, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
>

export async function listGoals(learnerId: string): Promise<SemesterGoal[]> {
  const q = query(collection(db, paths.goals(learnerId)), orderBy('sortOrder', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapGoal(d.id, d.data() as Omit<SemesterGoal, 'id'>))
}

export async function getGoal(
  learnerId: string,
  goalId: string,
): Promise<SemesterGoal | null> {
  const snap = await getDoc(doc(db, paths.goal(learnerId, goalId)))
  if (!snap.exists()) return null
  return mapGoal(snap.id, snap.data() as Omit<SemesterGoal, 'id'>)
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
    status: input.status ?? 'open',
    dueDate: input.dueDate ?? null,
    completionNote: input.completionNote ?? null,
    sortOrder: input.sortOrder,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
    completedAt: null,
  })
  return ref.id
}

export async function updateGoal(
  learnerId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...input,
    updatedAt: now(),
  }

  if (input.status === 'completed' && input.completedAt === undefined) {
    payload.completedAt = now()
  }

  await updateDoc(doc(db, paths.goal(learnerId, goalId)), payload)
}

/**
 * Marks open goals on the closed semester as carried_over (history preserved)
 * and creates fresh open copies on the target semester.
 */
export async function carryOverOpenGoals(
  learnerId: string,
  fromSemesterId: string,
  toSemesterId: string,
): Promise<void> {
  const goals = await listGoals(learnerId)
  const openGoals = goals.filter(
    (goal) =>
      goal.semesterId === fromSemesterId &&
      (goal.status === 'open' || goal.status === 'in_progress'),
  )

  let nextSort = goals.filter((g) => g.semesterId === toSemesterId).length

  for (const goal of openGoals) {
    await updateGoal(learnerId, goal.id, {
      status: 'carried_over',
      completedAt: now(),
      completionNote:
        goal.completionNote ??
        `Übertragen ins Folgesemester am ${now().slice(0, 10)}`,
    })
    await createGoal(
      learnerId,
      {
        semesterId: toSemesterId,
        title: goal.title,
        description: goal.description,
        status: 'open',
        dueDate: goal.dueDate ?? null,
        sortOrder: nextSort++,
      },
      goal.createdBy,
    )
  }
}
