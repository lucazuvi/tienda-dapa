import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  MapPin, Phone, Target, ShieldCheck, TrendingUp, Truck, Wrench, ChevronRight,
  Menu, X, MessageSquare, CreditCard, Package, HelpCircle, CheckCircle,
  ChevronDown, Send, Settings, Search, ArrowLeft, ChevronLeft, ShoppingCart,
  User, Plus, Minus, Trash2, LogOut, PhoneCall, ArrowUp, Filter, Sun, Moon, Clock, Camera
} from 'lucide-react';
import { supabase } from './supabase'; // <-- ACÁ CONECTAMOS CON TU NUBE
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPanel from './AdminPanel';

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

const FORMSPREE_URL = "https://formspree.io/f/tu-codigo-aqui"; 

const FAQ_ITEMS = [
  { q: '¿Realizan envíos al interior?', a: 'Sí, despachamos todos los días a cualquier punto de la República Argentina a través de correos y encomiendas.' },
  { q: '¿Qué garantía tienen los repuestos?', a: 'Todos nuestros productos cuentan con la garantía directa de fábrica por defectos de manufactura.' },
  { q: '¿Cómo puedo pagar mi compra?', a: 'Aceptamos transferencias bancarias, Cuenta DNI, Mercado Pago, tarjetas de crédito/débito y efectivo.' },
  { q: '¿Qué datos necesito para cotizar un repuesto?', a: 'Para mayor precisión, te recomendamos enviarnos por WhatsApp la marca, modelo, motor, año del vehículo o el código del repuesto.' }
];

/* ==========================================================================
   HOOKS Y COMPONENTES UI
   ========================================================================== */
function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsIntersecting(true);
    }, { threshold: 0.1, ...options });

    const currentRef = targetRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => currentRef && observer.unobserve(currentRef);
  }, [options]);

  return [targetRef, isIntersecting];
}

function RevealOnScroll({ children, className = "", delay = "delay-0" }) {
  const [ref, isVisible] = useIntersectionObserver();
  return (
    <div ref={ref} className={`transition-all duration-[1000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isVisible ? `opacity-100 translate-y-0 ${delay}` : "opacity-0 translate-y-16"} ${className}`}>
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
function ProductCard({ product, categoryName, onAddToCart, onQuickView, isSelected = false }) {
  const brandName = product.brand?.name || 'Multimarca';
 return (
  <div className="flex flex-col bg-slate-800 rounded-xl border border-slate-700 p-3 h-full shadow-sm hover:border-blue-500 transition-colors">
    {/* Imagen compacta */}
    <div 
      className="aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center mb-3 cursor-pointer overflow-hidden relative group"
      onClick={() => onQuickView && onQuickView(product)}
    >
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <Package className="w-8 h-8 text-slate-600" />
      )}
    </div>

    {/* Info del producto comprimida */}
    <div className="flex-grow flex flex-col">
      {/* Código y Marca */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold">
          {product.sku_code}
        </span>
        {product.brand?.name && (
          <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
            {product.brand.name}
          </span>
        )}
      </div>

      {/* Título (Máximo 2 renglones) */}
      <h3 
        className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2 mb-2 cursor-pointer hover:text-blue-400 transition-colors" 
        title={product.name}
        onClick={() => onQuickView && onQuickView(product)}
      >
        {product.name}
      </h3>

      {/* Precio al fondo */}
      <p className="text-base sm:text-lg font-bold text-white mt-auto">
        ${Number(product.price).toLocaleString('es-AR')}
      </p>
    </div>

    {/* Botón de Agregar más chico */}
    <button 
      onClick={() => onAddToCart && onAddToCart(product)}
      className="mt-3 w-full bg-slate-700/50 hover:bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
    >
      <ShoppingCart className="w-3.5 h-3.5" />
      <span>AGREGAR</span>
    </button>
  </div>
);}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col animate-pulse h-full min-h-[220px]">
       <div className="flex justify-between items-start mb-4">
         <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
         <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
       </div>
       <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
       <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-6 flex-grow"></div>
       <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl mt-auto"></div>
    </div>
  );
}

