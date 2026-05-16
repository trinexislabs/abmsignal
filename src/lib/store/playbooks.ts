import fs from 'fs'
import path from 'path'
import type {
  Playbook,
  PlaybookStatus,
  PlaybookSection,
  Contact,
  QualityCheck,
  AgentStatus,
} from '@/types'

export interface StoredPlaybook extends Playbook {
  sections: PlaybookSection[]
  contacts: Contact[]
  quality_checks: QualityCheck[]
  openclaw_session_id?: string
  phase_started_at?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_FILE = path.join(DATA_DIR, 'playbooks.json')

function loadStore(): Map<string, StoredPlaybook> {
  try {
    if (!fs.existsSync(STORE_FILE)) return new Map()
    const raw = fs.readFileSync(STORE_FILE, 'utf-8')
    const data = JSON.parse(raw) as Record<string, StoredPlaybook>
    return new Map(Object.entries(data))
  } catch {
    return new Map()
  }
}

function saveStore(store: Map<string, StoredPlaybook>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const data = Object.fromEntries(store)
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[store] Failed to persist playbooks:', err)
  }
}

const store = loadStore()

export function createPlaybook(
  data: Omit<StoredPlaybook, 'id' | 'created_at' | 'updated_at'>,
): StoredPlaybook {
  const id = `pb_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const now = new Date().toISOString()
  const playbook: StoredPlaybook = { ...data, id, created_at: now, updated_at: now }
  store.set(id, playbook)
  saveStore(store)
  return playbook
}

export function getPlaybook(id: string): StoredPlaybook | undefined {
  return store.get(id)
}

export function listPlaybooks(): StoredPlaybook[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function updatePlaybook(
  id: string,
  updates: Partial<Omit<StoredPlaybook, 'id' | 'created_at'>>,
): StoredPlaybook | undefined {
  const existing = store.get(id)
  if (!existing) return undefined
  const updated: StoredPlaybook = {
    ...existing,
    ...updates,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  }
  store.set(id, updated)
  saveStore(store)
  return updated
}

export function updatePlaybookStatus(
  id: string,
  status: PlaybookStatus,
  progress_pct: number,
  agent_status: AgentStatus[],
): StoredPlaybook | undefined {
  return updatePlaybook(id, { status, progress_pct, agent_status })
}

export function addContacts(id: string, contacts: Contact[]): StoredPlaybook | undefined {
  const existing = store.get(id)
  if (!existing) return undefined
  return updatePlaybook(id, { contacts: [...existing.contacts, ...contacts] })
}

export function updateContacts(id: string, contacts: Contact[]): StoredPlaybook | undefined {
  return updatePlaybook(id, { contacts })
}
