'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import NFCWriter from '@/components/rfid/NFCWriter'
import QRDisplay from '@/components/rfid/QRDisplay'
import { Ticket, Event } from '@/types'
import { formatPrice, getZoneLabel, getZoneColor } from '@/lib/tickets'
import { CheckCircle, Loader2, XCircle, Mail, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type PageStatus = 'loading' | 'polling' | 'completed' | 'failed'

export default function ConfirmacionClient() {  const params = useSearchParams()
  const orderId = params.get('order')

  const [status, setStatus] = useState<PageStatus>('loading')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [order, setOrder] = useState<any>(null)
  const [attempts, setAttempts] = useState(0)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent))
  }, [])

  const poll = useCallback(async () => {
    if (!orderId) { setStatus('failed'); return }

    try {
      const res = await fetch(`/api/sumup/verify?order=${orderId}`)
      const data = await res.json()

      if (data.status === 'completado' && data.tickets?.length) {
        setTickets(data.tickets)
        setStatus('completed')

        // Also fetch full order details
        const orderRes = await fetch(`/api/orders/${orderId}`)
        if (orderRes.ok) setOrder(await orderRes.json())
        return true // stop polling
      }

      if (data.status === 'fallido') {
        setStatus('failed')
        return true
      }
    } catch {}
    return false
  }, [orderId])

  useEffect(() => {
    setStatus('polling')
    let interval: NodeJS.Timeout
    let count = 0

    const run = async () => {
      const done = await poll()
      if (done) { clearInterval(interval); return }
      count++
      if (count >= 20) { // 20 × 3s = 60s timeout
        clearInterval(interval)
        setStatus('failed')
      }
    }

    run()
    interval = setInterval(run, 3000)
    return () => clearInterval(interval)
  }, [poll])

  // ── Loading / Polling ────────────────────────────────────────────────────
  if (status === 'loading' || status === 'polling') {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 flex items-center justify-center px-4">
          <div className="text-center animate-in">
            <div className="w-16 h-16 rounded-full border-2 border-brand-gold border-t-transparent animate-spin mx-auto mb-6" />
            <h1 className="font-display font-black text-2xl text-brand-white mb-2">
              Confirmando tu pago...
            </h1>
            <p className="text-brand-gray">No cierres esta página. Tardará solo unos segundos.</p>
          </div>
        </main>
      </>
    )
  }

  // ── Failed ───────────────────────────────────────────────────────────────
  if (status === 'failed') {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 flex items-center justify-center px-4">
          <div className="text-center animate-in max-w-md">
            <XCircle className="w-16 h-16 text-brand-red mx-auto mb-4" />
            <h1 className="font-display font-black text-2xl text-brand-white mb-2">
              Algo ha ido mal
            </h1>
            <p className="text-brand-gray mb-6">
              No hemos podido confirmar tu pago. Si se ha cobrado, recibirás las entradas por email en breve. Si no, no se ha realizado ningún cargo.
            </p>
            <a href="/" className="btn-secondary inline-block">Volver al inicio</a>
          </div>
        </main>
      </>
    )
  }

  // ── Completed ────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Success header */}
          <div className="text-center mb-10 animate-in">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="font-display font-black text-3xl text-brand-white mb-2">
              ¡Compra confirmada!
            </h1>
            <p className="text-brand-gray">
              Tus entradas están listas. También las hemos enviado a tu email.
            </p>
          </div>

          {/* Email notice */}
          <div className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-xl px-4 py-3 mb-6 animate-in" style={{ animationDelay: '0.1s' }}>
            <Mail className="w-4 h-4 text-brand-gold flex-shrink-0" />
            <p className="text-brand-gray text-sm">
              Revisa tu email — te hemos enviado las entradas con los códigos QR.
            </p>
          </div>

          {/* Tickets */}
          <div className="space-y-4 stagger">
            {tickets.map((ticket, i) => (
              <div key={ticket.id} className="card">
                {/* Ticket header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getZoneColor(ticket.ticket_type?.tipo_zona ?? '') }}
                      />
                      <span className="label" style={{ color: getZoneColor(ticket.ticket_type?.tipo_zona ?? '') }}>
                        {getZoneLabel(ticket.ticket_type?.tipo_zona ?? '')}
                      </span>
                    </div>
                    <p className="text-brand-white font-bold text-lg">{ticket.ticket_type?.nombre}</p>
                    <p className="text-brand-gray text-xs font-mono mt-0.5">{ticket.numero_entrada}</p>
                  </div>
                  <span className="badge bg-green-500/10 text-green-400 border border-green-500/20">
                    Válida
                  </span>
                </div>

                {/* QR Code */}
                <QRDisplay qrCode={ticket.qr_code} />

                {/* NFC Writer — Android only */}
                {isAndroid && (
                  <div className="mt-4">
                    <NFCWriter ticket={ticket} />
                  </div>
                )}

                {/* iPhone notice */}
                {!isAndroid && (
                  <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
                    <p className="text-blue-400 text-xs font-mono mb-1">📱 CARGA DE PULSERA — iPHONE</p>
                    <p className="text-brand-gray text-sm">
                      En la entrada encontrarás un punto de carga. Muestra este QR y un staff cargará tu pulsera RFID al instante.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>
    </>
  )
}
