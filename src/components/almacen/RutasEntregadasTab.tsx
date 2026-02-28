import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Truck, User, CheckCircle2, Clock, Package, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface RutaEntregada {
  id: string;
  folio: string;
  fecha_ruta: string;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  chofer: { nombre_completo: string } | null;
  vehiculo: { nombre: string; placa: string } | null;
  entregas: {
    id: string;
    status_entrega: string | null;
    hora_entrega_real: string | null;
    orden_entrega: number | null;
    pedido: {
      folio: string;
      cliente: { nombre: string } | null;
    } | null;
  }[];
}

export const RutasEntregadasTab = () => {
  const [rutas, setRutas] = useState<RutaEntregada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const loadRutas = useCallback(async () => {
    setLoading(true);
    const desde = format(dateRange.from, "yyyy-MM-dd");
    const hasta = format(dateRange.to, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("rutas")
      .select(`
        id, folio, fecha_ruta, fecha_hora_inicio, fecha_hora_fin,
        chofer:empleados!rutas_chofer_id_fkey(nombre_completo),
        vehiculo:vehiculos(nombre, placa),
        entregas(id, status_entrega, hora_entrega_real, orden_entrega, pedido:pedidos(folio, cliente:clientes(nombre)))
      `)
      .eq("status", "completada")
      .gte("fecha_ruta", desde)
      .lte("fecha_ruta", hasta)
      .order("fecha_hora_fin", { ascending: false });

    if (!error) setRutas((data as any[]) || []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { loadRutas(); }, [loadRutas]);

  return (
    <div className="space-y-4 p-4">
      {/* Date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(dateRange.from, "dd MMM", { locale: es })} — {format(dateRange.to, "dd MMM yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from) {
                  setDateRange({ from: range.from, to: range.to || range.from });
                }
              }}
              locale={es}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
        <span className="text-sm text-muted-foreground">{rutas.length} rutas</span>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : rutas.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay rutas completadas en este periodo</p>
        </div>
      ) : (
        rutas.map(ruta => {
          const entregados = ruta.entregas.filter(e => e.status_entrega === "entregado").length;
          const parciales = ruta.entregas.filter(e => e.status_entrega === "parcial").length;
          const rechazados = ruta.entregas.filter(e => e.status_entrega === "rechazado").length;
          const sorted = [...ruta.entregas].sort((a, b) => (a.orden_entrega || 0) - (b.orden_entrega || 0));

          return (
            <Card key={ruta.id} className="border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{ruta.folio}</span>
                    <Badge className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Completada
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(ruta.fecha_ruta), "dd/MM/yyyy")}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {ruta.chofer?.nombre_completo || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {ruta.vehiculo ? `${ruta.vehiculo.nombre} · ${ruta.vehiculo.placa}` : "—"}
                  </span>
                  {ruta.fecha_hora_fin && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Finalizó {new Date(ruta.fecha_hora_fin).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {/* Summary badges */}
                <div className="flex gap-2 mb-2">
                  {entregados > 0 && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700">
                      {entregados} entregados
                    </Badge>
                  )}
                  {parciales > 0 && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                      {parciales} parciales
                    </Badge>
                  )}
                  {rechazados > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      {rechazados} rechazados
                    </Badge>
                  )}
                </div>

                {/* Delivery list */}
                <div className="space-y-1">
                  {sorted.map((e, idx) => {
                    const statusIcon = e.status_entrega === "entregado"
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      : e.status_entrega === "rechazado"
                      ? <Package className="w-4 h-4 text-destructive shrink-0" />
                      : <Package className="w-4 h-4 text-yellow-500 shrink-0" />;

                    return (
                      <div key={e.id} className="flex items-center gap-2 text-sm px-2 py-1 bg-muted/30 rounded">
                        {statusIcon}
                        <span className="text-xs font-semibold text-muted-foreground w-14 shrink-0">
                          Pedido {idx + 1}
                        </span>
                        <span className="flex-1 truncate">{(e.pedido as any)?.cliente?.nombre || "Cliente"}</span>
                        <span className="text-xs text-muted-foreground font-mono">{(e.pedido as any)?.folio}</span>
                        {e.hora_entrega_real && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(e.hora_entrega_real).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
