const OPENCLAW_URL = process.env.OPENCLAW_ABMSIGNAL_URL ?? 'http://localhost:18790'
const OPENCLAW_TOKEN = process.env.OPENCLAW_ABMSIGNAL_TOKEN

export interface OpenClawSession {
  id: string
  agentId: string
  status: 'active' | 'completed' | 'error'
  messages: Array<{ role: string; content: string; created_at: string }>
  created_at: string
  updated_at: string
}

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (OPENCLAW_TOKEN) h['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`
  return h
}

export async function spawnAgent(
  agentId: string,
  message: string,
): Promise<{ sessionId: string }> {
  const res = await fetch(`${OPENCLAW_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ agentId, message }),
  })
  if (!res.ok) throw new Error(`OpenClaw spawnAgent: ${res.status} ${res.statusText}`)
  const data = (await res.json()) as { id: string }
  return { sessionId: data.id }
}

export async function getSession(sessionId: string): Promise<OpenClawSession> {
  const res = await fetch(`${OPENCLAW_URL}/api/v1/sessions/${sessionId}`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(`OpenClaw getSession: ${res.status} ${res.statusText}`)
  return res.json() as Promise<OpenClawSession>
}

export async function sendMessage(
  sessionId: string,
  message: string,
): Promise<{ id: string; content: string }> {
  const res = await fetch(`${OPENCLAW_URL}/api/v1/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error(`OpenClaw sendMessage: ${res.status} ${res.statusText}`)
  return res.json() as Promise<{ id: string; content: string }>
}
