import { Capacitor } from "@capacitor/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone, Globe, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PushNotificationDiagnostics } from "@/components/configuracion/PushNotificationDiagnostics";

/**
 * Página de diagnóstico de Push Notifications accesible sin verificación de plataforma.
 * Permite depurar por qué Capacitor podría no estar detectando la plataforma correctamente.
 */
export default function PushDiagnosticsPage() {
  const navigate = useNavigate();
  
  // Obtener información de Capacitor directamente
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Diagnóstico Push Notifications</h1>
            <p className="text-muted-foreground">Ruta de acceso directo para depuración</p>
          </div>
        </div>

        {/* Capacitor Detection Info */}
        <Card className={isNative ? "border-green-500/50" : "border-yellow-500/50"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isNative ? (
                <Smartphone className="h-5 w-5 text-green-500" />
              ) : (
                <Globe className="h-5 w-5 text-yellow-500" />
              )}
              Detección de Capacitor
            </CardTitle>
            <CardDescription>
              Valores actuales que retorna @capacitor/core
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Capacitor.getPlatform()</p>
                <p className="font-mono text-lg font-semibold">"{platform}"</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Capacitor.isNativePlatform()</p>
                <p className="font-mono text-lg font-semibold flex items-center gap-2">
                  {isNative ? "true" : "false"}
                  {isNative ? (
                    <Badge variant="default">Nativo</Badge>
                  ) : (
                    <Badge variant="secondary">Web</Badge>
                  )}
                </p>
              </div>
            </div>
            
            {!isNative && (
              <div className="mt-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                <strong>Capacitor no detecta plataforma nativa.</strong> Esto puede significar:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>La app se está ejecutando en un navegador web, no en el WebView nativo</li>
                  <li>El build de Capacitor no se sincronizó correctamente (ejecutar <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">npx cap sync</code>)</li>
                  <li>El proyecto iOS no tiene el plugin de Capacitor correctamente instalado</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnóstico Completo */}
        <PushNotificationDiagnostics />
      </div>
    </div>
  );
}
