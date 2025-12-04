import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone } from 'lucide-react';
import logoAlmasa from '@/assets/logo-almasa.png';

const SplashGenerator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    generateSplash();
  }, []);

  const generateSplash = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 2732;
    canvas.height = 2732;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxWidth = canvas.width * 0.4;
      const scale = maxWidth / img.width;
      const logoWidth = img.width * scale;
      const logoHeight = img.height * scale;
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      ctx.drawImage(img, x, y, logoWidth, logoHeight);
      setReady(true);
    };
    img.src = logoAlmasa;
  };

  const downloadSplash = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'splash.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Splash Screen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-square bg-white border rounded-lg overflow-hidden flex items-center justify-center max-w-[200px] mx-auto">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div className="text-sm text-muted-foreground text-center">
          <p>2732 x 2732 px • Fondo blanco • Logo ALMASA</p>
        </div>
        <Button onClick={downloadSplash} disabled={!ready} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Descargar splash.png
        </Button>
      </CardContent>
    </Card>
  );
};

export default SplashGenerator;
