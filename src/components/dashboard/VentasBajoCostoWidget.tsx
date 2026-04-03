import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";

export function VentasBajoCostoWidget() {
  const { data } = useQuery({
    queryKey: ["ventas-bajo-costo-mes"],
    queryFn: async () => {
      const inicio = startOfMonth(new Date()).toISOString();
      const fin = endOfMonth(new Date()).toISOString();

      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select(`
          id, total, motivo_venta_bajo_costo,
          pedidos_detalles (
            cantidad, precio_unitario,
            productos (ultimo_costo_compra, costo_promedio_ponderado, peso_kg, precio_por_kilo)
          )
        `)
        .not("motivo_venta_bajo_costo", "is", null)
        .gte("fecha_pedido", inicio)
        .lte("fecha_pedido", fin)
        .neq("status", "cancelado" as any);

      if (error) throw error;

      let perdidaTotal = 0;
      (pedidos || []).forEach((p: any) => {
        (p.pedidos_detalles || []).forEach((d: any) => {
          const costo = d.productos?.ultimo_costo_compra || d.productos?.costo_promedio_ponderado || 0;
          if (costo <= 0) return;
          const precio = d.precio_unitario;
          if (precio >= costo) return;
          const precioPorKilo = d.productos?.precio_por_kilo || false;
          const pesoKg = d.productos?.peso_kg || 0;
          const cantidadEfectiva = precioPorKilo && pesoKg > 0 ? d.cantidad * pesoKg : d.cantidad;
          perdidaTotal += (costo - precio) * cantidadEfectiva;
        });
      });

      return {
        count: (pedidos || []).length,
        perdida: Math.round(perdidaTotal * 100) / 100,
      };
    },
    refetchInterval: 120000,
  });

  if (!data || data.count === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              Ventas abajo del costo este mes
            </p>
            <div className="flex gap-4 mt-1">
              <div>
                <p className="text-lg font-bold">{data.count}</p>
                <p className="text-[10px] text-muted-foreground">pedidos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{formatCurrency(data.perdida)}</p>
                <p className="text-[10px] text-muted-foreground">pérdida estimada</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
