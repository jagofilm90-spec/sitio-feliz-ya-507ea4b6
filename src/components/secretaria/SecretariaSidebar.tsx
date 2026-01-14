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
} from "lucide-react";
import logoAlmasa from "@/assets/logo-almasa.png";

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
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-gray-900 text-white shadow-xl">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-5 border-b border-gray-700/50 bg-gradient-to-r from-pink-600/20 to-rose-600/20">
        <img src={logoAlmasa} alt="ALMASA" className="h-12 object-contain brightness-0 invert" />
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-semibold text-sm">
              {userName?.charAt(0)?.toUpperCase() || "S"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{userName || "Secretaria"}</p>
            <p className="text-xs text-gray-400">Panel Secretaria</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                  ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-400")} />
                {hasBadge && !isActive && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                    {item.badge! > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="font-medium flex-1">{item.label}</span>
              {hasBadge && isActive && (
                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                  {item.badge! > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700/50 space-y-2">
        {hasMultipleRoles && (
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={onNavigateDashboard}
          >
            <LayoutDashboard className="h-5 w-5 mr-3" />
            Dashboard
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
};
