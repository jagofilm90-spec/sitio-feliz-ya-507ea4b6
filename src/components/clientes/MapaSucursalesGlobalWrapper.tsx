import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// Dynamic import - solo se carga cuando el wrapper se renderiza
const MapaSucursalesGlobal = lazy(() => import("./MapaSucursalesGlobal"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MapaSucursalesGlobalWrapper({ open, onOpenChange }: Props) {
  // No renderizar nada si no está abierto - esto previene la carga del módulo
  if (!open) return null;
  
  return (
    <Suspense fallback={
      <Dialog open={true}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando mapa...</p>
          </div>
        </DialogContent>
      </Dialog>
    }>
      <MapaSucursalesGlobal open={open} onOpenChange={onOpenChange} />
    </Suspense>
  );
}
