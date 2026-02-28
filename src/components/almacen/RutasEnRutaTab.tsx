import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Truck, User, MapPin, CheckCircle2, Clock, Package, Navigation, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ChoferMapDialog } from "./ChoferMapDialog";

interface EntregaStatus {
  id: string;
  status_entrega: string | null;
  orden_entrega: number | null;
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
  chofer_id: string | null;
  chofer: { nombre_completo: string } | null;
  vehiculo: { nombre: string; placa: string } | null;
  entregas: EntregaStatus[];
}

export const RutasEnRutaTab = () => {
  const [rutas, setRutas] = useState<RutaEnRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapRuta, setMapRuta] = useState<{ rutaId: string; choferNombre: string } | null>(null);

  const loadRutas = useCallback(async () => {
    // Include all en_curso routes (not just today) so past incomplete routes remain visible
    const { data, error } = await supabase
      .from("rutas")
      .select(`
        id, folio, fecha_ruta, fecha_hora_inicio, chofer_id,
        chofer:empleados!rutas_chofer_id_fkey(nombre_completo),
        vehiculo:vehiculos(nombre, placa),
        entregas(id, status_entrega, orden_entrega, pedido:pedidos(folio, cliente:clientes(nombre)))
      `)
      .eq("status", "en_curso")
      .order("fecha_hora_inicio", { ascending: true });

    if (!error) setRutas((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRutas(); }, [loadRutas]);

  // Realtime subscription for delivery updates + auto-complete
  useEffect(() => {
    const channel = supabase
      .channel("entregas-en-ruta-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "entregas" }, () => {
        loadRutas();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rutas" }, () => {
        loadRutas();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRutas]);

  if (loading) {
    return <div className="p-4 space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
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
        const sorted = [...ruta.entregas].sort((a, b) => (a.orden_entrega || 0) - (b.orden_entrega || 0));

        return (
          <Card key={ruta.id}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{ruta.folio}</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
                    <Truck className="w-3 h-3 mr-1" /> En Ruta
                  </Badge>
                </div>
                <span className="text-sm font-mono font-semibold">
                  {entregadas}/{total}
                </span>
              </div>

              <Progress value={pct} className="mb-3 h-2" />

              {/* Chofer + Vehiculo + GPS button */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{ruta.chofer?.nombre_completo || "—"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-1"
                    onClick={() => setMapRuta({
                      rutaId: ruta.id,
                      choferNombre: ruta.chofer?.nombre_completo || "Chofer",
                    })}
                    title="Ver ubicación en mapa"
                  >
                    <Navigation className="w-4 h-4 text-blue-500" />
                  </Button>
                </div>
                <span className="flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  {ruta.vehiculo ? `${ruta.vehiculo.nombre} · ${ruta.vehiculo.placa}` : "—"}
                </span>
                {ruta.fecha_hora_inicio && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Salió {new Date(ruta.fecha_hora_inicio).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              {/* Individual pedidos */}
              <div className="space-y-1.5">
                {sorted.map((e, idx) => {
                  const done = e.status_entrega === "entregado" || e.status_entrega === "parcial";
                  const rejected = e.status_entrega === "rechazado";
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                        done ? "bg-green-500/10" : rejected ? "bg-destructive/10" : "bg-muted/40"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : rejected ? (
                        <Package className="w-5 h-5 text-destructive shrink-0" />
                      ) : (
                        <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
                        Pedido {idx + 1}
                      </span>
                      <span className={`flex-1 truncate ${done ? "line-through text-muted-foreground" : "font-medium"}`}>
                        {(e.pedido as any)?.cliente?.nombre || "Cliente"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{(e.pedido as any)?.folio}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Map dialog */}
      {mapRuta && (
        <ChoferMapDialog
          open={!!mapRuta}
          onOpenChange={(open) => !open && setMapRuta(null)}
          rutaId={mapRuta.rutaId}
          choferNombre={mapRuta.choferNombre}
        />
      )}
    </div>
  );
};
