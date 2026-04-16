import { createSupabaseServer } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import TicketSelector from '@/components/checkout/TicketSelector'
import { Calendar, MapPin, Users, ArrowLeft, Clock, ShieldAlert, Music, Shirt, Globe, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 30

interface Props { params: Promise<{ slug: string }> }

async function getEvent(slug: string): Promise<any | null> {
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
  const totalStock = event.ticket_types?.reduce((acc: number, t: any) => acc + t.stock_disponible, 0) ?? 0
  const descripcion = event.descripcion?.includes('ID Firebase:') ? null : event.descripcion

  const infoItems = [
    event.artistas && { icon: Music, label: 'Artistas', value: event.artistas },
    event.vestimenta && { icon: Shirt, label: 'Código de vestimenta', value: event.vestimenta },
    event.apertura_puertas && { icon: Clock, label: 'Apertura de puertas', value: event.apertura_puertas + 'h' },
    event.edad_minima && { icon: ShieldAlert, label: 'Edad mínima', value: `+${event.edad_minima} años` },
  ].filter(Boolean) as { icon: any, label: string, value: string }[]

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <div className="relative h-64 md:h-96 bg-brand-dark overflow-hidden">
          {event.imagen_banner_url || event.imagen_url ? (
            <Image src={event.imagen_banner_url ?? event.imagen_url} alt={event.nombre} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-card to-brand-black flex items-center justify-center">
              <span className="font-display font-black text-[120px] text-brand-border/30 select-none">{event.nombre.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 to-transparent" />
          <div className="absolute top-6 left-4 md:left-8">
            <Link href="/" className="flex items-center gap-2 text-brand-gray hover:text-brand-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />Todos los eventos
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 -mt-16 relative pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              <div className="animate-in">
                <h1 className="font-display font-black text-4xl md:text-5xl text-brand-white mb-4">{event.nombre}</h1>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2 text-brand-gray">
                    <Calendar className="w-4 h-4 text-brand-gold" />
                    <span className="capitalize">{fecha} · {hora}h{event.fecha_fin ? ` — ${format(new Date(event.fecha_fin), "HH:mm", { locale: es })}h` : ''}</span>
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
                {descripcion && <p className="text-brand-gray leading-relaxed">{descripcion}</p>}
              </div>

              {infoItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in" style={{ animationDelay: '0.05s' }}>
                  {infoItems.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="card flex items-start gap-3 py-3 px-4">
                      <Icon className="w-4 h-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="label text-xs mb-0.5">{label}</p>
                        <p className="text-brand-white text-sm font-medium">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {event.normas && (
                <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
                  <p className="label mb-3">📋 Normas del recinto</p>
                  <p className="text-brand-gray text-sm leading-relaxed whitespace-pre-line">{event.normas}</p>
                </div>
              )}

              <div className="card animate-in" style={{ animationDelay: '0.15s' }}>
                <p className="label mb-3">Lugar del evento</p>
                <p className="text-brand-white font-medium">{event.venue_nombre}</p>
                {event.venue_direccion && <p className="text-brand-gray text-sm mt-1">{event.venue_direccion}</p>}
                <p className="text-brand-gray text-sm">{event.venue_ciudad}</p>
                {event.maps_url && (
                  <a href={event.maps_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-brand-gold text-sm hover:underline">
                    <MapPin className="w-3.5 h-3.5" />Ver en Google Maps<ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {event.web_evento && (
                <a href={event.web_evento} target="_blank" rel="noopener noreferrer"
                  className="card flex items-center gap-3 hover:border-brand-gold/40 transition-colors animate-in"
                  style={{ animationDelay: '0.2s' }}>
                  <Globe className="w-5 h-5 text-brand-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="label text-xs mb-0.5">Web oficial del evento</p>
                    <p className="text-brand-white text-sm truncate">{event.web_evento}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-brand-gray shrink-0" />
                </a>
              )}

            </div>
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
