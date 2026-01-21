import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  Truck, 
  ShoppingCart, 
  Package, 
  FileText, 
  Boxes, 
  Bug,
  AlertTriangle,
  CheckCircle2,
  Car,
  Users,
  CalendarCheck,
  LogOut,
  Wifi,
  WifiOff,
  Settings,
  Calendar,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfiguracionFlotillaDialog } from "./ConfiguracionFlotillaDialog";
import logoBlanco from "@/assets/logos/logo-blanco.png";

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
}

export const AlmacenSidebar = ({
  activeTab,
  onTabChange,
  showFlotillaTabs,
  counters,
  isOnline,
  onLogout,
  empleadoNombre
}: AlmacenSidebarProps) => {
  const [configOpen, setConfigOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const almacenItems: NavItem[] = [
    { id: "rutas", label: "Carga de Rutas", icon: Truck, badge: counters.rutas },
    { id: "ventas", label: "Ventas Mostrador", icon: ShoppingCart, badge: counters.ventas },
    { id: "recepcion", label: "Recepción", icon: Package, badge: counters.recepcion },
    { id: "reporte", label: "Reporte del Día", icon: FileText },
    { id: "inventario", label: "Inventario", icon: Boxes },
    { id: "productos", label: "Productos", icon: Package },
    { id: "fumigaciones", label: "Fumigaciones", icon: Bug },
  ];

  const flotillaItems: NavItem[] = [
    { id: "alertas", label: "Alertas", icon: AlertTriangle, badge: counters.alertas },
    { id: "checkups", label: "Checkups Vehículos", icon: CheckCircle2 },
    { id: "vehiculos", label: "Vehículos", icon: Car },
    { id: "personal", label: "Personal", icon: Users },
    { id: "disponibilidad", label: "Disponibilidad", icon: CalendarCheck },
    { id: "externos", label: "Ayudantes Externos", icon: Users },
  ];

  const renderNavItem = (item: NavItem) => (
    <button
      key={item.id}
      onClick={() => onTabChange(item.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
        "hover:bg-white/10",
        activeTab === item.id
          ? "bg-primary/20 text-primary-foreground border-l-2 border-primary"
          : "text-slate-300 hover:text-white"
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-sm font-medium">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <Badge 
          variant={item.id === "alertas" ? "destructive" : "secondary"}
          className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5"
        >
          {item.badge > 99 ? "99+" : item.badge}
        </Badge>
      )}
    </button>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900 fixed left-0 top-0 h-screen z-40">
        {/* Header con Logo y Bienvenida */}
        <div className="border-b border-slate-700">
          {/* Logo */}
          <div className="p-3 flex justify-center border-b border-slate-700/50">
            <img src={logoBlanco} alt="Almasa" className="h-7 w-auto" />
          </div>
          
          {/* Bienvenida personalizada */}
          <div className="p-3 space-y-2">
            <div>
              <p className="text-slate-400 text-[10px]">Bienvenido,</p>
              <h2 className="text-white font-semibold text-sm truncate">
                {empleadoNombre || "Usuario"}
              </h2>
              <p className="text-slate-500 text-[10px]">
                {showFlotillaTabs ? "Gerente de Almacén" : "Almacenista"}
              </p>
            </div>
            
            {/* Fecha y hora en vivo */}
            <div className="pt-2 border-t border-slate-700/50 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px]">
                  {format(currentTime, "EEE, dd MMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-mono">
                    {format(currentTime, "HH:mm:ss")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] text-green-400">En vivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Sección Operaciones */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
              Operaciones
            </p>
            <div className="space-y-0.5">
              {almacenItems.map(renderNavItem)}
            </div>
          </div>

          {/* Sección Flotilla - Solo para gerente/admin */}
          {showFlotillaTabs && (
            <div className="pt-3 border-t border-slate-700">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                Gestión Flotilla
              </p>
              <div className="space-y-0.5">
                {flotillaItems.map(renderNavItem)}
              </div>
              
              {/* Configuración como item compacto */}
              <button
                onClick={() => setConfigOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-slate-400 hover:text-white hover:bg-white/5 mt-2 border-t border-slate-700/50 pt-3"
              >
                <Settings className="w-4 h-4" />
                <span className="text-xs">Configuración</span>
              </button>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-slate-700 space-y-1.5">
          {/* Estado de conexión */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
            isOnline ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
          )}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Sin conexión</span>
              </>
            )}
          </div>

          {/* Botón Cerrar Sesión */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 text-xs"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Dialog de Configuración controlado */}
      <ConfiguracionFlotillaDialog 
        open={configOpen} 
        onOpenChange={setConfigOpen} 
      />
    </>
  );
};