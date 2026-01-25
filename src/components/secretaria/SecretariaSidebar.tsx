import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import logoAlmasa from "@/assets/logo-almasa.png";
import iconoA from "@/assets/logos/icono-a-pequeno.png";
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
  const { state, isHovering } = useSidebar();
  const isCollapsed = state === "collapsed" && !isHovering;

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
    <div className="dark">
      <Sidebar collapsible="icon" expandOnHover className="border-r border-sidebar-border">
        {/* Header con Logo */}
        <SidebarHeader className="border-b border-sidebar-border shrink-0">
          <div className={cn(
            "flex items-center justify-center py-3 transition-all duration-300 ease-in-out",
            isCollapsed ? "px-2" : "px-4"
          )}>
            <div className="h-10 flex items-center justify-center overflow-hidden">
              {isCollapsed ? (
                <img src={iconoA} alt="A" className="h-8 w-8 object-contain transition-all duration-300" />
              ) : (
                <img src={logoAlmasa} alt="ALMASA" className="h-10 max-w-[180px] object-contain transition-all duration-300" />
              )}
            </div>
          </div>
        </SidebarHeader>

        {/* User Info Section - con shrink-0 para evitar compresión */}
        <div className="shrink-0 border-b border-sidebar-border">
          {!isCollapsed ? (
            <div className="px-4 py-3 bg-sidebar-accent/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-primary-foreground font-semibold text-sm">
                    {userName?.charAt(0)?.toUpperCase() || "S"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sidebar-foreground truncate text-sm">{userName || "Secretaria"}</p>
                  <p className="text-xs text-sidebar-foreground/60">Panel Secretaria</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center cursor-default">
                    <span className="text-primary-foreground font-semibold text-xs">
                      {userName?.charAt(0)?.toUpperCase() || "S"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{userName || "Secretaria"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden">
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
                        isActive && "bg-sidebar-primary text-sidebar-primary-foreground"
                      )}
                    >
                      <div className="relative">
                        <Icon className="h-4 w-4" />
                        {hasBadge && isCollapsed && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-destructive rounded-full ring-2 ring-sidebar" />
                        )}
                      </div>
                      <span>{item.label}</span>
                      {hasBadge && !isCollapsed && (
                        <Badge 
                          variant={isActive ? "secondary" : "destructive"} 
                          className={cn(
                            "ml-auto text-xs h-5 min-w-5 flex items-center justify-center px-1.5",
                            isActive && "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                          )}
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
        <SidebarFooter className="border-t border-sidebar-border shrink-0">
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
    </div>
  );
};
