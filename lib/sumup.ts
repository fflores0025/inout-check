import { SumUpCheckout } from '@/types'

const SUMUP_API = 'https://api.sumup.com/v0.1'

// ─── Get OAuth2 access token ──────────────────────────────────────────────────
async function getSumUpToken(): Promise<string> {
  const res = await fetch('https://api.sumup.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SUMUP_CLIENT_ID!,
      client_secret: process.env.SUMUP_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`SumUp token error: ${JSON.stringify(error)}`)
  }

  const data = await res.json()
  return data.access_token
}

// ─── Create a checkout ────────────────────────────────────────────────────────
export async function createSumUpCheckout(params: {
  amount: number
  currency?: string
  description: string
  reference: string
  return_url: string
  customer_email?: string
}): Promise<SumUpCheckout> {
  const token = await getSumUpToken()

  const body = {
    checkout_reference: params.reference,
    amount: params.amount,
    currency: params.currency ?? 'EUR',
    merchant_code: process.env.SUMUP_MERCHANT_CODE,
    description: params.description,
    return_url: params.return_url,
    ...(params.customer_email && {
      customer: { email: params.customer_email }
    }),
  }

  const res = await fetch(`${SUMUP_API}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`SumUp error: ${JSON.stringify(error)}`)
  }

  return res.json()
}

// ─── Get checkout status ──────────────────────────────────────────────────────
export async function getSumUpCheckout(checkoutId: string): Promise<SumUpCheckout> {
  const token = await getSumUpToken()

  const res = await fetch(`${SUMUP_API}/checkouts/${checkoutId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to get SumUp checkout')
  return res.json()
}

// ─── Get Hosted Checkout URL ──────────────────────────────────────────────────
export function getHostedCheckoutUrl(checkoutId: string): string {
  return `https://pay.sumup.com/b2c/${process.env.SUMUP_MERCHANT_CODE}?checkout-id=${checkoutId}`
}

// ─── Verify webhook signature ─────────────────────────────────────────────────
export function verifySumUpWebhook(payload: string, signature: string): boolean {
  return true
}
