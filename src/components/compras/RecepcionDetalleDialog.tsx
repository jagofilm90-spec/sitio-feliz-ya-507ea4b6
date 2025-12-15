import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Truck,
  User,
  FileText,
  Warehouse,
  Calendar,
  Camera,
  Download,
  Hash,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { generarRecepcionPDF } from "@/utils/recepcionPdfGenerator";

interface RecepcionDetalleDialogProps {
  entregaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EvidenciaRecepcion {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string;
  created_at: string;
  capturado_por_profile: {
    full_name: string;
  } | null;
}

interface RecepcionDetalle {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  fecha_entrega_real: string | null;
  status: string;
  notas: string | null;
  firma_chofer_conformidad: string | null;
  firma_almacenista: string | null;
  recibido_por_profile: {
    full_name: string;
  } | null;
  orden_compra: {
    id: string;
    folio: string;
    proveedor: {
      nombre: string;
    } | null;
    proveedor_nombre_manual: string | null;
  };
}

interface ProductoRecibido {
  id: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  producto: {
    codigo: string;
    nombre: string;
  };
}

export const RecepcionDetalleDialog = ({
  entregaId,
  open,
  onOpenChange,
}: RecepcionDetalleDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [recepcion, setRecepcion] = useState<RecepcionDetalle | null>(null);
  const [productos, setProductos] = useState<ProductoRecibido[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaRecepcion[]>([]);
  const [evidenciasUrls, setEvidenciasUrls] = useState<Record<string, string>>({});
  const [imagenExpandida, setImagenExpandida] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    if (open && entregaId) {
      loadRecepcion();
    }
  }, [open, entregaId]);

  const loadRecepcion = async () => {
    if (!entregaId) return;
    setLoading(true);
    
    try {
      // Load delivery details
      const { data: entrega, error: entregaError } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id, numero_entrega, cantidad_bultos, fecha_programada, fecha_entrega_real, status, notas,
          firma_chofer_conformidad, firma_almacenista,
          recibido_por_profile:recibido_por(full_name),
          orden_compra:ordenes_compra(
            id, folio, proveedor_nombre_manual,
            proveedor:proveedores(nombre)
          )
        `)
        .eq("id", entregaId)
        .single();

      if (entregaError) throw entregaError;
      setRecepcion(entrega as unknown as RecepcionDetalle);

      // Load products from order
      const { data: productosData } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id, cantidad_ordenada, cantidad_recibida,
          producto:productos(codigo, nombre)
        `)
        .eq("orden_compra_id", (entrega as any).orden_compra.id);

      setProductos((productosData as unknown as ProductoRecibido[]) || []);

      // Load evidences from correct table
      const { data: evidenciasData } = await supabase
        .from("ordenes_compra_entregas_evidencias")
        .select(`
          id, tipo_evidencia, ruta_storage, nombre_archivo, created_at,
          capturado_por_profile:capturado_por(full_name)
        `)
        .eq("entrega_id", entregaId)
        .order("created_at", { ascending: false });

      setEvidencias((evidenciasData as unknown as EvidenciaRecepcion[]) || []);

      // Get signed URLs for evidences
      const urls: Record<string, string> = {};
      for (const ev of evidenciasData || []) {
        const { data: signedUrl } = await supabase.storage
          .from("recepciones-evidencias")
          .createSignedUrl((ev as any).ruta_storage, 3600);
        if (signedUrl?.signedUrl) {
          urls[(ev as any).id] = signedUrl.signedUrl;
        }
      }
      setEvidenciasUrls(urls);

    } catch (error) {
      console.error("Error cargando recepción:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!recepcion) return;
    setGenerandoPdf(true);
    try {
      await generarRecepcionPDF({
        recepcion,
        productos,
        evidenciasUrls: Object.values(evidenciasUrls),
        firmaChofer: recepcion.firma_chofer_conformidad,
        firmaAlmacenista: recepcion.firma_almacenista,
      });
    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setGenerandoPdf(false);
    }
  };

  const getTipoEvidenciaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      sello: "Sello",
      identificacion: "Identificación",
      documento: "Documento",
      vehiculo: "Vehículo",
      producto: "Producto",
      otro: "Otro",
    };
    return labels[tipo] || tipo;
  };

  const proveedorNombre = recepcion?.orden_compra?.proveedor?.nombre || 
                          recepcion?.orden_compra?.proveedor_nombre_manual || 
                          "Proveedor";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalle de Recepción
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : recepcion ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Header info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-foreground">
                        {recepcion.orden_compra.folio}
                      </span>
                      <Badge variant="outline">Entrega #{recepcion.numero_entrega}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      {proveedorNombre}
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <Badge variant={recepcion.status === "recibida" ? "default" : "secondary"}>
                      {recepcion.status}
                    </Badge>
                    {recepcion.fecha_entrega_real && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(recepcion.fecha_entrega_real), "PPP", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Reception info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recibido por</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {recepcion.recibido_por_profile?.full_name || "No registrado"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Bultos recibidos</p>
                    <p className="font-medium">
                      {recepcion.cantidad_bultos?.toLocaleString() || "N/A"} bultos
                    </p>
                  </div>
                </div>

                {recepcion.notas && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">Notas de recepción</p>
                    <p className="text-sm text-muted-foreground">{recepcion.notas}</p>
                  </div>
                )}

                <Separator />

                {/* Products */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Productos Recibidos
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Código</th>
                          <th className="text-left p-2">Producto</th>
                          <th className="text-right p-2">Ordenado</th>
                          <th className="text-right p-2">Recibido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="p-2 font-mono text-xs">{p.producto?.codigo}</td>
                            <td className="p-2">{p.producto?.nombre}</td>
                            <td className="p-2 text-right">{p.cantidad_ordenada}</td>
                            <td className="p-2 text-right font-medium">{p.cantidad_recibida}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                {/* Evidences gallery */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Evidencias Fotográficas ({evidencias.length})
                  </h3>
                  {evidencias.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay evidencias registradas
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {evidencias.map((ev) => (
                        <div
                          key={ev.id}
                          className="relative group cursor-pointer"
                          onClick={() => setImagenExpandida(evidenciasUrls[ev.id])}
                        >
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                            {evidenciasUrls[ev.id] ? (
                              <img
                                src={evidenciasUrls[ev.id]}
                                alt={ev.tipo_evidencia}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                            <Badge variant="secondary" className="text-xs">
                              {getTipoEvidenciaLabel(ev.tipo_evidencia)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleGenerarPDF}
                    disabled={generandoPdf}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {generandoPdf ? "Generando..." : "Exportar PDF"}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No se encontró la recepción
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Expanded image dialog */}
      <Dialog open={!!imagenExpandida} onOpenChange={() => setImagenExpandida(null)}>
        <DialogContent className="max-w-4xl p-0">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80"
            onClick={() => setImagenExpandida(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          {imagenExpandida && (
            <img
              src={imagenExpandida}
              alt="Evidencia"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};