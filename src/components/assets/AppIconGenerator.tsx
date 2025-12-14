import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle, Loader2, Apple, Smartphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import logoAlmasa from '@/assets/logo-almasa.png';

// All iOS icon sizes required for App Store
const IOS_ICON_SIZES = [
  { name: 'AppStore', size: 1024, description: 'App Store' },
  { name: 'iPhone-60@3x', size: 180, description: 'iPhone @3x' },
  { name: 'iPhone-60@2x', size: 120, description: 'iPhone @2x' },
  { name: 'iPad-Pro-83.5@2x', size: 167, description: 'iPad Pro @2x' },
  { name: 'iPad-76@2x', size: 152, description: 'iPad @2x' },
  { name: 'iPad-76@1x', size: 76, description: 'iPad @1x' },
  { name: 'Spotlight-40@3x', size: 120, description: 'Spotlight @3x' },
  { name: 'Spotlight-40@2x', size: 80, description: 'Spotlight @2x' },
  { name: 'Spotlight-40@1x', size: 40, description: 'Spotlight @1x' },
  { name: 'Settings-29@3x', size: 87, description: 'Settings @3x' },
  { name: 'Settings-29@2x', size: 58, description: 'Settings @2x' },
  { name: 'Settings-29@1x', size: 29, description: 'Settings @1x' },
  { name: 'Notification-20@3x', size: 60, description: 'Notification @3x' },
  { name: 'Notification-20@2x', size: 40, description: 'Notification @2x' },
  { name: 'Notification-20@1x', size: 20, description: 'Notification @1x' },
];

// All Android icon sizes required for Play Store
const ANDROID_ICON_SIZES = [
  { name: 'play-store', size: 512, description: 'Play Store', folder: '' },
  { name: 'ic_launcher', size: 192, description: 'xxxhdpi', folder: 'mipmap-xxxhdpi' },
  { name: 'ic_launcher', size: 144, description: 'xxhdpi', folder: 'mipmap-xxhdpi' },
  { name: 'ic_launcher', size: 96, description: 'xhdpi', folder: 'mipmap-xhdpi' },
  { name: 'ic_launcher', size: 72, description: 'hdpi', folder: 'mipmap-hdpi' },
  { name: 'ic_launcher', size: 48, description: 'mdpi', folder: 'mipmap-mdpi' },
  { name: 'ic_launcher_round', size: 192, description: 'xxxhdpi round', folder: 'mipmap-xxxhdpi' },
  { name: 'ic_launcher_round', size: 144, description: 'xxhdpi round', folder: 'mipmap-xxhdpi' },
  { name: 'ic_launcher_round', size: 96, description: 'xhdpi round', folder: 'mipmap-xhdpi' },
  { name: 'ic_launcher_round', size: 72, description: 'hdpi round', folder: 'mipmap-hdpi' },
  { name: 'ic_launcher_round', size: 48, description: 'mdpi round', folder: 'mipmap-mdpi' },
];

const AppIconGenerator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedIcons, setGeneratedIcons] = useState<Map<string, string>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');

  const currentSizes = platform === 'ios' ? IOS_ICON_SIZES : ANDROID_ICON_SIZES;

  useEffect(() => {
    generatePreview();
  }, []);

  const generatePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1024;
    canvas.height = 1024;

    // Red background
    ctx.fillStyle = '#B22234';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxWidth = canvas.width * 0.7;
      const scale = maxWidth / img.width;
      const logoWidth = img.width * scale;
      const logoHeight = img.height * scale;
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      // Convert logo to white
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, x, y, logoWidth, logoHeight);
      }
      setPreviewReady(true);
    };
    img.src = logoAlmasa;
  };

  const generateIconAtSize = (size: number, isRound = false): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // For round icons, clip to circle
      if (isRound) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      ctx.fillStyle = '#B22234';
      ctx.fillRect(0, 0, size, size);

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxWidth = size * 0.7;
        const scale = maxWidth / img.width;
        const logoWidth = img.width * scale;
        const logoHeight = img.height * scale;
        const x = (size - logoWidth) / 2;
        const y = (size - logoHeight) / 2;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }
          tempCtx.putImageData(imageData, 0, 0);
          ctx.drawImage(tempCanvas, x, y, logoWidth, logoHeight);
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = logoAlmasa;
    });
  };

  const generateAllIcons = async () => {
    setIsGenerating(true);
    const icons = new Map<string, string>();

    if (platform === 'ios') {
      for (const iconConfig of IOS_ICON_SIZES) {
        const dataUrl = await generateIconAtSize(iconConfig.size);
        icons.set(iconConfig.name, dataUrl);
      }
    } else {
      for (const iconConfig of ANDROID_ICON_SIZES) {
        const isRound = iconConfig.name.includes('round');
        const dataUrl = await generateIconAtSize(iconConfig.size, isRound);
        const key = iconConfig.folder ? `${iconConfig.folder}/${iconConfig.name}` : iconConfig.name;
        icons.set(key, dataUrl);
      }
    }

    setGeneratedIcons(icons);
    setIsGenerating(false);
  };

  const downloadIcon = (name: string, dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `${name}.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadAllIcons = () => {
    generatedIcons.forEach((dataUrl, name) => {
      setTimeout(() => {
        downloadIcon(name, dataUrl);
      }, 100);
    });
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform as 'ios' | 'android');
    setGeneratedIcons(new Map());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Íconos de App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform Tabs */}
        <Tabs value={platform} onValueChange={handlePlatformChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ios" className="gap-2">
              <Apple className="h-4 w-4" />
              iOS ({IOS_ICON_SIZES.length})
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Android ({ANDROID_ICON_SIZES.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-[#B22234] rounded-2xl overflow-hidden shadow-lg">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={generateAllIcons}
          disabled={!previewReady || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando {currentSizes.length} íconos...
            </>
          ) : (
            <>
              Generar Íconos {platform === 'ios' ? 'iOS' : 'Android'}
            </>
          )}
        </Button>

        {/* Generated icons list */}
        {generatedIcons.size > 0 && (
          <>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {currentSizes.map((config, index) => {
                const androidConfig = config as typeof ANDROID_ICON_SIZES[number];
                const key = platform === 'android' && androidConfig.folder 
                  ? `${androidConfig.folder}/${config.name}` 
                  : config.name;
                const dataUrl = generatedIcons.get(key);
                return (
                  <div
                    key={`${config.name}-${index}`}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {dataUrl && (
                        <img
                          src={dataUrl}
                          alt={config.name}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <span className="font-medium">{config.size}x{config.size}</span>
                      <span className="text-muted-foreground">{config.description}</span>
                      {platform === 'android' && androidConfig.folder && (
                        <code className="text-xs bg-muted px-1 rounded">{androidConfig.folder}</code>
                      )}
                    </div>
                    {dataUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadIcon(key, dataUrl)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <Button onClick={downloadAllIcons} className="w-full" variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Descargar Todos ({generatedIcons.size} íconos)
            </Button>

            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>
                Íconos listos para {platform === 'ios' ? 'App Store Connect' : 'Google Play Console'}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AppIconGenerator;