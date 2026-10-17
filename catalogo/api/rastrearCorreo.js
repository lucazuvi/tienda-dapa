// ============================================================================
// API SERVERLESS: RASTREO DE ENVÍOS CORREO ARGENTINO (PAQ.AR / MICORREO)
//Ubicación: /api/rastrearCorreo.js
// ============================================================================

const ALLOWED_ORIGINS = [
  'https://daparepuestos.com.ar',
  'https://www.daparepuestos.com.ar',
  'http://localhost:5173',
  'http://localhost:3000'
];

function getSafeOrigin(req) {
  const origin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

function extractTrackingMetaFromNotes(notesStr) {
  const raw = String(notesStr || '');
  const trackingMatch = raw.match(/\[TRACKING_CA:([A-Z0-9-]+)\]/i) || raw.match(/\b([A-Z]{2}\d{9}AR)\b/i);
  const dispatchedMatch = raw.match(/\[DESPACHO_FECHA:([^\]]+)\]/i);
  return {
    trackingCode: trackingMatch ? trackingMatch[1].toUpperCase() : '',
    dispatchedAt: dispatchedMatch ? dispatchedMatch[1] : ''
  };
}

export default async function handler(req, res) {
  const safeOrigin = getSafeOrigin(req);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', safeOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const params = req.method === 'GET' ? req.query : (req.body || {});
    const rawTracking = String(params.trackingNumber || params.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const cleanOrderId = String(params.orderId || '').replace(/\D/g, '');

    if (!rawTracking && !cleanOrderId) {
      return res.status(400).json({ error: 'Ingresá un código de seguimiento o número de pedido.' });
    }

    // 1. Consultar estado interno del pedido en Supabase (si tenemos credenciales y orderId)
    let orderData = null;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && cleanOrderId) {
      try {
        const orderRes = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${cleanOrderId}&select=id,created_at,status,notes,customer_name`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`
            }
          }
        );
        if (orderRes.ok) {
          const rows = await orderRes.json();
          orderData = rows?.[0] || null;
        }
      } catch {
        // Continuar si falla la consulta auxiliar
      }
    }

    const metaFromOrder = extractTrackingMetaFromNotes(orderData?.notes);
    const trackingCode = rawTracking || metaFromOrder.trackingCode;

    // 2. Intentar consulta en API Oficial de Correo Argentino (Paq.ar v1 / MiCorreo) si hay credenciales configuradas
    const correoApiKey = process.env.CORREO_API_KEY;
    const correoAgreement = process.env.CORREO_AGREEMENT;
    const miCorreoUser = process.env.MICORREO_USER;
    const miCorreoPass = process.env.MICORREO_PASSWORD;

    let officialEvents = null;

    if (trackingCode && correoApiKey) {
      try {
        const paqarRes = await fetch(
          `https://api.correoargentino.com.ar/paqar/v1/tracking?trackingNumber=${encodeURIComponent(trackingCode)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Apikey ${correoApiKey}`,
              ...(correoAgreement ? { agreement: correoAgreement } : {}),
              'Content-Type': 'application/json'
            }
          }
        );
        if (paqarRes.ok) {
          const paqarData = await paqarRes.json();
          const rawEvents = Array.isArray(paqarData) ? paqarData[0]?.event || paqarData : (paqarData.events || paqarData.event || []);
          if (Array.isArray(rawEvents) && rawEvents.length > 0) {
            officialEvents = rawEvents.map((ev) => ({
              date: ev.date || ev.fecha || '',
              status: ev.status || ev.estado || ev.description || 'Movimiento registrado',
              location: ev.facility || ev.planta || ev.sucursal || 'Correo Argentino',
              description: ev.description || ev.detalle || ev.status || ''
            }));
          }
        }
      } catch {
        // Fallback a MiCorreo o seguimiento híbrido
      }
    }

    if (!officialEvents && trackingCode && miCorreoUser && miCorreoPass) {
      try {
        const basicAuth = Buffer.from(`${miCorreoUser}:${miCorreoPass}`).toString('base64');
        const tokenRes = await fetch('https://api.correoargentino.com.ar/micorreo/v1/token', {
          method: 'POST',
          headers: { Authorization: `Basic ${basicAuth}` }
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.token) {
            const trackRes = await fetch(
              `https://api.correoargentino.com.ar/micorreo/v1/shipping/tracking?shippingId=${encodeURIComponent(trackingCode)}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${tokenData.token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (trackRes.ok) {
              const trackJson = await trackRes.json();
              const rawList = Array.isArray(trackJson?.events) ? trackJson.events : (Array.isArray(trackJson) ? trackJson : []);
              if (rawList.length > 0) {
                officialEvents = rawList.map((ev) => ({
                  date: ev.eventDate || ev.date || '',
                  status: ev.eventDescription || ev.status || 'Actualización Correo Argentino',
                  location: ev.branchName || ev.location || 'Red Correo Argentino',
                  description: ev.eventDescription || ev.status || ''
                }));
              }
            }
          }
        }
      } catch {
        // Fallback a estado sincronizado del pedido
      }
    }

    // 3. Construir línea de tiempo de seguimiento combinada (Estado en D.A.P.A. + Correo Argentino)
    const statusLower = String(orderData?.status || '').toLowerCase();
    let currentStage = 'preparacion';
    if (statusLower.includes('encargue')) {
      currentStage = 'encargue';
    } else if (trackingCode || statusLower.includes('despachado') || statusLower.includes('facturado')) {
      currentStage = trackingCode ? 'en_camino' : 'preparacion';
    }

    const timelineEvents = officialEvents && officialEvents.length > 0
      ? officialEvents
      : [
          ...(trackingCode
            ? [
                {
                  date: metaFromOrder.dispatchedAt || new Date().toLocaleDateString('es-AR'),
                  status: 'Pieza ingresada / Etiqueta generada para Correo Argentino',
                  location: 'Sucursal Arrecifes (CP 2740) - Bs. As.',
                  description: `Código de seguimiento asignado: ${trackingCode}. Disponible para consulta en red nacional Correo Argentino.`
                }
              ]
            : []),
          ...(orderData
            ? [
                {
                  date: new Date(orderData.created_at).toLocaleString('es-AR'),
                  status: `Estado actual del pedido: ${orderData.status}`,
                  location: 'D.A.P.A. Repuestos Molle (Arrecifes)',
                  description: statusLower.includes('encargue')
                    ? 'Tus repuestos están siendo gestionados por encargue con distribuidora oficial.'
                    : 'Pedido registrado y verificado por nuestro equipo de repuestos.'
                }
              ]
            : [])
        ];

    return res.status(200).json({
      success: true,
      trackingNumber: trackingCode || null,
      orderId: orderData?.id || cleanOrderId || null,
      orderStatus: orderData?.status || null,
      carrier: 'Correo Argentino',
      currentStage,
      isLiveOfficialApi: Boolean(officialEvents && officialEvents.length > 0),
      officialTrackingUrl: 'https://www.correoargentino.com.ar/formularios/e-commerce',
      events: timelineEvents
    });
  } catch (error) {
    console.error('Error en /api/rastrearCorreo:', error);
    return res.status(500).json({ error: 'No se pudo consultar el seguimiento en este momento.' });
  }
}
