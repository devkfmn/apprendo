import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  adminLinkCoachLearner,
  adminLinkObserverLearner,
  listAllCoachLearnerRelations,
  listAllObserverLearnerRelations,
  listUsersByRole,
  unlinkCoachLearner,
  unlinkObserverLearner,
} from '@/features/admin/api'
import { formatDateTime } from '@/lib/utils'
import type {
  CoachLearnerRelation,
  ObserverLearnerRelation,
  UserProfile,
} from '@/types/domain'

export function AdminMappingsPage() {
  const [coaches, setCoaches] = useState<UserProfile[]>([])
  const [learners, setLearners] = useState<UserProfile[]>([])
  const [observers, setObservers] = useState<UserProfile[]>([])
  const [coachLinks, setCoachLinks] = useState<CoachLearnerRelation[] | null>(null)
  const [observerLinks, setObserverLinks] = useState<ObserverLearnerRelation[] | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const [coachId, setCoachId] = useState('')
  const [learnerForCoach, setLearnerForCoach] = useState('')
  const [observerId, setObserverId] = useState('')
  const [learnerForObserver, setLearnerForObserver] = useState('')

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>()
    for (const user of [...coaches, ...learners, ...observers]) map.set(user.id, user)
    return map
  }, [coaches, learners, observers])

  function labelFor(id: string) {
    const user = usersById.get(id)
    return user ? `${user.displayName} (${user.email})` : id
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

  async function linkCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      await adminLinkCoachLearner(coachId, learnerForCoach)
      setSuccess('Coach ↔ Lernender verknüpft.')
      setLearnerForCoach('')
      await refresh()
    } catch {
      setError('Verknüpfung konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  async function linkObserver(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      await adminLinkObserverLearner(observerId, learnerForObserver)
      setSuccess('Beobachter ↔ Lernender verknüpft.')
      setLearnerForObserver('')
      await refresh()
    } catch {
      setError('Verknüpfung konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Zuordnungen"
        description="Verknüpfe bestehende Coaches und Beobachter mit Lernenden — unabhängig von der ursprünglichen Einladung."
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {success && <p className="mb-4 text-sm text-brand">{success}</p>}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Coach ↔ Lernender</CardTitle>
          <form onSubmit={linkCoach} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="map-coach">Coach</Label>
              <Select
                id="map-coach"
                value={coachId}
                onChange={(event) => setCoachId(event.target.value)}
                required
              >
                <option value="">Coach wählen…</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="map-learner-coach">Lernender</Label>
              <Select
                id="map-learner-coach"
                value={learnerForCoach}
                onChange={(event) => setLearnerForCoach(event.target.value)}
                required
              >
                <option value="">Lernender wählen…</option>
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              Verknüpfen
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Beobachter ↔ Lernender</CardTitle>
          <form onSubmit={linkObserver} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="map-observer">Beobachter</Label>
              <Select
                id="map-observer"
                value={observerId}
                onChange={(event) => setObserverId(event.target.value)}
                required
              >
                <option value="">Beobachter wählen…</option>
                {observers.map((observer) => (
                  <option key={observer.id} value={observer.id}>
                    {observer.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="map-learner-observer">Lernender</Label>
              <Select
                id="map-learner-observer"
                value={learnerForObserver}
                onChange={(event) => setLearnerForObserver(event.target.value)}
                required
              >
                <option value="">Lernender wählen…</option>
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              Verknüpfen
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Coach-Verknüpfungen</h2>
          {!coachLinks ? (
            <Skeleton className="h-24 w-full" />
          ) : coachLinks.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-muted">Keine Verknüpfungen.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {coachLinks.map((link) => (
                <li key={link.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="text-sm">
                      <p>
                        <strong>{labelFor(link.coachId)}</strong>
                        <span className="text-ink-muted"> → </span>
                        <strong>{labelFor(link.learnerId)}</strong>
                      </p>
                      <p className="text-ink-muted">{formatDateTime(link.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void unlinkCoachLearner(link.coachId, link.learnerId)
                          .then(async () => {
                            setSuccess('Verknüpfung entfernt.')
                            await refresh()
                          })
                          .catch(() => setError('Verknüpfung konnte nicht entfernt werden.'))
                      }}
                    >
                      Trennen
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Beobachter-Verknüpfungen</h2>
          {!observerLinks ? (
            <Skeleton className="h-24 w-full" />
          ) : observerLinks.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-muted">Keine Verknüpfungen.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {observerLinks.map((link) => (
                <li key={link.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="text-sm">
                      <p>
                        <strong>{labelFor(link.observerId)}</strong>
                        <span className="text-ink-muted"> → </span>
                        <strong>{labelFor(link.learnerId)}</strong>
                      </p>
                      <p className="text-ink-muted">{formatDateTime(link.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void unlinkObserverLearner(link.observerId, link.learnerId)
                          .then(async () => {
                            setSuccess('Verknüpfung entfernt.')
                            await refresh()
                          })
                          .catch(() => setError('Verknüpfung konnte nicht entfernt werden.'))
                      }}
                    >
                      Trennen
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