function QuickViewModal({ product, categoryName, isOpen, onClose, onAddToCart }) {
  if (!isOpen || !product) return null;
  const brandName = product.brand?.name || 'Multimarca';
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none z-20 bg-white/50 dark:bg-slate-900/50 rounded-full p-1 backdrop-blur-sm">
          <X className="w-6 h-6" />
        </button>

        {/* FOTO GRANDE (Mitad izquierda en compu, arriba en celular) */}
        <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-900 h-48 md:h-auto relative flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
           {product.image_url ? (
             <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
           ) : (
             <Package className="w-16 h-16 text-slate-300 dark:text-slate-700" />
           )}
           <span className="absolute bottom-4 left-4 text-xs font-bold tracking-widest uppercase text-white bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 rounded-lg font-exo">Cód: {product.sku_code}</span>
        </div>

        {/* DATOS (Mitad derecha en compu, abajo en celular) */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-tight pr-6">{product.name}</h2>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 mb-6 border border-slate-100 dark:border-slate-700/50">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Settings className="w-3 h-3" /> Ficha Técnica
            </h4>
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-light">Categoría:</span><span>{categoryName}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-light">Marca:</span>
                <span className="text-blue-600 dark:text-blue-400">{brandName}</span>
              </li>
              <li className="flex justify-between pb-1">
                <span className="text-slate-500 dark:text-slate-400 font-light">Disponibilidad:</span>
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3"/> Stock Confirmado
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
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onLogin({ name: formData.get('name'), phone: formData.get('phone') });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none">
          <X className="w-6 h-6" />
        </button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <PremiumTitle dark={true} className="text-2xl font-bold uppercase tracking-widest mb-2">Ingresar Datos</PremiumTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-light">Para poder armar tu carrito de cotización, necesitamos saber quién sos.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="auth_name" className="text-xs font-bold uppercase tracking-widest text-slate-400">Nombre o Taller</label>
            <input id="auth_name" name="name" required minLength="3" type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors text-sm text-slate-800 dark:text-white" placeholder="Ej: Juan Pérez" />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth_phone" className="text-xs font-bold uppercase tracking-widest text-slate-400">Teléfono / WhatsApp</label>
            <input id="auth_phone" name="phone" required minLength="8" type="tel" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors text-sm text-slate-800 dark:text-white" placeholder="Ej: +54 9 2478..." />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors mt-4 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300">
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}

function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeItem, onCheckout, currentUser }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 h-full shadow-2xl relative z-[91] flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-slate-900 dark:text-white" />
            <h3 className="font-bold text-xl uppercase tracking-widest font-exo text-slate-900 dark:text-white">Tu Cotización</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
          {cart.length === 0 ? (
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
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight truncate" title={item.product.name}>{item.product.name}</h4>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mt-1">{item.product.sku_code}</span>
                    
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
                      <button onClick={() => removeItem(item.product.sku_code)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition-colors focus:outline-none ml-auto">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="mb-4 text-xs font-light text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-900 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
            {currentUser ? `Cotización a nombre de: ` : ''}
            {currentUser && <strong className="font-bold text-slate-700 dark:text-slate-200">{currentUser.name}</strong>}
          </div>
          <button 
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-green-300"
          >
            <MessageSquare className="w-5 h-5" /> 
            Enviar por WhatsApp
          </button>
        </div>
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
      @import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,300..800;1,300..800&family=Michroma&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
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
    `}} />
  );
}

function ProgressBarComponent() {
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(totalScroll / windowHeight);
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

/* ==========================================================================
   NAVBAR CON MENÚS DESPLEGABLES Y BÚSQUEDA
   ========================================================================== */
function Navbar({ activePage, navigateTo, currentUser, cartCount, onOpenAuth, onOpenCart, onLogout, toggleDarkMode, isDarkMode, categories, allProducts, onOpenCategory, onProductSearchSelect }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isNavbarSolid = isScrolled || activePage !== 'inicio';

  const handleNavClick = (page, section) => { navigateTo(page, section); setMobileMenuOpen(false); setActiveDropdown(null); };
  const handleCategoryClick = (cat) => { onOpenCategory(cat); setActiveDropdown(null); setMobileMenuOpen(false); };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length > 2) { 
      const lowerValue = value.toLowerCase();
      const filtered = [];
      for (let i = 0; i < allProducts.length; i++) {
        const p = allProducts[i];
        if (p.name.toLowerCase().includes(lowerValue) || p.sku_code.toLowerCase().includes(lowerValue)) {
          filtered.push(p);
          if (filtered.length >= 5) break;
        }
      }
      setSuggestions(filtered); 
    } else { setSuggestions([]); }
  };

  const handleSuggestionClick = (prod) => { setSearchTerm(''); setSuggestions([]); setMobileMenuOpen(false); onProductSearchSelect(prod); };



  return (
    <nav className={`fixed w-full z-[100] transition-all duration-300 ${isNavbarSolid ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm py-4 border-b border-slate-100 dark:border-slate-800" : "bg-transparent py-6"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center gap-4">
        <button onClick={() => handleNavClick('inicio', 'inicio')} className="flex flex-col items-start group text-left focus:outline-none flex-shrink-0">
          <span className={`font-bold text-xl md:text-2xl tracking-tighter font-michroma transition-colors leading-none ${isNavbarSolid ? 'text-slate-900 dark:text-white group-hover:text-blue-600' : 'text-white'}`}>D.A.P.A</span>
          <span className={`text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase font-exo mt-1 transition-colors ${isNavbarSolid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300'}`}>Repuestos Molle</span>
        </button>
        <div className="hidden lg:flex items-center space-x-1">
          <button onClick={() => handleNavClick('inicio', 'inicio')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:text-blue-600 ${isNavbarSolid ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}>Inicio</button>
          <div className="relative group" onMouseEnter={() => setActiveDropdown('catalog')} onMouseLeave={() => setActiveDropdown(null)}>
            <button onClick={() => handleNavClick('inicio', 'catálogo')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all flex items-center gap-1 group-hover:text-blue-600 ${isNavbarSolid ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}>
              Catálogo <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeDropdown === 'catalog' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`absolute top-full left-0 w-64 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-700 p-2 transition-all duration-300 origin-top-left ${activeDropdown === 'catalog' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
              <div className="grid grid-cols-1 gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => handleCategoryClick(cat)} className="w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex justify-between items-center group/item">
                    {cat.name} <ChevronRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0" />
                  </button>
                ))}
                {categories.length === 0 && <div className="text-xs p-4 text-slate-400">Cargando categorías...</div>}
              </div>
            </div>
          </div>
          
          <button onClick={() => handleNavClick('nosotros')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:text-blue-600 ${isNavbarSolid ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}>Nosotros</button>
        </div>
        <div className="flex items-center gap-1 md:gap-3 flex-grow justify-end">
          <div className="hidden lg:block relative mr-2 w-full max-w-[220px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-4 w-4 ${isNavbarSolid ? 'text-slate-400' : 'text-slate-300'}`} />
            </div>
            <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Buscar repuesto..." className={`w-full pl-9 pr-4 py-2 rounded-full text-xs outline-none transition-all ${isNavbarSolid ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900' : 'bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:bg-white/20 focus:border-white'}`} />
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full w-[300px] right-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
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
            <div className="flex items-center gap-1">
              <span className={`hidden sm:block text-[10px] font-bold uppercase tracking-widest mr-1 ${isNavbarSolid ? 'text-slate-500' : 'text-white/80'}`}>{currentUser.name.split(' ')[0]}</span>
              <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"><LogOut className="w-4 h-4 md:w-5 md:h-5" /></button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className={`p-2 rounded-full transition-all ${isNavbarSolid ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}><User className="w-5 h-5" /></button>
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
          <div className="relative w-full mb-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
            <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Buscar repuesto..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900" />
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
            <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-blue-100 dark:border-slate-800">
              {categories.map(cat => (<button key={cat.id} onClick={() => handleCategoryClick(cat)} className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-blue-600">{cat.name}</button>))}
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <button onClick={() => handleNavClick('inicio', 'marcas')} className="text-left text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white mb-4 w-full flex justify-between">Marcas</button>
            <div className="grid grid-cols-3 gap-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
              {mainBrands.map(brand => (<button key={brand} onClick={() => handleNavClick('inicio', 'marcas')} className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900">{brand}</button>))}
            </div>
          </div>
          <button onClick={() => handleNavClick('nosotros')} className="text-left text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-4">Nosotros</button>
        </div>
      )}
    </nav>
  );
}

/* COMPONENTE TEXTO HERO */
function CSSHeroTitle() {
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i, left: `${Math.random() * 100}%`, delay: `${Math.random() * 5}s`, duration: `${Math.random() * 5 + 3}s`
  }));
  return (
    <div className="relative w-full h-[180px] sm:h-[220px] md:h-[280px] mb-6 flex flex-col justify-center items-center md:items-start z-10 pointer-events-none">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (<div key={p.id} className="css-particle shadow-[0_0_10px_rgba(96,165,250,0.8)]" style={{ left: p.left, bottom: '-20px', width: '4px', height: '4px', animationDelay: p.delay, animationDuration: p.duration }} />))}
      </div>
      <h2 className="text-[42px] sm:text-[50px] md:text-[65px] lg:text-[80px] font-black font-exo leading-[1.1] uppercase text-white tracking-tight z-10 text-center md:text-left drop-shadow-lg">
        <span className="inline-block animate-fade-up" style={{ animationDelay: '100ms' }}>TU SOCIO DE</span><br />
        <span className="inline-block animate-fade-up text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ animationDelay: '300ms' }}>CONFIANZA</span><br />
        <span className="inline-block animate-fade-up" style={{ animationDelay: '500ms' }}>EN EL CAMINO.</span>
      </h2>
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="bg-[#0b1120] text-white py-4 shadow-md relative z-20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center md:justify-between items-center gap-4 md:gap-2 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider">
        <span className="flex items-center gap-2"><Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Envíos a todo el país</span>
        <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Garantía de fábrica 100%</span>
        <span className="hidden md:flex items-center gap-2"><Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Soporte rápido por WhatsApp</span>
        <span className="hidden lg:flex items-center gap-2"><CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Todos los medios de pago</span>
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

function CatalogSection({ categories, allProducts, onOpenCategory, onProductSearchSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length > 2) { 
      const lowerValue = value.toLowerCase();
      const filtered = [];
      for (let i = 0; i < allProducts.length; i++) {
        const p = allProducts[i];
        if (p.name.toLowerCase().includes(lowerValue) || p.sku_code.toLowerCase().includes(lowerValue)) {
          filtered.push(p);
          if (filtered.length >= 6) break; 
        }
      }
      setSuggestions(filtered); 
    } else { setSuggestions([]); }
  };

  const handleSuggestionClick = (prod) => { setSearchTerm(''); setSuggestions([]); onProductSearchSelect(prod); };

  return (
    <section id="catálogo" className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50 relative z-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10 md:mb-16 relative z-30">
        <RevealOnScroll>
          <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 uppercase tracking-widest">Nuestro Catálogo</PremiumTitle>
          <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-light">Buscá el repuesto para tu vehículo y agregalo al carrito de cotización.</p>
        </RevealOnScroll>
        <RevealOnScroll delay="md:delay-100">
          <form className="w-full max-w-xl mx-auto mt-6 md:mt-10 mb-6 md:mb-8 relative group" onSubmit={e => e.preventDefault()}>
            <label htmlFor="search" className="sr-only">Buscar repuesto</label>
            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none"><Search className="h-4 w-4 md:h-5 md:w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 transition-colors" aria-hidden="true" /></div>
            <input id="search" type="search" value={searchTerm} onChange={handleSearchChange} className="block w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs md:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-white" placeholder="Buscar por modelo o código (Ej: Hilux, Corsa)..." autoComplete="off" />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 text-left overflow-hidden animate-in slide-in-from-top-2">
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
          {/* GRILLA ESTÁTICA */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat, idx) => (
              <RevealOnScroll key={cat.id} delay={`delay-${(idx % 4) * 100}`}>
                <article 
                  onClick={() => onOpenCategory(cat)} 
                  className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center h-full"
                >
                  <div className="w-12 h-1 bg-slate-200 dark:bg-slate-600 mb-4 group-hover:bg-blue-500 transition-colors rounded-full"></div>
                  <h4 className="text-slate-900 dark:text-white font-bold text-sm md:text-lg uppercase tracking-widest font-exo mb-2 transition-colors">{cat.name}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-light transition-colors line-clamp-2">{cat.description || 'Ver repuestos'}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryDetailSection({ category, allProducts, selectedProduct, onBack, onAddToCart, onQuickView }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('Todas');
  const itemsPerPage = 24;

  // Filtramos la base de datos completa para dejar solo los de esta categoría
  const baseProducts = allProducts.filter(p => p.category_id === category.id);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 400); 
    return () => clearTimeout(timer);
  }, [category.name, selectedBrandFilter]);

  const availableBrands = ['Todas', ...new Set(baseProducts.map(p => p.brand?.name).filter(Boolean))];
  const filteredProducts = selectedBrandFilter === 'Todas' ? baseProducts : baseProducts.filter(p => p.brand?.name === selectedBrandFilter);
  const displayAllProducts = selectedProduct && selectedBrandFilter === 'Todas'
    ? [filteredProducts.find(p => p.sku_code === selectedProduct.sku_code) || selectedProduct, ...filteredProducts.filter(p => p.sku_code !== selectedProduct.sku_code)]
    : filteredProducts;
  const totalPages = Math.ceil(displayAllProducts.length / itemsPerPage);
  const displayProducts = displayAllProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage, category.name]);
  useEffect(() => { setCurrentPage(1); setSelectedBrandFilter('Todas'); }, [category.name, selectedProduct]);

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative z-10 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold uppercase tracking-widest text-xs mb-8 transition-colors focus:outline-none bg-white dark:bg-slate-800 py-2 px-4 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"><ArrowLeft className="w-4 h-4" /> Volver al catálogo</button>
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div><PremiumTitle dark={true} className="text-3xl md:text-5xl font-bold font-exo uppercase tracking-tight mb-2">{category.name}</PremiumTitle><p className="text-slate-500 dark:text-slate-400 font-light text-base md:text-lg transition-colors">{category.description}</p></div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest shadow-sm">{displayAllProducts.length} Resultados</div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-28 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Filtros</h3>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Marca de Vehículo</p>
                <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0">
                  {availableBrands.map(brand => (<button key={brand} onClick={() => { setSelectedBrandFilter(brand); setCurrentPage(1); }} className={`flex-shrink-0 lg:w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedBrandFilter === brand ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'}`}>{brand}</button>))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-grow">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 auto-rows-fr">{Array.from({ length: 24 }).map((_, i) => (<SkeletonCard key={i} />))}</div>
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl">
                <Package className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2 font-exo">Sin Resultados</h4><p className="text-slate-500 dark:text-slate-400">No encontramos repuestos para los filtros seleccionados.</p>
                <button onClick={() => setSelectedBrandFilter('Todas')} className="mt-6 text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-widest border-b border-blue-600 dark:border-blue-400 pb-1">Borrar Filtros</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
                  {displayProducts.map((prod, i) => (<RevealOnScroll key={prod.sku_code + i} delay={`delay-${(i % 3) * 100}`}><ProductCard product={prod} categoryName={category.name} onAddToCart={onAddToCart} onQuickView={onQuickView} isSelected={selectedProduct && selectedProduct.sku_code === prod.sku_code} /></RevealOnScroll>))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 md:gap-4 mt-12 mb-8">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 md:p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all bg-transparent"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex items-center gap-1 md:gap-2 overflow-x-auto max-w-[200px] md:max-w-full no-scrollbar">
                      {Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={`min-w-[40px] h-10 rounded-xl text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'}`}>{i + 1}</button>))}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 md:p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all bg-transparent"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection({ setTutorialOpen }) {
  const steps = [
    { id: 1, title: 'Elegí', desc: 'Agregá los repuestos al carrito.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-blue-600 transition-colors duration-500"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" className="group-hover:stroke-blue-600"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12" className="group-hover:stroke-blue-600"/><circle cx="12" cy="5" r="1" fill="currentColor" className="opacity-0 group-hover:animate-drop-1 text-blue-500"/><circle cx="10" cy="4" r="1" fill="currentColor" className="opacity-0 group-hover:animate-drop-2 text-blue-500"/><circle cx="14" cy="4" r="1" fill="currentColor" className="opacity-0 group-hover:animate-drop-3 text-blue-500"/></svg> },
    { id: 2, title: 'Cotizá', desc: 'Enviá el carrito por WhatsApp.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-green-500 transition-colors duration-500"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" className="group-hover:stroke-green-600"/><path d="M12 18h.01M8 6h8" className="group-hover:stroke-green-600"/><path d="M12 10.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 6c2.5 0 4.5-2 4.5-4.5S14.5 7.5 12 7.5c-2.3 0-4.1 1.7-4.4 3.9-.1.6.4 1.1 1 .9 1.1-.3 2.1 1.1 1.5 2.1-.2.4.1.9.6.9.3 0 .6.2.7.5.1.3.1.6 0 1-.3.8-.4 1.7-.1 2.5.3.8 1.1 1.2 2 1.2z" fill="none" className="opacity-0 group-hover:animate-fade-in text-green-500"/><path d="M8 10h3M8 12h5" className="opacity-0 group-hover:animate-data-load text-slate-300"/></svg> },
    { id: 3, title: 'Pagás', desc: 'Aboná con tu medio de pago favorito.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-blue-500 transition-colors duration-500"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" className="group-hover:stroke-slate-600 dark:group-hover:stroke-slate-500"/><path d="M3 10h18M7 14h10M7 16h6" className="group-hover:stroke-slate-600 dark:group-hover:stroke-slate-500"/><rect x="6" y="6" width="12" height="3" rx="0.5" className="group-hover:fill-green-900 group-hover:stroke-green-500 transition-colors duration-500"/><rect x="8" y="1" width="8" height="5" rx="1" fill="currentColor" className="opacity-0 group-hover:animate-card-swipe text-blue-500"/></svg> },
    { id: 4, title: 'Recibís', desc: 'Te lo enviamos al taller o domicilio.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-green-500 transition-colors duration-500"><path d="M10 17h4M5 17h0M19 17h0" className="group-hover:stroke-green-600"/><path d="M14 17h1l3-3.26a1.9 1.9 0 0 0 .4-.74V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1" className="group-hover:stroke-green-600"/><circle cx="7" cy="17" r="2" className="group-hover:stroke-green-600"/><circle cx="17" cy="17" r="2" className="group-hover:stroke-green-600"/><path d="m9 11 3 3 6-6" className="opacity-0 group-hover:animate-check-draw text-green-500" strokeWidth="2.5"/></svg> }
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
            <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 uppercase tracking-widest">Proceso de Compra</PremiumTitle>
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

function BrandsSection() {
  const brands = [
    { name: 'BOSCH', logo: '/logos/bosch.png' }, { name: 'PHILIPS', logo: '/logos/philips.png' },
    { name: 'OSRAM', logo: '/logos/osram.png' }, { name: 'NGK', logo: '/logos/ngk.png' },
    { name: 'SKF', logo: '/logos/skf.png' }, { name: 'VALEO', logo: '/logos/valeo.png' },
    { name: 'VMG', logo: '/logos/vmg.png' }, { name: 'CALORSTAT', logo: '/logos/calorstat.png' },
    { name: 'IAEL', logo: '/logos/iael.png' }, { name: 'MOTORA', logo: '/logos/motora.png' },
    { name: 'ACCESORIOS TEO', logo: '/logos/accesoriosteo.png' }, { name: 'FRAS-LE', logo: '/logos/fras-le.png' }
  ];

  return (
    <section id="marcas" className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/80 relative z-10 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-10 md:mb-16">
            <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 uppercase tracking-widest">Marcas Principales</PremiumTitle>
            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-light">Calidad original para el máximo rendimiento.</p>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {brands.map((marca, i) => (
            <RevealOnScroll key={marca.name} delay={`delay-${(i % 4) * 100}`}>
              <TiltCard>
                <div className="p-6 md:p-8 bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 group cursor-default h-24 md:h-32">
                  <img src={marca.logo} alt={`Logo de ${marca.name}`} className="max-w-full max-h-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-105" loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  <span className="hidden font-bold text-slate-400 uppercase tracking-widest text-sm text-center leading-tight">{marca.name}</span>
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
  const [fileName, setFileName] = useState(''); 

  const handleFormSubmit = async (e) => {
    e.preventDefault(); setFormStatus('submitting'); setErrorMsg('');
    const form = e.target;
    if (FORMSPREE_URL.includes("tu-codigo-aqui")) {
      setErrorMsg("⚠️ Atención: Debes reemplazar 'tu-codigo-aqui' por tu enlace real de Formspree en el código para recibir los correos.");
      setFormStatus('error'); return;
    }
    const formData = new FormData(form);
    try {
      const response = await fetch(FORMSPREE_URL, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
      if (response.ok) { setFormStatus('success'); form.reset(); setFileName(''); } 
      else {
        const data = await response.json();
        if (Object.hasOwn(data, 'errors')) setErrorMsg(data["errors"].map(error => error["message"]).join(", "));
        else setErrorMsg("Oops! Hubo un problema enviando el formulario.");
        setFormStatus('error');
      }
    } catch (error) { setErrorMsg("Error de red. Por favor intenta nuevamente."); setFormStatus('error'); }
  };

  return (
    <section id="contacto" className="py-16 md:py-24 bg-white dark:bg-slate-900 relative z-10 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-20">
            <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 uppercase tracking-widest">Cotización a Medida</PremiumTitle>
            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-light">Completá los datos técnicos de tu vehículo para mayor precisión.</p>
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
                    <PremiumTitle dark={true} as="h3" className="text-lg md:text-xl font-bold uppercase tracking-widest mb-1">Solicitar Repuesto</PremiumTitle>
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
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Foto de muestra o código (Opcional)</label>
                    <div className="relative w-full">
                      <input id="imagen_repuesto" name="imagen_adjunta" type="file" accept="image/*" onChange={(e) => setFileName(e.target.files[0]?.name || '')} className="hidden" />
                      <label htmlFor="imagen_repuesto" className={`flex items-center justify-center gap-2 w-full border-2 border-dashed px-3 py-3 outline-none transition-colors text-sm font-medium rounded-xl cursor-pointer ${fileName ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:border-blue-400 dark:hover:border-blue-500'}`}>
                        {fileName ? <CheckCircle className="w-5 h-5" /> : <Camera className="w-5 h-5" />}<span className="truncate max-w-[80%]">{fileName || "Tocar aquí para adjuntar foto"}</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1"><label htmlFor="user_message" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Observaciones (Opcional)</label><textarea id="user_message" name="mensaje" maxLength="500" className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-sm text-slate-900 dark:text-white resize-none rounded-xl" placeholder="Ej: Es motor 1.6 de 8 válvulas, naftero..."></textarea></div>
                  <input type="hidden" name="_subject" value="Nueva cotización técnica desde la Web DAPA" />
                  {formStatus === 'error' && <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">{errorMsg}</p>}
                  <button type="submit" disabled={formStatus === 'submitting'} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-3 md:py-4 text-xs md:text-sm transition-colors flex items-center justify-center gap-2 md:gap-3 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-xl">
                    {formStatus === 'submitting' ? <span className="flex items-center gap-2">Enviando Datos <Settings className="w-3 h-3 md:w-4 md:h-4 animate-spin" aria-hidden="true" /></span> : <span className="flex items-center gap-2">Solicitar Cotización <Send className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /></span>}
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
    <footer className="bg-[#0b1120] text-slate-400 py-16 border-t border-slate-800 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
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
            <button onClick={() => navigateTo('inicio', 'marcas')} className="hover:text-white transition-colors focus:outline-none w-fit mx-auto md:mx-0">Nuestras Marcas</button>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800/50 text-center text-xs font-light text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
        <p>© {new Date().getFullYear()} D.A.P.A Repuestos Molle. Todos los derechos reservados.</p>
        <p>Arrecifes, Buenos Aires, Argentina</p>
      </div>
    </footer>
  );
}

function AboutSection() {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative z-10 bg-white dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <RevealOnScroll className="order-2 lg:order-1">
            <TiltCard>
              <div className="relative aspect-[4/3] bg-white dark:bg-slate-800 overflow-hidden shadow-xl group cursor-pointer rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors" aria-hidden="true">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50 dark:bg-slate-900/50 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors duration-500">
                  <Wrench className="w-12 h-12 md:w-16 md:h-16 mb-4 text-slate-300 dark:text-slate-500 group-hover:scale-110 transition-transform duration-500 group-hover:text-blue-400" />
                  <p className="text-xs md:text-sm uppercase tracking-widest font-semibold group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Instalaciones DAPA Molle</p>
                </div>
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 group-hover:w-2 transition-all duration-500"></div>
              </div>
            </TiltCard>
          </RevealOnScroll>
          <RevealOnScroll className="order-1 lg:order-2" delay="md:delay-200">
            <div className="mb-6 md:mb-8 text-center lg:text-left">
              <span className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-xs mb-2 block font-exo transition-colors">Historia y Respaldo</span>
              <PremiumTitle dark={true} className="text-3xl md:text-4xl lg:text-5xl font-bold font-exo uppercase tracking-tight">Quiénes Somos</PremiumTitle>
            </div>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-4 md:mb-6 leading-relaxed font-light text-center lg:text-left transition-colors">Ubicados en el corazón de Arrecifes, <strong className="text-slate-900 dark:text-white font-semibold">D.A.P.A Repuestos Molle</strong> nació con una premisa clara: brindar soluciones rápidas y efectivas a cada conductor y taller mecánico que nos elige.</p>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-8 md:mb-10 leading-relaxed font-light text-center lg:text-left transition-colors">Nos especializamos en la comercialización de autopartes y accesorios multimarcas. Sabemos que un vehículo detenido es un problema, por eso trabajamos con stock permanente y realizamos envíos ágiles a todo el país.</p>
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
    <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50 relative z-10 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {[
            { icon: Target, desc: "Buscamos proveer repuestos y accesorios automotores de la más alta calidad, asegurando un servicio de asesoramiento técnico preciso y confiable para cada uno de nuestros clientes." },
            { icon: TrendingUp, desc: "Trabajamos día a día con el firme propósito de ser el distribuidor líder de autopartes en Arrecifes, proyectándonos a nivel nacional como un referente de trayectoria e innovación constante." },
            { icon: ShieldCheck, desc: "Nos comprometemos a ampliar permanentemente nuestro catálogo multimarcas, optimizar la logística de envíos a todo el país y sostener una atención profesional de excelencia en cada consulta." }
          ].map((item, i) => (
            <RevealOnScroll key={i} delay={`md:delay-${(i * 200) + 100}`}>
              <TiltCard className="h-full">
                <div className="relative h-full group text-center md:text-left bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600 transition-all duration-300">
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-8 mx-auto md:mx-0 group-hover:bg-blue-50 dark:group-hover:bg-slate-700 transition-colors"><item.icon className="w-7 h-7 text-slate-700 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" aria-hidden="true" /></div>
                    <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-light transition-colors">{item.desc}</p>
                  </div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent to-slate-50 dark:to-slate-900/50 rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
    <section id="faq" className="py-16 md:py-24 bg-white dark:bg-slate-900 relative z-10 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-10 md:mb-16">
            <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-blue-100 dark:text-blue-900 bg-blue-50 dark:bg-blue-900/30 rounded-full p-2 mx-auto mb-4 md:mb-6 transition-colors" aria-hidden="true" />
            <PremiumTitle dark={true} className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 uppercase tracking-widest">Preguntas Frecuentes</PremiumTitle>
          </div>
        </RevealOnScroll>
        <div className="space-y-4 md:space-y-6">
          {FAQ_ITEMS.map((faq, i) => (
            <RevealOnScroll key={i} delay={`delay-${(i % 3) * 100}`}>
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${openFaq === i ? 'border-blue-200 dark:border-blue-800 shadow-md bg-blue-50/30 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'}`}>
                <button className="w-full p-5 md:p-6 flex justify-between items-center text-left transition-colors focus:outline-none" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  <h4 className={`text-sm md:text-base lg:text-lg font-bold uppercase tracking-wide font-exo pr-4 transition-colors ${openFaq === i ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>{faq.q}</h4>
                  <div className={`p-2 rounded-full transition-colors ${openFaq === i ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-50 dark:bg-slate-900'}`}><ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-slate-500 dark:text-slate-400 transition-transform duration-300 flex-shrink-0 ${openFaq === i ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} aria-hidden="true" /></div>
                </button>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden`} style={{ maxHeight: openFaq === i ? '250px' : '0', opacity: openFaq === i ? 1 : 0 }} aria-hidden={openFaq !== i}>
                  <p className="px-5 md:px-6 pb-5 md:pb-6 text-xs md:text-base text-slate-600 dark:text-slate-400 font-light leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ==========================================================================
   COMPONENTE PRINCIPAL (App)
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

  // NUEVOS ESTADOS PARA SUPABASE
  const [dbCategories, setDbCategories] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // EFECTO INICIAL (Carga LocalStorage, Tema y Datos de Supabase)
  useEffect(() => {
    const savedUser = localStorage.getItem('dapa_user');
    const savedCart = localStorage.getItem('dapa_cart');
    const savedTheme = localStorage.getItem('dapa_theme');
    
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedCart) setCart(JSON.parse(savedCart));

    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // CARGAMOS LA BASE DE DATOS REAL
    const fetchSupabaseData = async () => {
      setIsLoadingData(true);
      try {
        const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true);
        if (cats) setDbCategories(cats);

        const { data: prods } = await supabase.from('products').select(`
          *,
          brand:brands(name),
          category:categories(name)
        `).eq('is_active', true);
        if (prods) setDbProducts(prods);
      } catch (err) {
        console.error("Error cargando datos de Supabase", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchSupabaseData();
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

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('dapa_user', JSON.stringify(userData));
    setAuthModalOpen(false);
    showToast(`¡Bienvenido, ${userData.name}!`);
  };

  const handleLogout = () => {
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

  const handleAddToCart = (product) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    const existingItem = cart.find(item => item.product.sku_code === product.sku_code);
    if (existingItem) {
      const newCart = cart.map(item => 
        item.product.sku_code === product.sku_code 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
      saveCart(newCart);
    } else {
      saveCart([...cart, { product, quantity: 1 }]);
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
const handleWhatsAppCheckout = async () => {
    if (!currentUser || cart.length === 0) return;

    try {
      // 1. Calculamos el total estimativo de la cotización
      const totalEstimated = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

      // 2. Creamos la cabecera del pedido en Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          customer_name: currentUser.name, 
          customer_phone: currentUser.phone,
          total_estimated: totalEstimated,
          status: 'Pendiente'
        }])
        .select();

      if (orderError) throw orderError;
      
      const newOrderId = orderData[0].id;

      // 3. Guardamos el detalle (qué repuestos pidió)
      const orderItems = cart.map(item => ({
        order_id: newOrderId,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // 4. Armamos el mensaje para WhatsApp (¡Ahora incluye el número de pedido!)
      let text = `¡Hola DAPA Repuestos! Soy *${currentUser.name}*.\n\nAcabo de generar el pedido web *#${newOrderId}*:\n\n`;
      cart.forEach(i => text += `📦 ${i.quantity}x [${i.product.sku_code}] ${i.product.name}\n`);
      text += `\nMi teléfono: ${currentUser.phone}`;
      
      window.open(`${CONTACT_INFO.whatsappLink}?text=${encodeURIComponent(text)}`, '_blank');
      
      // 5. Vaciamos el carrito y cerramos
      setCart([]);
      localStorage.removeItem('dapa_cart');
      setCartOpen(false);
      showToast("¡Cotización generada y enviada!");

    } catch (error) {
      console.error("Error al guardar el pedido:", error);
      showToast("Hubo un error al procesar tu pedido.");
    }
  };

  const navigateTo = (page, sectionId = null) => {
    if (activePage !== page) {
      setActivePage(page);
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
  };

  const handleProductSearchSelect = (product) => {
    const categoryInfo = dbCategories.find(cat => cat.id === product.category_id);
    if (categoryInfo) {
      setSelectedCategory(categoryInfo);
      setSelectedProduct(product);
      setActivePage('categoria');
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
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onLogin={handleLogin} 
      />

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
        onCheckout={handleWhatsAppCheckout}
        currentUser={currentUser}
      />

      <HowToBuyTutorial 
        isOpen={isTutorialOpen} 
        onClose={() => setTutorialOpen(false)} 
      />
      
      <Navbar 
        activePage={activePage} 
        navigateTo={navigateTo} 
        currentUser={currentUser}
        cartCount={cartTotalItems}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenCart={() => setCartOpen(true)}
        onLogout={handleLogout}
        toggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
        categories={dbCategories}
        allProducts={dbProducts}
        onOpenCategory={handleOpenCategory}
        onProductSearchSelect={handleProductSearchSelect} 
      />
      
      <main>
        {activePage === 'inicio' ? (
          <>
            <HeroSection navigateTo={navigateTo} />
            <CatalogSection categories={dbCategories} allProducts={dbProducts} onOpenCategory={handleOpenCategory} onProductSearchSelect={handleProductSearchSelect} />
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
    </div>
  );
}
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta para el cliente (tu código intacto) */}
        <Route path="/" element={<TiendaPublica />} />
        
        {/* Ruta oculta para vos */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}