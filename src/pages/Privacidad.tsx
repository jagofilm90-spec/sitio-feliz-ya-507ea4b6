import { COMPANY_DATA } from "@/constants/companyData";
import logoAlmasa from "@/assets/logo-almasa.png";
import { Shield, Lock, Eye, FileText, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Privacidad = () => {
  const navigate = useNavigate();
  
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
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
            <p className="text-gray-500">Última actualización: Enero 2026</p>
          </div>

          {/* Sections */}
          <div className="space-y-8 text-gray-700">
            {/* Responsable */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">1. Responsable del Tratamiento de Datos</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{COMPANY_DATA.razonSocialLarga}</p>
                <p className="text-sm mt-1">RFC: {COMPANY_DATA.rfc}</p>
                <p className="text-sm">{COMPANY_DATA.direccionCompleta}</p>
                <p className="text-sm mt-2">
                  <strong>Contacto para privacidad:</strong> {COMPANY_DATA.emails.contacto}
                </p>
              </div>
            </section>

            {/* Datos recopilados */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">2. Datos Personales que Recopilamos</h2>
              </div>
              <p className="mb-3">
                ALMASA-OS es un sistema de gestión empresarial de uso interno. Recopilamos los siguientes datos personales:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Datos de identificación:</strong> Nombre completo, correo electrónico corporativo, número de empleado.</li>
                <li><strong>Datos de contacto:</strong> Teléfono, dirección de entrega (para clientes).</li>
                <li><strong>Credenciales de acceso:</strong> Usuario y contraseña cifrada para acceso al sistema.</li>
                <li><strong>Datos de ubicación:</strong> Geolocalización en tiempo real (únicamente para personal de reparto durante sus rutas activas).</li>
                <li><strong>Registros de actividad:</strong> Historial de operaciones realizadas en el sistema para auditoría interna.</li>
              </ul>
            </section>

            {/* Finalidades */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">3. Finalidades del Tratamiento</h2>
              </div>
              <p className="mb-3">Utilizamos sus datos personales para:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gestión de la relación laboral o comercial con nuestra empresa.</li>
                <li>Administración de pedidos, entregas y facturación.</li>
                <li>Control de inventario y logística de distribución.</li>
                <li>Monitoreo de rutas de entrega para optimización operativa.</li>
                <li>Comunicaciones internas relacionadas con operaciones del negocio.</li>
                <li>Cumplimiento de obligaciones fiscales y legales.</li>
              </ul>
            </section>

            {/* Base legal */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">4. Base Legal</h2>
              </div>
              <p>
                El tratamiento de sus datos se fundamenta en la relación laboral o comercial existente con 
                {COMPANY_DATA.razonSocial}, conforme a lo establecido en la Ley Federal de Protección de 
                Datos Personales en Posesión de los Particulares (LFPDPPP) de México.
              </p>
            </section>

            {/* Seguridad */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">5. Medidas de Seguridad</h2>
              </div>
              <p className="mb-3">
                Implementamos medidas técnicas y organizativas para proteger sus datos personales:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Cifrado de datos en tránsito (HTTPS/TLS) y en reposo.</li>
                <li>Políticas de seguridad a nivel de fila (RLS) en base de datos.</li>
                <li>Autenticación segura con contraseñas encriptadas.</li>
                <li>Control de acceso basado en roles y permisos.</li>
                <li>Registros de auditoría para detectar accesos no autorizados.</li>
                <li>Copias de seguridad periódicas en servidores seguros.</li>
              </ul>
            </section>

            {/* Derechos ARCO */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">6. Derechos ARCO</h2>
              </div>
              <p className="mb-3">
                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. 
                Para ejercer estos derechos, puede contactarnos a través de:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-red-600" />
                  <a href={`mailto:${COMPANY_DATA.emails.contacto}`} className="text-red-600 hover:underline">
                    {COMPANY_DATA.emails.contacto}
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-red-600" />
                  <span>{COMPANY_DATA.telefonosFormateados}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span>{COMPANY_DATA.direccionCorta}</span>
                </p>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Su solicitud será atendida en un plazo máximo de 20 días hábiles conforme a la LFPDPPP.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">7. Cookies y Tecnologías Similares</h2>
              </div>
              <p>
                ALMASA-OS utiliza cookies técnicas esenciales para el funcionamiento del sistema, 
                incluyendo tokens de sesión para mantener su autenticación activa. No utilizamos 
                cookies de seguimiento ni compartimos información con terceros para fines publicitarios.
              </p>
            </section>

            {/* Transferencias */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">8. Transferencias de Datos</h2>
              </div>
              <p>
                Sus datos personales no son compartidos con terceros, excepto cuando sea necesario 
                para cumplir con obligaciones legales o fiscales ante autoridades mexicanas competentes.
              </p>
            </section>

            {/* Cambios */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">9. Cambios a esta Política</h2>
              </div>
              <p>
                Nos reservamos el derecho de modificar esta Política de Privacidad. Cualquier cambio 
                será comunicado a través del sistema y entrará en vigor a partir de su publicación.
              </p>
            </section>
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

export default Privacidad;
