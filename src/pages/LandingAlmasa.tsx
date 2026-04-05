import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Truck, Shield, Clock, MapPin, Phone, Mail, ChevronRight,
  Package, Users, Star, ArrowRight, Menu, X, CheckCircle,
  Zap, Award, TrendingUp, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== DATA ====================

const CATEGORIAS = [
  {
    nombre: "Botanas y Frutos Secos",
    descripcion: "Almendras, nueces, semillas, ciruela pasa, cacahuate y más",
    imagen: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&q=80",
    color: "from-amber-600 to-orange-700",
  },
  {
    nombre: "Granos y Semillas",
    descripcion: "Arroz, ajonjolí, frijol, lentejas, maíz y más variedades",
    imagen: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
    color: "from-emerald-600 to-green-700",
  },
  {
    nombre: "Azúcar y Endulzantes",
    descripcion: "Azúcar estándar, refinada, glas y más presentaciones",
    imagen: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80",
    color: "from-sky-600 to-blue-700",
  },
  {
    nombre: "Frutas Deshidratadas",
    descripcion: "Piña, durazno, cóctel, arándano, mango y más",
    imagen: "https://images.unsplash.com/photo-1604085572504-a392541cb8d9?w=600&q=80",
    color: "from-rose-600 to-red-700",
  },
];

const STATS = [
  { numero: "120+", label: "Años de experiencia", icono: Award },
  { numero: "500+", label: "Clientes activos", icono: Users },
  { numero: "200+", label: "Productos disponibles", icono: Package },
  { numero: "5", label: "Estados de cobertura", icono: MapPin },
];

const VENTAJAS = [
  {
    icono: Truck,
    titulo: "Entrega sin costo",
    descripcion: "Surtimos tu negocio a domicilio sin costo de envío en toda nuestra zona de cobertura.",
  },
  {
    icono: Shield,
    titulo: "Calidad garantizada",
    descripcion: "Productos seleccionados con los más altos estándares de calidad y frescura.",
  },
  {
    icono: Clock,
    titulo: "Entregas puntuales",
    descripcion: "Rutas optimizadas para que recibas tu pedido en el día y hora acordados.",
  },
  {
    icono: TrendingUp,
    titulo: "Precios competitivos",
    descripcion: "Directo del proveedor a tu negocio. Sin intermediarios, mejores precios.",
  },
];

const COBERTURA = [
  "Ciudad de México",
  "Estado de México",
  "Toluca",
  "Puebla",
  "Querétaro",
  "Morelos",
];

const TESTIMONIOS = [
  { nombre: "Roberto M.", negocio: "Tienda de abarrotes, CDMX", texto: "Llevamos 8 años trabajando con ALMASA. La puntualidad y calidad de sus productos no tiene comparación." },
  { nombre: "María Elena G.", negocio: "Mercado La Merced", texto: "Desde que cambiamos a ALMASA nuestras ventas de botanas subieron un 30%. El producto siempre fresco." },
  { nombre: "Carlos P.", negocio: "Distribuidora León, Querétaro", texto: "Excelente servicio. El equipo de ventas siempre atento y los precios muy competitivos." },
];

// ==================== COMPONENT ====================

