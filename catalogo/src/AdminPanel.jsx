import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Tags, ClipboardList, ArrowLeft, Plus, X, Save, Package, CheckCircle, 
  Calendar, User as UserIcon, Phone, FileText, Lock, LogOut, 
  Image as ImageIcon, Upload, Edit, Trash2, ListPlus, Tag, Search, 
  AlertTriangle, FileSpreadsheet, Download, RefreshCw, TrendingUp, 
  BarChart3, Percent, Filter, ShoppingBag, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from './supabase';

const ADMIN_EMAILS = ['admin@dapa.com'];

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

  // Estado de Filtro de Pedidos
  const [orderFilter, setOrderFilter] = useState('todos');

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
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  
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

  const fetchData = async () => {
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
  };

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
  }, []);

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
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openAddProductModal = () => {
    setEditingProductId(null);
    setFormData({ sku_code: '', name: '', description: '', price: '', stock: '1', category_id: '', brand_id: '' });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditProductModal = (prod) => {
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

  const detectCategoryFromName = (nameStr) => {
    const n = String(nameStr || '').toUpperCase().trim();
    if (n.startsWith('OPTICA') || n.startsWith('OPT.') || n.startsWith('VIDRIO OPT') || n.startsWith('VIDRIO DE OPT') || n.startsWith('LENTE OPT') || n.startsWith('LENTE DE OPT') || n.startsWith('ARO OPT') || n.startsWith('ARO DE OPT') || n.startsWith('CASCO OPT') || n.startsWith('CASCO DE OPT')) return 'Ópticas';
    if (n.startsWith('FARO') || n.startsWith('FAROL') || n.startsWith('FARITO') || n.startsWith('LENTE FARO') || n.startsWith('LENTES FARO') || n.startsWith('VIDRIO FARO') || n.startsWith('CIRCUITO FARO') || n.startsWith('ARO FARO') || n.startsWith('ACRILICO FARO')) return 'Faros';
    if (n.includes('PARAG') && !n.startsWith('FARO') && !n.startsWith('OPTICA') && !n.startsWith('GUARD') && !n.startsWith('CAPOT') && !n.startsWith('FRENTE')) return 'Paragolpes';
    return 'Chapas';
  };

  const parsePriceNumber = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
    const s = String(val ?? '').trim();
    if (!s) return 0;
    const cleaned = s.replace(/[^0-9.,-]/g, '');
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

// Normaliza códigos ignorando espacios y guiones (Así "TC -  3631" coincide con "TC-3631" o "3631")
  const normalizeSkuCode = (sku) =>
    String(sku || '').replace(/[\s-]+/g, '').toLowerCase();

  const enrichWithExistingSkus = (rows, prefixStr) => {
    const existingSkuMap = new Map();
    products.forEach(p => {
      const fullNorm = normalizeSkuCode(p.sku_code);
      existingSkuMap.set(fullNorm, p);
      // También indexamos sin el prefijo TC para que coincida aunque subas el código numérico puro
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

      // 1. Crear categorías nuevas si no existen (Ópticas, Faros, Paragolpes, Chapas, etc.)
      const catMap = new Map(categories.map(c => [normalizeKey(c.name), c.id]));
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

      // 2. Crear marcas limpias si no existen (Ford, Volkswagen, Renault, etc.)
      const brandMap = new Map(brands.map(b => [normalizeKey(b.name), b.id]));
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

      // Mapa de productos existentes ignorando espacios/guiones
      const existingSkuMap = new Map();
      products.forEach(p => {
        const fullNorm = normalizeSkuCode(p.sku_code);
        existingSkuMap.set(fullNorm, p);
        const withoutTc = fullNorm.replace(/^tc/, '');
        if (withoutTc) existingSkuMap.set(withoutTc, p);
      });

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
        const newCategoryId = catMap.get(normalizeKey(item.categoryName)) || categories[0]?.id;
        const newBrandId = brandMap.get(normalizeKey(item.brandName)) || brands[0]?.id;

        const existingProd = existingSkuMap.get(normKeyWithPrefix) || existingSkuMap.get(normKeyRaw);

        if (existingProd) {
          // Actualiza Precio, Nombre, Categoría (Ópticas/Faros/Paragolpes/Chapas) y Marca limpia:
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
          setImportProgress(`Reclasificando y actualizando: ${Math.min(i + batchSize, toUpdate.length).toLocaleString('es-AR')} de ${toUpdate.length.toLocaleString('es-AR')}...`);
          const batch = toUpdate.slice(i, i + batchSize);
          const { error: updateErr } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
          if (updateErr) throw updateErr;
        }
      }

    // 3. Limpiar categorías y marcas viejas que hayan quedado vacías (leyendo TODOS los productos sin el límite de 1000)
      setImportProgress('Limpiando categorías y marcas en desuso...');
      let allProdRefs = [];
      let fromRef = 0;
      const stepRef = 1000;
      while (true) {
        const { data: batchRef, error: refErr } = await supabase
          .from('products')
          .select('category_id, brand_id')
          .range(fromRef, fromRef + stepRef - 1);
        if (refErr || !batchRef || batchRef.length === 0) break;
        allProdRefs = [...allProdRefs, ...batchRef];
        if (batchRef.length < stepRef) break;
        fromRef += stepRef;
      }

      if (allProdRefs.length > 0) {
        const usedCatIds = new Set(allProdRefs.map(p => p.category_id).filter(Boolean));
        const usedBrandIds = new Set(allProdRefs.map(p => p.brand_id).filter(Boolean));

        const { data: allCats } = await supabase.from('categories').select('id');
        const unusedCatIds = (allCats || []).map(c => c.id).filter(id => !usedCatIds.has(id));
        if (unusedCatIds.length > 0) {
          await supabase.from('categories').delete().in('id', unusedCatIds);
        }

        const { data: allBrands } = await supabase.from('brands').select('id');
        const unusedBrandIds = (allBrands || []).map(b => b.id).filter(id => !usedBrandIds.has(id));
        if (unusedBrandIds.length > 0) {
          for (let i = 0; i < unusedBrandIds.length; i += 200) {
            await supabase.from('brands').delete().in('id', unusedBrandIds.slice(i, i + 200));
          }
        }
      }

      showNotification(`¡Listo! ${toInsert.length.toLocaleString('es-AR')} nuevos y ${toUpdate.length.toLocaleString('es-AR')} reclasificados/actualizados.`, 'success');
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

  // Función para aplicar el Mapeo Manual de Columnas sobre cualquier archivo nuevo
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
        !['CODIGO', 'CÓDIGO', 'SKU', 'ART', 'ARTICULO'].includes(sku.toUpperCase())
      ) {
        const cat = customCols.fixedCategory.trim() === 'Auto'
          ? detectCategoryFromName(name)
          : (customCols.fixedCategory.trim() || 'General');
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
            { Codigo: 'TC-8203', Nombre: 'OPTICA ALFA ROMEO 33 IMP (ALFA ROMEO 33)', Precio: 981571.5, Stock: 1, Categoria: 'Ópticas', Marca: 'Alfa Romeo', Descripcion: '' },
            { Codigo: 'WG-4372', Nombre: 'ANTENA DE TECHO ALUMI 38 CM KS37334', Precio: 15226.59, Stock: 1, Categoria: 'Accesorios', Marca: 'Multimarca', Descripcion: '' }
          ];

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
      const outName = excelPreview.length > 0
        ? `Convertido_${detectedSupplier.replace(/[^a-zA-Z0-9]/g, '_')}_DAPA.xlsx`
        : 'Plantilla_Productos_DAPA.xlsx';
      XLSX.writeFile(workbook, outName);
    } catch (err) {
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

      const flatSampleText = firstMatrix.slice(0, 55).map(r => r.join(' ')).join(' ').toUpperCase();

      let parsedRows = [];
      let supplierLabel = 'Plantilla Estándar';
      let defaultPrefix = '';

      // -----------------------------------------------------------------------
      // 1. ESPEJOS FB (Hoja 'LISTA' consolida los 1.878 productos de las 10 hojas)
      // -----------------------------------------------------------------------
      if (sheetNames.includes('LISTA') && sheetNames.includes('ESPEJOS') && sheetNames.includes('LUNAS')) {
        supplierLabel = 'Espejos FB (Espejos, Lunas, Frentes y Tapas)';
        defaultPrefix = 'FB-';
        let currentCat = 'Espejos y Lunas';

        firstMatrix.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const price = parsePriceNumber(row[3]);

          if (col0 && !col1 && price === 0 && !['CODIGO', 'CÓDIGO'].includes(col0.toUpperCase())) {
            const secUpper = col0.toUpperCase();
            if (secUpper.includes('TAPA')) currentCat = 'Tapas de Combustible y Radiador';
            else if (secUpper.includes('ESPEJO') || secUpper.includes('FRENTE') || secUpper.includes('LUNA') || secUpper.includes('BRAZO')) currentCat = 'Espejos y Lunas';
            else currentCat = 'Accesorios Varios';
            return;
          }

          if (col0 && col1 && price > 0 && !['CODIGO', 'CÓDIGO'].includes(col0.toUpperCase())) {
            // Limpiamos si la descripción repite el código al principio (ej: "450 d - Gol 99/2005")
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
      // 2. RGL AUTOPARTES (Col 1=CODIGO, Col 3=Nombre/Rubro, Col 4=PRECIO)
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('RGL AUTOPARTES') || flatSampleText.includes('RGL-AUTOPARTES')) {
        supplierLabel = 'RGL Autopartes S.R.L.';
        defaultPrefix = 'RGL-';
        let currentBrand = 'Multimarca';
        let currentCat = 'Cerrajería y Levanta Cristales';

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
            currentCat = col3.charAt(0).toUpperCase() + col3.slice(1).toLowerCase();
            return;
          }
          if (col1 && col3 && price > 0 && col1.toUpperCase() !== 'CODIGO') {
            parsedRows.push({
              sku_code: col1,
              name: col3.replace(/\s+/g, ' '),
              price,
              stock: 1,
              categoryName: currentCat,
              brandName: currentBrand !== 'Multimarca' ? currentBrand : extractBrandFromText(col3),
              description: col2 ? `OEM: ${col2}` : ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 3. LISTA AUTOCONS (Hoja 'Listado de Precios por Cliente', Col 0=Cod, Col 1=Desc, Col 5=Precio)
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
              categoryName: 'Cerrajería y Levanta Cristales',
              brandName: currentBrand !== 'Multimarca' ? currentBrand : extractBrandFromText(col1),
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 4. WARGOM (Múltiples hojas, ej: 32 pestañas por rubro)
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('WARGOM') || sheetNames.length >= 10) {
        supplierLabel = `Wargom S.R.L. (${sheetNames.length} rubros)`;
        defaultPrefix = 'WG-';
        sheetNames.forEach(sName => {
          const ws = workbook.Sheets[sName];
          const mat = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          const cleanCategory = sName.trim().charAt(0).toUpperCase() + sName.trim().slice(1).toLowerCase();
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
                categoryName: cleanCategory,
                brandName: detectedB !== 'Multimarca' ? detectedB : currentSubBrand,
                description: ''
              });
            }
          });
        });
      }
      // -----------------------------------------------------------------------
      // 5. CRISTEM LISTA GENERAL
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('GRUPO DE  PIEZA') || flatSampleText.includes('GRUPO DE PIEZA')) {
        supplierLabel = 'Cristem (Lista General Cristales)';
        defaultPrefix = 'CR-';
        firstMatrix.slice(1).forEach(row => {
          const brand = String(row[0] ?? '').trim();
          const model = String(row[1] ?? '').trim();
          const pieceCode = String(row[2] ?? '').trim();
          const sku = String(row[3] ?? '').trim();
          const group = String(row[4] ?? '').trim() || 'Cristales';
          const price = parsePriceNumber(row[7]);
          const obs = String(row[8] ?? '').trim();

          if (sku && price > 0) {
            parsedRows.push({
              sku_code: sku,
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
      // 6. CRISTEM OFERTAS
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
      // 7. AUTOCLIP / VAER
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
              categoryName: 'Fijaciones y Grampas',
              brandName: extractBrandFromText(name),
              description: pack ? `Envase: ${pack} u.` : ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 8. RIDAC / ANGELETTI
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('ANGELETTI') || sheetNames.some(s => s.includes('LISTA NAC'))) {
        supplierLabel = 'Ridac (Angeletti H. e Hijos)';
        defaultPrefix = 'RD-';
        sheetNames.forEach(sName => {
          if (sName.toUpperCase().includes('ALFA')) return;
          const ws = workbook.Sheets[sName];
          const mat = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          mat.forEach(row => {
            const name = String(row[0] ?? '').trim();
            const sku = String(row[2] || row[1] || '').trim();
            const price = parsePriceNumber(row[3]);
            if (name && sku && price > 0 && !['DETALLE', 'DESCRIPCION'].includes(name.toUpperCase())) {
              parsedRows.push({
                sku_code: sku,
                name: name.replace(/\s+/g, ' '),
                price,
                stock: 1,
                categoryName: 'Accesorios y Repuestos Varios',
                brandName: extractBrandFromText(name),
                description: ''
              });
            }
          });
        });
      }
      // -----------------------------------------------------------------------
      // 9. RETOV / TOVLENT
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('TOVLENT') || flatSampleText.includes('RETOV')) {
        supplierLabel = 'Retov (Tovlent S.A.)';
        defaultPrefix = 'RT-';
        let currentCat = 'Tazas y Plásticos';
        let currentBrand = 'Multimarca';

        firstMatrix.forEach(row => {
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const col2 = String(row[2] ?? '').trim();
          const price = parsePriceNumber(row[4]);

          if (col0 && col0 !== '*' && !col1) {
            if (col0.toUpperCase().includes('ADAPTABLE')) {
              currentBrand = extractBrandFromText(col0);
            } else {
              currentCat = col0.charAt(0).toUpperCase() + col0.slice(1).toLowerCase();
            }
            return;
          }

          if (col1 && col2 && price > 0 && col1.toUpperCase() !== 'COD. ART.') {
            const prefixItem = currentCat.toUpperCase().includes('TAZA') ? 'Taza de Rueda' : currentCat;
            parsedRows.push({
              sku_code: col1,
              name: `${prefixItem} ${currentBrand !== 'Multimarca' ? currentBrand : ''} ${col2}`.replace(/\s+/g, ' ').trim(),
              price,
              stock: 1,
              categoryName: currentCat,
              brandName: currentBrand !== 'Multimarca' ? currentBrand : extractBrandFromText(col2),
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 10. VARPEN / VAPREN
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
              categoryName: 'Alfombras',
              brandName: currentBrand,
              description: ''
            });
          }
        });
      }
      // -----------------------------------------------------------------------
      // 11. TECNOCHAPA (LISTA SEP TECNO)
      // -----------------------------------------------------------------------
      else if (flatSampleText.includes('LISTA TECNO')) {
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

            parsedRows.push({
              sku_code: sku,
              name: fullName,
              price,
              stock: 1,
              categoryName: detectCategoryFromName(rawName),
              brandName: extractBrandFromText(rawVehicle),
              description: ''
            });
          });
      }
      // -----------------------------------------------------------------------
      // 12. PLANTILLAS ESTÁNDAR (DAPA / EMPRETIENDA / TIENDANUBE)
      // -----------------------------------------------------------------------
      else {
        supplierLabel = 'Plantilla Estándar / Personalizada';
        defaultPrefix = '';
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, firstMatrix.length); i++) {
          const rowNorm = firstMatrix[i].map(c => normalizeKey(c));
          if (rowNorm.some(c => ['nombre', 'producto', 'descripcion', 'titulo'].includes(c))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex !== -1) {
          const headers = firstMatrix[headerRowIndex].map(h => normalizeKey(h));
          firstMatrix.slice(headerRowIndex + 1).forEach((rowArray, idx) => {
            const rowObj = {};
            headers.forEach((h, cIdx) => { if (h) rowObj[h] = rowArray[cIdx]; });
            const name = String(rowObj.nombre || rowObj.producto || rowObj.descripcion || '').trim();
            if (!name) return;
            const sku = String(rowObj.codigo ?? rowObj.sku ?? rowObj.sku_code ?? rowObj['cod. art.'] ?? `SKU-${Date.now()}-${idx}`).replace(/\.0$/, '').trim();
            const price = parsePriceNumber(rowObj.precio ?? rowObj.price ?? rowObj.neto ?? rowObj['precio lista'] ?? rowObj['precio unitario'] ?? 0);
            if (price <= 0) return;
            const rawStock = String(rowObj.stock ?? rowObj.cantidad ?? '1').replace(/[^0-9]/g, '');
            const stock = rawStock !== '' ? parseInt(rawStock, 10) : 1;
            const categoryName = String(rowObj.categoria || rowObj.categorias || rowObj.rubro || 'General').trim() || 'General';
            const brandName = String(rowObj.marca || '').trim() || extractBrandFromText(name);
            const description = String(rowObj.descripcion || rowObj.observaciones || '').trim();

            parsedRows.push({ sku_code: sku, name, price, stock, categoryName, brandName, description });
          });
        } else {
          // Si es un Excel totalmente nuevo sin encabezados conocidos, activamos el selector manual
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
  // FUNCIONES DE CATEGORÍAS, MARCAS, PEDIDOS Y VENTA MANUAL (POS)
  // =======================================================================
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim(), description: newCategoryDesc.trim(), is_active: true }]);
    if (error) {
      showNotification("Error al crear categoría: " + error.message, 'error');
    } else {
      showNotification("Categoría agregada con éxito", 'success');
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      fetchData();
    }
    setIsSubmitting(false);
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

  // Descuento automático de stock al pasar un pedido a "Facturado"
  const updateOrderStatus = async (orderId, newStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    const wasAlreadyBilled = targetOrder?.status === 'Facturado';

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      showNotification("No se pudo actualizar el pedido", 'error');
      return;
    }

    // Si pasa a Facturado por primera vez y tiene productos, descontamos el stock
    if (newStatus === 'Facturado' && !wasAlreadyBilled && targetOrder?.order_items?.length > 0) {
      const updatedStockMap = new Map();
      for (const item of targetOrder.order_items) {
        const prodId = item.product_id || item.product?.id;
        if (!prodId) continue;
        const currentProd = products.find(p => p.id === prodId);
        if (currentProd) {
          const newStock = Math.max(0, Number(currentProd.stock || 0) - Number(item.quantity || 0));
          await supabase.from('products').update({ stock: newStock }).eq('id', prodId);
          updatedStockMap.set(prodId, newStock);
        }
      }
      if (updatedStockMap.size > 0) {
        setProducts(prev => prev.map(p => updatedStockMap.has(p.id) ? { ...p, stock: updatedStockMap.get(p.id) } : p));
      }
      showNotification(`Pedido #${orderId} facturado y stock descontado automáticamente`, 'success');
    } else {
      showNotification(`Pedido #${orderId} actualizado a ${newStatus}`, 'success');
    }

    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
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
      const notesText = `TIPO DE VENTA: Venta Manual / Mostrador\nMÉTODO DE PAGO: ${posPaymentMethod.toUpperCase()}${posNotes ? `\nNOTAS: ${posNotes}` : ''}`;
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
    return status.startsWith('Pendiente') || status === 'Cotización Web';
  };

  const pendingOrdersCount = orders.filter(o => isOrderPending(o.status)).length;
  const completedOrdersCount = orders.filter(o => o.status === 'Facturado' || o.status === 'Cancelado').length;

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'pendientes') return isOrderPending(o.status) || o.status === 'Revisado';
    if (orderFilter === 'facturados') return o.status === 'Facturado';
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
        <div className="bg-slate-800 p-8 rounded-none shadow-2xl w-full max-w-md border border-slate-700 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-900/50 rounded-none flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold font-michroma text-white tracking-widest uppercase">D.A.P.A</h1>
            <p className="text-blue-500 font-exo text-xs uppercase tracking-[0.2em] mt-1">Acceso Restringido</p>
          </div>

          {session && !isAuthorizedAdmin ? (
            <div className="text-center space-y-4">
              <p className="text-red-400 text-xs font-bold bg-red-900/20 p-4 rounded-none border border-red-800">
                La cuenta actual ({session.user.email}) es de cliente y no tiene permisos de administrador.
              </p>
              <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest py-3 rounded-none transition-colors text-xs">
                Cerrar sesión actual
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Correo Electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-none text-white outline-none focus:border-blue-500 transition-colors" placeholder="admin@dapa.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-none text-white outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" />
              </div>
              {loginError && <p className="text-red-400 text-xs font-bold text-center bg-red-900/20 p-2 rounded-none border border-red-900">{loginError}</p>}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-4 rounded-none transition-colors mt-4 shadow-lg focus:outline-none disabled:opacity-50">
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
        <div className={`fixed top-6 right-6 px-6 py-3.5 rounded-none shadow-2xl z-[250] flex items-center gap-3 animate-in slide-in-from-top-10 border text-white font-bold text-xs uppercase tracking-wider ${
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
          <button onClick={() => setActiveTab('productos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-colors font-semibold text-sm ${activeTab === 'productos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Tags className="w-5 h-5" /> Repuestos
          </button>
          <button onClick={() => setActiveTab('pedidos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-colors font-semibold text-sm ${activeTab === 'pedidos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <ClipboardList className="w-5 h-5" /> Pedidos
            {pendingOrdersCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-1 rounded-none">{pendingOrdersCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('estadisticas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-colors font-semibold text-sm ${activeTab === 'estadisticas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <BarChart3 className="w-5 h-5" /> Estadísticas
            {stats.outOfStockProducts.length > 0 && (
              <span className="ml-auto bg-amber-500 text-slate-900 font-bold text-[10px] px-2 py-0.5 rounded-none">
                {stats.outOfStockProducts.length}
              </span>
            )}
          </button>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">
            <ArrowLeft className="w-4 h-4" /> Ver Tienda
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-none bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">
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
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-none flex items-center justify-center font-bold">A</div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{session.user.email}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/50">
          
          {/* =============================================================== */}
          {/* VISTA 1: PRODUCTOS E INVENTARIO */}
          {/* =============================================================== */}
          {activeTab === 'productos' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm flex flex-col h-full overflow-hidden">
              
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
                      className="w-full pl-10 pr-8 py-2 rounded-none border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-none font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors focus:outline-none">
                      <ListPlus className="w-4 h-4" /> + Categoría
                    </button>
                    <button onClick={() => setIsBrandModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-none font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors focus:outline-none">
                      <Tag className="w-4 h-4" /> + Marca
                    </button>
                    <button 
                      onClick={() => setIsBulkPriceModalOpen(true)} 
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-none font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-colors focus:outline-none"
                    >
                      <Percent className="w-4 h-4" /> Actualizar %
                    </button>
                    <button 
                      onClick={() => { setExcelPreview([]); setExcelFileName(''); setIsExcelModalOpen(true); }} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-none font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-colors focus:outline-none"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Importar Excel
                    </button>
                    <button onClick={openAddProductModal} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-none font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-colors focus:outline-none">
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
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-none px-3 py-2 outline-none focus:border-blue-500 font-medium"
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
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-none px-3 py-2 outline-none focus:border-blue-500 font-medium"
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
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-none px-3 py-2 outline-none focus:border-blue-500 font-medium"
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
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-none px-3 py-2 outline-none focus:border-blue-500 font-medium"
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
                      <button onClick={clearAllProductFilters} className="mt-2 px-4 py-2 rounded-none bg-blue-600 text-white text-xs font-bold uppercase tracking-wider">
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
                              <img src={prod.image_url} alt={prod.name} className="w-10 h-10 object-cover rounded-none border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-none flex items-center justify-center border border-slate-200 dark:border-slate-700">
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
                                className="w-28 text-right px-2 py-1 rounded-none border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startInlineEdit(prod, 'price')}
                                title="Clic para editar precio rápidamente"
                                className="text-sm font-bold text-slate-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 px-2 py-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
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
                                className="w-20 text-center px-2 py-1 rounded-none border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startInlineEdit(prod, 'stock')}
                                title="Clic para editar stock rápidamente"
                                className={`px-3 py-1 rounded-none text-xs font-bold transition-transform hover:scale-105 ${
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
                              <button onClick={() => openEditProductModal(prod)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-none transition-colors focus:outline-none" title="Editar ficha completa">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setProductToDelete(prod)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 rounded-none transition-colors focus:outline-none" title="Eliminar">
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
                      className="px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1 font-bold"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                      disabled={currentPage === totalProductPages}
                      onClick={() => setCurrentPage(p => Math.min(totalProductPages, p + 1))}
                      className="px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1 font-bold"
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
              <div className="bg-white dark:bg-slate-800 p-4 rounded-none border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {[
                    { id: 'todos', label: `Todos (${orders.length})` },
                    { id: 'pendientes', label: `Pendientes (${pendingOrdersCount})` },
                    { id: 'facturados', label: 'Facturados' },
                    { id: 'cancelados', label: 'Cancelados' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOrderFilter(tab.id)}
                      className={`px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
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
                    className="px-4 py-2 rounded-none bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" /> Nueva Venta Manual
                  </button>

                  {completedOrdersCount > 0 && (
                    <button
                      onClick={() => setConfirmClearCompleted(true)}
                      className="px-4 py-2 rounded-none bg-red-50 dark:bg-red-900/20 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Limpiar Finalizados ({completedOrdersCount})
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-10 text-center text-slate-500">Cargando pedidos...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-none p-20 text-center border border-slate-200 dark:border-slate-700">
                  <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No hay pedidos en esta vista</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm overflow-hidden flex flex-col">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-start gap-3">
                        <div>
                          <span className="text-xs font-bold tracking-widest uppercase text-blue-600 block mb-1">Pedido #{order.id}</span>
                          <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                            <Calendar className="w-3 h-3"/> {new Date(order.created_at).toLocaleString('es-AR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select 
                            value={order.status} 
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)} 
                            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-none outline-none cursor-pointer border ${
                              isOrderPending(order.status) 
                                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                                : order.status === 'Facturado' 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : order.status === 'Cancelado'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Pendiente (Vía Web)">Pendiente (Vía Web)</option>
                            <option value="Pendiente (Vía WhatsApp)">Pendiente (Vía WhatsApp)</option>
                            <option value="Cotización Web">Cotización Web</option>
                            <option value="Revisado">Revisado</option>
                            <option value="Facturado">Facturado / Listo</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>

                          <button
                            onClick={() => setOrderToDelete(order)}
                            title="Eliminar pedido"
                            className="p-2 rounded-none text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-4 mb-5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-none border border-slate-100 dark:border-slate-700">
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
                          
                          // Limpiamos el texto de las notas para que no repita el link gigante si ya mostramos las fotos
                          let cleanNotes = order.notes;
                          imageLinks.forEach(link => {
                            cleanNotes = cleanNotes.replace(link, '').replace(/FOTO REPUESTO:\s*/gi, '').replace(/FOTO CÉDULA \/ CHASIS:\s*/gi, '');
                          });

                          return (
                            <div className="mt-auto space-y-3">
                              <div className="bg-blue-50/50 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-700 rounded-none p-4">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                                  Datos de Envío / Especificaciones
                                </h5>
                                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                                  {cleanNotes.trim()}
                                </p>
                              </div>

                              {imageLinks.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-none p-3">
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
                                        className="group relative w-20 h-20 rounded-none overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm hover:border-blue-500 transition-all"
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

                      <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Cotizado</span>
                        <span className="text-xl font-bold font-exo text-slate-900 dark:text-white">
                          ${Number(order.total_estimated || 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
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
                <div className="bg-white dark:bg-slate-800 p-6 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Facturación del Mes</span>
                  <p className="text-3xl font-bold font-exo text-emerald-600 dark:text-emerald-400">
                    ${stats.monthlyRevenue.toLocaleString('es-AR')}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">{stats.monthlyBilledCount} ventas cerradas este mes</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Facturación Histórica</span>
                  <p className="text-3xl font-bold font-exo text-slate-900 dark:text-white">
                    ${stats.totalRevenue.toLocaleString('es-AR')}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">{stats.billedCount} ventas totales • Ticket prom: ${stats.avgTicket.toLocaleString('es-AR')}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Capital en Mercadería</span>
                  <p className="text-3xl font-bold font-exo text-blue-600 dark:text-blue-400">
                    ${stats.totalInventoryValue.toLocaleString('es-AR')}
                  </p>
                  <span className="text-xs text-slate-500 mt-2 block">{products.length} artículos activos en catálogo</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
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
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm overflow-hidden">
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
                              <span className={`px-3 py-1 rounded-none text-xs font-bold ${
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
                                  className="px-2.5 py-1 rounded-none bg-blue-50 dark:bg-slate-700 hover:bg-blue-600 text-blue-600 dark:text-blue-300 hover:text-white text-xs font-bold transition-colors"
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
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-none bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
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
                      className={`py-2.5 px-3 rounded-none text-xs font-bold uppercase tracking-wider border transition-colors ${
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Redondear precios a</label>
                  <select
                    value={bulkRounding}
                    onChange={(e) => setBulkRounding(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  >
                    <option value="1">Sin redondeo ($1)</option>
                    <option value="10">Múltiplos de $10</option>
                    <option value="100">Múltiplos de $100</option>
                    <option value="500">Múltiplos de $500</option>
                    <option value="1000">Múltiplos de $1.000</option>
                  </select>
                </div>
              </div>

              <div className="bg-purple-50/60 dark:bg-slate-900/70 border border-purple-200 dark:border-slate-700 rounded-none p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
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
                  className="px-5 py-2.5 rounded-none text-xs font-bold uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || targetBulkProducts.length === 0}
                  className="px-6 py-2.5 rounded-none bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-600/30 disabled:opacity-50"
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
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-none bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
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
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Teléfono (Opcional)</label>
                  <input
                    type="text"
                    value={posCustomerPhone}
                    onChange={(e) => setPosCustomerPhone(e.target.value)}
                    placeholder="Ej: 2478..."
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Medio de Pago</label>
                  <select
                    value={posPaymentMethod}
                    onChange={(e) => setPosPaymentMethod(e.target.value)}
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-none border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                {posSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
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
              <div className="border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden">
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
                              className="w-16 text-center py-1 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
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
                    className="w-4 h-4 rounded-none text-blue-600"
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
                  className="px-5 py-2.5 rounded-none text-xs font-bold uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || posItems.length === 0}
                  className="px-6 py-2.5 rounded-none bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/30 disabled:opacity-50"
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
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-none bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-none border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-white uppercase tracking-wider">Columnas reconocidas:</p>
                  <p><strong>Codigo</strong> (SKU), <strong>Nombre</strong>, <strong>Precio</strong>, <strong>Stock</strong>, <strong>Categoria</strong>, <strong>Marca</strong>, <strong>Descripcion</strong>.</p>
                  <p className="text-[11px] text-slate-400">Si el Código ya existe en tu tienda, se actualizará su precio y stock automáticamente.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex-shrink-0 px-4 py-2.5 rounded-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Descargar Plantilla
                </button>
              </div>

              <div className="relative border-2 border-dashed border-emerald-400/70 dark:border-emerald-600/60 rounded-none p-8 text-center bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 transition-colors cursor-pointer">
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
                <div className="bg-emerald-50/60 dark:bg-slate-900/80 border border-emerald-200 dark:border-slate-700 rounded-none p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
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
                  className="mt-1 w-full px-3 py-1.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
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
                      className="mt-1 w-full px-3 py-1.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  {rawSheetMatrix.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-none p-4 space-y-3">
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
                            className="mt-1 w-full px-2.5 py-1.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
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
                          className="mt-1 w-full px-2.5 py-1.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => applyManualColumnMapping(manualCols)}
                          className="w-full py-1.5 px-3 rounded-none bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase"
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

                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-none">
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
                              <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase ${
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
                  className="px-5 py-2.5 rounded-none text-xs font-bold uppercase text-slate-500 hover:bg-slate-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || excelPreview.length === 0}
                  onClick={handleConfirmExcelImport}
                  className="px-6 py-2.5 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center mx-auto mb-4">
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
                className="flex-1 py-3 rounded-none font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={confirmDeleteProduct} 
                className="flex-1 py-3 rounded-none font-bold uppercase tracking-widest text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors disabled:opacity-60"
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
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center mx-auto mb-4">
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
                className="flex-1 py-3 rounded-none font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={confirmDeleteOrder} 
                className="flex-1 py-3 rounded-none font-bold uppercase tracking-widest text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA LIMPIAR TODOS LOS PEDIDOS FINALIZADOS */}
      {confirmClearCompleted && (
        <div className="fixed inset-0 bg-slate-900/70 z-[220] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center mx-auto mb-4">
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
                className="flex-1 py-3 rounded-none font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={handleClearCompletedOrders} 
                className="flex-1 py-3 rounded-none font-bold uppercase tracking-widest text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors disabled:opacity-60"
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
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 my-8">
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
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-none h-48 md:h-full min-h-[200px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 transition-colors overflow-hidden group">
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
                    <input required name="sku_code" value={formData.sku_code} onChange={handleInputChange} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre del Repuesto *</label>
                    <input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Categoría *</label>
                    <select required name="category_id" value={formData.category_id} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500">
                      <option value="">Seleccionar...</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Marca *</label>
                    <select required name="brand_id" value={formData.brand_id} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500">
                      <option value="">Seleccionar...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Precio (ARS) *</label>
                    <input required name="price" value={formData.price} onChange={handleInputChange} type="number" step="0.01" min="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Stock *</label>
                    <input required name="stock" value={formData.stock} onChange={handleInputChange} type="number" min="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descripción / Compatibilidad (Opcional)</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="Ej: Aplicable a motores 1.6 8v..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none" />
                </div>
                <div className="pt-2 flex justify-end gap-4 mt-auto">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-none font-bold uppercase text-xs text-slate-500 hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-none font-bold uppercase text-xs flex items-center gap-2 shadow-lg disabled:opacity-70">
                    {isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4" /> {editingProductId ? 'Actualizar' : 'Guardar'}</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CATEGORÍA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Nueva Categoría</h2>
              <button onClick={() => setIsCategoryModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre (Ej: Suspensión)</label>
                <input required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descripción (Opcional)</label>
                <input value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-none font-bold uppercase text-xs mt-2 disabled:opacity-70">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA MARCA */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-none shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Nueva Marca</h2>
              <button onClick={() => setIsBrandModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddBrand} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre de la Marca (Ej: NGK)</label>
                <input required value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-none text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-none font-bold uppercase text-xs mt-2 disabled:opacity-70">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}