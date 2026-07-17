import type { UserProfile } from '@/types/domain'

export const ADMIN_PAGE_SIZE = 20

export function matchesUserQuery(user: UserProfile, rawQuery: string): boolean {
  const needle = rawQuery.trim().toLowerCase()
  if (!needle) return true
  return (
    user.displayName.toLowerCase().includes(needle) ||
    user.email.toLowerCase().includes(needle) ||
    user.id.toLowerCase().includes(needle)
  )
}

export function filterUsersByQuery(users: UserProfile[], rawQuery: string): UserProfile[] {
  const needle = rawQuery.trim().toLowerCase()
  if (!needle) return users
  return users.filter((user) => matchesUserQuery(user, needle))
}

export function paginateItems<T>(items: T[], page: number, pageSize = ADMIN_PAGE_SIZE): T[] {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function pageCount(total: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function clampPage(page: number, total: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize))
}

export function userOptionLabel(user: UserProfile): string {
  return `${user.displayName} · ${user.email}`
}
