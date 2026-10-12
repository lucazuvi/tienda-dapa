export default async function handler(req, res) {
  // Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { orderId, items } = req.body;
    
    // Vercel va a leer tu clave secreta desde su panel seguro
    const accessToken = process.env.MP_ACCESS_TOKEN;

    // Transformamos tu carrito de DAPA al formato que exige Mercado Pago
    const mpItems = items.map(item => ({
      title: item.product.name,
      description: item.product.sku_code,
      quantity: item.quantity,
      currency_id: "ARS",
      unit_price: Number(item.product.price)
    }));

    // Nos comunicamos en secreto con Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: mpItems,
        external_reference: orderId.toString(), // Guardamos el # de tu pedido
        back_urls: {
          success: "https://tienda-dapa-6hoc.vercel.app/", // A dónde vuelve si paga bien
          failure: "https://tienda-dapa-6hoc.vercel.app/", // A dónde vuelve si falla
          pending: "https://tienda-dapa-6hoc.vercel.app/"
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();
    
    // Si Mercado Pago nos da el link, se lo devolvemos a tu página
    if (data.id) {
      res.status(200).json({ init_point: data.init_point });
    } else {
      res.status(400).json({ error: 'Error al crear la preferencia', details: data });
    }

  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
