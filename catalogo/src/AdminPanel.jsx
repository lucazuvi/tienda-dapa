import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tags, ClipboardList, ArrowLeft, Plus, X, Save, Package, CheckCircle, Calendar, User as UserIcon, Phone, FileText, Lock, LogOut, Image as ImageIcon, Upload, Edit, Trash2, ListPlus, Tag } from 'lucide-react';
import { supabase } from './supabase';

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

  // Estados de los Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Estados para Producto
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState({ sku_code: '', name: '', description: '', price: '', stock: '1', category_id: '', brand_id: '' });

  // Estados para Categorías y Marcas
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchData(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) fetchData(); });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); setIsLoggingIn(true); setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError('Correo o contraseña incorrectos.');
    setIsLoggingIn(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const fetchData = async () => {
    setIsLoading(true);
    const [catsRes, brandsRes, prodsRes, ordersRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('products').select('*, category:categories(name), brand:brands(name)').order('created_at', { ascending: false }),
      supabase.from('orders').select(`*, order_items (quantity, unit_price, product:products (name, sku_code))`).order('created_at', { ascending: false })
    ]);
    if (catsRes.data) setCategories(catsRes.data);
    if (brandsRes.data) setBrands(brandsRes.data);
    if (prodsRes.data) setProducts(prodsRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    setIsLoading(false);
  };

  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  // =======================================================================
  // FUNCIONES DE PRODUCTOS (Crear, Editar, Eliminar)
  // =======================================================================
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const openAddProductModal = () => {
    setEditingProductId(null);
    setFormData({ sku_code: '', name: '', description: '', price: '', stock: '1', category_id: '', brand_id: '' });
    setImageFile(null); setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditProductModal = (prod) => {
    setEditingProductId(prod.id);
    setFormData({ sku_code: prod.sku_code, name: prod.name, description: prod.description || '', price: prod.price, stock: prod.stock, category_id: prod.category_id || '', brand_id: prod.brand_id || '' });
    setImageFile(null);
    setImagePreview(prod.image_url); // Muestra la foto actual si la tiene
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Estás seguro de que querés eliminar este repuesto definitivamente?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) alert("Error al eliminar: " + error.message);
      else { showNotification("Repuesto eliminado"); fetchData(); }
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    let finalImageUrl = editingProductId ? imagePreview : null; // Si editamos y no cambiamos foto, mantenemos la anterior

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('repuestos').upload(fileName, imageFile);
      if (uploadError) { alert("Error al subir foto: " + uploadError.message); setIsSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from('repuestos').getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    }

    const productData = { 
      sku_code: formData.sku_code, name: formData.name, description: formData.description, 
      price: parseFloat(formData.price), stock: parseInt(formData.stock), 
      category_id: parseInt(formData.category_id), brand_id: parseInt(formData.brand_id),
      image_url: finalImageUrl 
    };
    
    let error;
    if (editingProductId) {
      const res = await supabase.from('products').update(productData).eq('id', editingProductId);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([productData]);
      error = res.error;
    }
    
    if (error) { alert("Error al guardar: " + error.message); } 
    else { 
      showNotification(editingProductId ? "Repuesto actualizado" : "Repuesto agregado"); 
      setIsModalOpen(false); fetchData(); 
    }
    setIsSubmitting(false);
  };

  // =======================================================================
  // FUNCIONES DE CATEGORÍAS Y MARCAS
  // =======================================================================
  const handleAddCategory = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName, description: newCategoryDesc }]);
    if (error) alert(error.message);
    else { showNotification("Categoría agregada"); setIsCategoryModalOpen(false); setNewCategoryName(''); setNewCategoryDesc(''); fetchData(); }
    setIsSubmitting(false);
  };

  const handleAddBrand = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    const { error } = await supabase.from('brands').insert([{ name: newBrandName }]);
    if (error) alert(error.message);
    else { showNotification("Marca agregada"); setIsBrandModalOpen(false); setNewBrandName(''); fetchData(); }
    setIsSubmitting(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) { setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)); showNotification(`Pedido actualizado a ${newStatus}`); }
  };

  // =======================================================================
  // VISTAS
  // =======================================================================
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-montserrat">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30"><Lock className="w-8 h-8 text-blue-400" /></div><h1 className="text-2xl font-bold font-michroma text-white tracking-widest uppercase">D.A.P.A</h1><p className="text-blue-500 font-exo text-xs uppercase tracking-[0.2em] mt-1">Acceso Restringido</p></div>
          <form onSubmit={handleLogin} className="space-y-5"><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-400">Correo Electrónico</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="admin@dapa.com" /></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-400">Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" /></div>{loginError && <p className="text-red-400 text-xs font-bold text-center bg-red-900/20 p-2 rounded-lg border border-red-900">{loginError}</p>}<button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors mt-4 shadow-lg focus:outline-none disabled:opacity-50">{isLoggingIn ? 'Verificando...' : 'Ingresar al Panel'}</button></form>
          <button onClick={() => navigate('/')} className="w-full mt-6 text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Volver a la Tienda</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900 font-montserrat">
      {notification && ( <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl z-[200] flex items-center gap-2 animate-in slide-in-from-top-10"><CheckCircle className="w-5 h-5" /> {notification}</div> )}
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800"><span className="font-bold text-2xl tracking-tighter text-white font-michroma block">D.A.P.A</span><span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-500 font-exo">Admin Panel</span></div>
        <div className="flex-1 py-6 px-4 space-y-2">
          <button onClick={() => setActiveTab('productos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${activeTab === 'productos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Tags className="w-5 h-5" /> Repuestos</button>
          <button onClick={() => setActiveTab('pedidos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${activeTab === 'pedidos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><ClipboardList className="w-5 h-5" /> Pedidos {orders.filter(o => o.status === 'Pendiente').length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-1 rounded-full">{orders.filter(o => o.status === 'Pendiente').length}</span>}</button>
        </div>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold"><LogOut className="w-4 h-4" /> Cerrar Sesión</button></div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white dark:bg-slate-800 h-16 shadow-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 z-10"><h1 className="font-bold font-exo text-xl uppercase tracking-widest text-slate-800 dark:text-white">{activeTab === 'productos' ? 'Gestión de Inventario' : 'Bandeja de Pedidos'}</h1><div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">L</div><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{session.user.email}</span></div></header>

        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/50">
          
          {/* VISTA: PRODUCTOS */}
          {activeTab === 'productos' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h2 className="text-lg font-bold text-slate-800 dark:text-white">Tus Repuestos</h2><p className="text-sm text-slate-500 font-light">{products.length} productos registrados.</p></div>
                
                {/* BOTONERA DE ACCIONES RÁPIDAS */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-colors focus:outline-none"><ListPlus className="w-4 h-4" /> Nueva Categoría</button>
                  <button onClick={() => setIsBrandModalOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-colors focus:outline-none"><Tag className="w-4 h-4" /> Nueva Marca</button>
                  <button onClick={openAddProductModal} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg transition-colors focus:outline-none"><Plus className="w-4 h-4" /> Agregar Repuesto</button>
                </div>
              </div>

              <div className="p-0 flex-1 overflow-auto relative">
                {isLoading ? ( <div className="p-10 text-center text-slate-500">Cargando base de datos...</div> ) : products.length === 0 ? ( <div className="p-20 text-center flex flex-col items-center"><Package className="w-16 h-16 text-slate-300 mb-4" /><h3 className="text-xl font-bold text-slate-800 mb-2">Inventario Vacío</h3></div> ) : (
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-16">Foto</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Código</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Categoría</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Precio</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Stock</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {products.map(prod => (
                        <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 text-center">
                            {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" /> : <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700"><ImageIcon className="w-4 h-4 text-slate-400" /></div>}
                          </td>
                          <td className="p-4 text-sm font-bold text-slate-700 dark:text-slate-300 font-exo">{prod.sku_code}</td>
                          <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">{prod.name}</td>
                          <td className="p-4 text-sm text-slate-500">{prod.category?.name}</td>
                          <td className="p-4 text-sm font-bold text-slate-800 dark:text-white text-right">${prod.price.toLocaleString('es-AR')}</td>
                          <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${prod.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{prod.stock > 0 ? prod.stock : 'Sin'}</span></td>
                          
                          {/* BOTONES DE EDITAR Y ELIMINAR */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openEditProductModal(prod)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none" title="Editar"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors focus:outline-none" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
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
              {isLoading ? ( <div className="p-10 text-center text-slate-500">Cargando pedidos...</div> ) : orders.length === 0 ? ( <div className="bg-white rounded-2xl p-20 text-center border border-slate-200"><ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-xl font-bold text-slate-800 mb-2">Bandeja Vacía</h3></div> ) : (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                   {orders.map(order => (
                     <div key={order.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                       <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-start"><div><span className="text-xs font-bold tracking-widest uppercase text-blue-600 block mb-1">Pedido #{order.id}</span><div className="flex items-center gap-2 text-slate-500 text-xs mt-2"><Calendar className="w-3 h-3"/> {new Date(order.created_at).toLocaleString('es-AR')}</div></div><select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg outline-none cursor-pointer border ${order.status === 'Pendiente' ? 'bg-orange-100 text-orange-700 border-orange-200' : order.status === 'Facturado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}><option value="Pendiente">Pendiente</option><option value="Revisado">Revisado</option><option value="Facturado">Facturado / Listo</option><option value="Cancelado">Cancelado</option></select></div>
                       <div className="p-5 flex-1"><div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700"><div><div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-widest mb-1"><UserIcon className="w-3 h-3"/> Cliente</div><p className="text-sm font-bold text-slate-800 dark:text-white">{order.customer_name}</p></div><div><div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-widest mb-1"><Phone className="w-3 h-3"/> Teléfono</div><a href={`https://wa.me/${order.customer_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">{order.customer_phone}</a></div></div><h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><FileText className="w-3 h-3"/> Detalle de Repuestos</h4><ul className="space-y-3 mb-6">{order.order_items?.map((item, idx) => (<li key={idx} className="flex justify-between items-start text-sm"><div className="flex gap-2"><span className="font-bold text-slate-800 dark:text-white">{item.quantity}x</span><div className="text-slate-600 dark:text-slate-300"><span>{item.product?.name || 'Repuesto Eliminado'}</span><span className="block text-[10px] text-slate-400 uppercase font-exo">{item.product?.sku_code || 'N/A'}</span></div></div><span className="font-bold text-slate-800 dark:text-white">${(item.unit_price * item.quantity).toLocaleString('es-AR')}</span></li>))}</ul></div>
                       <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Cotizado</span><span className="text-xl font-bold font-exo text-slate-900 dark:text-white">${order.total_estimated?.toLocaleString('es-AR')}</span></div>
                     </div>
                   ))}
                 </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* MODALES FLOTANTES */}
      {/* ==================================================================== */}

      {/* MODAL: PRODUCTO (Crear / Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-800 dark:text-white">{editingProductId ? 'Editar Repuesto' : 'Nuevo Repuesto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmitProduct} className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Foto del Repuesto</label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl h-48 md:h-full min-h-[200px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 transition-colors overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {imagePreview ? ( <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" /> ) : ( <div className="text-center p-4 text-slate-400 group-hover:text-blue-500 transition-colors flex flex-col items-center"><Upload className="w-8 h-8 mb-2" /><span className="text-xs font-bold uppercase tracking-wider">Hacé clic para subir foto</span><span className="text-[10px] mt-1">PNG, JPG, WEBP</span></div> )}
                </div>
              </div>
              <div className="w-full md:w-2/3 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Código (SKU) *</label><input required name="sku_code" value={formData.sku_code} onChange={handleInputChange} type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre del Repuesto *</label><input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Categoría *</label><select required name="category_id" value={formData.category_id} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"><option value="">Seleccionar...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Marca *</label><select required name="brand_id" value={formData.brand_id} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"><option value="">Seleccionar...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Precio (ARS) *</label><input required name="price" value={formData.price} onChange={handleInputChange} type="number" step="0.01" min="0" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Stock *</label><input required name="stock" value={formData.stock} onChange={handleInputChange} type="number" min="0" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
                </div>
                <div className="pt-4 flex justify-end gap-4 mt-auto">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold uppercase text-xs text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg disabled:opacity-70">{isSubmitting ? 'Guardando...' : <><Save className="w-4 h-4" /> {editingProductId ? 'Actualizar' : 'Guardar'}</>}</button>
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
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Nueva Categoría</h2><button onClick={() => setIsCategoryModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre (Ej: Suspensión)</label><input required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
              <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descripción (Opcional)</label><input value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-xs mt-2 disabled:opacity-70">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA MARCA */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Nueva Marca</h2><button onClick={() => setIsBrandModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleAddBrand} className="p-6 space-y-4">
              <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre de la Marca (Ej: NGK)</label><input required value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500" /></div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-xs mt-2 disabled:opacity-70">Guardar</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}