/**
 * Creates an invite document for invite-only signup.
 *
 * Roles: Coach (`coach`), Lernender (`lernender`/`learner`), Beobachter (`beobachter`/`observer`).
 *
 * Usage:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json
 *   npx tsx scripts/invite-user.ts --email coach@example.com --role coach --code coach-1
 *   npx tsx scripts/invite-user.ts --email user@example.com --role lernender --coachId <uid> --code learner-1
 *   npx tsx scripts/invite-user.ts --email observer@example.com --role beobachter --learnerIds <uid1,uid2> --code obs-1
 */
import { randomBytes } from 'node:crypto'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

type StoredRole = 'coach' | 'learner' | 'observer'

function parseRole(raw: string | undefined): StoredRole | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'coach') return 'coach'
  if (normalized === 'lernender' || normalized === 'learner') return 'learner'
  if (normalized === 'beobachter' || normalized === 'observer') return 'observer'
  return null
}

function roleLabel(role: StoredRole): string {
  if (role === 'coach') return 'Coach'
  if (role === 'observer') return 'Beobachter'
  return 'Lernender'
}

function parseLearnerIds(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

async function main() {
  const email = arg('email')
  const role = parseRole(arg('role'))
  const coachId = arg('coachId') ?? null
  const learnerIds = parseLearnerIds(arg('learnerIds'))
  const displayName = arg('name') ?? null
  const code = arg('code') ?? randomBytes(4).toString('hex')

  if (!email || !role) {
    console.error(
      'Required: --email <email> --role <coach|lernender|beobachter> [--coachId <uid>] [--learnerIds <uid,uid>] [--code <code>] [--name <displayName>]',
    )
    process.exit(1)
  }

  if (role === 'learner' && !coachId) {
    console.error('Einladungen für Lernende benötigen --coachId <coachUid>')
    process.exit(1)
  }
  if (role === 'observer' && learnerIds.length === 0) {
    console.error('Einladungen für Beobachter benötigen --learnerIds <learnerUid,learnerUid>')
    process.exit(1)
  }

  await db.collection('invites').doc(code).set({
    email: email.toLowerCase(),
    role,
    coachId: role === 'learner' ? coachId : null,
    learnerIds: role === 'observer' ? learnerIds : null,
    displayName,
    used: false,
    createdAt: new Date().toISOString(),
  })

  console.log('Einladung erstellt:')
  console.log(`  code: ${code}`)
  console.log(`  email: ${email}`)
  console.log(`  role: ${roleLabel(role)} (${role})`)
  if (coachId && role === 'learner') console.log(`  coachId: ${coachId}`)
  if (learnerIds.length) console.log(`  learnerIds: ${learnerIds.join(', ')}`)
  console.log('Signup URL path: /signup')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
