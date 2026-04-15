'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import Header from '@/components/Header'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  useEffect(() => {
    // Supabase gestiona el token del enlace automáticamente vía onAuthStateChange
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password || !password2) { setError('Rellena ambos campos'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Error al actualizar la contraseña. El enlace puede haber caducado.'); return }
    setDone(true)
    setTimeout(() => router.push('/cuenta'), 3000)
  }

  const inputCls = "w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 pr-12 text-brand-white placeholder-brand-gray text-sm outline-none focus:border-brand-gold transition-colors"
  const labelCls = "block text-xs text-brand-gray uppercase tracking-wider mb-1.5"

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto mt-8">

          {done ? (
            <div className="card text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="font-display font-black text-xl text-brand-white mb-2">¡Contraseña actualizada!</h2>
              <p className="text-brand-gray text-sm">Redirigiendo a tu cuenta...</p>
            </div>
          ) : !ready ? (
            <div className="card text-center py-12">
              <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-brand-gray text-sm">Verificando enlace...</p>
            </div>
          ) : (
            <div className="card">
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

              <label className={labelCls}>Nueva contraseña</label>
              <div className="relative mb-3">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" className={inputCls} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <label className={labelCls}>Confirmar contraseña</label>
              <div className="relative mb-5">
                <input type={showPass2 ? 'text' : 'password'} value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  placeholder="Repite la contraseña" className={inputCls} />
                <button type="button" onClick={() => setShowPass2(!showPass2)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-white">
                  {showPass2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button onClick={handleReset} disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                <Lock className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
