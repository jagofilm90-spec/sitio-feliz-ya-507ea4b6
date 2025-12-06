import { useState, lazy, Suspense, Component, ReactNode } from "react";
import { Loader2, MapPin, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Lazy load para aislar completamente cualquier error de @react-google-maps/api
const MapaSucursalesGlobal = lazy(() => import("./MapaSucursalesGlobal"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Error Boundary específico para el mapa - aísla errores sin afectar el resto del ERP
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ [MAP_ERROR_BOUNDARY] Error capturado:", error);
    console.error("❌ [MAP_ERROR_BOUNDARY] Component Stack:", errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            El mapa no pudo cargar
          </h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            Hubo un problema al cargar el componente del mapa. Puedes reintentar o ver las sucursales directamente en Google Maps.
          </p>
          <div className="flex gap-2">
            <Button variant="default" onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => window.open("https://www.google.com/maps", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Google Maps
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
function MapLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Cargando mapa de sucursales...</p>
    </div>
  );
}

export function MapaSucursalesGlobalWrapper({ open, onOpenChange }: Props) {
  const [retryKey, setRetryKey] = useState(0);

  // No renderizar nada si no está abierto
  if (!open) return null;

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Sucursales
          </DialogTitle>
          <DialogDescription>
            Visualiza todas las sucursales de clientes en el mapa
          </DialogDescription>
        </DialogHeader>
        
        <MapErrorBoundary key={retryKey} onRetry={handleRetry}>
          <Suspense fallback={<MapLoadingFallback />}>
            <MapaSucursalesGlobal open={open} onOpenChange={onOpenChange} />
          </Suspense>
        </MapErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
