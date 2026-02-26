import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Download, Loader2 } from "lucide-react";
import { PedidoPrintTemplate, DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { getDisplayName } from "@/lib/productUtils";
import { CREDITO_LABELS } from "@/lib/creditoUtils";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
}

export function PedidoPDFPreviewDialog({ open, onOpenChange, pedidoId }: Props) {
  const [datos, setDatos] = useState<DatosPedidoPrint | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && pedidoId) fetchData();
  }, [open, pedidoId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, subtotal, impuestos, total, status, notas, termino_credito,
          cliente:clientes(nombre, razon_social, rfc, direccion, telefono, nombre_vialidad, numero_exterior, numero_interior, nombre_colonia, nombre_municipio, codigo_postal, nombre_entidad_federativa),
          sucursal:cliente_sucursales(nombre, direccion),
          vendedor:profiles!pedidos_vendedor_id_fkey(full_name),
          detalles:pedidos_detalles(
            id, cantidad, precio_unitario, subtotal,
            producto:productos(nombre, marca, especificaciones, contenido_empaque, unidad, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps)
          )
        `)
        .eq("id", pedidoId)
        .single();

      if (error) throw error;

      const cliente = data.cliente || { nombre: "Sin cliente" } as any;
      const detalles = (data.detalles || []).map((d: any) => ({
        ...d,
        producto: d.producto || { nombre: "Producto", marca: null, especificaciones: null, contenido_empaque: null, unidad: "", peso_kg: null, precio_por_kilo: false, aplica_iva: true, aplica_ieps: false }
      }));

      let subtotalConIvaYIeps = 0, subtotalConIva = 0, subtotalSinImpuestos = 0;
      detalles.forEach((d: any) => {
        if (d.producto.aplica_iva && d.producto.aplica_ieps) subtotalConIvaYIeps += d.subtotal;
        else if (d.producto.aplica_iva) subtotalConIva += d.subtotal;
        else subtotalSinImpuestos += d.subtotal;
      });

      const baseConIvaYIeps = subtotalConIvaYIeps / 1.24;
      const iepsCalc = baseConIvaYIeps * 0.08;
      const ivaDeIeps = baseConIvaYIeps * 0.16;
      const baseConIva = subtotalConIva / 1.16;
      const ivaSolo = subtotalConIva - baseConIva;
      const subtotalReal = baseConIvaYIeps + baseConIva + subtotalSinImpuestos;
      const ivaTotal = ivaSolo + ivaDeIeps;

      let pesoTotalKg = 0;
      const productos = detalles.map((d: any) => {
        const prod = d.producto;
        const pesoKg = prod.peso_kg || 0;
        const pesoTotal = pesoKg > 0 ? d.cantidad * pesoKg : null;
        if (pesoTotal) pesoTotalKg += pesoTotal;
        const importe = prod.precio_por_kilo && pesoTotal ? pesoTotal * d.precio_unitario : d.subtotal;
        return { cantidad: d.cantidad, descripcion: getDisplayName(prod), pesoTotal, precioUnitario: d.precio_unitario, importe, precioPorKilo: prod.precio_por_kilo };
      });

      const formatDir = (c: any): string => {
        if (!c) return "";
        const p = [];
        if (c.nombre_vialidad) { let l = c.nombre_vialidad; if (c.numero_exterior) l += ` No. ${c.numero_exterior}`; if (c.numero_interior) l += ` Int. ${c.numero_interior}`; p.push(l); }
        if (c.nombre_colonia) p.push(`Col. ${c.nombre_colonia}`);
        if (c.nombre_municipio || c.codigo_postal) p.push(`${c.nombre_municipio || ""} C.P. ${c.codigo_postal || ""}`);
        if (c.nombre_entidad_federativa) p.push(c.nombre_entidad_federativa);
        return p.join(", ") || c.direccion || "";
      };

      setDatos({
        pedidoId: data.id, folio: data.folio, fecha: data.fecha_pedido,
        vendedor: (data.vendedor as any)?.full_name || "Sin asignar",
        terminoCredito: CREDITO_LABELS[data.termino_credito] || data.termino_credito,
        cliente: { nombre: cliente.nombre, razonSocial: cliente.razon_social || undefined, rfc: cliente.rfc || undefined, direccionFiscal: formatDir(cliente), telefono: cliente.telefono || undefined },
        direccionEntrega: cliente.direccion || undefined,
        sucursal: data.sucursal ? { nombre: (data.sucursal as any).nombre, direccion: (data.sucursal as any).direccion || undefined } : undefined,
        productos, subtotal: subtotalReal, iva: ivaTotal, ieps: iepsCalc, total: data.total, pesoTotalKg,
        notas: data.notas || undefined,
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!printRef.current || !datos) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" });
      pdf.addImage(imgData, "PNG", 0, 0, 8.5, 11);
      pdf.save(`${datos.folio}.pdf`);
    } catch {
      toast.error("Error al generar PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista previa — {datos?.folio || "Pedido"}</span>
            {datos && (
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Descargar PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-8">
            <Skeleton className="h-[600px] w-full" />
          </div>
        ) : datos ? (
          <div ref={printRef} className="bg-white border rounded-lg overflow-hidden">
            <PedidoPrintTemplate datos={datos} />
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No se encontró el pedido</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
