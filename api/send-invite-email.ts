import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'

type InviteRole = 'admin' | 'coach' | 'learner' | 'observer'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'apprendo-kfmn'
const API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || ''
const APP_URL = (process.env.APP_URL || 'https://apprendo.vercel.app').replace(/\/+$/, '')
const FROM_EMAIL = process.env.INVITE_FROM_EMAIL || 'Apprendo <onboarding@resend.dev>'

function roleLabel(role: InviteRole): string {
  if (role === 'admin') return 'Admin'
  if (role === 'coach') return 'Coach'
  if (role === 'observer') return 'Beobachter'
  return 'Lernender'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fromFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return null
  const entry = value as Record<string, unknown>
  if ('stringValue' in entry) return entry.stringValue
  if ('booleanValue' in entry) return entry.booleanValue
  if ('integerValue' in entry) return Number(entry.integerValue)
  if ('doubleValue' in entry) return entry.doubleValue
  if ('nullValue' in entry) return null
  if ('arrayValue' in entry) {
    const values = (entry.arrayValue as { values?: unknown[] }).values ?? []
    return values.map((item) => fromFirestoreValue(item))
  }
  if ('mapValue' in entry) {
    const fields =
      (entry.mapValue as { fields?: Record<string, unknown> }).fields ?? {}
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(fields)) {
      out[key] = fromFirestoreValue(nested)
    }
    return out
  }
  return null
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === null) fields[key] = { nullValue: null }
    else if (typeof value === 'string') fields[key] = { stringValue: value }
    else if (typeof value === 'boolean') fields[key] = { booleanValue: value }
    else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value }
    }
  }
  return fields
}

async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  if (!API_KEY) throw new Error('FIREBASE_API_KEY is not configured.')
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!res.ok) throw new Error('Ungültige Anmeldung.')
  const data = (await res.json()) as {
    users?: Array<{ localId?: string; email?: string }>
  }
  const user = data.users?.[0]
  if (!user?.localId) throw new Error('Ungültige Anmeldung.')
  return { uid: user.localId, email: user.email }
}

async function firestoreGet(path: string, idToken: string): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Firestore-Lesen fehlgeschlagen (${res.status}).`)
  }
  const doc = (await res.json()) as { fields?: Record<string, unknown> }
  const fields = doc.fields ?? {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    out[key] = fromFirestoreValue(value)
  }
  return out
}

async function firestorePatchInviteEmailMeta(
  code: string,
  idToken: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const masks = Object.keys(patch)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join('&')
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/invites/${encodeURIComponent(code)}?${masks}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(patch) }),
  })
  if (!res.ok) {
    throw new Error(`Firestore-Update fehlgeschlagen (${res.status}).`)
  }
}

function buildEmail(input: {
  displayName: string | null
  role: InviteRole
  code: string
  signupUrl: string
}): { subject: string; text: string; html: string } {
  const greeting = input.displayName?.trim()
    ? `Hallo ${input.displayName.trim()},`
    : 'Hallo,'
  const role = roleLabel(input.role)
  const subject = `Einladung zu Apprendo (${role})`
  const text = [
    greeting,
    '',
    `Du wurdest als ${role} zu Apprendo eingeladen.`,
    '',
    `Konto erstellen: ${input.signupUrl}`,
    '',
    `Einladungscode: ${input.code}`,
    '',
    'Wichtig: Verwende genau die E-Mail-Adresse, an die diese Einladung geschickt wurde.',
    '',
    'Falls du diese Einladung nicht erwartet hast, kannst du die Nachricht ignorieren.',
  ].join('\n')

  const safeName = input.displayName ? escapeHtml(input.displayName.trim()) : null
  const htmlGreeting = safeName ? `Hallo ${safeName},` : 'Hallo,'
  const html = `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f3f1ec;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1c2421;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1ec;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #d8ddd8;border-radius:12px;padding:28px;">
          <tr><td style="font-size:22px;font-weight:700;color:#0f6b5c;">Apprendo</td></tr>
          <tr><td style="padding-top:16px;font-size:16px;line-height:1.5;">${htmlGreeting}</td></tr>
          <tr><td style="padding-top:12px;font-size:16px;line-height:1.5;">Du wurdest als <strong>${escapeHtml(role)}</strong> zu Apprendo eingeladen.</td></tr>
          <tr>
            <td style="padding-top:24px;" align="center">
              <a href="${escapeHtml(input.signupUrl)}" style="display:inline-block;background:#0f6b5c;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;">
                Konto erstellen
              </a>
            </td>
          </tr>
          <tr><td style="padding-top:20px;font-size:14px;line-height:1.5;color:#5a6862;">Einladungscode: <code style="font-size:13px;">${escapeHtml(input.code)}</code></td></tr>
          <tr><td style="padding-top:12px;font-size:13px;line-height:1.5;color:#5a6862;">Wichtig: Verwende genau die E-Mail-Adresse, an die diese Einladung geschickt wurde.</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!idToken) {
      return res.status(401).json({ error: 'Anmeldung erforderlich.' })
    }

    const codeRaw = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!codeRaw) {
      return res.status(400).json({ error: 'Einladungscode fehlt.' })
    }
    const code = codeRaw.toLowerCase()

    const callerAuth = await verifyIdToken(idToken)
    const caller = await firestoreGet(`users/${callerAuth.uid}`, idToken)
    if (!caller) {
      return res.status(403).json({ error: 'Kein Benutzerprofil.' })
    }
    const isAdmin = caller.role === 'admin' || caller.isAdmin === true
    if (!isAdmin) {
      return res.status(403).json({ error: 'Nur Admins dürfen Einladungen versenden.' })
    }

    const invite = await firestoreGet(`invites/${code}`, idToken)
    if (!invite) {
      return res.status(404).json({ error: 'Einladung nicht gefunden.' })
    }
    if (invite.used === true) {
      return res.status(409).json({ error: 'Einladung wurde bereits verwendet.' })
    }

    const email = typeof invite.email === 'string' ? invite.email.trim().toLowerCase() : ''
    const role = invite.role as InviteRole
    if (!email || !['admin', 'coach', 'learner', 'observer'].includes(role)) {
      return res.status(400).json({ error: 'Einladung ist ungültig.' })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY ist nicht konfiguriert.' })
    }

    const signupUrl = `${APP_URL}/signup?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`
    const displayName =
      typeof invite.displayName === 'string' && invite.displayName.trim()
        ? invite.displayName.trim()
        : null
    const content = buildEmail({ displayName, role, code, signupUrl })
    const previousCount =
      typeof invite.emailSendCount === 'number' && Number.isFinite(invite.emailSendCount)
        ? invite.emailSendCount
        : 0

    const resend = new Resend(resendKey)
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }

      await firestorePatchInviteEmailMeta(code, idToken, {
        emailSentAt: new Date().toISOString(),
        emailStatus: 'sent',
        emailError: null,
        emailSendCount: previousCount + 1,
      })

      return res.status(200).json({ ok: true, code, email })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'E-Mail konnte nicht gesendet werden.'
      try {
        await firestorePatchInviteEmailMeta(code, idToken, {
          emailStatus: 'failed',
          emailError: message.slice(0, 500),
          emailSendCount: previousCount + 1,
        })
      } catch {
        // ignore secondary write errors
      }
      return res.status(502).json({ error: message })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unerwarteter Fehler.'
    return res.status(500).json({ error: message })
  }
}
