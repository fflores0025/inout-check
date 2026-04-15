import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getSumUpCheckout } from '@/lib/sumup'

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

  // If already completed (webhook already fired), return tickets
  if (order.estado === 'completado') {
    return NextResponse.json({ status: 'completado', tickets: order.tickets })
  }

  // If still pending, check SumUp directly
  if (order.sumup_checkout_id) {
    try {
      const checkout = await getSumUpCheckout(order.sumup_checkout_id)
      if (checkout.status === 'PAID' && order.estado === 'pendiente') {
        // Trigger webhook processing manually (webhook might have been delayed)
        // Fire-and-forget internal webhook call
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sumup/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: order.sumup_checkout_id }),
        }).catch(console.error)
      }
      return NextResponse.json({ status: order.estado, sumup_status: checkout.status })
    } catch {
      return NextResponse.json({ status: order.estado })
    }
  }

  return NextResponse.json({ status: order.estado })
}
