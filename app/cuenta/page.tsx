'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Order, Ticket } from '@/types'
import Header from '@/components/Header'
import {
  Ticket as TicketIcon, Lock, LogOut, Calendar, MapPin,
  QrCode, CheckCircle, XCircle, Clock, User, Eye, EyeOff, Mail, ArrowLeft
} from 'lucide-react'

type View = 'login' | 'register' | 'forgot' | 'forgot_sent' | 'account'

export default function CuentaPage() {
  const [view, setView] = useState<View>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [customerName, setCustomerName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // Registro
  const [regNombre, setRegNombre] = useState('')
  const [regApellidos, setRegApellidos] = useState('')
  const [regTelefono, setRegTelefono] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regFechaNac, setRegFechaNac] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPass2, setRegPass2] = useState('')

  // Recuperar contraseña
  const [forgotEmail, setForgotEmail] = useState('')

  const supabase = createSupabaseBrowser()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadOrders(data.session.user.email!)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadOrders(session.user.email!)
      else { setView('login'); setOrders([]) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogin() {
    if (!loginEmail || !loginPass) { setError('Rellena todos los campos'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass })
    setLoading(false)
    if (error) setError('Email o contraseña incorrectos')
  }

  async function handleRegister() {
    if (!regNombre || !regApellidos || !regEmail || !regPass || !regPass2 || !regTelefono || !regFechaNac) {
      setError('Rellena todos los campos'); return
    }
    if (regPass !== regPass2) { setError('Las contraseñas no coinciden'); return }
    if (regPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: {
        data: { nombre: regNombre, apellidos: regApellidos, telefono: regTelefono, fecha_nacimiento: regFechaNac }
      }
    })

    if (authError) {
      setLoading(false)
      setError(authError.message.includes('already registered') ? 'Este email ya está registrado' : 'Error al registrar. Inténtalo de nuevo.')
      return
    }

    if (authData.user) {
      await supabase.from('customers').upsert({
        id: authData.user.id,
        email: regEmail,
        nombre: `${regNombre} ${regApellidos}`,
        telefono: regTelefono,
      })
    }
    setLoading(false)
  }

  async function handleForgot() {
    if (!forgotEmail.trim()) { setError('Introduce tu email'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/cuenta/reset`
    })
    setLoading(false)
    if (error) { setError('Error al enviar el email. Inténtalo de nuevo.'); return }
    setView('forgot_sent')
  }

  async function loadOrders(userEmail: string) {
    setView('account')
    const { data } = await supabase
      .from('orders')
      .select(`*, event:events(*), tickets(*, ticket_type:ticket_types(*))`)
      .eq('customer_email', userEmail)
      .eq('estado', 'completado')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    const { data: customer } = await supabase.from('customers').select('nombre').eq('email', userEmail).single()
    if (customer) setCustomerName(customer.nombre)
  }

  async function logout() {
    await supabase.auth.signOut()
    setView('login'); setOrders([]); setLoginEmail(''); setLoginPass('')
  }

  const ticketStatusIcon = (estado: string) => {
    if (estado === 'valido') return <CheckCircle className="w-4 h-4 text-green-400" />
    if (estado === 'usado') return <CheckCircle className="w-4 h-4 text-brand-gray" />
    return <XCircle className="w-4 h-4 text-red-400" />
  }

  const ticketStatusLabel: Record<string, string> = {
    valido: 'Válido', usado: 'Usado', anulado: 'Anulado', transferido: 'Transferido'
  }

  const inputCls = "w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-brand-white placeholder-brand-gray text-sm outline-none focus:border-brand-gold transition-colors mb-3"
  const labelCls = "block text-xs text-brand-gray uppercase tracking-wider mb-1.5"

  const ErrorBox = () => error ? (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
  ) : null

  const BackToLogin = ({ label = 'Volver al inicio de sesión' }: { label?: string }) => (
    <button onClick={() => { setView('login'); setError('') }}
      className="flex items-center gap-1.5 text-brand-gray hover:text-brand-white text-sm transition-colors mt-4 mx-auto">
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  )

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <div className="card max-w-md mx-auto mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
                  <TicketIcon className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <h1 className="font-display font-black text-xl text-brand-white">Iniciar sesión</h1>
                  <p className="text-brand-gray text-sm">Accede a tus entradas</p>
                </div>
              </div>
              <ErrorBox />
              <label className={labelCls}>Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="tu@email.com" className={inputCls} />
              <label className={labelCls}>Contraseña</label>
              <div className="relative mb-2">
                <input type={showPass ? 'text' : 'password'} value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 pr-12 text-brand-white placeholder-brand-gray text-sm outline-none focus:border-brand-gold transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-right mb-4">
                <button onClick={() => { setView('forgot'); setError(''); setForgotEmail(loginEmail) }}
                  className="text-brand-gray text-xs hover:text-brand-gold transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 mb-4">
                <Lock className="w-4 h-4" />
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <p className="text-center text-brand-gray text-sm">
                ¿No tienes cuenta?{' '}
                <button onClick={() => { setView('register'); setError('') }} className="text-brand-gold hover:underline">
                  Regístrate
                </button>
              </p>
            </div>
          )}

          {/* ── RECUPERAR CONTRASEÑA ── */}
          {view === 'forgot' && (
            <div className="card max-w-md mx-auto mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <h1 className="font-display font-black text-xl text-brand-white">Recuperar contraseña</h1>
                  <p className="text-brand-gray text-sm">Te enviaremos un enlace por email</p>
                </div>
              </div>
              <ErrorBox />
              <label className={labelCls}>Tu email</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleForgot()}
                placeholder="tu@email.com" className={inputCls} />
              <button onClick={handleForgot} disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 mb-2">
                <Mail className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
              <div className="flex justify-center">
                <BackToLogin />
              </div>
            </div>
          )}

          {/* ── EMAIL ENVIADO ── */}
          {view === 'forgot_sent' && (
            <div className="card max-w-md mx-auto mt-8 text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-brand-gold" />
              </div>
              <h2 className="font-display font-black text-xl text-brand-white mb-2">Revisa tu email</h2>
              <p className="text-brand-gray text-sm mb-1">Hemos enviado un enlace a</p>
              <p className="text-brand-white font-medium mb-4">{forgotEmail}</p>
              <p className="text-brand-gray text-xs">Haz clic en el enlace para crear una nueva contraseña. Caduca en 1 hora.</p>
              <div className="flex justify-center">
                <BackToLogin />
              </div>
            </div>
          )}

          {/* ── REGISTRO ── */}
          {view === 'register' && (
            <div className="card max-w-md mx-auto mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <h1 className="font-display font-black text-xl text-brand-white">Crear cuenta</h1>
                  <p className="text-brand-gray text-sm">Rellena tus datos</p>
                </div>
              </div>
              <ErrorBox />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input type="text" value={regNombre} onChange={e => setRegNombre(e.target.value)}
                    placeholder="María" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellidos</label>
                  <input type="text" value={regApellidos} onChange={e => setRegApellidos(e.target.value)}
                    placeholder="García López" className={inputCls} />
                </div>
              </div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" value={regTelefono} onChange={e => setRegTelefono(e.target.value)}
                placeholder="+34 600 000 000" className={inputCls} />
              <label className={labelCls}>Email</label>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                placeholder="tu@email.com" className={inputCls} />
              <label className={labelCls}>Fecha de nacimiento</label>
              <input type="date" value={regFechaNac} onChange={e => setRegFechaNac(e.target.value)}
                className={inputCls} />
              <label className={labelCls}>Contraseña</label>
              <div className="relative mb-3">
                <input type={showPass ? 'text' : 'password'} value={regPass}
                  onChange={e => setRegPass(e.target.value)} placeholder="Mínimo 6 caracteres"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 pr-12 text-brand-white placeholder-brand-gray text-sm outline-none focus:border-brand-gold transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <label className={labelCls}>Confirmar contraseña</label>
              <div className="relative mb-4">
                <input type={showPass2 ? 'text' : 'password'} value={regPass2}
                  onChange={e => setRegPass2(e.target.value)} placeholder="Repite la contraseña"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 pr-12 text-brand-white placeholder-brand-gray text-sm outline-none focus:border-brand-gold transition-colors" />
                <button type="button" onClick={() => setShowPass2(!showPass2)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-white">
                  {showPass2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={handleRegister} disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 mb-4">
                <User className="w-4 h-4" />
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
              <p className="text-center text-brand-gray text-sm">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => { setView('login'); setError('') }} className="text-brand-gold hover:underline">
                  Inicia sesión
                </button>
              </p>
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {view === 'account' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-display font-black text-2xl text-brand-white">
                    {customerName ? `Hola, ${customerName.split(' ')[0]} 👋` : 'Mis entradas'}
                  </h1>
                  <p className="text-brand-gray text-sm mt-1">
                    {orders.length} pedido{orders.length !== 1 ? 's' : ''} completado{orders.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={logout} className="flex items-center gap-2 text-brand-gray hover:text-brand-white transition-colors text-sm">
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="card text-center py-16">
                  <TicketIcon className="w-12 h-12 text-brand-gray mx-auto mb-4" />
                  <p className="text-brand-gray">No tienes entradas todavía.</p>
                  <a href="/" className="mt-4 inline-block text-brand-gold text-sm hover:underline">Ver eventos disponibles →</a>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {orders.map(order => (
                    <div key={order.id} className="card">
                      <div className="flex items-start justify-between mb-4 pb-4 border-b border-brand-border">
                        <div>
                          <h2 className="font-display font-bold text-lg text-brand-white">{order.event?.nombre ?? 'Evento'}</h2>
                          <div className="flex flex-col gap-1 mt-2">
                            {order.event?.fecha_inicio && (
                              <div className="flex items-center gap-2 text-brand-gray text-sm">
                                <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                                {new Date(order.event.fecha_inicio).toLocaleDateString('es-ES', {
                                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                            )}
                            {order.event?.venue_nombre && (
                              <div className="flex items-center gap-2 text-brand-gray text-sm">
                                <MapPin className="w-3.5 h-3.5 text-brand-gold" />
                                {order.event.venue_nombre}{order.event.venue_ciudad ? `, ${order.event.venue_ciudad}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-brand-gold font-display font-bold text-lg">{order.total.toFixed(2)}€</div>
                          <div className="text-brand-gray text-xs mt-1">{order.order_number}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        {(order.tickets ?? []).map((ticket: Ticket) => (
                          <div key={ticket.id} className="bg-brand-dark rounded-xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-card rounded-lg flex items-center justify-center shrink-0">
                                <QrCode className="w-4 h-4 text-brand-gold" />
                              </div>
                              <div>
                                <div className="text-brand-white text-sm font-medium">{ticket.ticket_type?.nombre ?? 'Entrada'}</div>
                                <div className="text-brand-gray text-xs mt-0.5">
                                  #{ticket.numero_entrada}{ticket.holder_nombre ? ` · ${ticket.holder_nombre}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {ticketStatusIcon(ticket.estado)}
                              <span className={`text-xs font-medium ${ticket.estado === 'valido' ? 'text-green-400' : 'text-brand-gray'}`}>
                                {ticketStatusLabel[ticket.estado] ?? ticket.estado}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-brand-border">
                        <Clock className="w-3.5 h-3.5 text-brand-gray" />
                        <span className="text-brand-gray text-xs">
                          Pedido el {new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </>
  )
}
