import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Taquilla — Entradas Oficiales',
    template: '%s | Taquilla',
  },
  description: 'Compra tus entradas de forma rápida, segura y sin comisiones abusivas.',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
