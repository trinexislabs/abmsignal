import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma'

declare const globalThis: { prisma?: InstanceType<typeof PrismaClient> } & typeof global

function makePrisma(): InstanceType<typeof PrismaClient> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  // Runtime connects via the Supabase transaction pooler (DATABASE_URL, :6543).
  // Migrations use a direct connection (DIRECT_URL, :5432) — see prisma.config.ts.
  const adapter = new PrismaPg({ connectionString: url })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>
  if (process.env.NODE_ENV !== 'production') globalThis.prisma = client
  return client
}

function getClient(): InstanceType<typeof PrismaClient> {
  return globalThis.prisma ?? makePrisma()
}

// Lazy proxy: the real client (and the DATABASE_URL check) is created on first
// property access, not at import time. This lets `next build` import modules that
// reference `prisma` without a database connection (DB env isn't present during
// `docker build`). Methods are bound to the real client so `this` stays correct.
export const prisma: InstanceType<typeof PrismaClient> = new Proxy(
  {} as InstanceType<typeof PrismaClient>,
  {
    get(_target, prop, receiver) {
      const client = getClient()
      const value = Reflect.get(client as object, prop, receiver)
      return typeof value === 'function' ? value.bind(client) : value
    },
  },
)
