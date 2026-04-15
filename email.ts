import nodemailer from 'nodemailer'
import { Order, Ticket, Event } from '@/types'
import { qrToDataURL, formatPrice } from './tickets'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendTicketEmail(
  order: Order,
  event: Event,
  tickets: Ticket[]
): Promise<void> {
  const fechaEvento = format(new Date(event.fecha_inicio), "EEEE d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })

  // Generate QR data URLs for all tickets
  const ticketsWithQR = await Promise.all(
    tickets.map(async (t) => ({
      ...t,
      qrDataUrl: await qrToDataURL(t.qr_code),
    }))
  )

  const ticketRows = ticketsWithQR
    .map(
      (t) => `
      <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:24px;margin-bottom:16px;display:flex;gap:24px;align-items:center;">
        <img src="${t.qrDataUrl}" width="120" height="120" style="border-radius:8px;flex-shrink:0;" />
        <div>
          <p style="color:#888;font-size:12px;margin:0 0 4px;">ENTRADA</p>
          <p style="color:#F5F0E8;font-size:18px;font-weight:700;margin:0 0 8px;">${t.ticket_type?.nombre ?? 'Entrada'}</p>
          <p style="color:#C9A84C;font-size:12px;font-family:monospace;margin:0 0 4px;">${t.qr_code}</p>
          <p style="color:#888;font-size:12px;margin:0;">${t.numero_entrada}</p>
        </div>
      </div>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C97A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;font-weight:900;letter-spacing:0.1em;">
        ${process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'TAQUILLA'}
      </div>
    </div>

    <!-- Hero -->
    <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;">
      <p style="color:#C9A84C;font-size:12px;letter-spacing:0.2em;margin:0 0 12px;">✓ COMPRA CONFIRMADA</p>
      <h1 style="color:#F5F0E8;font-size:28px;font-weight:900;margin:0 0 8px;">${event.nombre}</h1>
      <p style="color:#888;font-size:16px;margin:0 0 16px;">${fechaEvento}</p>
      <p style="color:#F5F0E8;font-size:14px;margin:0;">📍 ${event.venue_nombre} — ${event.venue_ciudad}</p>
    </div>

    <!-- Tickets -->
    <h2 style="color:#F5F0E8;font-size:16px;letter-spacing:0.1em;margin:0 0 16px;">TUS ENTRADAS</h2>
    ${ticketRows}

    <!-- Order summary -->
    <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:24px;margin-top:24px;">
      <p style="color:#888;font-size:12px;letter-spacing:0.1em;margin:0 0 16px;">RESUMEN DEL PEDIDO</p>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#888;font-size:14px;">Nº de pedido</span>
        <span style="color:#F5F0E8;font-size:14px;font-family:monospace;">${order.order_number}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#888;font-size:14px;">Entradas</span>
        <span style="color:#F5F0E8;font-size:14px;">${tickets.length}x</span>
      </div>
      <div style="border-top:1px solid #2A2A2A;margin:16px 0;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#F5F0E8;font-size:16px;font-weight:700;">Total</span>
        <span style="color:#C9A84C;font-size:16px;font-weight:700;">${formatPrice(order.total)}</span>
      </div>
    </div>

    <!-- NFC note -->
    <div style="background:#0F1A0F;border:1px solid #1A3A1A;border-radius:12px;padding:20px;margin-top:16px;">
      <p style="color:#4CAF50;font-size:12px;letter-spacing:0.1em;margin:0 0 8px;">📳 PULSERA RFID</p>
      <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
        Si tienes Android, puedes cargar tu entrada en tu pulsera directamente desde la app. 
        Si usas iPhone, en la entrada habrá un punto de carga con tablet donde podrás escanear tu QR y cargar la pulsera.
      </p>
    </div>

    <!-- Footer -->
    <p style="color:#444;font-size:12px;text-align:center;margin-top:40px;line-height:1.6;">
      Guarda este email — contiene tus entradas.<br>
      Para cualquier consulta, contacta con nosotros.
    </p>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.customer_email,
    subject: `✅ Tus entradas para ${event.nombre} — ${order.order_number}`,
    html,
  })
}
