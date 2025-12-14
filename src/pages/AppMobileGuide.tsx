import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Zap,
  ListChecks,
  CircleDot,
  Palette
} from "lucide-react";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  platform: 'all' | 'ios' | 'android';
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'github', label: 'Proyecto exportado a GitHub', description: 'Settings → GitHub → Export', platform: 'all' },
  { id: 'clone', label: 'Repositorio clonado localmente', description: 'git clone en tu Mac', platform: 'all' },
  { id: 'npm', label: 'Dependencias instaladas (npm install)', platform: 'all' },
  { id: 'icons-ios', label: 'Íconos iOS descargados', description: 'Desde /generate-assets', platform: 'ios' },
  { id: 'icons-android', label: 'Íconos Android descargados', description: 'Desde /generate-assets', platform: 'android' },
  { id: 'splash', label: 'Splash screens generados', description: 'Desde /generate-assets', platform: 'all' },
  { id: 'xcode', label: 'Xcode instalado', description: 'Desde App Store', platform: 'ios' },
  { id: 'android-studio', label: 'Android Studio instalado', platform: 'android' },
  { id: 'cap-add', label: 'Plataforma agregada (npx cap add)', platform: 'all' },
  { id: 'build', label: 'Proyecto compilado (npm run build)', platform: 'all' },
  { id: 'sync', label: 'Sincronizado (npx cap sync)', platform: 'all' },
  { id: 'device', label: 'Dispositivo conectado', platform: 'all' },
  { id: 'run', label: 'App ejecutada en dispositivo', platform: 'all' },
];

const AppMobileGuide = () => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>('ios');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    toast.success(`Comando copiado: ${label}`);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const toggleCheckItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredChecklist = CHECKLIST_ITEMS.filter(
    item => item.platform === 'all' || item.platform === selectedPlatform
  );

  const completedCount = filteredChecklist.filter(item => checkedItems.has(item.id)).length;
  const progressPercent = (completedCount / filteredChecklist.length) * 100;

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

        {/* Interactive Checklist Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Checklist de Compilación
            </CardTitle>
            <CardDescription>
              Marca cada paso completado para trackear tu progreso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform selector */}
            <div className="flex gap-2">
              <Button
                variant={selectedPlatform === 'ios' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlatform('ios')}
                className="gap-2"
              >
                <Apple className="h-4 w-4" />
                iOS
              </Button>
              <Button
                variant={selectedPlatform === 'android' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlatform('android')}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Android
              </Button>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{completedCount} / {filteredChecklist.length}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Checklist items */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                    checkedItems.has(item.id) ? 'bg-green-500/10' : ''
                  }`}
                  onClick={() => toggleCheckItem(item.id)}
                >
                  <Checkbox
                    checked={checkedItems.has(item.id)}
                    onCheckedChange={() => toggleCheckItem(item.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${checkedItems.has(item.id) ? 'line-through text-muted-foreground' : ''}`}>
                      {item.label}
                    </span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  {item.platform !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      {item.platform === 'ios' ? <Apple className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {progressPercent === 100 && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-600">¡Completado!</AlertTitle>
                <AlertDescription className="text-green-600/80">
                  Has completado todos los pasos para {selectedPlatform === 'ios' ? 'iOS' : 'Android'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <Link to="/generate-assets" className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Generar Assets</h4>
                  <p className="text-sm text-muted-foreground">Íconos, Splash, Screenshots</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Ir a Generador
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Terminal className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold">Comando Rápido</h4>
                <p className="text-sm text-muted-foreground">Build + Sync completo</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => copyToClipboard('npm run build && npx cap sync', 'build-sync')}
              >
                {copiedCommand === 'build-sync' ? (
                  <><CheckCircle2 className="h-3 w-3 mr-2 text-green-500" /> Copiado</>
                ) : (
                  <><Copy className="h-3 w-3 mr-2" /> Copiar</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Download className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold">Guía Técnica</h4>
                <p className="text-sm text-muted-foreground">Documentación completa</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.open('https://capacitorjs.com/docs', '_blank')}
              >
                Capacitor Docs
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </CardContent>
          </Card>
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
              <div className="mt-2 flex items-center gap-2">
                <Badge>iOS / Xcode</Badge>
                <CircleDot className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Listo</span>
              </div>
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
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary">Android / Android Studio</Badge>
                <CircleDot className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Listo</span>
              </div>
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
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary">Android / Android Studio</Badge>
                <CircleDot className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Listo</span>
              </div>
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
                <h4 className="font-medium text-sm">Actualizar app después de cambios:</h4>
                <CommandBlock command="npm run build && npx cap sync" label="update-app" />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Abrir en IDE:</h4>
                <CommandBlock command="npx cap open ios    # Para Xcode
npx cap open android # Para Android Studio" label="open-ide" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/generate-assets" className="gap-2">
              <Download className="h-4 w-4" />
              Generar Assets
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.open('https://capacitorjs.com/docs', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentación Capacitor
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AppMobileGuide;