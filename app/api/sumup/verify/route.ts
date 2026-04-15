import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getSumUpCheckout } from '@/lib/sumup'
import { generateQRCode, generateTicketNumber } from '@/lib/tickets'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order')
  if (!orderId) return NextResponse.json({ error: 'Missing order' }, { status: 400 })

  const supabase = createSupabaseAdmin()

  const { data: order } = await supabase
    .from('orders')
    .select('*, tickets(*, ticket_type:ticket_types(*))')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Already completed — return tickets
  if (order.estado === 'completado') {
    return NextResponse.json({ status: 'completado', tickets: order.tickets })
  }

  // Check SumUp status
  if (!order.sumup_checkout_id) {
    return NextResponse.json({ status: order.estado })
  }

  let checkout: any
  try {
    checkout = await getSumUpCheckout(order.sumup_checkout_id)
  } catch {
    return NextResponse.json({ status: order.estado })
  }

  console.log('SumUp checkout status:', checkout.status, 'checkout id:', order.sumup_checkout_id)
  if (checkout.status !== 'PAID') {
    return NextResponse.json({ status: order.estado, sumup_status: checkout.status })
  }

  // Payment confirmed — process order directly
  // Update order to completed
  await supabase
    .from('orders')
    .update({ estado: 'completado', sumup_transaction_id: checkout.transaction_id ?? null })
    .eq('id', order.id)

  // Fetch cart items
  const { data: cartItems } = await supabase
    .from('order_items')
    .select('*, ticket_type:ticket_types(*)')
    .eq('order_id', order.id)

  if (!cartItems?.length) {
    return NextResponse.json({ status: 'completado', tickets: [] })
  }

  // Decrease stock and create tickets
  const ticketsToInsert: any[] = []
  let ticketIndex = 1

  for (const item of cartItems) {
    await supabase.rpc('decrease_ticket_stock', {
      p_ticket_type_id: item.ticket_type_id,
      p_quantity: item.quantity,
    })
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

  // Send email in background
  try {
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('*, event:events(*)')
      .eq('id', order.id)
      .single()

    if (fullOrder) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sumup/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.sumup_checkout_id, email_only: true }),
      }).catch(console.error)
    }
  } catch {}

  return NextResponse.json({ status: 'completado', tickets: tickets ?? [] })
}
