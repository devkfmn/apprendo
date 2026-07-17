import type { Invite } from '@/features/auth/api'
import { roleLabel } from '@/lib/utils'

/** Prefer production app URL so invites created locally still work for recipients. */
export function inviteAppOrigin(): string {
  const fromEnv = (import.meta.env.VITE_APP_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname)) {
    return window.location.origin
  }
  return 'https://apprendo.vercel.app'
}

export function inviteSignupUrl(invite: Pick<Invite, 'code' | 'email'>): string {
  const origin = inviteAppOrigin()
  const params = new URLSearchParams({
    code: invite.code,
    email: invite.email,
  })
  return `${origin}/signup?${params.toString()}`
}

/** Plain-text message for WhatsApp / e-mail / chat — copy & paste. */
export function buildInviteMessage(invite: Invite): string {
  const name = invite.displayName?.trim()
  const greeting = name ? `Hallo ${name},` : 'Hallo,'
  const role = roleLabel(invite.role)
  const signupUrl = inviteSignupUrl(invite)

  return [
    greeting,
    '',
    `du wurdest als ${role} zu Apprendo eingeladen.`,
    '',
    'Konto erstellen:',
    signupUrl,
    '',
    `Einladungscode: ${invite.code}`,
    '',
    `Wichtig: Melde dich mit genau dieser E-Mail-Adresse an: ${invite.email}`,
    '',
    'Falls du diese Einladung nicht erwartet hast, kannst du die Nachricht ignorieren.',
  ].join('\n')
}
