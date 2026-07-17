import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminPagination } from '@/features/admin/AdminPagination'
import {
  createInvite,
  deleteInvite,
  listAllInvites,
  listUsersByRole,
} from '@/features/admin/api'
import { buildInviteMessage } from '@/features/admin/inviteMessage'
import {
  ADMIN_PAGE_SIZE,
  clampPage,
  paginateItems,
} from '@/features/admin/listUtils'
import { UserMultiPicker } from '@/features/admin/UserMultiPicker'
import { UserPicker } from '@/features/admin/UserPicker'
import type { Invite } from '@/features/auth/api'
import { formatDateTime, roleLabel } from '@/lib/utils'
import type { InviteRole, UserProfile } from '@/types/domain'

const INVITE_ROLES: InviteRole[] = ['coach', 'learner', 'observer', 'admin']

type StatusFilter = 'all' | 'open' | 'used'

function statusBadge(invite: Invite) {
  if (invite.used) {
    return <Badge variant="secondary">verwendet</Badge>
  }
  return <Badge variant="outline">offen</Badge>
}

export function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [coaches, setCoaches] = useState<UserProfile[]>([])
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [shareInvite, setShareInvite] = useState<Invite | null>(null)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<InviteRole>('learner')
  const [coachId, setCoachId] = useState('')
  const [learnerIds, setLearnerIds] = useState<string[]>([])
  const [code, setCode] = useState('')

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [page, setPage] = useState(1)

  async function refresh() {
    const [nextInvites, nextCoaches, nextLearners] = await Promise.all([
      listAllInvites(),
      listUsersByRole('coach'),
      listUsersByRole('learner'),
    ])
    setInvites(nextInvites)
    setCoaches(nextCoaches)
    setLearners(nextLearners)
  }

  useEffect(() => {
    let cancelled = false
    void refresh().catch(() => {
      if (!cancelled) setError('Einladungen konnten nicht geladen werden.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!invites) return []
    const needle = deferredQuery.trim().toLowerCase()
    return invites.filter((invite) => {
      if (statusFilter === 'open' && invite.used) return false
      if (statusFilter === 'used' && !invite.used) return false
      if (!needle) return true
      return (
        invite.email.toLowerCase().includes(needle) ||
        invite.code.toLowerCase().includes(needle) ||
        roleLabel(invite.role).toLowerCase().includes(needle)
      )
    })
  }, [deferredQuery, invites, statusFilter])

  const safePage = clampPage(page, filtered.length)
  const pageItems = paginateItems(filtered, safePage)
  const openCount = invites?.filter((invite) => !invite.used).length ?? 0
  const shareMessage = shareInvite ? buildInviteMessage(shareInvite) : ''

  async function copyMessage(invite: Invite) {
    const message = buildInviteMessage(invite)
    try {
      await navigator.clipboard.writeText(message)
      setShareInvite(invite)
      setSuccess(`Einladungsnachricht für ${invite.email} kopiert.`)
    } catch {
      setShareInvite(invite)
      setError('Kopieren fehlgeschlagen — Nachricht unten manuell markieren.')
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (role === 'learner' && !coachId) {
      setError('Lernende benötigen eine Coach-Zuordnung.')
      return
    }
    if (role === 'observer' && learnerIds.length === 0) {
      setError('Beobachter benötigen mindestens eine Lernenden-Zuordnung.')
      return
    }
    setSubmitting(true)
    try {
      const invite = await createInvite({
        email,
        role,
        displayName: displayName || null,
        coachId: role === 'learner' ? coachId : null,
        learnerIds: role === 'observer' ? learnerIds : null,
        code: code || undefined,
      })
      setEmail('')
      setDisplayName('')
      setCode('')
      setCoachId('')
      setLearnerIds([])
      setFormOpen(false)
      await refresh()
      await copyMessage(invite)
      setSuccess(`Einladung «${invite.code}» erstellt — Nachricht ist in der Zwischenablage.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Einladung konnte nicht erstellt werden.')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(inviteCode: string) {
    setError('')
    setSuccess('')
    try {
      await deleteInvite(inviteCode)
      if (shareInvite?.code === inviteCode) setShareInvite(null)
      setSuccess('Einladung gelöscht.')
      await refresh()
    } catch {
      setError('Einladung konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Einladungen"
        description="Einladungen erstellen und die Nachricht manuell per WhatsApp, Mail oder Chat weiterleiten."
        actions={
          <Button type="button" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? 'Formular schliessen' : 'Neue Einladung'}
          </Button>
        }
      />

      {formOpen ? (
        <Card className="mb-8">
          <CardTitle>Neue Einladung</CardTitle>
          <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invite-email">E-Mail</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="invite-name">Anzeigename (optional)</Label>
              <Input
                id="invite-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Rolle</Label>
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as InviteRole)}
              >
                {INVITE_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {roleLabel(item)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="invite-code">Code (optional)</Label>
              <Input
                id="invite-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="wird sonst generiert"
              />
            </div>
            {role === 'learner' ? (
              <div className="sm:col-span-2">
                <UserPicker
                  id="invite-coach"
                  label="Coach"
                  users={coaches}
                  value={coachId}
                  onChange={setCoachId}
                  placeholder="Coach suchen…"
                />
              </div>
            ) : null}
            {role === 'observer' ? (
              <div className="sm:col-span-2">
                <UserMultiPicker
                  id="invite-learners"
                  label="Lernende"
                  users={learners}
                  value={learnerIds}
                  onChange={setLearnerIds}
                />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Erstellen …' : 'Einladung erstellen & Nachricht kopieren'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {shareInvite ? (
        <Card className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Einladungsnachricht</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                Für {shareInvite.email} ({roleLabel(shareInvite.role)}) — in WhatsApp, Mail oder
                Chat einfügen.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void copyMessage(shareInvite)}
              >
                Erneut kopieren
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShareInvite(null)}>
                Schliessen
              </Button>
            </div>
          </div>
          <textarea
            className="mt-4 min-h-48 w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2 font-sans text-sm leading-relaxed text-ink"
            readOnly
            value={shareMessage}
            onFocus={(event) => event.currentTarget.select()}
          />
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="max-w-sm"
          placeholder="E-Mail oder Code suchen…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            startTransition(() => setPage(1))
          }}
        />
        <Select
          className="max-w-[12rem]"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter)
            setPage(1)
          }}
        >
          <option value="all">Alle Status</option>
          <option value="open">Offen ({openCount})</option>
          <option value="used">Verwendet</option>
        </Select>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-brand">{success}</p> : null}

      {!invites ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">Keine Einladungen für diese Filter.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Einladung</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Rolle</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((invite) => (
                  <tr key={invite.code} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{invite.email}</p>
                      <p className="font-mono text-xs text-ink-muted">{invite.code}</p>
                      <p className="text-xs text-ink-muted">
                        Erstellt {formatDateTime(invite.createdAt)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{roleLabel(invite.role)}</td>
                    <td className="px-4 py-3">{statusBadge(invite)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {!invite.used ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setError('')
                              setSuccess('')
                              void copyMessage(invite)
                            }}
                          >
                            Nachricht kopieren
                          </Button>
                        ) : null}
                        {!invite.used ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void remove(invite.code)}
                          >
                            Löschen
                          </Button>
                        ) : null}
                      </div>
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
