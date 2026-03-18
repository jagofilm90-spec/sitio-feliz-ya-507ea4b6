import { Badge } from "@/components/ui/badge";
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
  Store,
  LogOut,
  Truck,
  CreditCard,
} from "lucide-react";

interface SecretariaMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counters: {
    pedidos: number;
    mostrador: number;
    facturas: number;
    chat: number;
    correos: number;
    compras: number;
  };
  onLogout: () => void;
}

export const SecretariaMobileNav = ({
  activeTab,
  onTabChange,
  counters,
  onLogout,
}: SecretariaMobileNavProps) => {
  const navItems = [
    { id: "pedidos", label: "Pedidos", icon: ClipboardList, badge: counters.pedidos },
    { id: "facturacion", label: "Facturas", icon: FileText, badge: counters.facturas },
    { id: "correos", label: "Correos", icon: Mail, badge: counters.correos },
    { id: "chat", label: "Chat", icon: MessageCircle, badge: counters.chat },
    { id: "clientes", label: "Clientes", icon: Users },
  ];

  // Second row for more options
  const navItems2 = [
    { id: "productos", label: "Productos", icon: Package },
    { id: "precios", label: "Precios", icon: DollarSign },
    { id: "compras", label: "Compras", icon: ShoppingCart, badge: counters.compras },
    { id: "inventario", label: "Inventario", icon: Warehouse },
    { id: "mostrador", label: "Mostrador", icon: Store, badge: counters.mostrador },
    { id: "rutas", label: "Rutas", icon: Truck },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 pb-[env(safe-area-inset-bottom)]">
      {/* Primary Navigation */}
      <div className="grid grid-cols-5 gap-1 p-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = item.badge && item.badge > 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all min-h-[52px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full">
                    {item.badge! > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Secondary Navigation - Scrollable */}
      <div className="flex gap-1 px-1 pb-1 overflow-x-auto scrollbar-hide">
        {navItems2.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = item.badge && item.badge > 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all min-h-[36px]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {hasBadge && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {item.badge! > 9 ? "9+" : item.badge}
                </Badge>
              )}
            </button>
          );
        })}
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all min-h-[36px] text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir
        </button>
      </div>
    </div>
  );
};
