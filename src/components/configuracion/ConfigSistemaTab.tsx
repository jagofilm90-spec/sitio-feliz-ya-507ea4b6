import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  Server,
  Calendar,
  CheckCircle2,
  Bell,
  AlertTriangle
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { PushNotificationDiagnostics } from "./PushNotificationDiagnostics";
import { checkPermissionStatus, getDeviceTokenFromDb } from "@/services/pushDiagnostics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfigSistemaTab() {
  const navigate = useNavigate();
  const [isNative, setIsNative] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ permission: string; hasToken: boolean } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const buildDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    
    const loadPushStatus = async () => {
      const permission = await checkPermissionStatus();
      const token = await getDeviceTokenFromDb();
      setPushStatus({ permission, hasToken: token.found });
    };
    
    if (Capacitor.isNativePlatform()) {
      loadPushStatus();
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Sistema"
        lead="Información del sistema, respaldos y mantenimiento"
      />

      {/* Push Notifications - Only visible on native */}
      {isNative && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones Push
            </CardTitle>
            <CardDescription>
              Estado y diagnóstico de notificaciones push
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estado</p>
                {pushStatus ? (
                  <div className="flex items-center gap-2">
                    {pushStatus.hasToken ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Configuradas</span>
                        <Badge variant="default">Token activo</Badge>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium">Sin token</span>
                        <Badge variant="secondary">Requiere configuración</Badge>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Cargando...</span>
                )}
              </div>
            </div>
            
            <Dialog open={showDiagnostics} onOpenChange={setShowDiagnostics}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Abrir Diagnóstico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Diagnóstico de Push Notifications</DialogTitle>
                </DialogHeader>
                <PushNotificationDiagnostics />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versión</p>
              <p className="font-medium flex items-center gap-2">
                ALMASA-OS v2.0
                <Badge variant="secondary">Producción</Badge>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Última actualización</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {buildDate}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estado del backend</p>
              <p className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Operativo
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plataforma</p>
              <p className="font-medium flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                Lovable Cloud
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Respaldos de Datos
          </CardTitle>
          <CardDescription>
            Exporta datos críticos del ERP para respaldos manuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            La herramienta de respaldos permite exportar información importante 
            a formato Excel para mantener copias de seguridad externas.
          </p>
          <Button onClick={() => navigate("/respaldos")} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Ir a Respaldos
          </Button>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información Técnica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Framework</span>
              <span>React 18 + TypeScript</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">UI</span>
              <span>Tailwind CSS + shadcn/ui</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Base de Datos</span>
              <span>PostgreSQL (Supabase)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Autenticación</span>
              <span>Supabase Auth</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Storage</span>
              <span>Supabase Storage</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <div className="rounded-lg border p-4 bg-muted/50">
        <h4 className="font-medium text-sm mb-2">¿Necesitas ayuda?</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Para soporte técnico o reportar problemas, contacta al equipo de desarrollo.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/soporte")}>
          Ir a Soporte
        </Button>
      </div>
    </div>
  );
}