const LandingAlmasa = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonio, setActiveTestimonio] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonio((prev) => (prev + 1) % TESTIMONIOS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 antialiased">

      {/* ==================== NAVBAR ==================== */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100"
          : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-lg shadow-red-900/20">
                <span className="text-white font-bold text-lg sm:text-xl tracking-tight">A</span>
              </div>
              <div className="hidden sm:block">
                <p className={cn("font-bold text-lg tracking-tight", scrolled ? "text-slate-900" : "text-white")}>ALMASA</p>
                <p className={cn("text-[10px] -mt-1 tracking-wide", scrolled ? "text-slate-500" : "text-white/70")}>ABARROTES LA MANITA</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {["nosotros", "catalogo", "cobertura", "contacto"].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className={cn(
                    "text-sm font-medium capitalize cursor-pointer transition-colors duration-200",
                    scrolled ? "text-slate-600 hover:text-red-700" : "text-white/80 hover:text-white"
                  )}
                >
                  {item}
                </button>
              ))}
              <Link
                to="/auth"
                className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-red-700/25 hover:shadow-red-700/40 cursor-pointer"
              >
                Portal ERP
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn("md:hidden p-2 rounded-lg cursor-pointer", scrolled ? "text-slate-900" : "text-white")}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
            <div className="px-4 py-4 space-y-1">
              {["nosotros", "catalogo", "cobertura", "contacto"].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg capitalize cursor-pointer"
                >
                  {item}
                </button>
              ))}
              <Link
                to="/auth"
                className="block w-full text-center mt-3 bg-red-700 text-white text-sm font-semibold px-5 py-3 rounded-lg cursor-pointer"
              >
                Portal ERP
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900" />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
          <div className="max-w-3xl">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/90 font-medium">Trabajando por un México mejor</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
              Surtimos tu{" "}
              <span className="relative">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                  negocio
                </span>
              </span>
              <br />
              a domicilio
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed">
              Más de 120 años distribuyendo abarrotes al mayoreo en México.
              Botanas, granos, semillas, azúcar y mucho más, directo a tu puerta.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <button
                onClick={() => scrollToSection("catalogo")}
                className="group inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold text-base px-8 py-4 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-2xl shadow-black/20 cursor-pointer"
              >
                Ver Catálogo
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
              <button
                onClick={() => scrollToSection("contacto")}
                className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white font-semibold text-base px-8 py-4 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                <Phone className="h-5 w-5" />
                Contáctanos
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 mt-12">
              {[
                "Envío sin costo",
                "Calidad certificada",
                "Atención personalizada",
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-white/60 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      {/* ==================== STATS BAR ==================== */}
      <section className="relative -mt-16 z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 mb-3">
                  <stat.icono className="h-6 w-6 text-red-700" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{stat.numero}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== NOSOTROS ==================== */}
      <section id="nosotros" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4">Sobre nosotros</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Empresa mexicana con más de 120 años de tradición
              </h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                En ALMASA nos dedicamos a la distribución de abarrotes al mayoreo,
                ofreciendo una extensa variedad de productos de la más alta calidad.
                Nuestro compromiso es impulsar tu negocio con precios competitivos
                y un servicio de entrega confiable.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Productos seleccionados directamente de proveedores de confianza",
                  "Control de calidad en cada etapa del proceso",
                  "Precios transparentes sin costos ocultos",
                  "Asesoría personalizada para tu negocio",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-2xl shadow-slate-200/50">
                <img
                  src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80"
                  alt="Almacén de abarrotes ALMASA"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-700 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Lo natural,</p>
                    <p className="font-bold text-red-700 text-sm">siempre mejor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CATÁLOGO ==================== */}
      <section id="catalogo" className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4">Nuestro catálogo</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Más de 200 productos para tu negocio
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Desde botanas hasta azúcar, tenemos todo lo que necesitas al mejor precio del mercado.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIAS.map((cat) => (
              <div
                key={cat.nombre}
                className="group relative overflow-hidden rounded-2xl cursor-pointer"
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={cat.imagen}
                    alt={cat.nombre}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-t", cat.color, "opacity-80")} />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="text-xl font-bold text-white mb-2">{cat.nombre}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">{cat.descripcion}</p>
                    <div className="mt-4 flex items-center gap-2 text-white/90 text-sm font-medium group-hover:translate-x-2 transition-transform duration-200">
                      Ver productos <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== VENTAJAS ==================== */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4">Por qué elegirnos</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Listos para impulsar tu negocio
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {VENTAJAS.map((v) => (
              <div key={v.titulo} className="group p-6 rounded-2xl border border-slate-100 hover:border-red-100 hover:bg-red-50/30 transition-all duration-300 cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-5 group-hover:bg-red-700 transition-colors duration-300 shadow-lg">
                  <v.icono className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{v.titulo}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{v.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIOS ==================== */}
      <section className="py-24 sm:py-32 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4">Testimonios</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-16">
            Lo que dicen nuestros clientes
          </h2>

          <div className="relative min-h-[200px]">
            {TESTIMONIOS.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  i === activeTestimonio ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}
              >
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <blockquote className="text-xl sm:text-2xl text-white/90 italic leading-relaxed max-w-2xl mx-auto">
                  "{t.texto}"
                </blockquote>
                <div className="mt-8">
                  <p className="text-white font-semibold">{t.nombre}</p>
                  <p className="text-white/50 text-sm mt-1">{t.negocio}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {TESTIMONIOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonio(i)}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300 cursor-pointer",
                  i === activeTestimonio ? "bg-red-500 w-8" : "bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COBERTURA ==================== */}
      <section id="cobertura" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4">Cobertura</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Entrega a domicilio sin costo
              </h2>
              <p className="mt-6 text-lg text-slate-500 leading-relaxed">
                Nuestra flotilla de transporte cubre las principales zonas del centro de México,
                garantizando entregas puntuales y seguras.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {COBERTURA.map((zona) => (
                  <div key={zona} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <MapPin className="h-5 w-5 text-red-700 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">{zona}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 shadow-2xl shadow-slate-200/50">
                <img
                  src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80"
                  alt="Flota de entrega ALMASA"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-red-700 text-white rounded-2xl p-4 shadow-xl">
                <Zap className="h-8 w-8" />
                <p className="text-xs font-bold mt-1">Entrega<br/>express</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA SECTION ==================== */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-red-700 via-red-800 to-red-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
            Empieza a surtir tu negocio hoy
          </h2>
          <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto">
            Contáctanos y recibe una cotización personalizada. Sin compromisos, sin costos ocultos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="https://wa.me/5255552016"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 bg-white text-red-800 font-bold text-lg px-10 py-5 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-2xl shadow-black/20 cursor-pointer"
            >
              <Phone className="h-6 w-6" />
              Llamar ahora
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a
              href="mailto:1904@almasa.com.mx"
              className="inline-flex items-center gap-3 border-2 border-white/30 text-white font-semibold text-lg px-10 py-5 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer"
            >
              <Mail className="h-6 w-6" />
              Enviar correo
            </a>
          </div>
        </div>
      </section>

      {/* ==================== CONTACTO ==================== */}
      <section id="contacto" className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Info */}
            <div className="lg:col-span-1">
              <p className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4">Contacto</p>
              <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
                Estamos para servirte
              </h2>
              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Dirección</p>
                    <p className="text-sm text-slate-500 mt-1">Melchor Ocampo No. 59, Col. Magdalena Mixiuhca, Venustiano Carranza, C.P. 15850, CDMX</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Teléfono</p>
                    <p className="text-sm text-slate-500 mt-1">55 5552-0168 / 55 5552-7887</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Correo</p>
                    <p className="text-sm text-slate-500 mt-1">1904@almasa.com.mx</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Horario</p>
                    <p className="text-sm text-slate-500 mt-1">Lunes a Viernes: 9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden bg-slate-200 min-h-[400px] shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3763.0!2d-99.1!3d19.4!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI0JzAwLjAiTiA5OcKwMDYnMDAuMCJX!5e0!3m2!1ses!2smx!4v1"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 400 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación ALMASA"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <p className="font-bold text-white">ALMASA</p>
                  <p className="text-[10px] text-slate-500 tracking-wide">ABARROTES LA MANITA</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Empresa mexicana con más de 120 años distribuyendo abarrotes al mayoreo en toda la zona centro del país.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="font-semibold text-white text-sm mb-4">Navegación</p>
              <div className="space-y-3">
                {["Inicio", "Nosotros", "Catálogo", "Contacto"].map((item) => (
                  <button key={item} onClick={() => scrollToSection(item.toLowerCase())} className="block text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="font-semibold text-white text-sm mb-4">Legal</p>
              <div className="space-y-3">
                <Link to="/privacidad" className="block text-sm text-slate-400 hover:text-white transition-colors">Aviso de Privacidad</Link>
                <a href="mailto:1904@almasa.com.mx" className="block text-sm text-slate-400 hover:text-white transition-colors">Soporte</a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-white text-sm mb-4">Contacto</p>
              <div className="space-y-3 text-sm text-slate-400">
                <p>55 5552-0168</p>
                <p>1904@almasa.com.mx</p>
                <p>Lun-Vie 9am-6pm</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Abarrotes la Manita S.A. de C.V. Todos los derechos reservados.
            </p>
            <p className="text-xs text-slate-600">RFC: AMA700701GI8</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingAlmasa;
