import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { listAllUsers, setUserAdminAccess, setUserRole } from '@/features/admin/api'
import { useAuth } from '@/features/auth/useAuth'
import { formatDateTime, profileIsAdmin, profileRoleLabel, roleLabel } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types/domain'

const ROLE_FILTERS: Array<{ value: 'all' | UserRole | 'adminCap'; label: string }> = [
  { value: 'all', label: 'Alle Rollen' },
  { value: 'adminCap', label: 'Mit Admin-Zugriff' },
  { value: 'coach', label: 'Coach' },
  { value: 'learner', label: 'Lernender' },
  { value: 'observer', label: 'Beobachter' },
  { value: 'admin', label: 'Nur Admin' },
]

const EDITABLE_ROLES: UserRole[] = ['coach', 'learner', 'observer', 'admin']

export function AdminUsersPage() {
  const { profile: me, refreshProfile } = useAuth()
  const [users, setUsers] = useState<UserProfile[] | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole | 'adminCap'>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    setUsers(await listAllUsers())
  }

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
      if (roleFilter === 'adminCap') {
        if (!profileIsAdmin(user)) return false
      } else if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false
      }
      if (!needle) return true
      return (
        user.displayName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.id.toLowerCase().includes(needle)
      )
    })
  }, [query, roleFilter, users])

  async function changeRole(user: UserProfile, role: UserRole) {
    if (role === user.role) return
    setError('')
    setSuccess('')
    setBusyId(user.id)
    try {
      await setUserRole(user.id, role)
      if (me?.id === user.id) await refreshProfile()
      await refresh()
      setSuccess(`Rolle für ${user.displayName} auf ${roleLabel(role)} gesetzt.`)
    } catch {
      setError('Rolle konnte nicht geändert werden.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleAdmin(user: UserProfile, enabled: boolean) {
    if (me?.id === user.id && !enabled) {
      setError('Du kannst dir den eigenen Admin-Zugriff nicht entziehen.')
      return
    }
    setError('')
    setSuccess('')
    setBusyId(user.id)
    try {
      await setUserAdminAccess(user.id, enabled)
      if (me?.id === user.id) await refreshProfile()
      await refresh()
      setSuccess(
        enabled
          ? `Admin-Zugriff für ${user.displayName} gewährt.`
          : `Admin-Zugriff für ${user.displayName} entfernt.`,
      )
    } catch {
      setError('Admin-Zugriff konnte nicht geändert werden.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Benutzer"
        description="Rollen ändern und Admin-Zugriff gewähren oder entziehen. Neue Konten entstehen über Einladungen."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          placeholder="Suche nach Name, E-Mail oder UID…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          className="max-w-[14rem]"
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value as 'all' | UserRole | 'adminCap')
          }
        >
          {ROLE_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {success && <p className="mb-4 text-sm text-brand">{success}</p>}
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
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">App-Rolle</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const busy = busyId === user.id
                const hasAdmin = profileIsAdmin(user)
                return (
                  <tr key={user.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.displayName}</div>
                      <div className="mt-0.5 font-mono text-xs text-ink-muted">{user.id}</div>
                      <Badge className="mt-1" variant={hasAdmin ? 'warning' : 'secondary'}>
                        {profileRoleLabel(user) || roleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <Label className="sr-only" htmlFor={`role-${user.id}`}>
                        Rolle
                      </Label>
                      <Select
                        id={`role-${user.id}`}
                        className="min-w-[10rem]"
                        value={user.role}
                        disabled={busy}
                        onChange={(event) =>
                          void changeRole(user, event.target.value as UserRole)
                        }
                      >
                        {EDITABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <span className="text-xs text-ink-muted">immer an</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant={user.isAdmin ? 'secondary' : 'outline'}
                          disabled={busy || me?.id === user.id}
                          onClick={() => void toggleAdmin(user, !user.isAdmin)}
                        >
                          {user.isAdmin ? 'Entziehen' : 'Gewähren'}
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDateTime(user.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
