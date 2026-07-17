/**
 * One-off: delete all learner semesters (+ semesterGoals) for a clean re-plan.
 * Uses Firebase CLI credentials (no service account).
 *
 * Usage: npx tsx scripts/clear-semesters-cli.ts
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'apprendo-kfmn'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

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

type RunQueryRow = { document?: { name: string } }

async function listCollectionGroup(
  token: string,
  collectionId: string,
): Promise<string[]> {
  const names: string[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    )
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId, allDescendants: true }],
        },
        ...(pageToken ? { pageToken } : {}),
      }),
    })
    if (!res.ok) {
      throw new Error(`runQuery ${collectionId} failed: ${res.status} ${await res.text()}`)
    }
    const rows = (await res.json()) as RunQueryRow[]
    for (const row of rows) {
      if (row.document?.name) names.push(row.document.name)
    }
    // REST runQuery does not paginate via pageToken on this endpoint the same way;
    // for small datasets one shot is enough.
    pageToken = undefined
  } while (pageToken)

  return names
}

async function deleteDoc(token: string, docName: string): Promise<void> {
  // docName is full resource path: projects/.../documents/learners/.../semesters/...
  const url = `https://firestore.googleapis.com/v1/${docName}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE ${docName} failed: ${res.status} ${await res.text()}`)
  }
}

async function main() {
  const token = await getAccessToken()
  console.log(`Project: ${PROJECT_ID}`)
  console.log(`Listing semesters under ${BASE}…`)

  const semesterNames = await listCollectionGroup(token, 'semesters')
  const goalNames = await listCollectionGroup(token, 'semesterGoals')

  console.log(`Found ${semesterNames.length} semester(s), ${goalNames.length} semesterGoal(s)`)

  for (const name of goalNames) {
    await deleteDoc(token, name)
    console.log(`Deleted goal ${name.split('/').slice(-3).join('/')}`)
  }

  for (const name of semesterNames) {
    await deleteDoc(token, name)
    console.log(`Deleted semester ${name.split('/').slice(-3).join('/')}`)
  }

  console.log('Done. Learners can now use «8 Semester planen».')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
