import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Package, DollarSign, ClipboardList, ShoppingCart, Warehouse,
  FileText, MessageCircle, Mail, Users, LogOut, LayoutDashboard,
  Store, Coins, Truck, CreditCard,
} from "lucide-react";
import { AlmasaLogo } from "@/components/brand/AlmasaLogo";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { AvatarEmpleadoPopover } from "@/components/almacen/AvatarEmpleadoPopover";

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
    pagosValidar: number;
  };
  hasMultipleRoles?: boolean;
  empleadoId?: string | null;
  empleadoPuesto?: string;
  empleadoEmail?: string;
  empleadoFotoUrl?: string | null;
  onFotoUpdated?: (url: string) => void;
}

export const SecretariaSidebar = ({
  activeTab,
  onTabChange,
  onLogout,
  onNavigateDashboard,
  userName,
  counters,
  hasMultipleRoles = false,
  empleadoId = null,
  empleadoPuesto = "Secretaria",
  empleadoEmail,
  empleadoFotoUrl = null,
  onFotoUpdated = () => {},
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
    { id: "pagos_validar", label: "Pagos", icon: CreditCard, badge: counters.pagosValidar },
    { id: "chat", label: "Chat", icon: MessageCircle, badge: counters.chat },
    { id: "correos", label: "Correos", icon: Mail, badge: counters.correos },
    { id: "rutas", label: "Rutas", icon: Truck },
    { id: "clientes", label: "Clientes", icon: Users },
  ];

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const hasBadge = item.badge && item.badge > 0;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground/70 hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {hasBadge && (
          <Badge variant={isActive ? "secondary" : "destructive"} className="text-[10px] h-5 min-w-5 px-1.5 shrink-0">
            {item.badge! > 99 ? "99+" : item.badge}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex w-56 lg:w-64 min-h-screen border-r bg-card flex-col shrink-0">
      {/* Logo La Huella v8 */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-ink-100" style={{ borderBottomWidth: '0.5px' }}>
        <AlmasaLogo size={30} />
        <div style={{ lineHeight: 1 }}>
          <div className="font-serif text-[18px] font-semibold text-crimson-500 tracking-wide" style={{ lineHeight: 1, letterSpacing: '0.03em' }}>ALMASA</div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-ink-500 mt-1 font-medium">Sistema · 1904</div>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-3">
          <AvatarEmpleadoPopover
            empleadoId={empleadoId}
            empleadoNombre={userName || "Secretaria"}
            empleadoPuesto={empleadoPuesto}
            empleadoEmail={empleadoEmail}
            fotoUrl={empleadoFotoUrl}
            onFotoUpdated={onFotoUpdated}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{userName || "Secretaria"}</p>
            <p className="text-xs text-muted-foreground truncate">{empleadoPuesto}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-3">Módulos</p>
        <div className="space-y-0.5">
          {navItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-1">
        <LiveIndicator label="Sincronizado" className="text-xs text-muted-foreground px-3 mb-1" />
        {hasMultipleRoles && (
          <button onClick={onNavigateDashboard}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-all duration-150 cursor-pointer">
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>
        )}
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-150 cursor-pointer">
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
