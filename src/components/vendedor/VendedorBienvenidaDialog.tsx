import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedorNombre: string;
  onIrCobranza: () => void;
  onIrPedidos: () => void;
}

interface ProductoNuevo {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  created_at: string;
}

interface CambioPrecio {
  producto_id: string;
  codigo: string;
  nombre: string;
  precio_anterior: number;
  precio_nuevo: number;
  created_at: string;
}

interface ProductoInhabilitado {
  producto_id: string;
  codigo: string;
  nombre: string;
  created_at: string;
}

interface Alertas {
  facturasVencidas: number;
  montoVencido: number;
  facturasPorVencer: number;
  montoPorVencer: number;
  pedidosPendientes: number;
  productosNuevos: ProductoNuevo[];
  cambiosPrecios: CambioPrecio[];
  productosInhabilitados: ProductoInhabilitado[];
}

export function VendedorBienvenidaDialog({ 
  open, 
  onOpenChange, 
  vendedorNombre,
  onIrCobranza,
  onIrPedidos
}: Props) {
  const [alertas, setAlertas] = useState<Alertas>({
    facturasVencidas: 0,
    montoVencido: 0,
    facturasPorVencer: 0,
    montoPorVencer: 0,
    pedidosPendientes: 0,
    productosNuevos: [],
    cambiosPrecios: [],
    productosInhabilitados: []
  });
  const [loading, setLoading] = useState(true);
  const [esCumpleanos, setEsCumpleanos] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAlertas();
    }
  }, [open]);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar si es cumpleaños del vendedor
      const { data: empleado } = await supabase
        .from("empleados")
        .select("fecha_nacimiento")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empleado?.fecha_nacimiento) {
        const hoy = new Date();
        const fechaNac = new Date(empleado.fecha_nacimiento);
        const esHoyCumple = 
          hoy.getDate() === fechaNac.getUTCDate() && 
          hoy.getMonth() === fechaNac.getUTCMonth();
        setEsCumpleanos(esHoyCumple);
      }

      // Fecha de hace 48 horas (cubre fines de semana)
      const hace48Horas = new Date();
      hace48Horas.setHours(hace48Horas.getHours() - 48);

      // Obtener IDs de clientes del vendedor
      const { data: clientesIds } = await supabase
        .from("clientes")
        .select("id")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true);

      const ids = clientesIds?.map(c => c.id) || [];
      const hoy = new Date();
      const en7Dias = new Date();
      en7Dias.setDate(hoy.getDate() + 7);

      let facturasVencidas = 0;
      let montoVencido = 0;
      let facturasPorVencer = 0;
      let montoPorVencer = 0;
      let pedidosPendientesCount = 0;

      if (ids.length > 0) {
        // Facturas pendientes de esos clientes
        const { data: facturas } = await supabase
          .from("facturas")
          .select("total, fecha_vencimiento")
          .in("cliente_id", ids)
          .eq("pagada", false);

        (facturas || []).forEach(f => {
          if (f.fecha_vencimiento) {
            const fechaVenc = new Date(f.fecha_vencimiento);
            if (fechaVenc < hoy) {
              facturasVencidas++;
              montoVencido += f.total || 0;
            } else if (fechaVenc <= en7Dias) {
              facturasPorVencer++;
              montoPorVencer += f.total || 0;
            }
          }
        });

        // Pedidos pendientes (status = pendiente)
        const { count } = await supabase
          .from("pedidos")
          .select("id", { count: "exact", head: true })
          .eq("vendedor_id", user.id)
          .eq("status", "pendiente");

        pedidosPendientesCount = count || 0;
      }

      // Productos nuevos (últimas 48 horas) - independiente de clientes
      const { data: productosNuevos } = await supabase
        .from("productos")
        .select("id, codigo, nombre, precio_venta, created_at")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .gte("created_at", hace48Horas.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Cambios de precio (últimas 48 horas)
      const { data: cambiosPreciosData } = await supabase
        .from("productos_historial_precios")
        .select(`
          producto_id,
          precio_anterior,
          precio_nuevo,
          created_at,
          productos(codigo, nombre)
        `)
        .gte("created_at", hace48Horas.toISOString())
        .order("created_at", { ascending: false })
        .limit(15);

      // Productos inhabilitados (últimas 48 horas)
      const { data: productosInhabilitadosData } = await supabase
        .from("productos_historial_estado")
        .select(`
          producto_id,
          created_at,
          productos(codigo, nombre)
        `)
        .eq("activo_nuevo", false)
        .gte("created_at", hace48Horas.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Transformar cambios de precios
      const cambiosPreciosRaw: CambioPrecio[] = (cambiosPreciosData || [])
        .filter(c => c.productos)
        .map(c => ({
          producto_id: c.producto_id,
          codigo: (c.productos as any).codigo || "",
          nombre: (c.productos as any).nombre || "",
          precio_anterior: c.precio_anterior,
          precio_nuevo: c.precio_nuevo,
          created_at: c.created_at
        }));

      // Filtrar para obtener solo el último cambio por producto
      const obtenerUltimoCambioPorProducto = (cambios: CambioPrecio[]): CambioPrecio[] => {
        const ultimoPorProducto = new Map<string, CambioPrecio>();
        // Ya vienen ordenados por fecha descendente de la consulta
        cambios.forEach(cambio => {
          if (!ultimoPorProducto.has(cambio.producto_id)) {
            ultimoPorProducto.set(cambio.producto_id, cambio);
          }
        });
        return Array.from(ultimoPorProducto.values());
      };

      const cambiosPrecios = obtenerUltimoCambioPorProducto(cambiosPreciosRaw);

      // Transformar productos inhabilitados
      const productosInhabilitados: ProductoInhabilitado[] = (productosInhabilitadosData || [])
        .filter(p => p.productos)
        .map(p => ({
          producto_id: p.producto_id,
          codigo: (p.productos as any).codigo || "",
          nombre: (p.productos as any).nombre || "",
          created_at: p.created_at
        }));

      setAlertas({
        facturasVencidas,
        montoVencido,
        facturasPorVencer,
        montoPorVencer,
        pedidosPendientes: pedidosPendientesCount,
        productosNuevos: productosNuevos || [],
        cambiosPrecios,
        productosInhabilitados
      });
    } catch (error) {
      console.error("Error fetching alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Buenos días,";
    if (hora >= 12 && hora < 19) return "Buenas tardes,";
    return "Buenas noches,";
  };

  const calcularPorcentajeCambio = (anterior: number, nuevo: number) => {
    if (anterior === 0) return 0;
    return ((nuevo - anterior) / anterior) * 100;
  };

  const tieneAlertas = alertas.facturasVencidas > 0 || alertas.facturasPorVencer > 0 || alertas.pedidosPendientes > 0;
  const tieneNovedadesProductos = alertas.productosNuevos.length > 0 || alertas.cambiosPrecios.length > 0 || alertas.productosInhabilitados.length > 0;

  const pendientesItems = [
    ...(alertas.facturasVencidas > 0 ? [{ count: alertas.facturasVencidas, label: `factura${alertas.facturasVencidas > 1 ? "s" : ""} vencida${alertas.facturasVencidas > 1 ? "s" : ""} · ${formatCurrency(alertas.montoVencido)}`, action: () => { onIrCobranza(); onOpenChange(false); } }] : []),
    ...(alertas.facturasPorVencer > 0 ? [{ count: alertas.facturasPorVencer, label: `factura${alertas.facturasPorVencer > 1 ? "s" : ""} por vencer · ${formatCurrency(alertas.montoPorVencer)}`, action: () => { onIrCobranza(); onOpenChange(false); } }] : []),
    ...(alertas.pedidosPendientes > 0 ? [{ count: alertas.pedidosPendientes, label: `pedido${alertas.pedidosPendientes > 1 ? "s" : ""} pendiente${alertas.pedidosPendientes > 1 ? "s" : ""}`, action: () => { onIrPedidos(); onOpenChange(false); } }] : []),
  ];

  const novedadesItems = [
    ...(alertas.productosNuevos.length > 0 ? [{ count: alertas.productosNuevos.length, label: `producto${alertas.productosNuevos.length > 1 ? "s" : ""} nuevo${alertas.productosNuevos.length > 1 ? "s" : ""}` }] : []),
    ...(alertas.cambiosPrecios.length > 0 ? [{ count: alertas.cambiosPrecios.length, label: `cambio${alertas.cambiosPrecios.length > 1 ? "s" : ""} de precio` }] : []),
    ...(alertas.productosInhabilitados.length > 0 ? [{ count: alertas.productosInhabilitados.length, label: `producto${alertas.productosInhabilitados.length > 1 ? "s" : ""} descontinuado${alertas.productosInhabilitados.length > 1 ? "s" : ""}` }] : []),
  ];

  const firstName = vendedorNombre.split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[480px] max-h-[90vh] overflow-x-hidden !p-0 !gap-0 !rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,14,13,0.25)] !top-[50%] !translate-y-[-50%]">
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-6">
          <DialogDescription className="!text-[15px] text-ink-500 italic !mt-0">
            {getSaludo()}
          </DialogDescription>
          <DialogTitle className="!font-serif !text-[32px] !font-medium text-ink-900 !leading-tight !tracking-[-0.01em]">
            {firstName}.
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-220px)]">
          <div className="px-8 py-4">
            {loading ? (
              <div className="text-center py-6 text-ink-400 text-[14px]">
                Cargando resumen...
              </div>
            ) : (
              <>
                {/* Birthday — editorial */}
                {esCumpleanos && (
                  <p className="font-serif italic text-[18px] text-crimson-500 mb-6">
                    Feliz cumpleaños, {firstName}. Todo el equipo te desea un excelente día.
                  </p>
                )}

                {/* Novedades productos — editorial list */}
                {tieneNovedadesProductos && (
                  <div className="mb-6">
                    <p className="font-serif italic text-[15px] text-ink-500 mb-3">Novedades en productos.</p>
                    <div className="divide-y divide-ink-100">
                      {novedadesItems.map((item, i) => (
                        <div key={i} className="flex items-center py-2.5">
                          <span className="font-serif text-[18px] font-medium text-ink-900 tabular-nums w-10 text-left">
                            {item.count}
                          </span>
                          <span className="text-[13px] text-ink-600">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Detalle productos nuevos */}
                    {alertas.productosNuevos.length > 0 && (
                      <div className="mt-3 pl-10">
                        {alertas.productosNuevos.slice(0, 5).map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-1 text-[12px]">
                            <span className="text-ink-500 font-mono">{p.codigo}</span>
                            <span className="text-ink-600 flex-1 truncate mx-2">{p.nombre}</span>
                            <span className="text-ink-900 font-medium tabular-nums">{formatCurrency(p.precio_venta)}</span>
                          </div>
                        ))}
                        {alertas.productosNuevos.length > 5 && (
                          <p className="text-[11px] text-ink-400 mt-1">+{alertas.productosNuevos.length - 5} más</p>
                        )}
                      </div>
                    )}

                    {/* Detalle cambios de precio */}
                    {alertas.cambiosPrecios.length > 0 && (
                      <div className="mt-3 pl-10">
                        {alertas.cambiosPrecios.slice(0, 5).map((c, i) => {
                          const pct = calcularPorcentajeCambio(c.precio_anterior, c.precio_nuevo);
                          return (
                            <div key={`${c.producto_id}-${i}`} className="flex items-center justify-between py-1 text-[12px]">
                              <span className="text-ink-500 font-mono">{c.codigo}</span>
                              <span className="text-ink-600 flex-1 truncate mx-2">{c.nombre}</span>
                              <span className="text-ink-400 line-through tabular-nums">{formatCurrency(c.precio_anterior)}</span>
                              <span className="text-ink-900 font-medium tabular-nums ml-2">{formatCurrency(c.precio_nuevo)}</span>
                              <span className={`text-[10px] ml-1.5 ${pct > 0 ? "text-crimson-500" : "text-emerald-600"}`}>
                                {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                        {alertas.cambiosPrecios.length > 5 && (
                          <p className="text-[11px] text-ink-400 mt-1">+{alertas.cambiosPrecios.length - 5} más</p>
                        )}
                      </div>
                    )}

                    {/* Detalle inhabilitados */}
                    {alertas.productosInhabilitados.length > 0 && (
                      <div className="mt-3 pl-10">
                        {alertas.productosInhabilitados.slice(0, 5).map((p) => (
                          <div key={p.producto_id} className="flex items-center py-1 text-[12px]">
                            <span className="text-ink-400 font-mono">{p.codigo}</span>
                            <span className="text-ink-400 line-through flex-1 truncate mx-2">{p.nombre}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pendientes — editorial list */}
                {pendientesItems.length > 0 ? (
                  <div>
                    <p className="font-serif italic text-[15px] text-ink-500 mb-3">Pendientes.</p>
                    <div className="divide-y divide-ink-100">
                      {pendientesItems.map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          className="flex items-center w-full py-3 group hover:bg-ink-50/50 -mx-2 px-2 rounded transition-colors"
                        >
                          <span className="font-serif text-[24px] font-medium text-ink-900 tabular-nums w-10 text-left">
                            {item.count}
                          </span>
                          <span className="text-[14px] text-ink-700 flex-1 text-left">
                            {item.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : !tieneNovedadesProductos ? (
                  <div className="py-8 text-center">
                    <p className="font-serif italic text-[18px] text-ink-400">
                      Hoy no tienes pendientes.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-8 pb-8 pt-6">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-crimson-500 text-white hover:bg-crimson-600"
          >
            <span className="font-serif italic text-[15px]">Comenzar.</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
