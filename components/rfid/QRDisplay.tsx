'use client'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props { qrCode: string; size?: number }

export default function QRDisplay({ qrCode, size = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrCode, {
      width: size,
      margin: 2,
      color: { dark: '#0A0A0A', light: '#F5F0E8' },
      errorCorrectionLevel: 'H',
    })
  }, [qrCode, size])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-[#F5F0E8] rounded-xl inline-block">
        <canvas ref={canvasRef} className="block rounded-lg" />
      </div>
      <p className="text-brand-gray text-xs font-mono tracking-wider">{qrCode}</p>
    </div>
  )
}
