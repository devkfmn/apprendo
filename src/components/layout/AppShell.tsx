import type { ReactNode } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { roleLabel, viewerAreaBase } from '@/lib/utils'

const learnerLinks = [
  ['Übersicht', '/'],
  ['Wochenrückblicke', '/journal'],
  ['Lernberichte', '/reports'],
  ['Ziele', '/goals'],
  ['Roadmap', '/roadmap'],
] as const

export function AppShell({ children }: { children?: ReactNode }) {
  const { profile, logout } = useAuth()
  const { learnerId } = useParams()
  const areaBase = profile ? viewerAreaBase(profile.role) : null
  const isViewer = Boolean(areaBase)
  const links = isViewer
    ? ([['Lernende', areaBase!] as const])
    : learnerLinks
  const learnerLinksForViewer =
    isViewer && learnerId
      ? [
          ['Übersicht', `${areaBase}/learners/${learnerId}`],
          ['Wochenrückblicke', `${areaBase}/learners/${learnerId}/journal`],
          ['Lernberichte', `${areaBase}/learners/${learnerId}/reports`],
          ['Ziele', `${areaBase}/learners/${learnerId}/goals`],
          ['Roadmap', `${areaBase}/learners/${learnerId}/roadmap`],
          ['Semester', `${areaBase}/learners/${learnerId}/semesters`],
        ]
      : []

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-panel/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <BrandLogo to={areaBase ?? '/'} size="md" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-right">
              <strong className="block font-semibold">{profile?.displayName}</strong>
              <span className="text-ink-muted">{roleLabel(profile?.role)}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-6">
        <nav className="mb-4 flex flex-wrap gap-1" aria-label="Hauptnavigation">
          {links.map(([label, href]) => (
            <NavLink
              key={href}
              to={href}
              end={href === '/' || href === '/coach' || href === '/beobachter'}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-brand-soft'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {learnerLinksForViewer.length > 0 && (
          <nav
            className="mb-8 flex flex-wrap gap-1 border-b border-line pb-4"
            aria-label="Lernendenavigation"
          >
            {learnerLinksForViewer.map(([label, href]) => (
              <NavLink
                key={href}
                to={href}
                end={href.endsWith(learnerId ?? '')}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-brand-soft'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
        <main>{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
