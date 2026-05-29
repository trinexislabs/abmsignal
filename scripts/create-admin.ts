/**
 * Promote (or create) an admin user for the ABMSignal admin portal.
 *
 * Usage:
 *   npm run admin:create -- you@email.com
 *   npm run admin:create -- you@email.com --name "Jane Ops" --password "s3cret-pw"
 *
 * - If the email already exists, its role is flipped to "admin".
 * - If it doesn't exist, a new admin user is created (a --password is required
 *   in that case) along with a free subscription row.
 *
 * Reads DATABASE_URL from the environment, falling back to the dev SQLite db
 * (same convention as scripts/migrate-from-json.ts).
 */

import bcrypt from 'bcryptjs'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../src/generated/prisma'

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaLibSql({ url })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>

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
      console.log('  If this user is currently signed in, they must sign out and back in')
      console.log('  for the role to take effect in their session token.')
    }
    return
  }

  if (!password || password.length < 8) {
    console.error(`✗ No user with email ${email}. To create one, pass --password (min 8 chars).`)
    process.exit(1)
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? email.split('@')[0],
      password: hashed,
      role: 'admin',
      emailVerified: new Date(),
      subscription: { create: { plan: 'free', status: 'active' } },
    },
  })
  console.log(`✓ Created admin user ${user.email} (id: ${user.id}).`)
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
