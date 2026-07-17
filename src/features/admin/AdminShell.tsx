import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { adminConsolePath } from '@/lib/adminPath'
import { profileHome, profileRoleLabel } from '@/lib/utils'

const tabs = [
  ['Benutzer', ''],
  ['Einladungen', 'invites'],
  ['Zuordnungen', 'mappings'],
] as const

export function AdminShell({ children }: { children?: ReactNode }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const base = adminConsolePath()
  const appHome = profile && profile.role !== 'admin' ? profileHome(profile) : null

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo to={base} size="md" />
            <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand">
              Ops
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-right">
              <strong className="block font-semibold">{profile?.displayName}</strong>
              <span className="text-ink-muted">{profileRoleLabel(profile)}</span>
            </span>
            {appHome ? (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => navigate(appHome)}
              >
                {profile?.role === 'coach'
                  ? 'Coach'
                  : profile?.role === 'observer'
                    ? 'Beobachter'
                    : 'App'}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6">
        <nav className="mb-6 flex flex-wrap gap-1" aria-label="Admin-Navigation">
          {tabs.map(([label, segment]) => {
            const href = segment ? `${base}/${segment}` : base
            return (
              <NavLink
                key={href}
                to={href}
                end={!segment}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-brand-soft'
                  }`
                }
              >
                {label}
              </NavLink>
            )
          })}
        </nav>
        <main>{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
