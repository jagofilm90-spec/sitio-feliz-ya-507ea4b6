import { useState } from "react";
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
  Settings,
  User,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ConfiguracionFlotillaDialog } from "./ConfiguracionFlotillaDialog";
import logoAlmasa from "@/assets/logo-almasa.png";
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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [configOpen, setConfigOpen] = useState(false);

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
          className={cn(
            "transition-all duration-200",
            isActive && "bg-primary text-primary-foreground shadow-sm"
          )}
        >
          <div className="relative">
            <item.icon className="h-4 w-4" />
            {hasBadge && isCollapsed && (
              <span className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full">
                {item.badge! > 9 ? "+" : item.badge}
              </span>
            )}
          </div>
          <span className="font-medium">{item.label}</span>
          {hasBadge && !isCollapsed && (
            <Badge 
              variant="secondary"
              className="ml-auto text-xs"
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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        {/* Header con Logo y Toggle */}
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-between py-2 px-2">
            <img 
              src={logoAlmasa} 
              alt="ALMASA" 
              className={cn(
                "object-contain transition-all duration-200",
                isCollapsed ? "h-6 w-auto" : "h-8 w-auto"
              )} 
            />
            {!isCollapsed && (
              <SidebarTrigger className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
            )}
          </div>
          {isCollapsed && (
            <div className="flex justify-center py-1">
              <SidebarTrigger className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
            </div>
          )}
        </SidebarHeader>

        {/* User Info */}
        <div className="border-b border-sidebar-border">
          <div className={cn(
            "flex items-center gap-2 p-2",
            isCollapsed ? "flex-col justify-center" : "flex-row"
          )}>
            {!isCollapsed && (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md ring-2 ring-primary/20 shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "min-w-0",
                  isCollapsed ? "w-full text-center" : "flex-1 text-left"
                )}>
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
                    <p className="text-xs text-muted-foreground font-medium">
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
        </div>

        {/* Navegación */}
        <SidebarContent>
          {/* Sección Operaciones */}
          <SidebarGroup>
            <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {almacenItems.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Sección Flotilla - Solo para gerente/admin */}
          {showFlotillaTabs && (
            <SidebarGroup>
              <SidebarGroupLabel>Gestión Flotilla</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {flotillaItems.map(renderNavItem)}
                  
                  {/* Configuración */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Configuración"
                      onClick={() => setConfigOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Configuración</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border">
          {/* Live indicator */}
          {!isCollapsed && (
            <div className="px-2 py-1">
              <LiveIndicator 
                label={isOnline ? "Sincronizado" : "Sin conexión"} 
                className="text-sidebar-foreground/60 text-xs" 
              />
            </div>
          )}

          {/* Logout button */}
          <SidebarMenuButton
            tooltip="Cerrar sesión"
            onClick={onLogout}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
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
