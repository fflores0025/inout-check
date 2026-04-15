import { createSupabaseServer } from '@/lib/supabase'
import { Event } from '@/types'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import TicketSelector from '@/components/checkout/TicketSelector'
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 30

interface Props { params: Promise<{ slug: string }> }

async function getEvent(slug: string): Promise<Event | null> {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('slug', slug)
    .eq('estado', 'publicado')
    .single()
  return data
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) notFound()

  const fecha = format(new Date(event.fecha_inicio), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  const hora = format(new Date(event.fecha_inicio), "HH:mm", { locale: es })
  const totalStock = event.ticket_types?.reduce((acc, t) => acc + t.stock_disponible, 0) ?? 0

  // Filtrar texto interno generado automáticamente
  const descripcionLimpia = event.descripcion?.includes('ID Firebase:')
    ? ''
    : event.descripcion

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">

        {/* Banner */}
        <div className="relative h-64 md:h-96 bg-brand-dark overflow-hidden">
          {event.imagen_banner_url || event.imagen_url ? (
            <Image
              src={event.imagen_banner_url ?? event.imagen_url!}
              alt={event.nombre}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-card to-brand-black flex items-center justify-center">
              <span className="font-display font-black text-[120px] text-brand-border/30 select-none">
                {event.nombre.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 to-transparent" />

          {/* Back button */}
          <div className="absolute top-6 left-4 md:left-8">
            <Link href="/" className="flex items-center gap-2 text-brand-gray hover:text-brand-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Todos los eventos
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 -mt-16 relative pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Event info */}
            <div className="lg:col-span-2">
              <div className="mb-6 animate-in">
                <h1 className="font-display font-black text-4xl md:text-5xl text-brand-white mb-4">
                  {event.nombre}
                </h1>

                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-brand-gray">
                    <Calendar className="w-4 h-4 text-brand-gold" />
                    <span className="capitalize">{fecha} · {hora}h</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-gray">
                    <MapPin className="w-4 h-4 text-brand-gold" />
                    <span>{event.venue_nombre}, {event.venue_ciudad}</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-gray">
                    <Users className="w-4 h-4 text-brand-gold" />
                    <span>{totalStock.toLocaleString('es-ES')} entradas disponibles</span>
                  </div>
                </div>

                {descripcionLimpia && (
                  <p className="text-brand-gray leading-relaxed">{descripcionLimpia}</p>
                )}
              </div>

              {/* Venue info */}
              <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
                <p className="label mb-3">Lugar del evento</p>
                <p className="text-brand-white font-medium">{event.venue_nombre}</p>
                {event.venue_direccion && (
                  <p className="text-brand-gray text-sm mt-1">{event.venue_direccion}</p>
                )}
                <p className="text-brand-gray text-sm">{event.venue_ciudad}</p>
              </div>
            </div>

            {/* Right: Ticket selector (sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <TicketSelector event={event} />
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
