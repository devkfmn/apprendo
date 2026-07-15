/**
 * Seeds schoolRoadmapItems using Firebase CLI user credentials (no service account).
 * Usage: npx tsx scripts/seed/seed-school-roadmap-cli.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { GoogleAuth } from 'google-auth-library'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'apprendo-kfmn'

type SeedItem = {
  id: string
  code: string
  title: string
  description: string
  imsQuarter: number
  lehrjahr: number
  areaTitle: string
  sortOrder: number
  source: string
  version: string
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

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore'],
  })

  // Exchange refresh token via OAuth using Firebase CLI client id
  // firebase-tools public client id
  const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
  const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi'
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
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
  void auth
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
  const token = await getAccessToken()
  const file = join(__dirname, 'school-roadmap.bivo-2021.json')
  const items = JSON.parse(readFileSync(file, 'utf8')) as SeedItem[]
  const now = new Date().toISOString()

  for (const item of items) {
    const name = `projects/${PROJECT_ID}/databases/(default)/documents/schoolRoadmapItems/${item.id}`
    const fields = toFirestoreFields({
      ...item,
      createdAt: now,
      updatedAt: now,
    }) as { mapValue: { fields: Record<string, unknown> } }

    const url = `https://firestore.googleapis.com/v1/${name}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: fields.mapValue.fields }),
    })
    if (!res.ok) {
      throw new Error(`Failed to write ${item.id}: ${res.status} ${await res.text()}`)
    }
    console.log(`Seeded ${item.id}`)
  }

  console.log(`Done. Seeded ${items.length} school roadmap items into ${PROJECT_ID}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
