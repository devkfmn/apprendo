/**
 * Seeds schoolRoadmapItems from BiVo 2021 JSON.
 *
 * Usage:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json
 *   npx tsx scripts/seed/seed-school-roadmap.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

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

async function main() {
  const file = join(__dirname, 'school-roadmap.bivo-2021.json')
  const items = JSON.parse(readFileSync(file, 'utf8')) as SeedItem[]
  const now = new Date().toISOString()
  const batch = db.batch()

  for (const item of items) {
    const ref = db.collection('schoolRoadmapItems').doc(item.id)
    batch.set(
      ref,
      {
        ...item,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    )
  }

  await batch.commit()
  console.log(`Seeded ${items.length} school roadmap items.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
