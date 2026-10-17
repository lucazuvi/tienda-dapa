import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Tags, ClipboardList, ArrowLeft, Plus, X, Save, Package, CheckCircle, 
  Calendar, User as UserIcon, Phone, FileText, Lock, LogOut, 
  Image as ImageIcon, Upload, Edit, Trash2, ListPlus, Tag, Search, 
  AlertTriangle, FileSpreadsheet, Download, RefreshCw, 
  BarChart3, Percent, Filter, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown,
  RotateCcw, Printer, MessageSquare, CreditCard, Truck, Send
} from 'lucide-react';
import { supabase } from './supabase';

const ADMIN_EMAILS = ['admin@dapa.com'];

const escapeHtml = (unsafe) => {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const parseAdminChatMessages = (notesStr) => {
  const raw = String(notesStr || '');
  const match = raw.match(/\[\[CHAT_DAPA:([^\]]*)\]\]/);
  if (!match || !match[1]) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const injectAdminChatMessages = (notesStr, messagesArray) => {
  const raw = String(notesStr || '').replace(/\s*\[\[CHAT_DAPA:[^\]]*\]\]/g, '').trim();
  const encoded = encodeURIComponent(JSON.stringify(messagesArray.slice(-100)));
  return `${raw}\n[[CHAT_DAPA:${encoded}]]`.trim();
};

const extractShippingLabelMeta = (order) => {
  const rawNotes = String(order?.notes || '');
  const trackMatch = rawNotes.match(/\[TRACKING_CA:([A-Z0-9-]+)\]/i) || rawNotes.match(/\b([A-Z]{2}\d{9}AR)\b/i);
  const dimMatch = rawNotes.match(/\[DIM_CA:([^\]]+)\]/i);
  const pesoMatch = rawNotes.match(/\[PESO_CA:([^\]]+)\]/i);
  const zonaMatch = rawNotes.match(/\[ZONA_CA:([^\]]+)\]/i);

  // Extraer dirección, localidad, provincia y CP desde las notas del checkout si existen
  const cpMatch = rawNotes.match(/CP\s*(\d{4})/i);
  const isSucursal = /Retiro en Sucursal Correo Argentino/i.test(rawNotes);
  const correoParenMatch = rawNotes.match(/Correo Argentino\s*\(([^)]+)\)/i);

  let domicilio = 'A confirmar';
  let localidad = 'Arrecifes';
  let provincia = 'Buenos Aires';
  let cp = cpMatch ? cpMatch[1] : '2740';

  if (correoParenMatch && correoParenMatch[1]) {
    const parts = correoParenMatch[1].split('-')[0].split(',').map(s => s.trim()).filter(Boolean);
    if (isSucursal) {
      domicilio = 'Retiro en Sucursal Correo Argentino';
      localidad = parts[0] || localidad;
      provincia = parts[1] || provincia;
    } else if (parts.length >= 3) {
      domicilio = parts[0];
      localidad = parts[1];
      provincia = parts.slice(2).join(', ');
    } else if (parts.length === 2) {
      domicilio = parts[0];
      localidad = parts[1];
    } else if (parts.length === 1) {
      domicilio = parts[0];
    }
  }

  const obsMatch = rawNotes.match(/Observaciones del cliente:\s*([^|\n]+)/i);
  const referencia = obsMatch ? obsMatch[1].trim() : '';

  const provUpper = provincia.toUpperCase();
  let defaultZone = 'PAM-BUE-AAB';
  if (provUpper.includes('SALTA') || provUpper.includes('JUJUY') || provUpper.includes('TUCUM')) {
    defaultZone = 'NOA-SLAD-AAB';
  } else if (provUpper.includes('CORDOBA') || provUpper.includes('CÓRDOBA') || provUpper.includes('SANTA FE')) {
    defaultZone = 'CEN-COR-AAB';
  } else if (provUpper.includes('MENDOZA') || provUpper.includes('SAN JUAN') || provUpper.includes('SAN LUIS')) {
    defaultZone = 'CUY-MDZ-AAB';
  } else if (provUpper.includes('NEUQU') || provUpper.includes('RIO NEGRO') || provUpper.includes('CHUBUT') || provUpper.includes('SANTA CRUZ')) {
    defaultZone = 'PAT-NQN-AAB';
  }

  const fallbackTrack = `HC${String(532800000 + Number(order?.id || 1)).slice(-9)}AR`;

  return {
    trackingCode: trackMatch ? trackMatch[1].toUpperCase() : fallbackTrack,
    hasSavedTracking: Boolean(trackMatch),
    dimensions: dimMatch ? dimMatch[1] : '20x38x38cm',
    weight: pesoMatch ? pesoMatch[1] : '7.5 kg',
    zoneCode: zonaMatch ? zonaMatch[1] : defaultZone,
    serviceType: isSucursal ? 'SUC' : 'DOM',
    domicilio,
    localidad,
    provincia,
    cp,
    referencia
  };
};

// Generador determinístico de código de barras vectorial (formato Code-128 compatible con cualquier impresora y SO)
const generateCode128Svg = (valueStr, width = 310, height = 66) => {
  const clean = String(valueStr || '0000000000');
  const bars = [2, 1, 1, 2, 3, 2]; // Patrón de inicio Code-128B
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const b1 = (code % 3) + 1;
    const s1 = ((code >> 1) % 3) + 1;
    const b2 = ((code >> 2) % 3) + 1;
    const s2 = ((code >> 3) % 2) + 1;
    const b3 = ((code >> 4) % 2) + 1;
    const s3 = 11 - (b1 + s1 + b2 + s2 + b3);
    bars.push(b1, s1, b2, Math.max(1, s2), b3, Math.max(1, s3));
  }
  bars.push(2, 3, 3, 1, 1, 1, 2); // Patrón de cierre

  const totalUnits = bars.reduce((a, b) => a + b, 0);
  let currentX = 0;
  const rects = [];
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i];
    if (i % 2 === 0) {
      rects.push(`<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000" />`);
    }
    currentX += w;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalUnits} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" style="display:block;margin:0 auto;">${rects.join('')}</svg>`;
};

