import { useState } from "react";
import Layout from "@/components/Layout";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  Building2,
  Mail,
  Truck,
  Users,
  CreditCard,
  Bell,
  Database,
  Settings,
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
    label: "Usuarios",
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
  const { roles, isAdmin, hasRole } = useUserRoles();

  // Filter sections based on user roles
  const allowedSections = sections.filter((section) =>
    isAdmin || section.roles.some((role) => hasRole(role as any))
  );

  // Set first allowed section as active if current is not allowed
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            Administra la configuración general del sistema
          </p>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
        {/* Sidebar navigation */}
        <nav className="md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            {allowedSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{section.label}</div>
                    <div
                      className={cn(
                        "text-xs truncate",
                        isActive
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {section.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-lg border p-6">
            {renderTabContent()}
          </div>
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
