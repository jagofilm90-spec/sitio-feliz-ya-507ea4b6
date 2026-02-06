import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  Smartphone,
  Database,
  Shield,
  Play
} from "lucide-react";
import {
  getPlatformInfo,
  checkPermissionStatus,
  getPromptStatus,
  getDeviceTokenFromDb,
  runPushDiagnostics,
  getDiagnosticLogs,
  clearDiagnosticLogs,
  subscribeToLogs,
  resetPushPromptFlag
} from "@/services/pushDiagnostics";

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function PushNotificationDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [platformInfo, setPlatformInfo] = useState({ platform: '', isNative: false });
  const [permissionStatus, setPermissionStatus] = useState<string>('checking...');
  const [promptStatus, setPromptStatus] = useState({ promptSeen: false });
  const [dbToken, setDbToken] = useState<{ found: boolean; token?: string; platform?: string; updatedAt?: string }>({ found: false });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Subscribe to log updates
  useEffect(() => {
    const unsubscribe = subscribeToLogs((newLogs) => {
      setLogs(newLogs);
    });

    return () => unsubscribe();
  }, []);

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    
    setPlatformInfo(getPlatformInfo());
    setPromptStatus(getPromptStatus());
    
    const perm = await checkPermissionStatus();
    setPermissionStatus(perm);
    
    const token = await getDeviceTokenFromDb();
    setDbToken(token);
    
    setIsLoadingStatus(false);
  };

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    await runPushDiagnostics();
    await loadStatus(); // Refresh status after diagnostics
    setIsRunning(false);
  };

  const handleClearLogs = () => {
    clearDiagnosticLogs();
    setLogs([]);
  };

  const handleResetPromptFlag = () => {
    resetPushPromptFlag();
    setPromptStatus({ promptSeen: false });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <XCircle className="h-3 w-3 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      default: return <Info className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getLogClass = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-destructive';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'granted') {
      return <Badge variant="default">Concedidos</Badge>;
    } else if (status === 'denied') {
      return <Badge variant="destructive">Denegados</Badge>;
    } else if (status === 'not_native') {
      return <Badge variant="secondary">No aplica (Web)</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Diagnóstico Push Notifications
        </h2>
        <p className="text-sm text-muted-foreground">
          Herramienta para depurar el registro de notificaciones push
        </p>
      </div>

      <Separator />

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Estado del Sistema
          </CardTitle>
          <CardDescription>
            Información actual del dispositivo y permisos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando estado...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Plataforma</p>
                <p className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  {platformInfo.platform || 'Desconocido'}
                  {platformInfo.isNative ? (
                    <Badge variant="default">Nativo</Badge>
                  ) : (
                    <Badge variant="secondary">Web</Badge>
                  )}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Permisos del Sistema</p>
                <p className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {getStatusBadge(permissionStatus)}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Prompt Mostrado</p>
                <p className="font-medium flex items-center gap-2">
                  {promptStatus.promptSeen ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Sí (localStorage)
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      No
                    </>
                  )}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Token en Base de Datos</p>
                <p className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {dbToken.found ? (
                    <Badge variant="default">Encontrado</Badge>
                  ) : (
                    <Badge variant="destructive">No encontrado</Badge>
                  )}
                </p>
              </div>
              
              {dbToken.found && (
                <>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm text-muted-foreground">Detalles del Token</p>
                    <div className="p-2 bg-muted rounded-md text-xs font-mono break-all">
                      <p><strong>Platform:</strong> {dbToken.platform}</p>
                      <p><strong>Token:</strong> {dbToken.token?.substring(0, 60)}...</p>
                      <p><strong>Actualizado:</strong> {dbToken.updatedAt}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadStatus}
              disabled={isLoadingStatus}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
              Actualizar Estado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Acciones de Diagnóstico
          </CardTitle>
          <CardDescription>
            Ejecuta el proceso de registro y observa cada paso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleRunDiagnostics}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Diagnóstico Completo
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleResetPromptFlag}
              disabled={isRunning}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Flag localStorage
            </Button>
            
            <Button 
              variant="ghost"
              onClick={handleClearLogs}
              disabled={isRunning || logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Logs
            </Button>
          </div>
          
          {!platformInfo.isNative && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              <strong>Modo Web detectado.</strong> El diagnóstico intentará ejecutarse, pero las notificaciones push 
              solo funcionarán completamente en plataformas nativas (iOS/Android). 
              Si estás en un dispositivo físico y ves este mensaje, hay un problema con la detección de Capacitor.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Logs en Tiempo Real
            {logs.length > 0 && (
              <Badge variant="outline">{logs.length} entradas</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Registro detallado del proceso de diagnóstico
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay logs aún.</p>
              <p className="text-sm">Presiona "Ejecutar Diagnóstico" para comenzar.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full rounded-md border p-3 bg-muted/30">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-2 ${getLogClass(log.type)}`}
                  >
                    <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
                    <span className="shrink-0">{getLogIcon(log.type)}</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
