import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { listAllUsers } from '@/features/admin/api'
import { formatDateTime, profileIsAdmin, profileRoleLabel, roleLabel } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types/domain'

const ROLE_FILTERS: Array<{ value: 'all' | UserRole; label: string }> = [
  { value: 'all', label: 'Alle Rollen' },
  { value: 'admin', label: 'Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'learner', label: 'Lernender' },
  { value: 'observer', label: 'Beobachter' },
]

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')

  useEffect(() => {
    let cancelled = false
    void listAllUsers()
      .then((items) => {
        if (!cancelled) setUsers(items)
      })
      .catch(() => {
        if (!cancelled) setError('Benutzer konnten nicht geladen werden.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!users) return []
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false
      if (!needle) return true
      return (
        user.displayName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.id.toLowerCase().includes(needle)
      )
    })
  }, [query, roleFilter, users])

  return (
    <div>
      <PageHeader
        title="Benutzer"
        description="Alle Profile in Firestore. Neue Konten entstehen über Einladungen und Signup."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          placeholder="Suche nach Name, E-Mail oder UID…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          className="max-w-[12rem]"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
        >
          {ROLE_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {!users ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">Keine Benutzer gefunden.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">Rolle</th>
                <th className="px-4 py-3 font-medium">Erstellt</th>
                <th className="px-4 py-3 font-medium">UID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3 text-ink-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={profileIsAdmin(user) ? 'warning' : 'default'}>
                      {profileRoleLabel(user) || roleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDateTime(user.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
