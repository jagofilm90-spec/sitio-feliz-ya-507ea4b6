import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Package, FileText, ShieldCheck, Eye, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CargaEvidencia {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string | null;
  created_at: string;
}

interface RutaInfo {
  id: string;
  folio: string;
  lleva_sellos: boolean | null;
  numero_sello_salida: string | null;
  vehiculo: { nombre: string; placa: string } | null;
  chofer: { nombre_completo: string } | null;
}

interface Props {
  pedidoId: string;
  onDescargarComprobante?: (rutaId: string) => void;
}

export function CargaEvidenciasVendedorSection({ pedidoId, onDescargarComprobante }: Props) {
  const [evidencias, setEvidencias] = useState<CargaEvidencia[]>([]);
  const [ruta, setRuta] = useState<RutaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    loadData();
  }, [pedidoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Find ruta through entrega
      const { data: entrega } = await supabase
        .from("entregas")
        .select("ruta_id")
        .eq("pedido_id", pedidoId)
        .maybeSingle();

      if (!entrega?.ruta_id) {
        setLoading(false);
        return;
      }

      const rutaId = entrega.ruta_id;

      // Load ruta info and evidencias in parallel
      const [rutaRes, evidenciasRes] = await Promise.all([
        supabase.from("rutas")
          .select("id, folio, lleva_sellos, numero_sello_salida, vehiculo:vehiculos(nombre, placa), chofer:empleados!rutas_chofer_id_fkey(nombre_completo)")
          .eq("id", rutaId)
          .maybeSingle(),
        supabase.from("carga_evidencias")
          .select("id, tipo_evidencia, ruta_storage, nombre_archivo, created_at")
          .eq("ruta_id", rutaId)
          .order("created_at"),
      ]);

      if (rutaRes.data) {
        setRuta({
          ...rutaRes.data,
          vehiculo: rutaRes.data.vehiculo as any,
          chofer: rutaRes.data.chofer as any,
        });
      }
      setEvidencias(evidenciasRes.data || []);
    } catch (err) {
      console.error("Error loading carga evidencias:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (ev: CargaEvidencia) => {
    const { data } = await supabase.storage
      .from("cargas-evidencias")
      .createSignedUrl(ev.ruta_storage, 300);
    if (data?.signedUrl) {
      setPreviewTitle(getEvidenciaLabel(ev.tipo_evidencia));
      setPreviewUrl(data.signedUrl);
    }
  };

  const getEvidenciaLabel = (tipo: string) => {
    if (tipo === "carga_vehiculo") return "Caja abierta";
    if (tipo === "carta_porte") return "Carta Porte";
    if (tipo.startsWith("sello_salida_")) return `Sello de salida`;
    return tipo;
  };

  const getEvidenciaIcon = (tipo: string) => {
    if (tipo === "carga_vehiculo") return <Package className="h-3.5 w-3.5" />;
    if (tipo === "carta_porte") return <FileText className="h-3.5 w-3.5" />;
    return <ShieldCheck className="h-3.5 w-3.5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando evidencias...
      </div>
    );
  }

  if (!ruta || evidencias.length === 0) return null;

  // Parse sellos
  let sellos: string[] = [];
  if (ruta.lleva_sellos && ruta.numero_sello_salida) {
    try {
      const parsed = JSON.parse(ruta.numero_sello_salida);
      sellos = Array.isArray(parsed) ? parsed.filter((s: string) => s.trim()) : [ruta.numero_sello_salida];
    } catch {
      sellos = [ruta.numero_sello_salida];
    }
  }

  return (
    <>
      <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Evidencias de Carga
          </h4>
          {onDescargarComprobante && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onDescargarComprobante(ruta.id)}
            >
              <Download className="h-3.5 w-3.5" />
              Comprobante
            </Button>
          )}
        </div>

        {/* Route info */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Ruta: <span className="font-medium text-foreground">{ruta.folio}</span></p>
          {ruta.vehiculo && <p>Vehículo: {ruta.vehiculo.nombre} ({ruta.vehiculo.placa})</p>}
          {ruta.chofer && <p>Chofer: {ruta.chofer.nombre_completo}</p>}
          {sellos.length > 0 && <p>Sellos: {sellos.join(", ")}</p>}
        </div>

        {/* Evidencia thumbnails */}
        <div className="flex flex-wrap gap-2">
          {evidencias.map((ev) => (
            <button
              key={ev.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-background text-xs hover:bg-accent transition-colors"
              onClick={() => handlePreview(ev)}
            >
              {getEvidenciaIcon(ev.tipo_evidencia)}
              <span>{getEvidenciaLabel(ev.tipo_evidencia)}</span>
              <Eye className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Evidencia" className="w-full h-auto rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
