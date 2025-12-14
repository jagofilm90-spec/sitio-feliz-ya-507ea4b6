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
  Package,
  Camera,
  CheckCircle2,
  User,
  FileText,
  Truck,
  Hash
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
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [nombreEntrega, setNombreEntrega] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [notas, setNotas] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && entrega) {
      loadProductos();
    }
  }, [open, entrega]);

  const loadProductos = async () => {
    setLoading(true);
    try {
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
      productosData.forEach(p => {
        const faltante = p.cantidad_ordenada - p.cantidad_recibida;
        cantidades[p.id] = Math.max(0, faltante);
      });
      setCantidadesRecibidas(cantidades);
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

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Actualizar cantidades recibidas en ordenes_compra_detalles
      for (const [detalleId, cantidad] of Object.entries(cantidadesRecibidas)) {
        if (cantidad > 0) {
          const producto = productos.find(p => p.id === detalleId);
          if (producto) {
            const nuevaCantidadRecibida = producto.cantidad_recibida + cantidad;
            await supabase
              .from("ordenes_compra_detalles")
              .update({ cantidad_recibida: nuevaCantidadRecibida })
              .eq("id", detalleId);
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
        description: "La mercancía ha sido registrada correctamente"
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
              {/* Productos a recibir - SIN PRECIOS */}
              <div>
                <h3 className="font-medium mb-3">Productos a recibir</h3>
                <div className="space-y-3">
                  {productos.map((producto) => {
                    const faltante = producto.cantidad_ordenada - producto.cantidad_recibida;
                    return (
                      <Card key={producto.id}>
                        <CardContent className="p-3">
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
