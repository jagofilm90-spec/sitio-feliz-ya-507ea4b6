import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: Blob | null;
  filename: string;
  title: string;
}

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  blob,
  filename,
  title}: PdfPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);

  useEffect(() => {
    if (!open || !blob) {
      setPages([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const renderPdf = async () => {
      setLoading(true);
      setError(null);
      setPages([]);

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdfData = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const renderedPages: RenderedPage[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) throw new Error("No se pudo inicializar el render del PDF");

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({ canvas, canvasContext: context, viewport }).promise;

          renderedPages.push({
            pageNumber,
            dataUrl: canvas.toDataURL("image/png")});
        }

        if (!cancelled) setPages(renderedPages);
      } catch (renderError) {
        console.error("Error renderizando PDF:", renderError);
        if (!cancelled) setError("No se pudo mostrar la vista previa del PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [blob, open]);

  const handleDownload = () => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{title}</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 px-4 py-5">
          {loading && (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
              <AlmasaLoading size={48} text="Renderizando vista previa…" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {!loading && !error && pages.length > 0 && (
            <div className="mx-auto flex max-w-4xl flex-col gap-4">
              {pages.map((page) => (
                <img
                  key={page.pageNumber}
                  src={page.dataUrl}
                  alt={`Página ${page.pageNumber} de ${title}`}
                  className="w-full rounded-md border bg-background shadow-sm"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
