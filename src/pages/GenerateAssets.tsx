import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Camera, BookOpen } from 'lucide-react';
import AppIconGenerator from '@/components/assets/AppIconGenerator';
import SplashGenerator from '@/components/assets/SplashGenerator';
import ScreenshotGenerator from '@/components/assets/ScreenshotGenerator';
import AppStoreInstructions from '@/components/assets/AppStoreInstructions';

const GenerateAssets = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Assets para App Store
          </h1>
          <p className="text-muted-foreground">
            Genera íconos, splash screens y prepara screenshots para publicar en App Store
          </p>
        </div>

        <Tabs defaultValue="icons" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="icons" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Íconos</span>
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Screenshots</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Guía</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="icons" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <AppIconGenerator />
              <SplashGenerator />
            </div>
          </TabsContent>

          <TabsContent value="screenshots" className="mt-6">
            <ScreenshotGenerator />
          </TabsContent>

          <TabsContent value="guide" className="mt-6">
            <AppStoreInstructions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GenerateAssets;
