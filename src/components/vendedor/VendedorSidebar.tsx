import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Users, ShoppingCart, ClipboardList, Sparkles, List, Wallet,
  Percent, BarChart3, LogOut, HandCoins, TrendingUp,
} from "lucide-react";
import logoAlmasa from "@/assets/logo-almasa.png";
import { AvatarEmpleadoPopover } from "@/components/almacen/AvatarEmpleadoPopover";

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  isLink?: boolean;
}

interface VendedorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onNavigateTarjeta: () => void;
  onNavigateAnalisis: () => void;
  vendedorNombre: string;
  novedadesCount: number;
  vendedorId?: string | null;
  vendedorPuesto?: string;
  vendedorEmail?: string;
  vendedorFotoUrl?: string | null;
  onFotoUpdated?: (url: string) => void;
}

export const VendedorSidebar = ({
  activeTab,
  onTabChange,
  onLogout,
  onNavigateTarjeta,
  onNavigateAnalisis,
  vendedorNombre,
  novedadesCount,
  vendedorId = null,
  vendedorPuesto = "Ejecutivo de Ventas",
  vendedorEmail,
  vendedorFotoUrl = null,
  onFotoUpdated = () => {},
}: VendedorSidebarProps) => {

  const navItems: NavItem[] = [
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "nuevo", label: "Nuevo Pedido", icon: ShoppingCart },
    { id: "pedidos", label: "Pedidos", icon: ClipboardList },
    { id: "cobranza", label: "Cobranza", icon: HandCoins },
    { id: "ventas", label: "Mis Ventas", icon: TrendingUp },
    { id: "novedades", label: "Novedades", icon: Sparkles, badge: novedadesCount },
    { id: "precios", label: "Precios", icon: List },
    { id: "saldos", label: "Saldos", icon: Wallet },
    { id: "comisiones", label: "Comisiones", icon: Percent },
    { id: "analisis", label: "Análisis", icon: BarChart3, isLink: true },
  ];

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id && !item.isLink;
    const hasBadge = item.badge && item.badge > 0;

    return (
      <button
        key={item.id}
        onClick={() => item.isLink ? onNavigateAnalisis() : onTabChange(item.id)}
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
      {/* Logo */}
      <div className="p-4 border-b">
        <img src={logoAlmasa} alt="ALMASA" className="h-8" />
      </div>

      {/* User */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-3">
          <AvatarEmpleadoPopover
            empleadoId={vendedorId}
            empleadoNombre={vendedorNombre || "Vendedor"}
            empleadoPuesto={vendedorPuesto}
            empleadoEmail={vendedorEmail}
            fotoUrl={vendedorFotoUrl}
            onFotoUpdated={onFotoUpdated}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{vendedorNombre || "Vendedor"}</p>
            <p className="text-xs text-muted-foreground truncate">{vendedorPuesto}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-3">Menú</p>
        <div className="space-y-0.5">
          {navItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-150 cursor-pointer">
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
