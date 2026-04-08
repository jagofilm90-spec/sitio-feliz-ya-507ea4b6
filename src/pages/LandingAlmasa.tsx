import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock, ArrowRight, Menu, X, Truck, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import logoAlmasa from "@/assets/logo-almasa.png";

/*
 * ALMASA Landing — Airbnb Design System adapted
 * Warm, photography-forward, white canvas, ALMASA Red accent,
 * rounded cards with 3-layer shadows, generous radius, image-first.
 */

const PRODUCTOS = [
  { nombre: "Cacahuate y Botanas", desc: "Almendras, nueces, semillas y más", imagen: "/landing/cacahuate.jpeg" },
  { nombre: "Azúcar", desc: "Estándar, refinada y glas", imagen: "/landing/azucar.jpeg" },
  { nombre: "Frijol y Granos", desc: "Frijol, arroz, lenteja, maíz", imagen: "/landing/frijol.jpeg" },
  { nombre: "Alimento para Mascotas", desc: "Croquetas y alimento a granel", imagen: "/landing/mascotas.jpeg" },
  { nombre: "Ciruela y Uva Pasa", desc: "Frutos secos al mayoreo", imagen: "/landing/pasas.jpeg" },
  { nombre: "Avena y Cereales", desc: "Hojuela, granola y más", imagen: "/landing/avena.jpeg" },
  { nombre: "Frutas en Conserva", desc: "Piña, duraznos y cóctel ALMASA", imagen: "/landing/latas-frutas.jpeg" },
];

const COBERTURA = ["Ciudad de México", "Estado de México", "Toluca", "Puebla", "Querétaro", "Morelos"];

// Airbnb 3-layer card shadow
const cardShadow = "0px 0px 0px 1px rgba(0,0,0,0.02), 0px 2px 6px rgba(0,0,0,0.04), 0px 4px 8px rgba(0,0,0,0.1)";
const cardHoverShadow = "0px 4px 12px rgba(0,0,0,0.12)";

