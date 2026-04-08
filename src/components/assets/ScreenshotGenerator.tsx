import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Download, Monitor, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// iPhone screenshot sizes required for App Store
const SCREENSHOT_SIZES = [
  { name: '6.7"', width: 1290, height: 2796, device: 'iPhone 15 Pro Max, 15 Plus, 14 Pro Max' },
  { name: '6.5"', width: 1242, height: 2688, device: 'iPhone 11 Pro Max, XS Max' },
  { name: '5.5"', width: 1242, height: 2208, device: 'iPhone 8 Plus, 7 Plus, 6s Plus' },
];

// Key screens to capture
const SCREENS_TO_CAPTURE = [
  { path: '/dashboard', name: 'Dashboard', description: 'Panel principal con KPIs' },
  { path: '/pedidos', name: 'Pedidos', description: 'Gestión de pedidos' },
  { path: '/inventario', name: 'Inventario', description: 'Control de stock' },
  { path: '/rutas', name: 'Rutas', description: 'Planificación de entregas' },
  { path: '/correos', name: 'Correos', description: 'Bandeja corporativa' },
];

const ScreenshotGenerator = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  const openInNewWindow = (path: string, width: number, height: number) => {
    const url = `${window.location.origin}${path}`;
    window.open(
      url,
      '_blank',
      `width=${width / 3},height=${height / 3},menubar=no,toolbar=no,location=no`
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Screenshots para App Store
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para screenshots profesionales, usa el simulador de Xcode o un dispositivo real.
            Captura las pantallas principales y súbelas a App Store Connect.
          </AlertDescription>
        </Alert>

        {/* Required sizes */}
        <div>
          <h4 className="text-sm font-medium mb-2">Tamaños Requeridos</h4>
          <div className="space-y-2">
            {SCREENSHOT_SIZES.map((size) => (
              <div
                key={size.name}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <div>
                  <span className="font-medium">{size.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {size.width} x {size.height}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{size.device}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Screens to capture */}
        <div>
          <h4 className="text-sm font-medium mb-2">Pantallas Sugeridas</h4>
          <div className="space-y-2">
            {SCREENS_TO_CAPTURE.map((screen) => (
              <div
                key={screen.path}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <span className="font-medium text-sm">{screen.name}</span>
                  <p className="text-xs text-muted-foreground">{screen.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInNewWindow(screen.path, 1290, 2796)}
                >
                  <Monitor className="h-3 w-3 mr-1" />
                  Abrir
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Pasos para capturas profesionales:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Abre Xcode → Window → Devices and Simulators</li>
            <li>Selecciona un simulador iPhone (15 Pro Max recomendado)</li>
            <li>Navega a cada pantalla de ALMASA-OS</li>
            <li>Presiona Cmd + S para capturar screenshot</li>
            <li>Repite para cada tamaño de dispositivo requerido</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScreenshotGenerator;
