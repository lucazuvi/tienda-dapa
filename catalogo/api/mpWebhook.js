// catalogo/api/mpWebhook.js
import crypto from 'node:crypto';

function verifyMercadoPagoSignature(req, paymentId, webhookSecret) {
  if (!webhookSecret) return true;
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  if (!xSignature || !xRequestId) return false;

  const parts = String(xSignature).split(',');
  let ts = '';
  let hash = '';
  for (const part of parts) {
    const [k, v] = part.split('=').map(s => s.trim());
    if (k === 'ts') ts = v;
    if (k === 'v1') hash = v;
  }
  if (!ts || !hash) return false;

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Mercado Pago puede enviar el ID por query params o en el body (según sea IPN o Webhook v2)
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.topic;
    const rawPaymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    const paymentId = String(rawPaymentId || '').trim();

    // Si no es una notificación de pago o el ID no es estrictamente numérico, respondemos 200 OK
    if (topic !== 'payment' || !/^\d+$/.test(paymentId)) {
      return res.status(200).json({ received: true });
    }

    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret && !verifyMercadoPagoSignature(req, paymentId, webhookSecret)) {
      return res.status(401).json({ error: 'Firma de webhook inválida' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // IMPORTANTE: Usar SUPABASE_SERVICE_ROLE_KEY en Vercel para saltar RLS de forma segura desde el backend
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      console.error('Faltan variables de entorno en mpWebhook');
      return res.status(500).json({ error: 'Configuración incompleta' });
    }

    // 1. Consultar el estado real del pago directamente en los servidores de Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!mpResponse.ok) {
      return res.status(200).json({ received: true, warning: 'Pago aún no disponible' });
    }

    const paymentData = await mpResponse.json();
    const orderId = String(paymentData.external_reference || '').trim();
    const mpStatus = paymentData.status; // approved, pending, in_process, rejected, cancelled, refunded, charged_back

    if (!orderId || !/^\d+$/.test(orderId)) {
      return res.status(200).json({ received: true, warning: 'Sin external_reference válido' });
    }

    // 2. Determinar el nuevo estado según la respuesta oficial de Mercado Pago
    let nuevoEstado = null;
    if (mpStatus === 'approved') {
      nuevoEstado = 'Pendiente (Pagado MP)';
    } else if (mpStatus === 'refunded' || mpStatus === 'charged_back') {
      nuevoEstado = 'Reintegrado';
    } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
      nuevoEstado = 'Cancelado';
    }

    if (nuevoEstado) {
      // Buscar el pedido actual para conservar sus notas y verificar el monto
      const getOrderRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,notes,total_estimated`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );

      if (getOrderRes.ok) {
        const orders = await getOrderRes.json();
        const currentOrder = orders?.[0];

        if (currentOrder && (currentOrder.status !== 'Facturado' || nuevoEstado === 'Reintegrado')) {
          const paidAmount = Number(paymentData.transaction_amount || 0);
          const expectedAmount = Number(currentOrder.total_estimated || 0);
          const amountMismatch = mpStatus === 'approved' && expectedAmount > 0 && Math.abs(paidAmount - expectedAmount) > 5;

          const selloPago = `\n---------------------------------\n${
            nuevoEstado === 'Reintegrado' ? '💸 PAGO REINTEGRADO EN MP' : '✅ PAGO MERCADO PAGO'
          }: ${mpStatus.toUpperCase()}\nID Operación MP: #${paymentId}\nMonto abonado: $${paidAmount.toLocaleString('es-AR')}${
            amountMismatch ? `\n⚠️ ATENCIÓN: El monto abonado ($${paidAmount.toLocaleString('es-AR')}) difiere del total estimado ($${expectedAmount.toLocaleString('es-AR')}).` : ''
          }`;

          const notasActualizadas = (currentOrder.notes || '').includes(`#${paymentId}`) && nuevoEstado !== 'Reintegrado'
            ? currentOrder.notes
            : `${currentOrder.notes || ''}${selloPago}`;

          await fetch(
            `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
              },
              body: JSON.stringify({
                status: amountMismatch ? 'Revisado' : nuevoEstado,
                notes: notasActualizadas
              })
            }
          );
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en mpWebhook:', error);
    return res.status(500).json({ error: 'Error procesando webhook' });
  }
}