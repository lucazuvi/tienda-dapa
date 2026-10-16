import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  MapPin, Phone, Target, ShieldCheck, TrendingUp, Truck, Wrench, ChevronRight,
  Menu, X, MessageSquare, CreditCard, Package, HelpCircle, CheckCircle,
  ChevronDown, Send, Settings, Search, ArrowLeft, ChevronLeft, ShoppingCart,
  User, Plus, Minus, Trash2, LogOut, PhoneCall, ArrowUp, Filter, Sun, Moon, Clock, Camera
} from 'lucide-react';
import { supabase } from './supabase';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const AdminPanel = lazy(() => import('./AdminPanel'));

/* ==========================================================================
   ÍCONOS CUSTOM
   ========================================================================== */
const CustomInstagram = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const CustomFacebook = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

/* ==========================================================================
   DATOS ESTÁTICOS (Contacto y Preguntas)
   ========================================================================== */
const CONTACT_INFO = {
  address: "Lamadrid 65",
  city: "Arrecifes, Buenos Aires",
  phone: "+54 9 2478 512620",
  landline: "02478 452775",
  whatsappLink: "https://wa.me/5492478512620",
  instagramLink: "https://instagram.com/autopartesmolle",
  facebookLink: "https://www.facebook.com/"
};

const FAQ_ITEMS = [
  { q: '¿Realizan envíos al interior?', a: 'Sí, despachamos a cualquier punto mediante servicios de correo y encomiendas.' },
  { q: '¿Cómo puedo pagar mi compra?', a: 'Aceptamos transferencias bancarias, Cuenta DNI, Mercado Pago, tarjetas de crédito/débito y efectivo. Podes abonar directo, pasar por nuestro local o acordamos por WhatsApp.' },
  { q: '¿Qué datos necesito para cotizar un repuesto?', a: 'Para mayor precisión, te recomendamos enviarnos la marca, modelo, motor, año del vehículo o el código del repuesto.' }
];

/* ==========================================================================
   HOOKS Y COMPONENTES UI
   ========================================================================== */
function useIntersectionObserver(threshold = 0.1) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsIntersecting(true);
    }, { threshold });

    const currentRef = targetRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => currentRef && observer.unobserve(currentRef);
  }, [threshold]);

  return [targetRef, isIntersecting];
}

const DELAY_CLASSES = {
  'delay-0': 'delay-0',
  'delay-100': 'delay-100',
  'delay-200': 'delay-200',
  'delay-300': 'delay-300',
  'delay-700': 'delay-700',
  'md:delay-0': 'md:delay-0',
  'md:delay-100': 'md:delay-100',
  'md:delay-200': 'md:delay-200',
  'md:delay-300': 'md:delay-300',
  'md:delay-400': 'md:delay-[400ms]',
  'md:delay-500': 'md:delay-500',
};

function RevealOnScroll({ children, className = "", delay = "delay-0" }) {
  const [ref, isVisible] = useIntersectionObserver();
  const safeDelay = DELAY_CLASSES[delay] || 'delay-0';
  return (
    <div ref={ref} className={`transition-all duration-[1000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isVisible ? `opacity-100 translate-y-0 ${safeDelay}` : "opacity-0 translate-y-16"} ${className}`}>
      {children}
    </div>
  );
}

function PremiumTitle({ children, className = "", as: Component = "h2", dark = true }) {
  const [ref, isVisible] = useIntersectionObserver();
  return (
    <Component ref={ref} className={`transition-all duration-1000 ease-out font-exo ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${dark ? 'text-slate-900 dark:text-white' : 'text-white'} ${className}`}>
      {children}
    </Component>
  );
}

function Toast({ message, isVisible }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] transition-all duration-300 flex items-center gap-3 border border-blue-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <CheckCircle className="w-5 h-5" />
      <span className="text-sm font-bold tracking-wider">{message}</span>
    </div>
  );
}

function TiltCard({ children, className = "" }) {
  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setRotate({ x: rotateX, y: rotateY });
  }, []);

  const onMouseLeave = () => { setIsHovered(false); setRotate({ x: 0, y: 0 }); };

  return (
    <div
      ref={cardRef}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ transform: isHovered ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)` : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' }}
      onMouseEnter={() => setIsHovered(true)} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   COMPONENTES DE PRODUCTO Y MODALES (Tienda Pública)
   ========================================================================== */
function ProductImage({ sku, imageUrl, alt, className = "" }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl, sku]);

  if (!imageUrl || imgError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 p-4 select-none ${className}`}>
        <Package className="w-12 h-12 mb-1.5 opacity-60 stroke-[1.5]" />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-75 font-exo text-center">
          {sku || 'D.A.P.A'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || sku || 'Repuesto'}
      onError={() => setImgError(true)}
      className={className}
      loading="lazy"
    />
  );
}
   


