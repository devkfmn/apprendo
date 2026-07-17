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
  sendInviteEmail,
} from '@/features/admin/api'
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

function emailStatusBadge(invite: Invite) {
  if (invite.used) {
    return <Badge variant="secondary">verwendet</Badge>
  }
  if (invite.emailStatus === 'sent') {
    return <Badge variant="default">E-Mail gesendet</Badge>
  }
  if (invite.emailStatus === 'failed') {
    return <Badge variant="warning">E-Mail fehlgeschlagen</Badge>
  }
  return <Badge variant="outline">noch nicht gesendet</Badge>
}

export function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [coaches, setCoaches] = useState<UserProfile[]>([])
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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

  async function sendEmailFor(inviteCode: string, created = false) {
    setSendingCode(inviteCode)
    try {
      const result = await sendInviteEmail(inviteCode)
      setSuccess(
        created
          ? `Einladung «${inviteCode}» erstellt und an ${result.email} gesendet.`
          : `E-Mail an ${result.email} gesendet.`,
      )
      await refresh()
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'E-Mail konnte nicht gesendet werden.'
      if (created) {
        setSuccess(`Einladung «${inviteCode}» erstellt.`)
        setError(`E-Mail nicht gesendet: ${message}`)
      } else {
        setError(message)
      }
      await refresh()
    } finally {
      setSendingCode(null)
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
      await sendEmailFor(invite.code, true)
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
      setSuccess('Einladung gelöscht.')
      await refresh()
    } catch {
      setError('Einladung konnte nicht gelöscht werden.')
    }
  }

  async function copyCode(inviteCode: string) {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setSuccess(`Code «${inviteCode}» kopiert.`)
    } catch {
      setError('Code konnte nicht kopiert werden.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Einladungen"
        description="Einladungen erstellen und per E-Mail versenden. Empfänger öffnen den Link zum Signup."
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
              <Button type="submit" disabled={submitting || Boolean(sendingCode)}>
                {submitting || sendingCode
                  ? 'Erstellen & senden …'
                  : 'Einladung erstellen & per E-Mail senden'}
              </Button>
            </div>
          </form>
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
                      <button
                        type="button"
                        className="font-mono text-xs text-brand hover:underline"
                        onClick={() => void copyCode(invite.code)}
                      >
                        {invite.code}
                      </button>
                      <p className="text-xs text-ink-muted">
                        Erstellt {formatDateTime(invite.createdAt)}
                        {invite.emailSentAt
                          ? ` · Gesendet ${formatDateTime(invite.emailSentAt)}`
                          : ''}
                      </p>
                      {invite.emailStatus === 'failed' && invite.emailError ? (
                        <p className="mt-1 text-xs text-danger">{invite.emailError}</p>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{roleLabel(invite.role)}</td>
                    <td className="px-4 py-3">{emailStatusBadge(invite)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {!invite.used ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={sendingCode === invite.code}
                            onClick={() => {
                              setError('')
                              setSuccess('')
                              void sendEmailFor(invite.code)
                            }}
                          >
                            {sendingCode === invite.code
                              ? 'Senden …'
                              : invite.emailStatus === 'sent'
                                ? 'Erneut senden'
                                : 'E-Mail senden'}
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
