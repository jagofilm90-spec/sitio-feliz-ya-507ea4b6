import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, Truck, User, Users, Weight, Clock, 
  ArrowRight, MapPin, CheckCircle2 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LiveIndicator } from "@/components/ui/live-indicator";

interface EntregaCarga {
  id: string;
  orden_entrega: number;
  status_entrega: string;
  pedido_folio: string;
  pedido_total: number;
  cliente_nombre: string;
  sucursal_nombre: string | null;
}

interface RutaEnCarga {
  id: string;
  folio: string;
  chofer_nombre: string;
  ayudante_nombre: string | null;
  vehiculo_nombre: string | null;
  peso_total_kg: number;
  total_productos: number;
  productos_cargados: number;
  porcentaje: number;
  entregas: EntregaCarga[];
}

export function VendedorEnCargaTab() {
  const [rutasEnCarga, setRutasEnCarga] = useState<RutaEnCarga[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRutasEnCarga = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find rutas that are being loaded (programada + have carga_productos but not completed)
      // and contain orders from this vendor
      const { data: entregas } = await supabase
        .from("entregas")
        .select(`
          id, orden_entrega, status_entrega, pedido_id,
          pedido:pedidos!inner(id, folio, total, vendedor_id, cliente:clientes(nombre), sucursal:cliente_sucursales(nombre)),
          ruta:rutas!inner(
            id, folio, status, peso_total_kg, carga_completada,
            chofer_id, ayudante_id,
            vehiculo:vehiculos!rutas_vehiculo_id_fkey(id, nombre)
          )
        `)
        .eq("pedido.vendedor_id", user.id)
        .in("ruta.status", ["programada"])
        .eq("ruta.carga_completada", false);

      if (!entregas || entregas.length === 0) {
        setRutasEnCarga([]);
        setLoading(false);
        return;
      }

      // Group by ruta
      const rutaMap = new Map<string, any>();
      const rutaIds = new Set<string>();
      const empleadoIds = new Set<string>();

      entregas.forEach((e: any) => {
        const ruta = e.ruta;
        if (!ruta) return;
        rutaIds.add(ruta.id);
        if (ruta.chofer_id) empleadoIds.add(ruta.chofer_id);
        if (ruta.ayudante_id) empleadoIds.add(ruta.ayudante_id);

        if (!rutaMap.has(ruta.id)) {
          rutaMap.set(ruta.id, {
            ...ruta,
            entregas: [],
          });
        }
        rutaMap.get(ruta.id).entregas.push({
          id: e.id,
          orden_entrega: e.orden_entrega,
          status_entrega: e.status_entrega || "pendiente",
          pedido_folio: e.pedido?.folio || "",
          pedido_total: e.pedido?.total || 0,
          cliente_nombre: e.pedido?.cliente?.nombre || "Sin cliente",
          sucursal_nombre: e.pedido?.sucursal?.nombre || null,
        });
      });

      // Get empleado names
      let empleadosMap: Record<string, string> = {};
      if (empleadoIds.size > 0) {
        const { data: empleados } = await supabase
          .from("empleados")
          .select("id, nombre_completo")
          .in("id", Array.from(empleadoIds));
        empleados?.forEach(emp => {
          empleadosMap[emp.id] = emp.nombre_completo;
        });
      }

      // Get carga_productos progress for each ruta
      const rutasResult: RutaEnCarga[] = [];

      for (const [rutaId, rutaData] of rutaMap) {
        const allEntregaIds = rutaData.entregas.map((e: any) => e.id);
        
        // Get ALL entregas for this ruta (not just vendor's) to calculate total progress
        const { data: allEntregas } = await supabase
          .from("entregas")
          .select("id")
          .eq("ruta_id", rutaId);
        
        const allEntregaIdsForRuta = (allEntregas || []).map(e => e.id);
        
        let totalProductos = 0;
        let productosCargados = 0;

        if (allEntregaIdsForRuta.length > 0) {
          const { data: carga } = await supabase
            .from("carga_productos")
            .select("id, cargado")
            .in("entrega_id", allEntregaIdsForRuta);
          
          totalProductos = carga?.length || 0;
          productosCargados = carga?.filter(c => c.cargado)?.length || 0;
        }

        const porcentaje = totalProductos > 0 
          ? Math.round((productosCargados / totalProductos) * 100) 
          : 0;

        // Sort entregas by orden_entrega
        rutaData.entregas.sort((a: any, b: any) => a.orden_entrega - b.orden_entrega);

        rutasResult.push({
          id: rutaId,
          folio: rutaData.folio,
          chofer_nombre: rutaData.chofer_id ? (empleadosMap[rutaData.chofer_id] || "Chofer") : "Sin chofer",
          ayudante_nombre: rutaData.ayudante_id ? (empleadosMap[rutaData.ayudante_id] || null) : null,
          vehiculo_nombre: rutaData.vehiculo?.nombre || null,
          peso_total_kg: rutaData.peso_total_kg || 0,
          total_productos: totalProductos,
          productos_cargados: productosCargados,
          porcentaje,
          entregas: rutaData.entregas,
        });
      }

      setRutasEnCarga(rutasResult);
    } catch (error) {
      console.error("Error fetching rutas en carga:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRutasEnCarga();

    const channel = supabase
      .channel("vendedor-en-carga-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "carga_productos" }, () => fetchRutasEnCarga())
      .on("postgres_changes", { event: "*", schema: "public", table: "rutas" }, () => fetchRutasEnCarga())
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas" }, () => fetchRutasEnCarga())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRutasEnCarga]);

  if (loading) {
    return (
      <div className="space-y-3 pt-1">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (rutasEnCarga.length === 0) {
    return (
      <Card className="border-dashed border-2 mt-1">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Package className="h-14 w-14 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Sin pedidos en carga</h3>
          <p className="text-muted-foreground text-sm">
            Cuando el almacén comience a cargar tus pedidos, verás el progreso aquí en tiempo real
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {rutasEnCarga.map(ruta => (
        <Card key={ruta.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LiveIndicator />
                  <span className="font-bold text-sm">{ruta.folio}</span>
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-300">
                    En carga
                  </Badge>
                </div>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{ruta.porcentaje}%</span>
              </div>

              {/* Progress bar */}
              <Progress value={ruta.porcentaje} className="h-3 bg-amber-100 dark:bg-amber-900" />
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {ruta.productos_cargados} de {ruta.total_productos} productos cargados
              </p>
            </div>

            {/* Info */}
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{ruta.vehiculo_nombre || "Sin vehículo"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{ruta.chofer_nombre}</span>
                </div>
                {ruta.ayudante_nombre && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{ruta.ayudante_nombre}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Weight className="h-3.5 w-3.5 shrink-0" />
                  <span>{ruta.peso_total_kg.toFixed(1)} kg</span>
                </div>
              </div>

              {/* Secuencia de entregas */}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Secuencia de entrega
                </p>
                <div className="space-y-1.5">
                  {ruta.entregas.map((entrega, idx) => (
                    <div
                      key={entrega.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {entrega.orden_entrega}
                      </div>
                      <span className="truncate flex-1 font-medium">{entrega.cliente_nombre}</span>
                      {entrega.sucursal_nombre && (
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {entrega.sucursal_nombre}
                        </span>
                      )}
                      <span className="text-xs font-semibold shrink-0">{formatCurrency(entrega.pedido_total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
