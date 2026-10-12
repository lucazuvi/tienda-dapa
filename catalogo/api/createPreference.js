export default async function handler(req, res) {
  // 1. Dar permisos de seguridad (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 2. Manejar la petición de "pre-vuelo" del navegador
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Bloquear si no es POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { orderId, items } = req.body;
    
    // Leemos tu clave secreta guardada en Vercel
    const accessToken = process.env.MP_ACCESS_TOKEN;

    // Transformamos tu carrito al formato de Mercado Pago
    const mpItems = items.map(item => ({
      title: item.product.name,
      description: item.product.sku_code,
      quantity: item.quantity,
      currency_id: "ARS",
      unit_price: Number(item.product.price)
    }));

    // Nos comunicamos con Mercado Pago
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
          success: "https://tienda-dapa-6hoc.vercel.app/",
          failure: "https://tienda-dapa-6hoc.vercel.app/",
          pending: "https://tienda-dapa-6hoc.vercel.app/"
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}