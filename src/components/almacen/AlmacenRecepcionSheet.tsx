import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Camera,
  CheckCircle2,
  User,
  FileText,
  Truck,
  Hash,
  Warehouse,
  Calendar
} from "lucide-react";
import { EvidenciaCapture, EvidenciasPreviewGrid } from "@/components/compras/EvidenciaCapture";

interface EntregaCompra {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  fecha_entrega_real: string | null;
  status: string;
  notas: string | null;
  orden_compra: {
    id: string;
    folio: string;
    proveedor: {
      id: string;
      nombre: string;
    };
  };
}

interface ProductoEntrega {
  id: string;
  producto_id: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  // NOTA: precio_unitario_compra REMOVIDO intencionalmente
  // Los almacenistas NO deben ver precios - se consulta solo al guardar
  producto: {
    id: string;
    codigo: string;
    nombre: string;
  };
}

interface Evidencia {
  tipo: string;
  file: File;
  preview: string;
}

interface Bodega {
  id: string;
  nombre: string;
  es_externa: boolean;
}

interface AlmacenRecepcionSheetProps {
  entrega: EntregaCompra;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecepcionCompletada: () => void;
}

export const AlmacenRecepcionSheet = ({
  entrega,
  open,
  onOpenChange,
  onRecepcionCompletada
}: AlmacenRecepcionSheetProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<ProductoEntrega[]>([]);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [fechasCaducidad, setFechasCaducidad] = useState<Record<string, string>>({});
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [nombreEntrega, setNombreEntrega] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [notas, setNotas] = useState("");
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && entrega) {
      loadProductos();
      loadBodegas();
    }
  }, [open, entrega]);

  const loadBodegas = async () => {
    const { data } = await supabase
      .from("bodegas")
      .select("id, nombre, es_externa")
      .eq("activo", true)
      .order("nombre");
    
    if (data) {
      setBodegas(data);
      // Seleccionar Bodega 1 por defecto
      const bodega1 = data.find(b => b.nombre === "Bodega 1");
      if (bodega1) setBodegaSeleccionada(bodega1.id);
    }
  };

  const loadProductos = async () => {
    setLoading(true);
    try {
      // NOTA: NO consultamos precio_unitario_compra aquí
      // Los almacenistas no deben ver precios - se consulta solo al guardar
      const { data, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          producto_id,
          cantidad_ordenada,
          cantidad_recibida,
          producto:productos(id, codigo, nombre)
        `)
        .eq("orden_compra_id", entrega.orden_compra.id);

      if (error) throw error;

      const productosData = (data as any[]) || [];
      setProductos(productosData);
      
      // Inicializar cantidades con lo que falta por recibir
      const cantidades: Record<string, number> = {};
      const fechas: Record<string, string> = {};
      productosData.forEach(p => {
        const faltante = p.cantidad_ordenada - p.cantidad_recibida;
        cantidades[p.id] = Math.max(0, faltante);
        fechas[p.id] = ""; // Sin fecha de caducidad por defecto
      });
      setCantidadesRecibidas(cantidades);
      setFechasCaducidad(fechas);
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCantidadChange = (detalleId: string, cantidad: number) => {
    setCantidadesRecibidas(prev => ({
      ...prev,
      [detalleId]: cantidad
    }));
  };

  const handleFechaCaducidadChange = (detalleId: string, fecha: string) => {
    setFechasCaducidad(prev => ({
      ...prev,
      [detalleId]: fecha
    }));
  };

  const handleEvidenciaCapture = (tipo: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setEvidencias(prev => [...prev, { tipo, file, preview }]);
  };

  const handleRemoveEvidencia = (index: number) => {
    setEvidencias(prev => {
      const newEvidencias = [...prev];
      URL.revokeObjectURL(newEvidencias[index].preview);
      newEvidencias.splice(index, 1);
      return newEvidencias;
    });
  };

  const handleGuardarRecepcion = async () => {
    if (!nombreEntrega.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa el nombre de quien entrega",
        variant: "destructive"
      });
      return;
    }

    if (!bodegaSeleccionada) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona la bodega de destino",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const loteReferencia = `REC-${entrega.orden_compra.folio}-${entrega.numero_entrega}`;

      // 1. Actualizar cantidades recibidas y crear lotes en inventario
      for (const [detalleId, cantidad] of Object.entries(cantidadesRecibidas)) {
        if (cantidad > 0) {
          const producto = productos.find(p => p.id === detalleId);
          if (producto) {
            // Actualizar cantidad recibida en orden de compra
            const nuevaCantidadRecibida = producto.cantidad_recibida + cantidad;
            await supabase
              .from("ordenes_compra_detalles")
              .update({ cantidad_recibida: nuevaCantidadRecibida })
              .eq("id", detalleId);

            // CONSULTAR PRECIO SOLO AL MOMENTO DE GUARDAR
            // Esto asegura que el precio nunca esté en el estado del componente React
            const { data: detalleConPrecio } = await supabase
              .from("ordenes_compra_detalles")
              .select("precio_unitario_compra")
              .eq("id", detalleId)
              .single();
            
            const precioCompra = detalleConPrecio?.precio_unitario_compra || 0;

            // CREAR LOTE EN INVENTARIO
            const fechaCaducidad = fechasCaducidad[detalleId] || null;
            const { error: loteError } = await supabase
              .from("inventario_lotes")
              .insert({
                producto_id: producto.producto_id,
                cantidad_disponible: cantidad,
                precio_compra: precioCompra,
                fecha_entrada: new Date().toISOString(),
                fecha_caducidad: fechaCaducidad || null,
                lote_referencia: loteReferencia,
                orden_compra_id: entrega.orden_compra.id,
                bodega_id: bodegaSeleccionada,
                notas: `Recibido de ${entrega.orden_compra.proveedor?.nombre || 'proveedor'} por ${nombreEntrega}`
              });

            if (loteError) {
              console.error("Error creando lote:", loteError);
              throw loteError;
            }

            // ACTUALIZAR STOCK DEL PRODUCTO
            const { data: productoActual } = await supabase
              .from("productos")
              .select("stock_actual")
              .eq("id", producto.producto_id)
              .single();

            const nuevoStock = (productoActual?.stock_actual || 0) + cantidad;
            await supabase
              .from("productos")
              .update({ stock_actual: nuevoStock })
              .eq("id", producto.producto_id);
          }
        }
      }

      // 2. Actualizar status de la entrega
      await supabase
        .from("ordenes_compra_entregas")
        .update({
          status: "recibida",
          fecha_entrega_real: new Date().toISOString().split("T")[0],
          notas: `Recibido por: ${nombreEntrega}${numeroSello ? `. Sello: ${numeroSello}` : ""}${notas ? `. ${notas}` : ""}`
        })
        .eq("id", entrega.id);

      // 3. Subir evidencias
      for (const evidencia of evidencias) {
        const fileName = `${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(fileName, evidencia.file);

        if (uploadError) {
          console.error("Error subiendo evidencia:", uploadError);
        }
      }

      toast({
        title: "Recepción registrada",
        description: "Mercancía ingresada al inventario correctamente"
      });

      onRecepcionCompletada();
    } catch (error) {
      console.error("Error guardando recepción:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la recepción",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recepción: {entrega.orden_compra?.folio}
          </SheetTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="w-4 h-4" />
            {entrega.orden_compra?.proveedor?.nombre}
            <Badge variant="outline">Entrega #{entrega.numero_entrega}</Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bodega destino */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4" />
                  Bodega destino *
                </Label>
                <Select value={bodegaSeleccionada} onValueChange={setBodegaSeleccionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodegas.map(bodega => (
                      <SelectItem key={bodega.id} value={bodega.id}>
                        {bodega.nombre} {bodega.es_externa && "(Externa)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Productos a recibir - CON FECHA CADUCIDAD */}
              <div>
                <h3 className="font-medium mb-3">Productos a recibir</h3>
                <div className="space-y-3">
                  {productos.map((producto) => {
                    const faltante = producto.cantidad_ordenada - producto.cantidad_recibida;
                    return (
                      <Card key={producto.id}>
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{producto.producto?.nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                Código: {producto.producto?.codigo}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Ordenado: {producto.cantidad_ordenada} | 
                                Recibido: {producto.cantidad_recibida} | 
                                Faltante: {faltante}
                              </p>
                            </div>
                            <div className="w-24">
                              <Label className="text-xs text-muted-foreground">Cantidad</Label>
                              <Input
                                type="number"
                                min={0}
                                max={faltante}
                                value={cantidadesRecibidas[producto.id] || 0}
                                onChange={(e) => handleCantidadChange(producto.id, Number(e.target.value))}
                                className="text-center"
                              />
                            </div>
                          </div>
                          {/* Fecha de caducidad opcional */}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Input
                              type="date"
                              value={fechasCaducidad[producto.id] || ""}
                              onChange={(e) => handleFechaCaducidadChange(producto.id, e.target.value)}
                              className="flex-1"
                              placeholder="Fecha caducidad (opcional)"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Datos de control */}
              <div className="space-y-4">
                <h3 className="font-medium">Datos de control</h3>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombre de quien entrega *
                  </Label>
                  <Input
                    value={nombreEntrega}
                    onChange={(e) => setNombreEntrega(e.target.value)}
                    placeholder="Nombre del transportista o representante"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Número de sello
                  </Label>
                  <Input
                    value={numeroSello}
                    onChange={(e) => setNumeroSello(e.target.value)}
                    placeholder="Número del sello de seguridad"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notas adicionales
                  </Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones de la recepción"
                    rows={2}
                  />
                </div>
              </div>

              {/* Evidencias fotográficas */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Evidencias fotográficas
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <EvidenciaCapture
                    tipo="sello"
                    onCapture={(file) => handleEvidenciaCapture("sello", file)}
                  />
                  <EvidenciaCapture
                    tipo="identificacion"
                    onCapture={(file) => handleEvidenciaCapture("identificacion", file)}
                  />
                  <EvidenciaCapture
                    tipo="documento"
                    onCapture={(file) => handleEvidenciaCapture("documento", file)}
                  />
                  <EvidenciaCapture
                    tipo="vehiculo"
                    onCapture={(file) => handleEvidenciaCapture("vehiculo", file)}
                  />
                </div>

                {evidencias.length > 0 && (
                  <EvidenciasPreviewGrid
                    evidencias={evidencias.map((e) => ({
                      tipo: e.tipo as any,
                      file: e.file,
                      preview: e.preview
                    }))}
                    onRemove={handleRemoveEvidencia}
                  />
                )}
              </div>

              {/* Botón guardar */}
              <Button
                onClick={handleGuardarRecepcion}
                disabled={saving}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {saving ? (
                  "Guardando..."
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirmar recepción
                  </>
                )}
              </Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
