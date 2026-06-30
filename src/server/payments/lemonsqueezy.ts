import crypto from 'crypto'

// Lemon Squeezy (merchant of record) client. We never touch cards — we create a
// hosted checkout and verify signed webhooks.

const LS_API = 'https://api.lemonsqueezy.com/v1'

function apiKey(): string {
  const k = process.env.LEMONSQUEEZY_API_KEY
  if (!k) throw new Error('LEMONSQUEEZY_API_KEY is not set')
  return k
}

function storeId(): string {
  const s = process.env.LEMONSQUEEZY_STORE_ID
  if (!s) throw new Error('LEMONSQUEEZY_STORE_ID is not set')
  return s
}

export type CheckoutPurpose = 'unlock' | 'credit' | 'subscription'

function variantForPurpose(purpose: CheckoutPurpose): string {
  const id =
    purpose === 'subscription'
      ? process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID
      : process.env.LEMONSQUEEZY_ONE_OFF_VARIANT_ID
  if (!id) throw new Error(`Missing LS variant id for purpose "${purpose}"`)
  return id
}

const JSON_API_HEADERS = () => ({
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
  Authorization: `Bearer ${apiKey()}`,
})

export interface CreateCheckoutParams {
  purpose: CheckoutPurpose
  userId: string
  email: string
  playbookId?: string
  redirectUrl: string
}

/** Create a hosted checkout; returns the URL to redirect the user to. */
export async function createCheckout(
  params: CreateCheckoutParams,
): Promise<{ checkoutUrl: string; checkoutId: string }> {
  const variantId = variantForPurpose(params.purpose)

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: params.email,
          // custom values MUST be strings; echoed back in webhook meta.custom_data
          custom: {
            user_id: params.userId,
            purpose: params.purpose,
            ...(params.playbookId ? { playbook_id: params.playbookId } : {}),
          },
        },
        product_options: {
          redirect_url: params.redirectUrl,
          enabled_variants: [Number(variantId)],
        },
        checkout_options: { embed: false },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId() } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  }

  const res = await fetch(`${LS_API}/checkouts`, {
    method: 'POST',
    headers: JSON_API_HEADERS(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LS checkout failed: HTTP ${res.status} ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as { data?: { id?: string; attributes?: { url?: string } } }
  const url = json.data?.attributes?.url
  const id = json.data?.id
  if (!url || !id) throw new Error('LS checkout response missing url/id')
  return { checkoutUrl: url, checkoutId: id }
}

/** Verify the X-Signature header (HMAC-SHA256 hex of the raw body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(signature, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// ── Reconciliation reads (used when a webhook is missed / DGX was offline) ────

export async function getOrder(orderId: string): Promise<{ status: string; raw: unknown } | null> {
  const res = await fetch(`${LS_API}/orders/${orderId}`, { headers: JSON_API_HEADERS() })
  if (!res.ok) return null
  const json = (await res.json()) as { data?: { attributes?: { status?: string } } }
  const status = json.data?.attributes?.status
  return status ? { status, raw: json } : null
}

export async function getSubscription(
  subscriptionId: string,
): Promise<{ status: string; renewsAt: string | null; raw: unknown } | null> {
  const res = await fetch(`${LS_API}/subscriptions/${subscriptionId}`, { headers: JSON_API_HEADERS() })
  if (!res.ok) return null
  const json = (await res.json()) as {
    data?: { attributes?: { status?: string; renews_at?: string | null } }
  }
  const status = json.data?.attributes?.status
  if (!status) return null
  return { status, renewsAt: json.data?.attributes?.renews_at ?? null, raw: json }
}
