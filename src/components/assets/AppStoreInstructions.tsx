import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, CheckCircle } from 'lucide-react';

const AppStoreInstructions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Guía de Subida a App Store
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="border-l-2 border-primary pl-4">
            <h4 className="font-medium">1. Generar Íconos con Capacitor</h4>
            <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">
{`# En la carpeta del proyecto
npm install -D @capacitor/assets
npx capacitor-assets generate --ios
npx cap sync ios`}
            </pre>
          </div>

          {/* Step 2 */}
          <div className="border-l-2 border-primary pl-4">
            <h4 className="font-medium">2. Crear App en App Store Connect</h4>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Ir a <strong>appstoreconnect.apple.com</strong></li>
              <li>• My Apps → + → New App</li>
              <li>• Plataforma: iOS</li>
              <li>• Nombre: ALMASA-OS</li>
              <li>• Bundle ID: app.lovable.0a4fe6f267d54980a499e679897a2f15</li>
              <li>• SKU: almasa-erp-2024</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="border-l-2 border-primary pl-4">
            <h4 className="font-medium">3. Subir Screenshots</h4>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Mínimo 3 screenshots por tamaño de dispositivo</li>
              <li>• Formatos: PNG o JPEG, 72 dpi, RGB</li>
              <li>• No incluir transparencia</li>
              <li>• Sin barra de estado (la agrega Apple)</li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className="border-l-2 border-primary pl-4">
            <h4 className="font-medium">4. Información de la App</h4>
            <div className="text-sm mt-2 space-y-2">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <span className="ml-2">ALMASA-OS</span>
              </div>
              <div>
                <span className="text-muted-foreground">Subtítulo:</span>
                <span className="ml-2">Sistema de Gestión Empresarial</span>
              </div>
              <div>
                <span className="text-muted-foreground">Categoría:</span>
                <span className="ml-2">Business / Productivity</span>
              </div>
              <div>
                <span className="text-muted-foreground">Clasificación:</span>
                <span className="ml-2">4+ (Sin contenido restringido)</span>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="border-l-2 border-primary pl-4">
            <h4 className="font-medium">5. Build y Envío</h4>
            <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">
{`# Abrir en Xcode
npx cap open ios

# En Xcode:
# 1. Product → Archive
# 2. Distribute App → App Store Connect
# 3. Upload`}
            </pre>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Checklist Pre-Envío</h4>
          <div className="space-y-2 text-sm">
            {[
              'Ícono de app (1024x1024)',
              'Screenshots iPhone 6.7" (mín. 3)',
              'Screenshots iPhone 6.5" (mín. 3)',
              'Screenshots iPhone 5.5" (mín. 3)',
              'Descripción de la app',
              'Palabras clave (keywords)',
              'URL de soporte',
              'URL de política de privacidad',
              'Información de contacto',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppStoreInstructions;
