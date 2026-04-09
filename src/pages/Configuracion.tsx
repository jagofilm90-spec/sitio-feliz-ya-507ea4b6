import { useState } from "react";
import Layout from "@/components/Layout";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCompactLayout } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Mail,
  Truck,
  Users,
  CreditCard,
  Bell,
  Database,
} from "lucide-react";

// Tab components
import { ConfigEmpresaTab } from "@/components/configuracion/ConfigEmpresaTab";
import { ConfigCorreosTab } from "@/components/configuracion/ConfigCorreosTab";
import { ConfigFlotillaTab } from "@/components/configuracion/ConfigFlotillaTab";
import { ConfigUsuariosTab } from "@/components/configuracion/ConfigUsuariosTab";
import { ConfigCreditosTab } from "@/components/configuracion/ConfigCreditosTab";
import { ConfigAlertasTab } from "@/components/configuracion/ConfigAlertasTab";
import { ConfigSistemaTab } from "@/components/configuracion/ConfigSistemaTab";

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  roles: string[];
}

const sections: Section[] = [
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    description: "Datos fiscales, bancarios y de contacto",
    roles: ["admin"],
  },
  {
    id: "correos",
    label: "Correos",
    icon: Mail,
    description: "Cuentas Gmail, permisos y firmas",
    roles: ["admin"],
  },
  {
    id: "flotilla",
    label: "Flotilla",
    icon: Truck,
    description: "Bodegas, vehículos y alertas",
    roles: ["admin", "gerente_almacen"],
  },
  {
    id: "usuarios",
    label: "Acceso y Permisos",
    icon: Users,
    description: "Gestión de usuarios y permisos",
    roles: ["admin"],
  },
  {
    id: "creditos",
    label: "Créditos",
    icon: CreditCard,
    description: "Términos de crédito por defecto",
    roles: ["admin", "contadora"],
  },
  {
    id: "alertas",
    label: "Alertas",
    icon: Bell,
    description: "Umbrales y notificaciones",
    roles: ["admin"],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: Database,
    description: "Respaldos e información técnica",
    roles: ["admin"],
  },
];

function ConfiguracionContent() {
  const [activeSection, setActiveSection] = useState("empresa");
  const { isAdmin, hasRole } = useUserRoles();
  const isCompact = useCompactLayout();

  const allowedSections = sections.filter((section) =>
    isAdmin || section.roles.some((role) => hasRole(role as any))
  );

  const currentSection = allowedSections.find((s) => s.id === activeSection);
  if (!currentSection && allowedSections.length > 0) {
    setActiveSection(allowedSections[0].id);
  }

  const renderTabContent = () => {
    switch (activeSection) {
      case "empresa":
        return <ConfigEmpresaTab />;
      case "correos":
        return <ConfigCorreosTab />;
      case "flotilla":
        return <ConfigFlotillaTab />;
      case "usuarios":
        return <ConfigUsuariosTab />;
      case "creditos":
        return <ConfigCreditosTab />;
      case "alertas":
        return <ConfigAlertasTab />;
      case "sistema":
        return <ConfigSistemaTab />;
      default:
        return <ConfigEmpresaTab />;
    }
  };

  return (
    <div>
      {/* Compact nav — horizontal pills on tablets */}
      {isCompact && (
        <ScrollArea className="w-full pb-4 mb-6">
          <div className="flex gap-1.5 min-w-max">
            {allowedSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-ink-900 text-white"
                      : "bg-warm-50 text-ink-600 hover:bg-warm-100"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Main content with sidebar */}
      <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        {/* Sidebar navigation — desktop only */}
        {!isCompact && (
          <nav className="lg:w-60 flex-shrink-0">
            <div className="sticky top-24 space-y-0.5">
              {allowedSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all relative",
                      isActive
                        ? "bg-warm-100 text-ink-900"
                        : "text-ink-600 hover:bg-warm-50 hover:text-ink-800"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-crimson-500" />
                    )}
                    <Icon className={cn("h-[18px] w-[18px] flex-shrink-0 mt-0.5", isActive ? "text-crimson-500" : "text-ink-400")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{section.label}</div>
                      <div className="text-[11px] text-ink-400 truncate mt-0.5">
                        {section.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Content area — no wrapper card */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default function Configuracion() {
  return (
    <Layout>
      <ErrorBoundaryModule moduleName="Configuración">
        <ConfiguracionContent />
      </ErrorBoundaryModule>
    </Layout>
  );
}
