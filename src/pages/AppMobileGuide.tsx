import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  Tablet, 
  Apple, 
  Terminal, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  AlertTriangle,
  Download,
  Settings,
  Zap
} from "lucide-react";
import { toast } from "sonner";

const AppMobileGuide = () => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    toast.success(`Comando copiado: ${label}`);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const CommandBlock = ({ command, label }: { command: string; label: string }) => (
    <div className="relative group">
      <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto font-mono">
        <code>{command}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyToClipboard(command, label)}
      >
        {copiedCommand === label ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  const StepCard = ({ 
    step, 
    title, 
    description, 
    command, 
    note 
  }: { 
    step: number; 
    title: string; 
    description: string; 
    command?: string; 
    note?: string;
  }) => (
    <div className="flex gap-4 pb-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
        {step}
      </div>
      <div className="flex-1 space-y-2">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        {command && <CommandBlock command={command} label={`paso-${step}`} />}
        {note && (
          <p className="text-xs text-muted-foreground italic mt-2">
            💡 {note}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Apps Móviles</h1>
            <p className="text-muted-foreground">
              Guía de compilación para iOS y Android
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <Apple className="h-3 w-3" />
              iOS
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Smartphone className="h-3 w-3" />
              Android
            </Badge>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tablet className="h-5 w-5 text-primary" />
                iPad (Admin)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                ERP completo con acceso a todos los módulos
              </p>
              <Badge className="mt-2">iOS / Xcode</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tablet className="h-5 w-5 text-orange-500" />
                Galaxy Tab (Almacén)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Interfaz de carga para almacenistas
              </p>
              <Badge variant="secondary" className="mt-2">Android / Android Studio</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-500" />
                Celulares (Choferes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Panel de entregas y navegación GPS
              </p>
              <Badge variant="secondary" className="mt-2">Android / Android Studio</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Prerequisites */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Requisitos Previos</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Mac</strong> con macOS para compilar iOS (obligatorio para Xcode)</li>
              <li><strong>Xcode</strong> instalado desde App Store (para iOS)</li>
              <li><strong>Android Studio</strong> instalado (para Android)</li>
              <li><strong>Node.js</strong> v18 o superior</li>
              <li>Proyecto <strong>exportado a GitHub</strong> y clonado localmente</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Tabs for iOS and Android */}
        <Tabs defaultValue="ios" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ios" className="gap-2">
              <Apple className="h-4 w-4" />
              iOS (iPad)
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Android (Tablet/Celular)
            </TabsTrigger>
          </TabsList>

          {/* iOS Tab */}
          <TabsContent value="ios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Compilación iOS
                </CardTitle>
                <CardDescription>
                  Sigue estos pasos en tu Mac para compilar la app de iPad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <StepCard
                  step={1}
                  title="Clonar/Actualizar proyecto"
                  description="Si es primera vez, clona el repositorio. Si ya lo tienes, actualiza con git pull."
                  command="git clone https://github.com/tu-usuario/almasa-erp.git
cd almasa-erp
# O si ya existe:
git pull origin main"
                />

                <StepCard
                  step={2}
                  title="Instalar dependencias"
                  description="Instala todas las dependencias del proyecto."
                  command="npm install"
                />

                <StepCard
                  step={3}
                  title="Agregar plataforma iOS"
                  description="Solo la primera vez - agrega la plataforma iOS al proyecto."
                  command="npx cap add ios"
                  note="Este paso solo se hace una vez. Si ya existe la carpeta 'ios', omítelo."
                />

                <StepCard
                  step={4}
                  title="Compilar el proyecto web"
                  description="Genera la versión de producción del proyecto."
                  command="npm run build"
                />

                <StepCard
                  step={5}
                  title="Sincronizar con iOS"
                  description="Copia los archivos compilados a la carpeta iOS."
                  command="npx cap sync ios"
                  note="Ejecuta este comando cada vez que hagas cambios y quieras actualizar la app."
                />

                <StepCard
                  step={6}
                  title="Abrir en Xcode"
                  description="Abre el proyecto en Xcode para compilar."
                  command="npx cap open ios"
                />

                <Separator className="my-4" />

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuración en Xcode
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Selecciona tu <strong>Team</strong> de desarrollo en Signing & Capabilities</li>
                    <li>Conecta tu <strong>iPad</strong> vía USB</li>
                    <li>Selecciona tu iPad como destino en la barra superior</li>
                    <li>Presiona <strong>▶ Run</strong> (Cmd + R) para instalar</li>
                  </ol>
                </div>

                <Alert className="mt-4">
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Hot Reload Activado</AlertTitle>
                  <AlertDescription>
                    La app está configurada para conectarse al servidor de desarrollo de Lovable.
                    Los cambios que hagas en el código se reflejarán en tiempo real en la app.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Android Tab */}
          <TabsContent value="android" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Compilación Android
                </CardTitle>
                <CardDescription>
                  Sigue estos pasos para compilar la app de Android (tablets y celulares)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <StepCard
                  step={1}
                  title="Clonar/Actualizar proyecto"
                  description="Si es primera vez, clona el repositorio. Si ya lo tienes, actualiza con git pull."
                  command="git clone https://github.com/tu-usuario/almasa-erp.git
cd almasa-erp
# O si ya existe:
git pull origin main"
                />

                <StepCard
                  step={2}
                  title="Instalar dependencias"
                  description="Instala todas las dependencias del proyecto."
                  command="npm install"
                />

                <StepCard
                  step={3}
                  title="Agregar plataforma Android"
                  description="Solo la primera vez - agrega la plataforma Android al proyecto."
                  command="npx cap add android"
                  note="Este paso solo se hace una vez. Si ya existe la carpeta 'android', omítelo."
                />

                <StepCard
                  step={4}
                  title="Compilar el proyecto web"
                  description="Genera la versión de producción del proyecto."
                  command="npm run build"
                />

                <StepCard
                  step={5}
                  title="Sincronizar con Android"
                  description="Copia los archivos compilados a la carpeta Android."
                  command="npx cap sync android"
                  note="Ejecuta este comando cada vez que hagas cambios y quieras actualizar la app."
                />

                <StepCard
                  step={6}
                  title="Abrir en Android Studio"
                  description="Abre el proyecto en Android Studio para compilar."
                  command="npx cap open android"
                />

                <Separator className="my-4" />

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuración en Android Studio
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Espera a que Gradle sincronice el proyecto (puede tardar unos minutos)</li>
                    <li>Habilita <strong>Developer Options</strong> y <strong>USB Debugging</strong> en tu tablet/celular</li>
                    <li>Conecta el dispositivo vía USB</li>
                    <li>Selecciona tu dispositivo en la barra superior</li>
                    <li>Presiona <strong>▶ Run 'app'</strong> para instalar</li>
                  </ol>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Generar APK para distribución
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Para instalar en múltiples dispositivos sin Android Studio:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)</li>
                    <li>El APK se genera en: <code className="bg-background px-1 rounded">android/app/build/outputs/apk/debug/</code></li>
                    <li>Transfiere el APK a los dispositivos vía USB o enlace de descarga</li>
                  </ol>
                </div>

                <Alert className="mt-4">
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Hot Reload Activado</AlertTitle>
                  <AlertDescription>
                    La app está configurada para conectarse al servidor de desarrollo de Lovable.
                    Los cambios que hagas en el código se reflejarán en tiempo real en la app.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Permissions Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Permisos Nativos Requeridos</CardTitle>
            <CardDescription>
              Estos permisos deben estar configurados para GPS y notificaciones push
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Apple className="h-4 w-4" />
                  iOS (Info.plist)
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><code>NSLocationWhenInUseUsageDescription</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><code>NSLocationAlwaysUsageDescription</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Push Notifications capability</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Android (AndroidManifest.xml)
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><code>ACCESS_FINE_LOCATION</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><code>ACCESS_COARSE_LOCATION</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><code>ACCESS_BACKGROUND_LOCATION</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Firebase Cloud Messaging</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Referencia Rápida</CardTitle>
            <CardDescription>
              Comandos más usados para el día a día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Actualizar app después de cambios:</p>
                <CommandBlock 
                  command="git pull && npm run build && npx cap sync" 
                  label="sync-all" 
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Solo sincronizar (sin rebuild):</p>
                <CommandBlock 
                  command="npx cap sync" 
                  label="sync-only" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <a href="/generate-assets" className="gap-2">
              <Download className="h-4 w-4" />
              Generar Assets (Íconos/Splash)
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a 
              href="https://capacitorjs.com/docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Documentación Capacitor
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AppMobileGuide;
