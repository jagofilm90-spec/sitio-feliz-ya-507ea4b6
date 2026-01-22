import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground shadow-xl">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-5 border-b border-sidebar-border bg-gradient-to-r from-primary/20 to-primary/10">
        <img src={logoAlmasa} alt="ALMASA" className="h-12 object-contain brightness-0 invert" />
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-sidebar-border bg-sidebar-accent/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-semibold text-sm">
              {userName?.charAt(0)?.toUpperCase() || "S"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sidebar-foreground truncate">{userName || "Secretaria"}</p>
            <p className="text-xs text-sidebar-foreground/60">Panel Secretaria</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Módulos
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = item.badge && item.badge > 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60")} />
                {hasBadge && !isActive && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full animate-pulse">
                    {item.badge! > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="font-medium flex-1">{item.label}</span>
              {hasBadge && isActive && (
                <Badge variant="secondary" className="bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground text-xs">
                  {item.badge! > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live indicator */}
      <div className="px-4 py-2 border-t border-sidebar-border">
        <LiveIndicator label="Sincronizado" className="text-sidebar-foreground/60" />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {hasMultipleRoles && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onNavigateDashboard}
          >
            <LayoutDashboard className="h-5 w-5 mr-3" />
            Dashboard
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
};
