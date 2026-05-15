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

const store = new Map<string, StoredPlaybook>()

export function createPlaybook(
  data: Omit<StoredPlaybook, 'id' | 'created_at' | 'updated_at'>,
): StoredPlaybook {
  const id = `pb_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const now = new Date().toISOString()
  const playbook: StoredPlaybook = { ...data, id, created_at: now, updated_at: now }
  store.set(id, playbook)
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
