import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock, ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import logoAlmasa from "@/assets/logo-almasa.png";

/*
 * ALMASA Landing — Apple Design System
 * Binary light/dark sections, product-as-hero, tight typography,
 * glass nav, pill CTAs, single accent color, cinematic whitespace.
 */

const PRODUCTOS = [
  { nombre: "Cacahuate y Botanas", imagen: "/landing/cacahuate.jpeg" },
  { nombre: "Azúcar", imagen: "/landing/azucar.jpeg" },
  { nombre: "Frijol y Granos", imagen: "/landing/frijol.jpeg" },
  { nombre: "Alimento para Mascotas", imagen: "/landing/mascotas.jpeg" },
  { nombre: "Ciruela y Uva Pasa", imagen: "/landing/pasas.jpeg" },
  { nombre: "Avena y Cereales", imagen: "/landing/avena.jpeg" },
  { nombre: "Frutas en Conserva", imagen: "/landing/latas-frutas.jpeg" },
];

const COBERTURA = ["Ciudad de México", "Estado de México", "Toluca", "Puebla", "Querétaro", "Morelos"];

const LandingAlmasa = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroImages = ["/landing/frijol.jpeg", "/landing/cacahuate.jpeg", "/landing/azucar.jpeg"];
  useEffect(() => {
    const interval = setInterval(() => setHeroSlide(p => (p + 1) % heroImages.length), 7000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>

      {/* ==================== NAV — Glass ==================== */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 h-12 transition-all duration-300",
        "bg-black/80 backdrop-blur-xl backdrop-saturate-[180%]"
      )}>
        <div className="max-w-[980px] mx-auto px-6 h-full flex items-center justify-between">
          <img src={logoAlmasa} alt="ALMASA" className="h-5 brightness-0 invert opacity-90" />

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Productos", id: "productos" },
              { label: "Nosotros", id: "nosotros" },
              { label: "Entrega", id: "entrega" },
              { label: "Contacto", id: "contacto" },
            ].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-xs text-white/80 hover:text-white transition-colors cursor-pointer tracking-[-0.01em]">
                {item.label}
              </button>
            ))}
            <Link to="/auth" className="text-xs text-[#2997ff] hover:underline cursor-pointer">
              Portal ERP
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white/80 cursor-pointer">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10">
            <div className="max-w-[980px] mx-auto px-6 py-6 space-y-4">
              {["productos", "nosotros", "entrega", "contacto"].map(id => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="block text-sm text-white/80 hover:text-white capitalize cursor-pointer">{id}</button>
              ))}
              <Link to="/auth" className="block text-sm text-[#2997ff]">Portal ERP</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO — Black, cinematic ==================== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden bg-black pt-12">
        {/* Background image crossfade */}
        {heroImages.map((img, i) => (
          <div key={i} className={cn(
            "absolute inset-0 transition-opacity duration-[2500ms]",
            i === heroSlide ? "opacity-30" : "opacity-0"
          )}>
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}

        <div className="relative z-10 px-6 max-w-[980px]">
          <img src={logoAlmasa} alt="ALMASA" className="h-12 sm:h-16 mx-auto mb-4 brightness-0 invert" />

          <p className="text-sm sm:text-base text-white/50 tracking-[0.02em] mb-6">Desde 1904</p>

          <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.07] tracking-[-0.003em] text-white">
            Surtimos tu negocio.
          </h1>

          <p className="mt-4 text-lg sm:text-xl text-white/60 font-light leading-[1.47] tracking-[-0.022em] max-w-lg mx-auto">
            Distribuidora de abarrotes al mayoreo. Más de 120 años en México.
          </p>

          {/* Pill CTAs */}
          <div className="flex items-center justify-center gap-5 mt-8">
            <button onClick={() => scrollTo("productos")}
              className="text-[#2997ff] text-sm font-normal hover:underline flex items-center gap-1 cursor-pointer">
              Ver productos <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => scrollTo("contacto")}
              className="text-sm text-white/80 border border-white/30 px-5 py-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              Contacto
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-10 flex gap-2 z-10">
          {heroImages.map((_, i) => (
            <button key={i} onClick={() => setHeroSlide(i)}
              className={cn("h-[2px] rounded-full transition-all duration-700 cursor-pointer",
                i === heroSlide ? "w-8 bg-white/70" : "w-4 bg-white/20")} />
          ))}
        </div>
      </section>

      {/* ==================== STATS — Light gray ==================== */}
      <section className="bg-[#f5f5f7] py-20">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { num: "120+", label: "Años" },
              { num: "500+", label: "Clientes" },
              { num: "200+", label: "Productos" },
              { num: "5", label: "Estados" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[40px] sm:text-[48px] font-semibold text-[#1d1d1f] leading-[1.07] tracking-[-0.003em]">{s.num}</p>
                <p className="text-sm text-[rgba(0,0,0,0.48)] mt-1 tracking-[-0.016em]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRODUCTOS — Black, grid ==================== */}
      <section id="productos" className="bg-black py-24 sm:py-32">
        <div className="max-w-[980px] mx-auto px-6">
          <p className="text-sm text-[#2997ff] text-center mb-3 tracking-[-0.016em]">Catálogo</p>
          <h2 className="text-[40px] sm:text-[56px] font-semibold text-white text-center leading-[1.07] tracking-[-0.003em]">
            Nuestros productos.
          </h2>
          <p className="text-center text-lg text-white/50 mt-4 font-light leading-[1.47] tracking-[-0.022em] max-w-md mx-auto">
            Más de 200 productos para tu negocio. Calidad garantizada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
            {PRODUCTOS.map(p => (
              <div key={p.nombre} className="group relative overflow-hidden rounded-lg bg-[#1d1d1f] cursor-pointer">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={p.imagen} alt={p.nombre}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    loading="lazy" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-white leading-[1.19] tracking-[0.012em]">{p.nombre}</h3>
                  <span className="text-sm text-[#2997ff] mt-2 inline-flex items-center gap-1 hover:underline">
                    Ver más <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== LATAS — Light gray, product hero ==================== */}
      <section className="bg-[#f5f5f7] py-24 sm:py-32">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <p className="text-sm text-[#0066cc] mb-3 tracking-[-0.016em]">Marca propia</p>
          <h2 className="text-[40px] sm:text-[56px] font-semibold text-[#1d1d1f] leading-[1.07] tracking-[-0.003em]">
            Frutas en Conserva.
          </h2>
          <p className="text-lg text-[rgba(0,0,0,0.48)] mt-4 font-light leading-[1.47] max-w-md mx-auto tracking-[-0.022em]">
            Piña, duraznos y cóctel de frutas. Marca ALMASA desde 1904.
          </p>
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl overflow-hidden">
            <img src="/landing/latas-nosotros.jpeg" alt="Latas ALMASA" className="w-full" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ==================== NOSOTROS — Black ==================== */}
      <section id="nosotros" className="bg-black py-24 sm:py-32">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm text-[#2997ff] mb-3 tracking-[-0.016em]">Sobre nosotros</p>
              <h2 className="text-[40px] sm:text-[48px] font-semibold text-white leading-[1.07] tracking-[-0.003em]">
                Empresa mexicana con más de 120 años.
              </h2>
              <p className="mt-6 text-[17px] text-white/60 leading-[1.47] tracking-[-0.022em] font-light">
                En ALMASA nos dedicamos a la distribución de abarrotes al mayoreo,
                ofreciendo una extensa variedad de productos de la más alta calidad.
                Nuestro compromiso es impulsar tu negocio con precios competitivos
                y un servicio de entrega confiable.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Productos directo de proveedores de confianza",
                  "Control de calidad en cada etapa",
                  "Precios transparentes sin costos ocultos",
                  "Asesoría personalizada para tu negocio",
                ].map(item => (
                  <p key={item} className="text-sm text-white/40 leading-[1.43] tracking-[-0.016em]">
                    — {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden">
              <img src="/landing/bodega.jpeg" alt="Bodega ALMASA" className="w-full" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ENTREGA — Light gray ==================== */}
      <section id="entrega" className="bg-[#f5f5f7] py-24 sm:py-32">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 rounded-2xl overflow-hidden">
              <img src="/landing/camion.jpeg" alt="Camión ALMASA en carretera" className="w-full" loading="lazy" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm text-[#0066cc] mb-3 tracking-[-0.016em]">Entrega a domicilio</p>
              <h2 className="text-[40px] sm:text-[48px] font-semibold text-[#1d1d1f] leading-[1.07] tracking-[-0.003em]">
                Sin costo de envío.
              </h2>
              <p className="mt-6 text-[17px] text-[rgba(0,0,0,0.56)] leading-[1.47] tracking-[-0.022em] font-light">
                Nuestra flotilla cubre las principales zonas del centro de México con entregas puntuales y seguras.
              </p>
              <div className="flex flex-wrap gap-2 mt-8">
                {COBERTURA.map(zona => (
                  <span key={zona} className="text-xs text-[#1d1d1f] bg-white px-4 py-2 rounded-full tracking-[-0.01em]">
                    {zona}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA — Black, centered ==================== */}
      <section className="bg-black py-24 sm:py-32">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h2 className="text-[40px] sm:text-[56px] font-semibold text-white leading-[1.07] tracking-[-0.003em]">
            Empieza hoy.
          </h2>
          <p className="text-lg text-white/50 mt-4 font-light leading-[1.47] tracking-[-0.022em] max-w-md mx-auto">
            Cotización personalizada. Sin compromisos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a href="tel:+525555520168"
              className="inline-flex items-center gap-2 bg-[#0071e3] text-white text-sm font-normal px-6 py-3 rounded-lg hover:bg-[#0077ED] transition-colors cursor-pointer">
              <Phone className="h-4 w-4" /> 55 5552-0168
            </a>
            <a href="mailto:1904@almasa.com.mx"
              className="text-sm text-[#2997ff] hover:underline flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4" /> 1904@almasa.com.mx
            </a>
          </div>
        </div>
      </section>

      {/* ==================== CONTACTO — Light gray ==================== */}
      <section id="contacto" className="bg-[#f5f5f7] py-24 sm:py-32">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            <div>
              <h2 className="text-[28px] font-semibold text-[#1d1d1f] leading-[1.14] tracking-[0.007em]">Contacto.</h2>
              <div className="mt-8 space-y-6">
                {[
                  { icon: MapPin, text: "Melchor Ocampo No. 59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX" },
                  { icon: Phone, text: "55 5552-0168 / 55 5552-7887" },
                  { icon: Mail, text: "1904@almasa.com.mx" },
                  { icon: Clock, text: "Lunes a Viernes, 9:00 - 18:00" },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <item.icon className="h-4 w-4 text-[rgba(0,0,0,0.48)] mt-0.5 shrink-0" />
                    <p className="text-sm text-[rgba(0,0,0,0.56)] leading-[1.43] tracking-[-0.016em]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 rounded-xl overflow-hidden bg-[#e8e8ed] min-h-[350px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3763.0!2d-99.1!3d19.4!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI0JzAwLjAiTiA5OcKwMDYnMDAuMCJX!5e0!3m2!1ses!2smx!4v1"
                width="100%" height="100%" style={{ border: 0, minHeight: 350 }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicación ALMASA" />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER — Black, minimal ==================== */}
      <footer className="bg-black border-t border-white/10 py-8">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30 tracking-[-0.01em]">
              &copy; {new Date().getFullYear()} Abarrotes la Manita S.A. de C.V.
            </p>
            <div className="flex items-center gap-6">
              {["productos", "nosotros", "entrega", "contacto"].map(id => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-xs text-white/30 hover:text-white/60 capitalize cursor-pointer tracking-[-0.01em]">{id}</button>
              ))}
              <Link to="/privacidad" className="text-xs text-white/30 hover:text-white/60 tracking-[-0.01em]">Privacidad</Link>
            </div>
          </div>
          <p className="text-[10px] text-white/20 text-center mt-6 tracking-[-0.008em]">RFC: AMA700701GI8</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingAlmasa;
