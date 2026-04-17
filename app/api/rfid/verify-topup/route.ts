import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getSumUpCheckout } from '@/lib/sumup'

export async function GET(req: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  const ref = req.nextUrl.searchParams.get('ref')
  const wristbandId = req.nextUrl.searchParams.get('wristband')
  const amountStr = req.nextUrl.searchParams.get('amount')
  const sumupId = req.nextUrl.searchParams.get('sumup_id')

  if (!wristbandId || !amountStr) {
    return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400, headers })
  }

  const amount = parseFloat(amountStr)
  const supabase = createSupabaseAdmin()

  // Buscar la transacción pendiente
  const { data: pendingTx } = await supabase
    .from('rfid_transactions')
    .select('*')
    .eq('wristband_id', wristbandId)
    .eq('type', 'topup')
    .eq('amount', amount)
    .eq('payment_method', 'sumup')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!pendingTx) {
    return NextResponse.json({ status: 'not_found', error: 'Transacción no encontrada' }, { status: 404, headers })
  }

  // Si ya fue procesada (descripción no contiene "pendiente"), retornar éxito
  if (!pendingTx.description?.includes('pendiente')) {
    return NextResponse.json({ status: 'already_completed', balance: pendingTx.balance_after }, { headers })
  }

  // Verificar con SumUp
  const checkoutId = sumupId || pendingTx.sumup_reference
  if (!checkoutId) {
    return NextResponse.json({ status: 'pending', message: 'Sin ID de checkout' }, { headers })
  }

  let checkout: any
  try {
    checkout = await getSumUpCheckout(checkoutId)
  } catch {
    return NextResponse.json({ status: 'pending', message: 'No se pudo verificar con SumUp' }, { headers })
  }

  if (checkout.status !== 'PAID') {
    return NextResponse.json({ status: 'pending', sumup_status: checkout.status }, { headers })
  }

  // ¡Pago confirmado! Actualizar saldo
  const { data: wristband } = await supabase
    .from('rfid_wristbands')
    .select('*')
    .eq('id', wristbandId)
    .single()

  if (!wristband) {
    return NextResponse.json({ status: 'error', error: 'Pulsera no encontrada' }, { status: 404, headers })
  }

  const newBalance = parseFloat(wristband.balance) + amount

  // Actualizar pulsera
  await supabase
    .from('rfid_wristbands')
    .update({
      balance: newBalance,
      total_loaded: parseFloat(wristband.total_loaded || 0) + amount,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', wristbandId)

  // Marcar transacción como completada
  await supabase
    .from('rfid_transactions')
    .update({
      description: `Recarga SumUp completada`,
      balance_after: newBalance,
    })
    .eq('id', pendingTx.id)

  return NextResponse.json({
    status: 'completed',
    balance: newBalance,
    amount: amount,
    holder_name: wristband.holder_name,
  }, { headers })
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
