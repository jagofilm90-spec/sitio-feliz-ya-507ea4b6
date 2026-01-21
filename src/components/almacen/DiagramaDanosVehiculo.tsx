import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Trash2, MapPin } from "lucide-react";

export type TipoDano = "golpe" | "raspadura" | "grieta";

export interface DanoMarcado {
  id: string;
  tipo: TipoDano;
  posicionX: number; // 0-100%
  posicionY: number; // 0-100%
  descripcion?: string;
}

interface DiagramaDanosVehiculoProps {
  danos: DanoMarcado[];
  onDanosChange: (danos: DanoMarcado[]) => void;
  disabled?: boolean;
}

const TIPO_CONFIG: Record<TipoDano, { label: string; color: string; bgColor: string; icon: string }> = {
  golpe: { label: "Golpe", color: "text-red-600", bgColor: "bg-red-500", icon: "🔴" },
  raspadura: { label: "Raspadura", color: "text-amber-600", bgColor: "bg-amber-500", icon: "🟡" },
  grieta: { label: "Grieta", color: "text-blue-600", bgColor: "bg-blue-500", icon: "🔵" },
};

export const DiagramaDanosVehiculo = ({
  danos,
  onDanosChange,
  disabled = false,
}: DiagramaDanosVehiculoProps) => {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDano>("golpe");
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Ensure coordinates are within bounds
      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      const nuevoDano: DanoMarcado = {
        id: crypto.randomUUID(),
        tipo: tipoSeleccionado,
        posicionX: Math.round(x * 10) / 10,
        posicionY: Math.round(y * 10) / 10,
      };

      onDanosChange([...danos, nuevoDano]);
    },
    [disabled, danos, onDanosChange, tipoSeleccionado]
  );

  const eliminarDano = (id: string) => {
    onDanosChange(danos.filter((d) => d.id !== id));
  };

  const limpiarTodos = () => {
    onDanosChange([]);
  };

  const getAreaLabel = (x: number, y: number): string => {
    // Determine area based on coordinates
    let vertical = "";
    let horizontal = "";
    
    if (y < 30) vertical = "Frente";
    else if (y > 70) vertical = "Trasera";
    else vertical = "Centro";
    
    if (x < 35) horizontal = "Izq";
    else if (x > 65) horizontal = "Der";
    else horizontal = "";
    
    return `${vertical}${horizontal ? ` ${horizontal}` : ""}`;
  };

  return (
    <div className="space-y-3">
      <Label className="font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Diagrama de Daños (toca para marcar)
      </Label>

      {/* Tipo selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
        {(Object.keys(TIPO_CONFIG) as TipoDano[]).map((tipo) => (
          <Button
            key={tipo}
            type="button"
            variant={tipoSeleccionado === tipo ? "default" : "outline"}
            size="sm"
            onClick={() => setTipoSeleccionado(tipo)}
            disabled={disabled}
            className={`min-h-[44px] px-4 ${tipoSeleccionado === tipo ? TIPO_CONFIG[tipo].bgColor : ""}`}
          >
            <span className="mr-1">{TIPO_CONFIG[tipo].icon}</span>
            {TIPO_CONFIG[tipo].label}
          </Button>
        ))}
      </div>

      {/* Vehicle diagram container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative w-full aspect-[2/3] max-w-sm mx-auto border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/30 cursor-crosshair select-none overflow-hidden"
        style={{ touchAction: "none" }}
      >
        {/* SVG Vehicle Top View */}
        <svg
          viewBox="0 0 200 300"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Vehicle body outline */}
          <rect
            x="40"
            y="30"
            width="120"
            height="240"
            rx="25"
            fill="hsl(var(--muted))"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
          />

          {/* Hood / Cofre */}
          <rect
            x="50"
            y="40"
            width="100"
            height="50"
            rx="10"
            fill="hsl(var(--secondary))"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1"
          />
          <text x="100" y="70" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
            COFRE
          </text>

          {/* Windshield / Parabrisas */}
          <rect
            x="55"
            y="95"
            width="90"
            height="25"
            rx="5"
            fill="hsl(var(--accent))"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1"
          />

          {/* Cabin */}
          <rect
            x="50"
            y="125"
            width="100"
            height="60"
            rx="5"
            fill="hsl(var(--secondary))"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1"
          />
          <text x="100" y="158" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
            CABINA
          </text>

          {/* Cargo area / Caja */}
          <rect
            x="50"
            y="190"
            width="100"
            height="70"
            rx="5"
            fill="hsl(var(--secondary))"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1"
          />
          <text x="100" y="228" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
            CAJA
          </text>

          {/* Front wheels */}
          <ellipse cx="35" cy="75" rx="12" ry="20" fill="hsl(var(--foreground))" opacity="0.7" />
          <ellipse cx="165" cy="75" rx="12" ry="20" fill="hsl(var(--foreground))" opacity="0.7" />

          {/* Rear wheels */}
          <ellipse cx="35" cy="220" rx="12" ry="20" fill="hsl(var(--foreground))" opacity="0.7" />
          <ellipse cx="165" cy="220" rx="12" ry="20" fill="hsl(var(--foreground))" opacity="0.7" />

          {/* Side mirrors */}
          <ellipse cx="28" cy="115" rx="8" ry="5" fill="hsl(var(--muted-foreground))" />
          <ellipse cx="172" cy="115" rx="8" ry="5" fill="hsl(var(--muted-foreground))" />

          {/* Direction indicator - Front */}
          <polygon
            points="100,15 95,25 105,25"
            fill="hsl(var(--muted-foreground))"
          />
          <text x="100" y="12" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
            FRENTE
          </text>
        </svg>

        {/* Damage markers overlay */}
        {danos.map((dano, index) => (
          <div
            key={dano.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto group"
            style={{
              left: `${dano.posicionX}%`,
              top: `${dano.posicionY}%`,
            }}
          >
            {/* Marker dot */}
            <div
              className={`w-7 h-7 rounded-full ${TIPO_CONFIG[dano.tipo].bgColor} border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs animate-pulse`}
            >
              {index + 1}
            </div>
            {/* Delete button on hover/touch */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                eliminarDano(dano.id);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Touch hint */}
        {danos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
              Toca para marcar daños
            </p>
          </div>
        )}
      </div>

      {/* Damage list */}
      {danos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Daños marcados: {danos.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limpiarTodos}
              disabled={disabled}
              className="text-destructive hover:text-destructive min-h-[40px]"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar todo
            </Button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5 border rounded-lg p-2">
            {danos.map((dano, index) => (
              <div
                key={dano.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TIPO_CONFIG[dano.tipo].icon}</span>
                  <div>
                    <span className="font-medium text-sm">
                      {index + 1}. {TIPO_CONFIG[dano.tipo].label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {getAreaLabel(dano.posicionX, dano.posicionY)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => eliminarDano(dano.id)}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary badges */}
      {danos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TIPO_CONFIG) as TipoDano[]).map((tipo) => {
            const count = danos.filter((d) => d.tipo === tipo).length;
            if (count === 0) return null;
            return (
              <Badge key={tipo} variant="secondary" className={TIPO_CONFIG[tipo].color}>
                {TIPO_CONFIG[tipo].icon} {count} {TIPO_CONFIG[tipo].label}
                {count > 1 ? "s" : ""}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
