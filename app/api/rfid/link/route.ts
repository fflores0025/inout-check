import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { ticket_id, rfid_uid } = await req.json()

    if (!ticket_id || !rfid_uid) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // 1. Check the ticket exists and is valid
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, estado, rfid_uid, rfid_cargado, event_id, order:orders(customer_email)')
      .eq('id', ticket_id)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
    }
    if (ticket.estado !== 'valido') {
      return NextResponse.json({ error: 'Esta entrada no es válida' }, { status: 400 })
    }
    if (ticket.rfid_cargado) {
      return NextResponse.json({ error: 'Esta entrada ya tiene una pulsera vinculada' }, { status: 409 })
    }

    // 2. Check the UID is not already linked to another valid ticket for the same event
    const { data: conflict } = await supabase
      .from('tickets')
      .select('id')
      .eq('rfid_uid', rfid_uid)
      .eq('event_id', ticket.event_id)
      .eq('estado', 'valido')
      .neq('id', ticket_id)
      .maybeSingle()

    if (conflict) {
      return NextResponse.json({
        error: 'Esta pulsera ya está vinculada a otra entrada para este evento',
      }, { status: 409 })
    }

    // 3. Link UID to ticket
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ rfid_uid, rfid_cargado: true })
      .eq('id', ticket_id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al vincular la pulsera' }, { status: 500 })
    }

    // 4. Upsert rfid_cards table (track the physical card)
    await supabase
      .from('rfid_cards')
      .upsert({ uid: rfid_uid }, { onConflict: 'uid', ignoreDuplicates: true })

    return NextResponse.json({ ok: true, rfid_uid })
  } catch (err: any) {
    console.error('rfid/link error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
