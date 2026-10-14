import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Tags, ClipboardList, ArrowLeft, Plus, X, Save, Package, CheckCircle, 
  Calendar, User as UserIcon, Phone, FileText, Lock, LogOut, 
  Image as ImageIcon, Upload, Edit, Trash2, ListPlus, Tag, Search, 
  AlertTriangle, FileSpreadsheet, Download, RefreshCw
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
  const [searchTerm, setSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState('todos');

  // Estados de los Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const notifTimeoutRef = useRef(null);
  
  // Estados para Producto
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

  // Estados para Importación de Excel
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  const isAuthorizedAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase());

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
        supabase.from('orders').select(`*, order_items (quantity, unit_price, product:products (name, sku_code))`).order('created_at', { ascending: false })
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

  const showNotification = (message, type = 'success') => {
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    setNotification({ message, type });
    notifTimeoutRef.current = setTimeout(() => setNotification(null), 3500);
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
  // IMPORTACIÓN MASIVA POR EXCEL (.XLSX / .XLS / .CSV)
  // =======================================================================
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await loadXlsxLibrary();
      const sampleData = [
        {
          Codigo: 'OPT-001',
          Nombre: 'Óptica Delantera Derecha Volkswagen Gol Trend',
          Precio: 85000,
          Stock: 5,
          Categoria: 'Iluminación',
          Marca: 'Volkswagen',
          Descripcion: 'Modelos 2013 a 2016'
        },
        {
          Codigo: 'AMO-204',
          Nombre: 'Amortiguador Delantero Toyota Hilux',
          Precio: 120000,
          Stock: 8,
          Categoria: 'Suspensión',
          Marca: 'Toyota',
          Descripcion: 'Aplicable a 4x2 y 4x4'
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
      XLSX.writeFile(workbook, 'Plantilla_Productos_DAPA.xlsx');
    } catch (err) {
      showNotification('Error al generar la plantilla', 'error');
    }
  };

  const normalizeKey = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const handleExcelFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setExcelFileName(file.name);
    setExcelPreview([]);

    try {
      const XLSX = await loadXlsxLibrary();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showNotification('El archivo Excel está vacío', 'error');
        setIsParsingExcel(false);
        return;
      }

      const existingSkuMap = new Map(
        products.map(p => [String(p.sku_code).trim().toLowerCase(), p])
      );

      const parsedRows = rawRows.map((row, index) => {
        const normalizedRow = {};
        Object.keys(row).forEach(k => {
          normalizedRow[normalizeKey(k)] = row[k];
        });

        const sku = String(
          normalizedRow.codigo || normalizedRow.sku || normalizedRow.sku_code || normalizedRow.cod || `SKU-${Date.now()}-${index}`
        ).trim();

        const name = String(
          normalizedRow.nombre || normalizedRow.producto || normalizedRow.descripcion || normalizedRow.name || normalizedRow.titulo || ''
        ).trim();

        const rawPrice = String(normalizedRow.precio || normalizedRow.price || normalizedRow.valor || '0')
          .replace(/[^0-9.,-]/g, '')
          .replace(',', '.');
        const price = parseFloat(rawPrice) || 0;

        const rawStock = String(normalizedRow.stock || normalizedRow.cantidad || '1').replace(/[^0-9]/g, '');
        const stock = rawStock !== '' ? parseInt(rawStock, 10) : 1;

        const categoryName = String(
          normalizedRow.categoria || normalizedRow.rubro || normalizedRow.category || 'General'
        ).trim() || 'General';

        const brandName = String(
          normalizedRow.marca || normalizedRow.brand || 'Multimarca'
        ).trim() || 'Multimarca';

        const description = String(
          normalizedRow.detalle || normalizedRow.observaciones || normalizedRow.descripcion_larga || ''
        ).trim();

        const existingProduct = existingSkuMap.get(sku.toLowerCase());

        return {
          sku_code: sku,
          name,
          price,
          stock,
          categoryName,
          brandName,
          description,
          isUpdate: !!existingProduct,
          existingId: existingProduct?.id || null
        };
      }).filter(item => item.name.length > 0);

      if (parsedRows.length === 0) {
        showNotification('No se encontraron columnas válidas (Codigo, Nombre, Precio)', 'error');
      } else {
        setExcelPreview(parsedRows);
      }
    } catch (err) {
      console.error('Error leyendo Excel:', err);
      showNotification('No se pudo leer el archivo Excel. Verificá el formato.', 'error');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    if (excelPreview.length === 0) return;
    setIsSubmitting(true);
    setImportProgress('Verificando categorías y marcas...');

    try {
      // 1. Mapear categorías existentes y crear las nuevas que vengan en el Excel
      const catMap = new Map(categories.map(c => [normalizeKey(c.name), c.id]));
      const uniqueNewCats = [...new Set(excelPreview.map(r => r.categoryName))]
        .filter(name => !catMap.has(normalizeKey(name)));

      if (uniqueNewCats.length > 0) {
        const { data: insertedCats, error: catErr } = await supabase
          .from('categories')
          .insert(uniqueNewCats.map(name => ({ name, is_active: true })))
          .select();
        if (catErr) throw catErr;
        insertedCats?.forEach(c => catMap.set(normalizeKey(c.name), c.id));
      }

      // 2. Mapear marcas existentes y crear las nuevas que vengan en el Excel
      const brandMap = new Map(brands.map(b => [normalizeKey(b.name), b.id]));
      const uniqueNewBrands = [...new Set(excelPreview.map(r => r.brandName))]
        .filter(name => !brandMap.has(normalizeKey(name)));

      if (uniqueNewBrands.length > 0) {
        const { data: insertedBrands, error: brandErr } = await supabase
          .from('brands')
          .insert(uniqueNewBrands.map(name => ({ name })))
          .select();
        if (brandErr) throw brandErr;
        insertedBrands?.forEach(b => brandMap.set(normalizeKey(b.name), b.id));
      }

      // 3. Separar productos nuevos vs actualizaciones
      const toInsert = [];
      const toUpdate = [];

      excelPreview.forEach(item => {
        const payload = {
          sku_code: item.sku_code,
          name: item.name,
          price: item.price,
          stock: item.stock,
          category_id: catMap.get(normalizeKey(item.categoryName)) || categories[0]?.id,
          brand_id: brandMap.get(normalizeKey(item.brandName)) || brands[0]?.id,
          is_active: true
        };
        if (item.description) payload.description = item.description;

        if (item.isUpdate && item.existingId) {
          toUpdate.push({ id: item.existingId, ...payload });
        } else {
          toInsert.push(payload);
        }
      });

      // 4. Insertar nuevos en lotes de 200
      if (toInsert.length > 0) {
        setImportProgress(`Cargando ${toInsert.length} productos nuevos...`);
        const batchSize = 200;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          const { error: insertErr } = await supabase.from('products').insert(batch);
          if (insertErr) throw insertErr;
        }
      }

      // 5. Actualizar existentes
      if (toUpdate.length > 0) {
        setImportProgress(`Actualizando ${toUpdate.length} productos existentes...`);
        for (const prod of toUpdate) {
          const { id, ...updateFields } = prod;
          await supabase.from('products').update(updateFields).eq('id', id);
        }
      }

      showNotification(`¡Importación exitosa! (${toInsert.length} nuevos, ${toUpdate.length} actualizados)`, 'success');
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

  // =======================================================================
  // FUNCIONES DE CATEGORÍAS, MARCAS Y PEDIDOS
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

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showNotification(`Pedido #${orderId} actualizado a ${newStatus}`, 'success');
    } else {
      showNotification("No se pudo actualizar el pedido", 'error');
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsSubmitting(true);
    try {
      // 1. Primero eliminamos los items asociados en order_items
      await supabase.from('order_items').delete().eq('order_id', orderToDelete.id);

      // 2. Luego eliminamos la orden principal
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

  const filteredProducts = products.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku_code?.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q) ||
      p.brand?.name?.toLowerCase().includes(q)
    );
  });

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
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
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
        <header className="bg-white dark:bg-slate-800 h-16 shadow-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 z-10">
          <h1 className="font-bold font-exo text-xl uppercase tracking-widest text-slate-800 dark:text-white">
            {activeTab === 'productos' ? 'Gestión de Inventario' : 'Bandeja de Pedidos'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">A</div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{session.user.email}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/50">
          
          {/* VISTA: PRODUCTOS */}
          {activeTab === 'productos' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tus Repuestos</h2>
                  <p className="text-sm text-slate-500 font-light">{filteredProducts.length} de {products.length} productos.</p>
                </div>

                <div className="relative w-full xl:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Buscar por código, nombre o marca..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-colors focus:outline-none">
                    <ListPlus className="w-4 h-4" /> Categoría
                  </button>
                  <button onClick={() => setIsBrandModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-colors focus:outline-none">
                    <Tag className="w-4 h-4" /> Marca
                  </button>
                  <button 
                    onClick={() => { setExcelPreview([]); setExcelFileName(''); setIsExcelModalOpen(true); }} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-colors focus:outline-none"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Importar Excel
                  </button>
                  <button onClick={openAddProductModal} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-colors focus:outline-none">
                    <Plus className="w-4 h-4" /> Nuevo Repuesto
                  </button>
                </div>
              </div>

              <div className="p-0 flex-1 overflow-auto relative">
                {isLoading ? (
                  <div className="p-10 text-center text-slate-500">Cargando base de datos...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center">
                    <Package className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sin resultados</h3>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-16">Foto</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Código</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Categoría / Marca</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Precio</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Stock</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 text-center">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-sm font-bold text-slate-700 dark:text-slate-300 font-exo">{prod.sku_code}</td>
                          <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">{prod.name}</td>
                          <td className="p-4 text-sm text-slate-500">
                            <span className="block text-slate-700 dark:text-slate-300 font-medium">{prod.category?.name || '-'}</span>
                            <span className="text-[11px] uppercase text-slate-400">{prod.brand?.name || ''}</span>
                          </td>
                          <td className="p-4 text-sm font-bold text-slate-800 dark:text-white text-right">${Number(prod.price).toLocaleString('es-AR')}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${prod.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {prod.stock > 0 ? prod.stock : 'Sin'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openEditProductModal(prod)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none" title="Editar">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setProductToDelete(prod)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors focus:outline-none" title="Eliminar">
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
            </div>
          )}

          {/* VISTA: PEDIDOS */}
          {activeTab === 'pedidos' && (
            <div className="space-y-6">
              {/* Barra Superior de Filtros y Limpieza de Pedidos */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
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

                {completedOrdersCount > 0 && (
                  <button
                    onClick={() => setConfirmClearCompleted(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Limpiar Finalizados ({completedOrdersCount})
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="p-10 text-center text-slate-500">Cargando pedidos...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-20 text-center border border-slate-200 dark:border-slate-700">
                  <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No hay pedidos en esta vista</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
                            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg outline-none cursor-pointer border ${
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
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

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

                        {order.notes && (
                          <div className="mt-auto bg-blue-50/50 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-700 rounded-xl p-4">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                              Datos de Envío / Especificaciones
                            </h5>
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                              {order.notes}
                            </p>
                          </div>
                        )}
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
        </div>
      </main>

      {/* MODAL: IMPORTACIÓN MASIVA POR EXCEL */}
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
              {/* Paso 1: Descargar plantilla o subir archivo */}
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

              {/* Zona de carga de archivo */}
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

              {/* Vista previa de productos detectados */}
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
                  {excelPreview.length > 100 && (
                    <p className="text-[11px] text-slate-400 text-center">
                      Mostrando los primeros 100 de {excelPreview.length} productos. Todos serán procesados al confirmar.
                    </p>
                  )}
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

      {/* MODAL: NUEVA CATEGORÍA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Nueva Categoría</h2>
              <button onClick={() => setIsCategoryModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre (Ej: Suspensión)</label>
                <input required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descripción (Opcional)</label>
                <input value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-xs mt-2 disabled:opacity-70">
                Guardar
              </button>
            </form>
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