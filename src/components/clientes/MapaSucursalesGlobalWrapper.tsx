import { lazy, Suspense, Component, ReactNode } from "react";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Dynamic import - solo se carga cuando el wrapper se renderiza
const MapaSucursalesGlobal = lazy(() => import("./MapaSucursalesGlobal"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Error Boundary específico para el mapa
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("❌ [MAP_ERROR] Error al cargar el mapa:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open={true} onOpenChange={this.props.onClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mapa de Sucursales
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                El mapa no pudo cargar
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Verifica que la API de Google Maps esté configurada correctamente.
              </p>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4 max-w-full overflow-auto">
                <p className="font-medium mb-1">APIs requeridas:</p>
                <ul className="list-disc list-inside text-left">
                  <li>Maps JavaScript API</li>
                  <li>Places API</li>
                  <li>Geocoding API</li>
                </ul>
              </div>
              <Button variant="outline" onClick={this.props.onClose}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
function LoadingFallback() {
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Cargando mapa...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MapaSucursalesGlobalWrapper({ open, onOpenChange }: Props) {
  // No renderizar nada si no está abierto - esto previene la carga del módulo
  if (!open) return null;

  return (
    <MapErrorBoundary onClose={() => onOpenChange(false)}>
      <Suspense fallback={<LoadingFallback />}>
        <MapaSucursalesGlobal open={open} onOpenChange={onOpenChange} />
      </Suspense>
    </MapErrorBoundary>
  );
}
