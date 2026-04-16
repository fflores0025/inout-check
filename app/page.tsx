import { createSupabaseServer } from '@/lib/supabase'
import { Event } from '@/types'
import Header from '@/components/Header'
import EventCard from '@/components/events/EventCard'
import { Ticket, Zap, Shield, Smartphone } from 'lucide-react'

export const revalidate = 60

async function getEvents(): Promise<{ proximos: Event[], finalizados: Event[] }> {
  const supabase = await createSupabaseServer()
  const ahora = new Date().toISOString()

  // Próximos: publicado o agotado, y que no hayan terminado aún
  // (usa fecha_fin si existe, si no fecha_inicio)
  const { data: proximosData } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .in('estado', ['publicado', 'agotado'])
    .or(`fecha_fin.gte.${ahora},and(fecha_fin.is.null,fecha_inicio.gte.${ahora})`)
    .order('fecha_inicio', { ascending: true })

  // Finalizados: estado finalizado, o que la fecha_fin/inicio ya pasó
  const { data: finalizadosData } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .or(`estado.eq.finalizado,and(estado.in.(publicado,agotado),fecha_fin.lt.${ahora})`)
    .order('fecha_inicio', { ascending: false })
    .limit(12)

  return {
    proximos: proximosData ?? [],
    finalizados: finalizadosData ?? []
  }
}

export default async function HomePage() {
  const { proximos, finalizados } = await getEvents()

  return (
    <>
      <Header />
      <main className="min-h-screen">

        {/* Hero */}
        <section className="relative pt-32 pb-24 px-4 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 bg-brand-card border border-brand-border rounded-full px-4 py-1.5 mb-8 animate-in">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
              <span className="label">Entradas disponibles</span>
            </div>

            <h1 className="font-display font-black text-5xl md:text-7xl text-brand-white leading-tight mb-6 animate-in" style={{ animationDelay: '0.1s' }}>
              Tus entradas,
              <br />
              <span className="gold-text">sin rodeos.</span>
            </h1>

            <p className="text-brand-gray text-lg md:text-xl max-w-xl mx-auto mb-10 animate-in" style={{ animationDelay: '0.2s' }}>
              Compra directamente. Pulsera RFID o QR. Acceso instantáneo.
            </p>

            <div className="flex flex-wrap justify-center gap-6 animate-in" style={{ animationDelay: '0.3s' }}>
              {[
                { icon: Zap, label: 'Compra en 60 segundos' },
                { icon: Smartphone, label: 'Pulsera RFID o QR' },
                { icon: Shield, label: 'Pago seguro SumUp' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-brand-gray text-sm">
                  <Icon className="w-4 h-4 text-brand-gold" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Próximos eventos */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="section-title">Próximos eventos</h2>
            <span className="label">{proximos.length} evento{proximos.length !== 1 ? 's' : ''}</span>
          </div>

          {proximos.length === 0 ? (
            <div className="card text-center py-20">
              <Ticket className="w-12 h-12 text-brand-gray mx-auto mb-4" />
              <p className="text-brand-gray">No hay eventos disponibles en este momento.</p>
              <p className="text-brand-gray-dark text-sm mt-2">Vuelve pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {proximos.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Eventos finalizados */}
        {finalizados.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-24">
            <div className="flex items-center justify-between mb-10">
              <h2 className="section-title opacity-70">Eventos finalizados</h2>
              <span className="label">{finalizados.length} evento{finalizados.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger opacity-60">
              {finalizados.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gold-gradient rounded flex items-center justify-center">
              <Ticket className="w-3 h-3 text-brand-black" />
            </div>
            <span className="font-display font-black text-brand-white">
              {process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'TAQUILLA'}
            </span>
          </div>
          <p className="text-brand-gray text-sm">
            © {new Date().getFullYear()} Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-brand-gray text-sm hover:text-brand-white transition-colors">Aviso legal</a>
            <a href="#" className="text-brand-gray text-sm hover:text-brand-white transition-colors">Privacidad</a>
            <a href="#" className="text-brand-gray text-sm hover:text-brand-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </>
  )
}
