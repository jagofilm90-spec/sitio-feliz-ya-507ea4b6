import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Warehouse, ClipboardCheck, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CambioProducto {
  producto: string;
  cantidad_original: number;
  cantidad_nueva: number;
}

interface HistorialEntry {
  id: string;
  tipo_cambio: string;
  cambios: {
    productos?: CambioProducto[];
    [key: string]: any;
  };
  total_anterior: number | null;
  total_nuevo: number | null;
  usuario_nombre: string | null;
  created_at: string;
}

interface Props {
  pedidoId: string | null;
}

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Warehouse; color: string }> = {
  almacen_carga: {
    label: "Carga de almacén",
    icon: Warehouse,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  conciliacion_secretaria: {
    label: "Conciliación secretaria",
    icon: ClipboardCheck,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

export function PedidoHistorialCambios({ pedidoId }: Props) {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);

  useEffect(() => {
    if (!pedidoId) return;
    fetchHistorial();
  }, [pedidoId]);

  const fetchHistorial = async () => {
    const { data, error } = await supabase
      .from("pedidos_historial_cambios")
      .select("id, tipo_cambio, cambios, total_anterior, total_nuevo, created_at, profiles:usuario_id(full_name)")
      .eq("pedido_id", pedidoId!)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching historial:", error);
      return;
    }

    setHistorial(
      (data || []).map((row: any) => ({
        id: row.id,
        tipo_cambio: row.tipo_cambio,
        cambios: (typeof row.cambios === "string" ? JSON.parse(row.cambios) : row.cambios) || {},
        total_anterior: row.total_anterior,
        total_nuevo: row.total_nuevo,
        usuario_nombre: row.profiles?.full_name || null,
        created_at: row.created_at,
      }))
    );
  };

  if (!historial.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Historial de modificaciones
      </div>

      <div className="relative border-l-2 border-muted ml-3 space-y-4">
        {historial.map((entry) => {
          const config = TIPO_CONFIG[entry.tipo_cambio] || TIPO_CONFIG.almacen_carga;
          const Icon = config.icon;
          const productos = entry.cambios?.productos || [];

          return (
            <div key={entry.id} className="relative pl-6">
              {/* Timeline dot */}
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background bg-muted-foreground/30" />

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`gap-1 text-xs ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>

                {entry.usuario_nombre && (
                  <p className="text-xs text-muted-foreground">
                    Por: <span className="font-medium text-foreground">{entry.usuario_nombre}</span>
                  </p>
                )}

                {/* Product changes */}
                {productos.length > 0 && (
                  <div className="text-xs space-y-0.5">
                    {productos.map((p: CambioProducto, i: number) => (
                      <p key={i} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{p.producto}</span>:{" "}
                        {p.cantidad_original} → {p.cantidad_nueva}
                      </p>
                    ))}
                  </div>
                )}

                {/* Total change */}
                {entry.total_anterior != null && entry.total_nuevo != null && entry.total_anterior !== entry.total_nuevo && (
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(entry.total_anterior)} → <span className="font-medium text-foreground">{formatCurrency(entry.total_nuevo)}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
