import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export const paths = {
  users: 'users',
  user: (uid: string) => `users/${uid}`,
  relations: 'coachLearnerRelations',
  observerRelations: 'observerLearnerRelations',
  invites: 'invites',
  schoolRoadmap: 'schoolRoadmapItems',
  learner: (learnerId: string) => `learners/${learnerId}`,
  semesters: (learnerId: string) => `learners/${learnerId}/semesters`,
  semester: (learnerId: string, id: string) => `learners/${learnerId}/semesters/${id}`,
  goals: (learnerId: string) => `learners/${learnerId}/semesterGoals`,
  goal: (learnerId: string, id: string) => `learners/${learnerId}/semesterGoals/${id}`,
  journal: (learnerId: string) => `learners/${learnerId}/journalEntries`,
  journalEntry: (learnerId: string, id: string) =>
    `learners/${learnerId}/journalEntries/${id}`,
  journalComments: (learnerId: string, entryId: string) =>
    `learners/${learnerId}/journalEntries/${entryId}/comments`,
  journalComment: (learnerId: string, entryId: string, commentId: string) =>
    `learners/${learnerId}/journalEntries/${entryId}/comments/${commentId}`,
  reports: (learnerId: string) => `learners/${learnerId}/learningReports`,
  report: (learnerId: string, id: string) =>
    `learners/${learnerId}/learningReports/${id}`,
  reportComments: (learnerId: string, reportId: string) =>
    `learners/${learnerId}/learningReports/${reportId}/comments`,
  reportComment: (learnerId: string, reportId: string, commentId: string) =>
    `learners/${learnerId}/learningReports/${reportId}/comments/${commentId}`,
  contentViews: (userId: string) => `users/${userId}/contentViews`,
  contentView: (userId: string, viewId: string) => `users/${userId}/contentViews/${viewId}`,
  schoolItem: (id: string) => `schoolRoadmapItems/${id}`,
  companyItems: (learnerId: string) => `learners/${learnerId}/companyRoadmapItems`,
  companyItem: (learnerId: string, id: string) =>
    `learners/${learnerId}/companyRoadmapItems/${id}`,
  progress: (learnerId: string) => `learners/${learnerId}/roadmapProgress`,
  progressItem: (learnerId: string, id: string) =>
    `learners/${learnerId}/roadmapProgress/${id}`,
} as const

export function progressDocId(
  itemType: 'school' | 'company',
  itemId: string,
): string {
  return `${itemType}_${itemId}`
}

export function reportImagePath(
  learnerId: string,
  reportId: string,
  fileName: string,
): string {
  return `learners/${learnerId}/reports/${reportId}/${fileName}`
}
