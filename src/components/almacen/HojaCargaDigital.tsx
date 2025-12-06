import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  Truck,
  Calendar,
  Printer,
  Save
} from "lucide-react";
import { SugerenciaPEPS } from "./SugerenciaPEPS";

interface Ruta {
  id: string;
  fecha_ruta: string;
  carga_completada: boolean;
  vehiculo: {
    id: string;
    nombre: string;
    placa: string;
  } | null;
  chofer: {
    id: string;
    full_name: string;
  } | null;
  entregas: Array<{
    id: string;
    pedido: {
      id: string;
      folio: string;
      cliente: {
        id: string;
        nombre: string;
        codigo: string;
      };
      sucursal: {
        id: string;
        nombre: string;
      } | null;
    };
  }>;
}

interface ProductoCarga {
  id: string;
  entrega_id: string;
  pedido_detalle_id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  cantidad_solicitada: number;
  cantidad_cargada: number;
  cargado: boolean;
  lote_id: string | null;
  lote_sugerido: any | null;
  cliente_nombre: string;
  folio_pedido: string;
}

interface HojaCargaDigitalProps {
  ruta: Ruta;
  onBack: () => void;
  onComplete: () => void;
}

export const HojaCargaDigital = ({ ruta, onBack, onComplete }: HojaCargaDigitalProps) => {
  const [productos, setProductos] = useState<ProductoCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completando, setCompletando] = useState(false);

  useEffect(() => {
    loadProductosCarga();
  }, [ruta.id]);

  const loadProductosCarga = async () => {
    setLoading(true);
    try {
      // Get all pedido IDs from entregas
      const pedidoIds = ruta.entregas
        .filter(e => e.pedido)
        .map(e => e.pedido.id);

      if (pedidoIds.length === 0) {
        setProductos([]);
        setLoading(false);
        return;
      }

      // Get pedido details (without price fields - protected from warehouse users)
      const { data: detalles, error: detallesError } = await supabase
        .from("pedidos_detalles")
        .select(`
          id,
          pedido_id,
          producto_id,
          cantidad,
          producto:productos(id, codigo, nombre, unidad, kg_por_unidad)
        `)
        .in("pedido_id", pedidoIds);

      if (detallesError) throw detallesError;

      // Get existing carga_productos for this route's entregas
      const entregaIds = ruta.entregas.map(e => e.id);
      const { data: cargasExistentes, error: cargasError } = await supabase
        .from("carga_productos")
        .select("*")
        .in("entrega_id", entregaIds);

      if (cargasError) throw cargasError;

      // Build productos list
      const productosMap = new Map<string, ProductoCarga>();

      for (const entrega of ruta.entregas) {
        if (!entrega.pedido) continue;
        
        const detallesPedido = detalles?.filter(d => d.pedido_id === entrega.pedido.id) || [];
        
        for (const detalle of detallesPedido) {
          const cargaExistente = cargasExistentes?.find(
            c => c.entrega_id === entrega.id && c.pedido_detalle_id === detalle.id
          );
          
          const producto = detalle.producto as any;
          
          productosMap.set(`${entrega.id}-${detalle.id}`, {
            id: cargaExistente?.id || `new-${entrega.id}-${detalle.id}`,
            entrega_id: entrega.id,
            pedido_detalle_id: detalle.id,
            producto_id: detalle.producto_id,
            producto_codigo: producto?.codigo || "N/A",
            producto_nombre: producto?.nombre || "Producto desconocido",
            cantidad_solicitada: detalle.cantidad,
            cantidad_cargada: cargaExistente?.cantidad_cargada || detalle.cantidad,
            cargado: cargaExistente?.cargado || false,
            lote_id: cargaExistente?.lote_id || null,
            lote_sugerido: null,
            cliente_nombre: entrega.pedido.cliente?.nombre || "Cliente desconocido",
            folio_pedido: entrega.pedido.folio
          });
        }
      }

      const productosList = Array.from(productosMap.values());
      
      // Load PEPS suggestions for each product
      const productosConSugerencias = await Promise.all(
        productosList.map(async (p) => {
          const { data: lotes } = await supabase
            .from("inventario_lotes")
            .select("*")
            .eq("producto_id", p.producto_id)
            .gt("cantidad_disponible", 0)
            .order("fecha_caducidad", { ascending: true, nullsFirst: false })
            .order("fecha_entrada", { ascending: true })
            .limit(1);
          
          return {
            ...p,
            lote_sugerido: lotes?.[0] || null,
            lote_id: p.lote_id || lotes?.[0]?.id || null
          };
        })
      );

      setProductos(productosList.length > 0 ? productosList : productosList);
      setProductos(productosConSugerencias);
    } catch (error) {
      console.error("Error loading productos carga:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCargado = (productoKey: string) => {
    setProductos(prev => prev.map(p => {
      if (`${p.entrega_id}-${p.pedido_detalle_id}` === productoKey) {
        return { ...p, cargado: !p.cargado };
      }
      return p;
    }));
  };

  const handleCantidadChange = (productoKey: string, cantidad: number) => {
    setProductos(prev => prev.map(p => {
      if (`${p.entrega_id}-${p.pedido_detalle_id}` === productoKey) {
        return { ...p, cantidad_cargada: cantidad };
      }
      return p;
    }));
  };

  const handleGuardarProgreso = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      for (const producto of productos) {
        const isNew = producto.id.startsWith("new-");
        
        if (isNew) {
          // Insert new carga_producto
          await supabase
            .from("carga_productos")
            .insert({
              entrega_id: producto.entrega_id,
              pedido_detalle_id: producto.pedido_detalle_id,
              lote_id: producto.lote_id,
              cantidad_solicitada: producto.cantidad_solicitada,
              cantidad_cargada: producto.cantidad_cargada,
              cargado: producto.cargado,
              cargado_por: producto.cargado ? user.id : null,
              cargado_en: producto.cargado ? new Date().toISOString() : null
            });
        } else {
          // Update existing
          await supabase
            .from("carga_productos")
            .update({
              cantidad_cargada: producto.cantidad_cargada,
              cargado: producto.cargado,
              lote_id: producto.lote_id,
              cargado_por: producto.cargado ? user.id : null,
              cargado_en: producto.cargado ? new Date().toISOString() : null
            })
            .eq("id", producto.id);
        }
      }

      toast.success("Progreso guardado");
      loadProductosCarga();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar progreso");
    } finally {
      setSaving(false);
    }
  };

  const handleCompletarCarga = async () => {
    const pendientes = productos.filter(p => !p.cargado);
    if (pendientes.length > 0) {
      toast.error(`Hay ${pendientes.length} productos sin cargar`);
      return;
    }

    setCompletando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Save all products first
      await handleGuardarProgreso();

      // Mark route as complete
      const { error } = await supabase
        .from("rutas")
        .update({
          carga_completada: true,
          carga_completada_por: user.id,
          carga_completada_en: new Date().toISOString()
        })
        .eq("id", ruta.id);

      if (error) throw error;

      toast.success("Carga completada exitosamente");
      onComplete();
    } catch (error) {
      console.error("Error completing:", error);
      toast.error("Error al completar la carga");
    } finally {
      setCompletando(false);
    }
  };

  // Group products by client
  const productosPorCliente = productos.reduce((acc, p) => {
    const key = p.cliente_nombre;
    if (!acc[key]) {
      acc[key] = { folio: p.folio_pedido, productos: [] };
    }
    acc[key].productos.push(p);
    return acc;
  }, {} as Record<string, { folio: string; productos: ProductoCarga[] }>);

  const totalProductos = productos.length;
  const productosCompletados = productos.filter(p => p.cargado).length;
  const porcentajeCompletado = totalProductos > 0 
    ? Math.round((productosCompletados / totalProductos) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {ruta.vehiculo?.nombre || "Sin vehículo"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {ruta.vehiculo?.placa} • {format(new Date(ruta.fecha_ruta), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGuardarProgreso}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso de carga</span>
            <span className="text-sm text-muted-foreground">
              {productosCompletados} de {totalProductos} productos
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${porcentajeCompletado}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {porcentajeCompletado}% completado
          </p>
        </CardContent>
      </Card>

      {/* Products List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay productos para cargar</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta ruta no tiene pedidos con productos asociados
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {Object.entries(productosPorCliente).map(([clienteNombre, data]) => (
            <Card key={clienteNombre}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{clienteNombre}</CardTitle>
                    <CardDescription>Pedido: {data.folio}</CardDescription>
                  </div>
                  <Badge variant={
                    data.productos.every(p => p.cargado) ? "default" : "secondary"
                  }>
                    {data.productos.filter(p => p.cargado).length}/{data.productos.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.productos.map((producto) => {
                    const key = `${producto.entrega_id}-${producto.pedido_detalle_id}`;
                    return (
                      <div 
                        key={key}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          producto.cargado 
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" 
                            : "bg-background"
                        }`}
                      >
                        <Checkbox
                          checked={producto.cargado}
                          onCheckedChange={() => handleToggleCargado(key)}
                          className="h-5 w-5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {producto.producto_codigo}
                            </span>
                            <span className={`font-medium truncate ${
                              producto.cargado ? "line-through text-muted-foreground" : ""
                            }`}>
                              {producto.producto_nombre}
                            </span>
                          </div>
                          {producto.lote_sugerido && (
                            <SugerenciaPEPS lote={producto.lote_sugerido} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={producto.cantidad_cargada}
                            onChange={(e) => handleCantidadChange(key, Number(e.target.value))}
                            className="w-20 text-center"
                            min={0}
                          />
                          <span className="text-sm text-muted-foreground">
                            / {producto.cantidad_solicitada}
                          </span>
                          {producto.cantidad_cargada !== producto.cantidad_solicitada && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Complete Button */}
      {productos.length > 0 && !ruta.carga_completada && (
        <Card className="sticky bottom-4 border-primary">
          <CardContent className="py-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleCompletarCarga}
              disabled={completando || productosCompletados < totalProductos}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {completando ? "Completando..." : "Completar Carga"}
            </Button>
            {productosCompletados < totalProductos && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Marca todos los productos como cargados para completar
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
