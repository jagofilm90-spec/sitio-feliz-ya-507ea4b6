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
    <Sidebar collapsible="icon" expandOnHover className="border-r">
      {/* Header con Logo */}
      <SidebarHeader className="border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
        <div className={cn(
          "flex items-center justify-center py-2 transition-all",
          isCollapsed ? "px-0" : "px-4"
        )}>
          {isCollapsed ? (
            <img src={iconoA} alt="A" className="h-8 w-8 object-contain" />
          ) : (
            <img src={logoAlmasa} alt="ALMASA" className="h-10 object-contain" />
          )}
        </div>
      </SidebarHeader>

      {/* Info del vendedor - Solo visible cuando está expandido */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md ring-2 ring-primary/20 shrink-0">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate text-sm">{vendedorNombre}</p>
              <p className="text-xs text-muted-foreground font-medium">Ejecutivo de Ventas</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onNavigateTarjeta}
              className="shrink-0 hover:bg-primary/10 h-8 w-8"
              title="Mi Tarjeta Digital"
            >
              <IdCard className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      )}

      {/* Avatar compacto cuando está colapsado */}
      {isCollapsed && (
        <div className="flex justify-center py-3 border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center cursor-default">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{vendedorNombre}</p>
              <p className="text-xs text-muted-foreground">Ejecutivo de Ventas</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

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
      <SidebarFooter className="border-t">
        {/* Toggle button */}
        <SidebarTrigger className="w-full justify-center h-9 hover:bg-muted" />

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
  );
};