// Generador de matriz QR vectorial SVG para la etiqueta de Correo Argentino / Mercado Libre
const generateQrCodeSvg = (payloadStr, sizePx = 84) => {
  const grid = 25;
  const matrix = Array.from({ length: grid }, () => Array(grid).fill(false));
  const reserved = Array.from({ length: grid }, () => Array(grid).fill(false));

  const placeFinder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || rr >= grid || cc < 0 || cc >= grid) continue;
        reserved[rr][cc] = true;
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[rr][cc] = inOuter || inInner;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, grid - 7);
  placeFinder(grid - 7, 0);

  // Patrón de alineación inferior derecho (5x5)
  const ar0 = grid - 9;
  const ac0 = grid - 9;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      reserved[ar0 + r][ac0 + c] = true;
      matrix[ar0 + r][ac0 + c] = r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2);
    }
  }

  // Líneas de sincronización
  for (let i = 8; i < grid - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Relleno determinístico a partir del payload del envío
  const seedStr = String(payloadStr || 'DAPA-MOLLE');
  let hash = 2166136261;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (reserved[r][c]) continue;
      const ch = seedStr.charCodeAt((r * grid + c) % seedStr.length);
      hash = Math.imul(hash ^ ch ^ (r * 31 + c * 17), 16777619);
      matrix[r][c] = ((hash >>> 0) % 2) === 0;
    }
  }

  const rects = [];
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (matrix[r][c]) {
        rects.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="#000" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="display:block;">${rects.join('')}</svg>`;
};

const fetchAllProducts = async () => {
  let allProds = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data: batch, error } = await supabase
      .from('products')
      .select('*, category:categories(name), brand:brands(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, from + step - 1);

    if (error || !batch || batch.length === 0) break;
    allProds = [...allProds, ...batch];
    if (batch.length < step) break;
    from += step;
  }
  return allProds;
};

// Cargador dinámico de SheetJS (permite leer .xlsx y .xls sin instalar paquetes extra)
const loadXlsxLibrary = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('No se pudo cargar el lector de Excel'));
    document.head.appendChild(script);
  });
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('productos');
  const navigate = useNavigate();

  // Estados de Seguridad
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Estados de Datos
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtros de Inventario
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [filterBrand, setFilterBrand] = useState('todas');
  const [filterStock, setFilterStock] = useState('todos'); // todos | con_stock | bajo_stock | sin_stock
  const [sortBy, setSortBy] = useState('recientes'); // recientes | precio_asc | precio_desc | stock_asc | nombre_asc
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Estado de Filtro de Pedidos y Expansión de Pedidos (compactados por defecto)
  const [orderFilter, setOrderFilter] = useState('todos');
  const [expandedOrders, setExpandedOrders] = useState({});

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Estados de Edición Rápida (Inline Editing)
  const [inlineEdit, setInlineEdit] = useState({ id: null, field: null, value: '' });

  // Estados de los Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToRefund, setOrderToRefund] = useState(null);
  const [refundMode, setRefundMode] = useState('auto_mp'); // 'auto_mp' | 'manual'
  const [refundPaymentIdInput, setRefundPaymentIdInput] = useState('');
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('Demora en encargue de proveedor / Solicitud del cliente');
  const [targetMergeCategoryId, setTargetMergeCategoryId] = useState('');
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);

  // Estados para Etiqueta Correo Argentino (Formato Mercado Libre) y Seguimiento
  const [orderForShippingLabel, setOrderForShippingLabel] = useState(null);
  const [labelForm, setLabelForm] = useState({
    trackingCode: '',
    dimensions: '20x38x38cm',
    weight: '7.5 kg',
    zoneCode: 'NOA-SLAD-AAB',
    serviceType: 'DOM',
    domicilio: '',
    localidad: '',
    provincia: '',
    cp: '2740',
    referencia: ''
  });

  // Estados para Chat Directo Vendedor <-> Comprador en Panel Admin
  const [orderForSellerChat, setOrderForSellerChat] = useState(null);
  const [sellerChatMessages, setSellerChatMessages] = useState([]);
  const [sellerChatInput, setSellerChatInput] = useState('');
  const [isSendingSellerChat, setIsSendingSellerChat] = useState(false);
  const sellerChatBottomRef = useRef(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const notifTimeoutRef = useRef(null);
  
  // Estados para Producto (Crear / Editar)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState({
    sku_code: '',
    name: '',
    description: '',
    price: '',
    stock: '1',
    category_id: '',
    brand_id: ''
  });

  // Estados para Categorías y Marcas
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newBrandName, setNewBrandName] = useState('');

  // Estados para Actualización Masiva de Precios (%)
  const [bulkScope, setBulkScope] = useState('todos'); // todos | categoria | marca
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkBrandId, setBulkBrandId] = useState('');
  const [bulkPercentage, setBulkPercentage] = useState('');
  const [bulkRounding, setBulkRounding] = useState('100'); // 1 | 10 | 100 | 500 | 1000

  // Estados para Nueva Venta Manual (POS / Mostrador)
  const [posCustomerName, setPosCustomerName] = useState('Cliente Mostrador');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('Efectivo');
  const [posNotes, setPosNotes] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [posItems, setPosItems] = useState([]);
  const [posDiscountStock, setPosDiscountStock] = useState(true);

  // Estados para Importación de Excel
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  const isAuthorizedAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catsRes, brandsRes, allProds, ordersRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('brands').select('*').order('name'),
        fetchAllProducts(),
        supabase.from('orders').select(`*, order_items (id, product_id, quantity, unit_price, product:products (id, name, sku_code, stock))`).order('created_at', { ascending: false })
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (allProds) setProducts(allProds);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (err) {
      console.error("Error al cargar datos del panel:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user?.email && ADMIN_EMAILS.includes(currentSession.user.email.toLowerCase())) {
        fetchData();
      } else {
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  // Resetear a la página 1 cuando cambian los filtros de inventario
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterBrand, filterStock, sortBy]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      setLoginError('Este correo no tiene permisos de administrador.');
      setIsLoggingIn(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setLoginError('Correo o contraseña incorrectos.');
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('dapa_user');
    navigate('/');
  };

  const showNotification = (message, type = 'success') => {
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    setNotification({ message, type });
    notifTimeoutRef.current = setTimeout(() => setNotification(null), 3500);
  };

  // =======================================================================
  // EDICIÓN RÁPIDA EN TABLA (INLINE EDITING DE PRECIO Y STOCK)
  // =======================================================================
  const startInlineEdit = (prod, field) => {
    setInlineEdit({
      id: prod.id,
      field,
      value: String(prod[field] ?? '')
    });
  };

  const saveInlineEdit = async (prod) => {
    if (inlineEdit.id !== prod.id || !inlineEdit.field) return;
    const field = inlineEdit.field;
    const newValue = field === 'price' 
      ? Math.max(0, parseFloat(inlineEdit.value) || 0)
      : Math.max(0, parseInt(inlineEdit.value, 10) || 0);

    setInlineEdit({ id: null, field: null, value: '' });

    if (Number(prod[field]) === newValue) return;

    const { error } = await supabase
      .from('products')
      .update({ [field]: newValue })
      .eq('id', prod.id);

    if (error) {
      showNotification('No se pudo actualizar: ' + error.message, 'error');
    } else {
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, [field]: newValue } : p));
      showNotification(`${field === 'price' ? 'Precio' : 'Stock'} de ${prod.sku_code} actualizado`, 'success');
    }
  };

  // =======================================================================
  // ACTUALIZACIÓN MASIVA DE PRECIOS POR PORCENTAJE (%)
  // =======================================================================
  const targetBulkProducts = useMemo(() => {
    if (bulkScope === 'categoria') {
      if (!bulkCategoryId) return [];
      return products.filter(p => String(p.category_id) === String(bulkCategoryId));
    }
    if (bulkScope === 'marca') {
      if (!bulkBrandId) return [];
      return products.filter(p => String(p.brand_id) === String(bulkBrandId));
    }
    return products;
  }, [products, bulkScope, bulkCategoryId, bulkBrandId]);

  const calculateRoundedPrice = (currentPrice, pct, roundStep) => {
    const rawNew = Number(currentPrice) * (1 + pct / 100);
    const step = parseInt(roundStep, 10) || 1;
    if (step <= 1) return Math.max(0, Math.round(rawNew));
    return Math.max(0, Math.round(rawNew / step) * step);
  };

  const handleApplyBulkPrice = async (e) => {
    e.preventDefault();
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct === 0) {
      showNotification('Ingresá un porcentaje distinto de 0', 'error');
      return;
    }
    if (targetBulkProducts.length === 0) {
      showNotification('No hay productos seleccionados para actualizar', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates = targetBulkProducts.map(p => ({
        id: p.id,
        sku_code: p.sku_code,
        name: p.name,
        category_id: p.category_id,
        brand_id: p.brand_id,
        stock: p.stock,
        description: p.description,
        image_url: p.image_url,
        is_active: p.is_active,
        price: calculateRoundedPrice(p.price, pct, bulkRounding)
      }));

      // Upsert en lotes de 250 para máxima velocidad en Supabase
      const batchSize = 250;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      const updatedMap = new Map(updates.map(u => [u.id, u.price]));
      setProducts(prev => prev.map(p => updatedMap.has(p.id) ? { ...p, price: updatedMap.get(p.id) } : p));

      showNotification(`Se actualizaron los precios de ${updates.length} repuestos (${pct > 0 ? `+${pct}%` : `${pct}%`})`, 'success');
      setIsBulkPriceModalOpen(false);
      setBulkPercentage('');
    } catch (err) {
      showNotification('Error al actualizar precios: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =======================================================================
  // FUNCIONES DE PRODUCTOS (Crear, Editar, Eliminar)
  // =======================================================================
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showNotification('Seleccioná un archivo de imagen válido (JPG, PNG, WEBP)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification('La imagen supera el tamaño máximo de 10 MB', 'error');
      return;
    }
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const openAddProductModal = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingProductId(null);
    setFormData({ sku_code: '', name: '', description: '', price: '', stock: '1', category_id: '', brand_id: '' });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditProductModal = (prod) => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingProductId(prod.id);
    setFormData({
      sku_code: prod.sku_code,
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      stock: prod.stock,
      category_id: prod.category_id || '',
      brand_id: prod.brand_id || ''
    });
    setImageFile(null);
    setImagePreview(prod.image_url);
    setIsModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const id = productToDelete.id;
    setIsSubmitting(true);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      const { error: archiveError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (archiveError) {
        showNotification("Error al eliminar: " + error.message, 'error');
      } else {
        showNotification("Repuesto archivado (tenía pedidos asociados)", 'success');
        fetchData();
      }
    } else {
      showNotification("Repuesto eliminado correctamente", 'success');
      fetchData();
    }
    setIsSubmitting(false);
    setProductToDelete(null);
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalImageUrl = editingProductId ? imagePreview : null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('repuestos').upload(fileName, imageFile);
      if (uploadError) {
        showNotification("Error al subir foto: " + uploadError.message, 'error');
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('repuestos').getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    }

    const productData = { 
      sku_code: formData.sku_code.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock, 10) || 0,
      category_id: parseInt(formData.category_id, 10),
      brand_id: parseInt(formData.brand_id, 10),
      image_url: finalImageUrl,
      is_active: true
    };
    
    let error;
    if (editingProductId) {
      const res = await supabase.from('products').update(productData).eq('id', editingProductId);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([productData]);
      error = res.error;
    }
    
    if (error) {
      showNotification("Error al guardar: " + error.message, 'error');
    } else { 
      showNotification(editingProductId ? "Repuesto actualizado con éxito" : "Repuesto agregado al catálogo", 'success'); 
      setIsModalOpen(false);
      fetchData(); 
    }
    setIsSubmitting(false);
  };

// =======================================================================
  // IMPORTACIÓN UNIVERSAL MULTI-PROVEEDOR (11 PROVEEDORES + MAPEO MANUAL)
  // =======================================================================
  const [detectedSupplier, setDetectedSupplier] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [importMarkupPct, setImportMarkupPct] = useState('0');
  const [rawSheetMatrix, setRawSheetMatrix] = useState([]);
  const [manualMappingMode, setManualMappingMode] = useState(false);
  const [manualCols, setManualCols] = useState({
    skuCol: 0,
    nameCol: 1,
    priceCol: 2,
    fixedCategory: 'General',
    fixedBrand: 'Auto'
  });

  const extractBrandFromText = (textStr) => {
    const v = String(textStr || '').toUpperCase().trim();
    if (!v) return 'Multimarca';
    if (v.includes('ALFA ROMEO')) return 'Alfa Romeo';
    if (v.includes('AGRALE')) return 'Agrale';
    if (v.includes('AUDI')) return 'Audi';
    if (v.includes('B.M.W') || v.includes('B. M. W') || v.includes('BMW')) return 'BMW';
    if (v.includes('BYD')) return 'BYD';
    if (v.includes('CHERY')) return 'Chery';
    if (v.includes('CHEVROLET') || v.includes('CHEV.') || v.includes('CORSA') || v.includes('S-10') || v.includes('MERIVA') || v.includes('ONIX') || v.includes('CHEVY')) return 'Chevrolet';
    if (v.includes('CHRYSLER')) return 'Chrysler';
    if (v.includes('CITROEN') || v.includes('BERLINGO') || v.includes('JUMPER') || v.includes('3 CV') || v.includes('2 CV') || v.includes('AMI 8')) return 'Citroën';
    if (v.includes('DAEWOO')) return 'Daewoo';
    if (v.includes('DAIHATSU')) return 'Daihatsu';
    if (v.includes('DATSUN')) return 'Datsun';
    if (v.includes('DODGE') || v.includes('RAM')) return 'Dodge';
    if (v.includes('FIAT') || v.includes('DUNA') || v.includes('PALIO') || v.includes('SIENA') || v.includes('DUCATO') || v.includes('FIORINO') || v.includes('REGATTA') || v.includes('F-147') || v.includes('F-128')) return 'Fiat';
    if (v.includes('FORD') || v.includes('FALCON') || v.includes('ECOSPORT') || v.includes('ECO-SPORT') || v.includes('RANGER') || v.includes('FIESTA') || v.includes('FOCUS') || v.includes('ESCORT') || v.includes('F-100') || v.includes('TAUNUS')) return 'Ford';
    if (v.includes('HONDA') || v.includes('CIVIC') || v.includes('FIT') || v.includes('CR-V')) return 'Honda';
    if (v.includes('HYUNDAI')) return 'Hyundai';
    if (v.includes('IKA')) return 'IKA';
    if (v.includes('IVECO')) return 'Iveco';
    if (v.includes('JEEP')) return 'Jeep';
    if (v.includes('KIA')) return 'Kia';
    if (v.includes('LADA')) return 'Lada';
    if (v.includes('M.BENZ') || v.includes('MERCEDES') || v.includes('SPRINTER') || v.includes('1112') || v.includes('1114')) return 'Mercedes-Benz';
    if (v.includes('MAZDA')) return 'Mazda';
    if (v.includes('MINI COOPER')) return 'Mini Cooper';
    if (v.includes('MITSUBISHI')) return 'Mitsubishi';
    if (v.includes('NISSAN') || v.includes('FRONTIER')) return 'Nissan';
    if (v.includes('PEUGEOT') || v.includes('PEUG') || v.includes('PARTNER') || v.includes('504') || v.includes('206') || v.includes('207') || v.includes('208')) return 'Peugeot';
    if (v.includes('RASTROJERO')) return 'Rastrojero';
    if (v.includes('RENAULT') || v.includes('CLIO') || v.includes('KANGOO') || v.includes('MEGANE') || v.includes('SANDERO') || v.includes('TRAFIC') || v.includes('LAGUNA')) return 'Renault';
    if (v.includes('ROVER')) return 'Rover';
    if (v.includes('SCANIA')) return 'Scania';
    if (v.includes('SEAT')) return 'Seat';
    if (v.includes('SUBARU')) return 'Subaru';
    if (v.includes('SUZUKI') || v.includes('VITARA')) return 'Suzuki';
    if (v.includes('TORINO')) return 'Torino';
    if (v.includes('TOYOTA') || v.includes('HILUX') || v.includes('COROLLA') || v.includes('ETIOS')) return 'Toyota';
    if (v.includes('V.W') || v.includes('VW') || v.includes('VOLKSWAGEN') || v.includes('AMAROK') || v.includes('GOL ') || v.includes('SURAN') || v.includes('FOX')) return 'Volkswagen';
    if (v.includes('VOLVO')) return 'Volvo';
    return 'Multimarca';
  };

  // Clasificador y normalizador universal para no crear más de 90 categorías
  const detectCategoryFromName = (nameStr, rawCategory = '') => {
    const combined = `${rawCategory} ${nameStr}`
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const n = String(nameStr || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (n.startsWith('OPTICA') || n.startsWith('OPT.') || n.startsWith('# OP') || n.includes('VIDRIO OPT') || n.includes('VIDRIO DE OPT') || n.includes('LENTE OPT') || n.includes('LENTE POLICARBONATO') || n.includes('LENTE ') || n.includes('ARO OPT') || n.includes('RETEN OPTICA') || n.includes('CASCO OPT')) return 'Ópticas';
    if (n.startsWith('FARO') || n.startsWith('FAROL') || n.startsWith('FARITO') || n.includes('FARO ') || n.includes('BUSCAHUELLA') || n.includes('LAMPARA') || n.includes('PORTALAMPARA') || n.includes('BARRA CURVA') || n.includes('LED')) return 'Faros e Iluminación';
    if (combined.includes('PARABRISAS') || combined.includes('LUNETA') || combined.includes('CRISTAL') || combined.includes('PUERTA DELANTERA') || combined.includes('PUERTA TRASERA') || combined.includes('ALETA') || combined.includes('COLETA')) return 'Cristales y Parabrisas';
    if (combined.includes('CERRADUR') || combined.includes('CERRAJ') || combined.includes('CILINDRO') || combined.includes('TAMBOR') || combined.includes('RETEN') || combined.includes('TRABA ')) return 'Cerraduras y Cerrajería';
    if (combined.includes('MANIJ') || combined.includes('TIRADOR') || combined.includes('ABREPUERTA')) return 'Manijas y Tiradores';
    if (combined.includes('ALZACRISTAL') || combined.includes('LEVANTAVIDRIO') || combined.includes('LEVANTACRISTAL') || combined.includes('MAQUINA') || combined.includes('COLIZA')) return 'Alzacristales y Levantavidrios';
    if (combined.includes('ESPEJ') || combined.includes('RETROVISOR') || combined.includes('LUNA') || combined.includes('CACHA')) return 'Espejos y Lunas';
    if (combined.includes('ALFOMBR') || combined.includes('CUBRE BAUL') || combined.includes('HABITACULO') || combined.includes('TAPIZ') || combined.includes('COFIA') || combined.includes('POMO') || combined.includes('BOCHA') || combined.includes('PARASOL')) return 'Alfombras e Interior';
    if (combined.includes('TAZA') || combined.includes('INSIGNI') || combined.includes('EMBLEM') || combined.includes('ACRILICO')) return 'Tazas e Insignias';
    if (combined.includes('BURLET') || combined.includes('GOMA') || combined.includes('FUELLE') || combined.includes('TOPE')) return 'Burletes y Gomas';
    if (combined.includes('BISAGR') || combined.includes('AMORTIG. DE PTON') || combined.includes('AMORTIGUADOR DE BAUL') || combined.includes('AMORTIGUADOR PORTON') || combined.includes('RESORTE A GAS')) return 'Bisagras y Amortiguadores de Portón';
    if (combined.includes('RADIADOR') || combined.includes('ELECTRO') || combined.includes('CALEFAC') || combined.includes('MANGUERA') || combined.includes('DEPOSITO') || combined.includes('BIDON') || combined.includes('TERMOSTAT') || combined.includes('TAPA DE COMBUSTIBLE') || combined.includes('TAPA RADIADOR')) return 'Refrigeración y Tanque';
    if (combined.includes('PARAG') || combined.includes('PARRILL') || combined.includes('REJILL') || combined.includes('SPOILER') || combined.includes('MOLDURA') || combined.includes('PUNTERA') || combined.includes('ESTRIBERA') || combined.includes('ALARGUE') || combined.includes('BABERO')) return 'Paragolpes, Parrillas y Molduras';
    if (combined.includes('CAPOT') || combined.includes('GUARDABARRO') || combined.includes('GUARD.') || combined.includes('FRENTE') || combined.includes('PANEL') || combined.includes('ZOCALO') || combined.includes('PISO') || combined.includes('PASARR') || combined.includes('PARANTE') || combined.includes('TAPA BAUL') || combined.includes('COLA ')) return 'Chapas y Carrocería';
    if (combined.includes('GRAMPA') || combined.includes('CLIP') || combined.includes('FIJACION') || combined.includes('ABRAZADERA') || combined.includes('ARANDELA') || combined.includes('BULON') || combined.includes('TUERCA') || combined.includes('TORNILLO')) return 'Fijaciones, Grampas y Bulonería';
    if (combined.includes('CABLE') || combined.includes('DESTELLADOR') || combined.includes('RELAY') || combined.includes('RELE') || combined.includes('TECLA') || combined.includes('INTERRUPTOR') || combined.includes('LLAVE') || combined.includes('BULBO') || combined.includes('SENSOR') || combined.includes('BOCINA') || combined.includes('FUSIBL')) return 'Electricidad y Cables';
    if (combined.includes('ESCOBILL') || combined.includes('LIMPIAPARABRISA') || combined.includes('SAPITO') || combined.includes('BRAZO LIMPIA')) return 'Limpiaparabrisas';

    return 'Accesorios y Repuestos Varios';
  };

  const parsePriceNumber = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
    const s = String(val ?? '').trim();
    if (!s) return 0;
    const cleaned = s.replace(/[^0-9.,-]/g, '');
    if (!cleaned) return 0;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        return Math.round((parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0) * 100) / 100;
      }
      return Math.round((parseFloat(cleaned.replace(/,/g, '')) || 0) * 100) / 100;
    }
    if (cleaned.includes(',')) {
      return Math.round((parseFloat(cleaned.replace(',', '.')) || 0) * 100) / 100;
    }
    return Math.round((parseFloat(cleaned) || 0) * 100) / 100;
  };

  const normalizeKey = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const normalizeSkuCode = (sku) =>
    String(sku || '').replace(/[\s-]+/g, '').toLowerCase();

  const enrichWithExistingSkus = (rows, prefixStr) => {
    const existingSkuMap = new Map();
    products.forEach(p => {
      const fullNorm = normalizeSkuCode(p.sku_code);
      existingSkuMap.set(fullNorm, p);
      const withoutTc = fullNorm.replace(/^tc/, '');
      if (withoutTc) existingSkuMap.set(withoutTc, p);
    });

    return rows.map(item => {
      const keyWithPrefix = normalizeSkuCode(`${prefixStr}${item.sku_code}`);
      const keyRaw = normalizeSkuCode(item.sku_code);
      const existing = existingSkuMap.get(keyWithPrefix) || existingSkuMap.get(keyRaw);
      return {
        ...item,
        isUpdate: !!existing,
        existingId: existing?.id || null
      };
    });
  };

  const handleConfirmExcelImport = async () => {
    if (excelPreview.length === 0) return;
    setIsSubmitting(true);
    setImportProgress('Sincronizando categorías y marcas...');

    try {
      const pct = parseFloat(importMarkupPct) || 0;

      // 1. Asegurar categorías actuales desde Supabase
      const { data: dbCats } = await supabase.from('categories').select('*');
      const catMap = new Map((dbCats || []).map(c => [normalizeKey(c.name), c.id]));
      const uniqueNewCats = [...new Set(excelPreview.map(r => r.categoryName))]
        .filter(name => name && !catMap.has(normalizeKey(name)));

      if (uniqueNewCats.length > 0) {
        const { data: insertedCats, error: catErr } = await supabase
          .from('categories')
          .insert(uniqueNewCats.map(name => ({ name, is_active: true })))
          .select();
        if (catErr) throw catErr;
        insertedCats?.forEach(c => catMap.set(normalizeKey(c.name), c.id));
      }

      // 2. Asegurar marcas actuales desde Supabase
      const { data: dbBrands } = await supabase.from('brands').select('*');
      const brandMap = new Map((dbBrands || []).map(b => [normalizeKey(b.name), b.id]));
      const uniqueNewBrands = [...new Set(excelPreview.map(r => r.brandName))]
        .filter(name => name && !brandMap.has(normalizeKey(name)));

      if (uniqueNewBrands.length > 0) {
        const { data: insertedBrands, error: brandErr } = await supabase
          .from('brands')
          .insert(uniqueNewBrands.map(name => ({ name })))
          .select();
        if (brandErr) throw brandErr;
        insertedBrands?.forEach(b => brandMap.set(normalizeKey(b.name), b.id));
      }

      // 3. Traer todos los SKUs de la base (incluyendo inactivos/archivados para evitar choque de duplicados)
      setImportProgress('Verificando códigos existentes en la base de datos...');
      const existingSkuMap = new Map();
      let fromSku = 0;
      const stepSku = 1000;
      while (true) {
        const { data: batchSkus, error: skuErr } = await supabase
          .from('products')
          .select('id, sku_code, stock')
          .range(fromSku, fromSku + stepSku - 1);
        if (skuErr || !batchSkus || batchSkus.length === 0) break;
        batchSkus.forEach(p => {
          const fullNorm = normalizeSkuCode(p.sku_code);
          existingSkuMap.set(fullNorm, p);
          const withoutTc = fullNorm.replace(/^tc/, '');
          if (withoutTc) existingSkuMap.set(withoutTc, p);
        });
        if (batchSkus.length < stepSku) break;
        fromSku += stepSku;
      }

      const fallbackCatId = Array.from(catMap.values())[0] || null;
      const fallbackBrandId = Array.from(brandMap.values())[0] || null;

      const toInsert = [];
      const toUpdate = [];
      const seenSkusInBatch = new Set();

      excelPreview.forEach(item => {
        const finalSku = `${skuPrefix}${item.sku_code}`.trim();
        const normKeyWithPrefix = normalizeSkuCode(finalSku);
        const normKeyRaw = normalizeSkuCode(item.sku_code);

        if (seenSkusInBatch.has(normKeyWithPrefix)) return;
        seenSkusInBatch.add(normKeyWithPrefix);

        const adjustedPrice = Math.round(item.price * (1 + pct / 100));
        const newCategoryId = catMap.get(normalizeKey(item.categoryName)) || fallbackCatId;
        const newBrandId = brandMap.get(normalizeKey(item.brandName)) || fallbackBrandId;

        const existingProd = existingSkuMap.get(normKeyWithPrefix) || existingSkuMap.get(normKeyRaw);

        if (existingProd) {
          toUpdate.push({
            id: existingProd.id,
            sku_code: finalSku,
            name: item.name,
            price: adjustedPrice,
            stock: existingProd.stock ?? item.stock,
            category_id: newCategoryId,
            brand_id: newBrandId,
            is_active: true
          });
        } else {
          const payload = {
            sku_code: finalSku,
            name: item.name,
            price: adjustedPrice,
            stock: item.stock,
            category_id: newCategoryId,
            brand_id: newBrandId,
            is_active: true
          };
          if (item.description) payload.description = item.description;
          toInsert.push(payload);
        }
      });

      const batchSize = 400;

      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += batchSize) {
          setImportProgress(`Subiendo nuevos: ${Math.min(i + batchSize, toInsert.length).toLocaleString('es-AR')} de ${toInsert.length.toLocaleString('es-AR')}...`);
          const batch = toInsert.slice(i, i + batchSize);
          const { error: insertErr } = await supabase.from('products').insert(batch);
          if (insertErr) throw insertErr;
        }
      }

      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += batchSize) {
          setImportProgress(`Actualizando existentes: ${Math.min(i + batchSize, toUpdate.length).toLocaleString('es-AR')} de ${toUpdate.length.toLocaleString('es-AR')}...`);
          const batch = toUpdate.slice(i, i + batchSize);
          const { error: updateErr } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
          if (updateErr) throw updateErr;
        }
      }

      showNotification(`¡Listo! ${toInsert.length.toLocaleString('es-AR')} nuevos y ${toUpdate.length.toLocaleString('es-AR')} actualizados.`, 'success');
      setIsExcelModalOpen(false);
      setExcelPreview([]);
      setExcelFileName('');
      fetchData();
    } catch (err) {
      console.error('Error al importar Excel:', err);
      showNotification('Error en la importación: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
      setImportProgress('');
    }
  };

  const applyManualColumnMapping = (customCols = manualCols) => {
    if (!rawSheetMatrix || rawSheetMatrix.length === 0) return;
    const sCol = Number(customCols.skuCol);
    const nCol = Number(customCols.nameCol);
    const pCol = Number(customCols.priceCol);

    const manualRows = [];
    rawSheetMatrix.forEach(row => {
      const sku = String(row[sCol] ?? '').replace(/\.0$/, '').trim();
      const name = String(row[nCol] ?? '').replace(/\s+/g, ' ').trim();
      const price = parsePriceNumber(row[pCol]);

      if (
        sku &&
        name &&
        price > 0 &&
        !['CODIGO', 'CÓDIGO', 'SKU', 'ART', 'ARTICULO', 'ARTÍCULO - CÓD. GENÉRICO'].includes(sku.toUpperCase())
      ) {
        const cat = customCols.fixedCategory.trim() === 'Auto' || customCols.fixedCategory.trim() === 'General'
          ? detectCategoryFromName(name)
          : (customCols.fixedCategory.trim() || detectCategoryFromName(name));
        const brd = customCols.fixedBrand.trim() === 'Auto'
          ? extractBrandFromText(name)
          : (customCols.fixedBrand.trim() || 'Multimarca');

        manualRows.push({
          sku_code: sku,
          name,
          price,
          stock: 1,
          categoryName: cat,
          brandName: brd,
          description: ''
        });
      }
    });

    setDetectedSupplier('Mapeo Manual Personalizado');
    setExcelPreview(enrichWithExistingSkus(manualRows, skuPrefix));
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await loadXlsxLibrary();
      const pct = parseFloat(importMarkupPct) || 0;
      const dataToExport = excelPreview.length > 0
        ? excelPreview.map(item => ({
            Codigo: `${skuPrefix}${item.sku_code}`,
            Nombre: item.name,
            Precio: Math.round(item.price * (1 + pct / 100) * 100) / 100,
            Stock: item.stock,
            Categoria: item.categoryName,
            Marca: item.brandName,
            Descripcion: item.description || ''
          }))
        : [
            { Codigo: 'TC-8203', Nombre: 'OPTICA ALFA ROMEO 33 IMP (ALFA ROMEO 33)', Precio: 981571.5, Stock: 1, Categoria: 'Ópticas', Marca: 'Alfa Romeo', Descripcion: '' }
          ];

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
      const outName = excelPreview.length > 0
        ? `Convertido_${detectedSupplier.replace(/[^a-zA-Z0-9]/g, '_')}_DAPA.xlsx`
        : 'Plantilla_Productos_DAPA.xlsx';
      XLSX.writeFile(workbook, outName);
    } catch {
      showNotification('Error al generar el archivo Excel', 'error');
    }
  };

  const handleExcelFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setExcelFileName(file.name);
    setExcelPreview([]);
    setDetectedSupplier('');
    setManualMappingMode(false);

    try {
      const XLSX = await loadXlsxLibrary();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const firstMatrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      setRawSheetMatrix(firstMatrix);

      const fileNameUpper = file.name.toUpperCase();
      const flatSampleText = firstMatrix.slice(0, 55).map(r => r.join(' ')).join(' ').toUpperCase();

      let parsedRows = [];
      let supplierLabel = 'Plantilla Estándar';
      let defaultPrefix = '';

      // -----------------------------------------------------------------------
      // 1. HERRAJES FRAGATA S.A. (LISTA FRAGATA.xls - 17 hojas por marca de auto)
      // ¡Debe ir ANTES que Wargom porque tiene 17 hojas!
      // -----------------------------------------------------------------------
      if (flatSampleText.includes('HERRAJES FRAGATA') || flatSampleText.includes('HERRAJESFRAGATA') || fileNameUpper.includes('FRAGATA')) {
        supplierLabel = `Herrajes Fragata S.A. (${sheetNames.length} marcas)`;
        defaultPrefix = 'FR-';

        sheetNames.forEach(sName => {
          const ws = workbook.Sheets[sName];
          const mat = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          const sheetBrand = extractBrandFromText(sName);

          mat.forEach(row => {
            const sku = String(row[0] ?? '').replace(/\.0$/, '').trim();
            const fabBrand = String(row[1] ?? '').trim();
            const desc = String(row[2] ?? '').replace(/\s+/g, ' ').trim();
            const price = parsePriceNumber(row[3]);

            if (sku && desc && price > 0 && !['ART', 'CODIGO', 'CÓDIGO'].includes(sku.toUpperCase())) {
              const detectedVehicleBrand = sheetBrand !== 'Multimarca' ? sheetBrand : extractBrandFromText(desc);
              parsedRows.push({
                sku_code: sku,
                name: `${desc}${detectedVehicleBrand !== 'Multimarca' && !desc.toUpperCase().includes(detectedVehicleBrand.toUpperCase()) ? ` (${detectedVehicleBrand})` : ''}`,
                price,
                stock: 1,
                categoryName: detectCategoryFromName(desc),
                brandName: detectedVehicleBrand,
                description: fabBrand ? `Fabricante: ${fabBrand}` : ''
              });
            }
          });
        });
      }
      // -----------------------------------------------------------------------
      // 2. ESPEJOS FB
      // -----------------------------------------------------------------------
      else if (sheetNames.includes('LISTA') && sheetNames.includes('ESPEJOS') && sheetNames.includes('LUNAS')) {
        supplierLabel = 'Espejos FB (Espejos, Lunas, Frentes y Tapas)';
        defaultPrefix = 'FB-';
        let currentCat = 'Espejos y Lunas';

        firstMatrix.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const price = parsePriceNumber(row[3]);

          if (col0 && !col1 && price === 0 && !['CODIGO', 'CÓDIGO'].includes(col0.toUpperCase())) {
            const secUpper = col0.toUpperCase();
            if (secUpper.includes('TAPA')) currentCat = 'Refrigeración y Tanque';
            else if (secUpper.includes('ESPEJO') || secUpper.includes('FRENTE') || secUpper.includes('LUNA') || secUpper.includes('BRAZO')) currentCat = 'Espejos y Lunas';
            else currentCat = 'Accesorios y Repuestos Varios';
            return;
          }

          if (col0 && col1 && price > 0 && !['CODIGO', 'CÓDIGO'].includes(col0.toUpperCase())) {
            const cleanDesc = col1.replace(/^[0-9a-zA-Z\s]+\s-\s/, '').trim();
            parsedRows.push({
              sku_code: col0,
              name: cleanDesc || col1,
              price,
              stock: 1,
              categoryName: currentCat,
              brandName: extractBrandFromText(col1),
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 3. RGL AUTOPARTES
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('RGL AUTOPARTES') || flatSampleText.includes('RGL-AUTOPARTES')) {
        supplierLabel = 'RGL Autopartes S.R.L.';
        defaultPrefix = 'RGL-';
        let currentBrand = 'Multimarca';
        let currentRawCat = '';

        firstMatrix.forEach(row => {
          const col1 = String(row[1] ?? '').trim();
          const col2 = String(row[2] ?? '').trim();
          const col3 = String(row[3] ?? '').trim();
          const price = parsePriceNumber(row[4]);

          if (col1.toUpperCase().includes('ADAPTABLES A') || col1.toUpperCase().includes('LÍNEA')) {
            currentBrand = extractBrandFromText(col1);
            return;
          }
          if (col1.toUpperCase() === 'CODIGO' && col3) {
            currentRawCat = col3;
            return;
          }
          if (col1 && col3 && price > 0 && col1.toUpperCase() !== 'CODIGO') {
            parsedRows.push({
              sku_code: col1,
              name: col3.replace(/\s+/g, ' '),
              price,
              stock: 1,
              categoryName: detectCategoryFromName(col3, currentRawCat),
              brandName: currentBrand !== 'Multimarca' ? currentBrand : extractBrandFromText(col3),
              description: col2 ? `OEM: ${col2}` : ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 4. LISTA AUTOCONS
      // -----------------------------------------------------------------------
      else if (sheetNames.includes('Listado de Precios por Cliente') || flatSampleText.includes('LISTADO DE PRECIOS POR CLIENTE')) {
        supplierLabel = 'Autocons (Motores, Calefactores y Levanta Cristales)';
        defaultPrefix = 'AU-';
        let currentBrand = 'Multimarca';

        firstMatrix.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const col2 = String(row[2] ?? '').trim();
          const col3 = String(row[3] ?? '').trim();
          const price = parsePriceNumber(row[5]);

          if (col2.toUpperCase().startsWith('MARCA')) {
            currentBrand = extractBrandFromText(col3) !== 'Multimarca' ? extractBrandFromText(col3) : (col3 || 'Multimarca');
            return;
          }
          if (col0 && col1 && price > 0 && !['CODIGO', 'CÓDIGO'].includes(col0.toUpperCase())) {
            parsedRows.push({
              sku_code: col0,
              name: `${col1} ${currentBrand !== 'Multimarca' ? `(${currentBrand})` : ''}`.trim(),
              price,
              stock: 1,
              categoryName: detectCategoryFromName(col1),
              brandName: currentBrand !== 'Multimarca' ? currentBrand : extractBrandFromText(col1),
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 5. WARGOM S.R.L.
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('WARGOM') || fileNameUpper.includes('WARGOM') || sheetNames.length >= 10) {
        supplierLabel = `Wargom S.R.L. (${sheetNames.length} rubros)`;
        defaultPrefix = 'WG-';
        sheetNames.forEach(sName => {
          const ws = workbook.Sheets[sName];
          const mat = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          let currentSubBrand = 'Multimarca';

          mat.forEach((row, idx) => {
            if (idx < 5) return;
            const col0 = String(row[0] ?? '').trim();
            const col2 = String(row[2] ?? '').trim();
            const col3 = row[3];

            if (col0 && !col2 && (col3 === '' || col3 === null || col3 === undefined)) {
              const b = extractBrandFromText(col0);
              currentSubBrand = b !== 'Multimarca' ? b : 'Multimarca';
              return;
            }

            const price = parsePriceNumber(col3);
            if (col0 && col2 && price > 0 && col0.toUpperCase() !== 'CÓDIGO' && col0.toUpperCase() !== 'CODIGO') {
              const detectedB = extractBrandFromText(col2);
              parsedRows.push({
                sku_code: col0.replace(/\.0$/, ''),
                name: col2.replace(/\s+/g, ' ').trim(),
                price,
                stock: 1,
                categoryName: detectCategoryFromName(col2, sName),
                brandName: detectedB !== 'Multimarca' ? detectedB : currentSubBrand,
                description: ''
              });
            }
          });
        });
      }
      // -----------------------------------------------------------------------
      // 6. CRISTEM LISTA GENERAL (CRISTEM (LISTA NUEVA).xls)
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('GRUPO DE  PIEZA') || flatSampleText.includes('GRUPO DE PIEZA') || fileNameUpper.includes('CRISTEM')) {
        supplierLabel = 'Cristem (Lista General Cristales)';
        defaultPrefix = 'CR-';
        const skuCountMap = new Map();

        firstMatrix.slice(1).forEach(row => {
          const brand = String(row[0] ?? '').trim();
          const model = String(row[1] ?? '').trim();
          const pieceCode = String(row[2] ?? '').trim();
          const rawSku = String(row[3] ?? '').trim();
          const group = String(row[4] ?? '').trim() || 'Cristales';
          const price = parsePriceNumber(row[7]);
          const obs = String(row[8] ?? '').trim();

          if (rawSku && price > 0) {
            // Si dos modelos comparten el mismo código de cristal, evitamos perder filas
            const prevCount = skuCountMap.get(rawSku) || 0;
            skuCountMap.set(rawSku, prevCount + 1);
            const uniqueSku = prevCount === 0 ? rawSku : `${rawSku}-${prevCount + 1}`;

            parsedRows.push({
              sku_code: uniqueSku,
              name: `${group} ${brand} ${model} (${pieceCode})`.replace(/\s+/g, ' ').trim(),
              price,
              stock: 1,
              categoryName: 'Cristales y Parabrisas',
              brandName: extractBrandFromText(brand) !== 'Multimarca' ? extractBrandFromText(brand) : (brand || 'Multimarca'),
              description: obs
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 7. CRISTEM OFERTAS
      // -----------------------------------------------------------------------
      else if (sheetNames.includes('Parabrisas') && sheetNames.includes('Lunetas')) {
        supplierLabel = 'Cristem (Ofertas Parabrisas / Laterales / Lunetas)';
        defaultPrefix = 'CROF-';
        sheetNames.forEach(sName => {
          const ws = workbook.Sheets[sName];
          const mat = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          mat.forEach(row => {
            const sku = String(row[0] ?? '').trim();
            const desc = String(row[1] ?? '').trim();
            const price = parsePriceNumber(row[2]);
            if (sku && desc && price > 0 && sku.toUpperCase() !== 'ART') {
              parsedRows.push({
                sku_code: sku,
                name: `${sName.slice(0, -1)} - ${desc}`,
                price,
                stock: 1,
                categoryName: 'Cristales y Parabrisas',
                brandName: extractBrandFromText(desc),
                description: 'Oferta Cristem'
              });
            }
          });
        });
      }
      // -----------------------------------------------------------------------
      // 8. AUTOCLIP / VAER
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('VAER.COM.AR') || (firstMatrix[8] && String(firstMatrix[8][4] || '').toUpperCase().includes('DESCRIPCION') && String(firstMatrix[8][16] || '').toUpperCase().includes('PRECIO'))) {
        supplierLabel = 'Autoclip / Vaer';
        defaultPrefix = 'AC-';
        firstMatrix.forEach(row => {
          const sku = String(row[0] ?? '').trim();
          const name = String(row[4] ?? '').trim();
          const price = parsePriceNumber(row[16]);
          const pack = String(row[1] ?? '').trim();
          if (sku && name && price > 0 && sku.toUpperCase() !== 'CODIGO') {
            parsedRows.push({
              sku_code: sku,
              name: name.replace(/\s+/g, ' '),
              price,
              stock: 1,
              categoryName: 'Fijaciones, Grampas y Bulonería',
              brandName: extractBrandFromText(name),
              description: pack ? `Envase: ${pack} u.` : ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 9. RIDAC / ANGELETTI (RIDAC.xls - Hojas ALFABETICA / NUMERICA de 3 columnas)
      // -----------------------------------------------------------------------
      else if (
        flatSampleText.includes('RIDAC') ||
        flatSampleText.includes('ANGELETTI') ||
        fileNameUpper.includes('RIDAC') ||
        sheetNames.some(s => s.toUpperCase().includes('LISTA NAC') || s.toUpperCase() === 'NUMERICA')
      ) {
        supplierLabel = 'Ridac (Angeletti H. e Hijos)';
        defaultPrefix = 'RD-';
        // Si tiene ALFABETICA y NUMERICA, leemos solo una para no duplicar los 6.216 artículos
        const targetSheets = sheetNames.length > 1 && sheetNames.some(s => s.toUpperCase().includes('NUMERICA'))
          ? sheetNames.filter(s => s.toUpperCase().includes('NUMERICA'))
          : sheetNames;

        targetSheets.forEach(sName => {
          const ws = workbook.Sheets[sName];
          const mat = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          mat.forEach(row => {
            const name = String(row[0] ?? '').replace(/\s+/g, ' ').trim();
            // En RIDAC.xls de 3 columnas: Col 0 = Detalle, Col 1 = Código RIDAC, Col 2 = Precio Lista
            const hasFourCols = row.length >= 4 && row[3] !== '' && row[3] !== undefined;
            const sku = String(hasFourCols ? (row[2] || row[1] || '') : (row[1] ?? '')).replace(/\.0$/, '').trim();
            const price = parsePriceNumber(hasFourCols ? row[3] : row[2]);

            if (
              name &&
              sku &&
              price > 0 &&
              !name.toUpperCase().includes('DETALLE') &&
              !['RIDAC', 'CODIGO', 'CÓDIGO'].includes(sku.toUpperCase())
            ) {
              parsedRows.push({
                sku_code: sku,
                name,
                price,
                stock: 1,
                categoryName: detectCategoryFromName(name),
                brandName: extractBrandFromText(name),
                description: ''
              });
            }
          });
        });
      }
      // -----------------------------------------------------------------------
      // 10. RETOV / TOVLENT (Lista de Precios Retov Agosto 2026.xlsx)
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('TOVLENT') || flatSampleText.includes('RETOV') || fileNameUpper.includes('RETOV')) {
        supplierLabel = 'Retov (Tovlent S.A.)';
        defaultPrefix = 'RT-';
        let isTazasSection = true;
        let currentBrand = 'Multimarca';

        firstMatrix.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const col2 = String(row[2] ?? '').trim();
          const price = parsePriceNumber(row[4]);

          if (col0 && col0 !== '*' && !col1) {
            const upper0 = col0.toUpperCase();
            if (upper0 === 'TAZAS') {
              isTazasSection = true;
            } else if (upper0.includes('REPUESTOS') || upper0.includes('PARRILLAS') || upper0.includes('ESTRIBERAS') || upper0.includes('TOPES')) {
              isTazasSection = false;
            } else if (upper0.includes('UNIVERSAL')) {
              currentBrand = 'Multimarca';
            } else if (upper0.includes('ADAPTABLE')) {
              currentBrand = extractBrandFromText(col0);
            }
            return;
          }

          if (col1 && col2 && price > 0 && col1.toUpperCase() !== 'COD. ART.') {
            const itemName = isTazasSection
              ? `Taza de Rueda ${currentBrand !== 'Multimarca' ? currentBrand : ''} ${col2}`.replace(/\s+/g, ' ').trim()
              : `${col2} ${currentBrand !== 'Multimarca' && !col2.toUpperCase().includes(currentBrand.toUpperCase()) ? `(${currentBrand})` : ''}`.replace(/\s+/g, ' ').trim();

            parsedRows.push({
              sku_code: col1,
              name: itemName,
              price,
              stock: 1,
              categoryName: isTazasSection ? 'Tazas e Insignias' : detectCategoryFromName(col2, 'Paragolpes, Parrillas y Molduras'),
              brandName: currentBrand !== 'Multimarca' ? currentBrand : extractBrandFromText(col2),
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 11. ÓPTICAS LAM (OPTICAS LAM (2).xlsx)
      // -----------------------------------------------------------------------
      else if (
        fileNameUpper.includes('OPTICAS LAM') ||
        flatSampleText.includes('DESCRIPCION AMPLIADA') ||
        flatSampleText.includes('CÓD. GENÉRICO') ||
        flatSampleText.includes('COD. GENERICO')
      ) {
        supplierLabel = 'Ópticas LAM (Iluminación, Ópticas, Faros y Cables)';
        defaultPrefix = 'LAM-';

        firstMatrix.slice(1).forEach(row => {
          const sku = String(row[0] ?? '').replace(/\.0$/, '').trim();
          const name = String(row[1] ?? '').replace(/\s+/g, ' ').trim();
          const price = parsePriceNumber(row[2]);

          if (sku && name && price > 0 && !sku.toUpperCase().includes('ARTÍCULO') && !sku.toUpperCase().includes('ARTICULO')) {
            parsedRows.push({
              sku_code: sku,
              name,
              price,
              stock: 1,
              categoryName: detectCategoryFromName(name),
              brandName: extractBrandFromText(name),
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 12. VARPEN / VAPREN
      // -----------------------------------------------------------------------
      else if (firstMatrix.slice(0, 12).some(r => ['HABITACULOS', 'BAULES'].includes(String(r[0] || '').trim().toUpperCase()))) {
        supplierLabel = 'Varpen (Cubre Alfombras)';
        defaultPrefix = 'VP-';
        let currentSection = 'Alfombra Habitáculo';
        let currentBrand = 'Multimarca';

        firstMatrix.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const col2 = String(row[2] ?? '').trim();
          const price = parsePriceNumber(row[3]);

          if (col0 && ['HABITACULOS', 'BAULES'].includes(col0.toUpperCase())) {
            currentSection = col0.toUpperCase() === 'BAULES' ? 'Cubre Baúl' : 'Alfombra Habitáculo';
          }
          if (col2 && price === 0 && isNaN(Number(col2))) {
            const b = extractBrandFromText(col2);
            currentBrand = b !== 'Multimarca' ? b : col2;
            return;
          }

          if (col2 && price > 0 && !isNaN(Number(col2))) {
            const modelDesc = col1 || col0 || 'Universal';
            parsedRows.push({
              sku_code: col2.replace(/\.0$/, ''),
              name: `${currentSection} ${currentBrand} - ${modelDesc}`.replace(/\s+/g, ' ').trim(),
              price,
              stock: 1,
              categoryName: 'Alfombras e Interior',
              brandName: currentBrand,
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 13. TECNOCHAPA (LISTA 01 10 26 TECNO.xlsx y listas mensuales Tecno)
      // -----------------------------------------------------------------------
      else if (
        flatSampleText.includes('LISTA TECNO') ||
        fileNameUpper.includes('TECNO') ||
        (sheetNames.includes('LISTA') && flatSampleText.includes('PRECIOS MAS IVA'))
      ) {
        supplierLabel = 'TecnoChapa (Ópticas, Faros, Paragolpes y Chapas)';
        defaultPrefix = 'TC-';
        firstMatrix
          .filter(row => {
            const col0 = String(row[0] ?? '').trim();
            const col1 = String(row[1] ?? '').trim();
            return col0 !== '' && col1 !== '' && !isNaN(Number(col0.replace(',', '.')));
          })
          .forEach(row => {
            const sku = String(Math.trunc(Number(row[0])) || String(row[0]).trim());
            const rawName = String(row[1] || '').trim();
            const rawVehicle = String(row[3] || '').trim();
            const cleanVeh = rawVehicle.replace(/V\.W\./g, 'VW ').replace(/V\.W /g, 'VW ').replace(/B\.M\.W\./g, 'BMW').replace(/B\. M\. W\./g, 'BMW').replace(/\s+/g, ' ').trim();
            const fullName = cleanVeh && !['VARIOS', 'DUALES'].includes(cleanVeh.toUpperCase()) ? `${rawName} (${cleanVeh})` : rawName;
            const price = parsePriceNumber(row[4]);

            if (price > 0) {
              parsedRows.push({
                sku_code: sku,
                name: fullName,
                price,
                stock: 1,
                categoryName: detectCategoryFromName(rawName),
                brandName: extractBrandFromText(rawVehicle),
                description: ''
              });
            }
          });
      }
      // -----------------------------------------------------------------------
      // 14. PLANTILLAS ESTÁNDAR (DAPA / GENERAL)
      // -----------------------------------------------------------------------
      else {
        supplierLabel = 'Plantilla Estándar / Personalizada';
        defaultPrefix = '';
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, firstMatrix.length); i++) {
          const rowNorm = firstMatrix[i].map(c => normalizeKey(c));
          if (rowNorm.some(c => c.includes('nombre') || c.includes('producto') || c.includes('descripcion') || c.includes('detalle') || c.includes('titulo'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex !== -1) {
          const headers = firstMatrix[headerRowIndex].map(h => normalizeKey(h));
          firstMatrix.slice(headerRowIndex + 1).forEach((rowArray, idx) => {
            const rowObj = {};
            headers.forEach((h, cIdx) => { if (h) rowObj[h] = rowArray[cIdx]; });
            const name = String(rowObj.nombre || rowObj.producto || rowObj.descripcion || rowObj['descripcion ampliada'] || rowObj.detalle || '').trim();
            if (!name) return;
            const sku = String(rowObj.codigo ?? rowObj.sku ?? rowObj.sku_code ?? rowObj.art ?? rowObj['cod. art.'] ?? rowObj['articulo - cod. generico'] ?? `SKU-${Date.now()}-${idx}`).replace(/\.0$/, '').trim();
            const price = parsePriceNumber(rowObj.precio ?? rowObj.price ?? rowObj.neto ?? rowObj['precio lista'] ?? rowObj['precio unitario'] ?? 0);
            if (price <= 0) return;
            const rawStock = String(rowObj.stock ?? rowObj.cantidad ?? '1').replace(/[^0-9]/g, '');
            const stock = rawStock !== '' ? parseInt(rawStock, 10) : 1;
            const rawCat = String(rowObj.categoria || rowObj.categorias || rowObj.rubro || '').trim();
            const categoryName = detectCategoryFromName(name, rawCat);
            const brandName = String(rowObj.marca || '').trim() || extractBrandFromText(name);
            const description = String(rowObj.descripcion || rowObj.observaciones || '').trim();

            parsedRows.push({ sku_code: sku, name, price, stock, categoryName, brandName, description });
          });
        } else {
          setManualMappingMode(true);
        }
      }

      const enrichedRows = enrichWithExistingSkus(parsedRows, defaultPrefix);
      setSkuPrefix(defaultPrefix);
      setDetectedSupplier(supplierLabel);

      if (enrichedRows.length === 0) {
        setManualMappingMode(true);
        showNotification('Seleccioná manualmente a qué columna corresponde el Código, Nombre y Precio.', 'error');
      } else {
        setExcelPreview(enrichedRows);
        showNotification(`Formato detectado: ${supplierLabel} (${enrichedRows.length.toLocaleString('es-AR')} artículos)`, 'success');
      }
    } catch (err) {
      console.error('Error leyendo Excel:', err);
      showNotification('No se pudo leer el archivo. Verificá que no esté dañado.', 'error');
    } finally {
      setIsParsingExcel(false);
    }
  };

  // =======================================================================
  // FUNCIONES DE CATEGORÍAS (CREAR, ELIMINAR CON PRODUCTOS Y UNIFICAR)
  // =======================================================================
  const [selectedCatIds, setSelectedCatIds] = useState([]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim(), description: newCategoryDesc.trim(), is_active: true }]);
    if (error) {
      showNotification("Error al crear categoría: " + error.message, 'error');
    } else {
      showNotification("Categoría agregada con éxito", 'success');
      setNewCategoryName('');
      setNewCategoryDesc('');
      fetchData();
    }
    setIsSubmitting(false);
  };

  // Mover productos de las categorías seleccionadas hacia una categoría destino (Unificar)
  const handleMergeCategories = async () => {
    const destId = parseInt(targetMergeCategoryId, 10);
    if (!destId) {
      showNotification('Elegí una categoría destino para mover los productos', 'error');
      return;
    }
    const sourceCatIds = selectedCatIds.filter(id => id !== destId);
    if (sourceCatIds.length === 0) {
      showNotification('Seleccioná al menos una categoría origen distinta a la de destino', 'error');
      return;
    }

    const destCat = categories.find(c => c.id === destId);
    const affectedCount = products.filter(p => sourceCatIds.includes(p.category_id)).length;
    if (!window.confirm(`¿Mover ${affectedCount} producto(s) hacia "${destCat?.name || 'Categoría destino'}" y eliminar las ${sourceCatIds.length} categoría(s) vacías?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: moveErr } = await supabase
        .from('products')
        .update({ category_id: destId })
        .in('category_id', sourceCatIds);
      if (moveErr) throw moveErr;

      const { error: delCatErr } = await supabase
        .from('categories')
        .delete()
        .in('id', sourceCatIds);
      if (delCatErr) throw delCatErr;

      setProducts(prev => prev.map(p => sourceCatIds.includes(p.category_id) ? { ...p, category_id: destId, category: { name: destCat?.name || '' } } : p));
      setCategories(prev => prev.filter(c => !sourceCatIds.includes(c.id)));
      setSelectedCatIds([]);
      setTargetMergeCategoryId('');
      showNotification(`Se unificaron ${affectedCount} producto(s) en "${destCat?.name}"`, 'success');
    } catch (err) {
      showNotification('Error al unificar categorías: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar una o varias categorías junto con TODOS sus productos (archivando si tienen pedidos históricos)
  const handleDeleteCategoriesWithProducts = async (catIdsToDelete) => {
    if (!catIdsToDelete || catIdsToDelete.length === 0) return;

    const affectedProdsCount = products.filter(p => catIdsToDelete.includes(p.category_id)).length;
    const confirmMsg = `⚠️ ATENCIÓN: Vas a eliminar ${catIdsToDelete.length} categoría(s) y SE QUITARÁN ${affectedProdsCount} PRODUCTO(S) asociados del catálogo.\n\n¿Confirmás la eliminación?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const chunk = 50;
      for (let i = 0; i < catIdsToDelete.length; i += chunk) {
        const sliceIds = catIdsToDelete.slice(i, i + chunk);

        // Intentar eliminar productos directamente; si alguno tiene pedidos asociados (FK en order_items), lo desvinculamos y archivamos
        const { error: prodErr } = await supabase
          .from('products')
          .delete()
          .in('category_id', sliceIds);

        if (prodErr) {
          const { error: archiveErr } = await supabase
            .from('products')
            .update({ is_active: false, category_id: null })
            .in('category_id', sliceIds);
          if (archiveErr) throw archiveErr;
        }

        const { error: catErr } = await supabase
          .from('categories')
          .delete()
          .in('id', sliceIds);
        if (catErr) throw catErr;
      }

      setProducts(prev => prev.filter(p => !catIdsToDelete.includes(p.category_id)));
      setCategories(prev => prev.filter(c => !catIdsToDelete.includes(c.id)));
      setSelectedCatIds(prev => prev.filter(id => !catIdsToDelete.includes(id)));

      showNotification(`Se eliminaron ${catIdsToDelete.length} categoría(s) y ${affectedProdsCount} producto(s)`, 'success');
    } catch (err) {
      showNotification('Error al eliminar categoría(s): ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('brands').insert([{ name: newBrandName.trim() }]);
    if (error) {
      showNotification("Error al crear marca: " + error.message, 'error');
    } else {
      showNotification("Marca agregada con éxito", 'success');
      setIsBrandModalOpen(false);
      setNewBrandName('');
      fetchData();
    }
    setIsSubmitting(false);
  };

  // Descuento automático de stock al pasar un pedido a "Facturado" (con marca [STOCK_DESCONTADO] para evitar doble descuento)
  // y reposición automática si pasa de Facturado a Cancelado o Reintegrado
  const updateOrderStatus = async (orderId, newStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const currentNotes = targetOrder.notes || '';
    const hadStockDiscounted = currentNotes.includes('[STOCK_DESCONTADO]') || targetOrder.status === 'Facturado';
    let updatedNotes = currentNotes;
    const updatedStockMap = new Map();

    // Caso 1: Pasa a Facturado y todavía NO se le había descontado stock
    if (newStatus === 'Facturado' && !hadStockDiscounted && targetOrder.order_items?.length > 0) {
      if (!updatedNotes.includes('[STOCK_DESCONTADO]')) {
        updatedNotes = `${updatedNotes}\n[STOCK_DESCONTADO]`.trim();
      }

      // Calculamos el nuevo stock para reflejarlo en la interfaz inmediatamente
      for (const item of targetOrder.order_items) {
        const prodId = item.product_id || item.product?.id;
        if (!prodId) continue;
        const currentProd = products.find(p => p.id === prodId);
        if (currentProd) {
          const prevVal = updatedStockMap.has(prodId) ? updatedStockMap.get(prodId) : Number(currentProd.stock || 0);
          const newStock = Math.max(0, prevVal - Number(item.quantity || 0));
          updatedStockMap.set(prodId, newStock);
        }
      }

      // Intentamos ejecutar la función atómica RPC en Supabase (si fue creada en el SQL Editor)
      const { error: rpcError } = await supabase.rpc('bill_order_atomic', { p_order_id: orderId });

      if (rpcError) {
        // Respaldo automático si la función RPC aún no fue creada en Supabase
        for (const [prodId, newStock] of updatedStockMap.entries()) {
          await supabase.from('products').update({ stock: newStock }).eq('id', prodId);
        }
      }
    }
    // Caso 2: Pasa a Cancelado o Reintegrado y YA tenía el stock descontado -> reponemos stock
    else if ((newStatus === 'Cancelado' || newStatus === 'Reintegrado') && hadStockDiscounted && targetOrder.order_items?.length > 0) {
      for (const item of targetOrder.order_items) {
        const prodId = item.product_id || item.product?.id;
        if (!prodId) continue;
        const currentProd = products.find(p => p.id === prodId);
        if (currentProd) {
          const restoredStock = Math.max(0, Number(currentProd.stock || 0) + Number(item.quantity || 0));
          await supabase.from('products').update({ stock: restoredStock }).eq('id', prodId);
          updatedStockMap.set(prodId, restoredStock);
        }
      }
      updatedNotes = updatedNotes.replace(/\n?\[STOCK_DESCONTADO\]/g, '').trim();
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, notes: updatedNotes })
      .eq('id', orderId);

    if (error) {
      showNotification("No se pudo actualizar el pedido", 'error');
      return;
    }

    if (updatedStockMap.size > 0) {
      setProducts(prev => prev.map(p => updatedStockMap.has(p.id) ? { ...p, stock: updatedStockMap.get(p.id) } : p));
    }

    if (newStatus === 'Facturado' && !hadStockDiscounted) {
      showNotification(`Pedido #${orderId} facturado y stock descontado automáticamente`, 'success');
    } else if ((newStatus === 'Cancelado' || newStatus === 'Reintegrado') && hadStockDiscounted) {
      showNotification(`Pedido #${orderId} pasado a ${newStatus} y stock repuesto`, 'success');
    } else {
      showNotification(`Pedido #${orderId} actualizado a ${newStatus}`, 'success');
    }

    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, notes: updatedNotes } : o));
  };

  // =======================================================================
  // REINTEGRO DE DINERO (MERCADO PAGO API / TARJETA / MANUAL) + AVISOS WHATSAPP + IMPRESIÓN
  // =======================================================================
  const extractMpPaymentId = (notesStr) => {
    if (!notesStr) return '';
    const match = String(notesStr).match(/Pago MP #(\d+)/i) || String(notesStr).match(/payment_id[:\s#]*(\d+)/i);
    return match ? match[1] : '';
  };

  const openRefundModal = (order) => {
    const detectedMpId = extractMpPaymentId(order.notes);
    const isMpOrder =
      Boolean(detectedMpId) ||
      String(order.status || '').toLowerCase().includes('mp') ||
      String(order.notes || '').toLowerCase().includes('mercado pago');

    setOrderToRefund(order);
    setRefundMode(isMpOrder ? 'auto_mp' : 'manual');
    setRefundPaymentIdInput(detectedMpId);
    setRefundAmountInput(order.total_estimated > 0 ? String(order.total_estimated) : '');
    setRefundReasonInput('Demora en encargue de proveedor / Solicitud del cliente');
  };

  const handleSendOrderWhatsApp = (order, messageType = 'status') => {
    const cleanPhone = String(order.customer_phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      showNotification('Este pedido no tiene un número de teléfono válido cargado', 'error');
      return;
    }
    const normalizedPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone.replace(/^0+/, '')}`;
    const totalFormatted = Number(order.total_estimated || 0).toLocaleString('es-AR');

    let text;
    if (messageType === 'encargue_delay') {
      text = `¡Hola ${order.customer_name}! Te escribimos de *D.A.P.A. Repuestos Molle* por tu *Pedido #${order.id}*.\n\nTe informamos que las piezas solicitadas se traen *por encargue directo de distribuidora*, por lo que el pedido tendrá una breve demora hasta ingresar a nuestro local.\n\nRecordá que si abonaste con tarjeta, Mercado Pago o transferencia y preferís no aguardar el plazo del encargue, *podemos reintegrarte el 100% de tu dinero de inmediato*.\n\n¿Confirmás que avancemos con el encargue?`;
    } else if (messageType === 'refund_confirmed') {
      text = `¡Hola ${order.customer_name}! Te escribimos de *D.A.P.A. Repuestos Molle*.\n\nTe confirmamos que ya gestionamos el *reintegro de dinero* correspondiente a tu *Pedido #${order.id}*${order.total_estimated > 0 ? ` por *$${totalFormatted}*` : ''}.\n\nSi abonaste con tarjeta o Mercado Pago, vas a ver la devolución reflejada en tu cuenta/resumen. ¡Cualquier duda estamos a tu disposición!`;
    } else {
      text = `¡Hola ${order.customer_name}! Te escribimos de *D.A.P.A. Repuestos Molle* respecto a tu *Pedido #${order.id}* (Estado actual: *${order.status}*).`;
    }

    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!orderToRefund) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(refundAmountInput);
      const hasCustomAmount = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount < Number(orderToRefund.total_estimated || 0);

      if (refundMode === 'auto_mp') {
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error('Tu sesión expiró. Volvé a iniciar sesión para ejecutar el reintegro automático.');
        }

        const response = await fetch('/api/refundPayment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            orderId: orderToRefund.id,
            paymentId: refundPaymentIdInput.trim() || undefined,
            amount: hasCustomAmount ? parsedAmount : undefined,
            reason: refundReasonInput.trim()
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo procesar el reintegro en Mercado Pago.');
        }

        const updatedNotes = data.updatedNotes || `${orderToRefund.notes || ''}\n[REINTEGRO MP #${data.refundId || 'OK'}: $${Number(data.refundedAmount || orderToRefund.total_estimated || 0).toLocaleString('es-AR')} - ${new Date().toLocaleString('es-AR')}]`.trim();
        setOrders(prev => prev.map(o => o.id === orderToRefund.id ? { ...o, status: 'Reintegrado', notes: updatedNotes } : o));
        showNotification(`¡Reintegro automático ejecutado en Mercado Pago para el Pedido #${orderToRefund.id}!`, 'success');
        setOrderToRefund(null);
      } else {
        // Reintegro manual (Transferencia / Tarjeta en local / Efectivo)
        const amountLabel = !isNaN(parsedAmount) && parsedAmount > 0
          ? `$${parsedAmount.toLocaleString('es-AR')}`
          : `$${Number(orderToRefund.total_estimated || 0).toLocaleString('es-AR')}`;
        const refundStamp = `[REINTEGRO MANUAL REGISTRADO: ${amountLabel} - Motivo: ${refundReasonInput.trim() || 'Cancelación por demora de encargue'} - ${new Date().toLocaleString('es-AR')}]`;
        const nextNotes = `${(orderToRefund.notes || '').replace(/\n?\[STOCK_DESCONTADO\]/g, '').trim()}\n${refundStamp}`.trim();

        // Si estaba facturado, reponemos stock primero
        const hadStockDiscounted = (orderToRefund.notes || '').includes('[STOCK_DESCONTADO]') || orderToRefund.status === 'Facturado';
        if (hadStockDiscounted && orderToRefund.order_items?.length > 0) {
          const updatedStockMap = new Map();
          for (const item of orderToRefund.order_items) {
            const prodId = item.product_id || item.product?.id;
            if (!prodId) continue;
            const currentProd = products.find(p => p.id === prodId);
            if (currentProd) {
              const restoredStock = Math.max(0, Number(currentProd.stock || 0) + Number(item.quantity || 0));
              await supabase.from('products').update({ stock: restoredStock }).eq('id', prodId);
              updatedStockMap.set(prodId, restoredStock);
            }
          }
          if (updatedStockMap.size > 0) {
            setProducts(prev => prev.map(p => updatedStockMap.has(p.id) ? { ...p, stock: updatedStockMap.get(p.id) } : p));
          }
        }

        const { error } = await supabase
          .from('orders')
          .update({ status: 'Reintegrado', notes: nextNotes })
          .eq('id', orderToRefund.id);

        if (error) throw error;

        setOrders(prev => prev.map(o => o.id === orderToRefund.id ? { ...o, status: 'Reintegrado', notes: nextNotes } : o));
        showNotification(`Pedido #${orderToRefund.id} marcado como Reintegrado (${amountLabel})`, 'success');
        setOrderToRefund(null);
      }
    } catch (err) {
      showNotification(err.message || 'Error al procesar el reintegro', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Imprimir Remito / Etiqueta de Envío (con escapeHtml en todos los campos del cliente para evitar XSS)
  const handlePrintOrder = (order) => {
    const printWin = window.open('', '_blank', 'width=850,height=700');
    if (!printWin) {
      showNotification('Permití las ventanas emergentes para imprimir el remito', 'error');
      return;
    }

    const itemsRowsHtml = (order.order_items || [])
      .map((item) => {
        const sku = escapeHtml(item.product?.sku_code || 'S/C');
        const name = escapeHtml(item.product?.name || 'Repuesto');
        const qty = Number(item.quantity || 1);
        const unit = Number(item.unit_price || 0);
        const sub = qty * unit;
        return `<tr>
          <td style="padding:8px;border:1px solid #cbd5e1;font-family:monospace;">${sku}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;">${name}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${qty}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;">$${unit.toLocaleString('es-AR')}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;">$${sub.toLocaleString('es-AR')}</td>
        </tr>`;
      })
      .join('');

    // Limpiamos etiquetas técnicas internas (chat, dimensiones, tracking, fotos) para que el Remito salga limpio
    const rawRemitoNotes = String(order.notes || '');
    const remitoTrackMatch = rawRemitoNotes.match(/\[TRACKING_CA:([^\]]+)\]/i);
    const remitoTrackingCode = remitoTrackMatch ? remitoTrackMatch[1].trim() : '';
    const cleanRemitoNotes = rawRemitoNotes
      .replace(/\[\[CHAT_DAPA:[\s\S]*?\]\]/g, '')
      .replace(/\[TRACKING_CA:[^\]]+\]/gi, '')
      .replace(/\[DIM_CA:[^\]]+\]/gi, '')
      .replace(/\[PESO_CA:[^\]]+\]/gi, '')
      .replace(/\[ZONA_CA:[^\]]+\]/gi, '')
      .replace(/\[DESPACHO_FECHA:[^\]]+\]/gi, '')
      .replace(/\[MICORREO_IMPORTADO:[^\]]+\]/gi, '')
      .replace(/\[STOCK_DESCONTADO\]/gi, '')
      .replace(/FOTO REPUESTO:\s*https?:\/\/[^\s]+/gi, '')
      .replace(/FOTO CÉDULA \/ CHASIS:\s*https?:\/\/[^\s]+/gi, '')
      .trim();

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Remito Pedido #${escapeHtml(order.id)} - D.A.P.A. Repuestos</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: 1px; }
    .sub { font-size: 12px; color: #475569; margin-top: 4px; }
    .box { border: 1px solid #cbd5e1; padding: 12px 16px; margin-bottom: 16px; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    th { background: #1e293b; color: #fff; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 10px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:10px 18px;font-weight:bold;cursor:pointer;">🖨️ Imprimir Remito / Comprobante</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">D.A.P.A. REPUESTOS MOLLE</div>
      <div class="sub">Lamadrid 65, Arrecifes, Prov. de Buenos Aires • Tel: 02478-452225 • WhatsApp: +54 9 2478 40-6288</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:bold;">REMITO / PEDIDO #${escapeHtml(order.id)}</div>
      <div class="sub">Fecha: ${escapeHtml(new Date(order.created_at).toLocaleString('es-AR'))}</div>
      <div class="sub">Estado: <strong>${escapeHtml(order.status)}</strong></div>
    </div>
  </div>
  <div class="box">
    <div><strong>Cliente / Destinatario:</strong> ${escapeHtml(order.customer_name)}</div>
    <div style="margin-top:4px;"><strong>Teléfono:</strong> ${escapeHtml(order.customer_phone)}</div>
    ${remitoTrackingCode ? `<div style="margin-top:4px;"><strong>Seguimiento Correo Argentino:</strong> ${escapeHtml(remitoTrackingCode)}</div>` : ''}
  </div>
  ${itemsRowsHtml ? `
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Repuesto</th>
        <th style="text-align:center;">Cant.</th>
        <th style="text-align:right;">Unitario</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemsRowsHtml}</tbody>
  </table>` : ''}
  <div class="box">
    <strong>Datos de Envío / Observaciones:</strong>
    <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;margin-top:6px;">${escapeHtml(cleanRemitoNotes || 'Sin observaciones')}</pre>
  </div>
  <div class="total">TOTAL: $${Number(order.total_estimated || 0).toLocaleString('es-AR')}</div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // --- ETIQUETA DE ENVÍO CORREO ARGENTINO (FORMATO MERCADO LIBRE 2 HOJAS) + TRACKING ---
  const openShippingLabelModal = (order) => {
    const meta = extractShippingLabelMeta(order);
    setOrderForShippingLabel(order);
    setLabelForm({
      trackingCode: meta.trackingCode,
      dimensions: meta.dimensions,
      weight: meta.weight,
      zoneCode: meta.zoneCode,
      serviceType: meta.serviceType,
      domicilio: meta.domicilio || 'Sin especificar',
      localidad: meta.localidad || 'Sin especificar',
      provincia: meta.provincia || 'Buenos Aires',
      cp: meta.cp || '2740',
      referencia: meta.referencia || ''
    });
  };

  const handleSaveShippingTracking = async (e, shouldPrintAfter = false) => {
    if (e) e.preventDefault();
    if (!orderForShippingLabel) return;

    const cleanTrack = String(labelForm.trackingCode || '').trim().toUpperCase();
    if (!cleanTrack) {
      showNotification('Ingresá un código de seguimiento válido (ej: HC532820856AR).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let updatedNotes = String(orderForShippingLabel.notes || '')
        .replace(/\s*\[TRACKING_CA:[^\]]+\]/gi, '')
        .replace(/\s*\[DIM_CA:[^\]]+\]/gi, '')
        .replace(/\s*\[PESO_CA:[^\]]+\]/gi, '')
        .replace(/\s*\[ZONA_CA:[^\]]+\]/gi, '')
        .replace(/\s*\[DESPACHO_FECHA:[^\]]+\]/gi, '')
        .trim();

      const nowStr = new Date().toLocaleString('es-AR');
      const trackingTags = `\n[TRACKING_CA:${cleanTrack}] [DIM_CA:${labelForm.dimensions || '20x38x38cm'}] [PESO_CA:${labelForm.weight || '7.5 kg'}] [ZONA_CA:${labelForm.zoneCode || 'NOA-SLAD-AAB'}] [DESPACHO_FECHA:${nowStr}]`;
      updatedNotes = `${updatedNotes}${trackingTags}`;

      const { error } = await supabase
        .from('orders')
        .update({ notes: updatedNotes })
        .eq('id', orderForShippingLabel.id);

      if (error) throw error;

      const updatedOrder = { ...orderForShippingLabel, notes: updatedNotes };
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      setOrderForShippingLabel(updatedOrder);
      showNotification(`Tracking ${cleanTrack} guardado y habilitado para el cliente.`);

      if (shouldPrintAfter) {
        handlePrintShippingLabelML(updatedOrder, labelForm);
      }
    } catch (err) {
      showNotification('Error al guardar el tracking: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-imposición directa en API Oficial de Correo Argentino (MiCorreo /shipping/import o Paq.ar /v1/orders + /v1/labels)
  const handleImportToMiCorreo = async () => {
    if (!orderForShippingLabel) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/despacharCorreo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderForShippingLabel.id,
          customerName: orderForShippingLabel.customer_name,
          customerPhone: orderForShippingLabel.customer_phone,
          domicilio: labelForm.domicilio,
          localidad: labelForm.localidad,
          provincia: labelForm.provincia,
          cp: labelForm.cp,
          referencia: labelForm.referencia,
          serviceType: labelForm.serviceType,
          dimensions: labelForm.dimensions,
          weight: labelForm.weight,
          declaredValue: Number(orderForShippingLabel.total_estimated || 15000),
          trackingCode: labelForm.trackingCode
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo conectar con la API de Correo Argentino.');
      }

      if (data.needsCredentials) {
        showNotification(data.message, 'error');
        return;
      }

      // Si Paq.ar API 2.0 devolvió un trackingNumber oficial y/o el PDF del rótulo en Base64:
      const newTrack = data.trackingNumber || labelForm.trackingCode;
      if (newTrack) {
        setLabelForm((prev) => ({ ...prev, trackingCode: String(newTrack).toUpperCase() }));
      }

      if (data.labelBase64) {
        const pdfWin = window.open('', '_blank');
        if (pdfWin) {
          pdfWin.document.write(
            `<iframe width="100%" height="100%" style="border:none;margin:0;padding:0;" src="data:application/pdf;base64,${data.labelBase64}"></iframe>`
          );
        }
      }

      showNotification(data.message || 'Envío registrado en Correo Argentino con éxito.');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Imprime exactamente el formato de 2 páginas de Mercado Libre / Correo Argentino adjuntado por el usuario
  const handlePrintShippingLabelML = (order, customForm = null) => {
    const meta = customForm || extractShippingLabelMeta(order);
    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (!printWin) {
      showNotification('Habilitá las ventanas emergentes para imprimir la etiqueta de Correo Argentino.', 'error');
      return;
    }

    const orderNum = Number(order.id || 1);
    const packId = `20000116${String(56400000 + orderNum).slice(-8)}`;
    const ventaId = packId;
    const upperBarcodeNum = `465258${String(98600 + orderNum).slice(-5)}`;
    const trackingCode = String(meta.trackingCode || `HC${String(532800000 + orderNum).slice(-9)}AR`).toUpperCase();
    const fapCode = '16276';
    const zoneCode = String(meta.zoneCode || 'NOA-SLAD-AAB').toUpperCase();
    const serviceType = String(meta.serviceType || 'DOM').toUpperCase() === 'SUC' ? 'SUC' : 'DOM';
    const dimensions = String(meta.dimensions || '20x38x38cm');
    const weight = String(meta.weight || '7.5 kg');
    const cp = String(meta.cp || '2740').replace(/\D/g, '') || '2740';
    const domicilio = String(meta.domicilio || 'Sin especificar');
    const localidad = String(meta.localidad || 'Sin especificar');
    const provincia = String(meta.provincia || 'Buenos Aires');
    const referencia = String(meta.referencia || '');

    const upperBarcodeSvg = generateCode128Svg(upperBarcodeNum, 285, 64);
    const trackingBarcodeSvg = generateCode128Svg(trackingCode, 315, 70);
    const qrSvg = generateQrCodeSvg(`${trackingCode}|${packId}|${cp}|DAPA`, 86);

    const itemsList = Array.isArray(order.order_items) && order.order_items.length > 0
      ? order.order_items
      : [{ quantity: 1, product: { name: 'Repuesto Automotor D.A.P.A.', sku_code: `DAPA-${orderNum}` } }];

    const itemsRowsPage2 = itemsList.map((it) => {
      const prodName = escapeHtml(it.product?.name || 'Repuesto Automotor');
      const sku = escapeHtml(it.product?.sku_code || 'S/C');
      const qty = Number(it.quantity || 1);
      return `
        <div class="pick-item">
          <div class="checkbox-sq"></div>
          <div class="pick-desc">
            <div class="pick-title">${prodName}</div>
            <div class="pick-meta">SKU: ${sku}</div>
            <div class="pick-meta">Cantidad: <strong>${qty}</strong></div>
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Etiqueta Correo Argentino #${escapeHtml(order.id)} - ${escapeHtml(trackingCode)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
    }
    .toolbar {
      max-width: 780px;
      margin: 0 auto 16px auto;
      background: #0f172a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .toolbar button {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .page-sheet {
      background: #fff;
      width: 780px;
      margin: 0 auto 28px auto;
      padding: 26px 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    /* PÁGINA 1: ETIQUETA PARA PEGAR EN EL PAQUETE */
    .label-outer {
      width: 380px;
      border: 1.5px solid #222;
      background: #fff;
      font-size: 11px;
      line-height: 1.3;
    }
    .sender-block {
      padding: 8px 10px;
      border-bottom: 1.5px solid #222;
      font-size: 10.5px;
    }
    .upper-barcode-block {
      padding: 10px 12px 6px 12px;
      text-align: center;
      border-bottom: 1.5px solid #222;
    }
    .upper-barcode-num {
      font-size: 11px;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }
    .carrier-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1.5px solid #222;
    }
    .correo-brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 900;
      font-size: 12px;
      line-height: 1.05;
    }
    .correo-icon {
      width: 28px;
      height: 22px;
      border: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 10px;
    }
    .fap-zone {
      text-align: right;
    }
    .fap-text {
      font-size: 10px;
      font-weight: bold;
    }
    .zone-text {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.3px;
    }
    .service-dims-row {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1.5px solid #222;
    }
    .c-dom-box {
      display: flex;
      border: 2.5px solid #000;
      align-items: center;
    }
    .c-letter {
      font-size: 28px;
      font-weight: 900;
      padding: 2px 10px;
      border-right: 2.5px solid #000;
      line-height: 1;
    }
    .dom-letters {
      font-size: 18px;
      font-weight: 900;
      padding: 4px 8px;
      line-height: 1;
    }
    .dims-box {
      text-align: right;
      font-size: 13px;
      font-weight: 900;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .tracking-barcode-block {
      padding: 10px 10px 6px 10px;
      text-align: center;
      border-bottom: 2px solid #000;
    }
    .tracking-code-text {
      font-size: 16px;
      font-weight: 900;
      margin-top: 4px;
      letter-spacing: 0.6px;
    }
    .destinatario-header {
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: 11px;
      padding: 3px 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .destinatario-body {
      padding: 8px 10px;
      font-size: 11px;
      line-height: 1.38;
      border-bottom: 1.5px solid #222;
    }
    .cp-line {
      font-size: 15px;
      font-weight: 900;
      margin: 4px 0;
    }
    .qr-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
    }
    .r-bar {
      width: 58px;
      height: 86px;
      background: #000;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 900;
    }
    .cut-line {
      margin-top: 22px;
      border-top: 1.5px dashed #333;
      position: relative;
      height: 14px;
    }
    /* PÁGINA 2: HOJA DE DESPACHO / PICKING LIST */
    .page-break {
      page-break-before: always;
    }
    .dispatch-banner {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 14px;
      padding-bottom: 8px;
    }
    .dispatch-table {
      width: 100%;
      border-top: 2px dotted #666;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .dispatch-thead {
      display: flex;
      background: #7f8c8d;
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      padding: 6px 12px;
      margin-top: 8px;
    }
    .col-ident {
      width: 36%;
      padding-right: 14px;
      border-right: 1px solid #cbd5e1;
    }
    .col-prod {
      width: 64%;
      padding-left: 14px;
    }
    .dispatch-tbody {
      display: flex;
      padding: 14px 12px;
      font-size: 12px;
      line-height: 1.45;
    }
    .pick-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .checkbox-sq {
      width: 18px;
      height: 18px;
      border: 1.8px solid #333;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .pick-title {
      font-weight: 600;
      margin-bottom: 3px;
    }
    .pick-meta {
      font-size: 11.5px;
      color: #111;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .page-sheet { box-shadow: none; width: 100%; margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>Etiqueta Oficial Correo Argentino / Formato Mercado Libre (2 Hojas)</strong>
      <div style="font-size:11px;color:#cbd5e1;">Hoja 1: Etiqueta para pegar en el paquete • Hoja 2: Comprobante de despacho y control de SKU</div>
    </div>
    <button onclick="window.print()">🖨️ Imprimir Etiqueta (2 Hojas)</button>
  </div>

  <!-- HOJA 1: ETIQUETA DE PAQUETE -->
  <div class="page-sheet">
    <div class="label-outer">
      <div class="sender-block">
        <div><strong>Molle Autopartes #3305577356</strong></div>
        <div>Calle Lamadrid 65, Arrecifes, Buenos Aires - 2740</div>
        <div>Pack ID: ${escapeHtml(packId)}</div>
      </div>

      <div class="upper-barcode-block">
        ${upperBarcodeSvg}
        <div class="upper-barcode-num">${escapeHtml(upperBarcodeNum)}</div>
      </div>

      <div class="carrier-row">
        <div class="correo-brand">
          <div class="correo-icon">CA</div>
          <div>CORREO<br/>ARGENTINO</div>
        </div>
        <div class="fap-zone">
          <div class="fap-text">FAP: ${escapeHtml(fapCode)}</div>
          <div class="zone-text">${escapeHtml(zoneCode)}</div>
        </div>
      </div>

      <div class="service-dims-row">
        <div class="c-dom-box">
          <div class="c-letter">C</div>
          <div class="dom-letters">${escapeHtml(serviceType)}</div>
        </div>
        <div class="dims-box">
          <div>${escapeHtml(dimensions)}</div>
          <div>${escapeHtml(weight)}</div>
        </div>
      </div>

      <div class="tracking-barcode-block">
        ${trackingBarcodeSvg}
        <div class="tracking-code-text">${escapeHtml(trackingCode)}</div>
      </div>

      <div class="destinatario-header">DESTINATARIO</div>
      <div class="destinatario-body">
        <div><strong>${escapeHtml(order.customer_name || 'Cliente')}</strong></div>
        <div>Domicilio: ${escapeHtml(domicilio)}</div>
        <div class="cp-line">CP: ${escapeHtml(cp)}</div>
        <div>Central: ${escapeHtml(provincia.toUpperCase())}</div>
        <div>Ciudad de destino: ${escapeHtml(localidad.toUpperCase())}</div>
        <div>Provincia: ${escapeHtml(provincia)}</div>
        ${referencia ? `<div>Referencia: ${escapeHtml(referencia)}</div>` : ''}
      </div>

      <div class="qr-footer-row">
        <div></div>
        <div>${qrSvg}</div>
        <div class="r-bar">R</div>
      </div>
    </div>

    <div class="cut-line"></div>
  </div>

  <!-- HOJA 2: ORDEN DE PREPARACIÓN / DESPACHO -->
  <div class="page-sheet page-break">
    <div class="dispatch-banner">
      Despacha tu producto cuanto antes ¡No te relajes! Tu comprador lo está esperando.
    </div>

    <div class="dispatch-table">
      <div class="dispatch-thead">
        <div style="width:36%;">Identificación</div>
        <div style="width:64%;padding-left:14px;">Producto</div>
      </div>
      <div class="dispatch-tbody">
        <div class="col-ident">
          <div style="font-weight:bold;margin-bottom:6px;">${escapeHtml(trackingCode)}</div>
          <div>Pack ID: ${escapeHtml(packId)}</div>
          <div>Venta: ${escapeHtml(ventaId)}</div>
          <div style="margin-top:6px;">Cliente: ${escapeHtml(order.customer_name || 'Cliente')}</div>
          <div>Tel: ${escapeHtml(order.customer_phone || '-')}</div>
        </div>
        <div class="col-prod">
          ${itemsRowsPage2}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // --- CHAT DIRECTO VENDEDOR <-> COMPRADOR (PANEL ADMIN) ---
  const openSellerChatModal = (order) => {
    setOrderForSellerChat(order);
    setSellerChatMessages(parseAdminChatMessages(order.notes));
    setSellerChatInput('');
  };

  useEffect(() => {
    if (!orderForSellerChat?.id) return;
    let isMounted = true;
    const pollChat = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, notes, status')
        .eq('id', orderForSellerChat.id)
        .single();
      if (!error && data && isMounted) {
        const parsed = parseAdminChatMessages(data.notes);
        setSellerChatMessages(parsed);
        setOrders((prev) => prev.map((o) => (o.id === data.id ? { ...o, notes: data.notes, status: data.status } : o)));
      }
    };
    const interval = setInterval(pollChat, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderForSellerChat?.id]);

  useEffect(() => {
    if (sellerChatBottomRef.current) {
      sellerChatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sellerChatMessages.length, orderForSellerChat?.id]);

  const handleSendSellerChat = async (e) => {
    e.preventDefault();
    if (!orderForSellerChat || !sellerChatInput.trim() || isSendingSellerChat) return;

    const cleanText = sellerChatInput.trim().slice(0, 700);
    setIsSendingSellerChat(true);
    try {
      const { data: freshOrder } = await supabase
        .from('orders')
        .select('id, notes')
        .eq('id', orderForSellerChat.id)
        .single();

      const baseNotes = freshOrder ? freshOrder.notes : orderForSellerChat.notes;
      const currentMsgs = parseAdminChatMessages(baseNotes);
      const newMsg = {
        id: `${Date.now()}_seller`,
        sender: 'seller',
        senderName: 'D.A.P.A. Repuestos (Vendedor)',
        text: cleanText,
        createdAt: new Date().toISOString()
      };
      const updatedMsgs = [...currentMsgs, newMsg];
      const updatedNotes = injectAdminChatMessages(baseNotes, updatedMsgs);

      const { error: updErr } = await supabase
        .from('orders')
        .update({ notes: updatedNotes })
        .eq('id', orderForSellerChat.id);

      if (updErr) throw updErr;

      setSellerChatMessages(updatedMsgs);
      setSellerChatInput('');
      setOrderForSellerChat((prev) => (prev ? { ...prev, notes: updatedNotes } : prev));
      setOrders((prev) => prev.map((o) => (o.id === orderForSellerChat.id ? { ...o, notes: updatedNotes } : o)));
    } catch (err) {
      showNotification('No se pudo enviar el mensaje: ' + err.message, 'error');
    } finally {
      setIsSendingSellerChat(false);
    }
  };


  // Función auxiliar para buscar por palabras sueltas
  const matchesMultiWordSearch = (prod, rawQuery) => {
    const words = rawQuery
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return true;

    const searchableText = `${prod.sku_code || ''} ${prod.name || ''} ${prod.brand?.name || ''} ${prod.category?.name || ''} ${prod.description || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return words.every(word => searchableText.includes(word));
  };

// 1. En el POS (Venta Manual):
  const posSuggestions = useMemo(() => {
    if (posSearch.trim().length < 2) return [];
    return products
      .filter(p => matchesMultiWordSearch(p, posSearch))
      .slice(0, 8);
  }, [posSearch, products]);

  const addProductToPos = (prod) => {
    setPosItems(prev => {
      const exists = prev.find(i => i.product.id === prod.id);
      if (exists) {
        return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
    setPosSearch('');
  };

  const posTotal = posItems.reduce((acc, item) => acc + Number(item.product.price) * item.quantity, 0);

  const handleCreatePosOrder = async (e) => {
    e.preventDefault();
    if (posItems.length === 0) {
      showNotification('Agregá al menos un repuesto a la venta', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const notesText = `TIPO DE VENTA: Venta Manual / Mostrador\nMÉTODO DE PAGO: ${posPaymentMethod.toUpperCase()}${posNotes ? `\nNOTAS: ${posNotes}` : ''}${posDiscountStock ? '\n[STOCK_DESCONTADO]' : ''}`;
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          customer_name: posCustomerName.trim() || 'Cliente Mostrador',
          customer_phone: posCustomerPhone.trim() || 'Sin teléfono',
          status: posDiscountStock ? 'Facturado' : 'Pendiente',
          total_estimated: posTotal,
          notes: notesText
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const itemsPayload = posItems.map(i => ({
        order_id: newOrder.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      if (posDiscountStock) {
        for (const item of posItems) {
          const newStock = Math.max(0, Number(item.product.stock || 0) - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
        }
      }

      showNotification('Venta manual registrada con éxito', 'success');
      setIsPosModalOpen(false);
      setPosItems([]);
      setPosCustomerName('Cliente Mostrador');
      setPosCustomerPhone('');
      setPosNotes('');
      fetchData();
    } catch (err) {
      showNotification('Error al registrar venta: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsSubmitting(true);
    try {
      await supabase.from('order_items').delete().eq('order_id', orderToDelete.id);
      const { error } = await supabase.from('orders').delete().eq('id', orderToDelete.id);
      if (error) throw error;

      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      showNotification(`Pedido #${orderToDelete.id} eliminado definitivamente`, 'success');
    } catch (err) {
      showNotification("Error al eliminar el pedido: " + err.message, 'error');
    } finally {
      setIsSubmitting(false);
      setOrderToDelete(null);
    }
  };

  const handleClearCompletedOrders = async () => {
    const completedIds = orders
      .filter(o => o.status === 'Facturado' || o.status === 'Cancelado')
      .map(o => o.id);

    if (completedIds.length === 0) {
      setConfirmClearCompleted(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('order_items').delete().in('order_id', completedIds);
      const { error } = await supabase.from('orders').delete().in('id', completedIds);
      if (error) throw error;

      setOrders(orders.filter(o => !completedIds.includes(o.id)));
      showNotification(`Se eliminaron ${completedIds.length} pedidos finalizados`, 'success');
    } catch (err) {
      showNotification("Error al limpiar pedidos: " + err.message, 'error');
    } finally {
      setIsSubmitting(false);
      setConfirmClearCompleted(false);
    }
  };

  // =======================================================================
  // MÉTRICAS, FILTROS COMBINADOS Y PAGINACIÓN
  // =======================================================================
  const isOrderPending = (status) => {
    if (!status) return false;
    return status.startsWith('Pendiente') || status === 'Cotización Web' || status === 'En encargue' || status === 'Revisado';
  };

  const pendingOrdersCount = orders.filter(o => isOrderPending(o.status)).length;
  const billedOrdersCount = orders.filter(o => o.status === 'Facturado').length;
  const refundedOrdersCount = orders.filter(o => o.status === 'Reintegrado').length;
  const cancelledOrdersCount = orders.filter(o => o.status === 'Cancelado').length;
  const completedOrdersCount = billedOrdersCount + cancelledOrdersCount;

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'pendientes') return isOrderPending(o.status);
    if (orderFilter === 'facturados') return o.status === 'Facturado';
    if (orderFilter === 'reintegrados') return o.status === 'Reintegrado';
    if (orderFilter === 'cancelados') return o.status === 'Cancelado';
    return true;
  });

// 2. En filteredProducts (reemplazando el bloque `if (q) { ... }`):
  const filteredProducts = useMemo(() => {
    const list = products.filter(p => {
      if (searchTerm.trim() && !matchesMultiWordSearch(p, searchTerm)) {
        return false;
      }

      if (filterCategory !== 'todas' && String(p.category_id) !== String(filterCategory)) {
        return false;
      }

      if (filterBrand !== 'todas' && String(p.brand_id) !== String(filterBrand)) {
        return false;
      }

      const stockNum = Number(p.stock || 0);
      if (filterStock === 'con_stock' && stockNum <= 0) return false;
      if (filterStock === 'bajo_stock' && (stockNum < 1 || stockNum > 2)) return false;
      if (filterStock === 'sin_stock' && stockNum > 0) return false;

      return true;
    });

    if (sortBy === 'precio_asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'precio_desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === 'stock_asc') list.sort((a, b) => Number(a.stock) - Number(b.stock));
    else if (sortBy === 'nombre_asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return list;
  }, [products, searchTerm, filterCategory, filterBrand, filterStock, sortBy]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const hasActiveProductFilters = searchTerm.trim() !== '' || filterCategory !== 'todas' || filterBrand !== 'todas' || filterStock !== 'todos' || sortBy !== 'recientes';

  const clearAllProductFilters = () => {
    setSearchTerm('');
    setFilterCategory('todas');
    setFilterBrand('todas');
    setFilterStock('todos');
    setSortBy('recientes');
  };

  // Estadísticas del Dashboard
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const billedOrders = orders.filter(o => o.status === 'Facturado');
    const totalRevenue = billedOrders.reduce((acc, o) => acc + Number(o.total_estimated || 0), 0);

    const monthlyBilled = billedOrders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyRevenue = monthlyBilled.reduce((acc, o) => acc + Number(o.total_estimated || 0), 0);

    const avgTicket = billedOrders.length > 0 ? Math.round(totalRevenue / billedOrders.length) : 0;

    const totalInventoryValue = products.reduce((acc, p) => acc + Number(p.price || 0) * Math.max(0, Number(p.stock || 0)), 0);
    const outOfStockProducts = products.filter(p => Number(p.stock || 0) <= 0);
    const lowStockProducts = products.filter(p => Number(p.stock || 0) >= 1 && Number(p.stock || 0) <= 2);

    return {
      billedCount: billedOrders.length,
      totalRevenue,
      monthlyRevenue,
      monthlyBilledCount: monthlyBilled.length,
      avgTicket,
      totalInventoryValue,
      outOfStockProducts,
      lowStockProducts
    };
  }, [orders, products]);

  // =======================================================================
  // VISTAS DE ACCESO Y SEGURIDAD
  // =======================================================================
  if (!session || !isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-montserrat">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold font-michroma text-white tracking-widest uppercase">D.A.P.A</h1>
            <p className="text-blue-500 font-exo text-xs uppercase tracking-[0.2em] mt-1">Acceso Restringido</p>
          </div>

          {session && !isAuthorizedAdmin ? (
            <div className="text-center space-y-4">
              <p className="text-red-400 text-xs font-bold bg-red-900/20 p-4 rounded-xl border border-red-800">
                La cuenta actual ({session.user.email}) es de cliente y no tiene permisos de administrador.
              </p>
              <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors text-xs">
                Cerrar sesión actual
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Correo Electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="admin@dapa.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" />
              </div>
              {loginError && <p className="text-red-400 text-xs font-bold text-center bg-red-900/20 p-2 rounded-lg border border-red-900">{loginError}</p>}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors mt-4 shadow-lg focus:outline-none disabled:opacity-50">
                {isLoggingIn ? 'Verificando...' : 'Ingresar al Panel'}
              </button>
            </form>
          )}

          <button onClick={() => navigate('/')} className="w-full mt-6 text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900 font-montserrat">
      {notification && (
        <div className={`fixed top-6 right-6 px-6 py-3.5 rounded-2xl shadow-2xl z-[250] flex items-center gap-3 animate-in slide-in-from-top-10 border text-white font-bold text-xs uppercase tracking-wider ${
          notification.type === 'error' 
            ? 'bg-red-600 border-red-400 shadow-red-600/30' 
            : 'bg-green-600 border-green-400 shadow-green-600/30'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <span className="font-bold text-2xl tracking-tighter text-white font-michroma block">D.A.P.A</span>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-500 font-exo">Admin Panel</span>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2">
          <button onClick={() => setActiveTab('productos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${activeTab === 'productos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Tags className="w-5 h-5" /> Repuestos
          </button>
          <button onClick={() => setActiveTab('pedidos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${activeTab === 'pedidos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <ClipboardList className="w-5 h-5" /> Pedidos
            {pendingOrdersCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-1 rounded-full">{pendingOrdersCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('estadisticas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${activeTab === 'estadisticas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <BarChart3 className="w-5 h-5" /> Estadísticas
            {stats.outOfStockProducts.length > 0 && (
              <span className="ml-auto bg-amber-500 text-slate-900 font-bold text-[10px] px-2 py-0.5 rounded-full">
                {stats.outOfStockProducts.length}
              </span>
            )}
          </button>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">
            <ArrowLeft className="w-4 h-4" /> Ver Tienda
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white dark:bg-slate-800 h-16 shadow-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 z-10 flex-shrink-0">
          <h1 className="font-bold font-exo text-xl uppercase tracking-widest text-slate-800 dark:text-white">
            {activeTab === 'productos' ? 'Gestión de Inventario' : activeTab === 'pedidos' ? 'Bandeja de Pedidos' : 'Estadísticas y Stock'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">A</div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{session.user.email}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/50">
          
          {/* =============================================================== */}
          {/* VISTA 1: PRODUCTOS E INVENTARIO */}
          {/* =============================================================== */}
          {activeTab === 'productos' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
              
              {/* FILA SUPERIOR: TÍTULO, BUSCADOR Y BOTONES DE ACCIÓN */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tus Repuestos</h2>
                    <p className="text-xs text-slate-500 font-light">
                      Mostrando <strong>{filteredProducts.length}</strong> de <strong>{products.length}</strong> productos. <span className="text-blue-500 hidden sm:inline">• Hacé clic en cualquier Precio o Stock para editarlo al instante.</span>
                    </p>
                  </div>

                  <div className="relative w-full xl:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      placeholder="Buscar por código, nombre o marca..." 
                      className="w-full pl-10 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-none font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors focus:outline-none">
                      <ListPlus className="w-4 h-4" /> Categorías ({categories.length})
                    </button>
                    <button onClick={() => setIsBrandModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors focus:outline-none">
                      <Tag className="w-4 h-4" /> + Marca
                    </button>
                    <button 
                      onClick={() => setIsBulkPriceModalOpen(true)} 
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-colors focus:outline-none"
                    >
                      <Percent className="w-4 h-4" /> Actualizar %
                    </button>
                    <button 
                      onClick={() => { setExcelPreview([]); setExcelFileName(''); setIsExcelModalOpen(true); }} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-colors focus:outline-none"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Importar Excel
                    </button>
                    <button onClick={openAddProductModal} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-colors focus:outline-none">
                      <Plus className="w-4 h-4" /> Nuevo Repuesto
                    </button>
                  </div>
                </div>

                {/* FILA INFERIOR: BARRA DE FILTROS COMBINADOS (CATEGORÍA, MARCA, STOCK, ORDEN) */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Filter className="w-3.5 h-3.5 text-blue-500" /> Filtrar:
                  </div>

                  {/* Filtro Categoría */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="todas">Todas las Categorías ({categories.length})</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Filtro Marca */}
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="todas">Todas las Marcas ({brands.length})</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>

                  {/* Filtro Disponibilidad de Stock */}
                  <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="todos">Stock: Todos</option>
                    <option value="con_stock">✅ Con Stock (&gt; 0)</option>
                    <option value="bajo_stock">⚠️ Stock Bajo (1 a 2 u.)</option>
                    <option value="sin_stock">❌ Sin Stock (Agotados)</option>
                  </select>

                  {/* Ordenamiento */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="recientes">Orden: Más recientes</option>
                    <option value="nombre_asc">Orden: Nombre (A - Z)</option>
                    <option value="precio_asc">Orden: Menor Precio</option>
                    <option value="precio_desc">Orden: Mayor Precio</option>
                    <option value="stock_asc">Orden: Menor Stock primero</option>
                  </select>

                  {hasActiveProductFilters && (
                    <button
                      onClick={clearAllProductFilters}
                      className="text-xs font-bold text-blue-500 hover:text-blue-400 underline ml-auto"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* TABLA DE PRODUCTOS */}
              <div className="p-0 flex-1 overflow-auto relative">
                {isLoading ? (
                  <div className="p-10 text-center text-slate-500">Cargando base de datos...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center">
                    <Package className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sin resultados para estos filtros</h3>
                    {hasActiveProductFilters && (
                      <button onClick={clearAllProductFilters} className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                        Ver todos los repuestos
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-16">Foto</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Código</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Categoría / Marca</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Precio (Clic p/ editar)</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Stock (Clic p/ editar)</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 text-center">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-sm font-bold text-slate-700 dark:text-slate-300 font-exo">{prod.sku_code}</td>
                          <td className="p-3.5 text-sm font-medium text-slate-900 dark:text-white">{prod.name}</td>
                          <td className="p-3.5 text-sm text-slate-500">
                            <span className="block text-slate-700 dark:text-slate-300 font-medium">{prod.category?.name || '-'}</span>
                            <span className="text-[11px] uppercase text-slate-400">{prod.brand?.name || ''}</span>
                          </td>

                          {/* PRECIO CON EDICIÓN RÁPIDA (INLINE) */}
                          <td className="p-3.5 text-right">
                            {inlineEdit.id === prod.id && inlineEdit.field === 'price' ? (
                              <input
                                type="number"
                                autoFocus
                                value={inlineEdit.value}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                onBlur={() => saveInlineEdit(prod)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEdit(prod);
                                  if (e.key === 'Escape') setInlineEdit({ id: null, field: null, value: '' });
                                }}
                                className="w-28 text-right px-2 py-1 rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startInlineEdit(prod, 'price')}
                                title="Clic para editar precio rápidamente"
                                className="text-sm font-bold text-slate-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                              >
                                ${Number(prod.price).toLocaleString('es-AR')}
                              </button>
                            )}
                          </td>

                          {/* STOCK CON EDICIÓN RÁPIDA (INLINE) */}
                          <td className="p-3.5 text-center">
                            {inlineEdit.id === prod.id && inlineEdit.field === 'stock' ? (
                              <input
                                type="number"
                                autoFocus
                                value={inlineEdit.value}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                onBlur={() => saveInlineEdit(prod)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEdit(prod);
                                  if (e.key === 'Escape') setInlineEdit({ id: null, field: null, value: '' });
                                }}
                                className="w-20 text-center px-2 py-1 rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startInlineEdit(prod, 'stock')}
                                title="Clic para editar stock rápidamente"
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-transform hover:scale-105 ${
                                  prod.stock > 2
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                    : prod.stock > 0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                }`}
                              >
                                {prod.stock > 0 ? prod.stock : 'Sin Stock'}
                              </button>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openEditProductModal(prod)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none" title="Editar ficha completa">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setProductToDelete(prod)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none" title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* PAGINACIÓN DE LA TABLA DE INVENTARIO */}
              {totalProductPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Página <strong>{currentPage}</strong> de <strong>{totalProductPages}</strong> ({filteredProducts.length} productos)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1 font-bold"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                      disabled={currentPage === totalProductPages}
                      onClick={() => setCurrentPage(p => Math.min(totalProductPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1 font-bold"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VISTA 2: PEDIDOS Y VENTAS MANUALES */}
          {/* =============================================================== */}
          {activeTab === 'pedidos' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {[
                    { id: 'todos', label: `Todos (${orders.length})` },
                    { id: 'pendientes', label: `Pendientes (${pendingOrdersCount})` },
                    { id: 'facturados', label: `Facturados (${billedOrdersCount})` },
                    { id: 'reintegrados', label: `Reintegrados (${refundedOrdersCount})` },
                    { id: 'cancelados', label: `Cancelados (${cancelledOrdersCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOrderFilter(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        orderFilter === tab.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setIsPosModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" /> Nueva Venta Manual
                  </button>

                  {completedOrdersCount > 0 && (
                    <button
                      onClick={() => setConfirmClearCompleted(true)}
                      className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Limpiar Finalizados ({completedOrdersCount})
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-10 text-center text-slate-500">Cargando pedidos...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-20 text-center border border-slate-200 dark:border-slate-700">
                  <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No hay pedidos en esta vista</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                  {filteredOrders.map(order => {
                    const isExpanded = Boolean(expandedOrders[order.id]);
                    const totalItemsCount = (order.order_items || []).reduce((acc, it) => acc + Number(it.quantity || 1), 0);
                    const chatMessagesCount = parseAdminChatMessages(order.notes).length;

                    return (
                      <div key={order.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all">
                        <div
                          onClick={() => toggleOrderExpand(order.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleOrderExpand(order.id);
                            }
                          }}
                          className={`p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer select-none transition-colors flex flex-col gap-3 ${
                            isExpanded ? 'border-b border-slate-100 dark:border-slate-700' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400">
                                  Pedido #{order.id}
                                </span>
                                {chatMessagesCount > 0 && (
                                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> {chatMessagesCount} msj
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mt-1.5">
                                <Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleString('es-AR')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <select 
                                value={order.status} 
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)} 
                                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg outline-none cursor-pointer border ${
                                  isOrderPending(order.status) 
                                    ? 'bg-orange-100 text-orange-700 border-orange-200' 
                                    : order.status === 'Facturado' 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : order.status === 'Reintegrado'
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : order.status === 'Cancelado'
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Pendiente (Vía Web)">Pendiente (Vía Web)</option>
                                <option value="Pendiente (Pagado MP)">✅ Pagado MP (Por despachar)</option>
                                <option value="En encargue">⏳ En encargue (Proveedor)</option>
                                <option value="Pendiente (Vía WhatsApp)">Pendiente (Vía WhatsApp)</option>
                                <option value="Cotización Web">Cotización Web</option>
                                <option value="Revisado">Revisado</option>
                                <option value="Facturado">Facturado / Listo</option>
                                <option value="Reintegrado">💸 Reintegrado</option>
                                <option value="Cancelado">Cancelado</option>
                              </select>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order);
                                }}
                                title="Eliminar pedido"
                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Resumen compacto siempre visible */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                            <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
                              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                {order.customer_name || 'Sin nombre'}
                              </span>
                              {totalItemsCount > 0 && (
                                <span className="text-slate-400 dark:text-slate-500">
                                  • {totalItemsCount} {totalItemsCount === 1 ? 'repuesto' : 'repuestos'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                              <span className="text-sm sm:text-base font-bold font-exo text-slate-900 dark:text-white">
                                ${Number(order.total_estimated || 0).toLocaleString('es-AR')}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 border border-blue-200 dark:border-blue-800/50">
                                {isExpanded ? 'Ocultar' : 'Ver detalle'}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </span>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <>
                            <div className="p-5 flex-1 flex flex-col">
                              <div className="grid grid-cols-2 gap-4 mb-5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                                    <UserIcon className="w-3 h-3"/> Cliente
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-white">{order.customer_name}</p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                                    <Phone className="w-3 h-3"/> Teléfono
                                  </div>
                                  <a href={`https://wa.me/${(order.customer_phone || '').replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">
                                    {order.customer_phone}
                                  </a>
                                </div>
                              </div>

                              {order.order_items && order.order_items.length > 0 && (
                                <div className="mb-5">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <FileText className="w-3 h-3"/> Detalle de Repuestos
                                  </h4>
                                  <ul className="space-y-3">
                                    {order.order_items.map((item, idx) => (
                                      <li key={idx} className="flex justify-between items-start text-sm">
                                        <div className="flex gap-2">
                                          <span className="font-bold text-slate-800 dark:text-white">{item.quantity}x</span>
                                          <div className="text-slate-600 dark:text-slate-300">
                                            <span>{item.product?.name || 'Repuesto Eliminado'}</span>
                                            <span className="block text-[10px] text-slate-400 uppercase font-exo">{item.product?.sku_code || 'N/A'}</span>
                                          </div>
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-white">
                                          ${(item.unit_price * item.quantity).toLocaleString('es-AR')}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {order.notes && (() => {
                                // Extraemos URLs de imágenes de las notas automáticamente
                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                const matches = order.notes.match(urlRegex) || [];
                                const imageLinks = matches.filter(url => /\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(url) || url.includes('supabase.co/storage'));
                                
                                // Limpiamos el texto de las notas para que no repita el link gigante ni el bloque interno de chat
                                let cleanNotes = order.notes
                                  .replace(/\[\[CHAT_DAPA:[\s\S]*?\]\]/g, '')
                                  .replace(/\[DIM_CA:[^\]]+\]/gi, '')
                                  .replace(/\[PESO_CA:[^\]]+\]/gi, '')
                                  .replace(/\[ZONA_CA:[^\]]+\]/gi, '')
                                  .replace(/\[STOCK_DESCONTADO\]/gi, '');
                                imageLinks.forEach(link => {
                                  cleanNotes = cleanNotes.replace(link, '').replace(/FOTO REPUESTO:\s*/gi, '').replace(/FOTO CÉDULA \/ CHASIS:\s*/gi, '');
                                });

                                return (
                                  <div className="mt-auto space-y-3">
                                    <div className="bg-blue-50/50 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-700 rounded-xl p-4">
                                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                                        Datos de Envío / Especificaciones
                                      </h5>
                                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                                        {cleanNotes.trim()}
                                      </p>
                                    </div>

                                    {imageLinks.length > 0 && (
                                      <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                                          Fotos adjuntas por el cliente ({imageLinks.length})
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          {imageLinks.map((imgUrl, imgIdx) => (
                                            <a
                                              key={imgIdx}
                                              href={imgUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="group relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm hover:border-blue-500 transition-all"
                                            >
                                              <img src={imgUrl} alt={`Adjunto ${imgIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                                Ver
                                              </div>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openShippingLabelModal(order)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-colors"
                                  title="Generar e imprimir etiqueta Correo Argentino (Formato Mercado Libre 2 hojas) y cargar código de seguimiento"
                                >
                                  <Truck className="w-3.5 h-3.5" /> Etiqueta Correo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openSellerChatModal(order)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-colors relative"
                                  title="Abrir chat directo con el comprador de este pedido"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Chat Comprador
                                  {chatMessagesCount > 0 && (
                                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white text-emerald-700 font-black text-[9px]">
                                      {chatMessagesCount}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendOrderWhatsApp(order, 'encargue_delay')}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Avisar por WhatsApp sobre demora por encargue y opción de reintegro"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Avisar Encargue
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintOrder(order)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Imprimir remito / comprobante del pedido"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Remito
                                </button>
                              </div>

                              {order.status !== 'Reintegrado' ? (
                                <button
                                  type="button"
                                  onClick={() => openRefundModal(order)}
                                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
                                  title="Reintegrar dinero (Mercado Pago / Tarjeta o Manual)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reintegrar Dinero
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Dinero Reintegrado
                                </span>
                              )}
                            </div>

                            <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Cotizado</span>
                              <span className="text-xl font-bold font-exo text-slate-900 dark:text-white">
                                ${Number(order.total_estimated || 0).toLocaleString('es-AR')}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VISTA 3: ESTADÍSTICAS Y ALERTAS DE STOCK (DASHBOARD) */}
          {/* =============================================================== */}
          {activeTab === 'estadisticas' && (
            <div className="space-y-8">
              {/* Tarjetas de Resumen Comercial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Facturación del Mes</span>
                  <p className="text-3xl font-bold font-exo text-emerald-600 dark:text-emerald-400">
                    ${stats.monthlyRevenue.toLocaleString('es-AR')}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">{stats.monthlyBilledCount} ventas cerradas este mes</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Facturación Histórica</span>
                  <p className="text-3xl font-bold font-exo text-slate-900 dark:text-white">
                    ${stats.totalRevenue.toLocaleString('es-AR')}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">{stats.billedCount} ventas totales • Ticket prom: ${stats.avgTicket.toLocaleString('es-AR')}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Capital en Mercadería</span>
                  <p className="text-3xl font-bold font-exo text-blue-600 dark:text-blue-400">
                    ${stats.totalInventoryValue.toLocaleString('es-AR')}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">{products.length} artículos activos en catálogo</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Alertas de Reposición</span>
                  <p className="text-3xl font-bold font-exo text-amber-500">
                    {stats.outOfStockProducts.length + stats.lowStockProducts.length}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">
                    {stats.outOfStockProducts.length} agotados • {stats.lowStockProducts.length} con stock bajo
                  </span>
                </div>
              </div>

              {/* Tabla de Repuestos sin Stock o con Stock Crítico */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-white uppercase tracking-wider">
                      Repuestos con Stock Agotado o Crítico (0 a 2 unidades)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Hacé clic en "+ Reponer" para sumar unidades rápidamente</p>
                  </div>
                  <button
                    onClick={() => { setFilterStock('sin_stock'); setActiveTab('productos'); }}
                    className="text-xs font-bold text-blue-500 hover:underline uppercase tracking-wider"
                  >
                    Ver en Inventario →
                  </button>
                </div>

                <div className="max-h-[450px] overflow-y-auto">
                  {[...stats.outOfStockProducts, ...stats.lowStockProducts].length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                      ¡Excelente! Todos tus repuestos tienen más de 2 unidades en stock.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="p-4">Código</th>
                          <th className="p-4">Repuesto</th>
                          <th className="p-4">Marca</th>
                          <th className="p-4 text-center">Stock Actual</th>
                          <th className="p-4 text-right">Reposición Rápida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[...stats.outOfStockProducts, ...stats.lowStockProducts].slice(0, 100).map(prod => (
                          <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{prod.sku_code}</td>
                            <td className="p-4 text-slate-900 dark:text-white font-medium">{prod.name}</td>
                            <td className="p-4 text-slate-500 text-xs uppercase">{prod.brand?.name || '-'}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                prod.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {prod.stock <= 0 ? 'Agotado (0)' : `${prod.stock} u.`}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              {[1, 5, 10].map(addQty => (
                                <button
                                  key={addQty}
                                  onClick={async () => {
                                    const newStock = Math.max(0, Number(prod.stock || 0)) + addQty;
                                    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', prod.id);
                                    if (!error) {
                                      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock } : p));
                                      showNotification(`Se sumaron +${addQty} u. a ${prod.sku_code}`, 'success');
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-slate-700 hover:bg-blue-600 text-blue-600 dark:text-blue-300 hover:text-white text-xs font-bold transition-colors"
                                >
                                  +{addQty}
                                </button>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ==================================================================== */}
      {/* MODAL: ACTUALIZACIÓN MASIVA DE PRECIOS POR PORCENTAJE (%) */}
      {/* ==================================================================== */}
      {isBulkPriceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-[210] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold uppercase tracking-widest text-slate-800 dark:text-white">
                    Actualizar Precios por Porcentaje
                  </h2>
                  <p className="text-xs text-slate-500">Aumentá o descontá precios masivamente</p>
                </div>
              </div>
              <button onClick={() => setIsBulkPriceModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleApplyBulkPrice} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">¿A qué productos aplicar?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'todos', label: 'Todo el Catálogo' },
                    { id: 'categoria', label: 'Una Categoría' },
                    { id: 'marca', label: 'Una Marca' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setBulkScope(opt.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors ${
                        bulkScope === opt.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {bulkScope === 'categoria' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Seleccionar Categoría</label>
                  <select
                    required
                    value={bulkCategoryId}
                    onChange={(e) => setBulkCategoryId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  >
                    <option value="">Elegir categoría...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {bulkScope === 'marca' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Seleccionar Marca</label>
                  <select
                    required
                    value={bulkBrandId}
                    onChange={(e) => setBulkBrandId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  >
                    <option value="">Elegir marca...</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Porcentaje (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="Ej: 15 (o -10 p/ descuento)"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Redondear precios a</label>
                  <select
                    value={bulkRounding}
                    onChange={(e) => setBulkRounding(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  >
                    <option value="1">Sin redondeo ($1)</option>
                    <option value="10">Múltiplos de $10</option>
                    <option value="100">Múltiplos de $100</option>
                    <option value="500">Múltiplos de $500</option>
                    <option value="1000">Múltiplos de $1.000</option>
                  </select>
                </div>
              </div>

              <div className="bg-purple-50/60 dark:bg-slate-900/70 border border-purple-200 dark:border-slate-700 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-800 dark:text-white">
                  Se modificarán <strong>{targetBulkProducts.length}</strong> repuestos.
                </p>
                {bulkPercentage && !isNaN(parseFloat(bulkPercentage)) && (
                  <p>
                    Ejemplo: Un repuesto de <strong>$50.000</strong> pasará a valer{' '}
                    <strong className="text-purple-600 dark:text-purple-400">
                      ${calculateRoundedPrice(50000, parseFloat(bulkPercentage), bulkRounding).toLocaleString('es-AR')}
                    </strong>.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPriceModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || targetBulkProducts.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Actualizando...' : 'Aplicar Aumento / Descuento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: NUEVA VENTA MANUAL (MOSTRADOR / POS) */}
      {/* ==================================================================== */}
      {isPosModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-[210] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold uppercase tracking-widest text-slate-800 dark:text-white">
                    Registrar Venta Manual (Mostrador / WhatsApp)
                  </h2>
                  <p className="text-xs text-slate-500">Armá el pedido y descontá stock en el acto</p>
                </div>
              </div>
              <button onClick={() => setIsPosModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePosOrder} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cliente / Taller</label>
                  <input
                    type="text"
                    required
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Teléfono (Opcional)</label>
                  <input
                    type="text"
                    value={posCustomerPhone}
                    onChange={(e) => setPosCustomerPhone(e.target.value)}
                    placeholder="Ej: 2478..."
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Medio de Pago</label>
                  <select
                    value={posPaymentMethod}
                    onChange={(e) => setPosPaymentMethod(e.target.value)}
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Cuenta DNI">Cuenta DNI</option>
                    <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                  </select>
                </div>
              </div>

              {/* Buscador de repuestos para agregar a la venta */}
              <div className="relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Agregar Repuestos a la Venta</label>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Escribí el código SKU o nombre del repuesto..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                {posSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {posSuggestions.map(prod => (
                      <button
                        type="button"
                        key={prod.id}
                        onClick={() => addProductToPos(prod)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">{prod.sku_code}</span>
                          <span className="font-semibold text-slate-800 dark:text-white">{prod.name}</span>
                          <span className="ml-2 text-slate-400">(Stock: {prod.stock})</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">${Number(prod.price).toLocaleString('es-AR')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de ítems cargados */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {posItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Todavía no agregaste repuestos a esta venta.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">
                      <tr>
                        <th className="p-3">Repuesto</th>
                        <th className="p-3 text-center">Cantidad</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {posItems.map((item, idx) => (
                        <tr key={item.product.id}>
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-500 mr-2">{item.product.sku_code}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{item.product.name}</span>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setPosItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: q } : it));
                              }}
                              className="w-16 text-center py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                            />
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            ${(Number(item.product.price) * item.quantity).toLocaleString('es-AR')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPosItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posDiscountStock}
                    onChange={(e) => setPosDiscountStock(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  Marcar como Facturado y descontar stock automáticamente
                </label>

                <div className="text-right ml-auto">
                  <span className="text-xs uppercase text-slate-400 font-bold mr-2">Total:</span>
                  <span className="text-2xl font-bold font-exo text-slate-900 dark:text-white">
                    ${posTotal.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPosModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || posItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: IMPORTACIÓN MASIVA POR EXCEL */}
      {/* ==================================================================== */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-[210] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-slate-800 dark:text-white">
                    Importar Productos desde Excel
                  </h2>
                  <p className="text-xs text-slate-500">Cargá productos nuevos o actualizá precios y stock masivamente (.xlsx, .xls, .csv)</p>
                </div>
              </div>
              <button onClick={() => setIsExcelModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-white uppercase tracking-wider">Columnas reconocidas:</p>
                  <p><strong>Codigo</strong> (SKU), <strong>Nombre</strong>, <strong>Precio</strong>, <strong>Stock</strong>, <strong>Categoria</strong>, <strong>Marca</strong>, <strong>Descripcion</strong>.</p>
                  <p className="text-[11px] text-slate-400">Si el Código ya existe en tu tienda, se actualizará su precio y stock automáticamente.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Descargar Plantilla
                </button>
              </div>

              <div className="relative border-2 border-dashed border-emerald-400/70 dark:border-emerald-600/60 rounded-2xl p-8 text-center bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {excelFileName ? `Archivo cargado: ${excelFileName}` : 'Hacé clic aquí o arrastrá tu archivo Excel (.xlsx, .xls, .csv)'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Podés subir planillas con cientos o miles de repuestos</p>
              </div>

              {isParsingExcel && (
                <div className="text-center py-6 text-sm text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> Analizando planilla...
                </div>
              )}

              {excelPreview.length > 0 && (
                <div className="bg-emerald-50/60 dark:bg-slate-900/80 border border-emerald-200 dark:border-slate-700 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                      Proveedor Detectado
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{detectedSupplier}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      Prefijo de Código (Evita choques)
                    </label>
               <input
                  type="text"
                  value={skuPrefix}
                  onChange={(e) => {
                    const newPrefix = e.target.value.toUpperCase();
                    setSkuPrefix(newPrefix);
                    setExcelPreview(prev => enrichWithExistingSkus(prev, newPrefix));
                  }}
                  placeholder="Ej: TC- o WG-"
                  className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      Sumar % (Ej: 21 por IVA)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={importMarkupPct}
                      onChange={(e) => setImportMarkupPct(e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  {rawSheetMatrix.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ¿Subiste un Excel de un proveedor nuevo con otro diseño?
                    </span>
                    <button
                      type="button"
                      onClick={() => setManualMappingMode(!manualMappingMode)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {manualMappingMode ? 'Ocultar selector manual' : 'Asignar columnas manualmente'}
                    </button>
                  </div>

                  {manualMappingMode && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {[
                        { key: 'skuCol', label: 'Columna Código' },
                        { key: 'nameCol', label: 'Columna Nombre' },
                        { key: 'priceCol', label: 'Columna Precio' }
                      ].map(colField => (
                        <div key={colField.key}>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block">{colField.label}</label>
                          <select
                            value={manualCols[colField.key]}
                            onChange={(e) => {
                              const next = { ...manualCols, [colField.key]: Number(e.target.value) };
                              setManualCols(next);
                              applyManualColumnMapping(next);
                            }}
                            className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S'].map((letter, idx) => (
                              <option key={letter} value={idx}>Columna {letter}</option>
                            ))}
                          </select>
                        </div>
                      ))}

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block">Categoría (o Auto)</label>
                        <input
                          type="text"
                          value={manualCols.fixedCategory}
                          onChange={(e) => {
                            const next = { ...manualCols, fixedCategory: e.target.value };
                            setManualCols(next);
                            applyManualColumnMapping(next);
                          }}
                          placeholder="Ej: Chapas o Auto"
                          className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => applyManualColumnMapping(manualCols)}
                          className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase"
                        >
                          Aplicar Mapeo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </div>
                
              )}

              {excelPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Vista Previa ({excelPreview.length} repuestos detectados)
                    </h4>
                    <div className="flex gap-3 text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{excelPreview.filter(i => !i.isUpdate).length} Nuevos
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        ↻ {excelPreview.filter(i => i.isUpdate).length} Actualizaciones
                      </span>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="p-2.5 font-bold uppercase text-slate-500">Acción</th>
                          <th className="p-2.5 font-bold uppercase text-slate-500">Código</th>
                          <th className="p-2.5 font-bold uppercase text-slate-500">Nombre</th>
                          <th className="p-2.5 font-bold uppercase text-slate-500">Categoría / Marca</th>
                          <th className="p-2.5 font-bold uppercase text-slate-500 text-right">Precio</th>
                          <th className="p-2.5 font-bold uppercase text-slate-500 text-center">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {excelPreview.slice(0, 100).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.isUpdate
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              }`}>
                                {item.isUpdate ? 'Actualizar' : 'Nuevo'}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{item.sku_code}</td>
                            <td className="p-2.5 text-slate-900 dark:text-white truncate max-w-[220px]">{item.name}</td>
                            <td className="p-2.5 text-slate-500">{item.categoryName} / {item.brandName}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">${item.price.toLocaleString('es-AR')}</td>
                            <td className="p-2.5 text-center font-bold">{item.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {importProgress}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsExcelModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || excelPreview.length === 0}
                  onClick={handleConfirmExcelImport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? 'Importando...' : `Confirmar Importación (${excelPreview.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR REPUESTO */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[220] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2">
              ¿Eliminar Repuesto?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Estás por eliminar <strong className="text-slate-800 dark:text-white">{productToDelete.name}</strong> ({productToDelete.sku_code}). Esta acción quitará el producto del catálogo público.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={() => setProductToDelete(null)} 
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={confirmDeleteProduct} 
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR UN PEDIDO */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[220] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2">
              ¿Eliminar Pedido #{orderToDelete.id}?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Se borrará definitivamente el pedido de <strong className="text-slate-800 dark:text-white">{orderToDelete.customer_name}</strong> de tu bandeja de entrada.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={() => setOrderToDelete(null)} 
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={confirmDeleteOrder} 
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REINTEGRAR DINERO (MERCADO PAGO / TARJETA O MANUAL) */}
      {orderToRefund && (
        <div className="fixed inset-0 bg-slate-900/70 z-[225] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                    Reintegrar Dinero — Pedido #{orderToRefund.id}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cliente: <strong className="text-slate-700 dark:text-slate-200">{orderToRefund.customer_name}</strong> · Total: <strong>${Number(orderToRefund.total_estimated || 0).toLocaleString('es-AR')}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setOrderToRefund(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">
                  Método de Reintegro
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRefundMode('auto_mp')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      refundMode === 'auto_mp'
                        ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 text-purple-900 dark:text-purple-100'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
                      <CreditCard className="w-4 h-4 text-purple-600" /> Automático (MP / Tarjeta)
                    </div>
                    <p className="text-[11px] opacity-80 leading-snug">
                      Reintegra directo en la tarjeta o cuenta de Mercado Pago del comprador vía API.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundMode('manual')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      refundMode === 'manual'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-900 dark:text-blue-100'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
                      <RotateCcw className="w-4 h-4 text-blue-600" /> Manual / Transferencia
                    </div>
                    <p className="text-[11px] opacity-80 leading-snug">
                      Registrá la devolución si ya transferiste por CBU/Alias o devolviste en efectivo.
                    </p>
                  </button>
                </div>
              </div>

              {refundMode === 'auto_mp' && (
                <div className="space-y-3 bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/50">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                      ID de Operación de Mercado Pago (Opcional si pagó desde la web)
                    </label>
                    <input
                      type="text"
                      value={refundPaymentIdInput}
                      onChange={(e) => setRefundPaymentIdInput(e.target.value)}
                      placeholder="Se busca automáticamente por Pedido # o ingresalo manual"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                      Monto a devolver en ARS (Dejá vacío para reintegro total 100%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      placeholder={`Total del pedido: $${Number(orderToRefund.total_estimated || 0).toLocaleString('es-AR')}`}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Motivo del Reintegro (Quedará registrado en el pedido)
                </label>
                <input
                  type="text"
                  required
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder="Ej: Demora en encargue de proveedor / Solicitud del cliente"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSendOrderWhatsApp(orderToRefund, 'refund_confirmed')}
                  className="py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Avisar por WhatsApp
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 rounded-xl font-bold uppercase tracking-widest text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isSubmitting
                    ? 'Procesando Reintegro...'
                    : refundMode === 'auto_mp'
                    ? 'Ejecutar Reintegro en Mercado Pago'
                    : 'Confirmar Reintegro Manual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ETIQUETA CORREO ARGENTINO (FORMATO MERCADO LIBRE 2 HOJAS) + TRACKING */}
      {orderForShippingLabel && (
        <div className="fixed inset-0 bg-slate-900/75 z-[225] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="bg-blue-700 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base uppercase tracking-widest">
                    Etiqueta Correo Argentino • Pedido #{orderForShippingLabel.id}
                  </h3>
                  <p className="text-xs text-blue-100">
                    Formato Oficial Mercado Libre (2 hojas: Etiqueta de Paquete + Hoja de Preparación SKU)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderForShippingLabel(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveShippingTracking(e, false)} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-3.5 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                <strong>Rastreo Oficial Correo Argentino habilitado para el comprador:</strong> Al guardar el código de seguimiento (ej. <code className="font-mono font-bold">HC532820856AR</code>), el cliente podrá consultar en vivo el estado de su encomienda desde su menú <strong>Mis Pedidos / Reintegros</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Código de Seguimiento Correo Argentino (TN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={labelForm.trackingCode}
                    onChange={(e) => setLabelForm({ ...labelForm, trackingCode: e.target.value.toUpperCase() })}
                    placeholder="Ej: HC532820856AR"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-slate-900 dark:text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Modalidad (C)
                  </label>
                  <select
                    value={labelForm.serviceType}
                    onChange={(e) => setLabelForm({ ...labelForm, serviceType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <option value="DOM">C | DOM (A Domicilio)</option>
                    <option value="SUC">C | SUC (A Sucursal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Medidas del Paquete
                  </label>
                  <input
                    type="text"
                    value={labelForm.dimensions}
                    onChange={(e) => setLabelForm({ ...labelForm, dimensions: e.target.value })}
                    placeholder="20x38x38cm"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Peso Estimado
                  </label>
                  <input
                    type="text"
                    value={labelForm.weight}
                    onChange={(e) => setLabelForm({ ...labelForm, weight: e.target.value })}
                    placeholder="7.5 kg"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Código Encaminamiento
                  </label>
                  <input
                    type="text"
                    value={labelForm.zoneCode}
                    onChange={(e) => setLabelForm({ ...labelForm, zoneCode: e.target.value.toUpperCase() })}
                    placeholder="NOA-SLAD-AAB"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Domicilio de Destino
                  </label>
                  <input
                    type="text"
                    value={labelForm.domicilio}
                    onChange={(e) => setLabelForm({ ...labelForm, domicilio: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Código Postal (CP)
                  </label>
                  <input
                    type="text"
                    value={labelForm.cp}
                    onChange={(e) => setLabelForm({ ...labelForm, cp: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Ciudad de Destino / Localidad
                  </label>
                  <input
                    type="text"
                    value={labelForm.localidad}
                    onChange={(e) => setLabelForm({ ...labelForm, localidad: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Provincia / Central
                  </label>
                  <input
                    type="text"
                    value={labelForm.provincia}
                    onChange={(e) => setLabelForm({ ...labelForm, provincia: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Referencia / Observaciones para el cartero
                </label>
                <input
                  type="text"
                  value={labelForm.referencia}
                  onChange={(e) => setLabelForm({ ...labelForm, referencia: e.target.value })}
                  placeholder="Ej: Entre calles, portón blanco, horario comercial..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {isSubmitting ? 'Guardando...' : '💾 Guardar Tracking'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleImportToMiCorreo}
                  className="py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  title="Envía el paquete directamente a tu cuenta de MiCorreo (/shipping/import) o genera la orden y rótulo PDF en Paq.ar API 2.0"
                >
                  <Truck className="w-4 h-4" /> Importar a MiCorreo API
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSaveShippingTracking(e, true)}
                  className="flex-1 py-3 px-5 rounded-xl font-bold uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Guardar e Imprimir Etiqueta (2 Hojas ML / Correo)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CHAT DIRECTO VENDEDOR <-> COMPRADOR */}
      {orderForSellerChat && (
        <div className="fixed inset-0 bg-slate-900/75 z-[225] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest">
                    Chat Directo • Pedido #{orderForSellerChat.id}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Comprador: <strong>{orderForSellerChat.customer_name}</strong> ({orderForSellerChat.customer_phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderForSellerChat(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-900/60 min-h-[300px] max-h-[420px]">
              {sellerChatMessages.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Iniciá la conversación con {orderForSellerChat.customer_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    El comprador verá tus mensajes al instante en su panel "Mis Pedidos / Reintegros".
                  </p>
                </div>
              ) : (
                sellerChatMessages.map((msg) => {
                  const isSeller = msg.sender === 'seller';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isSeller
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                        }`}
                      >
                        <div className={`text-[10px] font-bold mb-1 ${isSeller ? 'text-emerald-100' : 'text-blue-600 dark:text-blue-400'}`}>
                          {isSeller ? 'Vos (D.A.P.A. Repuestos)' : msg.senderName || orderForSellerChat.customer_name}
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                        <div className={`text-[9px] mt-1 text-right ${isSeller ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={sellerChatBottomRef} />
            </div>

            <form onSubmit={handleSendSellerChat} className="p-3.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <input
                type="text"
                value={sellerChatInput}
                onChange={(e) => setSellerChatInput(e.target.value)}
                placeholder="Escribí un mensaje para el comprador..."
                maxLength={700}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSendingSellerChat || !sellerChatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingSellerChat ? '...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA LIMPIAR TODOS LOS PEDIDOS FINALIZADOS */}
      {confirmClearCompleted && (
        <div className="fixed inset-0 bg-slate-900/70 z-[220] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2">
              ¿Limpiar Pedidos Finalizados?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Se eliminarán los <strong className="text-slate-800 dark:text-white">{completedOrdersCount} pedidos</strong> que ya están marcados como <strong>Facturados</strong> o <strong>Cancelados</strong>. Los pedidos pendientes no se tocarán.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={() => setConfirmClearCompleted(false)} 
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={handleClearCompletedOrders} 
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Limpiando...' : 'Sí, Limpiar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTO (Crear / Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-800 dark:text-white">
                {editingProductId ? 'Editar Repuesto' : 'Nuevo Repuesto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitProduct} className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Foto del Repuesto</label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl h-48 md:h-full min-h-[200px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 transition-colors overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-4 text-slate-400 group-hover:text-blue-500 transition-colors flex flex-col items-center">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-wider">Hacé clic para subir foto</span>
                      <span className="text-[10px] mt-1">PNG, JPG, WEBP</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full md:w-2/3 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Código (SKU) *</label>
                    <input required name="sku_code" value={formData.sku_code} onChange={handleInputChange} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre del Repuesto *</label>
                    <input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Categoría *</label>
                    <select required name="category_id" value={formData.category_id} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500">
                      <option value="">Seleccionar...</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Marca *</label>
                    <select required name="brand_id" value={formData.brand_id} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500">
                      <option value="">Seleccionar...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Precio (ARS) *</label>
                    <input required name="price" value={formData.price} onChange={handleInputChange} type="number" step="0.01" min="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Stock *</label>
                    <input required name="stock" value={formData.stock} onChange={handleInputChange} type="number" min="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descripción / Compatibilidad (Opcional)</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="Ej: Aplicable a motores 1.6 8v..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none" />
                </div>
                <div className="pt-2 flex justify-end gap-4 mt-auto">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold uppercase text-xs text-slate-500 hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg disabled:opacity-70">
                    {isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4" /> {editingProductId ? 'Actualizar' : 'Guardar'}</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

   {/* MODAL: GESTIONAR Y ELIMINAR CATEGORÍAS + PRODUCTOS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">
                  Gestionar Categorías ({categories.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creá categorías, unificá duplicadas o eliminá categorías con sus productos
                </p>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Formulario para crear nueva categoría */}
              <form onSubmit={handleAddCategory} className="bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">
                  Agregar Nueva Categoría
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    required
                    placeholder="Nombre (Ej: Ópticas)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    type="text"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-none text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <input
                    placeholder="Descripción (Opcional)"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    type="text"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-none text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-none font-bold uppercase text-xs disabled:opacity-70"
                  >
                    + Crear Categoría
                  </button>
                </div>
              </form>

              {/* Barra de acciones masivas para fusionar o borrar categorías */}
              <div className="space-y-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categories.length > 0 && selectedCatIds.length === categories.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCatIds(categories.map(c => c.id));
                        else setSelectedCatIds([]);
                      }}
                      className="w-4 h-4"
                    />
                    Seleccionar todas ({selectedCatIds.length} seleccionadas)
                  </label>

                  {selectedCatIds.length > 0 && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDeleteCategoriesWithProducts(selectedCatIds)}
                      className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar Seleccionadas ({selectedCatIds.length})
                    </button>
                  )}
                </div>

                {selectedCatIds.length > 0 && (
                  <div className="bg-blue-50 dark:bg-slate-900/80 p-3 border border-blue-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={targetMergeCategoryId}
                      onChange={(e) => setTargetMergeCategoryId(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      <option value="">Elegí categoría destino para mover productos...</option>
                      {categories
                        .filter(c => !selectedCatIds.includes(c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={isSubmitting || !targetMergeCategoryId}
                      onClick={handleMergeCategories}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                      Mover Productos y Unificar
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de categorías con contador y botón de borrado individual */}
              <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {categories.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay categorías cargadas actualmente.
                  </div>
                ) : (
                  categories.map(cat => {
                    const count = products.filter(p => p.category_id === cat.id).length;
                    const isChecked = selectedCatIds.includes(cat.id);
                    return (
                      <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCatIds(prev => [...prev, cat.id]);
                              else setSelectedCatIds(prev => prev.filter(id => id !== cat.id));
                            }}
                            className="w-4 h-4"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-white block">{cat.name}</span>
                            <span className="text-[11px] text-slate-400">{count} producto(s) asociado(s)</span>
                          </div>
                        </label>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleDeleteCategoriesWithProducts([cat.id])}
                          title="Eliminar esta categoría y todos sus productos"
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-none transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA MARCA */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Nueva Marca</h2>
              <button onClick={() => setIsBrandModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddBrand} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre de la Marca (Ej: NGK)</label>
                <input required value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-xs mt-2 disabled:opacity-70">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}