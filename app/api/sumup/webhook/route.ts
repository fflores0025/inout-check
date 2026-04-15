import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getSumUpCheckout } from '@/lib/sumup'
import { generateQRCode, generateTicketNumber } from '@/lib/tickets'
import { sendTicketEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id: checkoutId, status } = body

    if (!checkoutId) {
      return NextResponse.json({ error: 'Missing checkout id' }, { status: 400 })
    }

    // Always verify status directly with SumUp (don't trust webhook body alone)
    const checkout = await getSumUpCheckout(checkoutId)
    if (checkout.status !== 'PAID') {
      return NextResponse.json({ ok: false, status: checkout.status })
    }

    const supabase = createSupabaseAdmin()

    // Find order by sumup_checkout_id
    const { data: order } = await supabase
      .from('orders')
      .select('*, event:events(*, ticket_types(*))')
      .eq('sumup_checkout_id', checkoutId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Idempotency: if already completed, skip
    if (order.estado === 'completado') {
      return NextResponse.json({ ok: true, already_processed: true })
    }

    // Update order to completed
    await supabase
      .from('orders')
      .update({
        estado: 'completado',
        sumup_transaction_id: body.transaction_id ?? null,
      })
      .eq('id', order.id)

    // We need the cart items — fetch from the order's ticket_types
    // Since we saved cart in query params, we re-fetch from existing tickets or re-derive
    // For fresh orders, we create tickets now based on original cart
    // The cart is stored implicitly: we need to re-read it from the checkout reference
    // Best practice: store cart_items in orders table. For now use order.id as reference.

    // Fetch cart from a dedicated cart_items table (see schema note below)
    const { data: cartItems } = await supabase
      .from('order_items')
      .select('*, ticket_type:ticket_types(*)')
      .eq('order_id', order.id)

    if (!cartItems?.length) {
      console.error('No cart items found for order', order.id)
      return NextResponse.json({ error: 'No cart items' }, { status: 500 })
    }

    // Decrease stock atomically and create tickets
    const ticketsToInsert: any[] = []
    let ticketIndex = 1

    for (const item of cartItems) {
      // Decrease stock
      await supabase.rpc('decrease_ticket_stock', {
        p_ticket_type_id: item.ticket_type_id,
        p_quantity: item.quantity,
      })

      // Create one ticket per unit
      for (let i = 0; i < item.quantity; i++) {
        ticketsToInsert.push({
          order_id: order.id,
          ticket_type_id: item.ticket_type_id,
          event_id: order.event_id,
          qr_code: generateQRCode(),
          numero_entrada: generateTicketNumber(order.event_id, ticketIndex++),
          holder_nombre: order.customer_nombre,
          estado: 'valido',
          rfid_cargado: false,
        })
      }
    }

    const { data: tickets } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select('*, ticket_type:ticket_types(*)')

    if (!tickets?.length) {
      return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 })
    }

    // Send confirmation email with QR codes
    try {
      await sendTicketEmail(order, order.event, tickets)
    } catch (emailErr) {
      console.error('Email send failed:', emailErr)
      // Don't fail the webhook for email errors
    }

    return NextResponse.json({ ok: true, tickets_created: tickets.length })
  } catch (err: any) {
    console.error('webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// SumUp also calls GET to verify the endpoint exists
export async function GET() {
  return NextResponse.json({ ok: true })
}
