import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://inout-connect.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-secret',
}

const TIPO_MAP: Record<string, string> = {
  'Festival':    'festival',
  'Audiovisual': 'corporativo',
  'Gala':        'corporativo',
  'Club':        'nocturno',
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-api-secret')
    if (process.env.BRIDGE_SECRET && secret !== process.env.BRIDGE_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: CORS_HEADERS })
    }

    const body = await req.json()
    const { nombre, fecha, lugar, tipo, estado, firebase_id, ticket_types,
            artistas, vestimenta, apertura, edad_minima, normas,
            descripcion: descInput, maps_url, web_evento } = body

    if (!nombre || !fecha) {
      return NextResponse.json({ error: 'nombre y fecha son obligatorios' }, { status: 400, headers: CORS_HEADERS })
    }

    const slug = `${toSlug(nombre)}-${Date.now()}`
    const tipoMapeado = TIPO_MAP[tipo] ?? 'nocturno'
    const estadoTaquilla = ['confirmado', 'produccion'].includes(estado) ? 'publicado' : 'borrador'
    const fecha_inicio = new Date(`${fecha}T22:00:00`).toISOString()
    const lugarParts = (lugar || 'Por confirmar').split(',')
    const venue_nombre = lugarParts[0]?.trim() || 'Por confirmar'
    const venue_ciudad = lugarParts[1]?.trim() || 'Madrid'
    const aforo_total = Array.isArray(ticket_types)
      ? ticket_types.reduce((sum: number, t: any) => sum + (t.stock_total || 0), 0)
      : 0

    const campos = {
      nombre, tipo: tipoMapeado, fecha_inicio,
      venue_nombre, venue_ciudad, aforo_total, estado: estadoTaquilla,
      descripcion: descInput || null,
      artistas: artistas || null,
      vestimenta: vestimenta || null,
      apertura_puertas: apertura || null,
      edad_minima: edad_minima || null,
      normas: normas || null,
      maps_url: maps_url || null,
      web_evento: web_evento || null,
    }

    let event: any = null
    let eventError: any = null

    if (firebase_id) {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('firebase_id', firebase_id)
        .maybeSingle()

      if (existing) {
        const { data, error } = await supabase
          .from('events').update(campos).eq('id', existing.id).select().single()
        event = data; eventError = error
        if (!error) await supabase.from('ticket_types').delete().eq('event_id', existing.id)
      }
    }

    if (!event && !eventError) {
      const { data, error } = await supabase
        .from('events')
        .insert([{ slug, firebase_id: firebase_id || null, ...campos }])
        .select().single()
      event = data; eventError = error
    }

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500, headers: CORS_HEADERS })
    }

    if (Array.isArray(ticket_types) && ticket_types.length > 0) {
      const rows = ticket_types.map((t: any) => ({
        event_id: event.id,
        nombre: t.nombre || 'General',
        tipo_zona: t.zona || 'general',
        precio: parseFloat(t.precio) || 0,
        stock_total: parseInt(t.stock_total) || 0,
        stock_disponible: parseInt(t.stock_disponible) || parseInt(t.stock_total) || 0,
        max_por_persona: parseInt(t.max_por_persona) || 4,
        activo: true,
      }))
      await supabase.from('ticket_types').insert(rows)
    }

    return NextResponse.json({ success: true, event }, { status: 201, headers: CORS_HEADERS })

  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: CORS_HEADERS })
  }
}
