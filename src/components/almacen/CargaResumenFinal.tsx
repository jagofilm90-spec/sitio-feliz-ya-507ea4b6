import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timer, Package, Weight, CheckCircle2, Truck, User } from "lucide-react";

interface CargaResumenProps {
  tiempoTranscurrido: number;
  totalProductos: number;
  productosCargados: number;
  pesoTotalTeorico: number;
  pesoTotalReal: number;
  totalUnidades: number;
  firmaAlmacenista?: string | null;
  firmaChofer?: string | null;
  choferNombre?: string;
  almacenistaNombre?: string;
}

const formatearTiempo = (segundos: number) => {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  if (horas > 0) {
    return `${horas}h ${minutos.toString().padStart(2, '0')}m ${segs.toString().padStart(2, '0')}s`;
  }
  return `${minutos}m ${segs.toString().padStart(2, '0')}s`;
};

const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} kg`;

export const CargaResumenFinal = ({
  tiempoTranscurrido,
  totalProductos,
  productosCargados,
  pesoTotalTeorico,
  pesoTotalReal,
  totalUnidades,
  firmaAlmacenista,
  firmaChofer,
  choferNombre,
  almacenistaNombre,
}: CargaResumenProps) => {
  const diferenciaPeso = pesoTotalReal - pesoTotalTeorico;
  const hayDiferenciaPeso = Math.abs(diferenciaPeso) > 0.1;

  return (
    <Card className="border-2 border-green-500/50 bg-green-50/30 dark:bg-green-950/10">
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Carga Completada</h3>
            <p className="text-sm text-muted-foreground">Resumen de la operación</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Tiempo */}
          <div className="bg-background rounded-lg border p-3 text-center">
            <Timer className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-foreground">
              {formatearTiempo(tiempoTranscurrido)}
            </p>
            <p className="text-[11px] text-muted-foreground">Duración total</p>
          </div>

          {/* Productos */}
          <div className="bg-background rounded-lg border p-3 text-center">
            <Package className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {productosCargados}/{totalProductos}
            </p>
            <p className="text-[11px] text-muted-foreground">Productos cargados</p>
          </div>

          {/* Peso */}
          <div className="bg-background rounded-lg border p-3 text-center">
            <Weight className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {fmtKg(pesoTotalReal > 0 ? pesoTotalReal : pesoTotalTeorico)}
            </p>
            <p className="text-[11px] text-muted-foreground">Peso total</p>
            {hayDiferenciaPeso && (
              <Badge variant="outline" className="text-[10px] mt-1">
                {diferenciaPeso > 0 ? "+" : ""}{diferenciaPeso.toFixed(1)} kg vs teórico
              </Badge>
            )}
          </div>
        </div>

        {/* Unidades */}
        <div className="bg-background rounded-lg border p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total unidades/piezas cargadas</span>
          <span className="text-lg font-bold">{totalUnidades}</span>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-4">
          {/* Firma Almacenista */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Almacenista</span>
            </div>
            {firmaAlmacenista ? (
              <div className="bg-muted/50 rounded p-2">
                <img src={firmaAlmacenista} alt="Firma almacenista" className="h-14 object-contain w-full" />
              </div>
            ) : (
              <div className="h-14 bg-muted/30 rounded flex items-center justify-center text-xs text-muted-foreground">
                Pendiente
              </div>
            )}
            {almacenistaNombre && (
              <p className="text-xs text-center text-muted-foreground mt-1">{almacenistaNombre}</p>
            )}
          </div>

          {/* Firma Chofer */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Chofer</span>
            </div>
            {firmaChofer ? (
              <div className="bg-muted/50 rounded p-2">
                <img src={firmaChofer} alt="Firma chofer" className="h-14 object-contain w-full" />
              </div>
            ) : (
              <div className="h-14 bg-muted/30 rounded flex items-center justify-center text-xs text-muted-foreground">
                Pendiente
              </div>
            )}
            {choferNombre && (
              <p className="text-xs text-center text-muted-foreground mt-1">{choferNombre}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
