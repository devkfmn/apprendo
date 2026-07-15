/**
 * Creates invite docs using Firebase CLI credentials (no service account).
 *
 * Usage:
 *   npx tsx scripts/invite-user-cli.ts --email coach@example.com --role coach --code coach-1
 *   npx tsx scripts/invite-user-cli.ts --email learner@example.com --role learner --coachId <uid> --code learner-1
 */
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'apprendo-kfmn'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function extractFirst(json: string, key: string): string | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(json)
  return match?.[1] ?? null
}

async function getAccessToken(): Promise<string> {
  const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  const raw = readFileSync(configPath, 'utf8')
  const refreshToken = extractFirst(raw, 'refresh_token')
  if (!refreshToken) {
    throw new Error('No Firebase CLI refresh_token found. Run: npx firebase-tools login')
  }

  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

function toFirestoreFields(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreFields(item)) } }
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = toFirestoreFields(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

async function main() {
  const email = arg('email')
  const role = arg('role') as 'coach' | 'learner' | undefined
  const coachId = arg('coachId') ?? null
  const displayName = arg('name') ?? null
  const code = arg('code') ?? randomBytes(4).toString('hex')

  if (!email || !role || !['coach', 'learner'].includes(role)) {
    console.error(
      'Required: --email <email> --role <coach|learner> [--coachId <uid>] [--code <code>] [--name <displayName>]',
    )
    process.exit(1)
  }
  if (role === 'learner' && !coachId) {
    console.error('Learner invites require --coachId <coachUid>')
    process.exit(1)
  }

  const token = await getAccessToken()
  const payload = {
    email: email.toLowerCase(),
    role,
    coachId,
    displayName,
    used: false,
    createdAt: new Date().toISOString(),
  }
  const fields = toFirestoreFields(payload) as { mapValue: { fields: Record<string, unknown> } }
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/invites/${code}`
  const res = await fetch(`https://firestore.googleapis.com/v1/${name}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: fields.mapValue.fields }),
  })
  if (!res.ok) {
    throw new Error(`Failed to write invite: ${res.status} ${await res.text()}`)
  }

  console.log('Invite created:')
  console.log(`  code: ${code}`)
  console.log(`  email: ${email}`)
  console.log(`  role: ${role}`)
  if (coachId) console.log(`  coachId: ${coachId}`)
  console.log('Signup URL path: /signup')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
