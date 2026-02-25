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
  Package,
  DollarSign,
  ClipboardList,
  ShoppingCart,
  Warehouse,
  FileText,
  MessageCircle,
  Mail,
  Users,
  LogOut,
  LayoutDashboard,
  Store,
  Coins,
  User,
} from "lucide-react";
import logoAlmasa from "@/assets/logo-almasa.png";
import { LiveIndicator } from "@/components/ui/live-indicator";

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

interface SecretariaSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onNavigateDashboard: () => void;
  userName: string;
  counters: {
    pedidos: number;
    mostrador: number;
    facturas: number;
    chat: number;
    correos: number;
    compras: number;
  };
  hasMultipleRoles?: boolean;
}

export const SecretariaSidebar = ({
  activeTab,
  onTabChange,
  onLogout,
  onNavigateDashboard,
  userName,
  counters,
  hasMultipleRoles = false,
}: SecretariaSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const navItems: NavItem[] = [
    { id: "productos", label: "Productos", icon: Package },
    { id: "costos", label: "Costos", icon: Coins },
    { id: "precios", label: "Lista de Precios", icon: DollarSign },
    { id: "pedidos", label: "Pedidos", icon: ClipboardList, badge: counters.pedidos },
    { id: "mostrador", label: "Mostrador", icon: Store, badge: counters.mostrador },
    { id: "compras", label: "Compras", icon: ShoppingCart, badge: counters.compras },
    { id: "inventario", label: "Inventario", icon: Warehouse },
    { id: "facturacion", label: "Facturación", icon: FileText, badge: counters.facturas },
    { id: "chat", label: "Chat", icon: MessageCircle, badge: counters.chat },
    { id: "correos", label: "Correos", icon: Mail, badge: counters.correos },
    { id: "clientes", label: "Clientes", icon: Users },
  ];

  return (
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
                    ? (userName?.split(' ')[0] || "Secretaria")
                    : (userName || "Secretaria")
                  }
                </p>
                {!isCollapsed && (
                  <p className="text-xs text-muted-foreground font-medium">Panel Secretaria</p>
                )}
              </div>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>{userName || "Secretaria"}</p>
                <p className="text-xs text-muted-foreground">Panel Secretaria</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasBadge = item.badge && item.badge > 0;

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
                          variant="secondary"
                          className="ml-auto text-xs"
                        >
                          {item.badge! > 99 ? "99+" : item.badge}
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
        {/* Live indicator */}
        {!isCollapsed && (
          <div className="px-2 py-1">
            <LiveIndicator label="Sincronizado" className="text-sidebar-foreground/60 text-xs" />
          </div>
        )}

        {/* Dashboard button for multiple roles */}
        {hasMultipleRoles && (
          <SidebarMenuButton
            tooltip="Dashboard"
            onClick={onNavigateDashboard}
            className="hover:bg-sidebar-accent"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
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
