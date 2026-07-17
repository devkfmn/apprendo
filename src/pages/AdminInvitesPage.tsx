import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createInvite,
  deleteInvite,
  listAllInvites,
  listUsersByRole,
} from '@/features/admin/api'
import type { Invite } from '@/features/auth/api'
import { formatDateTime, roleLabel } from '@/lib/utils'
import type { InviteRole, UserProfile } from '@/types/domain'

const INVITE_ROLES: InviteRole[] = ['coach', 'learner', 'observer', 'admin']

export function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [coaches, setCoaches] = useState<UserProfile[]>([])
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<InviteRole>('learner')
  const [coachId, setCoachId] = useState('')
  const [learnerIds, setLearnerIds] = useState<string[]>([])
  const [code, setCode] = useState('')

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
    void refresh()
      .catch(() => {
        if (!cancelled) setError('Einladungen konnten nicht geladen werden.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleLearner(id: string) {
    setLearnerIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
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
      setSuccess(`Einladung erstellt: Code «${invite.code}». Signup unter /signup.`)
      setEmail('')
      setDisplayName('')
      setCode('')
      setCoachId('')
      setLearnerIds([])
      await refresh()
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

  return (
    <div>
      <PageHeader
        title="Einladungen"
        description="Erstelle Einladungscodes. Empfänger legen das Konto unter /signup an."
      />

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
          {role === 'learner' && (
            <div className="sm:col-span-2">
              <Label htmlFor="invite-coach">Coach</Label>
              <Select
                id="invite-coach"
                value={coachId}
                onChange={(event) => setCoachId(event.target.value)}
                required
              >
                <option value="">Coach wählen…</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.displayName} ({coach.email})
                  </option>
                ))}
              </Select>
            </div>
          )}
          {role === 'observer' && (
            <div className="sm:col-span-2">
              <Label>Lernende</Label>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-line p-3">
                {learners.length === 0 ? (
                  <p className="text-sm text-ink-muted">Noch keine Lernenden vorhanden.</p>
                ) : (
                  learners.map((learner) => (
                    <label key={learner.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={learnerIds.includes(learner.id)}
                        onChange={() => toggleLearner(learner.id)}
                      />
                      <span>
                        {learner.displayName}{' '}
                        <span className="text-ink-muted">({learner.email})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Wird erstellt …' : 'Einladung erstellen'}
            </Button>
          </div>
        </form>
      </Card>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {success && <p className="mb-4 text-sm text-brand">{success}</p>}

      {!invites ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : invites.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">Noch keine Einladungen.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">Rolle</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Erstellt</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.code} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{invite.code}</td>
                  <td className="px-4 py-3">{invite.email}</td>
                  <td className="px-4 py-3">{roleLabel(invite.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={invite.used ? 'secondary' : 'default'}>
                      {invite.used ? 'verwendet' : 'offen'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDateTime(invite.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {!invite.used && (
                      <Button variant="ghost" size="sm" onClick={() => void remove(invite.code)}>
                        Löschen
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
