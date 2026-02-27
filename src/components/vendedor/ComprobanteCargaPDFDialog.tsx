import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rutaId: string;
  pedidoId: string;
}

interface ComprobanteData {
  rutaFolio: string;
  fechaRuta: string;
  vehiculoNombre: string;
  vehiculoPlaca: string;
  choferNombre: string;
  ayudantesNombres: string[];
  sellos: string[];
  pedidoFolio: string;
  clienteNombre: string;
  sucursalNombre: string | null;
  productos: { descripcion: string; cantidadSolicitada: number; cantidadCargada: number; pesoKg: number | null }[];
  evidenciasUrls: { tipo: string; url: string }[];
  firmaChofer: string | null;
  firmaAlmacenista: string | null;
  cargaCompletadaEn: string | null;
}

export function ComprobanteCargaPDFDialog({ open, onOpenChange, rutaId, pedidoId }: Props) {
  const [data, setData] = useState<ComprobanteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && rutaId) fetchData();
  }, [open, rutaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch ruta, pedido, evidencias, carga_productos in parallel
      const [rutaRes, pedidoRes, evidenciasRes, entregaRes] = await Promise.all([
        supabase.from("rutas").select(`
          folio, fecha_ruta, lleva_sellos, numero_sello_salida, ayudantes_ids,
          firma_chofer_carga, firma_almacenista_carga, carga_completada_en,
          vehiculo:vehiculos(nombre, placa),
          chofer:empleados!rutas_chofer_id_fkey(nombre_completo)
        `).eq("id", rutaId).single(),
        supabase.from("pedidos").select(`
          folio,
          cliente:clientes(nombre),
          sucursal:cliente_sucursales(nombre)
        `).eq("id", pedidoId).single(),
        supabase.from("carga_evidencias")
          .select("tipo_evidencia, ruta_storage")
          .eq("ruta_id", rutaId)
          .order("created_at"),
        supabase.from("entregas")
          .select("id")
          .eq("ruta_id", rutaId)
          .eq("pedido_id", pedidoId)
          .maybeSingle(),
      ]);

      if (rutaRes.error) throw rutaRes.error;
      if (pedidoRes.error) throw pedidoRes.error;

      const ruta = rutaRes.data;
      const vehiculo = ruta.vehiculo as any;
      const chofer = ruta.chofer as any;

      // Fetch ayudantes
      let ayudantesNombres: string[] = [];
      if (ruta.ayudantes_ids?.length) {
        const { data: ayData } = await supabase
          .from("empleados")
          .select("nombre_completo")
          .in("id", ruta.ayudantes_ids);
        ayudantesNombres = (ayData || []).map(a => a.nombre_completo);
      }

      // Fetch carga_productos for this entrega
      let productos: ComprobanteData["productos"] = [];
      if (entregaRes.data) {
        const { data: cargaProds } = await supabase
          .from("carga_productos")
          .select(`
            cantidad_solicitada, cantidad_cargada, peso_real_kg,
            pedido_detalle:pedidos_detalles(
              producto:productos(nombre, marca, especificaciones, contenido_empaque, unidad, peso_kg)
            )
          `)
          .eq("entrega_id", entregaRes.data.id);

        productos = (cargaProds || []).map((cp: any) => {
          const prod = cp.pedido_detalle?.producto;
          return {
            descripcion: prod ? getDisplayName(prod) : "Producto",
            cantidadSolicitada: cp.cantidad_solicitada,
            cantidadCargada: cp.cantidad_cargada || 0,
            pesoKg: cp.peso_real_kg,
          };
        });
      }

      // Get signed URLs for evidencias
      const evidenciasUrls: { tipo: string; url: string }[] = [];
      for (const ev of evidenciasRes.data || []) {
        const { data: urlData } = await supabase.storage
          .from("cargas-evidencias")
          .createSignedUrl(ev.ruta_storage, 600);
        if (urlData?.signedUrl) {
          evidenciasUrls.push({ tipo: ev.tipo_evidencia, url: urlData.signedUrl });
        }
      }

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

      setData({
        rutaFolio: ruta.folio,
        fechaRuta: ruta.fecha_ruta,
        vehiculoNombre: vehiculo?.nombre || "",
        vehiculoPlaca: vehiculo?.placa || "",
        choferNombre: chofer?.nombre_completo || "",
        ayudantesNombres,
        sellos,
        pedidoFolio: pedidoRes.data.folio,
        clienteNombre: (pedidoRes.data.cliente as any)?.nombre || "",
        sucursalNombre: (pedidoRes.data.sucursal as any)?.nombre || null,
        productos,
        evidenciasUrls,
        firmaChofer: ruta.firma_chofer_carga,
        firmaAlmacenista: ruta.firma_almacenista_carga,
        cargaCompletadaEn: ruta.carga_completada_en as string | null,
      });
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar comprobante");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!printRef.current || !data) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" });
      const imgWidth = 8.5;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, 11));
      pdf.save(`Comprobante-Carga-${data.pedidoFolio}.pdf`);
    } catch {
      toast.error("Error al generar PDF");
    } finally {
      setDownloading(false);
    }
  };

  const getEvidenciaLabel = (tipo: string) => {
    if (tipo === "carga_vehiculo") return "Caja Abierta";
    if (tipo === "carta_porte") return "Carta Porte";
    if (tipo.startsWith("sello_salida_")) return "Sello de Salida";
    return tipo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Comprobante de Carga — {data?.pedidoFolio || "..."}</span>
            {data && (
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Descargar PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : data ? (
          <div ref={printRef} className="bg-white p-6 rounded-lg border" style={{ fontFamily: "Arial, sans-serif", color: "#111" }}>
            {/* Header */}
            <div style={{ borderBottom: "2px solid #333", paddingBottom: 12, marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>COMPROBANTE DE CARGA</h1>
              <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
                Ruta {data.rutaFolio} — {format(new Date(data.fechaRuta), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16, fontSize: 12 }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Pedido</p>
                <p>{data.pedidoFolio}</p>
                <p style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Cliente</p>
                <p>{data.clienteNombre}</p>
                {data.sucursalNombre && <p style={{ color: "#666" }}>→ {data.sucursalNombre}</p>}
              </div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Vehículo</p>
                <p>{data.vehiculoNombre} — {data.vehiculoPlaca}</p>
                <p style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Chofer</p>
                <p>{data.choferNombre}</p>
                {data.ayudantesNombres.length > 0 && (
                  <>
                    <p style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Ayudantes</p>
                    <p>{data.ayudantesNombres.join(", ")}</p>
                  </>
                )}
                {data.sellos.length > 0 && (
                  <>
                    <p style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Sellos de Seguridad</p>
                    <p>{data.sellos.join(", ")}</p>
                  </>
                )}
              </div>
            </div>

            {/* Products table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Producto</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Solicitado</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Cargado</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.productos.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "5px 8px" }}>{p.descripcion}</td>
                    <td style={{ textAlign: "center", padding: "5px 8px" }}>{p.cantidadSolicitada}</td>
                    <td style={{
                      textAlign: "center", padding: "5px 8px",
                      fontWeight: p.cantidadCargada !== p.cantidadSolicitada ? 700 : 400,
                      color: p.cantidadCargada !== p.cantidadSolicitada ? "#dc2626" : "inherit",
                    }}>
                      {p.cantidadCargada}
                    </td>
                    <td style={{ textAlign: "center", padding: "5px 8px" }}>
                      {p.pesoKg ? `${p.pesoKg.toFixed(1)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Evidencias photos */}
            {data.evidenciasUrls.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Evidencias Fotográficas</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                  {data.evidenciasUrls.map((ev, i) => (
                    <div key={i} style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
                      <img
                        src={ev.url}
                        alt={ev.tipo}
                        crossOrigin="anonymous"
                        style={{ width: "100%", height: 150, objectFit: "cover" }}
                      />
                      <p style={{ fontSize: 10, textAlign: "center", padding: "4px 0", backgroundColor: "#f9fafb", margin: 0 }}>
                        {getEvidenciaLabel(ev.tipo)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Firma Chofer</p>
                {data.firmaChofer ? (
                  <img src={data.firmaChofer} alt="Firma chofer" style={{ maxHeight: 60, margin: "0 auto" }} />
                ) : (
                  <div style={{ borderBottom: "1px solid #999", width: "80%", margin: "20px auto 0" }} />
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Firma Almacenista</p>
                {data.firmaAlmacenista ? (
                  <img src={data.firmaAlmacenista} alt="Firma almacenista" style={{ maxHeight: 60, margin: "0 auto" }} />
                ) : (
                  <div style={{ borderBottom: "1px solid #999", width: "80%", margin: "20px auto 0" }} />
                )}
              </div>
            </div>

            {data.cargaCompletadaEn && (
              <p style={{ fontSize: 10, color: "#999", textAlign: "center", marginTop: 12 }}>
                Carga completada: {format(new Date(data.cargaCompletadaEn), "d/MM/yyyy HH:mm", { locale: es })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No se encontró información</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
