import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RutaPrintTemplate } from './RutaPrintTemplate';
import { 
  ArrowLeft, Download, Printer, Truck, User, 
  RotateCcw, MapPin, Loader2 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import type { RutaMonitoreo } from '@/hooks/useMonitoreoRutas';

interface RutaDetalleFullScreenProps {
  ruta: RutaMonitoreo;
  onClose: () => void;
}

export const RutaDetalleFullScreen = ({ ruta, onClose }: RutaDetalleFullScreenProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    const el = printRef.current;
    if (!el) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const imgX = (pdfW - canvas.width * ratio) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 5, canvas.width * ratio, canvas.height * ratio);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ruta_${ruta.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('PDF descargado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html><head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-muted/80 backdrop-blur-sm flex flex-col">
      {/* ═══ TOOLBAR ═══ */}
      <div className="shrink-0 bg-background border-b px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-bold text-lg leading-tight">{ruta.folio}</h2>
            <p className="text-xs text-muted-foreground">Hoja de Ruta</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloading} className="gap-1.5">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* ═══ PDF PREVIEW ═══ */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div className="relative" style={{ width: '680px' }}>
          <div
            ref={printRef}
            className="bg-white shadow-2xl rounded-sm"
            style={{ transform: 'scale(0.78)', transformOrigin: 'top center', width: '8.5in' }}
          >
            <RutaPrintTemplate ruta={ruta} />
          </div>
        </div>
      </div>
    </div>
  );
};
