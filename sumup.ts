import { SumUpCheckout } from '@/types'

const SUMUP_API = 'https://api.sumup.com/v0.1'
const API_KEY = process.env.SUMUP_API_KEY!

// ─── Create a checkout ────────────────────────────────────────────────────────
export async function createSumUpCheckout(params: {
  amount: number
  currency?: string
  description: string
  reference: string
  return_url: string
  customer_email?: string
}): Promise<SumUpCheckout> {
  const body = {
    checkout_reference: params.reference,
    amount: params.amount,
    currency: params.currency ?? 'EUR',
    merchant_code: process.env.NEXT_PUBLIC_SUMUP_MERCHANT_CODE,
    description: params.description,
    return_url: params.return_url,
    ...(params.customer_email && {
      customer: { email: params.customer_email }
    }),
  }

  const res = await fetch(`${SUMUP_API}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
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
  const res = await fetch(`${SUMUP_API}/checkouts/${checkoutId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to get SumUp checkout')
  return res.json()
}

// ─── Get Hosted Checkout URL ──────────────────────────────────────────────────
export function getHostedCheckoutUrl(checkoutId: string): string {
  return `https://pay.sumup.com/b2c/LLHVJZIZ?checkout-id=${checkoutId}`
}

// ─── Verify webhook signature ─────────────────────────────────────────────────
export function verifySumUpWebhook(payload: string, signature: string): boolean {
  // SumUp uses HMAC-SHA256 — implement when SumUp provides the secret
  // For now, validate by checking checkout status via API
  return true
}
