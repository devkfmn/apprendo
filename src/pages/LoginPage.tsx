import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AppLoadingScreen } from '@/components/brand/AppLoadingScreen'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/useAuth'
import { roleHome } from '@/lib/utils'

export function LoginPage() {
  const { user, profile, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <AppLoadingScreen />

  if (user && profile) {
    return <Navigate to={roleHome(profile.role)} replace />
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const nextProfile = await login(email, password)
      if (!nextProfile) {
        navigate('/forbidden', { replace: true })
        return
      }
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      const safeFrom =
        from && from !== '/forbidden' && from !== '/login' && from !== '/signup' ? from : null
      const home = roleHome(nextProfile.role)
      const destination =
        safeFrom &&
        ((nextProfile.role === 'coach' && safeFrom.startsWith('/coach')) ||
          (nextProfile.role === 'observer' && safeFrom.startsWith('/beobachter')) ||
          (nextProfile.role === 'learner' &&
            !safeFrom.startsWith('/coach') &&
            !safeFrom.startsWith('/beobachter')))
          ? safeFrom
          : home
      navigate(destination, { replace: true })
    } catch {
      setError('E-Mail-Adresse oder Passwort ist nicht korrekt.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <form onSubmit={submit} className="w-full rounded-xl border border-line bg-panel p-7 shadow-sm">
        <BrandLogo to="/login" size="lg" />
        <p className="mt-2 text-ink-muted">Melde dich an, um weiterzulernen.</p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <Button type="submit" className="mt-6 w-full" disabled={submitting}>
          {submitting ? 'Anmeldung läuft …' : 'Anmelden'}
        </Button>
        <p className="mt-5 text-center text-sm text-ink-muted">
          Einladung erhalten?{' '}
          <Link className="text-brand underline" to="/signup">
            Konto erstellen
          </Link>
        </p>
      </form>
    </main>
  )
}
