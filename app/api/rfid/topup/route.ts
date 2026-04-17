import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { createSumUpCheckout } from '@/lib/sumup'

export async function POST(req: NextRequest) {
  try {
    // Permitir llamadas desde inout-valid
    const origin = req.headers.get('origin') || ''
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    const body = await req.json()
    const { wristband_id, uid, amount, event_id, operator } = body

    if (!wristband_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400, headers })
    }

    const supabase = createSupabaseAdmin()

    // Verificar que la pulsera existe y está activa
    const { data: wristband, error: wbError } = await supabase
      .from('rfid_wristbands')
      .select('*')
      .eq('id', wristband_id)
      .single()

    if (wbError || !wristband) {
      return NextResponse.json({ error: 'Pulsera no encontrada' }, { status: 404, headers })
    }

    if (wristband.status !== 'active') {
      return NextResponse.json({ error: 'Pulsera bloqueada' }, { status: 403, headers })
    }

    // Crear referencia única para esta recarga
    const reference = `RFID-TOPUP-${wristband_id}-${Date.now()}`

    // Crear checkout en SumUp
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://inout-check.vercel.app'
    const validUrl = 'https://inout-valid.vercel.app'

    const sumupCheckout: any = await createSumUpCheckout({
      amount: amount,
      description: `Recarga pulsera RFID — ${wristband.holder_name || uid || 'Sin nombre'} — ${amount}€`,
      reference: reference,
      return_url: `${validUrl}/#topup-complete&ref=${reference}&wristband=${wristband_id}&amount=${amount}`,
      customer_email: wristband.holder_email || undefined,
    })

    // Guardar la referencia en una transacción pendiente
    await supabase.from('rfid_transactions').insert({
      wristband_id: wristband_id,
      event_id: event_id || null,
      type: 'topup',
      amount: amount,
      balance_after: parseFloat(wristband.balance) + amount, // será el saldo si se confirma
      description: `Recarga SumUp (pendiente)`,
      point_of_sale: 'Kiosco',
      operator: operator || 'Sistema',
      payment_method: 'sumup',
      sumup_reference: sumupCheckout.id,
    })

    const merchantCode = process.env.SUMUP_MERCHANT_CODE ?? 'MC4GZ9C4'
    const checkoutUrl = sumupCheckout.hosted_checkout_url
      ?? `https://pay.sumup.com/b2c/${merchantCode}?checkout-id=${sumupCheckout.id}`

    return NextResponse.json({
      checkout_url: checkoutUrl,
      sumup_checkout_id: sumupCheckout.id,
      reference: reference,
    }, { headers })

  } catch (err: any) {
    console.error('rfid/topup error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Error interno' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}

// Manejar preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
