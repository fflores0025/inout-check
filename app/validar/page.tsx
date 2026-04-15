'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import { CheckCircle, XCircle, AlertTriangle, Wifi, QrCode, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

type ScanMode = 'qr' | 'rfid'
type ResultStatus = 'idle' | 'scanning' | 'loading' | 'valid' | 'invalid' | 'already_used'

export default function ValidarPage() {
  const [mode, setMode] = useState<ScanMode>('rfid')
  const [eventId, setEventId] = useState('')
  const [qrInput, setQrInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<ResultStatus>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const [nfcActive, setNfcActive] = useState(false)
  const nfcReaderRef = useRef<any>(null)

  // Auto-focus QR input
  useEffect(() => {
    if (mode === 'qr' && inputRef.current) inputRef.current.focus()
  }, [mode])

  const validate = async (code: string, tipo: 'qr' | 'rfid') => {
    if (!eventId) { alert('Selecciona un evento primero'); return }
    if (!code) return

    setStatus('loading')
    try {
      const res = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, tipo, event_id: eventId }),
      })
      const data = await res.json()
      setResult(data)

      if (data.valid) setStatus('valid')
      else if (data.already_used) setStatus('already_used')
      else setStatus('invalid')

      // Auto-reset after 4 seconds
      setTimeout(() => { setStatus('idle'); setResult(null); setQrInput('') }, 4000)
    } catch {
      setStatus('invalid')
      setResult({ message: 'Error de conexión' })
      setTimeout(() => { setStatus('idle'); setResult(null) }, 3000)
    }
  }

  // QR: submit on Enter or when scanner fires (barcode scanners send Enter automatically)
  const handleQRSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (qrInput.trim()) validate(qrInput.trim(), 'qr')
  }

  // RFID: use Web NFC to read UID
  const startNFC = async () => {
    if (!('NDEFReader' in window)) {
      alert('NFC no soportado en este dispositivo/navegador.')
      return
    }
    try {
      // @ts-ignore
      const reader = new NDEFReader()
      nfcReaderRef.current = reader
      await reader.scan()
      setNfcActive(true)

      reader.addEventListener('reading', ({ serialNumber }: { serialNumber: string }) => {
        if (serialNumber) validate(serialNumber.toUpperCase(), 'rfid')
      })
    } catch (err: any) {
      alert('No se pudo activar el NFC: ' + err.message)
    }
  }

  const stopNFC = () => {
    setNfcActive(false)
    nfcReaderRef.current = null
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-24 px-4">
        <div className="max-w-md mx-auto">

          <div className="mb-8 animate-in">
            <p className="label mb-2">Panel de acceso</p>
            <h1 className="font-display font-black text-3xl text-brand-white">Validador de entradas</h1>
          </div>

          {/* Event selector */}
          <div className="card mb-6 animate-in" style={{ animationDelay: '0.1s' }}>
            <label className="label mb-2 block">Evento activo</label>
            <EventSelector onSelect={setEventId} />
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-6 animate-in" style={{ animationDelay: '0.15s' }}>
            <button
              onClick={() => { setMode('rfid'); setStatus('idle'); setResult(null) }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all',
                mode === 'rfid'
                  ? 'bg-brand-gold text-brand-black border-brand-gold'
                  : 'border-brand-border text-brand-gray hover:border-brand-gold-dim'
              )}
            >
              <Wifi className="w-4 h-4" /> Pulsera RFID
            </button>
            <button
              onClick={() => { setMode('qr'); setStatus('idle'); setResult(null); stopNFC() }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all',
                mode === 'qr'
                  ? 'bg-brand-gold text-brand-black border-brand-gold'
                  : 'border-brand-border text-brand-gray hover:border-brand-gold-dim'
              )}
            >
              <QrCode className="w-4 h-4" /> Código QR
            </button>
          </div>

          {/* Result display */}
          {status !== 'idle' && status !== 'scanning' && (
            <div className={clsx(
              'rounded-2xl border p-6 mb-6 text-center transition-all animate-in',
              status === 'loading' && 'border-brand-border bg-brand-card',
              status === 'valid' && 'border-green-500/40 bg-green-500/10',
              status === 'invalid' && 'border-red-500/40 bg-red-500/10',
              status === 'already_used' && 'border-yellow-500/40 bg-yellow-500/10',
            )}>
              {status === 'loading' && <Loader2 className="w-10 h-10 text-brand-gold animate-spin mx-auto mb-2" />}
              {status === 'valid' && <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />}
              {status === 'invalid' && <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />}
              {status === 'already_used' && <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />}

              <p className={clsx(
                'text-lg font-bold mb-1',
                status === 'valid' && 'text-green-400',
                status === 'invalid' && 'text-red-400',
                status === 'already_used' && 'text-yellow-400',
                status === 'loading' && 'text-brand-white',
              )}>
                {status === 'loading' ? 'Validando...' : result?.message}
              </p>

              {result?.ticket && status !== 'loading' && (
                <div className="mt-3 text-sm text-brand-gray space-y-1">
                  <p className="text-brand-white font-medium">{result.ticket.ticket_type?.nombre}</p>
                  <p>{result.ticket.holder_nombre}</p>
                  <p className="font-mono text-xs">{result.ticket.numero_entrada}</p>
                  {result.already_used && result.ticket.used_at && (
                    <p className="text-yellow-400 text-xs">
                      Usado: {new Date(result.ticket.used_at).toLocaleTimeString('es-ES')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RFID mode */}
          {mode === 'rfid' && (
            <div className="card animate-in" style={{ animationDelay: '0.2s' }}>
              {!nfcActive ? (
                <div className="text-center py-4">
                  <p className="text-brand-gray text-sm mb-4">
                    Activa el lector NFC y acerca las pulseras para validarlas automáticamente.
                  </p>
                  <button
                    onClick={startNFC}
                    disabled={!eventId}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Wifi className="w-4 h-4" />
                    Activar lector NFC
                  </button>
                  {!eventId && <p className="text-brand-red text-xs mt-2">Selecciona un evento primero</p>}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-brand-gold animate-ping opacity-20" />
                    <div className="absolute inset-2 rounded-full border-2 border-brand-gold animate-ping opacity-40" style={{ animationDelay: '0.4s' }} />
                    <div className="absolute inset-4 rounded-full border-2 border-brand-gold flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-brand-gold" />
                    </div>
                  </div>
                  <p className="text-brand-white font-medium mb-1">NFC activo</p>
                  <p className="text-brand-gray text-sm mb-4">Acerca la pulsera al lector</p>
                  <button onClick={stopNFC} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-3.5 h-3.5" /> Detener
                  </button>
                </div>
              )}
            </div>
          )}

          {/* QR mode */}
          {mode === 'qr' && (
            <div className="card animate-in" style={{ animationDelay: '0.2s' }}>
              <p className="text-brand-gray text-sm mb-4">
                Escanea el QR con un lector de códigos o introdúcelo manualmente.
              </p>
              <form onSubmit={handleQRSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  className="input flex-1"
                  placeholder="TK-XXXXXX-XXXXXXXXXX"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  disabled={!eventId || status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={!eventId || !qrInput || status === 'loading'}
                  className="btn-primary px-4 flex-shrink-0"
                >
                  {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar'}
                </button>
              </form>
              {!eventId && <p className="text-brand-red text-xs mt-2">Selecciona un evento primero</p>}
            </div>
          )}

        </div>
      </main>
    </>
  )
}

// ── Event Selector ──────────────────────────────────────────────────────────
function EventSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events/active')
      .then((r) => r.json())
      .then((data) => { setEvents(data.events ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-brand-gray text-sm">Cargando eventos...</div>

  return (
    <select
      className="input"
      defaultValue=""
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="" disabled>Selecciona el evento de hoy</option>
      {events.map((e) => (
        <option key={e.id} value={e.id}>{e.nombre}</option>
      ))}
    </select>
  )
}
