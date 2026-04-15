// ─── Database Types ───────────────────────────────────────────────────────────

export type EventType = 'concierto' | 'corporativo' | 'nocturno' | 'festival'
export type EventStatus = 'borrador' | 'publicado' | 'agotado' | 'cancelado' | 'finalizado'
export type TicketStatus = 'valido' | 'usado' | 'anulado' | 'transferido'
export type OrderStatus = 'pendiente' | 'completado' | 'fallido' | 'reembolsado'
export type ZoneType = 'general' | 'vip' | 'backstage' | 'pista' | 'grada' | 'palco'

export interface Event {
  id: string
  slug: string
  nombre: string
  descripcion: string
  tipo: EventType
  fecha_inicio: string
  fecha_fin?: string
  venue_nombre: string
  venue_direccion: string
  venue_ciudad: string
  imagen_url?: string
  imagen_banner_url?: string
  aforo_total: number
  estado: EventStatus
  created_at: string
  ticket_types?: TicketType[]
}

export interface TicketType {
  id: string
  event_id: string
  nombre: string
  descripcion?: string
  tipo_zona: ZoneType
  precio: number
  stock_total: number
  stock_disponible: number
  max_por_persona: number
  venta_inicio?: string
  venta_fin?: string
  activo: boolean
  color?: string
  beneficios?: string[]
}

export interface Order {
  id: string
  order_number: string
  customer_id?: string
  customer_email: string
  customer_nombre: string
  customer_telefono?: string
  event_id: string
  subtotal: number
  comision: number
  total: number
  estado: OrderStatus
  sumup_checkout_id?: string
  sumup_transaction_id?: string
  created_at: string
  event?: Event
  tickets?: Ticket[]
}

export interface Ticket {
  id: string
  order_id: string
  ticket_type_id: string
  event_id: string
  qr_code: string
  rfid_uid?: string
  rfid_cargado: boolean
  estado: TicketStatus
  numero_entrada: string
  holder_nombre?: string
  used_at?: string
  created_at: string
  ticket_type?: TicketType
  event?: Event
}

export interface Customer {
  id: string
  email: string
  nombre: string
  telefono?: string
  rfid_cards?: RFIDCard[]
  orders?: Order[]
  created_at: string
}

export interface RFIDCard {
  id: string
  customer_id: string
  uid: string
  alias?: string
  activa: boolean
  ticket_ids: string[]
  created_at: string
}

// ─── SumUp Types ─────────────────────────────────────────────────────────────

export interface SumUpCheckout {
  id: string
  checkout_reference: string
  amount: number
  currency: string
  merchant_code: string
  description: string
  return_url: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'
  checkout_url?: string
  valid_until?: string
}

export interface SumUpWebhookPayload {
  id: string
  checkout_reference: string
  amount: number
  currency: string
  status: 'PAID' | 'FAILED'
  transaction_id?: string
  timestamp: string
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export interface CartItem {
  ticket_type: TicketType
  quantity: number
}

export interface Cart {
  event: Event
  items: CartItem[]
  subtotal: number
  comision: number
  total: number
}

// ─── NFC / RFID Types ────────────────────────────────────────────────────────

export interface NFCWritePayload {
  ticket_id: string
  event_id: string
  qr_code: string
  holder?: string
  valid_until: string
}

export interface ValidationResult {
  valid: boolean
  ticket?: Ticket
  event?: Event
  ticket_type?: TicketType
  message: string
  already_used?: boolean
}
