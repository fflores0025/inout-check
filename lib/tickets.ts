import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'
import { Ticket, Event, TicketType, NFCWritePayload } from '@/types'

// ─── Generate unique QR code for a ticket ────────────────────────────────────
export function generateQRCode(): string {
  // Format: TK-{timestamp}-{uuid} — unique and sortable
  const ts = Date.now().toString(36).toUpperCase()
  const uid = uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()
  return `TK-${ts}-${uid}`
}

// ─── Generate ticket number (human-readable) ──────────────────────────────────
export function generateTicketNumber(eventId: string, index: number): string {
  const prefix = eventId.substring(0, 4).toUpperCase()
  return `${prefix}-${String(index).padStart(5, '0')}`
}

// ─── Render QR as data URL (for email/display) ───────────────────────────────
export async function qrToDataURL(code: string): Promise<string> {
  return QRCode.toDataURL(code, {
    width: 300,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#F5F0E8' },
    errorCorrectionLevel: 'H',
  })
}

// ─── Build NFC payload for RFID write ────────────────────────────────────────
export function buildNFCPayload(ticket: Ticket, event: Event): NFCWritePayload {
  return {
    ticket_id: ticket.id,
    event_id: event.id,
    qr_code: ticket.qr_code,
    holder: ticket.holder_nombre ?? undefined,
    valid_until: event.fecha_inicio,
  }
}

// ─── Encode NFC payload as NDEF text record ──────────────────────────────────
export function encodeNFCPayload(payload: NFCWritePayload): string {
  return JSON.stringify(payload)
}

// ─── Format price ─────────────────────────────────────────────────────────────
export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Calculate SumUp commission (1.95% standard) ─────────────────────────────
export function calculateCommission(subtotal: number, rate = 0.0195): number {
  return Math.round(subtotal * rate * 100) / 100
}

// ─── Zone badge color ─────────────────────────────────────────────────────────
export function getZoneColor(zone: string): string {
  const colors: Record<string, string> = {
    general: '#444444',
    vip: '#C9A84C',
    backstage: '#E03030',
    pista: '#2A6FDB',
    grada: '#555555',
    palco: '#8B5CF6',
  }
  return colors[zone] ?? '#444444'
}

export function getZoneLabel(zone: string): string {
  const labels: Record<string, string> = {
    general: 'General',
    vip: 'VIP',
    backstage: 'Backstage',
    pista: 'Pista',
    grada: 'Grada',
    palco: 'Palco',
  }
  return labels[zone] ?? zone
}
