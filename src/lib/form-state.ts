// Safe localStorage wrapper with in-memory fallback.
// Safari in private browsing throws SecurityError on localStorage access.
// Module-level map acts as a session-scoped fallback for the same tab.

const mem: Record<string, string> = {}

function safeGet(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return v
  } catch {}
  return mem[key] ?? null
}

function safeSet(key: string, value: string): void {
  mem[key] = value
  try { localStorage.setItem(key, value) } catch {}
}

function safeRemove(key: string): void {
  delete mem[key]
  try { localStorage.removeItem(key) } catch {}
}

const BRIEF_KEY = 'abmsignal_product_brief'
const ACCOUNT_KEY = 'abmsignal_account'

export const formState = {
  saveBrief(data: unknown) { safeSet(BRIEF_KEY, JSON.stringify(data)) },
  readBrief() { return safeGet(BRIEF_KEY) },
  saveAccount(data: unknown) { safeSet(ACCOUNT_KEY, JSON.stringify(data)) },
  readAccount() { return safeGet(ACCOUNT_KEY) },
  clear() { safeRemove(BRIEF_KEY); safeRemove(ACCOUNT_KEY) },
}
