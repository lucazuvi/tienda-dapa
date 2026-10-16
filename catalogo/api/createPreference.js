// catalogo/api/createPreference.js
export default async function handler(req, res) {
  // 1. Permisos CORS corregidos
  const allowedOrigin = req.headers.origin || 'https://tienda-dapa-6hoc.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { orderId, items, shippingCost = 0, shippingTitle = 'Costo de envío' } = req.body;

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
    for (const item of items) {
      const dbProd = dbPricesMap[item.product?.id];
      if (!dbProd || Number(dbProd.price) <= 0) {
        return res.status(422).json({
          error: `El producto ${item.product?.name || ''} no tiene un precio válido en base de datos.`
        });
      }

      const safeQuantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      mpItems.push({
        id: String(dbProd.id),
        title: dbProd.name,
        description: dbProd.sku_code || '',
        quantity: safeQuantity,
        currency_id: 'ARS',
        unit_price: Number(dbProd.price)
      });
    }

    // 4. Sumar el costo de envío si corresponde
    const numericShipping = Math.round(Number(shippingCost) || 0);
    if (numericShipping > 0) {
      mpItems.push({
        id: 'ENVIO',
        title: String(shippingTitle).slice(0, 120),
        description: 'Servicio de entrega',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: numericShipping
      });
    }

    const siteOrigin = req.headers.origin || 'https://tienda-dapa-6hoc.vercel.app';
    // Mercado Pago exige que notification_url sea HTTPS público (no acepta localhost)
    const webhookBaseUrl = siteOrigin.startsWith('https://')
      ? siteOrigin
      : 'https://tienda-dapa-6hoc.vercel.app';

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
          success: `${siteOrigin}/?mp_status=approved`,
          failure: `${siteOrigin}/?mp_status=failure`,
          pending: `${siteOrigin}/?mp_status=pending`
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