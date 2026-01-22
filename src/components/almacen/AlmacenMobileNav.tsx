import { cn } from "@/lib/utils";
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
  LogOut
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface AlmacenMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showFlotillaTabs: boolean;
  counters: {
    rutas: number;
    ventas: number;
    recepcion: number;
    alertas: number;
  };
  onLogout: () => void;
}

export const AlmacenMobileNav = ({
  activeTab,
  onTabChange,
  showFlotillaTabs,
  counters,
  onLogout
}: AlmacenMobileNavProps) => {
  
  // Items principales (siempre visibles en fila superior)
  const mainItems = [
    { id: "rutas", label: "Rutas", icon: Truck, badge: counters.rutas },
    { id: "ventas", label: "Ventas", icon: ShoppingCart, badge: counters.ventas },
    { id: "recepcion", label: "Recep.", icon: Package, badge: counters.recepcion },
    { id: "inventario", label: "Invent.", icon: Boxes },
    ...(showFlotillaTabs ? [{ id: "alertas", label: "Alertas", icon: AlertTriangle, badge: counters.alertas }] : []),
  ];

  // Items secundarios (scrollable)
  const secondaryItems = [
    { id: "reporte", label: "Reporte", icon: FileText },
    { id: "productos", label: "Productos", icon: Package },
    { id: "fumigaciones", label: "Fumig.", icon: Bug },
    ...(showFlotillaTabs ? [
      { id: "checkups", label: "Checkups", icon: CheckCircle2 },
      { id: "vehiculos", label: "Vehículos", icon: Car },
      { id: "personal", label: "Personal", icon: Users },
      { id: "disponibilidad", label: "Disp.", icon: CalendarCheck },
      { id: "externos", label: "Externos", icon: Users },
    ] : []),
  ];

  const renderNavButton = (item: typeof mainItems[0], isMain = true) => (
    <button
      key={item.id}
      onClick={() => onTabChange(item.id)}
      className={cn(
        "flex flex-col items-center justify-center gap-1 relative min-w-[60px] px-2 py-2 rounded-lg transition-all",
        isMain ? "flex-1" : "",
        activeTab === item.id
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      <div className="relative">
        <item.icon className="w-5 h-5" />
        {item.badge !== undefined && item.badge > 0 && (
          <Badge 
            variant={item.id === "alertas" ? "destructive" : "default"}
            className="absolute -top-2 -right-2 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
          >
            {item.badge > 9 ? "9+" : item.badge}
          </Badge>
        )}
      </div>
      <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
    </button>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-40 pb-[env(safe-area-inset-bottom)]">
      {/* Fila secundaria scrollable */}
      <ScrollArea className="border-b">
        <div className="flex gap-1 p-2">
          {secondaryItems.map(item => renderNavButton(item, false))}
          {/* Botón de Cerrar Sesión */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-2 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Fila principal fija */}
      <div className="flex gap-1 p-2">
        {mainItems.map(item => renderNavButton(item, true))}
      </div>
    </div>
  );
};
