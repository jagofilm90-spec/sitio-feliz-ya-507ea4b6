import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Truck, Eye, Phone, Weight, User, Users, MapPin, Package
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RutaInfo {
  rutaId: string;
  folio: string;
  pesoTotalKg: number | null;
  vehiculo: { nombre: string; placa: string | null } | null;
  chofer: { nombre: string; telefono: string | null } | null;
  ayudante: { nombre: string; telefono: string | null } | null;
  ayudanteExterno: { nombre: string; telefono: string | null } | null;
  pedidos: PedidoEnRuta[];
}

interface PedidoEnRuta {
  id: string;
  folio: string;
  total: number;
  peso_total_kg: number | null;
  cliente: { nombre: string };
  sucursal?: { nombre: string; direccion?: string | null } | null;
  ordenEntrega: number;
}

function EmptyState() {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <Truck className="h-14 w-14 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">Sin pedidos en ruta</h3>
        <p className="text-muted-foreground text-sm">Los pedidos asignados a rutas aparecerán aquí</p>
      </CardContent>
    </Card>
  );
}

export function VendedorEnRutaTab({
  onVerDetalle,
}: {
  onVerDetalle: (pedidoId: string) => void;
}) {
  const [rutas, setRutas] = useState<RutaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnRuta = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get en_ruta pedidos for this vendor with their entregas/rutas
      const { data: entregas, error } = await supabase
        .from("entregas")
        .select(`
          id, orden_entrega, ruta_id,
          pedido:pedidos!inner(
            id, folio, total, peso_total_kg, vendedor_id, status,
            cliente:clientes(nombre),
            sucursal:cliente_sucursales(nombre, direccion)
          ),
          ruta:rutas!inner(
            id, folio, peso_total_kg, status,
            vehiculo_id, chofer_id, ayudante_id, ayudante_externo_id
          )
        `)
        .eq("pedido.vendedor_id", user.id)
        .eq("pedido.status", "en_ruta")
        .eq("ruta.status", "en_curso");

      if (error) throw error;
      if (!entregas || entregas.length === 0) {
        setRutas([]);
        return;
      }

      // Group by ruta
      const rutaMap = new Map<string, any>();
      for (const e of entregas) {
        const ruta = e.ruta as any;
        const pedido = e.pedido as any;
        if (!rutaMap.has(ruta.id)) {
          rutaMap.set(ruta.id, {
            ruta,
            pedidos: [],
          });
        }
        rutaMap.get(ruta.id).pedidos.push({
          ...pedido,
          cliente: pedido.cliente || { nombre: "Sin cliente" },
          sucursal: pedido.sucursal || null,
          ordenEntrega: e.orden_entrega,
        });
      }

      // Fetch vehicle, chofer, ayudante details
      const rutaInfos: RutaInfo[] = [];
      for (const [, val] of rutaMap) {
        const ruta = val.ruta;
        
        // Fetch in parallel
        const [vehiculoRes, choferRes, ayudanteRes, ayudanteExtRes] = await Promise.all([
          ruta.vehiculo_id
            ? supabase.from("vehiculos").select("nombre, placa").eq("id", ruta.vehiculo_id).single()
            : Promise.resolve({ data: null }),
          supabase.from("empleados").select("nombre_completo, telefono").eq("id", ruta.chofer_id).single(),
          ruta.ayudante_id
            ? supabase.from("empleados").select("nombre_completo, telefono").eq("id", ruta.ayudante_id).single()
            : Promise.resolve({ data: null }),
          ruta.ayudante_externo_id
            ? supabase.from("ayudantes_externos").select("nombre_completo, telefono").eq("id", ruta.ayudante_externo_id).single()
            : Promise.resolve({ data: null }),
        ]);

        rutaInfos.push({
          rutaId: ruta.id,
          folio: ruta.folio,
          pesoTotalKg: ruta.peso_total_kg,
          vehiculo: vehiculoRes.data ? { nombre: vehiculoRes.data.nombre, placa: vehiculoRes.data.placa } : null,
          chofer: choferRes.data ? { nombre: choferRes.data.nombre_completo, telefono: choferRes.data.telefono } : null,
          ayudante: ayudanteRes.data ? { nombre: (ayudanteRes.data as any).nombre_completo, telefono: (ayudanteRes.data as any).telefono } : null,
          ayudanteExterno: ayudanteExtRes.data ? { nombre: (ayudanteExtRes.data as any).nombre_completo, telefono: (ayudanteExtRes.data as any).telefono } : null,
          pedidos: val.pedidos.sort((a: any, b: any) => a.ordenEntrega - b.ordenEntrega),
        });
      }

      setRutas(rutaInfos);
    } catch (error) {
      console.error("Error fetching en ruta:", error);
      toast.error("Error al cargar pedidos en ruta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnRuta();
    const ch = supabase
      .channel("vendedor-en-ruta-tab")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchEnRuta)
      .on("postgres_changes", { event: "*", schema: "public", table: "rutas" }, fetchEnRuta)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas" }, fetchEnRuta)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (rutas.length === 0) return <EmptyState />;

  return (
    <div className="space-y-5 pt-1">
      {rutas.map((ruta) => (
        <div key={ruta.rutaId} className="space-y-2">
          {/* Route header with vehicle, driver & helpers */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-3">
              {/* Vehicle & total weight */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-blue-800">
                    {ruta.vehiculo ? `${ruta.vehiculo.nombre}` : "Sin vehículo"}
                  </span>
                  {ruta.vehiculo?.placa && (
                    <Badge variant="secondary" className="text-xs">{ruta.vehiculo.placa}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-bold text-blue-700">
                  <Weight className="h-4 w-4" />
                  <span>{(ruta.pesoTotalKg ?? 0).toFixed(1)} kg total</span>
                </div>
              </div>

              {/* Driver */}
              {ruta.chofer && (
                <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-sm font-semibold">Chofer: </span>
                      <span className="text-sm">{ruta.chofer.nombre}</span>
                    </div>
                  </div>
                  {ruta.chofer.telefono && (
                    <a
                      href={`tel:${ruta.chofer.telefono}`}
                      className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {ruta.chofer.telefono}
                    </a>
                  )}
                </div>
              )}

              {/* Helpers */}
              {(ruta.ayudante || ruta.ayudanteExterno) && (
                <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                  <Users className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {ruta.ayudante && (
                      <div className="flex items-center gap-1.5">
                        <span>{ruta.ayudante.nombre}</span>
                        {ruta.ayudante.telefono && (
                          <a href={`tel:${ruta.ayudante.telefono}`} className="text-green-700 hover:underline flex items-center gap-0.5">
                            <Phone className="h-3 w-3" /> {ruta.ayudante.telefono}
                          </a>
                        )}
                      </div>
                    )}
                    {ruta.ayudanteExterno && (
                      <div className="flex items-center gap-1.5">
                        <span>{ruta.ayudanteExterno.nombre} <Badge variant="outline" className="text-[10px] ml-1">Ext</Badge></span>
                        {ruta.ayudanteExterno.telefono && (
                          <a href={`tel:${ruta.ayudanteExterno.telefono}`} className="text-green-700 hover:underline flex items-center gap-0.5">
                            <Phone className="h-3 w-3" /> {ruta.ayudanteExterno.telefono}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-blue-600">
                {ruta.pedidos.length} pedido{ruta.pedidos.length !== 1 ? "s" : ""} en esta ruta
              </div>
            </CardContent>
          </Card>

          {/* Orders in this route */}
          <div className="space-y-2 pl-2">
            {ruta.pedidos.map((p, idx) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onVerDetalle(p.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{p.cliente.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{p.folio}</span>
                        <Badge className="text-[10px] bg-blue-500 h-5">
                          <MapPin className="h-2.5 w-2.5 mr-0.5" />
                          Entrega #{p.ordenEntrega}
                        </Badge>
                        {p.peso_total_kg && p.peso_total_kg > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Weight className="h-3 w-3" /> {p.peso_total_kg.toFixed(1)} kg
                          </span>
                        )}
                      </div>
                      {p.sucursal?.direccion && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{p.sucursal.direccion}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{formatCurrency(p.total)}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onVerDetalle(p.id); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
