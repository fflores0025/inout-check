'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function ResetForm() {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    // Supabase maneja el token de reset automáticamente desde la URL
    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario está autenticado con el token de reset — listo para cambiar contraseña
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password || !password2) { setError('Rellena todos los campos'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Error al actualizar. El enlace puede haber caducado.'); return }
    setDone(true)
    setTimeout(() => router.push('/cuenta'), 2500)
  }

  const inputCls = "w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-brand-white placeholder-brand-gray text-sm outline-none focus:border-brand-gold transition-colors"

  if (done) return (
    <div className="card max-w-md mx-auto mt-8 text-center">
      <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
      <h2 className="font-display font-black text-xl text-brand-white mb-2">¡Contraseña actualizada!</h2>
      <p className="text-brand-gray text-sm">Redirigiendo a tu cuenta...</p>
    </div>
  )

  return (
    <div className="card max-w-md mx-auto mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
          <Lock className="w-5 h-5 text-brand-black" />
        </div>
        <div>
          <h1 className="font-display font-black text-xl text-brand-white">Nueva contraseña</h1>
          <p className="text-brand-gray text-sm">Elige una contraseña segura</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <label className="block text-xs text-brand-gray uppercase tracking-wider mb-1.5">Nueva contraseña</label>
      <div className="relative mb-3">
        <input
          type={showPass ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className={inputCls + ' pr-12'}
        />
        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-white">
          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <label className="block text-xs text-brand-gray uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
      <div className="relative mb-6">
        <input
          type={showPass ? 'text' : 'password'}
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
          placeholder="Repite la contraseña"
          className={inputCls + ' pr-12'}
        />
      </div>

      <button onClick={handleReset} disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
        <Lock className="w-4 h-4" />{loading ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </div>
  )
}

export default function ResetPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <Suspense fallback={<div className="text-center text-brand-gray mt-16">Cargando...</div>}>
          <ResetForm />
        </Suspense>
      </main>
    </>
  )
}
