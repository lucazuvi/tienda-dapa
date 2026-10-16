// catalogo/api/mpWebhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Mercado Pago puede enviar el ID por query params o en el body (según sea IPN o Webhook v2)
    const topic = req.query.topic || req.query.type || req.body?.type || req.body?.topic;
    const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;

    // Si no es una notificación de pago, respondemos 200 OK para que MP no reintente en bucle
    if (topic !== 'payment' || !paymentId) {
      return res.status(200).json({ received: true });
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
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!mpResponse.ok) {
      return res.status(200).json({ received: true, warning: 'Pago aún no disponible' });
    }

    const paymentData = await mpResponse.json();
    const orderId = paymentData.external_reference;
    const mpStatus = paymentData.status; // approved, pending, in_process, rejected, cancelled

    if (!orderId) {
      return res.status(200).json({ received: true, warning: 'Sin external_reference' });
    }

    // 2. Determinar el nuevo estado según la respuesta oficial de Mercado Pago
    let nuevoEstado = null;
    if (mpStatus === 'approved') {
      nuevoEstado = 'Pendiente (Pagado MP)';
    } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
      nuevoEstado = 'Cancelado';
    }

    if (nuevoEstado) {
      // Buscar el pedido actual para conservar sus notas y agregar el N° de operación de MP
      const getOrderRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,notes`,
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

        // No pisar el estado si el administrador ya lo había marcado como 'Facturado'
        if (currentOrder && currentOrder.status !== 'Facturado') {
          const selloPago = `\n---------------------------------\n✅ PAGO MERCADO PAGO: ${mpStatus.toUpperCase()}\nID Operación MP: #${paymentId}\nMonto abonado: $${Number(paymentData.transaction_amount || 0).toLocaleString('es-AR')}`;
          const notasActualizadas = (currentOrder.notes || '').includes(`#${paymentId}`)
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
                status: nuevoEstado,
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