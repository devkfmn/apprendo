/**
 * Creates an invite document for invite-only signup.
 *
 * Usage:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json
 *   npx tsx scripts/invite-user.ts --email user@example.com --role learner --coachId <uid> --code optional-code
 *   npx tsx scripts/invite-user.ts --email coach@example.com --role coach --code coach-1
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

  await db.collection('invites').doc(code).set({
    email: email.toLowerCase(),
    role,
    coachId,
    displayName,
    used: false,
    createdAt: new Date().toISOString(),
  })

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
