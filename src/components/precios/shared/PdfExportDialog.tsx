import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { generarListaPreciosPDF } from "@/utils/listaPreciosPdfGenerator";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: Array<{ id: string; codigo: string; nombre: string; unidad: string; precio_venta: number; [key: string]: any }>;
  categoriaFilter?: string;
}

export function PdfExportDialog({ open, onOpenChange, productos, categoriaFilter }: PdfExportDialogProps) {
  const handleDownload = async (version: "cliente" | "interno") => {
    onOpenChange(false);
    await generarListaPreciosPDF({
      productos: productos as any,
      version,
      categoriaFilter: categoriaFilter && categoriaFilter !== "all" && categoriaFilter !== "todas" ? categoriaFilter : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Descargar PDF
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleDownload("cliente")}>
            <div className="text-left">
              <p className="font-medium text-sm">Para Cliente</p>
              <p className="text-xs text-muted-foreground">Solo código, producto, unidad y precio</p>
            </div>
          </Button>
          <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleDownload("interno")}>
            <div className="text-left">
              <p className="font-medium text-sm">Uso Interno</p>
              <p className="text-xs text-muted-foreground">Incluye descuento máximo y precio mínimo</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