function QuickViewModal({ product, categoryName, isOpen, onClose, onAddToCart }) {
  if (!isOpen || !product) return null;
  const brandName = product.brand?.name || 'Multimarca';
  const resolvedCategory = categoryName || product.category?.name || 'General';
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none z-20 bg-white/50 dark:bg-slate-900/50 rounded-full p-1 backdrop-blur-sm">
          <X className="w-6 h-6" />
        </button>

        <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-900 h-48 md:h-auto relative flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
           {product.image_url ? (
             <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
           ) : (
             <Package className="w-16 h-16 text-slate-300 dark:text-slate-700" />
           )}
           <span className="absolute bottom-4 left-4 text-xs font-bold tracking-widest uppercase text-white bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 rounded-lg font-exo">Cód: {product.sku_code}</span>
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-tight pr-6">{product.name}</h2>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 mb-6 border border-slate-100 dark:border-slate-700/50">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Settings className="w-3 h-3" /> Ficha Técnica
            </h4>
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-light">Categoría:</span><span>{resolvedCategory}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-light">Marca:</span>
                <span className="text-blue-600 dark:text-blue-400">{brandName}</span>
              </li>
            <li className="flex justify-between pb-1">
                <span className="text-slate-500 dark:text-slate-400 font-light">Disponibilidad:</span>
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5"/> En local / Por encargue
                </span>
              </li>
            </ul>
          </div>
          
          {product.description && (
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-light italic bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
               {product.description}
             </p>
          )}
          
          <button onClick={() => { onAddToCart(product); onClose(); }} className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Agregar al Carrito
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ isOpen, onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        onLogin({
          name: data.user.user_metadata.name || email.split('@')[0],
          phone: data.user.user_metadata.phone || '',
          email: data.user.email
        });
        
      } else {
        if (!nombre.trim() || !apellido.trim()) {
          throw new Error("El nombre y apellido son obligatorios");
        }
        if (password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }
        if (password !== confirmPassword) {
          throw new Error("Las contraseñas no coinciden. Verificalas por favor.");
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: `${nombre.trim()} ${apellido.trim()}`,
              phone: telefono.trim() || ''
            }
          }
        });
        
        if (error) throw error;
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setSuccessMsg("¡Cuenta creada con éxito! Ya podés iniciar sesión con tu clave.");
      }
    } catch (error) {
      setError(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-widest">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors focus:outline-none mb-6"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o con tu email</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          {successMsg && (
            <div className="bg-green-50 dark:bg-green-900/25 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-xl text-xs font-bold mb-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs font-bold mb-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
              <X className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nombre</label>
                  <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Apellido</label>
                  <input type="text" required value={apellido} onChange={e => setApellido(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Teléfono (Opcional)</label>
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder={isLogin ? "" : "Mínimo 6 caracteres"} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" />
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Repetir Contraseña</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Volvé a escribir tu contraseña"
                  className={`w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none ${
                    confirmPassword && password !== confirmPassword 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-slate-300 dark:border-slate-600 focus:border-blue-500'
                  }`} 
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-red-500 font-semibold ml-1 pt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors mt-2">
              {loading ? 'Cargando...' : isLogin ? 'Ingresar' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); setConfirmPassword(''); }} 
              type="button" 
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
              {isLogin ? '¿No tenés cuenta? Registrate gratis' : '¿Ya tenés cuenta? Iniciá sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CorreoArgentinoLogo() {
  return (
    <div className="w-11 h-11 rounded-full bg-[#FFCE00] flex items-center justify-center flex-shrink-0 shadow-sm border border-yellow-400">
      <div className="flex flex-col items-center leading-none text-[#152663]">
        <Truck className="w-4 h-4 stroke-[2.5] mb-0.5" />
        <span className="text-[7px] font-black uppercase tracking-tighter">Correo</span>
        <span className="text-[6px] font-bold uppercase tracking-tighter -mt-0.5">Argentino</span>
      </div>
    </div>
  );
}

function CheckoutModal({ isOpen, onClose, cart, cartTotal, onSuccess, currentUser }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isEditingCp, setIsEditingCp] = useState(false);
  const [tempCp, setTempCp] = useState('2740');

  // Estado de la cotización devuelta por la API
  const [cotizacionCorreo, setCotizacionCorreo] = useState(null);
  const [isQuotingShipping, setIsQuotingShipping] = useState(false);

  const nameParts = (currentUser?.name || '').trim().split(' ');

  const [formData, setFormData] = useState({
    email: currentUser?.email || '',
    nombre: nameParts[0] || '',
    apellido: nameParts.slice(1).join(' ') || '',
    dni: '',
    telefono: currentUser?.phone || '',
    metodoEnvio: 'correo_domicilio', // correo_domicilio | correo_sucursal | acordar | retiro
    calle: '',
    numero: '',
    piso: '',
    ciudad: 'Arrecifes',
    provincia: 'Buenos Aires',
    cp: '2740',
    metodoPago: 'mercadopago',
    observaciones: ''
  });

  const totalUnidades = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.quantity || 1), 0),
    [cart]
  );

  // Consultar el endpoint /api/cotizarCorreo cuando cambia el CP o se abre el checkout
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchQuote = async () => {
      setIsQuotingShipping(true);
      try {
        const res = await fetch('/api/cotizarCorreo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpDestino: formData.cp,
            totalItems: totalUnidades
          })
        });
        if (!res.ok) throw new Error('Error en API');
        const data = await res.json();
        if (isMounted) setCotizacionCorreo(data);
      } catch (err) {
        // Fallback local por si estás corriendo solo vite sin vercel dev
        const recargo = Math.max(0, (totalUnidades - 1) * 950);
        const isLocal = formData.cp === '2740';
        if (isMounted) {
          setCotizacionCorreo({
            cp: formData.cp,
            domicilio: (isLocal ? 8546 : 10480) + recargo,
            sucursal: (isLocal ? 5928 : 7350) + Math.round(recargo * 0.75),
            diasDomicilio: '3 a 6 días hábiles',
            diasSucursal: '3 a 6 días hábiles',
            sucursalDetalle: isLocal
              ? 'ARRECIFES - Av Dr Manuel Belgrano 42, Arrecifes, Buenos Aires - LUN A VIE 09.00 A 16.00'
              : `Sucursal Correo Argentino habilitada para CP ${formData.cp} - LUN A VIE 09.00 A 16.00`
          });
        }
      } finally {
        if (isMounted) setIsQuotingShipping(false);
      }
    };

    fetchQuote();
    return () => { isMounted = false; };
  }, [isOpen, formData.cp, totalUnidades]);

  if (!isOpen) return null;

  const shippingCost =
    formData.metodoEnvio === 'correo_domicilio'
      ? (cotizacionCorreo?.domicilio || 0)
      : formData.metodoEnvio === 'correo_sucursal'
      ? (cotizacionCorreo?.sucursal || 0)
      : 0;

  const finalTotal = cartTotal + shippingCost;

  const getShippingLabel = () => {
    if (formData.metodoEnvio === 'correo_domicilio') return 'Correo Argentino - Envío a domicilio clásico';
    if (formData.metodoEnvio === 'correo_sucursal') return `Correo Argentino - Retiro en sucursal (CP ${formData.cp})`;
    if (formData.metodoEnvio === 'acordar') return 'Acordar envío con el vendedor';
    return 'Retiro Gratis en D.A.P.A Repuestos Molle (Lamadrid 65, Arrecifes)';
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleApplyCp = () => {
    const cleanCp = tempCp.replace(/\D/g, '');
    if (cleanCp.length !== 4 || parseInt(cleanCp, 10) < 1000) {
      setFormError('Ingresá un Código Postal argentino válido de 4 dígitos (ej: 2740).');
      return;
    }
    setFormError('');
    setFormData(prev => ({
      ...prev,
      cp: cleanCp,
      ciudad: cleanCp === '2740' ? 'Arrecifes' : prev.ciudad === 'Arrecifes' ? '' : prev.ciudad
    }));
    setIsEditingCp(false);
  };

  const handleSiguientePaso = () => {
    setFormError('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return setFormError('Por favor, ingresá un correo electrónico válido.');
    
    if (formData.nombre.trim().length < 2 || formData.apellido.trim().length < 2) return setFormError('El nombre y apellido deben ser reales.');
    
    const dniLimpio = formData.dni.replace(/\D/g, '');
    if (dniLimpio.length < 7 || dniLimpio.length > 11) return setFormError('El DNI/CUIT debe tener entre 7 y 11 números válidos.');
    
    const telLimpio = formData.telefono.replace(/\D/g, '');
    if (telLimpio.length < 10) return setFormError('Ingresá un teléfono válido con código de área (ej: 2478512620).');
    
    if (formData.metodoEnvio === 'correo_domicilio') {
      if (formData.calle.trim().length < 3 || formData.numero.trim() === '') {
        return setFormError('Por favor, completá la calle y el número para el envío a domicilio.');
      }
      if (formData.ciudad.trim().length < 2) {
        return setFormError('Por favor, indicá tu localidad o ciudad.');
      }
    } else if (formData.metodoEnvio === 'correo_sucursal') {
      if (formData.ciudad.trim().length < 2) {
        return setFormError('Por favor, indicá la localidad de la sucursal donde retirás.');
      }
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let detalleEntrega = '';
      if (formData.metodoEnvio === 'retiro') {
        detalleEntrega = 'RETIRO EN EL LOCAL (Lamadrid 65, Arrecifes) - GRATIS';
      } else if (formData.metodoEnvio === 'acordar') {
        detalleEntrega = `ACORDAR ENVÍO CON EL CLIENTE (CP: ${formData.cp})`;
      } else if (formData.metodoEnvio === 'correo_sucursal') {
        detalleEntrega = `CORREO ARGENTINO A SUCURSAL ($${shippingCost.toLocaleString('es-AR')})\nSucursal destino: CP ${formData.cp} - ${formData.ciudad}, ${formData.provincia}`;
      } else {
        detalleEntrega = `CORREO ARGENTINO A DOMICILIO ($${shippingCost.toLocaleString('es-AR')})\nDirección: ${formData.calle} ${formData.numero} ${formData.piso ? 'Piso/Dpto: ' + formData.piso : ''}\nLocalidad: ${formData.ciudad}, ${formData.provincia} (CP: ${formData.cp})`;
      }

      const notas = `TIPO DE VENTA: Checkout Web Automático
        MÉTODO DE PAGO: ${formData.metodoPago.toUpperCase()}
        MODALIDAD DE ENVÍO: ${getShippingLabel()}
        COSTO DE ENVÍO: $${shippingCost.toLocaleString('es-AR')}
        ---------------------------------
        DATOS DEL CLIENTE:
        Nombre: ${formData.nombre} ${formData.apellido}
        DNI: ${formData.dni}
        Teléfono: ${formData.telefono}
        Email: ${formData.email}
        ---------------------------------
        ENTREGA:
        ${detalleEntrega}
        ---------------------------------
        OBSERVACIONES:
        ${formData.observaciones || 'Ninguna'}`;

    const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { data: newOrderId, error: orderError } = await supabase.rpc('create_web_order', {
        p_customer_name: `${formData.nombre} ${formData.apellido}`,
        p_customer_phone: formData.telefono,
        p_status: 'Pendiente (Vía Web)',
        p_total_estimated: finalTotal,
        p_notes: notas,
        p_items: itemsPayload
      });

      if (orderError) throw orderError;
      const newOrder = { id: newOrderId };

      const itemsToInsert = cart.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      if (formData.metodoPago === 'mercadopago') {
        const response = await fetch('/api/createPreference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: newOrder.id,
            items: cart,
            shippingCost,
            shippingTitle: getShippingLabel()
          })
        });
        
        const data = await response.json();
        
        if (data.init_point) {
          if (onSuccess) onSuccess(true);
          window.location.href = data.init_point;
          return;
        } else {
          throw new Error("No se pudo conectar con Mercado Pago");
        }
      }

      onSuccess(false);

    } catch (error) {
      console.error(error);
      setFormError("Hubo un error al procesar la compra. Por favor intentá de nuevo.");
      setStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-50 dark:bg-slate-900 overflow-y-auto flex flex-col transition-colors">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <h2 className="font-michroma text-xl font-bold text-slate-900 dark:text-white ml-4">D.A.P.A <span className="text-[10px] font-exo tracking-[0.2em] uppercase text-slate-500">Checkout</span></h2>
        <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className={`flex-1 text-center font-bold text-xs uppercase tracking-widest ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>1. Envío</div>
            <div className={`flex-1 text-center font-bold text-xs uppercase tracking-widest border-l border-slate-200 dark:border-slate-700 ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>2. Pago</div>
            <div className={`flex-1 text-center font-bold text-xs uppercase tracking-widest border-l border-slate-200 dark:border-slate-700 ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>3. Revisión</div>
          </div>

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider mb-4">Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ejemplo@correo.com" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Teléfono / WhatsApp</label>
                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 2478512620" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Nombre</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Apellido</label>
                    <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} placeholder="Tu apellido" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">DNI / CUIT (Requerido para el correo)</label>
                    <input type="text" name="dni" value={formData.dni} onChange={handleChange} placeholder="Sin puntos ni guiones" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* OPCIONES DE ENVÍO CON API CORREO ARGENTINO */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-base text-slate-800 dark:text-white">Seleccioná una opción</h4>
                  
                  {isEditingCp ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        value={tempCp}
                        onChange={(e) => setTempCp(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 2740"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCp()}
                        className="w-28 px-3 py-1.5 text-xs font-bold rounded-full border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none text-center"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCp}
                        className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                      >
                        Cotizar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setTempCp(formData.cp); setIsEditingCp(true); }}
                      className="px-4 py-1.5 rounded-full border border-slate-400 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Cambiar CP{formData.cp}
                    </button>
                  )}
                </div>

                {isQuotingShipping ? (
                  <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4 animate-spin text-blue-500" /> Consultando tarifas de Correo Argentino para CP {formData.cp}...
                  </div>
                ) : (
                  <>
                    {/* 1. ENVÍO A DOMICILIO */}
                    {cotizacionCorreo?.domicilio && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Envío a domicilio</p>
                        <label
                          onClick={() => setFormData({ ...formData, metodoEnvio: 'correo_domicilio' })}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                            formData.metodoEnvio === 'correo_domicilio'
                              ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 ring-1 ring-blue-500'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="metodoEnvio"
                            checked={formData.metodoEnvio === 'correo_domicilio'}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 flex-shrink-0"
                          />
                          <CorreoArgentinoLogo />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-800 dark:text-white block">Envío a domicilio clásico</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              ${cotizacionCorreo.domicilio.toLocaleString('es-AR')},00 - {cotizacionCorreo.diasDomicilio}
                            </span>{' '}
                            <span className="text-xs text-slate-500 font-light">(luego de ser despachado)</span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* 2. RETIRAR EN SUCURSAL DEL CORREO */}
                    {cotizacionCorreo?.sucursal && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Retirar en sucursal del correo</p>
                        <label
                          onClick={() => setFormData({ ...formData, metodoEnvio: 'correo_sucursal' })}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                            formData.metodoEnvio === 'correo_sucursal'
                              ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 ring-1 ring-blue-500'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="metodoEnvio"
                            checked={formData.metodoEnvio === 'correo_sucursal'}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 flex-shrink-0"
                          />
                          <CorreoArgentinoLogo />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-800 dark:text-white block">Envío a sucursal</span>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                ${cotizacionCorreo.sucursal.toLocaleString('es-AR')},00 - {cotizacionCorreo.diasSucursal}
                              </span>{' '}
                              <span className="text-xs text-slate-500 font-light">(luego de ser despachado)</span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                              {cotizacionCorreo.sucursalDetalle}
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </>
                )}

                {/* 3. ACORDAR ENVÍO */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Otros medios de envío</p>
                  <label
                    onClick={() => setFormData({ ...formData, metodoEnvio: 'acordar' })}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.metodoEnvio === 'acordar'
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="metodoEnvio"
                      checked={formData.metodoEnvio === 'acordar'}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                    />
                    <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-white block">Acordar envío</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Te podrás comunicar con nosotros para acordar el envío al finalizar la compra
                      </span>
                    </div>
                  </label>
                </div>

                {/* 4. RETIRAR EN NUESTROS PUNTOS (LOCAL DAPA GRATIS) */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Retirar en nuestros puntos</p>
                  <label
                    onClick={() => setFormData({ ...formData, metodoEnvio: 'retiro' })}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.metodoEnvio === 'retiro'
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="metodoEnvio"
                      checked={formData.metodoEnvio === 'retiro'}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                    />
                    <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-white block">D.A.P.A REPUESTOS MOLLE</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block">Gratis</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        LAMADRID 65, ARRECIFES, PROV. BUENOS AIRES - LUNES A VIERNES DE 08:00 A 12:30 Y DE 15:00 A 19:00
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {formData.metodoEnvio === 'correo_domicilio' && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4 animate-in fade-in">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase">Domicilio de Entrega</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Calle</label>
                      <input type="text" name="calle" value={formData.calle} onChange={handleChange} placeholder="Ej: San Martín" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Número</label>
                      <input type="text" name="numero" value={formData.numero} onChange={handleChange} placeholder="Ej: 123" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Piso / Dpto</label>
                      <input type="text" name="piso" value={formData.piso} onChange={handleChange} placeholder="Opcional" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Ciudad / Localidad</label>
                      <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} placeholder="Tu ciudad" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Provincia</label>
                      <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} placeholder="Tu provincia" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              )}

              {formData.metodoEnvio === 'correo_sucursal' && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4 animate-in fade-in">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase">Localidad de la Sucursal de Destino</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Ciudad / Localidad de la sucursal</label>
                      <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} placeholder="Ej: Arrecifes, Pergamino..." className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Provincia</label>
                      <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} placeholder="Provincia" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              )}
              
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mt-4 animate-in fade-in">
                  <p className="text-red-700 dark:text-red-400 text-sm font-bold">{formError}</p>
                </div>
              )}
              
              <button 
                onClick={handleSiguientePaso} 
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase py-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                Siguiente Paso
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase">Método de Pago</h3>
              
              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${formData.metodoPago === 'mercadopago' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                  <input type="radio" name="metodoPago" value="mercadopago" checked={formData.metodoPago === 'mercadopago'} onChange={handleChange} className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Mercado Pago</span>
                    <span className="text-xs text-slate-500">Tarjetas de crédito, débito o dinero en cuenta</span>
                  </div>
                </label>
                
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${formData.metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                  <input type="radio" name="metodoPago" value="transferencia" checked={formData.metodoPago === 'transferencia'} onChange={handleChange} className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Transferencia Bancaria</span>
                    <span className="text-xs text-slate-500">Alias o CBU (Coordinamos por WhatsApp)</span>
                  </div>
                </label>
                
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${formData.metodoPago === 'acordar' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                  <input type="radio" name="metodoPago" value="acordar" checked={formData.metodoPago === 'acordar'} onChange={handleChange} className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Acordar en el local</span>
                    <span className="text-xs text-slate-500">Pagás en efectivo al retirar en mostrador</span>
                  </div>
                </label>
              </div>

              <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} placeholder="Notas del pedido (Opcional)" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-24 resize-none mt-4"></textarea>

              <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(1)} className="w-1/3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold uppercase py-4 rounded-xl">Volver</button>
                <button onClick={() => setStep(3)} className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase py-4 rounded-xl">Siguiente Paso</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase">Revisión Final</h3>
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Comprador:</h4>
                  <p className="text-slate-900 dark:text-white font-medium">{formData.nombre} {formData.apellido} • DNI: {formData.dni} • Tel: {formData.telefono}</p>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Modalidad de Entrega:</h4>
                  <p className="text-slate-900 dark:text-white font-semibold">{getShippingLabel()}</p>
                  {formData.metodoEnvio === 'correo_domicilio' && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                      {formData.calle} {formData.numero} {formData.piso && `Piso ${formData.piso}`}, {formData.ciudad}, {formData.provincia} (CP {formData.cp})
                    </p>
                  )}
                  {formData.metodoEnvio === 'correo_sucursal' && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                      Sucursal Correo Argentino en {formData.ciudad}, {formData.provincia} (CP {formData.cp})
                    </p>
                  )}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Método de pago:</h4>
                  <p className="text-slate-900 dark:text-white font-medium capitalize">{formData.metodoPago.replace('mercadopago', 'Mercado Pago')}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={isSubmitting}
                  className="w-full sm:w-1/3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest py-4 rounded-xl border border-transparent dark:border-slate-600 transition-colors focus:outline-none"
                >
                  Volver
                </button>
                
                {formData.metodoPago === 'mercadopago' ? (
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting} 
                    className="w-full sm:w-2/3 bg-[#009EE3] hover:bg-[#008ACA] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-[#009EE3]/30 focus:outline-none focus:ring-4 focus:ring-[#009EE3]/50 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <Settings className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2 justify-center">
                        <svg viewBox="0 0 100 100" className="w-6 h-6 flex-shrink-0 fill-current"><path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 82.5c-17.9 0-32.5-14.6-32.5-32.5S32.1 17.5 50 17.5 82.5 32.1 82.5 50 72.1 82.5 50 82.5zM67.3 43.1c-1.3-1.3-3.4-1.3-4.7 0l-12.8 12.8-5.7-5.7c-1.3-1.3-3.4-1.3-4.7 0-1.3 1.3-1.3 3.4 0 4.7l8 8c.6.6 1.5.9 2.3.9.8 0 1.7-.3 2.3-.9l15.2-15.2c1.4-1.2 1.4-3.3.1-4.6z"/></svg>
                        <span className="uppercase tracking-widest text-sm">Pagar ${finalTotal.toLocaleString('es-AR')} con Mercado Pago</span>
                      </div>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting} 
                    className="w-full sm:w-2/3 bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-green-500/30 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <Settings className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmar Pedido
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:w-96 flex-shrink-0">
          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl sticky top-24 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase mb-4">Resumen de Compra</h3>
            <div className="space-y-3 mb-6 max-h-[36vh] overflow-y-auto custom-scrollbar pr-2">
              {cart.map(item => (
                <div key={item.product.sku_code} className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight line-clamp-2">{item.quantity}x {item.product.name}</p>
                    <p className="text-xs text-slate-500">{item.product.sku_code}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    ${(item.product.price * item.quantity).toLocaleString('es-AR')}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-300 dark:border-slate-700 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal repuestos</span>
                <span className="font-semibold">${cartTotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Envío (CP {formData.cp})</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {shippingCost > 0
                    ? `$${shippingCost.toLocaleString('es-AR')}`
                    : formData.metodoEnvio === 'acordar'
                    ? 'A convenir'
                    : 'Gratis'}
                </span>
              </div>
              <div className="border-t border-slate-300 dark:border-slate-700 pt-3 flex justify-between items-end">
                <span className="font-bold text-slate-700 dark:text-slate-300">TOTAL</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">${finalTotal.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeItem, currentUser, clearCart }) {
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showWebCheckout, setShowWebCheckout] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  

  if (!isOpen) return null;

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleProcessOrder = async (metodoDeEnvio) => {
    setIsSubmitting(true);
    
    const clienteNombre = currentUser ? currentUser.name : 'Cliente Web';
    const clienteTelefono = currentUser ? currentUser.phone : 'No registrado';

    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { data: newOrderId, error: orderError } = await supabase.rpc('create_web_order', {
        p_customer_name: clienteNombre,
        p_customer_phone: clienteTelefono,
        p_status: metodoDeEnvio === 'WHATSAPP' ? 'Pendiente (Vía WhatsApp)' : 'Pendiente (Vía Web)',
        p_total_estimated: cartTotal,
        p_notes: 'Pedido generado desde el carrito web.',
        p_items: itemsPayload
      });

      if (orderError) throw orderError;
      const newOrder = { id: newOrderId };

      const itemsToInsert = cart.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

 if (metodoDeEnvio === 'WHATSAPP') {
        let wppText = `¡Hola DAPA Repuestos! Soy ${clienteNombre}.\n\nAcabo de generar el pedido web #${newOrder.id}:\n\n`;
        cart.forEach(item => {
          wppText += `• ${item.quantity}x [${item.product.sku_code}] ${item.product.name}\n`;
        });
        wppText += `\n*Total estimado: $${cartTotal.toLocaleString('es-AR')}*`;
        if (clienteTelefono && clienteTelefono !== 'No registrado') {
          wppText += `\nMi teléfono: ${clienteTelefono}`;
        }

        const wppUrl = `${CONTACT_INFO.whatsappLink}?text=${encodeURIComponent(wppText)}`;
        
        window.open(wppUrl, '_blank');
        if (clearCart) clearCart();
        onClose();
        setCheckoutMode(false);
      } else {
        setOrderSuccess(true);
        if (clearCart) clearCart();
      }

   } catch (error) {
   console.error("Error al procesar el pedido:", error);
   setDrawerError("Hubo un error al procesar el pedido. Intentá nuevamente.");
   setTimeout(() => setDrawerError(''), 4000);
 } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setOrderSuccess(false);
    setCheckoutMode(false);
    onClose();
  };

  if (showWebCheckout) {
    return (
      <CheckoutModal 
        isOpen={true}
        cart={cart}
        cartTotal={cartTotal}
        currentUser={currentUser}
        onClose={() => setShowWebCheckout(false)}
        onSuccess={(isMp) => {
          if (isMp) {
            if (clearCart) clearCart(); 
          } else {
            setOrderSuccess(true);
            setShowWebCheckout(false);
            if (clearCart) clearCart();
          }
        }}
      />  
    );
  }

  return (
    <div className="fixed inset-0 z-[999] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={resetAndClose}></div>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 h-full shadow-2xl relative z-[1000] flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-700">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-slate-900 dark:text-white" />
            <h3 className="font-bold text-xl uppercase tracking-widest font-exo text-slate-900 dark:text-white">Tu Cotización</h3>
          </div>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
          {orderSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-widest mb-4 dark:text-white">¡Pedido Registrado!</h3>
              <p className="text-slate-500 dark:text-slate-400 font-light mb-8 px-4">
                Ya guardamos tu solicitud. A la brevedad uno de nuestros asesores verificará el stock y se comunicará con vos.
              </p>
              <button onClick={resetAndClose} className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none">
                Seguir viendo el catálogo
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
              <Package className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-light">Tu carrito está vacío.</p>
              <p className="text-sm mt-2">Buscá repuestos en el catálogo y agregalos aquí.</p>
            </div>
          ) : (
         <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.sku_code} className="flex gap-4 border border-slate-100 dark:border-slate-700 p-4 rounded-xl shadow-sm relative group bg-white dark:bg-slate-800 hover:border-blue-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight truncate" title={item.product.name}>
                      {item.product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                        {item.product.sku_code}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ${Number(item.product.price).toLocaleString('es-AR')} c/u
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900">
                        <button onClick={() => updateQuantity(item.product.sku_code, -1)} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-l-lg transition-colors focus:outline-none">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-700 dark:text-slate-200">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.sku_code, 1)} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-r-lg transition-colors focus:outline-none">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-sm font-bold font-exo text-blue-600 dark:text-blue-400 ml-auto">
                        ${(Number(item.product.price) * item.quantity).toLocaleString('es-AR')}
                      </span>

                      <button onClick={() => removeItem(item.product.sku_code)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition-colors focus:outline-none">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!orderSuccess && cart.length > 0 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            {currentUser && (
              <div className="mb-4 text-xs font-light text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-900 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                Cotización a nombre de: <strong className="font-bold text-slate-700 dark:text-slate-200">{currentUser.name}</strong>
              </div>
            )}

            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 leading-snug flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Nota:</strong> Algunos artículos de catálogo se traen directamente de distribuidora <strong>por encargue</strong>. Te confirmaremos la demora exacta al procesar tu pedido.
              </span>
            </div>

            {drawerError && <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold text-center">{drawerError}</div>}
            
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Subtotal Estimado
              </span>
              <span className="text-xl font-bold font-exo text-slate-900 dark:text-white">
                ${cartTotal.toLocaleString('es-AR')}
              </span>
            </div>

            {checkoutMode ? (
              <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                <p className="text-xs font-bold uppercase tracking-widest text-center text-slate-500 mb-2">¿Cómo querés enviar el pedido?</p>
                <button 
                  onClick={() => handleProcessOrder('WHATSAPP')}
                  disabled={isSubmitting}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:opacity-50 focus:outline-none"
                >
                  {isSubmitting ? <Settings className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} 
                  Por WhatsApp
                </button>
                <button 
                  onClick={() => setShowWebCheckout(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 focus:outline-none"
                >
                  <Send className="w-4 h-4" /> 
                  Por la Página Web 
                </button>
                <button 
                  onClick={() => setCheckoutMode(false)}
                  className="w-full mt-2 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  Volver atrás
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCheckoutMode(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                Solicitar Cotización
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HowToBuyTutorial({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    { title: 'Elegí', desc: 'Buscá tus repuestos en el catálogo y agregalos al carrito.', icon: <Package className="w-16 h-16 text-blue-500" /> },
    { title: 'Cotizá', desc: 'Revisá tu carrito y envianos el pedido directamente por WhatsApp.', icon: <MessageSquare className="w-16 h-16 text-green-500" /> },
    { title: 'Pagás', desc: 'Un asesor confirmará el stock y te pasará los links de pago (Transferencia, Tarjetas, etc).', icon: <CreditCard className="w-16 h-16 text-slate-300" /> },
    { title: 'Recibís', desc: '¡Listo! Preparamos tu paquete y te lo enviamos al taller o a tu domicilio.', icon: <Truck className="w-16 h-16 text-green-400" /> }
  ];

  const handleNext = () => { if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1); else onClose(); };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity duration-500" onClick={onClose}></div>
      <div className="relative z-10 w-full max-w-5xl bg-transparent flex flex-col items-center">
        <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-500">
          <h2 className="text-3xl md:text-5xl font-black font-exo text-white uppercase tracking-widest mb-2">¿Cómo Comprar?</h2>
          <p className="text-slate-300 font-light text-sm md:text-lg">Sigue estos simples pasos para realizar tu pedido.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full mb-12 relative">
          <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-1 bg-slate-700/50 -z-10 -translate-y-1/2"></div>
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            return (
              <div key={index} className={`relative flex flex-col items-center p-6 md:p-8 rounded-3xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] w-full md:w-1/4
                  ${isActive ? 'bg-slate-800 scale-100 md:scale-110 opacity-100 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-blue-500/50 z-20' : 'bg-slate-900/50 scale-95 opacity-40 blur-[2px] border border-transparent z-10 hidden md:flex'}
                  ${!isActive && 'md:flex'} ${!isActive && index !== currentStep ? 'hidden md:flex' : 'flex'}
                `}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-slate-900 shadow-inner transition-colors duration-500 ${isActive && index === 3 ? 'shadow-[0_0_30px_rgba(74,222,128,0.3)] border border-green-500/30' : ''}`}>
                  {step.icon}
                </div>
                <h3 className={`text-xl font-bold uppercase tracking-widest mb-3 font-exo text-center ${isActive && index === 3 ? 'text-green-400' : 'text-white'}`}>{step.title}</h3>
                <p className="text-sm text-slate-400 font-light text-center leading-relaxed">{step.desc}</p>
                {isPast && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-900 flex items-center justify-center z-30">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <button onClick={handlePrev} disabled={currentStep === 0} className="p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-0 transition-all focus:outline-none">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            {steps.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700'}`}></div>))}
          </div>
          <button onClick={handleNext} className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 focus:outline-none ${currentStep === steps.length - 1 ? 'bg-green-500 hover:bg-green-400 text-slate-900 shadow-green-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}>
            {currentStep === steps.length - 1 ? '¡Entendido!' : 'Siguiente'}
            {currentStep !== steps.length - 1 && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
        <button onClick={onClose} className="absolute top-0 right-0 p-2 text-slate-400 hover:text-white transition-colors focus:outline-none"><X className="w-8 h-8" /></button>
      </div>
    </div>
  );
}

/* ==========================================================================
   COMPONENTES GLOBALES Y ESTILOS
   ========================================================================== */
function GlobalStyles() {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      .dark body { background-color: #0f172a; color: #f1f5f9; }
      .font-montserrat { font-family: 'Montserrat', sans-serif; }
      .font-exo { font-family: 'Exo 2', sans-serif; }
      .font-michroma { font-family: 'Michroma', sans-serif; }
      html { scroll-behavior: smooth; }
      @keyframes scrollLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes scrollRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
      .marquee-container { display: flex; width: fit-content; }
      .animate-marquee-left { animation: scrollLeft 40s linear infinite; }
      .animate-marquee-right { animation: scrollRight 40s linear infinite; }
      .pause-on-hover:hover .animate-marquee-left, .pause-on-hover:hover .animate-marquee-right { animation-play-state: paused; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      @keyframes softPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      .animate-soft-pulse { animation: softPulse 3s ease-in-out infinite; }
    `}} />
  );
}

function ProgressBarComponent() {
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(windowHeight > 0 ? totalScroll / windowHeight : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 h-1 bg-blue-600 z-[60] transition-all duration-150 ease-out" style={{ width: `${scrollProgress * 100}%` }} role="progressbar" aria-valuenow={scrollProgress * 100} aria-valuemin="0" aria-valuemax="100" />
  );
}

function FloatingActions() {
  const [showTopBtn, setShowTopBtn] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="fixed bottom-6 left-6 right-6 flex justify-between items-end z-[50] pointer-events-none">
      <button onClick={scrollToTop} className={`pointer-events-auto bg-slate-800 dark:bg-slate-700 text-white p-3 rounded-full shadow-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-slate-300 ${showTopBtn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} aria-label="Volver arriba">
        <ArrowUp className="w-5 h-5" />
      </button>
      <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp" className="pointer-events-auto bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 hover:scale-110 transition-all group flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-green-300 relative">
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50"></span>
        <Phone className="w-6 h-6 md:w-8 md:h-8 relative z-10" aria-hidden="true" />
      </a>
    </div>
  );
}

function matchesProductQuery(prod, rawQuery) {
  const words = rawQuery
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return true;

  const fullText = `${prod.sku_code || ''} ${prod.name || ''} ${prod.brand?.name || ''} ${prod.category?.name || ''} ${prod.description || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return words.every(word => fullText.includes(word));
}

/* ==========================================================================
   HELPER: IMAGEN REPRESENTATIVA POR CATEGORÍA Y BUSCADOR BISELADO
   ========================================================================== */
function getCategoryVisualImage(category) {
  if (category?.image_url) return category.image_url;
  const rawName = (category?.name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (rawName.includes('cristal')) {
    return 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('parabrisa') || rawName.includes('vidrio') || rawName.includes('luneta')) {
    return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('optica') || rawName.includes('faro') || rawName.includes('iluminacion') || rawName.includes('led') || rawName.includes('luz')) {
    return 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('freno') || rawName.includes('pastilla') || rawName.includes('disco') || rawName.includes('embrague')) {
    return 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('chapa') || rawName.includes('carroceria') || rawName.includes('paragolpe') || rawName.includes('capot') || rawName.includes('guardabarro')) {
    return 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('espejo') || rawName.includes('retrovisor')) {
    return 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('cerrajeria') || rawName.includes('cerradura') || rawName.includes('manija') || rawName.includes('llave')) {
    return 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('accesorio') || rawName.includes('alfombra') || rawName.includes('interior')) {
    return 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('toxic') || rawName.includes('shine') || rawName.includes('cosmetica') || rawName.includes('limpieza') || rawName.includes('estetica')) {
    return 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=900&q=80';
  }
  if (rawName.includes('motor') || rawName.includes('distribucion') || rawName.includes('bateria') || rawName.includes('encendido') || rawName.includes('filtro')) {
    return 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80';
  }
  return 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80';
}

/* ==========================================================================
   NAVBAR CON MEGA-MENÚ A PANTALLA COMPLETA Y BUSCADOR CON ESTILO BISELADO
   ========================================================================== */
function Navbar({ activePage, navigateTo, currentUser, cartCount, onOpenCart, onLogout, toggleDarkMode, isDarkMode, categories, allProducts, onOpenCategory, onProductSearchSelect, onLoginClick }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [hoveredMegaCatId, setHoveredMegaCatId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const isNavbarSolid = isScrolled || activePage !== 'inicio' || mobileMenuOpen || activeDropdown === 'catalog';

  const handleNavClick = (page, section) => { navigateTo(page, section); setMobileMenuOpen(false); setActiveDropdown(null); };
  const handleCategoryClick = (cat) => { onOpenCategory(cat); setActiveDropdown(null); setMobileMenuOpen(false); };

  const activeMegaCat = useMemo(() => {
    if (!categories || categories.length === 0) return null;
    return categories.find(c => c.id === hoveredMegaCatId) || categories[0];
  }, [categories, hoveredMegaCatId]);

  const activeMegaCatProducts = useMemo(() => {
    if (!activeMegaCat || !allProducts) return [];
    const list = [];
    for (let i = 0; i < allProducts.length; i++) {
      if (allProducts[i].category_id === activeMegaCat.id) {
        list.push(allProducts[i]);
        if (list.length >= 6) break;
      }
    }
    return list;
  }, [activeMegaCat, allProducts]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      const filtered = [];
      for (let i = 0; i < allProducts.length; i++) {
        const p = allProducts[i];
        if (matchesProductQuery(p, value)) {
          filtered.push(p);
          if (filtered.length >= 6) break;
        }
      }
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (prod) => { setSearchTerm(''); setSuggestions([]); setMobileMenuOpen(false); setActiveDropdown(null); onProductSearchSelect(prod); };

  const chamferClipSm = 'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)';

  return (
    <nav className={`fixed w-full z-[100] transition-all duration-300 ${isNavbarSolid ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm py-3.5 border-b border-slate-100 dark:border-slate-800" : "bg-transparent py-5"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center gap-4">
        
        <button onClick={() => handleNavClick('inicio', 'inicio')} className="flex flex-col items-start group text-left focus:outline-none flex-shrink-0">
          <span className={`font-bold text-xl md:text-2xl tracking-tighter font-michroma transition-colors leading-none ${isNavbarSolid ? 'text-slate-900 dark:text-white group-hover:text-blue-600' : 'text-white'}`}>D.A.P.A</span>
          <span className={`text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase font-exo mt-1 transition-colors ${isNavbarSolid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300'}`}>Repuestos Molle</span>
        </button>
        
        <div className="hidden lg:flex items-center space-x-1">
          <button onClick={() => handleNavClick('inicio', 'inicio')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:text-blue-600 ${isNavbarSolid ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}>Inicio</button>
          
          {/* ITEM CATÁLOGO CON MEGA-MENÚ A PANTALLA COMPLETA AL PASAR EL MOUSE */}
          <div
            className="static"
            onMouseEnter={() => {
              setActiveDropdown('catalog');
              if (!hoveredMegaCatId && categories.length > 0) {
                setHoveredMegaCatId(categories[0].id);
              }
            }}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              onClick={() => handleNavClick('inicio', 'catálogo')}
              className={`px-5 py-2 text-xs font-extrabold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                activeDropdown === 'catalog'
                  ? 'bg-amber-400 text-slate-950 -skew-x-12 shadow-md'
                  : isNavbarSolid
                    ? 'text-slate-700 dark:text-slate-200 hover:text-blue-600'
                    : 'text-white hover:text-amber-400'
              }`}
            >
              <span className={`flex items-center gap-1.5 ${activeDropdown === 'catalog' ? 'skew-x-12' : ''}`}>
                Catálogo <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeDropdown === 'catalog' ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {/* MEGA-MENÚ EXPANDIDO EN TODA LA PANTALLA (Estilo imagen 2) */}
            <div
              className={`absolute top-full left-0 w-full bg-[#070b14]/98 backdrop-blur-xl text-white border-t-2 border-amber-400 shadow-[0_35px_70px_rgba(0,0,0,0.85)] transition-all duration-300 origin-top before:content-[''] before:absolute before:-top-6 before:left-0 before:w-full before:h-6 ${
                activeDropdown === 'catalog'
                  ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                  : 'opacity-0 invisible -translate-y-2 pointer-events-none'
              }`}
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px))' }}
            >
              {/* Detalle geométrico amarillo superior derecho */}
              <div
                className="hidden md:block absolute top-0 right-0 w-16 h-10 bg-amber-400 pointer-events-none"
                style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 0 100%)' }}
              ></div>

              <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
                <div className="grid grid-cols-12 gap-8 min-h-[340px]">
                  
                  {/* COLUMNA IZQUIERDA: LISTA DE CATEGORÍAS + BOTÓN VER TODOS */}
                  <div className="col-span-4 lg:col-span-3 border-r border-slate-800/90 pr-4 flex flex-col justify-between">
                    <div className="max-h-[44vh] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                      {categories.map((cat) => {
                        const isCatActive = activeMegaCat?.id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onMouseEnter={() => setHoveredMegaCatId(cat.id)}
                            onClick={() => handleCategoryClick(cat)}
                            className={`w-full text-left px-4 py-2.5 text-xs uppercase tracking-wider font-exo transition-all flex items-center justify-between ${
                              isCatActive
                                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                : 'text-slate-200 hover:text-amber-400 font-bold hover:bg-white/5'
                            }`}
                            style={isCatActive ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)' } : undefined}
                          >
                            <span className="truncate pr-2">{cat.name}</span>
                            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isCatActive ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'}`} />
                          </button>
                        );
                      })}
                      {categories.length === 0 && (
                        <div className="text-xs p-4 text-slate-400">Cargando categorías...</div>
                      )}
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-800/90">
                      <button
                        onClick={() => handleNavClick('inicio', 'catálogo')}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-wider text-[11px] py-3.5 px-5 text-center transition-colors shadow-md"
                        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                      >
                        Ver todos los productos
                      </button>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: DETALLE DE LA CATEGORÍA SELECCIONADA Y VISTA PREVIA */}
                  <div className="col-span-8 lg:col-span-9 pl-2 flex flex-col justify-between">
                    {activeMegaCat ? (
                      <>
                        <div>
                          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
                            <div>
                              <h3 className="text-2xl lg:text-3xl font-black font-exo uppercase tracking-wider text-white">
                                {activeMegaCat.name}
                              </h3>
                              <button
                                onClick={() => handleCategoryClick(activeMegaCat)}
                                className="text-amber-400 hover:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 mt-1.5 group/ver transition-colors"
                              >
                                Ver todo <span className="group-hover/ver:translate-x-1 transition-transform">→</span>
                              </button>
                            </div>
                            {activeMegaCat.description && (
                              <p className="text-xs text-slate-400 font-light max-w-md">
                                {activeMegaCat.description}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-12 gap-6 items-stretch">
                            {/* Lista rápida de productos destacados de esta categoría */}
                            <div className="col-span-7 grid grid-cols-2 gap-3 content-start">
                              {activeMegaCatProducts.length > 0 ? (
                                activeMegaCatProducts.map((prod) => (
                                  <button
                                    key={prod.sku_code}
                                    onClick={() => handleSuggestionClick(prod)}
                                    className="text-left p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 transition-all group/mprod flex items-center gap-3"
                                  >
                                    <div className="w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                      <ProductImage sku={prod.sku_code} imageUrl={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider truncate">
                                        {prod.brand?.name || 'Multimarca'} • {prod.sku_code}
                                      </div>
                                      <div className="text-xs font-semibold text-slate-200 group-hover/mprod:text-white truncate">
                                        {prod.name}
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-slate-400 text-xs">
                                  Explorá todos los repuestos disponibles en <strong className="text-white">{activeMegaCat.name}</strong> haciendo clic en &ldquo;Ver todo&rdquo;.
                                </div>
                              )}
                            </div>

                            {/* Tarjeta visual representativa de la categoría */}
                            <div
                              onClick={() => handleCategoryClick(activeMegaCat)}
                              className="col-span-5 relative rounded-2xl overflow-hidden cursor-pointer group/catbanner border border-blue-500/30 min-h-[210px] flex items-center justify-center"
                            >
                              <img
                                src={getCategoryVisualImage(activeMegaCat)}
                                alt={activeMegaCat.name}
                                className="absolute inset-0 w-full h-full object-cover group-hover/catbanner:scale-110 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#030917]/95 via-[#07193d]/65 to-[#040d21]/75" />
                              <div className="relative z-10 text-center p-5">
                                <span className="inline-block bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 -skew-x-12 mb-2">
                                  <span className="inline-block skew-x-12">Categoría</span>
                                </span>
                                <h4 className="text-xl font-black font-exo uppercase tracking-wider text-white drop-shadow-md">
                                  {activeMegaCat.name}
                                </h4>
                                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 group-hover/catbanner:text-amber-400 transition-colors">
                                  Ingresar a la sección <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>

                </div>
              </div>
            </div>
          </div>

          <button onClick={() => handleNavClick('nosotros')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:text-blue-600 ${isNavbarSolid ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}>Nosotros</button>
          <button onClick={() => handleNavClick('inicio', 'contacto')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:text-blue-600 ${isNavbarSolid ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}>Contacto</button>      
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-grow justify-end relative z-50">
          
          {/* BUSCADOR EN NAVBAR CON ESTILO BISELADO Y BOTÓN DIAGONAL AMARILLO (Imagen 1) */}
          <div className="hidden lg:block relative mr-1 w-full max-w-[270px] group">
            <div
              className="p-[1.5px] bg-slate-900 dark:bg-slate-600 group-focus-within:bg-amber-400 transition-colors shadow-sm"
              style={{ clipPath: chamferClipSm }}
            >
              <div
                className="flex items-stretch bg-white dark:bg-slate-900 overflow-hidden"
                style={{ clipPath: chamferClipSm }}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="¿Qué estás buscando?"
                  className="w-full pl-3.5 pr-2 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-transparent outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setSuggestions([]); }}
                    className="px-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (suggestions.length > 0) handleSuggestionClick(suggestions[0]);
                    else handleNavClick('inicio', 'catálogo');
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 pl-5 pr-3.5 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ clipPath: 'polygon(24% 0, 100% 0, 100% 100%, 0% 100%)' }}
                  aria-label="Buscar"
                >
                  <Search className="h-4 w-4 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full min-w-[320px] right-0 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[110]">
                {suggestions.map((prod, idx) => (
                  <button key={idx} onClick={() => handleSuggestionClick(prod)} className="w-full text-left block px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors focus:outline-none group/sugg">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-[9px] font-bold tracking-widest uppercase text-blue-500">{prod.category?.name || 'Repuesto'}</div>
                      <div className="text-[9px] font-bold text-slate-400 font-exo">{prod.sku_code}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-white leading-tight truncate group-hover/sugg:text-blue-700 dark:group-hover/sugg:text-blue-300">{prod.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={toggleDarkMode} className={`p-2 rounded-full transition-colors ${isNavbarSolid ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10'}`}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {currentUser ? (
            <div className="relative group flex items-center gap-2 pr-1" ref={userMenuRef}>
              <button 
                type="button"
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Abrir opciones de usuario"
                aria-expanded={userMenuOpen}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </button>
              
              <div className={`absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 z-[110] overflow-hidden ${
                userMenuOpen 
                  ? 'opacity-100 visible pointer-events-auto' 
                  : 'opacity-0 invisible pointer-events-none md:group-hover:opacity-100 md:group-hover:visible md:group-hover:pointer-events-auto'
              }`}>
                <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</p>
                  {currentUser.email && <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>}
                </div>
                {currentUser.email?.toLowerCase() === 'admin@dapa.com' && (
                  <a 
                    href="/admin" 
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/60 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Panel Admin
                  </a>
                )}
                <button 
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }} 
                  className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={onLoginClick} 
              className={`px-3 py-2 rounded-full transition-all flex items-center gap-2 border ${
                isNavbarSolid 
                  ? 'text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800' 
                  : 'text-white border-white/25 hover:bg-white/10'
              }`}
              title="Iniciar sesión o Registrarse"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden xl:inline text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                Iniciar Sesión / Registrarse
              </span>
              <span className="hidden sm:inline xl:hidden text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                Ingresar
              </span>
            </button>
          )}

          <button onClick={onOpenCart} className={`relative p-2 rounded-full transition-all ${isNavbarSolid ? 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10'}`}>
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && <span className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in">{cartCount}</span>}
          </button>

          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className={isNavbarSolid ? 'text-slate-900 dark:text-white' : 'text-white'} /> : <Menu className={isNavbarSolid ? 'text-slate-900 dark:text-white' : 'text-white'} />}
          </button>
          
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-top-2 h-[calc(100vh-80px)] overflow-y-auto">
          
          {currentUser ? (
            <div className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</p>
                  {currentUser.email && <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                {currentUser.email?.toLowerCase() === 'admin@dapa.com' && (
                  <a 
                    href="/admin" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Panel Admin
                  </a>
                )}
                <button 
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => { setMobileMenuOpen(false); onLoginClick(); }}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md"
            >
              <User className="w-4 h-4" /> Iniciar Sesión / Registrarse
            </button>
          )}

          {/* BUSCADOR MOBILE CON ESTILO BISELADO */}
          <div className="relative w-full mb-2">
            <div
              className="p-[2px] bg-slate-900 dark:bg-slate-600"
              style={{ clipPath: chamferClipSm }}
            >
              <div
                className="flex items-stretch bg-white dark:bg-slate-800 overflow-hidden"
                style={{ clipPath: chamferClipSm }}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="¿Qué estás buscando?"
                  className="w-full bg-transparent pl-4 pr-2 py-3 text-sm text-slate-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (suggestions.length > 0) handleSuggestionClick(suggestions[0]);
                  }}
                  className="bg-amber-400 text-slate-950 pl-6 pr-5 flex items-center justify-center"
                  style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0% 100%)' }}
                  aria-label="Buscar"
                >
                  <Search className="h-5 w-5 stroke-[2.2]" />
                </button>
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                {suggestions.map((prod, idx) => (
                  <button key={idx} onClick={() => handleSuggestionClick(prod)} className="w-full text-left block px-5 py-4 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 focus:outline-none">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-blue-500 mb-1">{prod.category?.name || 'Repuesto'}</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{prod.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={() => handleNavClick('inicio', 'inicio')} className="text-left text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Inicio</button>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <button onClick={() => handleNavClick('inicio', 'catálogo')} className="text-left text-sm font-bold uppercase tracking-widest text-blue-600 mb-4 w-full flex justify-between">Catálogo</button>
            <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-amber-400">
              {categories.map(cat => (<button key={cat.id} onClick={() => handleCategoryClick(cat)} className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-blue-600">{cat.name}</button>))}
            </div>
          </div>
          
          <button onClick={() => handleNavClick('nosotros')} className="text-left text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-4">Nosotros</button>
          <button onClick={() => handleNavClick('inicio', 'contacto')} className="text-left text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-4">Contacto</button>
        </div>
      )}
    </nav>
  );
}

/* COMPONENTE TEXTO HERO */
function CSSHeroTitle() {
  return (
    <div className="relative w-full h-[180px] sm:h-[220px] md:h-[280px] mb-6 flex flex-col justify-center items-center md:items-start z-10 pointer-events-none">
      <h2 className="text-[42px] sm:text-[50px] md:text-[65px] lg:text-[80px] font-black font-exo leading-[1.1] uppercase text-white tracking-tight z-10 text-center md:text-left drop-shadow-lg">
        <span className="inline-block animate-fade-up" style={{ animationDelay: '100ms' }}>TU SOCIO DE</span><br />
        <span 
  className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300"
  style={{ backgroundImage: 'linear-gradient(to right, #60a5fa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
>
  CONFIANZA
</span><br />
        <span className="inline-block animate-fade-up" style={{ animationDelay: '500ms' }}>EN EL CAMINO.</span>
      </h2>
    </div>
  );
}

function TrustBadges() {
  const badges = [
    { icon: Truck, text: 'Envíos a todo el país' },
    { icon: Clock, text: 'Lunes a Viernes: 8 a 19:30 - Sábados: 8 a 13hrs' },
    { icon: CreditCard, text: 'Todos los medios de pago' },
    { icon: MessageSquare, text: 'Soporte rápido por WhatsApp' },
    { icon: MapPin, text: 'Lamadrid 65, Arrecifes' }
  ];

  // Repetimos la lista para cubrir pantallas grandes sin dejar huecos
  const trackItems = [...badges, ...badges];

  return (
    <div className="bg-[#0b1120] text-white py-3.5 relative z-20 overflow-hidden pause-on-hover select-none">
      <div className="marquee-container animate-marquee-left">
        {[0, 1].map((copyIndex) => (
          <div
            key={copyIndex}
            aria-hidden={copyIndex === 1}
            className="flex items-center gap-10 sm:gap-16 pr-10 sm:pr-16 whitespace-nowrap text-xs sm:text-sm font-bold uppercase tracking-wider"
          >
            {trackItems.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <span key={idx} className="flex items-center gap-2.5">
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                  <span>{item.text}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSection({ navigateTo }) {
  return (
    <>
      <section id="inicio" className="relative h-screen min-h-[500px] flex items-center justify-center bg-slate-900 z-10">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80" alt="Fachada del local comercial de D.A.P.A Repuestos Molle" className="w-full h-full object-cover object-center opacity-70 mix-blend-overlay" fetchPriority="high" />
        </div>
        <div className="absolute inset-0 bg-slate-900/70 z-0" aria-hidden="true"></div>
        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left w-full mt-16 md:mt-24 flex flex-col items-center md:items-start justify-center">
          <CSSHeroTitle />
          <RevealOnScroll delay="delay-700">
            <h1 className="sr-only">TU SOCIO DE CONFIANZA EN EL CAMINO.</h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-200 max-w-2xl mx-auto md:mx-0 mb-8 md:mb-10 font-light leading-relaxed px-4 md:px-0">
              Venta de repuestos y accesorios para el automotor. Envíos a todo el país desde Arrecifes con la garantía y respaldo de más de 50 años de experiencia en el negocio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start px-4 md:px-0 relative z-40 w-full sm:w-auto pb-16">
              <button onClick={() => navigateTo('inicio', 'catálogo')} className="group bg-blue-600 text-white hover:bg-blue-500 px-6 md:px-8 py-3 md:py-4 rounded-lg md:rounded-none font-bold uppercase tracking-wider text-xs md:text-sm transition-all flex items-center justify-center gap-2 overflow-hidden relative focus:ring-4 focus:ring-blue-300 w-full sm:w-auto shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-cyan-300 opacity-0 group-hover:opacity-20 transition-opacity"></span>
                <span className="relative z-10 flex items-center gap-2">Ver Catálogo <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
              </button>
              <button onClick={() => navigateTo('nosotros')} className="bg-transparent border border-white/50 hover:border-white hover:bg-white/10 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg md:rounded-none font-bold uppercase tracking-wider text-xs md:text-sm transition-all flex items-center justify-center focus:ring-4 focus:ring-slate-300 w-full sm:w-auto">Conocé Más</button>
            </div>
          </RevealOnScroll>
        </div>
      </section>
      <TrustBadges />
    </>
  );
}

/* ==========================================================================
   DESTACADOS D.A.P.A (BANNERS A ANCHO COMPLETO + CINTA AUTOMÁTICA DE PRODUCTOS Y VIDEOS DE INSTAGRAM)
   ==========================================================================
   CÓMO AGREGAR TUS FOTOS REALES Y VIDEOS DESCARGADOS DE INSTAGRAM:
   1) Guardá tus fotos (ej: 'optica-hilux.jpg') o videos de Instagram (ej: 'reel-1.mp4')
      dentro de la carpeta `catalogo/public/`.
   2) En `SHOWCASE_GALLERY_ITEMS` (abajo), cambiá `src` por `'/optica-hilux.jpg'` o `'/reel-1.mp4'`
      y usá `type: 'image'` para fotos o `type: 'video'` para los reels de Instagram.
   ========================================================================== */
const SHOWCASE_BANNERS = [
  {
    id: 'banner-1',
    layout: 'chevron-split',
    leftImg: '/local-dapa.jpg',
    rightImg: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80',
    headlineTop: '¡TODO LO QUE',
    headlineBottom: 'TU AUTO NECESITA!',
    subtitle: 'Calidad, variedad y confianza en un solo lugar.',
    ctaText: 'Ver Catálogo Completo',
    ctaAction: 'catalogo'
  },
  {
    id: 'banner-2',
    layout: 'welcome-emblem',
    leftImg: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80',
    rightImg: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    headline: '¡¡BIENVENIDOS!!',
    brandTitle: 'D.A.P.A',
    brandSub: 'REPUESTOS MOLLE',
    subtitle: 'Más de 50 años de trayectoria en Arrecifes • Envíos a todo el país',
    ctaText: 'Consultar por WhatsApp',
    ctaAction: 'whatsapp'
  },
  {
    id: 'banner-3',
    layout: 'video-full',
    // Reemplazá este link por tu video descargado de Instagram en public/ (ej: '/reel-local.mp4')
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-mechanic-working-on-a-car-engine-41612-large.mp4',
    poster: '/local-dapa.jpg',
    badge: 'INSTAGRAM @AUTOPARTESMOLLE',
    headlineTop: 'NOVEDADES Y REPUESTOS',
    headlineBottom: 'EN NUESTRO LOCAL',
    subtitle: 'Ópticas, parabrisas, chapería, frenos y accesorios multimarca directo a tu taller o domicilio.',
    ctaText: 'Cotizar mi Repuesto',
    ctaAction: 'contacto'
  }
];

const SHOWCASE_GALLERY_ITEMS = [
  {
    id: 101,
    type: 'image', // Cambiá src por '/tu-foto-1.jpg' cuando subas fotos reales del local
    src: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=800&q=80',
    tag: 'ILUMINACIÓN',
    title: 'Ópticas Delanteras y Faros LED'
  },
  {
    id: 102,
    type: 'video', // Podés reemplazar src por tu video descargado de Instagram: ej. '/instagram-reel-1.mp4'
    src: 'https://assets.mixkit.co/videos/preview/mixkit-mechanic-working-on-a-car-engine-41612-large.mp4',
    poster: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
    tag: 'REEL INSTAGRAM',
    title: 'Asesoramiento Técnico y Repuestos'
  },
  {
    id: 103,
    type: 'image',
    src: '/local-dapa.jpg',
    tag: 'CASA CENTRAL',
    title: 'Stock Permanente en Lamadrid 65'
  },
  {
    id: 104,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    tag: 'CRISTALES',
    title: 'Parabrisas y Lunetas todas las marcas'
  },
  {
    id: 105,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80',
    tag: 'FRENOS',
    title: 'Discos, Pastillas y Campanas'
  },
  {
    id: 106,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    tag: 'CARROCERÍA',
    title: 'Paragolpes, Capot y Guardabarros'
  },
  {
    id: 107,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
    tag: 'ESTÉTICA VEHICULAR',
    title: 'Línea Completa de Cuidado Automotor'
  }
];

function MediaShowcaseSection({ navigateTo }) {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const handleNextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % SHOWCASE_BANNERS.length);
  }, []);

  const handlePrevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + SHOWCASE_BANNERS.length) % SHOWCASE_BANNERS.length);
  };

  // Desplazamiento automático de los banners a pantalla completa cada 5.5 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(handleNextBanner, 5500);
    return () => clearInterval(timer);
  }, [isPaused, handleNextBanner]);

  const handleBannerAction = (action) => {
    if (action === 'whatsapp') {
      window.open(CONTACT_INFO.whatsappLink, '_blank');
    } else if (action === 'contacto') {
      navigateTo('inicio', 'contacto');
    } else {
      navigateTo('inicio', 'catálogo');
    }
  };

  return (
    <section
      className="pt-20 pb-28 md:pt-28 md:pb-36 relative z-20 text-white overflow-hidden w-full"
      style={{ background: 'linear-gradient(135deg, #061536 0%, #0d2f75 50%, #05112b 100%)' }}
    >
      {/* Divisor diagonal superior (Subida de izquierda a derecha) */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-30 -mt-[1px]">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-10 sm:h-14 md:h-20 block">
          <polygon points="0,0 1440,0 0,90" className="fill-white dark:fill-slate-900 transition-colors duration-300" />
        </svg>
      </div>

      {/* Triángulos geométricos decorativos */}
      <div
        className="hidden sm:block absolute top-12 md:top-16 right-6 md:right-16 w-10 h-10 md:w-12 md:h-12 bg-amber-400 pointer-events-none z-30 shadow-lg"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
        aria-hidden="true"
      ></div>
      <div
        className="hidden sm:block absolute bottom-10 md:bottom-14 left-0 w-24 md:w-36 h-12 md:h-16 bg-amber-400 pointer-events-none z-30"
        style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
        aria-hidden="true"
      ></div>

      {/* Encabezado de la sección */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block border border-amber-400 text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1 -skew-x-12 mb-2.5">
            <span className="inline-block skew-x-12">Destacados D.A.P.A</span>
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-exo uppercase tracking-wider text-white">
            Productos y Novedades en Acción
          </h2>
        </div>

        <a
          href={CONTACT_INFO.instagramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2.5 rounded-xl transition-all w-fit"
        >
          <CustomInstagram className="w-4 h-4" /> Seguinos en @autopartesmolle
        </a>
      </div>

      {/* 1) CARRUSEL PANORÁMICO A TODO EL ANCHO DE LA PÁGINA (Estilo Imágenes 3 y 4) */}
      <div
        className="relative w-full overflow-hidden border-y-2 border-blue-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.6)] mb-12"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out w-full"
          style={{ transform: `translateX(-${currentBanner * 100}%)` }}
        >
          {SHOWCASE_BANNERS.map((slide) => (
            <div key={slide.id} className="w-full flex-shrink-0 relative h-[320px] sm:h-[380px] md:h-[440px] bg-[#040c21] overflow-hidden">
              
              {slide.layout === 'chevron-split' && (
                <>
                  {/* Imagen izquierda y derecha a pantalla completa */}
                  <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                    <img src={slide.leftImg} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/25" />
                  </div>
                  <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                    <img src={slide.rightImg} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/25" />
                  </div>

                  {/* Escudo central azul geométrico en punta (Estilo Imagen 3) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Borde luminoso azul exterior */}
                    <div
                      className="w-[92%] sm:w-[70%] md:w-[58%] lg:w-[50%] h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 p-[6px] shadow-[0_0_50px_rgba(37,99,235,0.9)]"
                      style={{ clipPath: 'polygon(0 0, 86% 0, 100% 50%, 86% 100%, 0 100%, 14% 50%)' }}
                    >
                      <div
                        className="w-full h-full flex flex-col items-center justify-center text-center px-8 sm:px-14 md:px-20 pointer-events-auto"
                        style={{
                          background: 'linear-gradient(135deg, #031242 0%, #082578 55%, #020c2e 100%)',
                          clipPath: 'polygon(0 0, 86% 0, 100% 50%, 86% 100%, 0 100%, 14% 50%)'
                        }}
                      >
                        <h3 className="text-2xl sm:text-4xl md:text-5xl font-black font-exo uppercase tracking-tight text-white leading-none mb-1 drop-shadow-md">
                          {slide.headlineTop}
                        </h3>
                        <p className="text-lg sm:text-2xl md:text-3xl font-light font-exo uppercase tracking-wide text-white mb-4">
                          {slide.headlineBottom}
                        </p>
                        <div className="w-4/5 max-w-xs h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-4" />
                        <p className="text-xs sm:text-base md:text-lg text-slate-200 font-light max-w-md mb-6">
                          {slide.subtitle}
                        </p>
                        <button
                          onClick={() => handleBannerAction(slide.ctaAction)}
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-widest text-[11px] sm:text-xs px-6 py-3 transition-all shadow-lg"
                          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                        >
                          {slide.ctaText}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {slide.layout === 'welcome-emblem' && (
                <>
                  {/* Imagen izquierda y derecha */}
                  <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                    <img src={slide.leftImg} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/30" />
                  </div>
                  <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                    <img src={slide.rightImg} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/30" />
                  </div>

                  {/* Trapecio central azul con bienvenida y emblema (Estilo Imagen 4) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="w-[94%] sm:w-[75%] md:w-[64%] lg:w-[56%] h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 p-[6px] shadow-[0_0_50px_rgba(37,99,235,0.9)]"
                      style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0% 100%)' }}
                    >
                      <div
                        className="w-full h-full flex flex-col items-center justify-center text-center px-6 sm:px-12 pointer-events-auto"
                        style={{
                          background: 'linear-gradient(180deg, #03154a 0%, #072370 60%, #031038 100%)',
                          clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0% 100%)'
                        }}
                      >
                        <h3 className="text-2xl sm:text-4xl md:text-5xl font-black font-exo uppercase tracking-widest text-white mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                          {slide.headline}
                        </h3>

                        {/* Emblema central blanco estilo engranaje/insignia automotriz */}
                        <div className="bg-white text-slate-950 px-7 py-4 sm:px-10 sm:py-5 rounded-3xl shadow-2xl border-4 border-blue-500/40 mb-4 flex flex-col items-center">
                          <span className="font-michroma font-bold text-xl sm:text-3xl tracking-tighter text-blue-800 leading-none">
                            {slide.brandTitle}
                          </span>
                          <span className="font-exo font-black text-[10px] sm:text-xs tracking-[0.25em] text-slate-700 uppercase mt-1">
                            {slide.brandSub}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-blue-100 font-light max-w-md mb-4">
                          {slide.subtitle}
                        </p>
                        <button
                          onClick={() => handleBannerAction(slide.ctaAction)}
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-widest text-[11px] px-6 py-2.5 transition-all shadow-lg"
                          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                        >
                          {slide.ctaText}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {slide.layout === 'video-full' && (
                <>
                  <video
                    src={slide.videoSrc}
                    poster={slide.poster}
                    muted={isMuted}
                    loop
                    playsInline
                    autoPlay
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#040e29]/95 via-[#061947]/80 to-transparent" />
                  <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-center items-start">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 -skew-x-12 mb-3">
                      <span className="inline-block skew-x-12">{slide.badge}</span>
                    </span>
                    <h3 className="text-2xl sm:text-4xl md:text-5xl font-black font-exo uppercase text-white leading-tight">
                      {slide.headlineTop} <br />
                      <span className="text-cyan-300">{slide.headlineBottom}</span>
                    </h3>
                    <p className="text-xs sm:text-base text-slate-200 max-w-xl mt-3 mb-6 font-light">
                      {slide.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleBannerAction(slide.ctaAction)}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-widest text-xs px-7 py-3.5 transition-all shadow-lg"
                        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                      >
                        {slide.ctaText}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider px-4 py-3.5 rounded-xl border border-white/20 backdrop-blur-sm transition-colors"
                      >
                        {isMuted ? '🔇 Activar sonido' : '🔊 Silenciar'}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          ))}
        </div>

        {/* Flechas laterales sobre el banner a todo ancho */}
        <button
          onClick={handlePrevBanner}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-slate-950/70 hover:bg-amber-400 text-white hover:text-slate-950 border border-white/20 transition-all"
          aria-label="Banner anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNextBanner}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-slate-950/70 hover:bg-amber-400 text-white hover:text-slate-950 border border-white/20 transition-all"
          aria-label="Siguiente banner"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicadores inferiores */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {SHOWCASE_BANNERS.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setCurrentBanner(i)}
              className={`h-2 rounded-full transition-all ${currentBanner === i ? 'w-7 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'}`}
              aria-label={`Ir al banner ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 2) CINTA DE DESPLAZAMIENTO AUTOMÁTICO A TODO LO ANCHO (FOTOS DE PRODUCTOS + VIDEOS DE INSTAGRAM) */}
      <div className="w-full overflow-hidden pause-on-hover relative z-20">
        <div className="marquee-container animate-marquee-left">
          {[0, 1].map((copyIdx) => (
            <div
              key={copyIdx}
              aria-hidden={copyIdx === 1}
              className="flex items-stretch gap-5 pr-5"
            >
              {SHOWCASE_GALLERY_ITEMS.map((item, idx) => (
                <div
                  key={`${copyIdx}-${item.id}-${idx}`}
                  onClick={() => navigateTo('inicio', 'catálogo')}
                  className="w-[270px] sm:w-[320px] md:w-[360px] h-[220px] sm:h-[250px] flex-shrink-0 relative rounded-2xl overflow-hidden border border-blue-400/30 hover:border-amber-400 group cursor-pointer shadow-xl bg-slate-950"
                >
                  {item.type === 'video' ? (
                    <video
                      src={item.src}
                      poster={item.poster}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
                  <span className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 -skew-x-12">
                    <span className="inline-block skew-x-12">
                      {item.type === 'video' ? `▶ ${item.tag}` : item.tag}
                    </span>
                  </span>
                  <div className="absolute bottom-3 left-4 right-4">
                    <h4 className="text-sm sm:text-base font-bold font-exo uppercase tracking-wide text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Divisor diagonal inferior (Subida hacia Proceso de Compra) */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-30 -mb-[1px]">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-10 sm:h-14 md:h-20 block">
          <polygon points="0,90 1440,0 1440,90" className="fill-white dark:fill-slate-900 transition-colors duration-300" />
        </svg>
      </div>
    </section>
  );
}

function CatalogSection({ categories, allProducts, onOpenCategory, onProductSearchSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length >= 2) {
      const filtered = [];
      for (let i = 0; i < allProducts.length; i++) {
        const p = allProducts[i];
        if (matchesProductQuery(p, value)) {
          filtered.push(p);
          if (filtered.length >= 6) break;
        }
      }
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (prod) => { setSearchTerm(''); setSuggestions([]); onProductSearchSelect(prod); };

  const chamferClipLg = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

  return (
    <section id="catálogo" className="pt-20 pb-16 md:pt-28 md:pb-24 bg-white dark:bg-slate-900 relative z-20 transition-colors duration-300">
      {/* Divisor diagonal superior desde la barra de beneficios */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-10 -mt-[1px]">
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-7 sm:h-10 md:h-14 block">
          <polygon points="0,0 1440,0 0,70" className="fill-[#0b1120]" />
          <polygon points="0,62 1440,0 0,70" className="fill-blue-600/80" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10 md:mb-16 relative z-30">
        <RevealOnScroll>
          <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 uppercase tracking-widest">Nuestro Catálogo</PremiumTitle>
          <div className="w-16 h-1.5 bg-amber-400 mx-auto my-3 -skew-x-12 rounded-sm"></div>
          <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-light">Buscá el repuesto para tu vehículo y agregalo al carrito de cotización.</p>
        </RevealOnScroll>

        {/* BUSCADOR PRINCIPAL CON BORDES BISELADOS Y BOTÓN AMARILLO EN DIAGONAL (Estilo Imagen 1) */}
        <RevealOnScroll delay="md:delay-100">
          <form className="w-full max-w-2xl mx-auto mt-6 md:mt-10 mb-6 md:mb-8 relative group" onSubmit={e => e.preventDefault()}>
            <label htmlFor="search" className="sr-only">Buscar repuesto</label>
            <div
              className="p-[2px] bg-slate-900 dark:bg-slate-500 group-focus-within:bg-amber-400 transition-colors shadow-lg"
              style={{ clipPath: chamferClipLg }}
            >
              <div
                className="flex items-stretch bg-white dark:bg-slate-800 overflow-hidden"
                style={{ clipPath: chamferClipLg }}
              >
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-5 md:pl-6 pr-3 py-3.5 md:py-4 bg-transparent text-xs sm:text-sm md:text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-slate-900 dark:text-white"
                  placeholder="¿Qué estás buscando? (Ej: Hilux, Corsa, Óptica)..."
                  autoComplete="off"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setSuggestions([]); }}
                    className="px-2 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center"
                    aria-label="Limpiar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (suggestions.length > 0) handleSuggestionClick(suggestions[0]);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 pl-8 pr-6 md:pl-10 md:pr-8 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ clipPath: 'polygon(24% 0, 100% 0, 100% 100%, 0% 100%)' }}
                  aria-label="Buscar repuesto"
                >
                  <Search className="h-5 w-5 md:h-6 md:w-6 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 text-left overflow-hidden animate-in slide-in-from-top-2">
                {suggestions.map((prod, idx) => (
                  <button key={idx} onClick={() => handleSuggestionClick(prod)} type="button" className="w-full text-left block px-5 py-4 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors focus:outline-none focus:bg-blue-50 dark:focus:bg-slate-700 group/sugg">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-blue-500 dark:text-blue-400">{prod.category?.name || 'Repuesto'}</div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-exo">{prod.sku_code}</div>
                    </div>
                    <div className="text-sm md:text-base font-semibold text-slate-800 dark:text-white leading-tight group-hover/sugg:text-blue-700 dark:group-hover/sugg:text-blue-300 transition-colors">{prod.name}</div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </RevealOnScroll>
      </div>

      {categories.length === 0 ? (
         <div className="text-center py-10"><Settings className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* TARJETAS DE CATEGORÍAS CON IMAGEN REPRESENTATIVA DE FONDO (Estilo Imagen 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {categories.map((cat, idx) => (
              <RevealOnScroll key={cat.id} delay={`delay-${(idx % 3) * 100}`}>
                <article 
                  onClick={() => onOpenCategory(cat)} 
                  className="relative h-72 sm:h-80 md:h-[380px] rounded-xl overflow-hidden border border-slate-900/15 dark:border-blue-500/25 shadow-lg hover:shadow-[0_20px_45px_rgba(13,45,108,0.45)] hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex items-center justify-center text-center bg-[#030917]"
                >
                  {/* Imagen de fondo representativa de la categoría */}
                  <img
                    src={getCategoryVisualImage(cat)}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />

                  {/* Filtro oscuro azulado profundo estilo estudio automotriz */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#040e24]/80 via-[#071c47]/55 to-[#020714]/90 group-hover:via-[#071c47]/35 transition-all duration-500" />

                  {/* Líneas geométricas azules neón en la esquina superior izquierda (como en la Imagen 5) */}
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute top-0 left-0 w-40 h-40 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  >
                    <polyline
                      points="115,0 35,95 100,175"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      style={{ filter: 'drop-shadow(0 0 8px #3b82f6)' }}
                    />
                    <polyline
                      points="140,0 60,95 125,175"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                      opacity="0.7"
                    />
                  </svg>

                  {/* Contenido central de la categoría */}
                  <div className="relative z-10 px-6 flex flex-col items-center justify-center">
                    <h4 className="text-white font-black text-2xl sm:text-3xl uppercase tracking-wider font-exo drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] group-hover:scale-105 transition-transform duration-300">
                      {cat.name}
                    </h4>
                    {cat.description && (
                      <p className="text-blue-100/90 text-xs sm:text-sm font-light mt-2 max-w-xs drop-shadow">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 -skew-x-12 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-md">
                      <span className="inline-block skew-x-12 flex items-center gap-1">
                        Ver productos <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </span>
                  </div>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryDetailSection({ category, allProducts, onBack, onAddToCart, initialSelectedProduct, selectedProduct, onQuickView, onShowToast }) {
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [categorySearch, setCategorySearch] = useState('');
  const [sortBy, setSortBy] = useState('relevancia'); // relevancia | precio_asc | precio_desc | nombre_asc
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingProduct, setViewingProduct] = useState(selectedProduct || initialSelectedProduct || null);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [copiedLink, setCopiedLink] = useState(false);
  const productsPerPage = 12;

  useEffect(() => {
    setViewingProduct(selectedProduct || initialSelectedProduct || null);
  }, [selectedProduct, initialSelectedProduct]);

  const categoryProducts = useMemo(
    () => allProducts.filter(p => p.category_id === category?.id),
    [allProducts, category]
  );

  const availableBrands = useMemo(() => {
    const brands = new Set(categoryProducts.map(p => p.brand?.name).filter(Boolean));
    return ['Todas', ...Array.from(brands).sort()];
  }, [categoryProducts]);

  // Filtrado por marca + palabras sueltas + ordenamiento de precios/nombre
  const filteredProducts = useMemo(() => {
    const words = categorySearch
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const list = categoryProducts.filter(p => {
      const matchesBrand = selectedBrand === 'Todas' || (p.brand?.name || 'Varios') === selectedBrand;
      if (!matchesBrand) return false;
      if (words.length === 0) return true;

      const fullText = `${p.sku_code || ''} ${p.name || ''} ${p.brand?.name || ''} ${p.description || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      return words.every(w => fullText.includes(w));
    });

    if (sortBy === 'precio_asc') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'precio_desc') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'nombre_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [categoryProducts, selectedBrand, categorySearch, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const currentProducts = useMemo(() => {
    const indexOfLast = currentPage * productsPerPage;
    const indexOfFirst = indexOfLast - productsPerPage;
    return filteredProducts.slice(indexOfFirst, indexOfLast);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrand, category, categorySearch, sortBy]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, viewingProduct]);

  const handleOpenProduct = (prod) => {
    setViewingProduct(prod);
    setQuantity(1);
    setCopiedLink(false);
    window.history.pushState(
      { page: 'categoria', category, product: prod },
      '',
      `#producto-${prod.sku_code}`
    );
  };

  const handleCloseProduct = () => {
    setViewingProduct(null);
    window.history.pushState(
      { page: 'categoria', category },
      '',
      `#categoria-${category.id}`
    );
  };

  const handleCopyProductLink = (prod) => {
    const url = `${window.location.origin}/#producto-${encodeURIComponent(prod.sku_code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    if (onShowToast) onShowToast('Enlace del repuesto copiado');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getProductWhatsAppUrl = (prod) => {
    const url = `${window.location.origin}/#producto-${encodeURIComponent(prod.sku_code)}`;
    const text = `¡Hola DAPA Repuestos! Quería consultar por este repuesto del catálogo:\n\n• *Repuesto:* ${prod.name}\n• *Código:* ${prod.sku_code}${prod.price > 0 ? `\n• *Precio web:* $${Number(prod.price).toLocaleString('es-AR')}` : ''}\n• *Enlace:* ${url}`;
    return `${CONTACT_INFO.whatsappLink}?text=${encodeURIComponent(text)}`;
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  if (!category) return null;

  return (
    <section className="pt-28 pb-24 min-h-screen bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={viewingProduct ? handleCloseProduct : onBack}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 px-5 py-2.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" /> {viewingProduct ? `Volver a ${category.name}` : 'Volver al Catálogo'}
          </button>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden sm:block">
            Catálogo / <span className="text-blue-600 dark:text-blue-400">{category.name}</span> {viewingProduct && `/ ${viewingProduct.sku_code}`}
          </div>
        </div>

        {viewingProduct ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-lg border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col lg:flex-row gap-10">
              
              <div className="w-full lg:w-1/2 flex flex-col">
                <div 
                  className="relative w-full h-80 sm:h-96 lg:h-[450px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-zoom-in"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  onMouseMove={handleMouseMove}
                >
                  <ProductImage 
                    sku={viewingProduct.sku_code} 
                    imageUrl={viewingProduct.image_url} 
                    alt={viewingProduct.name} 
                    className={`w-full h-full object-contain transition-transform duration-200 ${isZoomed ? 'scale-[2]' : 'scale-100'}`}
                  />
                  {isZoomed && (
                    <style>{`
                      .scale-\\[2\\] {
                        transform-origin: ${zoomPos.x}% ${zoomPos.y}%;
                      }
                    `}</style>
                  )}
                </div>
                <p className="text-center text-[10px] uppercase tracking-widest text-slate-400 mt-3 hidden sm:block">
                  Pasá el mouse por la imagen para hacer zoom
                </p>
              </div>

              <div className="w-full lg:w-1/2 flex flex-col justify-center">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-md">
                      {viewingProduct.brand?.name || 'Genérico'}
                    </span>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-exo">
                      CÓDIGO: {viewingProduct.sku_code}
                    </span>
                  </div>

                  {/* BOTÓN DE COPIAR ENLACE DIRECTO AL PRODUCTO */}
                  <button
                    type="button"
                    onClick={() => handleCopyProductLink(viewingProduct)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Copiar enlace directo a este repuesto"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <span>Compartir link</span>
                      </>
                    )}
                  </button>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
                  {viewingProduct.name}
                </h1>

                <div className="text-3xl sm:text-4xl font-bold font-exo text-blue-600 dark:text-blue-400 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                  {viewingProduct.price > 0 ? `$${Number(viewingProduct.price).toLocaleString('es-AR')}` : 'Consultar Precio'}
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-2">
                    Descripción y Compatibilidad:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 font-light text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    {viewingProduct.description 
                      ? viewingProduct.description 
                      : 'Repuesto garantizado por D.A.P.A. Repuestos Molle. Consultanos con el número de chasis o modelo exacto de tu vehículo para confirmar compatibilidad antes de retirar.'}
                  </p>
                </div>

              <div className="mb-8 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-0.5">
                      Disponibilidad en local o por encargue
                    </span>
                    Trabajamos con catálogos directos de múltiples proveedores. Si el repuesto no se encuentra físicamente en el mostrador al momento de tu compra, <strong>lo pedimos por encargue de forma inmediata</strong> y te avisamos apenas ingresa.
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center justify-between border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 sm:w-36 bg-slate-50 dark:bg-slate-900">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 focus:outline-none">
                        <Minus className="w-4 h-4"/>
                      </button>
                      <span className="font-bold text-slate-900 dark:text-white">{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 1)} className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 focus:outline-none">
                        <Plus className="w-4 h-4"/>
                      </button>
                    </div>

                    <button 
                      onClick={() => onAddToCart(viewingProduct, quantity)} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-xs py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 focus:outline-none active:scale-[0.98]"
                    >
                      <ShoppingCart className="w-5 h-5" /> Agregar al Carrito
                    </button>
                  </div>

                  {/* BOTÓN DE CONSULTA DIRECTA POR WHATSAPP */}
                  <a
                    href={getProductWhatsAppUrl(viewingProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-500/10 hover:bg-green-500 text-green-600 dark:text-green-400 hover:text-white border border-green-500/30 hover:border-green-500 font-bold uppercase tracking-widest text-xs py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2.5 focus:outline-none"
                  >
                    <MessageSquare className="w-4 h-4" /> Consultar por este repuesto en WhatsApp
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-blue-500 flex-shrink-0" /> Retiro gratis en local o envíos</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" /> Garantía de confianza</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-blue-500/30">
              <img
                src={getCategoryVisualImage(category)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#040d21]/95 via-[#07193e]/80 to-[#040d21]/75" />
              <div className="relative z-10">
                <span className="text-amber-400 font-bold tracking-widest uppercase text-[10px] mb-1 block">Línea Completa</span>
                <h1 className="text-2xl md:text-4xl font-bold font-michroma uppercase tracking-wide">{category.name}</h1>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 text-right relative z-10 flex-shrink-0">
                <span className="text-xl font-bold font-exo text-amber-400 block leading-none">{filteredProducts.length}</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-300">Productos</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              {/* FILTRO LATERAL DE MARCAS */}
              <div className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm lg:sticky lg:top-28">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white pb-3 mb-3 border-b border-slate-100 dark:border-slate-700">
                  <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Filtrar por Marca
                </div>
                <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar max-h-[60vh]">
                  {availableBrands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand)}
                      className={`text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between whitespace-nowrap lg:whitespace-normal flex-shrink-0 ${
                        selectedBrand === brand
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 font-medium'
                      }`}
                    >
                      <span className="truncate pr-2">{brand}</span>
                      {selectedBrand === brand && <div className="w-1.5 h-1.5 rounded-full bg-white hidden lg:block flex-shrink-0"></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full">
                {/* BARRA DE BÚSQUEDA BISELADA + SELECTOR DE ORDENAMIENTO */}
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 group">
                    <div
                      className="p-[1.5px] bg-slate-900 dark:bg-slate-600 group-focus-within:bg-amber-400 transition-colors"
                      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                    >
                      <div
                        className="flex items-stretch bg-white dark:bg-slate-900 overflow-hidden"
                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                      >
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder={`¿Qué estás buscando en ${category.name}? (ej: Gol, Corsa)...`}
                          className="w-full pl-4 pr-2 py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                        />
                        {categorySearch && (
                          <button
                            type="button"
                            onClick={() => setCategorySearch('')}
                            className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <div
                          className="bg-amber-400 text-slate-950 pl-6 pr-4 flex items-center justify-center flex-shrink-0"
                          style={{ clipPath: 'polygon(24% 0, 100% 0, 100% 100%, 0% 100%)' }}
                        >
                          <Search className="w-4 h-4 stroke-[2.2]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SELECTOR DE ORDENAMIENTO PARA EL CLIENTE */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="relevancia">Ordenar: Relevancia</option>
                    <option value="precio_asc">Precio: Menor a Mayor</option>
                    <option value="precio_desc">Precio: Mayor a Menor</option>
                    <option value="nombre_asc">Nombre: A - Z</option>
                  </select>

                  {(categorySearch || selectedBrand !== 'Todas' || sortBy !== 'relevancia') && (
                    <button
                      onClick={() => { setCategorySearch(''); setSelectedBrand('Todas'); setSortBy('relevancia'); }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap px-2 py-1"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {currentProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {currentProducts.map((prod) => (
                      <div
                        key={prod.sku_code}
                        onClick={() => handleOpenProduct(prod)}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group cursor-pointer"
                      >
                        <div className="h-44 relative bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                          <ProductImage sku={prod.sku_code} imageUrl={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                            {prod.brand?.name || 'Genérico'}
                          </div>

                          {/* BOTÓN DE VISTA RÁPIDA CONECTADO A QuickViewModal */}
                          {onQuickView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickView(prod, category.name);
                              }}
                              title="Vista rápida"
                              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-all shadow-md focus:opacity-100 focus:outline-none"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 font-exo">CÓDIGO: {prod.sku_code}</div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2" title={prod.name}>
                              {prod.name}
                            </h3>
                            <p className="text-lg font-bold font-exo text-blue-600 dark:text-blue-400 mb-3">
                              {prod.price > 0 ? `$${Number(prod.price).toLocaleString('es-AR')}` : 'Consultar'}
                            </p>
                          </div>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); onAddToCart(prod, 1); }} 
                            className="w-full mt-2 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 dark:hover:bg-blue-500 text-slate-700 dark:text-white hover:text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-wider focus:outline-none"
                          >
                            <Plus className="w-4 h-4" /> Agregar al Carrito
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 p-12 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-slate-500 dark:text-slate-400 mb-4">No se encontraron repuestos con esa búsqueda en esta categoría.</p>
                    <button onClick={() => { setSelectedBrand('Todas'); setCategorySearch(''); setSortBy('relevancia'); }} className="text-blue-600 font-bold text-xs uppercase tracking-wider hover:underline">
                      Ver todos los productos de {category.name}
                    </button>
                  </div>
                )}

                {/* PAGINACIÓN COMPACTA INTELIGENTE */}
                {totalPages > 1 && (() => {
                  const getVisiblePages = () => {
                    if (totalPages <= 7) {
                      return Array.from({ length: totalPages }, (_, i) => i + 1);
                    }
                    if (currentPage <= 4) {
                      return [1, 2, 3, 4, 5, '...', totalPages];
                    }
                    if (currentPage >= totalPages - 3) {
                      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    }
                    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                  };

                  return (
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-12 mb-8">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-transparent flex-shrink-0"
                          title="Página anterior"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-1 sm:gap-2">
                          {getVisiblePages().map((page, idx) =>
                            page === '...' ? (
                              <span key={`dots-${idx}`} className="px-2 text-slate-400 dark:text-slate-500 font-bold select-none">
                                ...
                              </span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[38px] sm:min-w-[42px] h-10 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                    : 'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          )}
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-transparent flex-shrink-0"
                          title="Página siguiente"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        Página {currentPage} de {totalPages}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ProcessSection({ setTutorialOpen }) {
  const steps = [
    { id: 1, title: 'Elegí', desc: 'Agregá los repuestos al carrito.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-blue-600 transition-colors duration-500"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" className="group-hover:stroke-blue-600"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12" className="group-hover:stroke-blue-600"/><circle cx="12" cy="5" r="1" fill="currentColor" className="opacity-0 group-hover:animate-drop-1 text-blue-500"/><circle cx="10" cy="4" r="1" fill="currentColor" className="opacity-0 group-hover:animate-drop-2 text-blue-500"/><circle cx="14" cy="4" r="1" fill="currentColor" className="opacity-0 group-hover:animate-drop-3 text-blue-500"/></svg> },
    { id: 2, title: 'Cotizá', desc: 'Enviá el carrito por WhatsApp o via web.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-green-500 transition-colors duration-500"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" className="group-hover:stroke-green-600"/><path d="M12 18h.01M8 6h8" className="group-hover:stroke-green-600"/><path d="M12 10.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 6c2.5 0 4.5-2 4.5-4.5S14.5 7.5 12 7.5c-2.3 0-4.1 1.7-4.4 3.9-.1.6.4 1.1 1 .9 1.1-.3 2.1 1.1 1.5 2.1-.2.4.1.9.6.9.3 0 .6.2.7.5.1.3.1.6 0 1-.3.8-.4 1.7-.1 2.5.3.8 1.1 1.2 2 1.2z" fill="none" className="opacity-0 group-hover:animate-fade-in text-green-500"/><path d="M8 10h3M8 12h5" className="opacity-0 group-hover:animate-data-load text-slate-300"/></svg> },
    { id: 3, title: 'Pagás', desc: 'Aboná con tu medio de pago favorito.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-blue-500 transition-colors duration-500"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" className="group-hover:stroke-slate-600 dark:group-hover:stroke-slate-500"/><path d="M3 10h18M7 14h10M7 16h6" className="group-hover:stroke-slate-600 dark:group-hover:stroke-slate-500"/><rect x="6" y="6" width="12" height="3" rx="0.5" className="group-hover:fill-green-900 group-hover:stroke-green-500 transition-colors duration-500"/><rect x="8" y="1" width="8" height="5" rx="1" fill="currentColor" className="opacity-0 group-hover:animate-card-swipe text-blue-500"/></svg> },
    { id: 4, title: 'Recibís', desc: 'Retiras en el local o te lo enviamos por correo.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-green-500 transition-colors duration-500"><path d="M10 17h4M5 17h0M19 17h0" className="group-hover:stroke-green-600"/><path d="M14 17h1l3-3.26a1.9 1.9 0 0 0 .4-.74V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1" className="group-hover:stroke-green-600"/><circle cx="7" cy="17" r="2" className="group-hover:stroke-green-600"/><circle cx="17" cy="17" r="2" className="group-hover:stroke-green-600"/><path d="m9 11 3 3 6-6" className="opacity-0 group-hover:animate-check-draw text-green-500" strokeWidth="2.5"/></svg> }
  ];

  return (
    <section id="proceso" className="py-16 md:py-24 bg-white dark:bg-slate-900 relative z-10 overflow-hidden transition-colors duration-300">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dropItem { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(5px); } }
        .animate-drop-1 { animation: dropItem 1s ease-in-out infinite; }
        .animate-drop-2 { animation: dropItem 1s ease-in-out infinite 0.2s; }
        .animate-drop-3 { animation: dropItem 1s ease-in-out infinite 0.4s; }
        @keyframes dataLoad { 0% { opacity: 0; stroke-dasharray: 0, 50; } 100% { opacity: 1; stroke-dasharray: 50, 0; } }
        .animate-data-load { animation: dataLoad 1.5s ease-out infinite; stroke-dashoffset: 0; }
        @keyframes cardSwipe { 0% { opacity: 1; transform: translateY(-10px) rotate(-10deg); } 50% { transform: translateY(15px) rotate(5deg); } 100% { opacity: 0; transform: translateY(30px) rotate(10deg); } }
        .animate-card-swipe { animation: cardSwipe 1.2s ease-in-out infinite; }
        @keyframes checkDraw { 0% { opacity: 0; stroke-dasharray: 0, 100; } 100% { opacity: 1; stroke-dasharray: 100, 0; } }
        .animate-check-draw { animation: checkDraw 0.6s ease-out forwards; }
        .group:hover .animate-check-draw { opacity: 1; }
      `}} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-20">
            <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 uppercase tracking-widest">Proceso de Compra</PremiumTitle>
            <div className="w-12 h-1 bg-amber-400 mx-auto my-3 rounded-full"></div>
            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-light mb-6">Cotización inteligente desde la web. Envíos a todo el país.</p>
            <button onClick={() => setTutorialOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-xs md:text-sm rounded-full border border-blue-200 dark:border-slate-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white hover:border-transparent transition-all shadow-sm hover:shadow-lg focus:outline-none group">
              <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Ver Instructivo Paso a Paso
            </button>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 relative">
          <div className="hidden md:block absolute top-[60px] left-[12%] w-[76%] h-[2px] bg-slate-100 dark:bg-slate-800 -z-0 transition-colors"></div>
          {steps.map((step, i) => (
            <RevealOnScroll key={step.id} delay={`md:delay-${i * 100}`}>
              <TiltCard>
                <div className={`flex flex-col items-center text-center relative z-10 group cursor-default p-6 rounded-3xl transition-all duration-300 border border-transparent ${i === 3 ? 'hover:bg-green-50/50 dark:hover:bg-green-950/30 hover:border-green-200 dark:hover:border-green-800 hover:shadow-lg hover:shadow-green-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-100 dark:hover:border-slate-700'}`}>
                  <div className={`w-20 h-20 md:w-24 md:h-24 bg-white dark:bg-slate-900 border-2 rounded-2xl flex items-center justify-center mb-6 md:mb-8 transition-all duration-500 shadow-sm group-hover:shadow-md ${i === 3 ? 'border-slate-200 dark:border-slate-700 group-hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-950' : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-slate-800'}`}>
                    {step.icon}
                  </div>
                  <h4 className={`text-base md:text-lg font-bold mb-2 uppercase tracking-widest font-exo transition-colors duration-300 ${i === 3 ? 'text-slate-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400' : 'text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>{step.title}</h4>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-light px-2 transition-colors">{step.desc}</p>
                  <div className="absolute top-4 right-4 text-3xl font-black font-exo text-slate-100 dark:text-slate-800 group-hover:text-blue-100 dark:group-hover:text-slate-700 transition-colors">{step.id}</div>
                </div>
              </TiltCard>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [formStatus, setFormStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [photo1, setPhoto1] = useState(null); // Foto del repuesto
  const [photo2, setPhoto2] = useState(null); // Foto de la cédula verde / chasis

  // Comprime la imagen en el navegador a ~120KB para no llenar el almacenamiento de Supabase
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const uploadQuotePhoto = async (file, label) => {
    if (!file) return null;
    try {
      const compressedFile = await compressImage(file);
      const filePath = `cotizaciones/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('repuestos')
        .upload(filePath, compressedFile, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error(`Error subiendo ${label}:`, uploadError.message);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('repuestos')
        .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || null;
    } catch (err) {
      console.error('Error al procesar imagen:', err);
      return null;
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('submitting');
    setErrorMsg('');
    const form = e.target;
    
    const nombre = form.nombre.value;
    const telefono = form.telefono.value;
    const repuesto = form.repuesto.value;
    const marca = form.marca.value;
    const modelo = form.modelo.value;
    const anio = form.anio.value;
    const puertas = form.puertas.value;
    const mensaje = form.mensaje.value;

    try {
      // Subimos hasta 2 fotos en paralelo (ya comprimidas)
      const [urlFotoRepuesto, urlFotoCedula] = await Promise.all([
        uploadQuotePhoto(photo1, 'repuesto'),
        uploadQuotePhoto(photo2, 'cedula')
      ]);

      let infoFotosNotas = '';
      if (urlFotoRepuesto) infoFotosNotas += `\nFOTO REPUESTO: ${urlFotoRepuesto}`;
      else if (photo1) infoFotosNotas += `\nFOTO REPUESTO: Seleccionada por el cliente (no se pudo subir al servidor).`;

      if (urlFotoCedula) infoFotosNotas += `\nFOTO CÉDULA / CHASIS: ${urlFotoCedula}`;
      else if (photo2) infoFotosNotas += `\nFOTO CÉDULA / CHASIS: Seleccionada por el cliente (no se pudo subir al servidor).`;

      const { data: newOrderId, error: orderError } = await supabase.rpc('create_web_order', {
        p_customer_name: nombre,
        p_customer_phone: telefono,
        p_status: 'Cotización Web',
        p_total_estimated: 0,
        p_notes: `REPUESTO BUSCADO: ${repuesto}\nVEHÍCULO: ${marca} ${modelo}\nAÑO: ${anio} | PUERTAS: ${puertas}\nOBSERVACIONES: ${mensaje || 'Ninguna'}${infoFotosNotas}`,
        p_items: []
      });

      if (orderError) throw orderError;
      const newOrder = { id: newOrderId };

      // Usamos viñetas limpias (•) en lugar de emojis complejos para evitar el símbolo "" en WhatsApp Web
      let wppText = `¡Hola DAPA Repuestos! Soy ${nombre}.\n\n`;
      wppText += `Estoy buscando cotizar este repuesto por la página web:\n`;
      wppText += `• *Repuesto:* ${repuesto}\n`;
      wppText += `• *Vehículo:* ${marca} ${modelo}\n`;
      wppText += `• *Año:* ${anio} | *Puertas:* ${puertas}\n`;
      if (mensaje) wppText += `• *Notas:* ${mensaje}\n`;

      if (urlFotoRepuesto || urlFotoCedula) {
        wppText += `\n*Fotos adjuntas:*\n`;
        if (urlFotoRepuesto) wppText += `- Foto del repuesto: ${urlFotoRepuesto}\n`;
        if (urlFotoCedula) wppText += `- Foto cédula / chasis: ${urlFotoCedula}\n`;
      } else if (photo1 || photo2) {
        wppText += `\n*Tengo fotos del repuesto / cédula verde para enviarte acá en el chat.*\n`;
      }

      wppText += `\n*(Cotización #${newOrder.id})*`;

      const wppUrl = `${CONTACT_INFO.whatsappLink}?text=${encodeURIComponent(wppText)}`;
      
      setFormStatus('success');
      form.reset();
      setPhoto1(null);
      setPhoto2(null);
      window.open(wppUrl, '_blank');

    } catch (error) {
      console.error(error);
      setErrorMsg("Hubo un problema al guardar la cotización. Por favor intentá de nuevo.");
      setFormStatus('error');
    }
  };

  return (
    <section id="contacto" className="py-16 md:py-24 bg-white dark:bg-slate-900 relative z-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-20">
            <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 uppercase tracking-widest">
              Contactanos! 
            </PremiumTitle>
            <div className="w-12 h-1 bg-amber-400 mx-auto my-3 rounded-full"></div>
            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-light">
              Comunicate por nuestros diferentes medios de comunicación o acercate hasta nuestro local.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-12 md:mb-16">
          <RevealOnScroll delay="delay-0"><a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-green-300 dark:hover:border-green-500 lg:hover:-translate-y-2 transition-all duration-300 group focus:ring-2 focus:ring-green-500 outline-none rounded-2xl h-full"><div className="p-3 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 group-hover:bg-green-50 dark:group-hover:bg-green-500/20 transition-colors animate-soft-pulse"><MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-slate-800 dark:text-slate-300 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" aria-hidden="true" /></div><div><h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest font-exo">WhatsApp</h4><p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-light mt-1">{CONTACT_INFO.phone}</p></div></a></RevealOnScroll>
          <RevealOnScroll delay="md:delay-100"><div className="flex flex-col items-center text-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 lg:hover:-translate-y-2 transition-all duration-300 rounded-2xl h-full group"><div className="p-3 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors animate-soft-pulse" style={{ animationDelay: '0.2s' }}><MapPin className="w-6 h-6 md:w-8 md:h-8 text-slate-800 dark:text-slate-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" aria-hidden="true" /></div><div><h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest font-exo">Dirección</h4><p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-light mt-1">{CONTACT_INFO.address}</p><p className="text-[9px] text-slate-400 dark:text-slate-500">{CONTACT_INFO.city}</p></div></div></RevealOnScroll>
          <RevealOnScroll delay="md:delay-200"><a href={CONTACT_INFO.instagramLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-pink-300 dark:hover:border-pink-500 lg:hover:-translate-y-2 transition-all duration-300 group focus:ring-2 focus:ring-pink-500 outline-none rounded-2xl h-full"><div className="p-3 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 group-hover:bg-pink-50 dark:group-hover:bg-pink-500/20 transition-colors animate-soft-pulse" style={{ animationDelay: '0.4s' }}><CustomInstagram className="w-6 h-6 md:w-8 md:h-8 text-slate-800 dark:text-slate-300 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors" /></div><div><h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest font-exo">Instagram</h4><p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-light mt-1">@autopartesmolle</p></div></a></RevealOnScroll>
          <RevealOnScroll delay="md:delay-300"><a href={CONTACT_INFO.facebookLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 lg:hover:-translate-y-2 transition-all duration-300 group focus:ring-2 focus:ring-blue-500 outline-none rounded-2xl h-full"><div className="p-3 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors animate-soft-pulse" style={{ animationDelay: '0.6s' }}><CustomFacebook className="w-6 h-6 md:w-8 md:h-8 text-slate-800 dark:text-slate-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" /></div><div><h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest font-exo">Facebook</h4><p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-light mt-1">DAPA Molle</p></div></a></RevealOnScroll>
          <RevealOnScroll delay="md:delay-400"><a href={`tel:${CONTACT_INFO.landline.replace(/\s/g, '')}`} className="flex flex-col items-center text-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500 lg:hover:-translate-y-2 transition-all duration-300 group focus:ring-2 focus:ring-cyan-500 outline-none rounded-2xl h-full"><div className="p-3 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/20 transition-colors animate-soft-pulse" style={{ animationDelay: '0.8s' }}><PhoneCall className="w-6 h-6 md:w-8 md:h-8 text-slate-800 dark:text-slate-300 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" aria-hidden="true" /></div><div><h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest font-exo">Tel. Fijo</h4><p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-light mt-1">{CONTACT_INFO.landline}</p></div></a></RevealOnScroll>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <RevealOnScroll delay="md:delay-200">
            <div className="w-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 rounded-2xl transition-colors">
              {formStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-500 py-10">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 md:mb-6"><CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600 dark:text-green-400" aria-hidden="true" /></div>
                  <PremiumTitle dark={true} className="text-xl md:text-2xl font-bold uppercase tracking-widest mb-2 md:mb-4">Solicitud Enviada</PremiumTitle>
                  <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-light mb-6 md:mb-8 max-w-md">Recibimos todos los datos técnicos. A la brevedad uno de nuestros asesores verificará el stock y se comunicará con vos.</p>
                  <button onClick={() => setFormStatus('idle')} className="text-xs md:text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none">Cotizar otro repuesto</button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="flex flex-col space-y-4 md:space-y-5">
                  <div className="text-center md:text-left mb-2">
                    <PremiumTitle dark={true} as="h3" className="text-base md:text-lg font-bold uppercase tracking-wider mb-1">
                      ¿No encontrás tu repuesto? Completá la plantilla y te lo cotizamos por WhatsApp.
                    </PremiumTitle>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><label htmlFor="user_name" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Nombre o Taller</label><input id="user_name" name="nombre" required minLength="3" type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl" placeholder="Ej: Taller Martínez" /></div>
                    <div className="space-y-1"><label htmlFor="user_phone" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Teléfono / WhatsApp</label><input id="user_phone" name="telefono" required minLength="8" type="tel" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl" placeholder="Ej: +54 9 2478..." /></div>
                  </div>
                  <div className="space-y-1"><label htmlFor="tipo_repuesto" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Repuesto Solicitado</label><input id="tipo_repuesto" name="repuesto" required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl" placeholder="Ej: Óptica delantera derecha, Bomba de agua..." /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><label htmlFor="vehiculo" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Marca del Vehículo</label><input id="vehiculo" name="marca" required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl" placeholder="Ej: Volkswagen, Renault..." /></div>
                    <div className="space-y-1"><label htmlFor="modelo" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Modelo</label><input id="modelo" name="modelo" required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl" placeholder="Ej: Amarok, Gol Trend..." /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label htmlFor="anio" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Año</label><input id="anio" name="anio" required type="number" min="1950" max={new Date().getFullYear() + 1} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl" placeholder="Ej: 2018" /></div>
                    <div className="space-y-1"><label htmlFor="puertas" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Puertas</label><select id="puertas" name="puertas" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white rounded-xl appearance-none"><option value="">Elegir...</option><option value="3 Puertas">3 Puertas</option><option value="4 Puertas">4 Puertas</option><option value="5 Puertas">5 Puertas</option><option value="Pick-up / Utilitario">Pick-up / Utilitario</option><option value="Otro">Otro</option></select></div>
                  </div>

                  {/* SELECTOR DE HASTA 2 FOTOS (REPUESTO Y CÉDULA VERDE) */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 block">
                      Adjuntar Fotos (Opcional - Hasta 2 imágenes)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Foto 1: Repuesto */}
                      <div className="relative">
                        <input
                          id="foto_repuesto"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPhoto1(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor="foto_repuesto"
                          className={`flex items-center justify-between gap-2 w-full border-2 border-dashed px-3 py-2.5 transition-colors text-xs font-medium rounded-xl cursor-pointer ${
                            photo1
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:border-blue-400 dark:hover:border-blue-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {photo1 ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <Camera className="w-4 h-4 flex-shrink-0" />}
                            <span className="truncate">{photo1 ? photo1.name : '1. Foto del Repuesto'}</span>
                          </div>
                          {photo1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setPhoto1(null); }}
                              className="text-slate-400 hover:text-red-500 p-0.5"
                              title="Quitar foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </label>
                      </div>

                      {/* Foto 2: Cédula Verde / Chasis */}
                      <div className="relative">
                        <input
                          id="foto_cedula"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPhoto2(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label
                          htmlFor="foto_cedula"
                          className={`flex items-center justify-between gap-2 w-full border-2 border-dashed px-3 py-2.5 transition-colors text-xs font-medium rounded-xl cursor-pointer ${
                            photo2
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:border-blue-400 dark:hover:border-blue-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {photo2 ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <Camera className="w-4 h-4 flex-shrink-0" />}
                            <span className="truncate">{photo2 ? photo2.name : '2. Cédula Verde / Chasis'}</span>
                          </div>
                          {photo2 && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setPhoto2(null); }}
                              className="text-slate-400 hover:text-red-500 p-0.5"
                              title="Quitar foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1"><label htmlFor="user_message" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Observaciones (Opcional)</label><textarea id="user_message" name="mensaje" maxLength="500" className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white resize-none rounded-xl" placeholder="Ej: Es motor 1.6 de 8 válvulas, naftero..."></textarea></div>
                  <input type="hidden" name="_subject" value="Nueva cotización técnica desde la Web DAPA" />
                  {formStatus === 'error' && <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">{errorMsg}</p>}
                  <button type="submit" disabled={formStatus === 'submitting'} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-3 md:py-4 text-xs md:text-sm transition-colors flex items-center justify-center gap-2 md:gap-3 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-xl">
                    {formStatus === 'submitting' ? <span className="flex items-center gap-2">Subiendo datos y fotos... <Settings className="w-3 h-3 md:w-4 md:h-4 animate-spin" aria-hidden="true" /></span> : <span className="flex items-center gap-2">Solicitar Cotización <Send className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /></span>}
                  </button>
                </form>
              )}
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay="md:delay-400">
            <div className="w-full h-full min-h-[400px] shadow-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative overflow-hidden rounded-2xl transition-colors">
              <iframe src="https://maps.google.com/maps?q=Lamadrid%2065,%20Arrecifes,%20Buenos%20Aires&t=&z=16&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style={{ border: 0, position: 'absolute', top: 0, left: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Mapa de Ubicación D.A.P.A Repuestos Molle" className="grayscale lg:hover:grayscale-0 transition-all duration-700"></iframe>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function Footer({ navigateTo }) {
  return (
    <footer className="bg-[#0b1120] text-slate-400 pt-24 pb-16 md:pt-32 md:pb-16 relative z-10 overflow-hidden">
      {/* Divisor diagonal superior desde la sección anterior */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-20 -mt-[1px]">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-10 sm:h-14 md:h-20 block">
          <polygon points="0,0 1440,0 0,72" className="fill-white dark:fill-slate-900 transition-colors duration-300" />
          <polygon points="0,70 1440,0 1440,8 0,78" className="fill-blue-600/80" />
        </svg>
      </div>

      {/* Detalle geométrico decorativo en esquina superior derecha */}
      <div className="hidden md:block absolute top-8 right-8 w-8 h-8 bg-amber-400/90 pointer-events-none z-20" style={{ clipPath: 'polygon(100% 0, 0 20%, 75% 100%)' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 items-start relative z-10">
        <div className="text-center md:text-left flex flex-col items-center md:items-start">
          <span className="font-bold text-3xl tracking-tighter text-white font-michroma block mb-4">D.A.P.A</span>
          <p className="text-sm font-light text-slate-400 mb-6 max-w-xs mx-auto md:mx-0">El catálogo más completo de autopartes en Arrecifes. Envíos garantizados a todo el país.</p>
          <div className="flex gap-4">
            <a href={CONTACT_INFO.instagramLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800/50 border border-slate-700 rounded-full hover:bg-pink-600 hover:text-white hover:border-pink-500 transition-all"><CustomInstagram className="w-5 h-5" /></a>
            <a href={CONTACT_INFO.facebookLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800/50 border border-slate-700 rounded-full hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all"><CustomFacebook className="w-5 h-5" /></a>
          </div>
        </div>
        <div className="text-center md:text-left">
          <h4 className="text-white font-bold uppercase tracking-widest mb-6 font-exo">Enlaces Rápidos</h4>
          <div className="flex flex-col gap-4 text-sm font-light">
            <button onClick={() => navigateTo('inicio', 'inicio')} className="hover:text-white transition-colors focus:outline-none w-fit mx-auto md:mx-0">Inicio</button>
            <button onClick={() => navigateTo('inicio', 'catálogo')} className="hover:text-white transition-colors focus:outline-none w-fit mx-auto md:mx-0">Catálogo Completo</button>
            <button onClick={() => navigateTo('inicio', 'contacto')} className="hover:text-white transition-colors focus:outline-none w-fit mx-auto md:mx-0">Cotización y Contacto</button>
            <button onClick={() => navigateTo('nosotros')} className="hover:text-white transition-colors focus:outline-none w-fit mx-auto md:mx-0">Quiénes Somos</button>
          </div>
        </div>
        <div className="text-center md:text-left flex flex-col items-center md:items-start">
          <h4 className="text-white font-bold uppercase tracking-widest mb-4 font-exo">Medios de Pago</h4>
          <p className="text-sm font-light text-slate-400 mb-4 max-w-xs mx-auto md:mx-0">Aceptamos todas las tarjetas, transferencias y billeteras virtuales.</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 flex items-center justify-center shadow-sm" title="Tarjetas de Crédito y Débito"><CreditCard className="w-6 h-6" /></div>
            <div className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 flex items-center justify-center text-[10px] font-bold tracking-wider uppercase shadow-sm">Transferencia</div>
            <div className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 flex items-center justify-center text-[10px] font-bold tracking-wider uppercase shadow-sm">Mercado Pago</div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800/50 text-center text-xs font-light text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <p>© {new Date().getFullYear()} D.A.P.A Repuestos Molle. Todos los derechos reservados.</p>
        <p>Arrecifes, Buenos Aires, Argentina</p>
        <p>autopartesmolle@gmail.com</p>
      </div>
    </footer>
  );
}

function AboutSection() {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative z-10 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <RevealOnScroll className="order-2 lg:order-1">
            <TiltCard>
              <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden shadow-xl group rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
                <img
                  src="/local-dapa.jpg"
                  alt="Instalaciones de D.A.P.A Repuestos Molle en Lamadrid 65, Arrecifes"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                {/* Degradado inferior sutil con pie de foto */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="absolute bottom-4 left-5 right-4 flex items-center justify-between text-white z-10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 block font-exo">
                      Nuestra Casa Central
                    </span>
                    <p className="text-xs md:text-sm font-bold tracking-wider uppercase">
                      Lamadrid 65 • Arrecifes
                    </p>
                  </div>
                </div>
                {/* Borde lateral azul característico */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 group-hover:w-2.5 transition-all duration-500 z-10"></div>
              </div>
            </TiltCard>
          </RevealOnScroll>
          <RevealOnScroll className="order-1 lg:order-2" delay="md:delay-200">
            <div className="mb-6 md:mb-8 text-center lg:text-left">
              <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-xs mb-2 block font-exo transition-colors">Historia y Respaldo</span>
              <PremiumTitle dark={true} className="text-3xl md:text-4xl lg:text-5xl font-bold font-exo uppercase tracking-tight">Quiénes Somos</PremiumTitle>
              <div className="w-16 h-1.5 bg-amber-400 mx-auto lg:mx-0 mt-3 -skew-x-12 rounded-sm"></div>
            </div>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-4 md:mb-6 leading-relaxed font-light text-center lg:text-left transition-colors">Ubicados en el corazón de Arrecifes, <strong className="text-slate-900 dark:text-white font-semibold">D.A.P.A Repuestos Molle</strong> nació con una premisa clara: brindar soluciones rápidas y efectivas a cada conductor y taller mecánico que nos elige.</p>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-8 md:mb-10 leading-relaxed font-light text-center lg:text-left transition-colors">Nos especializamos en la comercialización de autopartes y accesorios multimarcas, con mas de 50 años de experiencia en el mercado.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="flex items-start gap-4 hover:-translate-y-1 transition-transform cursor-default justify-center lg:justify-start group">
                <div className="mt-1 bg-white dark:bg-slate-800 p-2 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors"><ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" /></div>
                <div className="text-left"><h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Garantía</h4><p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-light transition-colors">Originales y alternativos homologados.</p></div>
              </div>
              <div className="flex items-start gap-4 hover:-translate-y-1 transition-transform cursor-default justify-center lg:justify-start group">
                <div className="mt-1 bg-white dark:bg-slate-800 p-2 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors"><Truck className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" /></div>
                <div className="text-left"><h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs md:text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Logística</h4><p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-light transition-colors">Despachos rápidos a todo el país.</p></div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function MissionVisionSection() {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-white dark:bg-slate-900 relative z-10 transition-colors duration-300 overflow-hidden">
      {/* Divisor diagonal superior desde AboutSection */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-20 -mt-[1px]">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-10 sm:h-14 md:h-20 block">
          <polygon points="0,0 1440,0 1440,72" className="fill-slate-50 dark:fill-slate-950 transition-colors duration-300" />
          <polygon points="0,0 1440,70 1440,78 0,6" className="fill-blue-600/70" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {[
            { icon: Target, desc: "Buscamos proveer repuestos y accesorios automotores de la más alta calidad, asegurando un servicio de asesoramiento técnico preciso y confiable para cada uno de nuestros clientes." },
            { icon: TrendingUp, desc: "Trabajamos día a día con el firme propósito de ser el distribuidor líder de autopartes en Arrecifes, proyectándonos a nivel nacional como un referente de trayectoria e innovación constante." },
            { icon: ShieldCheck, desc: "Nos comprometemos a ampliar permanentemente nuestro catálogo multimarcas, optimizar la logística de envíos a todo el país y sostener una atención profesional de excelencia en cada consulta." }
          ].map((item, i) => (
            <RevealOnScroll key={i} delay={`md:delay-${(i * 200) + 100}`}>
              <TiltCard className="h-full">
                <div className="relative h-full group text-center md:text-left bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600 transition-all duration-300">
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 group-hover:bg-blue-50 dark:group-hover:bg-slate-700 transition-colors"><item.icon className="w-7 h-7 text-slate-700 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" aria-hidden="true" /></div>
                    <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-light transition-colors">{item.desc}</p>
                  </div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent to-slate-100 dark:to-slate-900/50 rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </TiltCard>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section
      id="faq"
      className="py-28 md:py-36 relative z-10 text-white transition-colors duration-300 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d2d6c 0%, #1545a3 50%, #0a2252 100%)' }}
    >
      {/* Divisor diagonal superior (bajada de izquierda a derecha como en la imagen de referencia) */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-20 -mt-[1px]">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-10 sm:h-14 md:h-24 block">
          <polygon points="0,0 1440,0 1440,90" className="fill-white dark:fill-slate-900 transition-colors duration-300" />
        </svg>
      </div>

      {/* Triángulo amarillo en esquina superior izquierda sobre el corte diagonal */}
      <div className="hidden md:block absolute top-4 left-0 w-24 h-16 bg-amber-400 pointer-events-none z-20 shadow-md" style={{ clipPath: 'polygon(0 0, 100% 35%, 0 100%)' }}></div>
      {/* Triángulo flotante amarillo en sector derecho */}
      <div className="hidden md:block absolute top-24 right-12 w-10 h-10 bg-amber-400 pointer-events-none z-20 drop-shadow-md" style={{ clipPath: 'polygon(0 25%, 100% 0, 65% 100%)' }}></div>

      {/* Bandas diagonales decorativas de fondo */}
      <div className="hidden lg:block absolute inset-y-0 left-8 w-32 bg-white/[0.03] -skew-x-12 pointer-events-none"></div>
      <div className="hidden lg:block absolute inset-y-0 right-16 w-44 bg-blue-400/[0.06] -skew-x-12 pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealOnScroll>
          <div className="text-center mb-10 md:mb-16">
            <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-amber-400 bg-white/10 rounded-full p-2 mx-auto mb-4 md:mb-6" aria-hidden="true" />
            <PremiumTitle dark={false} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 uppercase tracking-widest">
              Preguntas Frecuentes
            </PremiumTitle>
            <div className="w-16 h-1.5 bg-amber-400 mx-auto mt-3 -skew-x-12 rounded-sm"></div>
          </div>
        </RevealOnScroll>
        <div className="space-y-4 md:space-y-6">
          {FAQ_ITEMS.map((faq, i) => (
            <RevealOnScroll key={i} delay={`delay-${(i % 3) * 100}`}>
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                openFaq === i
                  ? 'border-amber-400 shadow-xl bg-white text-slate-900'
                  : 'border-white/20 hover:border-white/50 bg-white/10 backdrop-blur-sm text-white'
              }`}>
                <button
                  className="w-full p-5 md:p-6 flex justify-between items-center text-left transition-colors focus:outline-none"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <h4 className={`text-sm md:text-base lg:text-lg font-bold uppercase tracking-wide font-exo pr-4 ${
                    openFaq === i ? 'text-blue-700' : 'text-white'
                  }`}>
                    {faq.q}
                  </h4>
                  <div className={`p-2 rounded-full transition-colors ${openFaq === i ? 'bg-blue-100' : 'bg-white/10'}`}>
                    <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 flex-shrink-0 ${
                      openFaq === i ? 'rotate-180 text-blue-600' : 'text-white'
                    }`} aria-hidden="true" />
                  </div>
                </button>
                <div
                  className="transition-all duration-500 ease-in-out overflow-hidden"
                  style={{ maxHeight: openFaq === i ? '250px' : '0', opacity: openFaq === i ? 1 : 0 }}
                  aria-hidden={openFaq !== i}
                >
                  <p className={`px-5 md:px-6 pb-5 md:pb-6 text-xs md:text-base font-light leading-relaxed ${
                    openFaq === i ? 'text-slate-600' : 'text-slate-200'
                  }`}>
                    {faq.a}
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>

      {/* Cuña amarilla decorativa en esquina inferior derecha */}
      <div className="hidden md:block absolute bottom-3 right-0 w-36 h-12 bg-amber-400 pointer-events-none z-20" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}></div>

      {/* Divisor diagonal inferior (subida hacia ContactSection) */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none z-20 -mb-[1px]">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-10 sm:h-14 md:h-24 block">
          <polygon points="0,0 0,90 1440,90" className="fill-white dark:fill-slate-900 transition-colors duration-300" />
        </svg>
      </div>
    </section>
  );
}

/* ==========================================================================
   COMPONENTE PRINCIPAL (Tienda Pública)
   ========================================================================== */
function TiendaPublica() {
  const [activePage, setActivePage] = useState('inicio');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickViewData, setQuickViewData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isTutorialOpen, setTutorialOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [dbCategories, setDbCategories] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  // Mensajes dinámicos en la pestaña del navegador cuando el usuario cambia de pestaña
  useEffect(() => {
    const defaultTitle = 'D.A.P.A. Repuestos | Catálogo Automotor';
    const awayMessages = [
      '¡Volvé! Tu repuesto te espera 🔧',
      '¡No te vayas! 🚗 D.A.P.A. Repuestos',
      '¿Olvidaste algo en el catálogo? ⚡'
    ];
    let intervalId = null;
    let msgIndex = 0;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        msgIndex = 0;
        document.title = awayMessages[msgIndex];
        intervalId = setInterval(() => {
          msgIndex = (msgIndex + 1) % awayMessages.length;
          document.title = awayMessages[msgIndex];
        }, 2200);
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        document.title = defaultTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
      document.title = defaultTitle;
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('dapa_user');
    const savedCart = localStorage.getItem('dapa_cart');
    const savedTheme = localStorage.getItem('dapa_theme');
    
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedCart) setCart(JSON.parse(savedCart));

    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Detectar retorno desde Mercado Pago
    const urlParams = new URLSearchParams(window.location.search);
    const mpStatus = urlParams.get('mp_status') || urlParams.get('status') || urlParams.get('collection_status');
    if (mpStatus) {
      if (mpStatus === 'approved') {
        setCart([]);
        localStorage.removeItem('dapa_cart');
        setTimeout(() => showToast('¡Pago acreditado con éxito! Ya registramos tu pedido.'), 400);
      } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
        setTimeout(() => showToast('Tu pago está pendiente de acreditación.'), 400);
      } else if (mpStatus === 'failure' || mpStatus === 'rejected') {
        setTimeout(() => showToast('El pago no pudo completarse. Podés intentar nuevamente.'), 400);
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData = {
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
          phone: session.user.user_metadata?.phone || '',
          email: session.user.email
        };
        setCurrentUser(userData);
        localStorage.setItem('dapa_user', JSON.stringify(userData));
      }
    });

    const fetchSupabaseData = async () => {
      setIsLoadingData(true);
      try {
        const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true);
        if (cats) setDbCategories(cats);

        let allProds = [];
        let from = 0;
        const step = 1000;
        while (true) {
          const { data: batch, error } = await supabase
            .from('products')
            .select(`*, brand:brands(name), category:categories(name)`)
            .eq('is_active', true)
            .range(from, from + step - 1);

          if (error) throw error;
          if (!batch || batch.length === 0) break;
          allProds = [...allProds, ...batch];
          if (batch.length < step) break;
          from += step;
        }
        setDbProducts(allProds);

        // Soporte para abrir links directos compartidos (#categoria-ID, #producto-SKU, #nosotros)
        const hash = decodeURIComponent(window.location.hash || '');
        if (hash === '#nosotros') {
          setActivePage('nosotros');
        } else if (hash.startsWith('#categoria-') && cats) {
          const catId = Number(hash.replace('#categoria-', ''));
          const foundCat = cats.find(c => c.id === catId);
          if (foundCat) {
            setSelectedCategory(foundCat);
            setActivePage('categoria');
          }
        } else if (hash.startsWith('#producto-') && cats && allProds.length > 0) {
          const sku = hash.replace('#producto-', '');
          const foundProd = allProds.find(p => p.sku_code === sku);
          if (foundProd) {
            const foundCat = cats.find(c => c.id === foundProd.category_id);
            if (foundCat) {
              setSelectedCategory(foundCat);
              setSelectedProduct(foundProd);
              setActivePage('categoria');
            }
          }
        }
      } catch (err) {
        console.error("Error cargando datos de Supabase", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchSupabaseData();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (!state || state.page === 'inicio') {
        setActivePage('inicio');
        setSelectedCategory(null);
        setSelectedProduct(null);
      } else if (state.page === 'nosotros') {
        setActivePage('nosotros');
      } else if (state.page === 'categoria' && state.category) {
        setSelectedCategory(state.category);
        setSelectedProduct(state.product || null);
        setActivePage('categoria');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dapa_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dapa_theme', 'light');
      }
      return newVal;
    });
  };

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('dapa_user', JSON.stringify(userData));
    setAuthModalOpen(false);
    showToast(`¡Bienvenido, ${userData.name}!`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCart([]);
    localStorage.removeItem('dapa_user');
    localStorage.removeItem('dapa_cart');
    showToast("Sesión cerrada");
  };

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('dapa_cart', JSON.stringify(newCart));
  };

const handleAddToCart = (product, qty = 1) => {
  const amount = Math.max(1, Number(qty) || 1);
  const existingItem = cart.find(item => item.product.sku_code === product.sku_code);
  if (existingItem) {
    const newCart = cart.map(item => 
      item.product.sku_code === product.sku_code 
        ? { ...item, quantity: item.quantity + amount } 
        : item
    );
    saveCart(newCart);
  } else {
    saveCart([...cart, { product, quantity: amount }]);
  }
  showToast("Repuesto agregado al carrito");
  setQuickViewData(null); 
};

  const updateQuantity = (sku_code, delta) => {
    const newCart = cart.map(item => {
      if (item.product.sku_code === sku_code) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    });
    saveCart(newCart);
  };

  const removeItem = (sku_code) => {
    saveCart(cart.filter(item => item.product.sku_code !== sku_code));
  };

  const navigateTo = (page, sectionId = null) => {
    if (activePage !== page) {
      setActivePage(page);
      window.history.pushState({ page }, '', page === 'nosotros' ? '#nosotros' : '/');
    }
    if (page === 'inicio') {
      setSelectedCategory(null);
      setSelectedProduct(null);
    }
    
    if (!sectionId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const handleOpenCategory = (category) => {
    setSelectedCategory(category);
    setSelectedProduct(null); 
    setActivePage('categoria');
    window.history.pushState({ page: 'categoria', category }, '', `#categoria-${category.id}`);
  };

  const handleProductSearchSelect = (product) => {
    const categoryInfo = dbCategories.find(cat => cat.id === product.category_id);
    if (categoryInfo) {
      setSelectedCategory(categoryInfo);
      setSelectedProduct(product);
      setActivePage('categoria');
      window.history.pushState({ page: 'categoria', category: categoryInfo, product }, '', `#producto-${product.sku_code}`);
    }
  };

  const openQuickView = (product, categoryName) => {
    setQuickViewData({ product, categoryName });
  };

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-montserrat text-slate-800 dark:text-slate-100 overflow-x-hidden selection:bg-slate-900 dark:selection:bg-white selection:text-cyan-400 dark:selection:text-slate-900 relative transition-colors duration-300">
      <GlobalStyles />
      <ProgressBarComponent />
      
      {!isCartOpen && !quickViewData && !isTutorialOpen && <FloatingActions />}
      
      <Toast message={toastMessage} isVisible={!!toastMessage} />
      
      <Navbar 
        activePage={activePage} 
        navigateTo={navigateTo} 
        currentUser={currentUser}
        cartCount={cartTotalItems}
        onOpenCart={() => setCartOpen(true)}
        onLogout={handleLogout}
        toggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
        categories={dbCategories}
        allProducts={dbProducts}
        onOpenCategory={handleOpenCategory}
        onProductSearchSelect={handleProductSearchSelect}
        onLoginClick={() => setAuthModalOpen(true)} 
      />
      
      <main>
       {activePage === 'inicio' ? (
          <>
            <HeroSection navigateTo={navigateTo} />
            <CatalogSection categories={dbCategories} allProducts={dbProducts} onOpenCategory={handleOpenCategory} onProductSearchSelect={handleProductSearchSelect} />
            <MediaShowcaseSection navigateTo={navigateTo} />
            <ProcessSection setTutorialOpen={setTutorialOpen} />
            <FAQSection />
            <ContactSection />
          </>
        ) : activePage === 'categoria' && selectedCategory ? (
          <div className="animate-in fade-in duration-700">
            <CategoryDetailSection 
              category={selectedCategory}
              allProducts={dbProducts} 
              selectedProduct={selectedProduct}
              onBack={() => navigateTo('inicio', 'catálogo')} 
              onAddToCart={handleAddToCart}
              onQuickView={openQuickView}
              onShowToast={showToast}
            />
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            <AboutSection />
            <MissionVisionSection />
          </div>
        )}
      </main>

      <Footer navigateTo={navigateTo} />

      <QuickViewModal 
        isOpen={!!quickViewData} 
        product={quickViewData?.product}
        categoryName={quickViewData?.categoryName}
        onClose={() => setQuickViewData(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        currentUser={currentUser}
        clearCart={() => { setCart([]); localStorage.removeItem('dapa_cart'); }}
      />

      <HowToBuyTutorial 
        isOpen={isTutorialOpen} 
        onClose={() => setTutorialOpen(false)} 
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onLogin={handleLogin}
      />

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TiendaPublica />} />
        <Route 
          path="/admin" 
          element={
            <Suspense fallback={
              <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-exo font-semibold text-sm tracking-widest uppercase">Cargando Panel de Administración...</p>
              </div>
            }>
              <AdminPanel />
            </Suspense>
          } 
        />
      </Routes>
    </Router>
  );
}