import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/services/pushNotifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Truck,
  User,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { CargaProductosChecklist } from "./CargaProductosChecklist";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  peso_total_kg: number | null;
  carga_completada: boolean | null;
  vehiculo: {
    id: string;
    nombre: string;
    placas: string;
  } | null;
  chofer: {
    id: string;
    nombre_completo: string;
  } | null;
  entregas: {
    id: string;
    pedido_id: string;
  }[];
}

interface EntregaConProductos {
  id: string;
  orden_entrega: number;
  pedido: {
    id: string;
    folio: string;
    cliente: {
      nombre: string;
    };
    sucursal: {
      nombre: string;
    } | null;
  };
  productos: ProductoCarga[];
}

interface ProductoCarga {
  id: string;
  pedido_detalle_id: string;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
  cargado: boolean;
  lote_id: string | null;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    unidad_comercial: string;
  };
  lotes_disponibles: LoteDisponible[];
}

interface LoteDisponible {
  id: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
}

interface RutaCargaSheetProps {
  ruta: Ruta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCargaCompletada: () => void;
}

export const RutaCargaSheet = ({
  ruta,
  open,
  onOpenChange,
  onCargaCompletada,
}: RutaCargaSheetProps) => {
  const [entregas, setEntregas] = useState<EntregaConProductos[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmaDialogOpen, setFirmaDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadEntregasYProductos = async () => {
    setLoading(true);
    try {
      // Cargar entregas de la ruta
      const { data: entregasData, error: entregasError } = await supabase
        .from("entregas")
        .select(`
          id,
          orden_entrega,
          pedido:pedidos(
            id,
            folio,
            cliente:clientes(nombre),
            sucursal:cliente_sucursales(nombre)
          )
        `)
        .eq("ruta_id", ruta.id)
        .order("orden_entrega");

      if (entregasError) throw entregasError;

      // Para cada entrega, cargar productos de carga_productos o crearlos
      const entregasConProductos: EntregaConProductos[] = [];

      for (const entrega of entregasData || []) {
        // Buscar productos en carga_productos
        let { data: cargaProductos, error: cargaError } = await supabase
          .from("carga_productos")
          .select(`
            id,
            pedido_detalle_id,
            cantidad_solicitada,
            cantidad_cargada,
            cargado,
            lote_id
          `)
          .eq("entrega_id", entrega.id);

        if (cargaError) throw cargaError;

        // Si no hay registros, crearlos desde pedidos_detalles
        if (!cargaProductos || cargaProductos.length === 0) {
          const { data: detalles, error: detallesError } = await supabase
            .from("pedidos_detalles")
            .select("id, cantidad, producto_id")
            .eq("pedido_id", (entrega.pedido as any).id);

          if (detallesError) throw detallesError;

          if (detalles && detalles.length > 0) {
            const nuevosRegistros = detalles.map((d) => ({
              entrega_id: entrega.id,
              pedido_detalle_id: d.id,
              cantidad_solicitada: d.cantidad,
              cantidad_cargada: 0,
              cargado: false,
            }));

            const { data: insertados, error: insertError } = await supabase
              .from("carga_productos")
              .insert(nuevosRegistros)
              .select();

            if (insertError) throw insertError;
            cargaProductos = insertados;
          }
        }

        // Cargar info de productos y lotes disponibles
        const productosConInfo: ProductoCarga[] = [];

        for (const cp of cargaProductos || []) {
          // Obtener info del producto desde pedidos_detalles
          const { data: detalle } = await supabase
            .from("pedidos_detalles")
            .select(`
              producto:productos(
                id,
                codigo,
                nombre,
                unidad_comercial
              )
            `)
            .eq("id", cp.pedido_detalle_id)
            .single();

          // Obtener lotes disponibles para FIFO
          const { data: lotes } = await supabase
            .from("inventario_lotes")
            .select("id, lote_referencia, cantidad_disponible, fecha_caducidad")
            .eq("producto_id", (detalle?.producto as any)?.id)
            .gt("cantidad_disponible", 0)
            .order("fecha_caducidad", { ascending: true, nullsFirst: false });

          productosConInfo.push({
            id: cp.id,
            pedido_detalle_id: cp.pedido_detalle_id,
            cantidad_solicitada: cp.cantidad_solicitada,
            cantidad_cargada: cp.cantidad_cargada,
            cargado: cp.cargado || false,
            lote_id: cp.lote_id,
            producto: (detalle?.producto as any) || {
              id: "",
              codigo: "N/A",
              nombre: "Producto no encontrado",
              unidad_comercial: "unidad",
            },
            lotes_disponibles: lotes || [],
          });
        }

        entregasConProductos.push({
          id: entrega.id,
          orden_entrega: entrega.orden_entrega,
          pedido: entrega.pedido as any,
          productos: productosConInfo,
        });
      }

      setEntregas(entregasConProductos);
    } catch (error) {
      console.error("Error cargando entregas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && ruta.id) {
      loadEntregasYProductos();
    }
  }, [open, ruta.id]);

  const handleProductoToggle = async (
    cargaId: string,
    cargado: boolean,
    cantidadCargada: number,
    loteId: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("carga_productos")
        .update({
          cargado,
          cantidad_cargada: cantidadCargada,
          lote_id: loteId,
          cargado_por: cargado ? user?.id : null,
          cargado_en: cargado ? new Date().toISOString() : null,
        })
        .eq("id", cargaId);

      if (error) throw error;

      // Actualizar estado local
      setEntregas((prev) =>
        prev.map((e) => ({
          ...e,
          productos: e.productos.map((p) =>
            p.id === cargaId
              ? { ...p, cargado, cantidad_cargada: cantidadCargada, lote_id: loteId }
              : p
          ),
        }))
      );
    } catch (error) {
      console.error("Error actualizando producto:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive",
      });
    }
  };

  const todosLosProdutosCargados = entregas.every((e) =>
    e.productos.every((p) => p.cargado)
  );

  const totalProductos = entregas.reduce((acc, e) => acc + e.productos.length, 0);
  const productosCargados = entregas.reduce(
    (acc, e) => acc + e.productos.filter((p) => p.cargado).length,
    0
  );
  const porcentajeCarga = totalProductos > 0 
    ? Math.round((productosCargados / totalProductos) * 100) 
    : 0;

  const handleCompletarCarga = async (firmaBase64: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Actualizar ruta como carga completada
      const { error: rutaError } = await supabase
        .from("rutas")
        .update({
          carga_completada: true,
          carga_completada_por: user?.id,
          carga_completada_en: new Date().toISOString(),
          status: "cargada",
        })
        .eq("id", ruta.id);

      if (rutaError) throw rutaError;

      // Enviar notificación push al chofer
      if (ruta.chofer?.id) {
        await sendPushNotification({
          user_ids: [ruta.chofer.id],
          title: "🚚 Ruta lista para salir",
          body: `La carga de la ruta ${ruta.folio} está completa. ¡Tu camión está listo!`,
          data: {
            type: "carga_completa",
            ruta_id: ruta.id,
            folio: ruta.folio,
          },
        });
      }

      toast({
        title: "Carga completada",
        description: "El chofer ha sido notificado",
      });

      onCargaCompletada();
    } catch (error) {
      console.error("Error completando carga:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la carga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setFirmaDialogOpen(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <SheetTitle className="text-xl">{ruta.folio}</SheetTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {ruta.vehiculo?.nombre}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {ruta.chofer?.nombre_completo}
                  </span>
                </div>
              </div>
              <Badge variant={ruta.carga_completada ? "default" : "secondary"}>
                {porcentajeCarga}% cargado
              </Badge>
            </div>
          </SheetHeader>

          {/* Progress bar */}
          <div className="h-2 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${porcentajeCarga}%` }}
            />
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {entregas.map((entrega) => (
                  <div key={entrega.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        #{entrega.orden_entrega}
                      </Badge>
                      <span className="font-medium">
                        {entrega.pedido.cliente.nombre}
                      </span>
                      {entrega.pedido.sucursal && (
                        <span className="text-sm text-muted-foreground">
                          - {entrega.pedido.sucursal.nombre}
                        </span>
                      )}
                    </div>
                    <CargaProductosChecklist
                      productos={entrega.productos}
                      onToggle={handleProductoToggle}
                      disabled={ruta.carga_completada || false}
                    />
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer con botón de completar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              disabled={!todosLosProdutosCargados || ruta.carga_completada || saving}
              onClick={() => setFirmaDialogOpen(true)}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {ruta.carga_completada
                ? "Carga completada"
                : "Firmar y completar carga"}
            </Button>
            {!todosLosProdutosCargados && !ruta.carga_completada && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Marca todos los productos como cargados para continuar
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <FirmaDigitalDialog
        open={firmaDialogOpen}
        onOpenChange={setFirmaDialogOpen}
        onConfirm={handleCompletarCarga}
        titulo={`Confirmar carga de ${ruta.folio}`}
        loading={saving}
      />
    </>
  );
};
