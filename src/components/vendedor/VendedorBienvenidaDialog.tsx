import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { 
  AlertTriangle, 
  Clock, 
  ShoppingCart,
  Wallet,
  ArrowRight,
  Cake,
  Package,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Ban
} from "lucide-react";

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
    if (hora < 12) return "¡Buenos días";
    if (hora < 18) return "¡Buenas tardes";
    return "¡Buenas noches";
  };

  const getTitulo = () => {
    if (esCumpleanos) {
      return "🎉 ¡Un día muy especial!";
    }
    return `👋 ${getSaludo()}, ${vendedorNombre}!`;
  };

  const calcularPorcentajeCambio = (anterior: number, nuevo: number) => {
    if (anterior === 0) return 0;
    return ((nuevo - anterior) / anterior) * 100;
  };

  const tieneAlertas = alertas.facturasVencidas > 0 || alertas.facturasPorVencer > 0 || alertas.pedidosPendientes > 0;
  const tieneNovedadesProductos = alertas.productosNuevos.length > 0 || alertas.cambiosPrecios.length > 0 || alertas.productosInhabilitados.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground">
                Cargando resumen...
              </div>
            ) : (
              <>
                {/* Sección especial de cumpleaños */}
                {esCumpleanos && (
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-indigo-500/20 border-2 border-pink-500/30 p-6 mb-2">
                    {/* Efectos decorativos */}
                    <div className="absolute -top-2 -right-2 text-4xl animate-bounce" style={{ animationDelay: "0.1s" }}>🎈</div>
                    <div className="absolute -bottom-1 -left-1 text-3xl animate-bounce" style={{ animationDelay: "0.3s" }}>🎉</div>
                    <div className="absolute top-1/2 -right-3 text-2xl animate-pulse">✨</div>
                    <div className="absolute top-0 left-1/4 text-2xl animate-pulse" style={{ animationDelay: "0.5s" }}>🎊</div>
                    
                    <div className="text-center space-y-3 relative z-10">
                      <div className="flex justify-center items-center gap-2">
                        <Cake className="h-10 w-10 text-pink-500 animate-bounce" />
                        <span className="text-5xl animate-bounce">🎂</span>
                        <Cake className="h-10 w-10 text-purple-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        ¡Feliz Cumpleaños, {vendedorNombre}!
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        El equipo de <span className="font-semibold text-primary">ALMASA</span> te desea un día lleno de éxitos y felicidad 🎊
                      </p>
                      <div className="flex justify-center gap-1 pt-1">
                        {["🌟", "💫", "⭐", "💫", "🌟"].map((emoji, i) => (
                          <span 
                            key={i} 
                            className="text-lg animate-pulse" 
                            style={{ animationDelay: `${i * 0.15}s` }}
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Novedades de Productos */}
                {tieneNovedadesProductos && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Novedades en Productos (últimas 48 horas)</h3>
                    </div>

                    {/* Productos nuevos */}
                    {alertas.productosNuevos.length > 0 && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium text-emerald-700 dark:text-emerald-400 text-sm">
                            {alertas.productosNuevos.length} producto{alertas.productosNuevos.length > 1 ? "s" : ""} nuevo{alertas.productosNuevos.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {alertas.productosNuevos.slice(0, 5).map((producto) => (
                            <div key={producto.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-muted-foreground font-mono text-xs">{producto.codigo}</span>
                                <span className="truncate">{producto.nombre}</span>
                              </div>
                              <span className="font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap ml-2">
                                {formatCurrency(producto.precio_venta)}
                              </span>
                            </div>
                          ))}
                          {alertas.productosNuevos.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{alertas.productosNuevos.length - 5} más...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cambios de precio */}
                    {alertas.cambiosPrecios.length > 0 && (
                      <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          <span className="font-medium text-violet-700 dark:text-violet-400 text-sm">
                            {alertas.cambiosPrecios.length} cambio{alertas.cambiosPrecios.length > 1 ? "s" : ""} de precio
                          </span>
                        </div>
                        <div className="space-y-2">
                          {alertas.cambiosPrecios.slice(0, 5).map((cambio, index) => {
                            const porcentaje = calcularPorcentajeCambio(cambio.precio_anterior, cambio.precio_nuevo);
                            const esAumento = porcentaje > 0;
                            return (
                              <div key={`${cambio.producto_id}-${index}`} className="text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground font-mono text-xs">{cambio.codigo}</span>
                                  <span className="truncate flex-1">{cambio.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 pl-4">
                                  <span className="text-muted-foreground line-through text-xs">
                                    {formatCurrency(cambio.precio_anterior)}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {formatCurrency(cambio.precio_nuevo)}
                                  </span>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs px-1.5 py-0 ${
                                      esAumento 
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    }`}
                                  >
                                    {esAumento ? (
                                      <TrendingUp className="h-3 w-3 mr-0.5" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 mr-0.5" />
                                    )}
                                    {porcentaje > 0 ? "+" : ""}{porcentaje.toFixed(1)}%
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                          {alertas.cambiosPrecios.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{alertas.cambiosPrecios.length - 5} más...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Productos inhabilitados */}
                    {alertas.productosInhabilitados.length > 0 && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="font-medium text-red-700 dark:text-red-400 text-sm">
                            {alertas.productosInhabilitados.length} producto{alertas.productosInhabilitados.length > 1 ? "s" : ""} descontinuado{alertas.productosInhabilitados.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {alertas.productosInhabilitados.slice(0, 5).map((producto) => (
                            <div key={producto.producto_id} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground font-mono text-xs">{producto.codigo}</span>
                              <span className="truncate line-through text-muted-foreground">{producto.nombre}</span>
                            </div>
                          ))}
                          {alertas.productosInhabilitados.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{alertas.productosInhabilitados.length - 5} más...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Separador si hay novedades y alertas */}
                {tieneNovedadesProductos && tieneAlertas && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      {esCumpleanos ? "Y sobre tus pendientes:" : "Pendientes importantes:"}
                    </p>
                  </div>
                )}

                {/* Mensaje inicial si no hay novedades */}
                {!tieneNovedadesProductos && (
                  <p className="text-muted-foreground">
                    {esCumpleanos 
                      ? (tieneAlertas ? "Pero antes, aquí tienes un resumen de pendientes:" : "¡Y además, no tienes pendientes urgentes hoy!")
                      : (tieneAlertas ? "Aquí tienes un resumen de pendientes importantes:" : "¡Excelente! No tienes pendientes urgentes hoy.")}
                  </p>
                )}

                <div className="space-y-3">
                  {/* Facturas vencidas */}
                  {alertas.facturasVencidas > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-destructive">
                          {alertas.facturasVencidas} factura{alertas.facturasVencidas > 1 ? "s" : ""} vencida{alertas.facturasVencidas > 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total: {formatCurrency(alertas.montoVencido)}
                        </p>
                      </div>
                      <Badge variant="destructive">{alertas.facturasVencidas}</Badge>
                    </div>
                  )}

                  {/* Facturas por vencer */}
                  {alertas.facturasPorVencer > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          {alertas.facturasPorVencer} factura{alertas.facturasPorVencer > 1 ? "s" : ""} por vencer
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Próximos 7 días: {formatCurrency(alertas.montoPorVencer)}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {alertas.facturasPorVencer}
                      </Badge>
                    </div>
                  )}

                  {/* Pedidos pendientes */}
                  {alertas.pedidosPendientes > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-700 dark:text-blue-400">
                          {alertas.pedidosPendientes} pedido{alertas.pedidosPendientes > 1 ? "s" : ""} pendiente{alertas.pedidosPendientes > 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          En proceso de entrega
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {alertas.pedidosPendientes}
                      </Badge>
                    </div>
                  )}

                  {/* Sin alertas */}
                  {!tieneAlertas && !tieneNovedadesProductos && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-green-700 dark:text-green-400">
                          Todo al corriente
                        </p>
                        <p className="text-sm text-muted-foreground">
                          No hay facturas vencidas ni pedidos pendientes
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {alertas.facturasVencidas > 0 || alertas.facturasPorVencer > 0 ? (
            <Button 
              onClick={() => { onIrCobranza(); onOpenChange(false); }}
              className="w-full"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Ir a Cobranza
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
          
          {alertas.pedidosPendientes > 0 ? (
            <Button 
              variant="outline"
              onClick={() => { onIrPedidos(); onOpenChange(false); }}
              className="w-full"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Pedidos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}

          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Continuar al panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
