import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  AlertTriangle,
  Package,
  X,
  Loader2
} from "lucide-react";
import { EvidenciaCapture, type TipoEvidencia } from "@/components/compras/EvidenciaCapture";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";

interface ProductoDevolucion {
  detalleId: string;
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  cantidadDevuelta: number;
  razon: string;
  razonLabel: string;
}

interface DevolucionProveedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenCompraId: string;
  ordenCompraFolio: string;
  entregaId: string;
  productosDevolucion: ProductoDevolucion[];
  nombreChofer: string;
  onDevolucionCompletada: () => void;
}

interface FotoDevolucion {
  productoId: string;
  file: File;
  preview: string;
}

export const DevolucionProveedorDialog = ({
  open,
  onOpenChange,
  ordenCompraId,
  ordenCompraFolio,
  entregaId,
  productosDevolucion,
  nombreChofer,
  onDevolucionCompletada
}: DevolucionProveedorDialogProps) => {
  const [fotosDevolucion, setFotosDevolucion] = useState<FotoDevolucion[]>([]);
  const [notasDevolucion, setNotasDevolucion] = useState("");
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  const [firmaChofer, setFirmaChofer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleFotoCapture = (productoId: string, file: File, preview: string) => {
    setFotosDevolucion(prev => [...prev, { productoId, file, preview }]);
  };

  const handleRemoveFoto = (index: number) => {
    setFotosDevolucion(prev => {
      const newFotos = [...prev];
      URL.revokeObjectURL(newFotos[index].preview);
      newFotos.splice(index, 1);
      return newFotos;
    });
  };

  const handleProcederFirma = () => {
    // Validar que todos los productos tengan al menos una foto
    const productosSinFoto = productosDevolucion.filter(
      p => !fotosDevolucion.some(f => f.productoId === p.productoId)
    );

    if (productosSinFoto.length > 0) {
      toast({
        title: "Fotos requeridas",
        description: `Toma foto de: ${productosSinFoto.map(p => p.productoNombre).join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    setShowFirmaDialog(true);
  };

  const handleFirmaConfirmada = async (firmaBase64: string) => {
    setFirmaChofer(firmaBase64);
    setShowFirmaDialog(false);
    await guardarDevolucion(firmaBase64);
  };

  const guardarDevolucion = async (firma: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      let montoTotalDevoluciones = 0;

      // Crear registros de devolución para cada producto
      for (const producto of productosDevolucion) {
        const { data: devolucion, error: devError } = await supabase
          .from("devoluciones_proveedor")
          .insert({
            orden_compra_id: ordenCompraId,
            orden_compra_entrega_id: entregaId,
            producto_id: producto.productoId,
            cantidad_devuelta: producto.cantidadDevuelta,
            motivo: producto.razon,
            notas: notasDevolucion || null,
            registrado_por: user.id,
            firma_chofer: firma,
            status: "pendiente"
          })
          .select()
          .single();

        if (devError) throw devError;

        // Obtener precio unitario de compra para calcular monto de devolución
        const { data: detalleOC } = await supabase
          .from("ordenes_compra_detalles")
          .select("precio_unitario_compra")
          .eq("orden_compra_id", ordenCompraId)
          .eq("producto_id", producto.productoId)
          .maybeSingle();

        if (detalleOC?.precio_unitario_compra) {
          const montoDevolucion = producto.cantidadDevuelta * detalleOC.precio_unitario_compra;
          montoTotalDevoluciones += montoDevolucion;
        }

        // Subir fotos de este producto
        const fotosProducto = fotosDevolucion.filter(f => f.productoId === producto.productoId);
        for (const foto of fotosProducto) {
          const fileName = `${ordenCompraId}/${devolucion.id}/${Date.now()}-danado.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from("devoluciones-evidencias")
            .upload(fileName, foto.file);

          if (!uploadError) {
            await supabase
              .from("devoluciones_proveedor_evidencias")
              .insert({
                devolucion_id: devolucion.id,
                tipo_evidencia: "producto_danado",
                ruta_storage: fileName,
                nombre_archivo: foto.file.name,
                capturado_por: user.id
              });
          }
        }
      }

      // Actualizar el monto de devoluciones en la OC
      if (montoTotalDevoluciones > 0) {
        await supabase.rpc('agregar_devolucion_a_oc', {
          p_oc_id: ordenCompraId,
          p_monto: montoTotalDevoluciones
        });
      }

      // === CRÉDITOS PARA OC ANTICIPADAS ===
      // Si es OC anticipada, también crear crédito pendiente porque ya se pagó
      try {
        const { data: oc } = await supabase
          .from("ordenes_compra")
          .select("tipo_pago, folio, proveedor_id, proveedor_nombre_manual")
          .eq("id", ordenCompraId)
          .single();

        if (oc?.tipo_pago === 'anticipado') {
          for (const producto of productosDevolucion) {
            // Obtener precio unitario
            const { data: detalleOC } = await supabase
              .from("ordenes_compra_detalles")
              .select("precio_unitario_compra")
              .eq("orden_compra_id", ordenCompraId)
              .eq("producto_id", producto.productoId)
              .maybeSingle();

            const precioUnitario = detalleOC?.precio_unitario_compra || 0;
            const montoDevolucion = producto.cantidadDevuelta * precioUnitario;

            if (montoDevolucion > 0) {
              await supabase.from("proveedor_creditos_pendientes").insert({
                proveedor_id: oc.proveedor_id,
                proveedor_nombre_manual: oc.proveedor_nombre_manual,
                orden_compra_origen_id: ordenCompraId,
                entrega_id: entregaId,
                producto_id: producto.productoId,
                producto_nombre: producto.productoNombre,
                cantidad: producto.cantidadDevuelta,
                precio_unitario: precioUnitario,
                monto_total: montoDevolucion,
                motivo: producto.razon, // "roto" o "rechazado_calidad"
                status: "pendiente",
                notas: `Devolución en OC anticipada ${oc.folio}`
              });
            }
          }
        }
      } catch (creditError) {
        console.error("Error creando crédito para devolución:", creditError);
        // No bloqueamos la operación principal si falla el crédito
      }

      toast({
        title: "Devolución registrada",
        description: `Se registró devolución con firma de ${nombreChofer}`
      });

      onDevolucionCompletada();
    } catch (error) {
      console.error("Error guardando devolución:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la devolución",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const totalBultosDevolucion = productosDevolucion.reduce((sum, p) => sum + p.cantidadDevuelta, 0);

  return (
    <>
      <Dialog open={open && !showFirmaDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Devolución de Mercancía Dañada
            </DialogTitle>
            <DialogDescription>
              OC: {ordenCompraFolio} | {totalBultosDevolucion} bultos a devolver
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lista de productos a devolver */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Productos a devolver al chofer:</Label>
              {productosDevolucion.map((producto) => {
                const fotosTomadas = fotosDevolucion.filter(f => f.productoId === producto.productoId);
                const tieneFoto = fotosTomadas.length > 0;

                return (
                  <div 
                    key={producto.detalleId} 
                    className="p-3 border rounded-lg space-y-2 bg-destructive/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{producto.productoNombre}</p>
                        <p className="text-xs text-muted-foreground">{producto.productoCodigo}</p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {producto.cantidadDevuelta} bultos
                      </Badge>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {producto.razonLabel}
                    </Badge>

                    {/* Fotos tomadas */}
                    {fotosTomadas.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {fotosTomadas.map((foto, idx) => {
                          const globalIdx = fotosDevolucion.findIndex(f => f === foto);
                          return (
                            <div key={idx} className="relative">
                              <img 
                                src={foto.preview} 
                                alt="Evidencia daño" 
                                className="h-16 w-20 object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFoto(globalIdx)}
                                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Botón para tomar foto */}
                    <EvidenciaCapture
                      tipo="producto_danado"
                      onCapture={(file, preview) => handleFotoCapture(producto.productoId, file, preview)}
                      className={!tieneFoto ? "border-destructive" : ""}
                    />
                    {!tieneFoto && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Foto obligatoria del producto dañado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notas adicionales */}
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                value={notasDevolucion}
                onChange={(e) => setNotasDevolucion(e.target.value)}
                placeholder="Describe el estado del producto, observaciones..."
                rows={2}
              />
            </div>

            {/* Resumen */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">El chofer "{nombreChofer}" confirmará que:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• Recibe {totalBultosDevolucion} bultos dañados de regreso</li>
                <li>• Se tomaron fotos como evidencia</li>
                <li>• Se registrará su firma digital</li>
              </ul>
            </div>

            {/* Botón continuar a firma */}
            <Button 
              onClick={handleProcederFirma}
              disabled={saving}
              className="w-full"
              variant="destructive"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Continuar a firma del chofer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FirmaDigitalDialog
        open={showFirmaDialog}
        onOpenChange={setShowFirmaDialog}
        onConfirm={handleFirmaConfirmada}
        titulo={`Firma de ${nombreChofer} - Confirma que recibe ${totalBultosDevolucion} bultos dañados`}
        loading={saving}
      />
    </>
  );
};
