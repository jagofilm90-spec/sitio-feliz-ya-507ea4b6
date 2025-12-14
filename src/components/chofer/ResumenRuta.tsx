import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Trophy,
  X
} from "lucide-react";

interface ResumenRutaProps {
  ruta: {
    folio: string;
    kilometros_estimados: number | null;
  };
  entregas: Array<{
    id: string;
    status_entrega: string | null;
    nombre_receptor: string | null;
    pedido: {
      peso_total_kg: number;
      cliente: { nombre: string };
      sucursal: { nombre: string } | null;
    };
  }>;
  onFinalizar: () => void;
  onCerrar: () => void;
}

export function ResumenRuta({ ruta, entregas, onFinalizar, onCerrar }: ResumenRutaProps) {
  const entregadas = entregas.filter(e => e.status_entrega === "entregado");
  const parciales = entregas.filter(e => e.status_entrega === "parcial");
  const rechazadas = entregas.filter(e => e.status_entrega === "rechazado");
  
  const pesoEntregado = entregadas.reduce((sum, e) => sum + (e.pedido.peso_total_kg || 0), 0);
  const pesoTotal = entregas.reduce((sum, e) => sum + (e.pedido.peso_total_kg || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onCerrar}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="mx-auto mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">¡Ruta Completada!</CardTitle>
          <p className="text-muted-foreground">Ruta {ruta.folio}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen de entregas */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{entregadas.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Entregadas</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{parciales.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Parciales</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{rechazadas.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Rechazadas</p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total entregas</span>
              <span className="font-medium">{entregas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso entregado</span>
              <span className="font-medium">{pesoEntregado.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso total programado</span>
              <span className="font-medium">{pesoTotal.toLocaleString()} kg</span>
            </div>
            {ruta.kilometros_estimados && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kilómetros recorridos</span>
                <span className="font-medium">{ruta.kilometros_estimados} km</span>
              </div>
            )}
          </div>

          {/* Lista de rechazos si hay */}
          {rechazadas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">Entregas rechazadas:</h4>
              <div className="space-y-1">
                {rechazadas.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="truncate">
                      {e.pedido.sucursal?.nombre || e.pedido.cliente.nombre}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón finalizar */}
          <Button onClick={onFinalizar} className="w-full h-12 text-lg" size="lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Finalizar Ruta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
