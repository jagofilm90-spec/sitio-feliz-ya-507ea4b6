import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Users, 
  ShoppingCart, 
  ClipboardList, 
  Sparkles, 
  List, 
  Wallet, 
  Percent, 
  BarChart3, 
  LogOut, 
  User, 
  IdCard 
} from "lucide-react";
import logoAlmasa from "@/assets/logo-almasa.png";
import iconoA from "@/assets/logos/icono-a-pequeno.png";

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  isLink?: boolean;
  href?: string;
}

interface VendedorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onNavigateTarjeta: () => void;
  onNavigateAnalisis: () => void;
  vendedorNombre: string;
  novedadesCount: number;
}

export const VendedorSidebar = ({
  activeTab,
  onTabChange,
  onLogout,
  onNavigateTarjeta,
  onNavigateAnalisis,
  vendedorNombre,
  novedadesCount,
}: VendedorSidebarProps) => {
  const { state, isHovering } = useSidebar();
  const isCollapsed = state === "collapsed" && !isHovering;

  const navItems: NavItem[] = [
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "nuevo", label: "Nuevo Pedido", icon: ShoppingCart },
    { id: "ventas", label: "Mis Ventas", icon: ClipboardList },
    { id: "novedades", label: "Novedades", icon: Sparkles, badge: novedadesCount },
    { id: "precios", label: "Precios", icon: List },
    { id: "saldos", label: "Saldos", icon: Wallet },
    { id: "comisiones", label: "Comisiones", icon: Percent },
    { id: "analisis", label: "Análisis", icon: BarChart3, isLink: true },
  ];

  return (
    <div className="dark">
      <Sidebar collapsible="icon" expandOnHover className="border-r border-sidebar-border">
        {/* Header con Logo - Siempre visible */}
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex flex-col items-center py-2 gap-1">
            <img src={iconoA} alt="A" className="h-7 w-7 object-contain" />
            {!isCollapsed && (
              <img src={logoAlmasa} alt="ALMASA" className="h-6 object-contain" />
            )}
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
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md ring-2 ring-primary/20 shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            
            {/* Nombre - Siempre visible */}
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
                      ? (vendedorNombre?.split(' ')[0] || "Vendedor")
                      : vendedorNombre
                    }
                  </p>
                  {!isCollapsed && (
                    <p className="text-xs text-muted-foreground font-medium">Ejecutivo de Ventas</p>
                  )}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>{vendedorNombre}</p>
                  <p className="text-xs text-muted-foreground">Ejecutivo de Ventas</p>
                </TooltipContent>
              )}
            </Tooltip>
            
            {/* Tarjeta Digital button - Solo expandido */}
            {!isCollapsed && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onNavigateTarjeta}
                className="shrink-0 hover:bg-primary/10 h-8 w-8"
                title="Mi Tarjeta Digital"
              >
                <IdCard className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

      {/* Navegación */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id && !item.isLink;
                const hasBadge = item.badge && item.badge > 0;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => item.isLink ? onNavigateAnalisis() : onTabChange(item.id)}
                      className={cn(
                        "transition-all duration-200",
                        isActive && "bg-primary text-primary-foreground shadow-sm"
                      )}
                    >
                      <div className="relative">
                        <Icon className="h-4 w-4" />
                        {hasBadge && isCollapsed && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full">
                            {item.badge! > 9 ? "+" : item.badge}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{item.label}</span>
                      {hasBadge && !isCollapsed && (
                        <Badge 
                          variant={isActive ? "secondary" : "secondary"} 
                          className="ml-auto text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border">

          {/* Tarjeta Digital - solo en colapsado */}
          {isCollapsed && (
            <SidebarMenuButton
              tooltip="Mi Tarjeta Digital"
              onClick={onNavigateTarjeta}
              className="hover:bg-primary/10"
            >
              <IdCard className="h-4 w-4" />
              <span>Mi Tarjeta</span>
            </SidebarMenuButton>
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
    </div>
  );
};
