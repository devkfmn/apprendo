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
  where,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { CoachLearnerRelation, UserProfile, UserRole } from '@/types/domain'

export interface Invite {
  code: string
  email: string
  role: UserRole
  coachId?: string | null
  displayName?: string | null
  used: boolean
  createdAt: string
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

export async function getCoachLearnerRelationsForLearner(
  learnerId: string,
): Promise<CoachLearnerRelation[]> {
  const matches = await getDocs(
    query(collection(db, 'coachLearnerRelations'), where('learnerId', '==', learnerId)),
  )
  return matches.docs.map((item) => ({ id: item.id, ...item.data() }) as CoachLearnerRelation)
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
