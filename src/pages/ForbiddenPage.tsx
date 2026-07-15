import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useAuth } from '@/features/auth/useAuth'

export function ForbiddenPage() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const homePath = profile?.role === 'coach' ? '/coach' : '/'

  async function goToLogin() {
    setSigningOut(true)
    try {
      if (user) await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div className="flex flex-col items-center">
        <BrandLogo to={profile ? homePath : '/login'} size="lg" />
        <h1 className="mt-6 font-display text-3xl font-bold text-brand">Kein Zugriff</h1>
        <p className="mt-2 text-ink-muted">
          Für diese Seite fehlen dir die notwendigen Berechtigungen.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {profile ? (
            <Link
              to={homePath}
              className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-[#0c5a4e]"
            >
              Zur Übersicht
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void goToLogin()}
            disabled={signingOut}
            className={
              profile
                ? 'inline-flex h-10 items-center rounded-md border border-line bg-panel px-4 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60'
                : 'inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-[#0c5a4e] disabled:opacity-60'
            }
          >
            {signingOut ? 'Abmelden …' : 'Zur Anmeldung'}
          </button>
        </div>
      </div>
    </main>
  )
}
