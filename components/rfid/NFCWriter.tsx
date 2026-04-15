'use client'
import { useState } from 'react'
import { Ticket } from '@/types'
import { Loader2, Wifi, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

type NFCStatus = 'idle' | 'scanning' | 'linking' | 'success' | 'error'

interface Props { ticket: Ticket }

export default function NFCWriter({ ticket }: Props) {
  const [status, setStatus] = useState<NFCStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [linkedUID, setLinkedUID] = useState<string | null>(ticket.rfid_uid ?? null)

  // Already linked
  if (ticket.rfid_cargado && linkedUID) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-green-400 text-sm font-medium">Pulsera vinculada</p>
          <p className="text-brand-gray text-xs font-mono mt-0.5">{linkedUID}</p>
        </div>
      </div>
    )
  }

  const startScan = async () => {
    setErrorMsg(null)

    // Check Web NFC support
    if (!('NDEFReader' in window)) {
      setErrorMsg('Tu navegador no soporta NFC. Usa Chrome en Android.')
      setStatus('error')
      return
    }

    setStatus('scanning')

    try {
      // @ts-ignore — Web NFC API types
      const reader = new NDEFReader()
      await reader.scan()

      // Listen for one tap
      reader.addEventListener('reading', async ({ serialNumber }: { serialNumber: string }) => {
        if (!serialNumber) {
          setErrorMsg('No se pudo leer el UID de la pulsera.')
          setStatus('error')
          return
        }

        const uid = serialNumber.toUpperCase()
        setStatus('linking')

        // Link UID to ticket in DB
        try {
          const res = await fetch('/api/rfid/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: ticket.id, rfid_uid: uid }),
          })

          const data = await res.json()

          if (!res.ok) {
            setErrorMsg(data.error ?? 'Error al vincular la pulsera.')
            setStatus('error')
            return
          }

          setLinkedUID(uid)
          setStatus('success')
        } catch {
          setErrorMsg('Error de conexión. Inténtalo de nuevo.')
          setStatus('error')
        }
      }, { once: true })

      reader.addEventListener('readingerror', () => {
        setErrorMsg('No se pudo leer la pulsera. Acércala de nuevo.')
        setStatus('error')
      }, { once: true })

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Necesitas dar permiso para usar NFC.')
      } else {
        setErrorMsg('No se pudo activar el NFC. ¿Está activado en tu móvil?')
      }
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus('idle')
    setErrorMsg(null)
  }

  return (
    <div className="border border-brand-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-brand-dark border-b border-brand-border">
        <p className="text-xs font-mono text-brand-gold tracking-widest">📳 CARGAR PULSERA RFID</p>
      </div>

      <div className="p-4">

        {/* Idle */}
        {status === 'idle' && (
          <div className="text-center">
            <p className="text-brand-gray text-sm mb-4">
              Acerca tu pulsera al móvil para vincularla a esta entrada.
              <br />
              <span className="text-xs text-brand-gray-dark">Solo se leerá el ID único de la pulsera.</span>
            </p>
            <button onClick={startScan} className="btn-primary w-full flex items-center justify-center gap-2">
              <Wifi className="w-4 h-4" />
              Acercar pulsera
            </button>
          </div>
        )}

        {/* Scanning */}
        {status === 'scanning' && (
          <div className="text-center py-4">
            {/* Animated rings */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-brand-gold animate-ping opacity-30" />
              <div className="absolute inset-2 rounded-full border-2 border-brand-gold animate-ping opacity-50" style={{ animationDelay: '0.3s' }} />
              <div className="absolute inset-4 rounded-full border-2 border-brand-gold flex items-center justify-center">
                <Wifi className="w-5 h-5 text-brand-gold" />
              </div>
            </div>
            <p className="text-brand-white text-sm font-medium">Esperando pulsera...</p>
            <p className="text-brand-gray text-xs mt-1">Acerca la pulsera a la parte trasera del móvil</p>
          </div>
        )}

        {/* Linking */}
        {status === 'linking' && (
          <div className="text-center py-4">
            <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto mb-3" />
            <p className="text-brand-white text-sm">Vinculando pulsera...</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-green-400 font-semibold mb-1">¡Pulsera vinculada!</p>
            <p className="text-brand-gray text-xs font-mono">{linkedUID}</p>
            <p className="text-brand-gray text-sm mt-2">
              Ya puedes acceder al evento con tu pulsera.
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center py-2">
            <XCircle className="w-8 h-8 text-brand-red mx-auto mb-2" />
            <p className="text-brand-red text-sm mb-3">{errorMsg}</p>
            <button onClick={reset} className="btn-secondary flex items-center gap-2 mx-auto text-sm py-2 px-4">
              <RefreshCw className="w-3.5 h-3.5" />
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
