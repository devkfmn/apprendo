import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminPagination } from '@/features/admin/AdminPagination'
import {
  ADMIN_PAGE_SIZE,
  clampPage,
  matchesUserQuery,
  paginateItems,
} from '@/features/admin/listUtils'
import { listAllUsers, setUserAdminAccess, setUserRole } from '@/features/admin/api'
import { useAuth } from '@/features/auth/useAuth'
import { formatDateTime, profileIsAdmin, profileRoleLabel, roleLabel } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types/domain'

type RoleFilter = 'all' | UserRole | 'adminCap'

const ROLE_CHIPS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'learner', label: 'Lernende' },
  { value: 'coach', label: 'Coaches' },
  { value: 'observer', label: 'Beobachter' },
  { value: 'adminCap', label: 'Admins' },
]

const EDITABLE_ROLES: UserRole[] = ['coach', 'learner', 'observer', 'admin']

export function AdminUsersPage() {
  const { profile: me, refreshProfile } = useAuth()
  const [users, setUsers] = useState<UserProfile[] | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [draftRole, setDraftRole] = useState<UserRole>('learner')
  const [draftAdmin, setDraftAdmin] = useState(false)

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

  const counts = useMemo(() => {
    if (!users) return null
    return {
      all: users.length,
      learner: users.filter((user) => user.role === 'learner').length,
      coach: users.filter((user) => user.role === 'coach').length,
      observer: users.filter((user) => user.role === 'observer').length,
      adminCap: users.filter((user) => profileIsAdmin(user)).length,
    }
  }, [users])

  const filtered = useMemo(() => {
    if (!users) return []
    return users.filter((user) => {
      if (roleFilter === 'adminCap') {
        if (!profileIsAdmin(user)) return false
      } else if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false
      }
      return matchesUserQuery(user, deferredQuery)
    })
  }, [deferredQuery, roleFilter, users])

  const safePage = clampPage(page, filtered.length)
  const pageItems = paginateItems(filtered, safePage)

  function openEditor(user: UserProfile) {
    setEditing(user)
    setDraftRole(user.role)
    setDraftAdmin(Boolean(user.isAdmin) || user.role === 'admin')
    setError('')
    setSuccess('')
  }

  async function saveEditor() {
    if (!editing) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (draftRole !== editing.role) {
        await setUserRole(editing.id, draftRole)
      }
      const nextAdmin = draftRole === 'admin' ? true : draftAdmin
      if (nextAdmin !== Boolean(editing.isAdmin) && draftRole !== 'admin') {
        if (me?.id === editing.id && !nextAdmin) {
          throw new Error('Du kannst dir den eigenen Admin-Zugriff nicht entziehen.')
        }
        await setUserAdminAccess(editing.id, nextAdmin)
      }
      if (me?.id === editing.id) await refreshProfile()
      await refresh()
      setSuccess(`„${editing.displayName}“ aktualisiert.`)
      setEditing(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Benutzer konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Benutzer"
        description="Verzeichnis durchsuchen, filtern und Rollen gezielt bearbeiten."
        actions={
          counts ? (
            <p className="text-sm text-ink-muted">{counts.all} Benutzer gesamt</p>
          ) : null
        }
      />

      <div className="mb-4 space-y-3">
        <Input
          className="max-w-md"
          placeholder="Suche nach Name, E-Mail oder UID…"
          value={query}
          onChange={(event) => {
            const next = event.target.value
            setQuery(next)
            startTransition(() => setPage(1))
          }}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rollenfilter">
          {ROLE_CHIPS.map((chip) => {
            const active = roleFilter === chip.value
            const count =
              counts && chip.value in counts
                ? counts[chip.value as keyof typeof counts]
                : undefined
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setRoleFilter(chip.value)
                  setPage(1)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? 'bg-brand text-white' : 'bg-panel text-ink-muted ring-1 ring-line hover:bg-brand-soft'
                }`}
              >
                {chip.label}
                {typeof count === 'number' ? (
                  <span className={`ml-1.5 ${active ? 'text-white/80' : 'text-ink-muted'}`}>
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {error && !editing ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-brand">{success}</p> : null}

      {!users ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">Keine Benutzer für diese Suche.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Rolle</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Erstellt</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((user) => (
                  <tr key={user.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-ink-muted">{user.email}</p>
                      <div className="mt-1 sm:hidden">
                        <Badge variant={profileIsAdmin(user) ? 'warning' : 'secondary'}>
                          {profileRoleLabel(user)}
                        </Badge>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant={profileIsAdmin(user) ? 'warning' : 'secondary'}>
                        {profileRoleLabel(user)}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(user)}
                      >
                        Bearbeiten
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={safePage}
            total={filtered.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.displayName}</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="edit-role">App-Rolle</Label>
                <Select
                  id="edit-role"
                  value={draftRole}
                  onChange={(event) => setDraftRole(event.target.value as UserRole)}
                >
                  {EDITABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-admin">Admin-Konsole</Label>
                {draftRole === 'admin' ? (
                  <p className="mt-1 text-sm text-ink-muted">Bei Rolle „Admin“ immer aktiv.</p>
                ) : (
                  <Select
                    id="edit-admin"
                    value={draftAdmin ? 'yes' : 'no'}
                    disabled={me?.id === editing.id}
                    onChange={(event) => setDraftAdmin(event.target.value === 'yes')}
                  >
                    <option value="no">Kein Admin-Zugriff</option>
                    <option value="yes">Admin-Zugriff gewähren</option>
                  </Select>
                )}
                {me?.id === editing.id ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    Eigenen Admin-Zugriff kannst du nicht entziehen.
                  </p>
                ) : null}
              </div>
              <p className="font-mono text-xs text-ink-muted">UID: {editing.id}</p>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </div>
          ) : null}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Abbrechen
            </Button>
            <Button type="button" disabled={busy} onClick={() => void saveEditor()}>
              {busy ? 'Speichern …' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
