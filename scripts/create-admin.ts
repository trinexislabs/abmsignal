/**
 * Promote (or create) an admin user for the ABMSignal admin portal.
 *
 * Usage:
 *   npm run admin:create -- you@email.com
 *   npm run admin:create -- you@email.com --name "Jane Ops" --password "s3cret-pw"
 *
 * - If a profile with that email already exists, its role is flipped to "admin".
 * - Otherwise a new Supabase Auth user is created (a --password is required in
 *   that case). The handle_new_user trigger provisions the profile + a free
 *   subscription; this script then promotes the profile to "admin".
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * DATABASE_URL (+ DIRECT_URL for migrations elsewhere).
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

const dbUrl = process.env.DATABASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!dbUrl) {
  console.error('✗ DATABASE_URL is not set')
  process.exit(1)
}
if (!supabaseUrl || !serviceKey) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: dbUrl })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function parseArgs(argv: string[]) {
  const positional: string[] = []
  const flags: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      flags[key] = argv[++i] ?? ''
    } else {
      positional.push(arg)
    }
  }
  return { email: positional[0], name: flags.name, password: flags.password }
}

async function main() {
  const { email, name, password } = parseArgs(process.argv.slice(2))

  if (!email || !email.includes('@')) {
    console.error('✗ Provide an email: npm run admin:create -- you@email.com [--name "Name"] [--password pw]')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`• ${email} is already an admin. Nothing to do.`)
    } else {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } })
      console.log(`✓ Promoted ${email} to admin.`)
      console.log('  If this user is signed in, they must sign out and back in.')
    }
    return
  }

  if (!password || password.length < 8) {
    console.error(`✗ No user with email ${email}. To create one, pass --password (min 8 chars).`)
    process.exit(1)
  }

  // Create the identity in Supabase Auth (email pre-confirmed for an operator).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name ?? email.split('@')[0] },
  })
  if (error || !data.user) {
    console.error('✗ Failed to create Supabase user:', error?.message ?? 'unknown error')
    process.exit(1)
  }
  const uid = data.user.id

  // The handle_new_user trigger should have created the profile + free sub. Upsert
  // defensively (in case the trigger isn't installed) and set the admin role.
  await prisma.user.upsert({
    where: { id: uid },
    update: { role: 'admin' },
    create: { id: uid, email, name: name ?? email.split('@')[0], role: 'admin' },
  })
  await prisma.userSubscription.upsert({
    where: { userId: uid },
    update: {},
    create: { userId: uid, plan: 'free', status: 'active' },
  })

  console.log(`✓ Created admin user ${email} (id: ${uid}).`)
  console.log('  Sign in at /admin/login with this email and the password you provided.')
}

main()
  .catch((err) => {
    console.error('✗ Failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
