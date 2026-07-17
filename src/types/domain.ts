/** Stored role keys in Auth/Firestore. Display via `roleLabel`. */
export type UserRole = 'admin' | 'coach' | 'learner' | 'observer'

/** Roles that can be invited through the signup flow (includes admin for bootstrap). */
export type InviteRole = UserRole

export type SemesterStatus = 'planned' | 'active' | 'completed'

export type GoalAssessmentGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export type JournalStatus = 'draft' | 'submitted'

export type ReportStatus = 'draft' | 'submitted'

/** @deprecated Kept for reading older reports; new reports use bodyMarkdown. */
export type ReportBlockType = 'h1' | 'h2' | 'h3' | 'paragraph' | 'image'

/** @deprecated Kept for reading older reports; new reports use bodyMarkdown. */
export interface ReportBlock {
  id: string
  type: ReportBlockType
  text?: string
  imageUrl?: string
  imagePath?: string
  alt?: string
}

export interface LearningReport {
  id: string
  learnerId: string
  title: string
  status: ReportStatus
  /** Markdown body of the report */
  bodyMarkdown: string
  /** @deprecated Legacy block format */
  blocks?: ReportBlock[]
  imagePaths?: string[]
  roadmapTopicIds: string[]
  semesterId?: string | null
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  /** Latest comment activity (denormalized for dashboard hints). */
  lastCommentAt?: string | null
  lastCommentAuthorId?: string | null
  lastCommentAuthorName?: string | null
}

export type CompanyItemStatus = 'active' | 'archived'

export type RoadmapItemType = 'school' | 'company'

export interface UserProfile {
  id: string
  email: string
  displayName: string
  /** Operational app role (coach/learner/observer). May be `admin` for ops-only accounts. */
  role: UserRole
  /** Admin console access on top of the operational role (e.g. coach + admin). */
  isAdmin?: boolean
  coachId?: string | null
  /** Used once at signup so security rules can validate against invites/{code}. */
  inviteCode?: string | null
  /** Calendar year of Lehrbeginn; Semester 1 starts 01.08 of this year. */
  lehrbeginnYear?: number | null
  createdAt: string
  updatedAt: string
}

export interface CoachLearnerRelation {
  id: string
  coachId: string
  learnerId: string
  createdAt: string
}

/** Read-only access: one observer ↔ many learners. */
export interface ObserverLearnerRelation {
  id: string
  observerId: string
  learnerId: string
  createdAt: string
}

export interface Semester {
  id: string
  label: string
  academicYear?: string | null
  startDate: string
  endDate: string
  primaryImsQuarters: [number, number]
  status: SemesterStatus
  summaryNote?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

export interface SemesterGoal {
  id: string
  semesterId: string
  title: string
  description: string
  dueDate?: string | null
  /** Coach-only end-of-semester assessment (A–E). Null = not yet assessed. */
  assessmentGrade?: GoalAssessmentGrade | null
  assessmentNote?: string | null
  assessedAt?: string | null
  assessedBy?: string | null
  /** True when this goal was transferred to a later semester. */
  carriedOver?: boolean
  sortOrder: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface JournalAnswers {
  workedOn: string
  learned: string
  wentWell?: string
  difficulties?: string
  needSupport?: string
  nextWeek?: string
}

export interface JournalEntry {
  id: string
  learnerId: string
  semesterId: string
  calendarWeek: number
  year: number
  weekStart: string
  weekEnd: string
  status: JournalStatus
  answers: JournalAnswers
  roadmapTopicIds: string[]
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  /** Latest comment activity (denormalized for dashboard hints). */
  lastCommentAt?: string | null
  lastCommentAuthorId?: string | null
  lastCommentAuthorName?: string | null
}

/** Comment on a Wochenrückblick or Lernbericht. */
export type CommentTargetKind = 'journal' | 'report'

export interface ContentComment {
  id: string
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  authorId: string
  authorDisplayName: string
  authorRole: UserRole
  body: string
  createdAt: string
  updatedAt: string
}

/** Per-user timestamp of last time a journal/report was opened (clears comment hints). */
export interface ContentViewReceipt {
  id: string
  viewerId: string
  learnerId: string
  targetKind: CommentTargetKind
  targetId: string
  viewedAt: string
}

/** IMS Lehrquartal 1–16 (BiVo Applikation IMS) */
export type ImsQuarter = number

export interface SchoolRoadmapItem {
  id: string
  code: string
  title: string
  description: string
  imsQuarter: ImsQuarter
  lehrjahr: number
  areaTitle: string
  sortOrder: number
  source: string
  version: string
  createdAt: string
  updatedAt: string
}

export interface CompanyRoadmapItem {
  id: string
  learnerId: string
  imsQuarter: ImsQuarter
  title: string
  description: string
  sortOrder: number
  status: CompanyItemStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RoadmapProgress {
  id: string
  itemId: string
  itemType: RoadmapItemType
  learnerId: string
  /** Topic covered — set by learner (roadmap or Wochenrückblick) or coach. */
  treated: boolean
  treatedAt?: string | null
  treatedBy?: string | null
  updatedAt: string
}

export type RoadmapDisplayState = 'open' | 'treated'

export interface RoadmapItemView {
  itemType: RoadmapItemType
  item: SchoolRoadmapItem | CompanyRoadmapItem
  progress: RoadmapProgress | null
}

export interface QuarterRoadmapView {
  imsQuarter: ImsQuarter
  school: RoadmapItemView[]
  company: RoadmapItemView[]
}
