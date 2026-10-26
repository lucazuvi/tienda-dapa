const DEFAULT_ORIGIN = 'https://tienda-dapa-6hoc.vercel.app';
const ALLOWED_ORIGINS = [
  'https://daparepuestos.com.ar',
  'https://www.daparepuestos.com.ar',
  'https://tienda-dapa-6hoc.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173'
];

export default async function handler(req, res) {
  // 1. Permisos CORS seguros
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
    const { cpDestino, totalItems = 1 } = req.body || {};
    const cleanCp = String(cpDestino || '').replace(/\D/g, '');

    if (cleanCp.length !== 4) {
      return res.status(400).json({ error: 'Código postal inválido' });
    }

    const apiUser = process.env.MICORREO_USER || process.env.CORREO_API_USER;
    const apiPass = process.env.MICORREO_PASSWORD || process.env.CORREO_API_PASS;
    let customerId = process.env.MICORREO_CUSTOMER_ID || process.env.CORREO_CUSTOMER_ID;
    const accountEmail = process.env.MICORREO_ACCOUNT_EMAIL;
    const accountPass = process.env.MICORREO_ACCOUNT_PASSWORD;
    const cpOrigen = process.env.CORREO_CP_ORIGEN || '2740'; // Arrecifes por defecto

    // Estimación de peso y caja según cantidad de repuestos (Correo Argentino pide gramos y cm)
    const weightGrams = Math.min(25000, Math.max(500, Number(totalItems) * 1200));
    const dimensions = {
      weight: weightGrams,
      height: 15,
      width: 25,
      length: 30
    };

    // =========================================================================
    // A. CONEXIÓN OFICIAL CON API MI CORREO (CORREO ARGENTINO)
    // =========================================================================
    if (apiUser && apiPass && (customerId || (accountEmail && accountPass))) {
      const baseUrl = process.env.CORREO_API_URL || 'https://api.correoargentino.com.ar/micorreo/v1';
      const basicAuth = Buffer.from(`${apiUser}:${apiPass}`).toString('base64');

      // 1. Obtener Token JWT de Correo Argentino
      const tokenRes = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basicAuth}` }
      });

      if (tokenRes.ok) {
        const { token } = await tokenRes.json();

        // 1b. Si no se cargó customerId, obtenerlo con /users/validate
        if (!customerId && accountEmail && accountPass) {
          const valRes = await fetch(`${baseUrl}/users/validate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: accountEmail, password: accountPass })
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            customerId = valData.customerId;
          }
        }

        // 2. Consultar Tarifas reales (Domicilio y Sucursal)
        const ratesRes = await fetch(`${baseUrl}/rates`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerId,
            postalCodeOrigin: cpOrigen,
            postalCodeDestination: cleanCp,
            dimensions
          })
        });

        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          const rates = ratesData.rates || [];

          const domRate = rates.find(r => r.deliveredType === 'D');
          const sucRate = rates.find(r => r.deliveredType === 'S');

          if (domRate || sucRate) {
            return res.status(200).json({
              source: 'api_oficial',
              cp: cleanCp,
              domicilio: domRate ? Math.round(Number(domRate.price)) : null,
              sucursal: sucRate ? Math.round(Number(sucRate.price)) : null,
              diasDomicilio: domRate ? `${domRate.deliveryTimeMin} a ${domRate.deliveryTimeMax} días hábiles` : '3 a 6 días hábiles',
              diasSucursal: sucRate ? `${sucRate.deliveryTimeMin} a ${sucRate.deliveryTimeMax} días hábiles` : '3 a 6 días hábiles',
              sucursalDetalle: `Sucursal Correo Argentino oficial habilitada (CP ${cleanCp}) - LUN A VIE 09:00 A 16:00`
            });
          }
        }
      }
    }

    // =========================================================================
    // B. RESPALDO AUTOMÁTICO (Si aún no configuraste las credenciales en Vercel)
    // =========================================================================
    const cpNum = parseInt(cleanCp, 10);
    const recargoPeso = Math.max(0, (Number(totalItems) - 1) * 950);

    // Distancia tarifaria respecto a Arrecifes (CP 2740)
    let baseDom = 8546;
    let baseSuc = 5928;
    let dias = '3 a 6 días hábiles';

    if (cpNum === 2740) {
      baseDom = 8546;
      baseSuc = 5928;
    } else if (cpNum >= 1000 && cpNum <= 2999) {
      baseDom = 9250;
      baseSuc = 6420;
    } else if ((cpNum >= 3000 && cpNum <= 3399) || (cpNum >= 5000 && cpNum <= 8299)) {
      baseDom = 10480;
      baseSuc = 7350;
      dias = '4 a 7 días hábiles';
    } else if (cpNum >= 8300 && cpNum <= 9499) {
      baseDom = 13890;
      baseSuc = 9650;
      dias = '6 a 10 días hábiles';
    } else {
      baseDom = 11750;
      baseSuc = 8190;
      dias = '5 a 8 días hábiles';
    }

    const sucursalDetalle = cpNum === 2740
      ? 'ARRECIFES - Av Dr Manuel Belgrano 42, Arrecifes, Buenos Aires - LUN A VIE 09.00 A 16.00'
      : `Sucursal Correo Argentino habilitada para CP ${cleanCp} - LUN A VIE 09.00 A 16.00`;

    return res.status(200).json({
      source: 'estimador_paqar',
      cp: cleanCp,
      domicilio: baseDom + recargoPeso,
      sucursal: baseSuc + Math.round(recargoPeso * 0.75),
      diasDomicilio: dias,
      diasSucursal: dias,
      sucursalDetalle
    });

  } catch (error) {
    console.error('Error cotizando Correo Argentino:', error);
    return res.status(500).json({ error: 'No se pudo cotizar el envío' });
  }
}