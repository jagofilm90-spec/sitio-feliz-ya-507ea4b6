import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntregaDescarga {
  id: string;
  numero_entrega: number;
  llegada_registrada_en: string | null;
  trabajando_desde: string | null;
  nombre_chofer_proveedor: string | null;
  cantidad_bultos: number;
  orden_compra: {
    folio: string;
    proveedor: { nombre: string } | null;
  };
}

interface Props {
  entregas: EntregaDescarga[];
}

export const EntregasEnDescargaWidget = ({ entregas }: Props) => {
  // Force re-render every 30s to update timers
  const [, setTick] = useState(0);
  useEffect(() => {
    if (entregas.length === 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [entregas.length]);

  if (entregas.length === 0) return null;

  return (
    <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-base">
          <Truck className="h-5 w-5 animate-pulse" />
          {entregas.length} descarga{entregas.length > 1 ? "s" : ""} en curso
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          {entregas.map((e) => {
            const inicio = new Date(e.trabajando_desde || e.llegada_registrada_en || Date.now());
            const minutos = Math.floor((Date.now() - inicio.getTime()) / 60000);
            const horas = Math.floor(minutos / 60);
            const mins = minutos % 60;
            const tiempoStr = horas > 0 ? `${horas}h ${mins}m` : `${mins} min`;
            const colorTiempo = minutos > 120
              ? "text-red-600 dark:text-red-400"
              : minutos > 60
                ? "text-amber-600 dark:text-amber-400"
                : "text-green-600 dark:text-green-400";

            return (
              <div key={e.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-orange-200/50 dark:border-orange-800/30">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {e.orden_compra?.proveedor?.nombre || "Sin proveedor"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.orden_compra?.folio} · Entrega #{e.numero_entrega} · {e.cantidad_bultos} bultos
                  </p>
                  {e.nombre_chofer_proveedor && (
                    <p className="text-xs text-muted-foreground">Chofer: {e.nombre_chofer_proveedor}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className={cn("font-bold text-lg", colorTiempo)}>{tiempoStr}</p>
                  <p className="text-xs text-muted-foreground">en descarga</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
