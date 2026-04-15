import { createSupabaseServer } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Header'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import { formatPrice, calculateCommission, getZoneLabel } from '@/lib/tickets'
import { Shield, Clock } from 'lucide-react'

interface Props {
  searchParams: Promise<{ event?: string; tt?: string | string[] }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const sp = await searchParams
  if (!sp.event || !sp.tt) redirect('/')

  const supabase = await createSupabaseServer()

  const { data: event } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('id', sp.event)
    .eq('estado', 'publicado')
    .single()

  if (!event) notFound()

  // Parse cart: tt=typeId:qty
  const ttParams = Array.isArray(sp.tt) ? sp.tt : [sp.tt]
  const cartItems = ttParams
    .map((param) => {
      const [id, qty] = param.split(':')
      const tt = event.ticket_types?.find((t: any) => t.id === id)
      if (!tt || !qty) return null
      return { ticket_type: tt, quantity: parseInt(qty) }
    })
    .filter(Boolean) as { ticket_type: any; quantity: number }[]

  if (cartItems.length === 0) redirect(`/evento/${event.slug}`)

  const subtotal = cartItems.reduce((acc, i) => acc + i.ticket_type.precio * i.quantity, 0)
  const comision = calculateCommission(subtotal)
  const total = subtotal + comision

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          <div className="mb-8 animate-in">
            <p className="label mb-2">Finalizar compra</p>
            <h1 className="font-display font-black text-3xl text-brand-white">{event.nombre}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Form */}
            <div className="lg:col-span-3">
              <CheckoutForm event={event} cartItems={cartItems} total={total} />
            </div>

            {/* Order summary */}
            <div className="lg:col-span-2">
              <div className="card sticky top-24">
                <p className="label mb-4">Resumen del pedido</p>

                <div className="space-y-3 mb-4">
                  {cartItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-brand-white text-sm font-medium">{item.ticket_type.nombre}</p>
                        <p className="text-brand-gray text-xs">{getZoneLabel(item.ticket_type.tipo_zona)} · ×{item.quantity}</p>
                      </div>
                      <span className="text-brand-white text-sm font-mono flex-shrink-0">
                        {formatPrice(item.ticket_type.precio * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray">Subtotal</span>
                    <span className="text-brand-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray">Gastos de gestión (1,95%)</span>
                    <span className="text-brand-white">{formatPrice(comision)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-brand-border">
                    <span className="text-brand-white">Total</span>
                    <span className="text-brand-gold text-lg">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-brand-border space-y-2">
                  <div className="flex items-center gap-2 text-brand-gray text-xs">
                    <Shield className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
                    Pago seguro con cifrado SSL
                  </div>
                  <div className="flex items-center gap-2 text-brand-gray text-xs">
                    <Clock className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
                    Entradas enviadas al instante por email
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
