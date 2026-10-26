const DEFAULT_ORIGIN = 'https://tienda-dapa-6hoc.vercel.app';
const ALLOWED_ORIGINS = [
  'https://daparepuestos.com.ar',
  'https://www.daparepuestos.com.ar',
  'https://tienda-dapa-6hoc.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173'
];

// Tabla oficial de códigos de provincia de Correo Argentino (Páginas 22-23 Manual API MiCorreo y Página 12 Manual API 2.0)
function mapProvinceToCode(rawProvince) {
  const p = String(rawProvince || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (p.length === 1 && /^[ABCDEFGHJKLMNPQRSTUVWXYZ]$/.test(p)) return p;
  if (p.includes('CAPITAL') || p.includes('CABA') || p.includes('AUTONOMA')) return 'C';
  if (p.includes('SALTA')) return 'A';
  if (p.includes('BUENOS AIRES') || p.includes('BS AS')) return 'B';
  if (p.includes('SAN LUIS')) return 'D';
  if (p.includes('ENTRE RIOS')) return 'E';
  if (p.includes('LA RIOJA')) return 'F';
  if (p.includes('SANTIAGO DEL ESTERO')) return 'G';
  if (p.includes('CHACO')) return 'H';
  if (p.includes('SAN JUAN')) return 'J';
  if (p.includes('CATAMARCA')) return 'K';
  if (p.includes('LA PAMPA')) return 'L';
  if (p.includes('MENDOZA')) return 'M';
  if (p.includes('MISIONES')) return 'N';
  if (p.includes('FORMOSA')) return 'P';
  if (p.includes('NEUQUEN')) return 'Q';
  if (p.includes('RIO NEGRO')) return 'R';
  if (p.includes('SANTA FE')) return 'S';
  if (p.includes('TUCUMAN')) return 'T';
  if (p.includes('CHUBUT')) return 'U';
  if (p.includes('TIERRA DEL FUEGO')) return 'V';
  if (p.includes('CORRIENTES')) return 'W';
  if (p.includes('CORDOBA')) return 'X';
  if (p.includes('JUJUY')) return 'Y';
  if (p.includes('SANTA CRUZ')) return 'Z';
  return 'B';
}

function splitStreetAndNumber(rawAddress) {
  const clean = String(rawAddress || '').trim();
  if (!clean) return { streetName: 'Sin especificar', streetNumber: '0' };
  const match = clean.match(/^(.*?)\s+(\d+[A-Za-z0-9/-]*)$/);
  if (match) {
    return {
      streetName: match[1].trim() || clean,
      streetNumber: match[2].trim() || '0'
    };
  }
  return { streetName: clean, streetNumber: '0' };
}

function parseDimensionsAndWeight(dimensionsStr, weightStr) {
  const dimNums = String(dimensionsStr || '20x38x38')
    .match(/\d+/g)
    ?.map((n) => parseInt(n, 10)) || [20, 38, 38];
  const height = Math.min(200, Math.max(1, dimNums[0] || 20));
  const width = Math.min(200, Math.max(1, dimNums[1] || 38));
  const length = Math.min(200, Math.max(1, dimNums[2] || 38));

  const wRaw = String(weightStr || '2.5 kg').replace(',', '.');
  const wMatch = wRaw.match(/(\d+(\.\d+)?)/);
  let weightGrams = 2500;
  if (wMatch) {
    const num = parseFloat(wMatch[1]);
    if (wRaw.toLowerCase().includes('kg') || num < 50) {
      weightGrams = Math.round(num * 1000);
    } else {
      weightGrams = Math.round(num);
    }
  }
  weightGrams = Math.min(50000, Math.max(100, weightGrams));
  return { height, width, length, weightGrams };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const safeOrigin =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/tienda-dapa[a-z0-9-]*\.vercel\.app$/i.test(origin))
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
    const {
      orderId,
      customerName,
      customerPhone,
      customerEmail,
      domicilio,
      localidad,
      provincia,
      cp,
      referencia,
      serviceType = 'DOM',
      agencyCode = '',
      dimensions = '20x38x38cm',
      weight = '7.5 kg',
      declaredValue = 15000,
      trackingCode = ''
    } = req.body || {};

    const apiUser = process.env.MICORREO_USER || process.env.CORREO_API_USER;
    const apiPass = process.env.MICORREO_PASSWORD || process.env.CORREO_API_PASS;
    let customerId = process.env.MICORREO_CUSTOMER_ID || process.env.CORREO_CUSTOMER_ID;
    const micorreoAccountEmail = process.env.MICORREO_ACCOUNT_EMAIL;
    const micorreoAccountPass = process.env.MICORREO_ACCOUNT_PASSWORD;

    const paqarApiKey = process.env.CORREO_API_KEY;
    const paqarAgreement = process.env.CORREO_AGREEMENT;

    const { streetName, streetNumber } = splitStreetAndNumber(domicilio);
    const provinceCode = mapProvinceToCode(provincia);
    const cleanCp = String(cp || '2740').replace(/\D/g, '') || '2740';
    const { height, width, length, weightGrams } = parseDimensionsAndWeight(dimensions, weight);
    const isSucursal = String(serviceType).toUpperCase() === 'SUC';

    // =========================================================================
    // 1. INTEGRACIÓN API 2.0 PAQ.AR (/v1/orders + /v1/labels) - PDF 2
    // =========================================================================
    if (paqarApiKey && paqarAgreement) {
      const paqarBaseUrl =
        process.env.CORREO_PAQAR_URL || 'https://api.correoargentino.com.ar/paqar/v1';

      const orderPayload = {
        sellerId: String(paqarAgreement),
        trackingNumber: trackingCode ? String(trackingCode).toUpperCase() : '',
        order: {
          senderData: {
            id: String(paqarAgreement),
            businessName: 'Molle Autopartes - D.A.P.A. Repuestos',
            areaCodePhone: '02478',
            phoneNumber: '452225',
            areaCodeCellphone: '2478',
            cellphoneNumber: '406288',
            email: 'dapamolle@gmail.com',
            observation: 'Repuestos Automotores',
            address: {
              streetName: 'Lamadrid',
              streetNumber: '65',
              cityName: 'Arrecifes',
              floor: '',
              department: '',
              state: 'B',
              zipCode: '2740'
            }
          },
          shippingData: {
            name: String(customerName || 'Cliente D.A.P.A.'),
            areaCodePhone: '',
            phoneNumber: String(customerPhone || '').replace(/\D/g, ''),
            areaCodeCellphone: '',
            cellphoneNumber: String(customerPhone || '').replace(/\D/g, ''),
            email: String(customerEmail || 'cliente@dapaya.com.ar'),
            observation: String(referencia || ''),
            address: {
              streetName,
              streetNumber,
              cityName: String(localidad || 'Buenos Aires'),
              floor: '',
              department: '',
              state: provinceCode,
              zipCode: cleanCp
            }
          },
          parcels: [
            {
              dimensions: {
                height: String(height),
                width: String(width),
                depth: String(length)
              },
              productWeight: String(weightGrams),
              productCategory: 'Repuestos Automotores',
              declaredValue: String(Math.round(Number(declaredValue || 10000)))
            }
          ],
          deliveryType: isSucursal ? 'agency' : 'homeDelivery',
          agencyId: isSucursal ? String(agencyCode || '') : '',
          saleDate: new Date().toISOString().replace(/\.\d{3}Z$/, '-03:00'),
          serviceType: 'CP',
          shipmentClientId: String(orderId || Date.now())
        }
      };

      const createOrderRes = await fetch(`${paqarBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Apikey ${paqarApiKey}`,
          agreement: String(paqarAgreement),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const createOrderData = await createOrderRes.json().catch(() => ({}));
      if (!createOrderRes.ok) {
        return res.status(createOrderRes.status).json({
          error:
            createOrderData.message ||
            createOrderData.error ||
            'Error al dar de alta la orden en Paq.ar API 2.0',
          details: createOrderData
        });
      }

      const assignedTracking =
        createOrderData.trackingNumber ||
        createOrderData?.order?.trackingNumber ||
        trackingCode;

      // Obtener el rótulo oficial en PDF Base64 (/v1/labels)
      let labelBase64 = null;
      let labelFileName = null;
      if (assignedTracking) {
        const labelRes = await fetch(`${paqarBaseUrl}/labels?labelFormat=10x15`, {
          method: 'POST',
          headers: {
            Authorization: `Apikey ${paqarApiKey}`,
            agreement: String(paqarAgreement),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            {
              sellerId: String(paqarAgreement),
              trackingNumber: String(assignedTracking)
            }
          ])
        });

        if (labelRes.ok) {
          const labelArr = await labelRes.json().catch(() => []);
          const firstLabel = Array.isArray(labelArr) ? labelArr[0] : labelArr;
          if (firstLabel?.fileBase64) {
            labelBase64 = firstLabel.fileBase64;
            labelFileName = firstLabel.fileName || firstLabel.filename || `Rotulo_${assignedTracking}.pdf`;
          }
        }
      }

      return res.status(200).json({
        ok: true,
        mode: 'paqar_v2',
        trackingNumber: assignedTracking,
        labelBase64,
        labelFileName,
        message: 'Orden dada de alta oficialmente en Correo Argentino (Paq.ar API 2.0).'
      });
    }

    // =========================================================================
    // 2. INTEGRACIÓN API MICORREO v1 (/token + /shipping/import) - PDF 1
    // =========================================================================
    if (apiUser && apiPass) {
      const baseUrl =
        process.env.CORREO_API_URL || 'https://api.correoargentino.com.ar/micorreo/v1';
      const basicAuth = Buffer.from(`${apiUser}:${apiPass}`).toString('base64');

      // Paso 1: Obtener JWT Token (/token)
      const tokenRes = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basicAuth}` }
      });

      if (!tokenRes.ok) {
        return res.status(401).json({
          error: 'Credenciales de API MiCorreo inválidas al solicitar /token.'
        });
      }

      const { token } = await tokenRes.json();

      // Paso 2: Si no está definido MICORREO_CUSTOMER_ID, lo obtenemos con /users/validate
      if (!customerId && micorreoAccountEmail && micorreoAccountPass) {
        const valRes = await fetch(`${baseUrl}/users/validate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: micorreoAccountEmail,
            password: micorreoAccountPass
          })
        });
        if (valRes.ok) {
          const valData = await valRes.json();
          customerId = valData.customerId;
        }
      }

      if (!customerId) {
        return res.status(400).json({
          error:
            'Falta configurar MICORREO_CUSTOMER_ID (o MICORREO_ACCOUNT_EMAIL y MICORREO_ACCOUNT_PASSWORD) en Vercel.'
        });
      }

      // Paso 3: Importar el envío a MiCorreo (/shipping/import - Páginas 11 a 15 del PDF 1)
      const extOrderId = `DAPA-${orderId}-${Date.now().toString().slice(-4)}`;
      const importPayload = {
        customerId: String(customerId),
        extOrderId,
        orderNumber: String(orderId),
        sender: {
          name: 'Molle Autopartes - D.A.P.A.',
          phone: '2478452225',
          cellPhone: '2478406288',
          email: 'dapamolle@gmail.com',
          originAddress: {
            streetName: 'Lamadrid',
            streetNumber: '65',
            floor: '',
            apartment: '',
            city: 'Arrecifes',
            provinceCode: 'B',
            postalCode: '2740'
          }
        },
        recipient: {
          name: String(customerName || 'Cliente'),
          phone: String(customerPhone || '').replace(/\D/g, ''),
          cellPhone: String(customerPhone || '').replace(/\D/g, ''),
          email: String(customerEmail || 'cliente@dapaya.com.ar')
        },
        shipping: {
          deliveryType: isSucursal ? 'S' : 'D',
          agency: isSucursal && agencyCode ? String(agencyCode) : null,
          address: {
            streetName,
            streetNumber,
            floor: '',
            apartment: '',
            city: String(localidad || 'Buenos Aires'),
            provinceCode,
            postalCode: cleanCp
          },
          productType: 'CP',
          weight: weightGrams,
          declaredValue: Number(declaredValue || 10000),
          height,
          length,
          width
        }
      };

      const importRes = await fetch(`${baseUrl}/shipping/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(importPayload)
      });

      const importData = await importRes.json().catch(() => ({}));
      if (!importRes.ok) {
        return res.status(importRes.status).json({
          error:
            importData.message ||
            'Error al importar el envío en MiCorreo (/shipping/import).',
          details: importData
        });
      }

      return res.status(200).json({
        ok: true,
        mode: 'micorreo_v1',
        extOrderId,
        createdAt: importData.createdAt,
        message:
          '¡Envío importado con éxito en tu cuenta de MiCorreo! Ya podés entrar a MiCorreo para abonarlo y descargar el rótulo oficial.'
      });
    }

    return res.status(200).json({
      ok: false,
      needsCredentials: true,
      message:
        'Aún no están cargadas las credenciales de Correo Argentino en Vercel (MICORREO_USER / MICORREO_PASSWORD o CORREO_API_KEY / CORREO_AGREEMENT). Cuando Correo Argentino te las envíe y las cargues en Vercel, este botón enviará el paquete directo a tu cuenta de MiCorreo.'
    });
  } catch (err) {
    console.error('Error en despacharCorreo:', err);
    return res.status(500).json({
      error: 'Error interno al conectar con Correo Argentino: ' + (err.message || 'Error')
    });
  }
}
