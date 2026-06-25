import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma'

declare const globalThis: { prisma?: InstanceType<typeof PrismaClient> } & typeof global

function makePrisma() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  // Runtime connects via the Supabase transaction pooler (DATABASE_URL, :6543).
  // Migrations use a direct connection (DIRECT_URL, :5432) — see prisma.config.ts.
  const adapter = new PrismaPg({ connectionString: url })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>
}

export const prisma: InstanceType<typeof PrismaClient> =
  globalThis.prisma ?? (() => {
    const client = makePrisma()
    if (process.env.NODE_ENV !== 'production') globalThis.prisma = client
    return client
  })()
