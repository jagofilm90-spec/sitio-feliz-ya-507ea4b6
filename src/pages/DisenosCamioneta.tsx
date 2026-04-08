import { useState } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
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
  category: 'lateral' | 'trasera';
}

const designOptions: DesignOption[] = [
  // Vista Lateral
  {
    id: 'elegante-lateral',
    name: 'Elegante (Lateral)',
    description: 'Logo ALMASA serif rojo, "Desde 1904", línea roja curva. Con datos regulatorios discretos en puerta.',
    category: 'lateral'
  },
  {
    id: 'minimalista-lateral',
    name: 'Minimalista (Lateral)',
    description: 'Estilo Tesla/Apple. Logo ALMASA rojo, sans-serif moderno, máximo espacio en blanco. Ultra limpio.',
    category: 'lateral'
  },
  {
    id: 'reglamentario-lateral',
    name: 'Reglamentario (Lateral)',
    description: 'Estilo contemporáneo con datos obligatorios: placa, razón social, domicilio, teléfono, combustible.',
    category: 'lateral'
  },
  {
    id: 'premium-lateral',
    name: 'Premium (Lateral)',
    description: 'Diseño sofisticado bicolor blanco/gris carbón. Logo rojo con datos en banda gris elegante.',
    category: 'lateral'
  },
  // Vista Trasera
  {
    id: 'minimalista-trasera',
    name: 'Minimalista (Trasera)',
    description: 'Estilo Tesla/Apple. Logo ALMASA centrado, datos mínimos en gris discreto. Ultra limpio.',
    category: 'trasera'
  },
  {
    id: 'reglamentario-trasera',
    name: 'Reglamentario (Trasera)',
    description: 'Diseño moderno con datos obligatorios: quejas, placa, velocidad máxima. Franjas mínimas.',
    category: 'trasera'
  },
  {
    id: 'premium-trasera',
    name: 'Premium (Trasera)',
    description: 'Diseño premium bicolor blanco/gris carbón. Datos en banda gris elegante con acento rojo.',
    category: 'trasera'
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

  const lateralDesigns = designOptions.filter(d => d.category === 'lateral');
  const traseraDesigns = designOptions.filter(d => d.category === 'trasera');

  const renderDesignCard = (option: DesignOption) => (
    <Card key={option.id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{option.name}</CardTitle>
        <CardDescription>{option.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 flex items-center justify-center">
          {loadingDesigns[option.id] ? (
            <AlmasaLoading size={56} text="Generando diseño..." />
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
  );

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
              Genera diseños de rotulado para camioneta con IA - Caja Blanca
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

        {/* Vista Lateral */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-600 rounded-full"></span>
            Vista Lateral
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lateralDesigns.map(renderDesignCard)}
          </div>
        </div>

        {/* Vista Trasera */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-600 rounded-full"></span>
            Vista Trasera
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {traseraDesigns.map(renderDesignCard)}
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Colores de marca ALMASA</h3>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#C41E3A] border"></div>
              <span className="text-sm">Rojo ALMASA (#C41E3A)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#333333] border"></div>
              <span className="text-sm">Gris Carbón (#333333)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-white border"></div>
              <span className="text-sm">Blanco (#FFFFFF)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#666666] border"></div>
              <span className="text-sm">Gris (#666666)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
