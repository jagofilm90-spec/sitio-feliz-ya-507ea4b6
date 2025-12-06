import { useState, useEffect, lazy, Suspense, Component, ReactNode } from "react";
import { Loader2, MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Dynamic import con logging
const MapaSucursalesGlobal = lazy(() => {
  console.log("🗺️ [MAP_LOADER] Iniciando import dinámico de MapaSucursalesGlobal...");
  return import("./MapaSucursalesGlobal")
    .then((module) => {
      console.log("✅ [MAP_LOADER] Módulo MapaSucursalesGlobal cargado exitosamente");
      return module;
    })
    .catch((error) => {
      console.error("❌ [MAP_LOADER] Error al importar MapaSucursalesGlobal:", error);
      throw error;
    });
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Error Boundary específico para el mapa
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

class MapErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onClose: () => void; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Determinar tipo de error para mensaje más específico
    let errorInfo = "Error desconocido";
    
    if (error.message?.includes("Failed to fetch") || error.message?.includes("Importing a module")) {
      errorInfo = "Error de red al cargar el módulo. Intenta recargar la página.";
    } else if (error.message?.includes("Google Maps")) {
      errorInfo = "Error de configuración de Google Maps API.";
    } else if (error.message?.includes("API key")) {
      errorInfo = "API Key de Google Maps no válida o no configurada.";
    }
    
    return { hasError: true, error, errorInfo };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ [MAP_ERROR_BOUNDARY] Error capturado:", error);
    console.error("❌ [MAP_ERROR_BOUNDARY] Component Stack:", errorInfo.componentStack);
  }

  handleRetry = () => {
    console.log("🔄 [MAP_ERROR_BOUNDARY] Reintentando carga del mapa...");
    this.setState({ hasError: false, error: null, errorInfo: "" });
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
              <p className="text-muted-foreground text-sm mb-3">
                {this.state.errorInfo}
              </p>
              
              {this.state.error && (
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4 max-w-full overflow-auto text-left">
                  <p className="font-medium mb-1">Detalles técnicos:</p>
                  <code className="break-all">{this.state.error.message}</code>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4 max-w-full">
                <p className="font-medium mb-1">APIs requeridas en Google Cloud:</p>
                <ul className="list-disc list-inside text-left">
                  <li>Maps JavaScript API</li>
                  <li>Places API</li>
                  <li>Geocoding API</li>
                </ul>
                <p className="mt-2 font-medium">Dominios permitidos:</p>
                <ul className="list-disc list-inside text-left">
                  <li>*.lovable.app/*</li>
                  <li>*.lovableproject.com/*</li>
                </ul>
              </div>

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

// Loading fallback component
function LoadingFallback() {
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Sucursales
          </DialogTitle>
          <DialogDescription>
            Preparando el mapa...
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Cargando mapa...</p>
          <p className="text-xs text-muted-foreground mt-2">
            Esto puede tomar unos segundos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MapaSucursalesGlobalWrapper({ open, onOpenChange }: Props) {
  const [retryKey, setRetryKey] = useState(0);

  // Log cuando se abre/cierra el mapa
  useEffect(() => {
    if (open) {
      console.log("🗺️ [MAP_WRAPPER] Abriendo mapa de sucursales...");
    }
  }, [open]);

  // No renderizar nada si no está abierto - esto previene la carga del módulo
  if (!open) return null;

  const handleRetry = () => {
    console.log("🔄 [MAP_WRAPPER] Forzando recarga del componente con nueva key:", retryKey + 1);
    setRetryKey((prev) => prev + 1);
  };

  return (
    <MapErrorBoundary 
      key={retryKey}
      onClose={() => onOpenChange(false)} 
      onRetry={handleRetry}
    >
      <Suspense fallback={<LoadingFallback />}>
        <MapaSucursalesGlobal open={open} onOpenChange={onOpenChange} />
      </Suspense>
    </MapErrorBoundary>
  );
}
