import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Truck, Shield, Clock, MapPin, Phone, Mail,
  ArrowRight, Menu, X, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoAlmasa from "@/assets/logo-almasa.png";
import logoBlanco from "@/assets/logos/logo-blanco.png";

// ==================== VIDEOS (free stock - Pexels) ====================
const HERO_VIDEOS = [
  {
    url: "https://videos.pexels.com/video-files/5529530/5529530-hd_1920_1080_25fps.mp4",
    label: "Semillas",
  },
  {
    url: "https://videos.pexels.com/video-files/2539108/2539108-hd_1920_1080_30fps.mp4",
    label: "Campo",
  },
  {
    url: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    label: "Abarrotes",
  },
];

const CATEGORIAS = [
  { nombre: "Botanas y Frutos Secos", imagen: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&q=80" },
  { nombre: "Granos y Semillas", imagen: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80" },
  { nombre: "Azúcar y Endulzantes", imagen: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80" },
  { nombre: "Frutas Deshidratadas", imagen: "https://images.unsplash.com/photo-1604085572504-a392541cb8d9?w=600&q=80" },
];

const COBERTURA = ["Ciudad de México", "Estado de México", "Toluca", "Puebla", "Querétaro", "Morelos"];

// ==================== COMPONENT ====================

const LandingAlmasa = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Rotate videos
  const handleVideoEnd = () => {
    setCurrentVideo((prev) => (prev + 1) % HERO_VIDEOS.length);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideo]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">

      {/* ==================== NAVBAR ==================== */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <img
              src={scrolled ? logoAlmasa : logoBlanco}
              alt="ALMASA"
              className="h-8 sm:h-9 transition-all duration-300"
            />

            {/* Desktop */}
            <div className="hidden md:flex items-center gap-10">
              {[
                { label: "Nosotros", id: "nosotros" },
                { label: "Productos", id: "productos" },
                { label: "Cobertura", id: "cobertura" },
                { label: "Contacto", id: "contacto" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "text-[13px] font-medium tracking-wide uppercase cursor-pointer transition-colors duration-200",
                    scrolled ? "text-slate-500 hover:text-slate-900" : "text-white/70 hover:text-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/auth"
                className={cn(
                  "text-[13px] font-semibold tracking-wide px-5 py-2 rounded-full transition-all duration-200 cursor-pointer",
                  scrolled
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                )}
              >
                Acceso ERP
              </Link>
            </div>

            {/* Mobile */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn("md:hidden p-2 cursor-pointer", scrolled ? "text-slate-900" : "text-white")}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t">
            <div className="px-6 py-6 space-y-1">
              {["nosotros", "productos", "cobertura", "contacto"].map((id) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="block w-full text-left py-3 text-sm font-medium text-slate-600 hover:text-slate-900 capitalize cursor-pointer">
                  {id}
                </button>
              ))}
              <Link to="/auth" className="block mt-4 text-center bg-slate-900 text-white text-sm font-semibold py-3 rounded-full cursor-pointer">
                Acceso ERP
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO — VIDEO FULLSCREEN MINIMAL ==================== */}
      <section className="relative h-screen overflow-hidden">
        {/* Video background */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          key={currentVideo}
        >
          <source src={HERO_VIDEOS[currentVideo].url} type="video/mp4" />
        </video>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content — centered minimal */}
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <img
            src={logoBlanco}
            alt="ALMASA"
            className="h-14 sm:h-20 mb-10 opacity-95"
          />

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-light text-white tracking-tight leading-[1.15] max-w-3xl">
            Surtimos tu negocio
            <br />
            <span className="font-semibold">a domicilio</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/60 font-light max-w-lg leading-relaxed">
            Distribuidora de abarrotes al mayoreo con más de 120 años en México.
          </p>

          {/* Minimal CTAs */}
          <div className="flex items-center gap-6 mt-10">
            <button
              onClick={() => scrollTo("productos")}
              className="group flex items-center gap-2 bg-white text-slate-900 font-medium text-sm px-7 py-3.5 rounded-full hover:bg-slate-50 transition-all duration-200 cursor-pointer"
            >
              Ver productos
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
            <button
              onClick={() => scrollTo("contacto")}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors duration-200 cursor-pointer"
            >
              Contacto
            </button>
          </div>

          {/* Video indicators */}
          <div className="absolute bottom-20 flex gap-2">
            {HERO_VIDEOS.map((v, i) => (
              <button
                key={i}
                onClick={() => setCurrentVideo(i)}
                className={cn(
                  "h-[2px] rounded-full transition-all duration-500 cursor-pointer",
                  i === currentVideo ? "w-10 bg-white" : "w-5 bg-white/30"
                )}
              />
            ))}
          </div>

          {/* Scroll hint */}
          <button
            onClick={() => scrollTo("nosotros")}
            className="absolute bottom-8 text-white/30 animate-bounce cursor-pointer"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
      </section>

      {/* ==================== NOSOTROS — Minimal split ==================== */}
      <section id="nosotros" className="py-32 sm:py-40">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700/80 mb-6">Sobre nosotros</p>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-900 leading-snug">
                Empresa mexicana con
                <br />
                <span className="font-semibold">más de 120 años</span> de tradición
              </h2>
              <p className="mt-8 text-base text-slate-400 leading-[1.8] font-light">
                En ALMASA nos dedicamos a la distribución de abarrotes al mayoreo,
                ofreciendo una extensa variedad de productos de la más alta calidad.
                Nuestro compromiso es impulsar tu negocio con precios competitivos
                y un servicio de entrega confiable.
              </p>

              <div className="mt-12 grid grid-cols-3 gap-8">
                {[
                  { num: "500+", label: "Clientes" },
                  { num: "200+", label: "Productos" },
                  { num: "5", label: "Estados" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-3xl font-semibold text-slate-900">{s.num}</p>
                    <p className="text-xs text-slate-400 mt-1 tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80"
                alt="Almacén ALMASA"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== VENTAJAS — Minimal grid ==================== */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { icono: Truck, titulo: "Entrega sin costo", desc: "Directo a tu negocio, sin cobro de envío." },
              { icono: Shield, titulo: "Calidad garantizada", desc: "Productos seleccionados con altos estándares." },
              { icono: Clock, titulo: "Entregas puntuales", desc: "Rutas optimizadas, en el día acordado." },
              { icono: Phone, titulo: "Atención directa", desc: "Asesoría personalizada para tu negocio." },
            ].map((v) => (
              <div key={v.titulo} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-700/5 mb-5">
                  <v.icono className="h-5 w-5 text-red-700" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{v.titulo}</h3>
                <p className="text-sm text-slate-400 font-light leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRODUCTOS — Minimal cards ==================== */}
      <section id="productos" className="py-32 sm:py-40">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700/80 mb-6">Catálogo</p>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-900">
              Más de <span className="font-semibold">200 productos</span> para tu negocio
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {CATEGORIAS.map((cat) => (
              <div key={cat.nombre} className="group relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer">
                <img
                  src={cat.imagen}
                  alt={cat.nombre}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-lg font-medium text-white">{cat.nombre}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== QUOTE — Full width video ==================== */}
      <section className="relative py-40 overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay muted loop playsInline
        >
          <source src="https://videos.pexels.com/video-files/6810220/6810220-uhd_2560_1440_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative text-center px-6">
          <img src={logoBlanco} alt="ALMASA" className="h-10 mx-auto mb-10 opacity-80" />
          <p className="text-2xl sm:text-4xl font-light text-white max-w-2xl mx-auto leading-relaxed italic">
            "Lo natural, siempre mejor"
          </p>
          <p className="mt-6 text-sm text-white/40 tracking-widest uppercase">Trabajando por un México mejor</p>
        </div>
      </section>

      {/* ==================== COBERTURA — Minimal ==================== */}
      <section id="cobertura" className="py-32 sm:py-40">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700/80 mb-6">Cobertura</p>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-900 leading-snug">
                Entrega <span className="font-semibold">a domicilio</span>
                <br />sin costo de envío
              </h2>
              <p className="mt-8 text-base text-slate-400 leading-[1.8] font-light">
                Nuestra flotilla cubre las principales zonas del centro de México
                con entregas puntuales y seguras.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                {COBERTURA.map((zona) => (
                  <span
                    key={zona}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-sm text-slate-600"
                  >
                    <MapPin className="h-3.5 w-3.5 text-red-700/60" />
                    {zona}
                  </span>
                ))}
              </div>
            </div>

            <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80"
                alt="Flota ALMASA"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA — Minimal dark ==================== */}
      <section className="py-32 bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-light text-white leading-snug">
            Empieza a surtir tu
            <br />
            <span className="font-semibold">negocio hoy</span>
          </h2>
          <p className="mt-6 text-base text-white/40 font-light max-w-md mx-auto">
            Cotización personalizada. Sin compromisos, sin costos ocultos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="tel:+525555520168"
              className="group flex items-center gap-3 bg-white text-slate-900 font-medium text-sm px-8 py-4 rounded-full hover:bg-slate-100 transition-all duration-200 cursor-pointer"
            >
              <Phone className="h-4 w-4" />
              55 5552-0168
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a
              href="mailto:1904@almasa.com.mx"
              className="flex items-center gap-3 text-white/50 hover:text-white text-sm font-medium transition-colors duration-200 cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              1904@almasa.com.mx
            </a>
          </div>
        </div>
      </section>

      {/* ==================== CONTACTO ==================== */}
      <section id="contacto" className="py-32 sm:py-40">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700/80 mb-6">Contacto</p>
              <h2 className="text-3xl font-light text-slate-900 leading-snug">
                Estamos para <span className="font-semibold">servirte</span>
              </h2>

              <div className="mt-10 space-y-8">
                {[
                  { icon: MapPin, label: "Melchor Ocampo No. 59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX" },
                  { icon: Phone, label: "55 5552-0168 / 55 5552-7887" },
                  { icon: Mail, label: "1904@almasa.com.mx" },
                  { icon: Clock, label: "Lunes a Viernes, 9:00 AM - 6:00 PM" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <item.icon className="h-4 w-4 text-red-700/60 mt-1 shrink-0" />
                    <p className="text-sm text-slate-500 leading-relaxed">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl overflow-hidden bg-slate-100 min-h-[400px]">
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

      {/* ==================== FOOTER — Minimal ==================== */}
      <footer className="border-t border-slate-100 py-12">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <img src={logoAlmasa} alt="ALMASA" className="h-7" />
            <div className="flex items-center gap-8">
              {["nosotros", "productos", "cobertura", "contacto"].map((id) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-xs text-slate-400 hover:text-slate-600 capitalize cursor-pointer transition-colors">
                  {id}
                </button>
              ))}
              <Link to="/privacidad" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Privacidad
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-300">
              &copy; {new Date().getFullYear()} Abarrotes la Manita S.A. de C.V.
            </p>
            <p className="text-[10px] text-slate-300">RFC: AMA700701GI8</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingAlmasa;
