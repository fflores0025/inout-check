import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseAdmin()

  // Events happening today or in the next 24h (for late-night events)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: events } = await supabase
    .from('events')
    .select('id, nombre, fecha_inicio, venue_nombre')
    .eq('estado', 'publicado')
    .gte('fecha_inicio', now.toISOString())
    .lte('fecha_inicio', tomorrow.toISOString())
    .order('fecha_inicio', { ascending: true })

  return NextResponse.json({ events: events ?? [] })
}
