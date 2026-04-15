'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Ticket } from 'lucide-react'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-brand-border bg-brand-black/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center">
            <Ticket className="w-4 h-4 text-brand-black" />
          </div>
          <span className="font-display font-black text-xl text-brand-white group-hover:text-brand-gold transition-colors">
            {process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'TAQUILLA'}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm text-brand-gray hover:text-brand-white transition-colors">
            Eventos
          </Link>
          <Link href="/cuenta" className="text-sm text-brand-gray hover:text-brand-white transition-colors">
            Mis entradas
          </Link>
          <Link href="/validar" className="btn-secondary text-sm py-2 px-4">
            Validar entrada
          </Link>
        </nav>

        {/* Mobile menu */}
        <button
          className="md:hidden text-brand-gray hover:text-brand-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-brand-border bg-brand-dark px-4 py-4 flex flex-col gap-4">
          <Link href="/" className="text-sm text-brand-gray" onClick={() => setOpen(false)}>Eventos</Link>
          <Link href="/cuenta" className="text-sm text-brand-gray" onClick={() => setOpen(false)}>Mis entradas</Link>
          <Link href="/validar" className="btn-secondary text-sm py-2 text-center" onClick={() => setOpen(false)}>Validar entrada</Link>
        </div>
      )}
    </header>
  )
}
