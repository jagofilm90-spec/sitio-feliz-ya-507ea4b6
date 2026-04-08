import { COMPANY_DATA } from "@/constants/companyData";
import logoAlmasa from "@/assets/logo-almasa.png";
import { 
  Mail, Phone, MapPin, ArrowLeft, Clock, MessageSquare, 
  HelpCircle, ChevronDown, Headphones, Building2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Soporte = () => {
  const navigate = useNavigate();
  
  const faqs = [
    {
      question: "¿Cómo accedo al sistema ALMASA-OS?",
      answer: "Ingresa a erp.almasa.com.mx desde tu navegador o abre la app móvil. Utiliza las credenciales (correo y contraseña) proporcionadas por tu supervisor o el departamento de sistemas."
    },
    {
      question: "Olvidé mi contraseña, ¿cómo la recupero?",
      answer: "En la pantalla de inicio de sesión, haz clic en '¿Olvidaste tu contraseña?'. Ingresa tu correo electrónico registrado y recibirás instrucciones para restablecer tu contraseña. Si no recibes el correo, contacta a tu supervisor."
    },
    {
      question: "¿Cómo reporto un problema técnico?",
      answer: "Envía un correo a contacto@almasa.com.mx describiendo el problema con detalle: qué estabas haciendo, qué mensaje de error apareció, y si es posible incluye una captura de pantalla. También puedes llamar al teléfono de soporte."
    },
    {
      question: "La aplicación móvil no carga mis datos, ¿qué hago?",
      answer: "Primero verifica tu conexión a internet. Si el problema persiste, cierra la aplicación completamente y vuelve a abrirla. Si continúas con problemas, contacta a soporte técnico."
    },
    {
      question: "¿Cómo actualizo mi información de perfil?",
      answer: "Ingresa al sistema y dirígete a tu perfil (generalmente en la esquina superior derecha). Desde ahí podrás actualizar tu información de contacto. Para cambios en datos oficiales como puesto o departamento, contacta a Recursos Humanos."
    },
    {
      question: "¿El sistema está disponible las 24 horas?",
      answer: "Sí, ALMASA-OS está disponible 24/7. Sin embargo, el soporte técnico tiene horarios específicos. Para emergencias fuera de horario, envía un correo y se atenderá al inicio del siguiente día hábil."
    }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 to-red-600">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoAlmasa} alt="ALMASA" className="h-10 w-auto" />
            <div>
              <h1 className="text-white font-bold text-lg">ALMASA-OS</h1>
              <p className="text-white/70 text-xs">Sistema de Gestión Empresarial</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Headphones className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro de Soporte</h1>
            <p className="text-gray-500">Estamos aquí para ayudarte</p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {/* Email */}
            <a 
              href={`mailto:${COMPANY_DATA.emails.contacto}`}
              className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="bg-red-100 rounded-lg p-3 group-hover:bg-red-200 transition-colors">
                  <Mail className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Correo Electrónico</h3>
                  <p className="text-red-600 font-medium">{COMPANY_DATA.emails.contacto}</p>
                  <p className="text-sm text-gray-500 mt-1">Respuesta en 24-48 horas hábiles</p>
                </div>
              </div>
            </a>

            {/* Phone */}
            <a 
              href={`tel:${COMPANY_DATA.telefonos.principal.replace(/\s/g, '')}`}
              className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="bg-red-100 rounded-lg p-3 group-hover:bg-red-200 transition-colors">
                  <Phone className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Teléfono</h3>
                  <p className="text-red-600 font-medium">{COMPANY_DATA.telefonosFormateados}</p>
                  <p className="text-sm text-gray-500 mt-1">Lunes a Viernes, 8:00 - 18:00</p>
                </div>
              </div>
            </a>

            {/* Schedule */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 rounded-lg p-3">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Horario de Atención</h3>
                  <p className="text-gray-700">Lunes a Viernes</p>
                  <p className="text-gray-700 font-medium">8:00 AM - 6:00 PM</p>
                  <p className="text-sm text-gray-500 mt-1">Hora del Centro de México</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 rounded-lg p-3">
                  <MapPin className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Dirección</h3>
                  <p className="text-gray-700">{COMPANY_DATA.direccion.calle} #{COMPANY_DATA.direccion.numeroExterior}</p>
                  <p className="text-gray-700">Col. {COMPANY_DATA.direccion.colonia}</p>
                  <p className="text-gray-700">C.P. {COMPANY_DATA.direccion.codigoPostal}, {COMPANY_DATA.direccion.ciudad}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-red-50 rounded-xl p-5 mb-10">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 rounded-lg p-3">
                <Building2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Información de la Empresa</h3>
                <p className="text-gray-700 font-medium">{COMPANY_DATA.razonSocialLarga}</p>
                <p className="text-gray-600 text-sm mt-1">RFC: {COMPANY_DATA.rfc}</p>
                <p className="text-gray-600 text-sm">{COMPANY_DATA.direccionCompleta}</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="h-6 w-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Preguntas Frecuentes</h2>
            </div>
            
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-gray-50 rounded-lg px-4 border-none"
                >
                  <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Additional Help */}
          <div className="mt-10 text-center bg-gray-50 rounded-xl p-6">
            <MessageSquare className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">¿No encontraste lo que buscabas?</h3>
            <p className="text-gray-600 mb-4">
              Nuestro equipo de soporte está listo para ayudarte con cualquier consulta.
            </p>
            <a 
              href={`mailto:${COMPANY_DATA.emails.contacto}?subject=Solicitud%20de%20Soporte%20-%20ALMASA-OS`}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contactar Soporte
            </a>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-700">{COMPANY_DATA.razonSocialLarga}</p>
            <p className="mt-1">{COMPANY_DATA.direccionCorta}</p>
            <p className="mt-1">{COMPANY_DATA.emails.contacto} | Tel: {COMPANY_DATA.telefonos.principal}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-white/70 text-sm">
        © {new Date().getFullYear()} {COMPANY_DATA.nombreComercial}. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default Soporte;
