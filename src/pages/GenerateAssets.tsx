import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Image, Smartphone } from 'lucide-react';
import logoAlmasa from '@/assets/logo-almasa.png';

const GenerateAssets = () => {
  const splashCanvasRef = useRef<HTMLCanvasElement>(null);
  const iconCanvasRef = useRef<HTMLCanvasElement>(null);
  const [splashReady, setSplashReady] = useState(false);
  const [iconReady, setIconReady] = useState(false);

  useEffect(() => {
    generateSplash();
    generateIcon();
  }, []);

  const generateSplash = () => {
    const canvas = splashCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for splash (2732x2732 for iOS)
    canvas.width = 2732;
    canvas.height = 2732;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw logo
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate size to fit logo nicely (about 40% of canvas width)
      const maxWidth = canvas.width * 0.4;
      const scale = maxWidth / img.width;
      const logoWidth = img.width * scale;
      const logoHeight = img.height * scale;

      // Center the logo
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      ctx.drawImage(img, x, y, logoWidth, logoHeight);
      setSplashReady(true);
    };
    img.src = logoAlmasa;
  };

  const generateIcon = () => {
    const canvas = iconCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for icon (1024x1024 for iOS)
    canvas.width = 1024;
    canvas.height = 1024;

    // Fill red background
    ctx.fillStyle = '#B22234';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load logo and draw in white
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate size to fit logo nicely (about 70% of canvas width)
      const maxWidth = canvas.width * 0.7;
      const scale = maxWidth / img.width;
      const logoWidth = img.width * scale;
      const logoHeight = img.height * scale;

      // Center the logo
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      // Create temporary canvas to process logo to white
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        
        // Get image data and convert red to white
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // If pixel has color (not fully transparent)
          if (data[i + 3] > 0) {
            // Convert to white
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
          }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, x, y, logoWidth, logoHeight);
      }
      
      setIconReady(true);
    };
    img.src = logoAlmasa;
  };

  const downloadSplash = () => {
    const canvas = splashCanvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'splash.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadIcon = () => {
    const canvas = iconCanvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'icon.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Generador de Assets iOS</h1>
          <p className="text-muted-foreground">
            Descarga las imágenes y guárdalas en la carpeta <code className="bg-muted px-2 py-1 rounded">resources/</code>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Splash Screen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Splash Screen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-white border rounded-lg overflow-hidden flex items-center justify-center">
                <canvas 
                  ref={splashCanvasRef} 
                  className="max-w-full max-h-full"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>• Tamaño: 2732 x 2732 px</p>
                <p>• Fondo: Blanco (#FFFFFF)</p>
                <p>• Logo: ALMASA rojo centrado</p>
              </div>
              <Button 
                onClick={downloadSplash} 
                disabled={!splashReady}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar splash.png
              </Button>
            </CardContent>
          </Card>

          {/* App Icon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                App Icon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-[#B22234] border rounded-lg overflow-hidden flex items-center justify-center">
                <canvas 
                  ref={iconCanvasRef} 
                  className="max-w-full max-h-full"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>• Tamaño: 1024 x 1024 px</p>
                <p>• Fondo: Rojo corporativo (#B22234)</p>
                <p>• Logo: ALMASA blanco centrado</p>
              </div>
              <Button 
                onClick={downloadIcon} 
                disabled={!iconReady}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar icon.png
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones de Instalación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Descarga ambas imágenes (splash.png e icon.png)</li>
              <li>Crea la carpeta <code className="bg-muted px-2 py-1 rounded">resources/</code> en la raíz del proyecto</li>
              <li>Guarda las imágenes en esa carpeta</li>
              <li>Ejecuta en terminal:
                <pre className="bg-muted p-3 rounded mt-2 overflow-x-auto">
{`npm install -D @capacitor/assets
npx capacitor-assets generate --ios
npx cap sync ios`}
                </pre>
              </li>
              <li>Abre Xcode y ejecuta la app para ver el nuevo splash screen</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GenerateAssets;
