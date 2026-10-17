// catalogo/api/createPreference.js
const DEFAULT_ORIGIN = 'https://tienda-dapa-6hoc.vercel.app';
const ALLOWED_ORIGINS = [
  'https://tienda-dapa-6hoc.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173'
];

function getSafeOrigin(reqOrigin) {
  if (!reqOrigin) return DEFAULT_ORIGIN;
  if (ALLOWED_ORIGINS.includes(reqOrigin) || /^https:\/\/tienda-dapa[a-z0-9-]*\.vercel\.app$/i.test(reqOrigin)) {
    return reqOrigin;
  }
  return DEFAULT_ORIGIN;
}

function estimateFallbackShipping(cpDestino, totalItems, metodoEnvio) {
  if (metodoEnvio === 'retiro' || metodoEnvio === 'acordar') return 0;
  const cleanCp = String(cpDestino || '2740').replace(/\D/g, '');
  const cpNum = parseInt(cleanCp, 10) || 2740;
  const recargoPeso = Math.max(0, (Math.max(1, Number(totalItems) || 1) - 1) * 950);

  let baseDom;
  let baseSuc;

  if (cpNum === 2740) {
    baseDom = 8546;
    baseSuc = 5928;
  } else if (cpNum >= 1000 && cpNum <= 2999) {
    baseDom = 9250;
    baseSuc = 6420;
  } else if ((cpNum >= 3000 && cpNum <= 3399) || (cpNum >= 5000 && cpNum <= 8299)) {
    baseDom = 10480;
    baseSuc = 7350;
  } else if (cpNum >= 8300 && cpNum <= 9499) {
    baseDom = 13890;
    baseSuc = 9650;
  } else {
    baseDom = 11750;
    baseSuc = 8190;
  }

  if (metodoEnvio === 'correo_sucursal') {
    return baseSuc + Math.round(recargoPeso * 0.75);
  }
  return baseDom + recargoPeso;
}

export default async function handler(req, res) {
  // 1. Permisos CORS seguros con lista blanca
  const safeOrigin = getSafeOrigin(req.headers.origin);
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
    const {
      orderId,
      items,
      shippingCost = 0,
      shippingTitle = 'Costo de envío',
      metodoEnvio,
      cpDestino
    } = req.body || {};

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos de orden o carrito inválidos' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Faltan credenciales en el servidor' });
    }

    // 2. Consultar precios reales en Supabase obligatoriamente
    const productIds = items.map(i => Number(i.product?.id)).filter(id => !isNaN(id) && id > 0);
    if (productIds.length !== items.length) {
      return res.status(400).json({ error: 'Uno o más productos tienen un ID inválido' });
    }

    const sbRes = await fetch(
      `${supabaseUrl}/rest/v1/products?id=in.(${productIds.join(',')})&select=id,price,name,sku_code`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      }
    );

    if (!sbRes.ok) {
      return res.status(500).json({ error: 'No se pudieron verificar los precios en la base de datos' });
    }

    const dbProducts = await sbRes.json();
    const dbPricesMap = {};
    dbProducts.forEach(p => { dbPricesMap[p.id] = p; });

    // 3. Armar ítems validados (rechaza si algún producto no existe o tiene precio <= 0)
    const mpItems = [];
    let totalUnits = 0;
    for (const item of items) {
      const dbProd = dbPricesMap[item.product?.id];
      if (!dbProd || Number(dbProd.price) <= 0) {
        return res.status(422).json({
          error: `El producto ${item.product?.name || ''} no tiene un precio válido en base de datos.`
        });
      }

      const safeQuantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      totalUnits += safeQuantity;
      mpItems.push({
        id: String(dbProd.id),
        title: dbProd.name,
        description: dbProd.sku_code || '',
        quantity: safeQuantity,
        currency_id: 'ARS',
        unit_price: Number(dbProd.price)
      });
    }

    // 4. Validar el costo de envío en el servidor para evitar manipulación desde el navegador
    let verifiedShipping = Math.max(0, Math.round(Number(shippingCost) || 0));
    if (metodoEnvio === 'retiro' || metodoEnvio === 'acordar') {
      verifiedShipping = 0;
    } else if (metodoEnvio === 'correo_domicilio' || metodoEnvio === 'correo_sucursal') {
      const minExpectedShipping = estimateFallbackShipping(cpDestino, totalUnits, metodoEnvio);
      if (verifiedShipping < minExpectedShipping) {
        verifiedShipping = minExpectedShipping;
      }
    }

    if (verifiedShipping > 0) {
      mpItems.push({
        id: 'ENVIO',
        title: String(shippingTitle).slice(0, 120),
        description: 'Servicio de entrega',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: verifiedShipping
      });
    }

    const webhookBaseUrl = process.env.PUBLIC_SITE_URL || (safeOrigin.startsWith('https://') ? safeOrigin : DEFAULT_ORIGIN);

    // 5. Crear preferencia en Mercado Pago
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: mpItems,
        external_reference: String(orderId),
        notification_url: `${webhookBaseUrl}/api/mpWebhook`,
        back_urls: {
          success: `${safeOrigin}/?mp_status=approved&order_id=${encodeURIComponent(orderId)}`,
          failure: `${safeOrigin}/?mp_status=failure&order_id=${encodeURIComponent(orderId)}`,
          pending: `${safeOrigin}/?mp_status=pending&order_id=${encodeURIComponent(orderId)}`
        },
        auto_return: 'approved'
      })
    });

    const data = await response.json();

    if (data.init_point) {
      return res.status(200).json({ init_point: data.init_point });
    } else {
      return res.status(400).json({ error: 'Error de Mercado Pago', details: data });
    }
  } catch (error) {
    console.error('Error en createPreference:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}