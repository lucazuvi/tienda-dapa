export default async function handler(req, res) {
  // 1. Permisos CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { orderId, items } = req.body;

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos de orden o carrito inválidos' });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'Falta configurar MP_ACCESS_TOKEN en el servidor' });
    }

    // 2. Consultar precios reales en Supabase si las variables de entorno están disponibles
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const dbPricesMap = {};

    if (supabaseUrl && supabaseKey) {
      const productIds = items.map(i => i.product?.id).filter(Boolean).join(',');
      if (productIds) {
        const sbRes = await fetch(
          `${supabaseUrl}/rest/v1/products?id=in.(${productIds})&select=id,price,name,sku_code`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`
            }
          }
        );
        if (sbRes.ok) {
          const dbProducts = await sbRes.json();
          dbProducts.forEach(p => { dbPricesMap[p.id] = p; });
        }
      }
    }

    // 3. Armar ítems validados para Mercado Pago
    const mpItems = items.map(item => {
      const dbProd = dbPricesMap[item.product?.id];
      const realPrice = dbProd ? Number(dbProd.price) : Number(item.product?.price || 0);
      const safeQuantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      return {
        title: dbProd?.name || item.product?.name || 'Repuesto Automotor',
        description: dbProd?.sku_code || item.product?.sku_code || '',
        quantity: safeQuantity,
        currency_id: "ARS",
        unit_price: realPrice
      };
    });

    const siteOrigin = req.headers.origin || "https://tienda-dapa-6hoc.vercel.app";

    // 4. Crear preferencia en Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: mpItems,
        external_reference: orderId.toString(),
        back_urls: {
          success: `${siteOrigin}/?mp_status=approved`,
          failure: `${siteOrigin}/?mp_status=failure`,
          pending: `${siteOrigin}/?mp_status=pending`
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();
    
    if (data.init_point) {
      res.status(200).json({ init_point: data.init_point });
    } else {
      res.status(400).json({ error: 'Error de Mercado Pago', details: data });
    }

  } catch (error) {
    console.error("Error en createPreference:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}