'use client'
import { useState } from 'react'
import { Event } from '@/types'
import { Loader2, ArrowRight } from 'lucide-react'

interface Props {
  event: Event
  cartItems: { ticket_type: any; quantity: number }[]
  total: number
}

export default function CheckoutForm({ event, cartItems, total }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    email2: '',
    telefono: '',
  })

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

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

      // Redirect to SumUp hosted checkout
      window.location.href = data.checkout_url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">

      {/* Personal data */}
      <div className="card">
        <p className="label mb-4">Tus datos</p>
        <div className="space-y-4">
          <div>
            <label className="label mb-1.5 block">Nombre completo *</label>
            <input
              type="text"
              className="input"
              placeholder="María García López"
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="label mb-1.5 block">Email *</label>
            <input
              type="email"
              className="input"
              placeholder="maria@ejemplo.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={loading}
            />
            <p className="text-brand-gray text-xs mt-1">Aquí recibirás tus entradas</p>
          </div>
          <div>
            <label className="label mb-1.5 block">Confirma el email *</label>
            <input
              type="email"
              className="input"
              placeholder="maria@ejemplo.com"
              value={form.email2}
              onChange={(e) => update('email2', e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="label mb-1.5 block">Teléfono (opcional)</label>
            <input
              type="tel"
              className="input"
              placeholder="+34 600 000 000"
              value={form.telefono}
              onChange={(e) => update('telefono', e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3">
          <p className="text-brand-red text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparando el pago...
          </>
        ) : (
          <>
            Ir al pago seguro
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-brand-gray text-xs text-center">
        Al continuar aceptas los <a href="#" className="text-brand-gold hover:underline">términos y condiciones</a>.
        El pago se procesa de forma segura a través de SumUp.
      </p>
    </div>
  )
}
