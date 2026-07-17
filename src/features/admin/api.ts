import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  CoachLearnerRelation,
  InviteRole,
  ObserverLearnerRelation,
  UserProfile,
  UserRole,
} from '@/types/domain'
import type { Invite } from '@/features/auth/api'
import { linkCoachLearner, linkObserverLearner } from '@/features/auth/api'

const now = () => new Date().toISOString()

function randomInviteCode(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as UserProfile)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
}

export async function listUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', role)))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as UserProfile)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
}

export async function listAllInvites(): Promise<Invite[]> {
  const snapshot = await getDocs(collection(db, 'invites'))
  return snapshot.docs
    .map((item) => ({ code: item.id, ...item.data() }) as Invite)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createInvite(input: {
  email: string
  role: InviteRole
  coachId?: string | null
  learnerIds?: string[] | null
  displayName?: string | null
  code?: string
}): Promise<Invite> {
  const email = input.email.trim().toLowerCase()
  const role = input.role
  if (!email) throw new Error('E-Mail ist erforderlich.')
  if (role === 'learner' && !input.coachId) {
    throw new Error('Lernende benötigen eine Coach-Zuordnung.')
  }
  if (role === 'observer' && (!input.learnerIds || input.learnerIds.length === 0)) {
    throw new Error('Beobachter benötigen mindestens eine Lernenden-Zuordnung.')
  }

  const code = (input.code?.trim() || randomInviteCode()).toLowerCase()
  const invite: Invite = {
    code,
    email,
    role,
    coachId: role === 'learner' ? input.coachId ?? null : null,
    learnerIds: role === 'observer' ? input.learnerIds ?? null : null,
    displayName: input.displayName?.trim() || null,
    used: false,
    createdAt: now(),
  }
  await setDoc(doc(db, 'invites', code), {
    email: invite.email,
    role: invite.role,
    coachId: invite.coachId,
    learnerIds: invite.learnerIds,
    displayName: invite.displayName,
    used: invite.used,
    createdAt: invite.createdAt,
  })
  return invite
}

export async function deleteInvite(code: string): Promise<void> {
  await deleteDoc(doc(db, 'invites', code))
}

export async function listAllCoachLearnerRelations(): Promise<CoachLearnerRelation[]> {
  const snapshot = await getDocs(collection(db, 'coachLearnerRelations'))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as CoachLearnerRelation)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listAllObserverLearnerRelations(): Promise<ObserverLearnerRelation[]> {
  const snapshot = await getDocs(collection(db, 'observerLearnerRelations'))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as ObserverLearnerRelation)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function adminLinkCoachLearner(coachId: string, learnerId: string) {
  return linkCoachLearner(coachId, learnerId)
}

export async function adminLinkObserverLearner(observerId: string, learnerId: string) {
  return linkObserverLearner(observerId, learnerId)
}

export async function unlinkCoachLearner(coachId: string, learnerId: string): Promise<void> {
  await deleteDoc(doc(db, 'coachLearnerRelations', `${coachId}_${learnerId}`))
}

export async function unlinkObserverLearner(observerId: string, learnerId: string): Promise<void> {
  await deleteDoc(doc(db, 'observerLearnerRelations', `${observerId}_${learnerId}`))
}
