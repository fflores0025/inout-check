import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usamos service role para saltarnos RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapa de tipos de inout-connect → tipos válidos en Supabase
const TIPO_MAP: Record<string, string> = {
  'Festival':     'festival',
  'Audiovisual':  'corporativo',
  'Gala':         'corporativo',
  'Club':         'nocturno',
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    // Clave secreta opcional para proteger el endpoint
    const secret = req.headers.get('x-api-secret')
    if (process.env.BRIDGE_SECRET && secret !== process.env.BRIDGE_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { nombre, fecha, lugar, tipo, estado, firebase_id } = body

    if (!nombre || !fecha) {
      return NextResponse.json({ error: 'nombre y fecha son obligatorios' }, { status: 400 })
    }

    // Generar slug único
    const baseSlug = toSlug(nombre)
    const slug = `${baseSlug}-${Date.now()}`

    // Mapear tipo
    const tipoMapeado = TIPO_MAP[tipo] ?? 'nocturno'

    // Solo publicar si el evento está confirmado o en producción
    const estadoTaquilla = ['confirmado', 'produccion'].includes(estado)
      ? 'publicado'
      : 'borrador'

    // Construir fecha_inicio (el campo de Firebase es solo fecha YYYY-MM-DD)
    const fecha_inicio = new Date(`${fecha}T22:00:00`).toISOString()

    // Separar venue_nombre y venue_ciudad si el lugar tiene formato "Sala, Ciudad"
    const lugarParts = (lugar || 'Por confirmar').split(',')
    const venue_nombre = lugarParts[0]?.trim() || lugar || 'Por confirmar'
    const venue_ciudad = lugarParts[1]?.trim() || 'Madrid'

    const { data, error } = await supabase
      .from('events')
      .insert([{
        slug,
        nombre,
        tipo: tipoMapeado,
        fecha_inicio,
        venue_nombre,
        venue_ciudad,
        aforo_total: 0,
        estado: estadoTaquilla,
        descripcion: `Evento creado desde InOut Connect. ID Firebase: ${firebase_id ?? '—'}`,
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, event: data }, { status: 201 })

  } catch (err) {
    console.error('Bridge error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
