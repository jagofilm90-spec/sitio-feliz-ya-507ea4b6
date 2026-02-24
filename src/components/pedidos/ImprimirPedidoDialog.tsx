import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PedidoPrintTemplate, DatosPedidoPrint } from "./PedidoPrintTemplate";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ImprimirPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: DatosPedidoPrint | null;
}

export const ImprimirPedidoDialog = ({ open, onOpenChange, datos }: ImprimirPedidoDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    const printContent = printRef.current;
    if (!printContent || !datos) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const imgX = (pdfWidth - canvas.width * ratio) / 2;

      pdf.addImage(imgData, "PNG", imgX, 5, canvas.width * ratio, canvas.height * ratio);

      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Pedido_${datos.folio}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const styles = Array.from(document.styleSheets)
      .map((ss) => {
        try {
          return Array.from(ss.cssRules).map((r) => r.cssText).join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    // Use hidden iframe instead of window.open to avoid popup blockers
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head>
      <title>Pedido ${datos?.folio}</title>
      <style>${styles}
        @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; } @page { size: letter; margin: 0.5in; } }
        body { font-family: Arial, Helvetica, sans-serif; background: white; }
      </style></head><body>${printContent.innerHTML}</body></html>`);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  };

  if (!datos) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa - Pedido {datos.folio}</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPdf} variant="outline" className="gap-2" disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar PDF
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="bg-white border rounded-lg overflow-hidden">
          <PedidoPrintTemplate datos={datos} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
