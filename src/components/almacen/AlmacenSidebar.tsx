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
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfiguracionFlotillaDialog } from "./ConfiguracionFlotillaDialog";
import { AvatarEmpleadoPopover } from "./AvatarEmpleadoPopover";
import logoAlmasa from "@/assets/logo-almasa.png";
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
  const { isHovering, isMobile } = useSidebar();
  const [configOpen, setConfigOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // El sidebar está visualmente colapsado cuando NO está en hover
  // En desktop con mouse: colapsado por defecto, expandido solo al hover
  // La lógica de `hasPointer` ya se maneja en el componente Sidebar base
  const isCollapsed = !isHovering;

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
          <div className="relative shrink-0">
            <item.icon className="h-5 w-5" />
            {hasBadge && isCollapsed && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full">
                {item.badge! > 9 ? "+" : item.badge}
              </span>
            )}
          </div>
          {!isCollapsed && <span className="font-medium">{item.label}</span>}
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
      {/* Forzar tema oscuro solo en este sidebar */}
      <div className="dark">
        <Sidebar collapsible="icon" expandOnHover className="border-r border-sidebar-border">
        {/* Header con Logo - Siempre visible */}
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex flex-col items-center py-3">
            <img 
              src={logoAlmasa} 
              alt="ALMASA" 
              className={cn(
                "object-contain transition-all duration-200",
                isCollapsed ? "h-6 w-auto" : "h-8 w-auto"
              )} 
            />
          </div>
        </SidebarHeader>

        {/* User Info - Nombre siempre visible, avatar solo expandido */}
        <div className="border-b border-sidebar-border">
          <div className={cn(
            "flex items-center gap-2 p-2",
            isCollapsed ? "flex-col justify-center" : "flex-row"
          )}>
            {/* Avatar - Solo cuando expandido */}
            {!isCollapsed && (
              <AvatarEmpleadoPopover
                empleadoId={empleadoId}
                empleadoNombre={empleadoNombre}
                empleadoPuesto={empleadoPuesto}
                empleadoEmail={empleadoEmail}
                fotoUrl={empleadoFotoUrl}
                onFotoUpdated={onFotoUpdated}
              />
            )}
            
            {/* Nombre - Siempre visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "min-w-0",
                  isCollapsed ? "w-full text-center" : "flex-1 text-left"
                )}>
                  {!isCollapsed && (
                    <p className="text-muted-foreground text-[10px]">Bienvenido,</p>
                  )}
                  <p className={cn(
                    "text-sidebar-foreground font-semibold truncate",
                    isCollapsed ? "text-[10px]" : "text-sm"
                  )}>
                    {isCollapsed 
                      ? (empleadoNombre?.split(' ')[0] || "Usuario")
                      : (empleadoNombre || "Usuario")
                    }
                  </p>
                  {!isCollapsed && (
                    <p className="text-muted-foreground text-[10px]">
                      {empleadoPuesto || (showFlotillaTabs ? "Gerente de Almacén" : "Almacenista")}
                    </p>
                  )}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>{empleadoNombre || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">
                    {empleadoPuesto || (showFlotillaTabs ? "Gerente de Almacén" : "Almacenista")}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
          
          {/* Fecha y hora en vivo - Solo expandido */}
          {!isCollapsed && (
            <div className="px-3 pb-2 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px]">
                  {format(currentTime, "EEE, dd MMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sidebar-foreground">
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
          )}
        </div>

          {/* Navegación */}
          <SidebarContent>
            {/* Sección Operaciones */}
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="uppercase text-[10px] tracking-wider">
                  Operaciones
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {almacenItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Sección Flotilla - Solo para gerente/admin */}
            {showFlotillaTabs && (
              <SidebarGroup className={cn(!isCollapsed && "border-t border-sidebar-border pt-2")}>
                {!isCollapsed && (
                  <SidebarGroupLabel className="uppercase text-[10px] tracking-wider">
                    Gestión Flotilla
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {flotillaItems.map(renderNavItem)}
                    
                    {/* Configuración */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Configuración"
                        onClick={() => setConfigOpen(true)}
                        size="lg"
                        className="h-11"
                      >
                        <Settings className="h-5 w-5" />
                        {!isCollapsed && <span>Configuración</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="border-t border-sidebar-border">
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
              {!isCollapsed && <span>Cerrar Sesión</span>}
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Dialog de Configuración controlado */}
      <ConfiguracionFlotillaDialog 
        open={configOpen} 
        onOpenChange={setConfigOpen} 
      />
    </>
  );
};
