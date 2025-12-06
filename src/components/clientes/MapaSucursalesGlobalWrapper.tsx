import { useState, Component, ReactNode } from "react";
import { Loader2, MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MapaSucursalesGlobal from "./MapaSucursalesGlobal";

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
  { children: ReactNode; onClose: () => void; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onClose: () => void; onRetry: () => void }) {
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
        <Dialog open={true} onOpenChange={this.props.onClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mapa de Sucursales
              </DialogTitle>
              <DialogDescription>
                No se pudo cargar el componente del mapa
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                El mapa no pudo cargar
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Hubo un problema al cargar el componente del mapa.
              </p>

              <div className="flex gap-2">
                <Button variant="default" onClick={this.handleRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
                <Button variant="outline" onClick={this.props.onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return this.props.children;
  }
}

export function MapaSucursalesGlobalWrapper({ open, onOpenChange }: Props) {
  const [retryKey, setRetryKey] = useState(0);

  // No renderizar nada si no está abierto
  if (!open) return null;

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  return (
    <MapErrorBoundary 
      key={retryKey}
      onClose={() => onOpenChange(false)} 
      onRetry={handleRetry}
    >
      <MapaSucursalesGlobal open={open} onOpenChange={onOpenChange} />
    </MapErrorBoundary>
  );
}
