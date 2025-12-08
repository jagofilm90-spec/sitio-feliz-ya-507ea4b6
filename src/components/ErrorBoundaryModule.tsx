/**
 * ==========================================================
 * 🛡️ ERROR BOUNDARY POR MÓDULO
 * ==========================================================
 * 
 * ErrorBoundary específico para módulos críticos del ERP.
 * Captura errores y muestra fallback sin romper la app completa.
 * 
 * Uso:
 * <ErrorBoundaryModule 
 *   moduleName="Rutas" 
 *   fallback={<RutasFallback />}
 * >
 *   <ContenidoDelModulo />
 * </ErrorBoundaryModule>
 * 
 * Última actualización: 2025-12-08
 * ==========================================================
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  moduleName: string;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundaryModule extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundaryModule:${this.props.moduleName}] Error capturado:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error en {this.props.moduleName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ocurrió un error al cargar este módulo. El resto del sistema sigue funcionando.
            </p>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="p-3 bg-muted rounded-lg overflow-auto max-h-32">
                <p className="text-xs font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={this.handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button variant="ghost" size="sm" onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryModule;
