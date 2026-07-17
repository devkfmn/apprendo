/**
 * Grants admin console access (`isAdmin: true`) while keeping the operational role
 * (coach / learner / observer). Optionally sets/restores that role.
 *
 * Uses Firebase CLI credentials (no service account).
 *
 * Usage:
 *   npx tsx scripts/promote-admin-cli.ts --email coach@example.com
 *   npx tsx scripts/promote-admin-cli.ts --email coach@example.com --role coach
 *   npx tsx scripts/promote-admin-cli.ts --uid <firebaseUid> --role coach
 *
 * If the profile currently has role `admin` and no --role is given, role is
 * restored to `coach` so the user can use both coach UI and ops.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'apprendo-kfmn'

type OperationalRole = 'coach' | 'learner' | 'observer'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function extractFirst(json: string, key: string): string | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(json)
  return match?.[1] ?? null
}

function parseRole(raw: string | undefined): OperationalRole | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'coach') return 'coach'
  if (normalized === 'lernender' || normalized === 'learner') return 'learner'
  if (normalized === 'beobachter' || normalized === 'observer') return 'observer'
  return null
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

function fromFirestoreValue(value: Record<string, unknown>): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('nullValue' in value) return null
  if ('mapValue' in value) {
    const fields =
      (value.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields ?? {}
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) out[k] = fromFirestoreValue(v)
    return out
  }
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: Record<string, unknown>[] }).values ?? []
    return values.map((item) => fromFirestoreValue(item))
  }
  return null
}

async function main() {
  const email = arg('email')?.trim().toLowerCase()
  const uidArg = arg('uid')?.trim()
  const roleArg = arg('role')
  const requestedRole = parseRole(roleArg)
  if (roleArg && !requestedRole) {
    console.error('Invalid --role. Use coach|learner|observer')
    process.exit(1)
  }
  if (!email && !uidArg) {
    console.error('Required: --email <email>  OR  --uid <firebaseUid>  [--role coach|learner|observer]')
    process.exit(1)
  }

  const token = await getAccessToken()
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

  let uid = uidArg
  let currentRole: string | null = null
  if (!uid && email) {
    const listRes = await fetch(`${base}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!listRes.ok) {
      throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`)
    }
    const listData = (await listRes.json()) as {
      documents?: Array<{ name: string; fields?: Record<string, Record<string, unknown>> }>
    }
    const match = (listData.documents ?? []).find((doc) => {
      const fields = doc.fields ?? {}
      const docEmail = fromFirestoreValue(fields.email ?? {})
      return typeof docEmail === 'string' && docEmail.toLowerCase() === email
    })
    if (!match) {
      throw new Error(`No user profile found for email: ${email}`)
    }
    uid = match.name.split('/').pop()
    const roleValue = fromFirestoreValue(match.fields?.role ?? {})
    currentRole = typeof roleValue === 'string' ? roleValue : null
  } else if (uid) {
    const getRes = await fetch(`${base}/users/${uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!getRes.ok) {
      throw new Error(`Failed to load user: ${getRes.status} ${await getRes.text()}`)
    }
    const doc = (await getRes.json()) as { fields?: Record<string, Record<string, unknown>> }
    const roleValue = fromFirestoreValue(doc.fields?.role ?? {})
    currentRole = typeof roleValue === 'string' ? roleValue : null
  }

  if (!uid) {
    throw new Error('Could not resolve user UID.')
  }

  const nextRole: OperationalRole | 'admin' | null =
    requestedRole ?? (currentRole === 'admin' ? 'coach' : null)

  const fieldPaths = ['isAdmin', 'updatedAt']
  if (nextRole) fieldPaths.push('role')

  const query = fieldPaths.map((path) => `updateMask.fieldPaths=${path}`).join('&')
  const fields: Record<string, unknown> = {
    isAdmin: { booleanValue: true },
    updatedAt: { stringValue: new Date().toISOString() },
  }
  if (nextRole) {
    fields.role = { stringValue: nextRole }
  }

  const res = await fetch(`${base}/users/${uid}?${query}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    throw new Error(`Failed to promote user: ${res.status} ${await res.text()}`)
  }

  console.log('Admin-Zugriff gewährt:')
  console.log(`  uid: ${uid}`)
  if (email) console.log(`  email: ${email}`)
  console.log(`  isAdmin: true`)
  console.log(`  role: ${nextRole ?? currentRole ?? '(unverändert)'}`)
  console.log('Coach-UI: /coach   Admin-Konsole: /ops')
  console.log('Umschalten: Header-Buttons oder Ctrl/Cmd+Shift+A')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
