import Link from 'next/link'
import Image from 'next/image'
import { Event } from '@/types'
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatPrice } from '@/lib/tickets'
import clsx from 'clsx'

const EVENT_TYPE_LABELS: Record<string, string> = {
  concierto: 'Concierto',
  corporativo: 'Corporativo',
  nocturno: 'Ocio Nocturno',
  festival: 'Festival',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  concierto: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  corporativo: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  nocturno: 'text-brand-gold bg-brand-gold/10 border-brand-gold/20',
  festival: 'text-green-400 bg-green-400/10 border-green-400/20',
}

interface Props { event: Event }

export default function EventCard({ event }: Props) {
  const minPrice = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t) => t.precio))
    : null

  const totalStock = event.ticket_types?.reduce((acc, t) => acc + t.stock_disponible, 0) ?? 0
  const isSoldOut = totalStock === 0
  const isAlmostOut = totalStock > 0 && totalStock <= 20

  return (
    <Link
      href={`/evento/${event.slug}`}
      className={clsx(
        'group block bg-brand-card border border-brand-border rounded-2xl overflow-hidden',
        'hover:border-brand-gold-dim transition-all duration-300',
        isSoldOut && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Image */}
      <div className="relative h-48 bg-brand-dark overflow-hidden">
        {event.imagen_url ? (
          <Image
            src={event.imagen_url}
            alt={event.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display font-black text-6xl text-brand-border">
              {event.nombre.charAt(0)}
            </span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-transparent to-transparent" />

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={clsx('badge border', EVENT_TYPE_COLORS[event.tipo])}>
            {EVENT_TYPE_LABELS[event.tipo] ?? event.tipo}
          </span>
        </div>

        {/* Stock warning */}
        {isAlmostOut && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-brand-red/20 text-brand-red border border-brand-red/20">
              ¡Últimas entradas!
            </span>
          </div>
        )}
        {isSoldOut && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-brand-gray-dark text-brand-gray border border-brand-border">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-bold text-xl text-brand-white mb-3 group-hover:text-brand-gold transition-colors line-clamp-2">
          {event.nombre}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-brand-gray text-sm">
            <Calendar className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
            <span className="capitalize">
              {format(new Date(event.fecha_inicio), "EEEE d MMM · HH:mm", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-brand-gray text-sm">
            <MapPin className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
            <span className="truncate">{event.venue_nombre} · {event.venue_ciudad}</span>
          </div>
          {!isSoldOut && (
            <div className="flex items-center gap-2 text-brand-gray text-sm">
              <Users className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
              <span>{totalStock.toLocaleString('es-ES')} entradas disponibles</span>
            </div>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-brand-border">
          <div>
            {minPrice !== null ? (
              <>
                <p className="label">Desde</p>
                <p className="text-brand-gold font-bold text-lg">{formatPrice(minPrice)}</p>
              </>
            ) : (
              <p className="text-brand-gray text-sm">Precio no disponible</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-brand-gold text-sm font-medium group-hover:gap-2 transition-all">
            <span>Ver entradas</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  )
}
