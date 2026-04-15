'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Event, TicketType, CartItem } from '@/types'
import { formatPrice, getZoneColor, getZoneLabel, calculateCommission } from '@/lib/tickets'
import { Plus, Minus, ShoppingCart, ChevronDown, ChevronUp, Check } from 'lucide-react'
import clsx from 'clsx'

interface Props { event: Event }

export default function TicketSelector({ event }: Props) {
  const router = useRouter()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const ticketTypes = event.ticket_types ?? []

  const updateCart = (id: string, delta: number, max: number) => {
    setCart((prev) => {
      const current = prev[id] ?? 0
      const next = Math.max(0, Math.min(max, current + delta))
      if (next === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: next }
    })
  }

  const cartItems: CartItem[] = Object.entries(cart)
    .map(([id, qty]) => ({
      ticket_type: ticketTypes.find((t) => t.id === id)!,
      quantity: qty,
    }))
    .filter((i) => i.ticket_type)

  const subtotal = cartItems.reduce((acc, i) => acc + i.ticket_type.precio * i.quantity, 0)
  const comision = calculateCommission(subtotal)
  const total = subtotal + comision
  const totalItems = cartItems.reduce((acc, i) => acc + i.quantity, 0)

  const handleCheckout = () => {
    const params = new URLSearchParams()
    params.set('event', event.id)
    cartItems.forEach((item) => {
      params.append('tt', `${item.ticket_type.id}:${item.quantity}`)
    })
    router.push(`/checkout?${params.toString()}`)
  }

  return (
    <div className="card animate-in" style={{ animationDelay: '0.2s' }}>
      <p className="label mb-4">Selecciona tus entradas</p>

      <div className="space-y-3">
        {ticketTypes.map((tt) => {
          const qty = cart[tt.id] ?? 0
          const isSoldOut = tt.stock_disponible === 0
          const isExpanded = expanded === tt.id
          const zoneColor = getZoneColor(tt.tipo_zona)

          return (
            <div
              key={tt.id}
              className={clsx(
                'border rounded-xl overflow-hidden transition-all duration-200',
                isSoldOut ? 'border-brand-border opacity-50' : 'border-brand-border hover:border-brand-gold-dim',
                qty > 0 && 'border-brand-gold-dim bg-brand-gold/5'
              )}
            >
              {/* Main row */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: zoneColor }}
                      />
                      <span className="label" style={{ color: zoneColor }}>
                        {getZoneLabel(tt.tipo_zona)}
                      </span>
                    </div>
                    <p className="text-brand-white font-semibold">{tt.nombre}</p>
                    <p className="text-brand-gold font-bold text-lg mt-0.5">{formatPrice(tt.precio)}</p>
                    {tt.stock_disponible <= 20 && !isSoldOut && (
                      <p className="text-brand-red text-xs mt-1">
                        ¡Solo quedan {tt.stock_disponible}!
                      </p>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSoldOut ? (
                      <span className="text-brand-gray text-sm">Agotado</span>
                    ) : (
                      <>
                        <button
                          onClick={() => updateCart(tt.id, -1, tt.max_por_persona)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-lg border border-brand-border flex items-center justify-center text-brand-gray hover:border-brand-gold hover:text-brand-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={clsx(
                          'w-6 text-center font-mono font-bold text-sm',
                          qty > 0 ? 'text-brand-gold' : 'text-brand-gray'
                        )}>
                          {qty}
                        </span>
                        <button
                          onClick={() => updateCart(tt.id, +1, tt.max_por_persona)}
                          disabled={qty >= tt.max_por_persona || qty >= tt.stock_disponible}
                          className="w-8 h-8 rounded-lg border border-brand-border flex items-center justify-center text-brand-gray hover:border-brand-gold hover:text-brand-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Benefits toggle */}
                {tt.beneficios && tt.beneficios.length > 0 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : tt.id)}
                    className="flex items-center gap-1 text-brand-gray text-xs mt-2 hover:text-brand-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Ver qué incluye
                  </button>
                )}
              </div>

              {/* Benefits list */}
              {isExpanded && tt.beneficios && (
                <div className="px-4 pb-4 border-t border-brand-border pt-3">
                  <ul className="space-y-1.5">
                    {tt.beneficios.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-brand-gray text-sm">
                        <Check className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {totalItems > 0 && (
        <div className="mt-4 pt-4 border-t border-brand-border space-y-2">
          <div className="flex justify-between text-sm text-brand-gray">
            <span>Subtotal ({totalItems} entrada{totalItems > 1 ? 's' : ''})</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-brand-gray">
            <span>Gestión (1,95%)</span>
            <span>{formatPrice(comision)}</span>
          </div>
          <div className="flex justify-between font-bold text-brand-white pt-2 border-t border-brand-border">
            <span>Total</span>
            <span className="text-brand-gold">{formatPrice(total)}</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={totalItems === 0}
        className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" />
        {totalItems === 0 ? 'Selecciona entradas' : `Comprar ${totalItems} entrada${totalItems > 1 ? 's' : ''}`}
      </button>

      <p className="text-brand-gray text-xs text-center mt-3">
        Pago seguro con SumUp · Sin gastos ocultos
      </p>
    </div>
  )
}
