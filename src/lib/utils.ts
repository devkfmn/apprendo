import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { adminConsolePath } from '@/lib/adminPath'
import type { UserProfile, UserRole } from '@/types/domain'

/** User-facing role labels. Stored keys: `admin` | `coach` | `learner` | `observer`. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  coach: 'Coach',
  learner: 'Lernender',
  observer: 'Beobachter',
}

export function roleLabel(role?: UserRole | null): string {
  if (!role) return ''
  return ROLE_LABELS[role]
}

/** True when the profile may open the admin console. */
export function profileIsAdmin(
  profile?: Pick<UserProfile, 'role' | 'isAdmin'> | null,
): boolean {
  if (!profile) return false
  return profile.role === 'admin' || profile.isAdmin === true
}

/** Display label including admin capability when stacked on another role. */
export function profileRoleLabel(
  profile?: Pick<UserProfile, 'role' | 'isAdmin'> | null,
): string {
  if (!profile) return ''
  if (profile.role === 'admin') return ROLE_LABELS.admin
  if (profile.isAdmin) return `${ROLE_LABELS[profile.role]} · Admin`
  return ROLE_LABELS[profile.role]
}

/** App home path for a role after login/signup. */
export function roleHome(role: UserRole): string {
  if (role === 'admin') return adminConsolePath()
  if (role === 'coach') return '/coach'
  if (role === 'observer') return '/beobachter'
  return '/'
}

/** Home for a full profile (coach+admin lands in coach UI). */
export function profileHome(profile: Pick<UserProfile, 'role'>): string {
  return roleHome(profile.role)
}

/** Base path for coach/observer learner areas (`/coach` or `/beobachter`). */
export function viewerAreaBase(role: UserRole): '/coach' | '/beobachter' | null {
  if (role === 'coach') return '/coach'
  if (role === 'observer') return '/beobachter'
  return null
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Pad day/month to 2 digits. */
function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function asValidDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  // Date-only values must be parsed as local calendar dates (avoid UTC shift).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}T00:00:00/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number)
    const local = new Date(y, m - 1, d)
    return Number.isNaN(local.getTime()) ? null : local
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Always `dd/mm/yyyy`. Accepts ISO strings / Dates. */
export function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = asValidDate(value)
  if (!date) return '—'
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** Always `dd/mm/yyyy HH:mm`. */
export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—'
  const date = asValidDate(value)
  if (!date) return '—'
  return `${formatDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** Format an ISO/date-only value as `yyyy-mm-dd` for storage. */
export function toDateInputValue(value?: string | Date | null): string {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = asValidDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * Parse `dd/mm/yyyy` (also accepts `dd.mm.yyyy` / `dd-mm-yyyy`) to `yyyy-mm-dd`.
 * Returns null if invalid.
 */
export function parseDisplayDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Display string for a stored `yyyy-mm-dd` / ISO value. */
export function isoToDisplayDate(value?: string | null): string {
  if (!value) return ''
  const iso = toDateInputValue(value)
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${pad2(d)}/${pad2(m)}/${y}`
}

export function nowIso() {
  return new Date().toISOString()
}