const LandingAlmasa = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);

  const heroImages = ["/landing/frijol.jpeg", "/landing/cacahuate.jpeg", "/landing/latas-frutas.jpeg"];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setHeroSlide(p => (p + 1) % heroImages.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-[#222222] antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>

      {/* ==================== NAV — White, sticky ==================== */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white",
        scrolled && "shadow-[0_1px_12px_rgba(0,0,0,0.08)]"
      )}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/landing" className="shrink-0">
            <img src={logoAlmasa} alt="ALMASA" className="h-8" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Productos", id: "productos" },
              { label: "Nosotros", id: "nosotros" },
              { label: "Entrega", id: "entrega" },
              { label: "Contacto", id: "contacto" },
            ].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-sm font-medium text-[#222222] hover:text-[#B22234] transition-colors cursor-pointer">
                {item.label}
              </button>
            ))}
            <Link to="/auth"
              className="text-sm font-medium text-white bg-[#222222] px-5 py-2.5 rounded-lg hover:bg-[#B22234] transition-colors cursor-pointer">
              Portal ALMASA-OS
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-[#222222] cursor-pointer">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="max-w-6xl mx-auto px-6 py-5 space-y-3">
              {["productos", "nosotros", "entrega", "contacto"].map(id => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="block text-base font-medium text-[#222222] capitalize cursor-pointer">{id}</button>
              ))}
              <Link to="/auth" className="block mt-3 text-center text-white bg-[#222222] py-3 rounded-lg font-medium cursor-pointer">
                Portal ALMASA-OS
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO — Full image, warm ==================== */}
      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[70vh] sm:h-[80vh] overflow-hidden rounded-none sm:mx-6 sm:mt-4 sm:rounded-[32px]">
          {/* Slideshow */}
          {heroImages.map((img, i) => (
            <img key={i} src={img} alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]",
                i === heroSlide ? "opacity-100" : "opacity-0"
              )} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Content over image */}
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 lg:p-16">
            <p className="text-sm font-semibold text-white/70 mb-3 tracking-wide">Desde 1904</p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-[-0.02em] max-w-2xl">
              Surtimos tu negocio a domicilio
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/70 font-normal max-w-lg leading-[1.47]">
              Distribuidora de abarrotes al mayoreo. Más de 200 productos con entrega sin costo.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <button onClick={() => scrollTo("productos")}
                className="bg-[#B22234] text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-[#8B1A29] transition-colors cursor-pointer">
                Ver productos
              </button>
              <button onClick={() => scrollTo("contacto")}
                className="bg-white/20 backdrop-blur-sm text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-white/30 transition-colors cursor-pointer">
                Contacto
              </button>
            </div>
          </div>

          {/* Slide dots */}
          <div className="absolute bottom-4 right-8 flex gap-2">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroSlide(i)}
                className={cn("h-2 rounded-full transition-all duration-500 cursor-pointer",
                  i === heroSlide ? "w-6 bg-white" : "w-2 bg-white/40")} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== STATS — Warm numbers ==================== */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { num: "120+", label: "Años de experiencia" },
              { num: "500+", label: "Clientes activos" },
              { num: "200+", label: "Productos" },
              { num: "5", label: "Estados de cobertura" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-4xl sm:text-5xl font-bold text-[#222222] tracking-[-0.02em]">{s.num}</p>
                <p className="text-sm text-[#6a6a6a] mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRODUCTOS — Card grid, photography first ==================== */}
      <section id="productos" className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-[28px] font-bold text-[#222222] leading-[1.14] tracking-[-0.01em]">
            Nuestros productos
          </h2>
          <p className="text-base text-[#6a6a6a] mt-2 leading-[1.47]">
            Más de 200 productos para surtir tu negocio
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {PRODUCTOS.map(p => (
              <div key={p.nombre}
                className="group rounded-[20px] overflow-hidden bg-white cursor-pointer transition-shadow duration-300"
                style={{ boxShadow: cardShadow }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = cardHoverShadow)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = cardShadow)}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={p.imagen} alt={p.nombre}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy" />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-[#222222] leading-[1.25]">{p.nombre}</h3>
                  <p className="text-sm text-[#6a6a6a] mt-1 leading-[1.43]">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== LATAS — Product showcase ==================== */}
      <section className="py-16 sm:py-20 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="rounded-[20px] overflow-hidden" style={{ boxShadow: cardShadow }}>
              <img src="/landing/latas-nosotros.jpeg" alt="Latas ALMASA" className="w-full" loading="lazy" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#B22234] mb-2">Marca propia</p>
              <h2 className="text-[28px] font-bold text-[#222222] leading-[1.14] tracking-[-0.01em]">
                Frutas en Conserva ALMASA
              </h2>
              <p className="mt-4 text-base text-[#6a6a6a] leading-[1.47]">
                Piña en rebanadas, duraznos mitades en almíbar y cóctel de frutas.
                Productos de marca ALMASA, desde 1904, con la calidad que tu negocio necesita.
              </p>
              <button onClick={() => scrollTo("contacto")}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#B22234] hover:underline cursor-pointer">
                Solicitar cotización <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== VENTAJAS — Icon cards ==================== */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-[28px] font-bold text-[#222222] leading-[1.14] tracking-[-0.01em] text-center">
            ¿Por qué ALMASA?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {[
              { icon: Truck, title: "Entrega sin costo", desc: "Surtimos tu negocio a domicilio sin cobro de envío en toda nuestra zona de cobertura." },
              { icon: Shield, title: "Calidad garantizada", desc: "Productos seleccionados con los más altos estándares de calidad y frescura." },
              { icon: Clock, title: "Entregas puntuales", desc: "Rutas optimizadas para que recibas tu pedido en el día y hora acordados." },
            ].map(v => (
              <div key={v.title} className="rounded-[20px] p-6 bg-white transition-shadow duration-300"
                style={{ boxShadow: cardShadow }}>
                <div className="w-12 h-12 rounded-full bg-[#f7f7f7] flex items-center justify-center mb-4">
                  <v.icon className="h-5 w-5 text-[#222222]" />
                </div>
                <h3 className="text-base font-semibold text-[#222222] leading-[1.25]">{v.title}</h3>
                <p className="text-sm text-[#6a6a6a] mt-2 leading-[1.43]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== NOSOTROS ==================== */}
      <section id="nosotros" className="py-16 sm:py-20 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-[#B22234] mb-2">Sobre nosotros</p>
              <h2 className="text-[28px] font-bold text-[#222222] leading-[1.14] tracking-[-0.01em]">
                Empresa mexicana con más de 120 años de tradición
              </h2>
              <p className="mt-4 text-base text-[#6a6a6a] leading-[1.47]">
                En ALMASA nos dedicamos a la distribución de abarrotes al mayoreo,
                ofreciendo una extensa variedad de productos de la más alta calidad.
                Nuestro compromiso es impulsar tu negocio con precios competitivos
                y un servicio de entrega confiable.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Productos directo de proveedores de confianza",
                  "Control de calidad en cada etapa",
                  "Precios transparentes sin costos ocultos",
                  "Asesoría personalizada para tu negocio",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#B22234]/10 flex items-center justify-center shrink-0">
                      <ChevronRight className="h-3 w-3 text-[#B22234]" />
                    </div>
                    <p className="text-sm text-[#6a6a6a] leading-[1.43]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[20px] overflow-hidden" style={{ boxShadow: cardShadow }}>
              <img src="/landing/bodega.jpeg" alt="Bodega ALMASA" className="w-full" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ENTREGA ==================== */}
      <section id="entrega" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-[20px] overflow-hidden order-2 lg:order-1" style={{ boxShadow: cardShadow }}>
              <img src="/landing/camion.jpeg" alt="Camión ALMASA" className="w-full" loading="lazy" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold text-[#B22234] mb-2">Entrega a domicilio</p>
              <h2 className="text-[28px] font-bold text-[#222222] leading-[1.14] tracking-[-0.01em]">
                Sin costo de envío
              </h2>
              <p className="mt-4 text-base text-[#6a6a6a] leading-[1.47]">
                Nuestra flotilla cubre las principales zonas del centro de México con entregas puntuales y seguras.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {COBERTURA.map(zona => (
                  <span key={zona} className="text-sm text-[#222222] bg-[#f2f2f2] px-4 py-2 rounded-full font-medium">
                    {zona}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-16 sm:py-20 bg-[#222222]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-[1.14] tracking-[-0.02em]">
            Empieza a surtir tu negocio hoy
          </h2>
          <p className="text-base text-white/60 mt-4 leading-[1.47] max-w-md mx-auto">
            Cotización personalizada. Sin compromisos, sin costos ocultos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <a href="tel:+525555520168"
              className="inline-flex items-center gap-2 bg-[#B22234] text-white font-medium text-sm px-7 py-3.5 rounded-lg hover:bg-[#8B1A29] transition-colors cursor-pointer">
              <Phone className="h-4 w-4" /> 55 5552-0168
            </a>
            <a href="mailto:1904@almasa.com.mx"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors cursor-pointer">
              <Mail className="h-4 w-4" /> 1904@almasa.com.mx
            </a>
          </div>
        </div>
      </section>

      {/* ==================== CONTACTO ==================== */}
      <section id="contacto" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-10">
            <div>
              <h2 className="text-[28px] font-bold text-[#222222] leading-[1.14]">Contacto</h2>
              <div className="mt-6 space-y-5">
                {[
                  { icon: MapPin, text: "Melchor Ocampo No. 59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX" },
                  { icon: Phone, text: "55 5552-0168 / 55 5552-7887" },
                  { icon: Mail, text: "1904@almasa.com.mx" },
                  { icon: Clock, text: "Lunes a Viernes, 9:00 - 18:00" },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <item.icon className="h-4 w-4 text-[#6a6a6a] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#6a6a6a] leading-[1.43]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 rounded-[20px] overflow-hidden min-h-[350px]" style={{ boxShadow: cardShadow }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3763.0!2d-99.1!3d19.4!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI0JzAwLjAiTiA5OcKwMDYnMDAuMCJX!5e0!3m2!1ses!2smx!4v1"
                width="100%" height="100%" style={{ border: 0, minHeight: 350 }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicación ALMASA" />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-[#e8e8e8] py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={logoAlmasa} alt="ALMASA" className="h-6" />
              <p className="text-xs text-[#6a6a6a]">&copy; {new Date().getFullYear()} Abarrotes la Manita S.A. de C.V.</p>
            </div>
            <div className="flex items-center gap-6">
              {["productos", "nosotros", "entrega", "contacto"].map(id => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-xs text-[#6a6a6a] hover:text-[#222222] capitalize cursor-pointer">{id}</button>
              ))}
              <Link to="/privacidad" className="text-xs text-[#6a6a6a] hover:text-[#222222]">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingAlmasa;
