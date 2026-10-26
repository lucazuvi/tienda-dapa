// catalogo/api/refundPayment.js
const DEFAULT_ORIGIN = 'https://tienda-dapa-6hoc.vercel.app';
const ALLOWED_ORIGINS = [
  'https://daparepuestos.com.ar',
  'https://www.daparepuestos.com.ar',
  'https://tienda-dapa-6hoc.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173'
];
const ADMIN_EMAILS = ['admin@dapa.com'];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const safeOrigin = (origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/tienda-dapa[a-z0-9-]*\.vercel\.app$/i.test(origin)))
    ? origin
    : DEFAULT_ORIGIN;

  res.setHeader('Access-Control-Allow-Origin', safeOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Faltan credenciales de Mercado Pago o Supabase en el servidor' });
    }

    // 1. Verificar que quien solicita el reintegro sea el administrador autenticado en Supabase
    const authHeader = req.headers.authorization || '';
    const userJwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!userJwt) {
      return res.status(401).json({ error: 'No autorizado: falta token de sesión de administrador' });
    }

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${userJwt}`
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Sesión de administrador inválida o expirada' });
    }

    const userData = await userRes.json();
    const userEmail = String(userData?.email || '').toLowerCase();
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return res.status(403).json({ error: 'No tenés permisos de administrador para realizar reintegros' });
    }

    // 2. Validar datos del pedido y buscar el ID de operación de Mercado Pago
    const { orderId, paymentId: rawPaymentId, amount, reason = 'Demora en encargue / Solicitud del comprador' } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: 'Falta el número de pedido (orderId)' });
    }

    let targetPaymentId = String(rawPaymentId || '').replace(/\D/g, '');

    // Si no nos pasaron el paymentId explícito, lo buscamos en Mercado Pago por external_reference
    if (!targetPaymentId) {
      const searchRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(String(orderId))}&sort=date_created&criteria=desc`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const approvedPayment = (searchData.results || []).find(p => p.status === 'approved');
        if (approvedPayment?.id) {
          targetPaymentId = String(approvedPayment.id);
        }
      }
    }

    if (!targetPaymentId || !/^\d+$/.test(targetPaymentId)) {
      return res.status(404).json({
        error: 'No se encontró un pago aprobado en Mercado Pago para este pedido. Si fue por transferencia o efectivo, podés registrarlo como Reintegro Manual.'
      });
    }

    // 3. Ejecutar el reintegro oficial en Mercado Pago (devuelve a la tarjeta o cuenta del comprador)
    const refundPayload = {};
    const numericAmount = Number(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      refundPayload.amount = numericAmount;
    }

    const refundRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(targetPaymentId)}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `dapa-refund-${orderId}-${targetPaymentId}-${numericAmount || 'full'}`
        },
        body: JSON.stringify(refundPayload)
      }
    );

    const refundData = await refundRes.json();
    if (!refundRes.ok) {
      return res.status(refundRes.status).json({
        error: refundData?.message || 'Mercado Pago rechazó el reintegro',
        details: refundData
      });
    }

    const refundedAmount = Number(refundData.amount || numericAmount || 0);

    // 4. Actualizar las notas y el estado del pedido en Supabase
    const getOrderRes = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,notes`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${userJwt}`
        }
      }
    );

    let updatedNotes = '';
    if (getOrderRes.ok) {
      const orders = await getOrderRes.json();
      const currentOrder = orders?.[0];
      const selloReintegro = `\n---------------------------------\n💸 REINTEGRO MERCADO PAGO EJECUTADO\nID Operación MP: #${targetPaymentId}\nID Reembolso MP: #${refundData.id || 'OK'}\nMonto devuelto: $${refundedAmount.toLocaleString('es-AR')}\nMotivo: ${reason}\nFecha: ${new Date().toLocaleString('es-AR')}`;
      updatedNotes = `${currentOrder?.notes || ''}${selloReintegro}`;

      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${userJwt}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          status: 'Reintegrado',
          notes: updatedNotes
        })
      });
    }

    return res.status(200).json({
      success: true,
      paymentId: targetPaymentId,
      refundId: refundData.id,
      amountRefunded: refundedAmount,
      updatedNotes
    });
  } catch (error) {
    console.error('Error en refundPayment:', error);
    return res.status(500).json({ error: 'Error interno al procesar el reintegro' });
  }
}
