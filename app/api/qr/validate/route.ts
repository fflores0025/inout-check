import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { code, tipo, event_id, device_info } = await req.json()
    // tipo: 'qr' | 'rfid'

    if (!code || !tipo || !event_id) {
      return NextResponse.json({ valid: false, message: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // Find ticket by QR or RFID UID
    let query = supabase
      .from('tickets')
      .select('*, ticket_type:ticket_types(nombre, tipo_zona), event:events(nombre, fecha_inicio, venue_nombre)')
      .eq('event_id', event_id)

    if (tipo === 'qr') {
      query = query.eq('qr_code', code)
    } else if (tipo === 'rfid') {
      query = query.eq('rfid_uid', code.toUpperCase()).eq('rfid_cargado', true)
    } else {
      return NextResponse.json({ valid: false, message: 'Tipo inválido' }, { status: 400 })
    }

    const { data: ticket } = await query.maybeSingle()

    // Log the attempt
    const logEntry = {
      ticket_id: ticket?.id ?? null,
      tipo,
      codigo: code,
      resultado: 'no_encontrado' as string,
      device_info: device_info ?? null,
    }

    if (!ticket) {
      logEntry.resultado = 'no_encontrado'
      await supabase.from('validation_log').insert(logEntry)
      return NextResponse.json({
        valid: false,
        message: tipo === 'rfid' ? 'Pulsera no vinculada o no válida' : 'Entrada no encontrada',
      })
    }

    if (ticket.estado === 'usado') {
      logEntry.resultado = 'ya_usado'
      await supabase.from('validation_log').insert(logEntry)
      return NextResponse.json({
        valid: false,
        already_used: true,
        message: '⚠️ Entrada ya utilizada',
        used_at: ticket.used_at,
        ticket,
      })
    }

    if (ticket.estado !== 'valido') {
      logEntry.resultado = 'invalido'
      await supabase.from('validation_log').insert(logEntry)
      return NextResponse.json({
        valid: false,
        message: `Entrada ${ticket.estado}`,
        ticket,
      })
    }

    // ✅ Valid — mark as used
    await supabase
      .from('tickets')
      .update({ estado: 'usado', used_at: new Date().toISOString() })
      .eq('id', ticket.id)

    logEntry.resultado = 'valido'
    await supabase.from('validation_log').insert(logEntry)

    return NextResponse.json({
      valid: true,
      message: '✅ Acceso permitido',
      ticket: { ...ticket, estado: 'usado' },
    })
  } catch (err: any) {
    console.error('validate error:', err)
    return NextResponse.json({ valid: false, message: 'Error interno' }, { status: 500 })
  }
}
