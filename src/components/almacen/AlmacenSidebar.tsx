import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Truck, ShoppingCart, Package, FileText, Boxes, Bug,
  AlertTriangle, CheckCircle2, Car, Users, CalendarCheck,
  LogOut, Settings, Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfiguracionFlotillaDialog } from "./ConfiguracionFlotillaDialog";
import { AvatarEmpleadoPopover } from "./AvatarEmpleadoPopover";
import { AlmasaLogo } from "@/components/brand/AlmasaLogo";
import { LiveIndicator } from "@/components/ui/live-indicator";

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

interface AlmacenSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showFlotillaTabs: boolean;
  counters: {
    rutas: number;
    ventas: number;
    recepcion: number;
    alertas: number;
  };
  isOnline: boolean;
  onLogout: () => void;
  empleadoNombre: string;
  empleadoId: string | null;
  empleadoPuesto: string;
  empleadoEmail?: string;
  empleadoFotoUrl: string | null;
  onFotoUpdated: (newUrl: string) => void;
}

export const AlmacenSidebar = ({
  activeTab,
  onTabChange,
  showFlotillaTabs,
  counters,
  isOnline,
  onLogout,
  empleadoNombre,
  empleadoId,
  empleadoPuesto,
  empleadoEmail,
  empleadoFotoUrl,
  onFotoUpdated
}: AlmacenSidebarProps) => {
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);

  const almacenItems: NavItem[] = [
    { id: "rutas", label: "Carga de Rutas", icon: Truck, badge: counters.rutas },
    { id: "ventas", label: "Ventas Mostrador", icon: ShoppingCart, badge: counters.ventas },
    { id: "recepcion", label: "Recepción", icon: Package, badge: counters.recepcion },
    { id: "reporte", label: "Reporte del Día", icon: FileText },
    { id: "inventario", label: "Inventario", icon: Boxes },
    { id: "productos", label: "Productos", icon: Package },
    { id: "fumigaciones", label: "Fumigaciones", icon: Bug },
    { id: "caducidad", label: "Caducidad", icon: Timer },
  ];

  const flotillaItems: NavItem[] = [
    { id: "alertas", label: "Alertas", icon: AlertTriangle, badge: counters.alertas },
    { id: "checkups", label: "Checkups Vehículos", icon: CheckCircle2 },
    { id: "vehiculos", label: "Vehículos", icon: Car },
    { id: "personal", label: "Personal", icon: Users },
    { id: "disponibilidad", label: "Disponibilidad", icon: CalendarCheck },
    { id: "externos", label: "Ayudantes Externos", icon: Users },
  ];

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const hasBadge = item.badge !== undefined && item.badge > 0;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground/70 hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {hasBadge && (
          <Badge
            variant={isActive ? "secondary" : "destructive"}
            className="text-[10px] h-5 min-w-5 px-1.5 shrink-0"
          >
            {item.badge! > 99 ? "99+" : item.badge}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <>
      <aside className="w-56 lg:w-64 min-h-[calc(100vh)] border-r bg-card flex flex-col shrink-0">
        {/* Logo La Huella v8 */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-ink-100" style={{ borderBottomWidth: '0.5px' }}>
          <AlmasaLogo size={30} />
          <div style={{ lineHeight: 1 }}>
            <div className="font-serif text-[18px] font-semibold text-crimson-500 tracking-wide" style={{ lineHeight: 1, letterSpacing: '0.03em' }}>ALMASA</div>
            <div className="text-[8px] uppercase tracking-[0.18em] text-ink-500 mt-1 font-medium">Sistema · 1904</div>
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-3">
            <AvatarEmpleadoPopover
              empleadoId={empleadoId}
              empleadoNombre={empleadoNombre || "Usuario"}
              empleadoPuesto={empleadoPuesto || (showFlotillaTabs ? "Gerente de Almacén" : "Almacenista")}
              empleadoEmail={empleadoEmail}
              fotoUrl={empleadoFotoUrl}
              onFotoUpdated={onFotoUpdated}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{empleadoNombre || "Usuario"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {empleadoPuesto || (showFlotillaTabs ? "Gerente de Almacén" : "Almacenista")}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Operaciones */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-3">
              Operaciones
            </p>
            <div className="space-y-0.5">
              {almacenItems.map(renderNavItem)}
            </div>
          </div>

          {/* Flotilla */}
          {showFlotillaTabs && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-3">
                Gestión Flotilla
              </p>
              <div className="space-y-0.5">
                {flotillaItems.map(renderNavItem)}
                <button
                  onClick={() => setConfigOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-all duration-150 cursor-pointer"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 text-left">Configuración</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-2">
          <LiveIndicator
            label={isOnline ? "Sincronizado" : "Sin conexión"}
            className="text-xs text-muted-foreground px-3"
          />
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <ConfiguracionFlotillaDialog open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
};
