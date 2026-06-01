import { createSupabaseServer } from '@/lib/supabase'
import { Event } from '@/types'
import Header from '@/components/Header'
import EventCard from '@/components/events/EventCard'
import { Ticket } from 'lucide-react'
import { notFound } from 'next/navigation'

export const revalidate = 60

async function getOrgEvents(slug: string): Promise<{ org: any, proximos: Event[], finalizados: Event[] } | null> {
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!org) return null

  const { data: proximosData } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('organization_id', org.id)
    .in('estado', ['publicado', 'agotado'])
    .order('fecha_inicio', { ascending: true })

  const { data: finalizadosData } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('organization_id', org.id)
    .eq('estado', 'finalizado')
    .order('fecha_inicio', { ascending: false })
    .limit(12)

  return {
    org,
    proximos: proximosData ?? [],
    finalizados: finalizadosData ?? []
  }
}

export default async function OrgPage({ params }: { params: { slug: string } }) {
  const result = await getOrgEvents(params.slug)

  if (!result) {
  return <div style={{color:'white',padding:'2rem'}}>Org no encontrada para slug: {params.slug}</div>
}

  const { org, proximos, finalizados } = result

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="relative pt-32 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            {org.logo_url && (
              <img src={org.logo_url} alt={org.nombre} className="h-16 mx-auto mb-6 object-contain" />
            )}
            <h1 className="font-display font-black text-4xl md:text-6xl text-brand-white mb-4">
              {org.nombre}
            </h1>
            <p className="text-brand-gray text-lg">Compra tus entradas de forma rápida y segura</p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="section-title">Próximos eventos</h2>
            <span className="label">{proximos.length} evento{proximos.length !== 1 ? 's' : ''}</span>
          </div>

          {proximos.length === 0 ? (
            <div className="card text-center py-20">
              <Ticket className="w-12 h-12 text-brand-gray mx-auto mb-4" />
              <p className="text-brand-gray">No hay eventos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {proximos.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {finalizados.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-24">
            <div className="flex items-center justify-between mb-10">
              <h2 className="section-title opacity-70">Eventos finalizados</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
              {finalizados.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-brand-border px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-brand-gray text-sm">© {new Date().getFullYear()} {org.nombre} · Powered by InOut Media</p>
        </div>
      </footer>
    </>
  )
}
