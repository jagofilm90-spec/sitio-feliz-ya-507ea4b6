import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary global para capturar errores de React y evitar pantallas en blanco
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Algo salió mal
              </h1>
              <p className="text-muted-foreground">
                Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-muted p-4 rounded-lg text-left overflow-auto max-h-40">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button onClick={this.handleReload} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar página
              </Button>
              <Button onClick={this.handleGoHome} variant="secondary">
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary para secciones específicas (contenido de página, mapas, etc.)
 */
interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
}

interface SectionErrorState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorState> {
  public state: SectionErrorState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<SectionErrorState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`SectionErrorBoundary [${this.props.sectionName || "unknown"}] caught an error:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg border border-border">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error al cargar {this.props.sectionName || "esta sección"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Ha ocurrido un problema al mostrar este contenido.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <div className="bg-muted p-3 rounded text-xs font-mono text-destructive mb-4 max-w-full overflow-auto">
              {this.state.error.toString()}
            </div>
          )}
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary específico para componentes de Google Maps
 */
export class MapErrorBoundary extends Component<{ children: ReactNode }, SectionErrorState> {
  public state: SectionErrorState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<SectionErrorState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MapErrorBoundary caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-muted/30 rounded-lg border border-border">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
          <h3 className="text-base font-medium text-foreground mb-1">
            Error al cargar el mapa
          </h3>
          <p className="text-sm text-muted-foreground mb-3 text-center px-4">
            No se pudo mostrar Google Maps. Verifica tu conexión a internet.
          </p>
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
