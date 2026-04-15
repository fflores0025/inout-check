'use client'
import { useState, useEffect, useRef } from 'react'
import { Event } from '@/types'
import { Loader2, ArrowRight, Lock } from 'lucide-react'

interface Props {
  event: Event
  cartItems: { ticket_type: any; quantity: number }[]
  total: number
}

export default function CheckoutForm({ event, cartItems, total }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [widgetLoading, setWidgetLoading] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ nombre: '', email: '', email2: '', telefono: '' })

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  // Load SumUp widget script
  useEffect(() => {
    if (!checkoutId) return
    setWidgetLoading(true)

    const existing = document.getElementById('sumup-sdk')
    if (existing) {
      mountWidget(checkoutId)
      return
    }

    const script = document.createElement('script')
    script.id = 'sumup-sdk'
    script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'
    script.async = true
    script.onload = () => mountWidget(checkoutId)
    document.head.appendChild(script)
  }, [checkoutId])

  function mountWidget(id: string) {
    const SumUpCard = (window as any).SumUpCard
    if (!SumUpCard || !widgetRef.current) {
      setTimeout(() => mountWidget(id), 300)
      return
    }
    widgetRef.current.innerHTML = ''
    SumUpCard.mount({
      id: 'sumup-widget',
      checkoutId: id,
      onResponse: (type: string, body: any) => {
        if (type === 'success') {
          window.location.href = `/confirmacion?order=${body.checkout_reference}`
        } else if (type === 'error') {
          setError('Error al procesar el pago. Inténtalo de nuevo.')
          setCheckoutId(null)
        }
      },
      onLoad: () => setWidgetLoading(false),
    })
  }

  const handleSubmit = async () => {
    setError(null)
    if (!form.nombre || !form.email || !form.email2) {
      setError('Por favor rellena todos los campos obligatorios.')
      return
    }
    if (form.email !== form.email2) {
      setError('Los emails no coinciden.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('El email no es válido.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/sumup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          cart: cartItems.map((i) => ({
            ticket_type_id: i.ticket_type.id,
            quantity: i.quantity,
          })),
          customer: {
            nombre: form.nombre,
            email: form.email,
            telefono: form.telefono,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el pago')
      setCheckoutId(data.sumup_checkout_id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkoutId) {
    return (
      <div className="card animate-in">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-brand-gold" />
          <p className="label">Pago seguro</p>
        </div>
        {widgetLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
          </div>
        )}
        <div ref={widgetRef}>
          <div id="sumup-widget" />
        </div>
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <button
          onClick={() => { setCheckoutId(null); setError(null) }}
          className="mt-4 text-brand-gray text-sm hover:text-brand-white transition-colors"
        >
          ← Volver
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="card">
        <p className="label mb-4">Tus datos</p>
        <div className="space-y-4">
          <div>
            <label className="label mb-1.5 block">Nombre completo *</label>
            <input type="text" className="input" placeholder="María García López"
              value={form.nombre} onChange={(e) => update('nombre', e.target.value)} disabled={loading} />
          </div>
          <div>
            <label className="label mb-1.5 block">Email *</label>
            <input type="email" className="input" placeholder="maria@ejemplo.com"
              value={form.email} onChange={(e) => update('email', e.target.value)} disabled={loading} />
            <p className="text-brand-gray text-xs mt-1">Aquí recibirás tus entradas</p>
          </div>
          <div>
            <label className="label mb-1.5 block">Confirma el email *</label>
            <input type="email" className="input" placeholder="maria@ejemplo.com"
              value={form.email2} onChange={(e) => update('email2', e.target.value)} disabled={loading} />
          </div>
          <div>
            <label className="label mb-1.5 block">Teléfono (opcional)</label>
            <input type="tel" className="input" placeholder="+34 600 000 000"
              value={form.telefono} onChange={(e) => update('telefono', e.target.value)} disabled={loading} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4">
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Preparando el pago...</>
        ) : (
          <>Ir al pago seguro<ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      <p className="text-brand-gray text-xs text-center">
        Al continuar aceptas los <a href="#" className="text-brand-gold hover:underline">términos y condiciones</a>.
        El pago se procesa de forma segura a través de SumUp.
      </p>
    </div>
  )
}
