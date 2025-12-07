/**
 * ==========================================================
 * 🛡️ ERROR BOUNDARY GLOBAL
 * ==========================================================
 * 
 * Captura errores de React y muestra un fallback amigable
 * en lugar de pantalla blanca. Crítico para prevenir que
 * errores en componentes individuales rompan toda la app.
 * 
 * Última actualización: 2025-12-07
 * ==========================================================
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

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
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            
            <h1 className="text-xl font-semibold text-foreground">
              Algo salió mal
            </h1>
            
            <p className="text-sm text-muted-foreground">
              Ha ocurrido un error inesperado. Intenta recargar la página.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-left overflow-auto max-h-48">
                <p className="text-xs font-mono text-destructive">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-muted-foreground mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={this.handleReset}>
                Intentar de nuevo
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
