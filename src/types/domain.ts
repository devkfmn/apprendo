export type UserRole = 'coach' | 'learner'

export type SemesterStatus = 'planned' | 'active' | 'completed'

export type GoalStatus =
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'not_completed'
  | 'carried_over'

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
  semesterId?: string | null
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
}

export type CompanyItemStatus = 'active' | 'archived'

export type RoadmapItemType = 'school' | 'company'

export interface UserProfile {
  id: string
  email: string
  displayName: string
  role: UserRole
  coachId?: string | null
  /** Used once at signup so security rules can validate against invites/{code}. */
  inviteCode?: string | null
  createdAt: string
  updatedAt: string
}

export interface CoachLearnerRelation {
  id: string
  coachId: string
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
  status: GoalStatus
  dueDate?: string | null
  completionNote?: string | null
  sortOrder: number
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
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
  learnerCompleted: boolean
  learnerCompletedAt?: string | null
  learnerCompletedBy?: string | null
  coachCompleted: boolean
  coachCompletedAt?: string | null
  coachCompletedBy?: string | null
  coachConfirmed: boolean
  coachConfirmedAt?: string | null
  confirmedBy?: string | null
  updatedAt: string
}

export type RoadmapDisplayState = 'open' | 'treated' | 'confirmed'

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
