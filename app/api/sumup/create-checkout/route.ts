import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { createSumUpCheckout } from '@/lib/sumup'
import { generateQRCode, generateTicketNumber, calculateCommission } from '@/lib/tickets'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_id, cart, customer } = body

    if (!event_id || !cart?.length || !customer?.email || !customer?.nombre) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // 1. Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, ticket_types(*)')
      .eq('id', event_id)
      .eq('estado', 'publicado')
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // 2. Validate stock and calculate total
    let subtotal = 0
    for (const item of cart) {
      const tt = event.ticket_types?.find((t: any) => t.id === item.ticket_type_id)
      if (!tt) return NextResponse.json({ error: `Tipo de entrada no válido` }, { status: 400 })
      if (tt.stock_disponible < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para: ${tt.nombre}` }, { status: 409 })
      }
      if (item.quantity > tt.max_por_persona) {
        return NextResponse.json({ error: `Máximo ${tt.max_por_persona} por persona para: ${tt.nombre}` }, { status: 400 })
      }
      subtotal += tt.precio * item.quantity
    }

    const comision = calculateCommission(subtotal)
    const total = subtotal + comision

    // 3. Create or find customer
    let customerId: string | null = null
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customer.email)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ email: customer.email, nombre: customer.nombre, telefono: customer.telefono })
        .select('id')
        .single()
      customerId = newCustomer?.id ?? null
    }

    // 4. Generate order number
    const { data: orderNumData } = await supabase.rpc('generate_order_number')
    const orderNumber = orderNumData ?? `ORD-${Date.now()}`

    // 5. Create order in PENDING state
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        customer_email: customer.email,
        customer_nombre: customer.nombre,
        customer_telefono: customer.telefono ?? null,
        event_id,
        subtotal,
        comision,
        total,
        estado: 'pendiente',
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Error creando el pedido' }, { status: 500 })
    }

    // 6. Create SumUp checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const sumupCheckout = await createSumUpCheckout({
      amount: total,
      description: `${cart.reduce((a: number, i: any) => a + i.quantity, 0)} entrada(s) — ${event.nombre}`,
      reference: order.id,
      return_url: `${appUrl}/confirmacion?order=${order.id}`,
      customer_email: customer.email,
    })

    // 7. Save order_items (cart snapshot for webhook processing)
    const orderItems = cart.map((item: any) => {
      const tt = event.ticket_types?.find((t: any) => t.id === item.ticket_type_id)
      return {
        order_id: order.id,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: tt?.precio ?? 0,
      }
    })
    await supabase.from('order_items').insert(orderItems)

    // 8. Save SumUp checkout ID to order
    await supabase
      .from('orders')
      .update({ sumup_checkout_id: sumupCheckout.id })
      .eq('id', order.id)

    return NextResponse.json({
      order_id: order.id,
      checkout_url: `https://pay.sumup.com/b2c/${process.env.NEXT_PUBLIC_SUMUP_MERCHANT_CODE}?checkout-id=${sumupCheckout.id}`,
      sumup_checkout_id: sumupCheckout.id,
    })
  } catch (err: any) {
    console.error('create-checkout error:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
