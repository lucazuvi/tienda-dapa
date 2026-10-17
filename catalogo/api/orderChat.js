// ============================================================================
// API SERVERLESS: CHAT DIRECTO VENDEDOR <-> COMPRADOR POR PEDIDO
// Ubicación: /api/orderChat.js
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

function parseChatFromNotes(notesStr) {
  const raw = String(notesStr || '');
  const match = raw.match(/\[\[CHAT_DAPA:([^\]]*)\]\]/);
  if (!match || !match[1]) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function injectChatIntoNotes(notesStr, messagesArray) {
  const raw = String(notesStr || '').replace(/\s*\[\[CHAT_DAPA:[^\]]*\]\]/g, '').trim();
  const encoded = encodeURIComponent(JSON.stringify(messagesArray.slice(-100)));
  return `${raw}\n[[CHAT_DAPA:${encoded}]]`.trim();
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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Faltan variables de configuración de Supabase.' });
  }

  try {
    if (req.method === 'GET') {
      const cleanOrderId = String(req.query?.orderId || '').replace(/\D/g, '');
      if (!cleanOrderId) {
        return res.status(400).json({ error: 'orderId requerido' });
      }

      const orderRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${cleanOrderId}&select=id,notes,status,customer_name`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );

      if (!orderRes.ok) {
        return res.status(500).json({ error: 'No se pudo obtener el chat del pedido.' });
      }

      const rows = await orderRes.json();
      const order = rows?.[0];
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      return res.status(200).json({
        orderId: order.id,
        status: order.status,
        messages: parseChatFromNotes(order.notes)
      });
    }

    if (req.method === 'POST') {
      const { orderId, senderRole, senderName, text } = req.body || {};
      const cleanOrderId = String(orderId || '').replace(/\D/g, '');
      const cleanText = String(text || '').trim().slice(0, 1000);

      if (!cleanOrderId || !cleanText) {
        return res.status(400).json({ error: 'Datos de mensaje incompletos.' });
      }

      const role = senderRole === 'seller' ? 'seller' : 'buyer';

      const orderRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${cleanOrderId}&select=id,notes,status,customer_name`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );

      if (!orderRes.ok) {
        return res.status(500).json({ error: 'Error al consultar el pedido.' });
      }

      const rows = await orderRes.json();
      const order = rows?.[0];
      if (!order) {
        return res.status(404).json({ error: 'El pedido no existe.' });
      }

      const existingMessages = parseChatFromNotes(order.notes);
      const newMessage = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sender: role,
        senderName: String(senderName || (role === 'seller' ? 'D.A.P.A. Repuestos' : order.customer_name || 'Comprador')).slice(0, 80),
        text: cleanText,
        createdAt: new Date().toISOString()
      };

      const updatedMessages = [...existingMessages, newMessage];
      const updatedNotes = injectChatIntoNotes(order.notes, updatedMessages);

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${cleanOrderId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ notes: updatedNotes })
        }
      );

      if (!updateRes.ok) {
        return res.status(500).json({ error: 'No se pudo guardar el mensaje.' });
      }

      return res.status(200).json({
        success: true,
        message: newMessage,
        messages: updatedMessages,
        updatedNotes
      });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en /api/orderChat:', error);
    return res.status(500).json({ error: 'Error interno en el servidor de chat.' });
  }
}
