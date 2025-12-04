import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Download, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DesignOption {
  id: string;
  name: string;
  description: string;
}

const designOptions: DesignOption[] = [
  {
    id: 'ultra-minimalista',
    name: 'Ultra Minimalista',
    description: 'Solo logo ALMASA, "Desde 1904" y website. Diseño limpio y elegante sin servicios.'
  },
  {
    id: 'ultra-minimalista-reglamentario',
    name: 'Minimalista + Reglamentario',
    description: 'Diseño elegante con todos los elementos obligatorios: No. de Placa, Servicio Mercantil, Combustible, Quejas y franjas diagonales.'
  },
  {
    id: 'con-iconos',
    name: 'Minimalista con Íconos',
    description: 'Logo con 4 íconos representando los servicios: Abarrotes, Panaderías, Industrias y Mascotas.'
  },
  {
    id: 'lateral-completo',
    name: 'Diseño Lateral Completo',
    description: 'Franja diagonal roja con logo, servicios listados y "121 Años de Tradición".'
  },
  {
    id: 'premium-ejecutivo',
    name: 'Premium Ejecutivo',
    description: 'Fondo negro mate, logo rojo con detalles dorados. Aspecto de lujo y tradición.'
  }
];

export default function DisenosCamioneta() {
  const navigate = useNavigate();
  const [generatedDesigns, setGeneratedDesigns] = useState<Record<string, string>>({});
  const [loadingDesigns, setLoadingDesigns] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateDesign = async (designType: string) => {
    setLoadingDesigns(prev => ({ ...prev, [designType]: true }));
    setErrors(prev => ({ ...prev, [designType]: '' }));

    try {
      const { data, error } = await supabase.functions.invoke('generate-truck-design', {
        body: { designType }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedDesigns(prev => ({ ...prev, [designType]: data.imageUrl }));
        toast.success('Diseño generado exitosamente');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating design:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al generar el diseño';
      setErrors(prev => ({ ...prev, [designType]: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setLoadingDesigns(prev => ({ ...prev, [designType]: false }));
    }
  };

  const generateAllDesigns = async () => {
    for (const option of designOptions) {
      await generateDesign(option.id);
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const downloadImage = (imageUrl: string, designName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ALMASA-${designName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Propuestas de Rotulado ALMASA</h1>
            <p className="text-muted-foreground mt-1">
              Genera diseños de rotulado para la camioneta con IA
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <Button 
            onClick={generateAllDesigns}
            disabled={Object.values(loadingDesigns).some(Boolean)}
            className="bg-red-600 hover:bg-red-700"
          >
            {Object.values(loadingDesigns).some(Boolean) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Todas las Propuestas'
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {designOptions.map((option) => (
            <Card key={option.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{option.name}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                  {loadingDesigns[option.id] ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-10 w-10 animate-spin" />
                      <span>Generando diseño...</span>
                    </div>
                  ) : generatedDesigns[option.id] ? (
                    <img 
                      src={generatedDesigns[option.id]} 
                      alt={option.name}
                      className="w-full h-full object-contain"
                    />
                  ) : errors[option.id] ? (
                    <div className="text-center p-4">
                      <p className="text-destructive text-sm mb-2">{errors[option.id]}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateDesign(option.id)}
                      >
                        Reintentar
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p className="mb-2">Sin imagen generada</p>
                      <p className="text-xs">Haz clic en "Generar" para crear el diseño</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateDesign(option.id)}
                    disabled={loadingDesigns[option.id]}
                    className="flex-1"
                  >
                    {loadingDesigns[option.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {generatedDesigns[option.id] ? 'Regenerar' : 'Generar'}
                      </>
                    )}
                  </Button>
                  
                  {generatedDesigns[option.id] && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadImage(generatedDesigns[option.id], option.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Colores de marca ALMASA</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#C41E3A] border"></div>
              <span className="text-sm">Rojo ALMASA (#C41E3A)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-black border"></div>
              <span className="text-sm">Negro (#000000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-white border"></div>
              <span className="text-sm">Blanco (#FFFFFF)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
