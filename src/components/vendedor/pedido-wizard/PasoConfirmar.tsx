import { useRef, useState } from "react";
import { ChevronLeft, Loader2, AlertTriangle, Clock, CheckCircle2, FileText, Receipt, Send, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PedidoPrintTemplate, DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { getDisplayName } from "@/lib/productUtils";
import { LineaPedido, Cliente, Sucursal, TotalesCalculados } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function enviarEmailPedido(payload: {
  folio: string;
  clienteNombre: string;
  sucursalNombre?: string;
  vendedorNombre: string;
  terminoCredito: string;
  notas?: string;
  lineas: LineaPedido[];
  totales: TotalesCalculados;
  fechaPedido: string;
}) {
  try {
    const body = {
      folio: payload.folio,
      clienteNombre: payload.clienteNombre,
      sucursalNombre: payload.sucursalNombre,
      vendedorNombre: payload.vendedorNombre,
      terminoCredito: payload.terminoCredito,
      notas: payload.notas,
      fechaPedido: payload.fechaPedido,
      lineas: payload.lineas.map(l => ({
        producto: getDisplayName(l.producto),
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
        esPorKilo: l.producto.precio_por_kilo,
        pesoKg: l.producto.peso_kg || 0,
        descuento: l.descuento,
      })),
      subtotal: payload.totales.subtotal,
      iva: payload.totales.iva,
      ieps: payload.totales.ieps,
      total: payload.totales.total,
      pesoTotalKg: payload.totales.pesoTotalKg,
      totalUnidades: payload.totales.totalUnidades,
    };
    await supabase.functions.invoke("enviar-pedido-interno", { body });
  } catch (err) {
    console.warn("Email de pedido no enviado:", err);
  }
}

interface PasoConfirmarProps {
  cliente: Cliente | undefined;
  sucursal: Sucursal | undefined;
  lineas: LineaPedido[];
  terminoCredito: string;
  notas: string;
  totales: TotalesCalculados;
  submitting: boolean;
  requiereFactura: boolean;
  onRequiereFacturaChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  vendedorNombre: string;
}

export function PasoConfirmar({
  cliente,
  sucursal,
  lineas,
  terminoCredito,
  notas,
  totales,
  submitting,
  requiereFactura,
  onRequiereFacturaChange,
  onSubmit,
  onBack,
  vendedorNombre,
}: PasoConfirmarProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const tieneCSF = !!(cliente?.csf_archivo_url || cliente?.preferencia_facturacion === 'siempre_factura');

  const productosConDescuentoPendiente = lineas.filter(
    l => l.requiereAutorizacion && l.autorizacionStatus === 'pendiente'
  );
  const requiereAutorizacionPedido = productosConDescuentoPendiente.length > 0;

  const formatCreditTerm = (term: string) => {
    if (term === 'contado') return 'Contado';
    return term.replace('_', ' ');
  };

  // Build data for the print template
  const datosPrint: DatosPedidoPrint = {
    folio: "(Pendiente)",
    fecha: new Date().toISOString(),
    vendedor: vendedorNombre,
    terminoCredito: formatCreditTerm(terminoCredito),
    cliente: {
      nombre: cliente?.nombre || "",
      telefono: (cliente as any)?.telefono || undefined,
    },
    sucursal: sucursal ? {
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || undefined,
    } : undefined,
    productos: lineas.map(l => {
      const pesoKg = l.producto.peso_kg || 0;
      const esPorKilo = l.producto.precio_por_kilo;
      const pesoTotal = pesoKg > 0 ? l.cantidad * pesoKg : null;
      return {
        cantidad: l.cantidad,
        descripcion: getDisplayName(l.producto),
        pesoTotal,
        precioUnitario: l.precioUnitario,
        importe: l.subtotal,
        precioPorKilo: !!esPorKilo,
      };
    }),
    subtotal: totales.subtotal,
    iva: totales.iva,
    ieps: totales.ieps,
    total: totales.total,
    pesoTotalKg: totales.pesoTotalKg,
    notas: notas || undefined,
  };

  const handleDownloadPdf = async () => {
    const printContent = printRef.current;
    if (!printContent) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printContent, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const imgX = (pdfWidth - canvas.width * ratio) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 5, canvas.width * ratio, canvas.height * ratio);
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Preview_Pedido.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success('PDF descargado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Vista previa del pedido
        </h2>
        <Button onClick={handleDownloadPdf} variant="outline" size="sm" disabled={isDownloading} className="gap-1.5">
          {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          PDF
        </Button>
      </div>

      {/* Alerts */}
      {productosConDescuentoPendiente.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
              {productosConDescuentoPendiente.length} producto(s) pendiente de autorización
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              El pedido quedará como "Por Autorizar"
            </p>
          </div>
        </div>
      )}

      {/* Invoice Toggle */}
      {tieneCSF && (
        <Card className={requiereFactura ? "border-primary/50 bg-primary/5" : ""}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {requiereFactura ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">
                  {requiereFactura ? "Con Factura" : "Solo Remisión"}
                </span>
              </div>
              <Switch
                id="factura-switch"
                checked={requiereFactura}
                onCheckedChange={onRequiereFacturaChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Preview — scrollable */}
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <div className="overflow-auto max-h-[55vh]">
          <div className="relative" style={{ height: '600px' }}>
            <div ref={printRef} className="bg-white absolute top-0 left-0" style={{ transform: 'scale(0.48)', transformOrigin: 'top left', width: '8.5in' }}>
              <PedidoPrintTemplate datos={datosPrint} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
          className="h-14"
          disabled={submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
        <Button
          onClick={onSubmit}
          size="lg"
          className="flex-1 h-14 text-lg font-bold"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {requiereAutorizacionPedido ? "Enviando..." : "Creando..."}
            </>
          ) : requiereAutorizacionPedido ? (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              Enviar para Autorización
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Crear Pedido
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
