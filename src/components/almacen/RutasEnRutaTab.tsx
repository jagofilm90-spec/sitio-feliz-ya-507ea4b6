import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, User, MapPin, CheckCircle2, Clock, Package } from "lucide-react";
import { format } from "date-fns";

interface EntregaStatus {
  id: string;
  status_entrega: string | null;
  pedido: {
    folio: string;
    cliente: { nombre: string } | null;
  } | null;
}

interface RutaEnRuta {
  id: string;
  folio: string;
  fecha_ruta: string;
  fecha_hora_inicio: string | null;
  chofer: { nombre_completo: string } | null;
  vehiculo: { nombre: string; placa: string } | null;
  entregas: EntregaStatus[];
}

export const RutasEnRutaTab = () => {
  const [rutas, setRutas] = useState<RutaEnRuta[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRutas = useCallback(async () => {
    const fechaHoy = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("rutas")
      .select(`
        id, folio, fecha_ruta, fecha_hora_inicio,
        chofer:empleados!rutas_chofer_id_fkey(nombre_completo),
        vehiculo:vehiculos(nombre, placa),
        entregas(id, status_entrega, pedido:pedidos(folio, cliente:clientes(nombre)))
      `)
      .eq("status", "en_curso")
      .gte("fecha_ruta", fechaHoy)
      .order("fecha_hora_inicio", { ascending: true });

    if (!error) setRutas((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRutas(); }, [loadRutas]);

  // Realtime subscription for delivery updates
  useEffect(() => {
    const channel = supabase
      .channel("entregas-en-ruta-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "entregas" }, () => {
        loadRutas();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRutas]);

  if (loading) {
    return <div className="p-4 space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (rutas.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay rutas en camino</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {rutas.map(ruta => {
        const total = ruta.entregas.length;
        const entregadas = ruta.entregas.filter(e => e.status_entrega === "entregado" || e.status_entrega === "parcial").length;
        const pct = total > 0 ? Math.round((entregadas / total) * 100) : 0;

        return (
          <Card key={ruta.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{ruta.folio}</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
                    <Truck className="w-3 h-3 mr-1" /> En Ruta
                  </Badge>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {entregadas}/{total} entregas
                </span>
              </div>

              <Progress value={pct} className="mb-3 h-2" />

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {ruta.chofer?.nombre_completo || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  {ruta.vehiculo?.nombre || "—"}
                </span>
                {ruta.fecha_hora_inicio && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Salió {new Date(ruta.fecha_hora_inicio).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              {/* Delivery list */}
              <div className="space-y-1">
                {ruta.entregas.map(e => {
                  const done = e.status_entrega === "entregado" || e.status_entrega === "parcial";
                  const rejected = e.status_entrega === "rechazado";
                  return (
                    <div key={e.id} className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${done ? "bg-green-500/10" : rejected ? "bg-destructive/10" : "bg-muted/30"}`}>
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : rejected ? (
                        <Package className="w-4 h-4 text-destructive shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`flex-1 truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                        {(e.pedido as any)?.cliente?.nombre || "Cliente"}
                      </span>
                      <span className="text-xs text-muted-foreground">{(e.pedido as any)?.folio}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
