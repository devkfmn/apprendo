import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminPagination } from '@/features/admin/AdminPagination'
import {
  adminLinkCoachLearner,
  adminLinkObserverLearner,
  listAllCoachLearnerRelations,
  listAllObserverLearnerRelations,
  listUsersByRole,
  unlinkCoachLearner,
  unlinkObserverLearner,
} from '@/features/admin/api'
import {
  ADMIN_PAGE_SIZE,
  clampPage,
  paginateItems,
} from '@/features/admin/listUtils'
import { UserPicker } from '@/features/admin/UserPicker'
import type {
  CoachLearnerRelation,
  ObserverLearnerRelation,
  UserProfile,
} from '@/types/domain'

type MapKind = 'coach' | 'observer'

type RelationRow = {
  id: string
  kind: MapKind
  leftId: string
  rightId: string
  createdAt: string
}

export function AdminMappingsPage() {
  const [coaches, setCoaches] = useState<UserProfile[]>([])
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [observers, setObservers] = useState<UserProfile[]>([])
  const [coachLinks, setCoachLinks] = useState<CoachLearnerRelation[] | null>(null)
  const [observerLinks, setObserverLinks] = useState<ObserverLearnerRelation[] | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const [kind, setKind] = useState<MapKind>('coach')
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [listKind, setListKind] = useState<'all' | MapKind>('all')
  const [page, setPage] = useState(1)

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>()
    for (const user of [...coaches, ...learners, ...observers]) map.set(user.id, user)
    return map
  }, [coaches, learners, observers])

  function labelFor(id: string) {
    const user = usersById.get(id)
    return user ? user.displayName : id.slice(0, 8)
  }

  function emailFor(id: string) {
    return usersById.get(id)?.email ?? ''
  }

  async function refresh() {
    const [nextCoaches, nextLearners, nextObservers, nextCoachLinks, nextObserverLinks] =
      await Promise.all([
        listUsersByRole('coach'),
        listUsersByRole('learner'),
        listUsersByRole('observer'),
        listAllCoachLearnerRelations(),
        listAllObserverLearnerRelations(),
      ])
    setCoaches(nextCoaches)
    setLearners(nextLearners)
    setObservers(nextObservers)
    setCoachLinks(nextCoachLinks)
    setObserverLinks(nextObserverLinks)
  }

  useEffect(() => {
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setError('Zuordnungen konnten nicht geladen werden.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo<RelationRow[]>(() => {
    const coachRows: RelationRow[] = (coachLinks ?? []).map((link) => ({
      id: link.id,
      kind: 'coach',
      leftId: link.coachId,
      rightId: link.learnerId,
      createdAt: link.createdAt,
    }))
    const observerRows: RelationRow[] = (observerLinks ?? []).map((link) => ({
      id: link.id,
      kind: 'observer',
      leftId: link.observerId,
      rightId: link.learnerId,
      createdAt: link.createdAt,
    }))
    return [...coachRows, ...observerRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [coachLinks, observerLinks])

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    return rows.filter((row) => {
      if (listKind !== 'all' && row.kind !== listKind) return false
      if (!needle) return true
      const left = usersById.get(row.leftId)
      const right = usersById.get(row.rightId)
      const haystack = [
        left?.displayName ?? row.leftId,
        left?.email ?? '',
        right?.displayName ?? row.rightId,
        right?.email ?? '',
        row.kind === 'coach' ? 'coach' : 'beobachter',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [deferredQuery, listKind, rows, usersById])

  const safePage = clampPage(page, filtered.length)
  const pageItems = paginateItems(filtered, safePage)
  const loaded = coachLinks !== null && observerLinks !== null

  async function createLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!leftId || !rightId) {
      setError('Bitte beide Personen auswählen.')
      return
    }
    setBusy(true)
    try {
      if (kind === 'coach') {
        await adminLinkCoachLearner(leftId, rightId)
        setSuccess('Coach ↔ Lernender verknüpft.')
      } else {
        await adminLinkObserverLearner(leftId, rightId)
        setSuccess('Beobachter ↔ Lernender verknüpft.')
      }
      setRightId('')
      await refresh()
    } catch {
      setError('Verknüpfung konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  async function unlink(row: RelationRow) {
    setError('')
    setSuccess('')
    try {
      if (row.kind === 'coach') {
        await unlinkCoachLearner(row.leftId, row.rightId)
      } else {
        await unlinkObserverLearner(row.leftId, row.rightId)
      }
      setSuccess('Verknüpfung entfernt.')
      await refresh()
    } catch {
      setError('Verknüpfung konnte nicht entfernt werden.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Zuordnungen"
        description="Coach- und Beobachter-Links suchen und pflegen — auch bei vielen Lernenden."
      />

      <Card className="mb-8">
        <CardTitle>Neue Verknüpfung</CardTitle>
        <form onSubmit={createLink} className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Verknüpfungstyp">
            {(
              [
                ['coach', 'Coach ↔ Lernender'],
                ['observer', 'Beobachter ↔ Lernender'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  kind === value
                    ? 'bg-brand text-white'
                    : 'bg-canvas text-ink-muted ring-1 ring-line hover:bg-brand-soft'
                }`}
                onClick={() => {
                  setKind(value)
                  setLeftId('')
                  setRightId('')
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <UserPicker
              id="map-left"
              label={kind === 'coach' ? 'Coach' : 'Beobachter'}
              users={kind === 'coach' ? coaches : observers}
              value={leftId}
              onChange={setLeftId}
            />
            <UserPicker
              id="map-right"
              label="Lernender"
              users={learners}
              value={rightId}
              onChange={setRightId}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Verknüpfen …' : 'Verknüpfen'}
          </Button>
        </form>
      </Card>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-brand">{success}</p> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          placeholder="Verknüpfung suchen…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            startTransition(() => setPage(1))
          }}
        />
        <Select
          className="max-w-[14rem]"
          value={listKind}
          onChange={(event) => {
            setListKind(event.target.value as 'all' | MapKind)
            setPage(1)
          }}
        >
          <option value="all">Alle Typen</option>
          <option value="coach">Nur Coach</option>
          <option value="observer">Nur Beobachter</option>
        </Select>
      </div>

      {!loaded ? (
        <Skeleton className="h-32 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">Keine Verknüpfungen für diese Filter.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Von</th>
                  <th className="px-4 py-3 font-medium">Zu Lernender</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Typ</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{labelFor(row.leftId)}</p>
                      <p className="text-ink-muted">{emailFor(row.leftId)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{labelFor(row.rightId)}</p>
                      <p className="text-ink-muted">{emailFor(row.rightId)}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">
                      {row.kind === 'coach' ? 'Coach' : 'Beobachter'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void unlink(row)}
                      >
                        Trennen
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
    </div>
  )
}
