import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createInviteUser,
  createUserProfile,
  getInvite,
  linkCoachLearner,
  linkObserverLearner,
  markInviteUsed,
} from '@/features/auth/api'
import { roleHome } from '@/lib/utils'

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledCode = (searchParams.get('code') ?? '').trim()
  const prefilledEmail = (searchParams.get('email') ?? '').trim()
  const emailLocked = Boolean(prefilledEmail)

  const [email, setEmail] = useState(prefilledEmail)
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState(prefilledCode)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const invite = await getInvite(inviteCode)
      if (!invite || invite.used) throw new Error('Ungültiger oder bereits verwendeter Einladungscode.')
      if (invite.email.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Die E-Mail-Adresse stimmt nicht mit der Einladung überein.')
      }
      const credential = await createInviteUser(email.trim(), password)
      const timestamp = new Date().toISOString()
      await createUserProfile({
        id: credential.user.uid,
        email: email.trim(),
        displayName: displayName.trim() || invite.displayName || email.trim(),
        role: invite.role,
        isAdmin: invite.role === 'admin' ? true : undefined,
        coachId: invite.coachId ?? null,
        inviteCode: invite.code,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      if (invite.role === 'learner' && invite.coachId) {
        await linkCoachLearner(invite.coachId, credential.user.uid)
      }
      if (invite.role === 'observer' && invite.learnerIds?.length) {
        await Promise.all(
          invite.learnerIds.map((learnerId) =>
            linkObserverLearner(credential.user.uid, learnerId),
          ),
        )
      }
      await markInviteUsed(invite.code)
      navigate(roleHome(invite.role), { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Konto konnte nicht erstellt werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5 py-8">
      <form onSubmit={submit} className="w-full rounded-xl border border-line bg-panel p-7 shadow-sm">
        <BrandLogo to="/signup" size="lg" />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Konto erstellen</h1>
        <p className="mt-1 text-ink-muted">Nur mit einer persönlichen Einladung.</p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="invite">Einladungscode</Label>
            <Input
              id="invite"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              readOnly={Boolean(prefilledCode)}
            />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={emailLocked}
            />
            {emailLocked ? (
              <p className="mt-1 text-xs text-ink-muted">
                Diese Adresse gehört zur Einladung und kann nicht geändert werden.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <Button type="submit" className="mt-6 w-full" disabled={submitting}>
          {submitting ? 'Wird erstellt …' : 'Konto erstellen'}
        </Button>
        <p className="mt-5 text-center text-sm text-ink-muted">
          Schon registriert?{' '}
          <Link className="text-brand underline" to="/login">
            Anmelden
          </Link>
        </p>
      </form>
    </main>
  )
}
