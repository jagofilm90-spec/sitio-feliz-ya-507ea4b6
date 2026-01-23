import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { AvatarEmpleadoPopover } from "./AvatarEmpleadoPopover";
import logoBlanco from "@/assets/logos/logo-blanco.png";
import iconoA from "@/assets/logos/icono-a-pequeno.png";

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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
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

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const hasBadge = item.badge !== undefined && item.badge > 0;

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.label}
          onClick={() => onTabChange(item.id)}
          size="lg"
          className={cn(
            "h-11 transition-all",
            isActive && "bg-primary/20 text-primary-foreground border-l-2 border-primary"
          )}
        >
          <div className="relative">
            <item.icon className="h-5 w-5" />
            {hasBadge && isCollapsed && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full">
                {item.badge! > 9 ? "+" : item.badge}
              </span>
            )}
          </div>
          <span className="font-medium">{item.label}</span>
          {hasBadge && !isCollapsed && (
            <Badge 
              variant={item.id === "alertas" ? "destructive" : "secondary"}
              className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5"
            >
              {item.badge! > 99 ? "99+" : item.badge}
            </Badge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <Sidebar collapsible="icon" className="bg-slate-900 border-r border-slate-700">
        {/* Header con Logo */}
        <SidebarHeader className="border-b border-slate-700">
          <div className={cn(
            "flex items-center justify-center py-2 transition-all",
            isCollapsed ? "px-0" : "px-3"
          )}>
            {isCollapsed ? (
              <img src={iconoA} alt="A" className="h-7 w-7 object-contain brightness-0 invert" />
            ) : (
              <img src={logoBlanco} alt="Almasa" className="h-7 w-auto" />
            )}
          </div>
        </SidebarHeader>

        {/* Bienvenida con Avatar - Solo cuando está expandido */}
        {!isCollapsed && (
          <div className="p-3 border-b border-slate-700 space-y-3">
            <div className="flex items-center gap-3">
              <AvatarEmpleadoPopover
                empleadoId={empleadoId}
                empleadoNombre={empleadoNombre}
                empleadoPuesto={empleadoPuesto}
                empleadoEmail={empleadoEmail}
                fotoUrl={empleadoFotoUrl}
                onFotoUpdated={onFotoUpdated}
              />
              
              <div className="flex-1 min-w-0">
                <p className="text-slate-400 text-[10px]">Bienvenido,</p>
                <h2 className="text-white font-semibold text-sm truncate">
                  {empleadoNombre || "Usuario"}
                </h2>
                <p className="text-slate-500 text-[10px]">
                  {empleadoPuesto || (showFlotillaTabs ? "Gerente de Almacén" : "Almacenista")}
                </p>
              </div>
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
        )}

        {/* Avatar compacto cuando está colapsado */}
        {isCollapsed && (
          <div className="flex justify-center py-3 border-b border-slate-700">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center cursor-default">
                  <span className="text-primary-foreground font-semibold text-xs">
                    {empleadoNombre?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{empleadoNombre || "Usuario"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navegación */}
        <SidebarContent className="bg-slate-900">
          {/* Sección Operaciones */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] tracking-wider">
              Operaciones
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {almacenItems.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Sección Flotilla - Solo para gerente/admin */}
          {showFlotillaTabs && (
            <SidebarGroup className="border-t border-slate-700 pt-2">
              <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] tracking-wider">
                Gestión Flotilla
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {flotillaItems.map(renderNavItem)}
                  
                  {/* Configuración */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Configuración"
                      onClick={() => setConfigOpen(true)}
                      size="lg"
                      className="h-11 text-slate-400 hover:text-white hover:bg-white/5"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Configuración</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-slate-700 bg-slate-900">
          {/* Toggle button */}
          <SidebarTrigger className="w-full justify-center h-10 text-slate-400 hover:text-white hover:bg-slate-800" />

          {/* Estado de conexión */}
          {!isCollapsed && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mx-2",
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
          )}

          {/* Indicador de conexión colapsado */}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isOnline ? "Conectado" : "Sin conexión"}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Botón Cerrar Sesión */}
          <SidebarMenuButton
            tooltip="Cerrar sesión"
            onClick={onLogout}
            size="lg"
            className="h-10 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      {/* Dialog de Configuración controlado */}
      <ConfiguracionFlotillaDialog 
        open={configOpen} 
        onOpenChange={setConfigOpen} 
      />
    </>
  );
};
