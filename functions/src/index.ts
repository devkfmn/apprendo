import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { Resend } from 'resend'

initializeApp()
setGlobalOptions({ region: 'europe-west6' })

const resendApiKey = defineSecret('RESEND_API_KEY')
const appUrl = defineString('APP_URL', { default: 'https://apprendo.vercel.app' })
const inviteFromEmail = defineString('INVITE_FROM_EMAIL', {
  default: 'Apprendo <onboarding@resend.dev>',
})

type InviteRole = 'admin' | 'coach' | 'learner' | 'observer'

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

export const sendInviteEmail = onCall(
  {
    secrets: [resendApiKey],
    cors: true,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.')
    }

    const codeRaw = typeof request.data?.code === 'string' ? request.data.code.trim() : ''
    if (!codeRaw) {
      throw new HttpsError('invalid-argument', 'Einladungscode fehlt.')
    }
    const code = codeRaw.toLowerCase()

    const db = getFirestore()
    const callerSnap = await db.collection('users').doc(request.auth.uid).get()
    if (!callerSnap.exists) {
      throw new HttpsError('permission-denied', 'Kein Benutzerprofil.')
    }
    const caller = callerSnap.data() ?? {}
    const isAdmin = caller.role === 'admin' || caller.isAdmin === true
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Nur Admins dürfen Einladungen versenden.')
    }

    const inviteRef = db.collection('invites').doc(code)
    const inviteSnap = await inviteRef.get()
    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Einladung nicht gefunden.')
    }
    const invite = inviteSnap.data() ?? {}
    if (invite.used === true) {
      throw new HttpsError('failed-precondition', 'Einladung wurde bereits verwendet.')
    }

    const email = typeof invite.email === 'string' ? invite.email.trim().toLowerCase() : ''
    const role = invite.role as InviteRole
    if (!email || !['admin', 'coach', 'learner', 'observer'].includes(role)) {
      throw new HttpsError('failed-precondition', 'Einladung ist ungültig.')
    }

    const base = appUrl.value().replace(/\/+$/, '')
    const signupUrl = `${base}/signup?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`
    const displayName =
      typeof invite.displayName === 'string' && invite.displayName.trim()
        ? invite.displayName.trim()
        : null
    const content = buildEmail({ displayName, role, code, signupUrl })

    const resend = new Resend(resendApiKey.value())
    try {
      const result = await resend.emails.send({
        from: inviteFromEmail.value(),
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }

      await inviteRef.update({
        emailSentAt: new Date().toISOString(),
        emailStatus: 'sent',
        emailError: FieldValue.delete(),
        emailSendCount: FieldValue.increment(1),
      })

      return { ok: true as const, code, email }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'E-Mail konnte nicht gesendet werden.'
      await inviteRef.update({
        emailStatus: 'failed',
        emailError: message.slice(0, 500),
        emailSendCount: FieldValue.increment(1),
      })
      throw new HttpsError('internal', message)
    }
  },
)
