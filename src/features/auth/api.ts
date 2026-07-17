import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type {
  CoachLearnerRelation,
  ObserverLearnerRelation,
  UserProfile,
  UserRole,
} from '@/types/domain'

export type InviteEmailStatus = 'pending' | 'sent' | 'failed'

export interface Invite {
  code: string
  email: string
  role: UserRole
  coachId?: string | null
  /** For observer invites: learners who may be viewed read-only. */
  learnerIds?: string[] | null
  displayName?: string | null
  used: boolean
  createdAt: string
  /** Set by Cloud Function after send attempts. */
  emailSentAt?: string | null
  emailStatus?: InviteEmailStatus | null
  emailError?: string | null
  emailSendCount?: number
}

const now = () => new Date().toISOString()

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null
}

/** Use only after a validated, unused invite has created the Auth user. */
export async function createUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', profile.id), profile)
}

/** Assigned coach may set Lehrbeginn year on a learner profile. */
export async function updateLearnerLehrbeginn(
  learnerId: string,
  lehrbeginnYear: number | null,
): Promise<void> {
  await updateDoc(doc(db, 'users', learnerId), {
    lehrbeginnYear,
    updatedAt: now(),
  })
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

/** Restricted to the invite-signup flow; never expose this as public registration. */
export async function createInviteUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function getInvite(code: string): Promise<Invite | null> {
  const snapshot = await getDoc(doc(db, 'invites', code.trim()))
  return snapshot.exists() ? ({ code: snapshot.id, ...snapshot.data() } as Invite) : null
}

export async function markInviteUsed(code: string): Promise<void> {
  await setDoc(doc(db, 'invites', code), { used: true }, { merge: true })
}

export async function listLearnersForCoach(coachId: string): Promise<UserProfile[]> {
  const relations = await getDocs(
    query(collection(db, 'coachLearnerRelations'), where('coachId', '==', coachId)),
  )
  const learners = await Promise.all(relations.docs.map((item) => getUserProfile(item.data().learnerId)))
  return learners.filter((learner): learner is UserProfile => learner !== null)
}

export async function listLearnersForObserver(observerId: string): Promise<UserProfile[]> {
  const relations = await getDocs(
    query(collection(db, 'observerLearnerRelations'), where('observerId', '==', observerId)),
  )
  const learners = await Promise.all(
    relations.docs.map((item) => getUserProfile(item.data().learnerId)),
  )
  return learners.filter((learner): learner is UserProfile => learner !== null)
}

/** Learners visible to the signed-in coach or observer. */
export async function listLearnersForViewer(
  userId: string,
  role: UserRole,
): Promise<UserProfile[]> {
  if (role === 'coach') return listLearnersForCoach(userId)
  if (role === 'observer') return listLearnersForObserver(userId)
  return []
}

export async function getCoachLearnerRelation(
  coachId: string,
  learnerId: string,
): Promise<CoachLearnerRelation | null> {
  const matches = await getDocs(
    query(
      collection(db, 'coachLearnerRelations'),
      where('coachId', '==', coachId),
      where('learnerId', '==', learnerId),
    ),
  )
  const relation = matches.docs[0]
  return relation ? ({ id: relation.id, ...relation.data() } as CoachLearnerRelation) : null
}

export async function getObserverLearnerRelation(
  observerId: string,
  learnerId: string,
): Promise<ObserverLearnerRelation | null> {
  const matches = await getDocs(
    query(
      collection(db, 'observerLearnerRelations'),
      where('observerId', '==', observerId),
      where('learnerId', '==', learnerId),
    ),
  )
  const relation = matches.docs[0]
  return relation ? ({ id: relation.id, ...relation.data() } as ObserverLearnerRelation) : null
}

export async function getCoachLearnerRelationsForLearner(
  learnerId: string,
): Promise<CoachLearnerRelation[]> {
  const matches = await getDocs(
    query(collection(db, 'coachLearnerRelations'), where('learnerId', '==', learnerId)),
  )
  return matches.docs.map((item) => ({ id: item.id, ...item.data() }) as CoachLearnerRelation)
}

export async function getObserverLearnerRelationsForLearner(
  learnerId: string,
): Promise<ObserverLearnerRelation[]> {
  const matches = await getDocs(
    query(collection(db, 'observerLearnerRelations'), where('learnerId', '==', learnerId)),
  )
  return matches.docs.map((item) => ({ id: item.id, ...item.data() }) as ObserverLearnerRelation)
}

/** Coaches linked to this learner (for the learner's own overview). */
export async function listCoachesForLearner(learnerId: string): Promise<UserProfile[]> {
  const relations = await getCoachLearnerRelationsForLearner(learnerId)
  const coaches = await Promise.all(relations.map((item) => getUserProfile(item.coachId)))
  return coaches.filter((coach): coach is UserProfile => coach !== null)
}

/** Observers linked to this learner (for the learner's own overview). */
export async function listObserversForLearner(learnerId: string): Promise<UserProfile[]> {
  const relations = await getObserverLearnerRelationsForLearner(learnerId)
  const observers = await Promise.all(relations.map((item) => getUserProfile(item.observerId)))
  return observers.filter((observer): observer is UserProfile => observer !== null)
}

export async function linkCoachLearner(
  coachId: string,
  learnerId: string,
): Promise<CoachLearnerRelation> {
  const existing = await getCoachLearnerRelation(coachId, learnerId)
  if (existing) return existing

  const id = `${coachId}_${learnerId}`
  const relation: CoachLearnerRelation = { id, coachId, learnerId, createdAt: now() }
  await setDoc(doc(db, 'coachLearnerRelations', id), relation)
  return relation
}

export async function linkObserverLearner(
  observerId: string,
  learnerId: string,
): Promise<ObserverLearnerRelation> {
  const existing = await getObserverLearnerRelation(observerId, learnerId)
  if (existing) return existing

  const id = `${observerId}_${learnerId}`
  const relation: ObserverLearnerRelation = { id, observerId, learnerId, createdAt: now() }
  await setDoc(doc(db, 'observerLearnerRelations', id), relation)
  return relation
}

/** True if the viewer (coach or observer) is linked to this learner. */
export async function hasViewerLearnerAccess(
  viewerId: string,
  role: UserRole,
  learnerId: string,
): Promise<boolean> {
  if (role === 'coach') {
    return Boolean(await getCoachLearnerRelation(viewerId, learnerId))
  }
  if (role === 'observer') {
    return Boolean(await getObserverLearnerRelation(viewerId, learnerId))
  }
  return false
}
