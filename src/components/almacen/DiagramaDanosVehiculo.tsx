import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Trash2, MapPin } from "lucide-react";

export type TipoDano = "golpe" | "raspadura" | "grieta";
export type VistaCamion = "superior" | "lateral_izq" | "lateral_der" | "frontal" | "trasera";

export interface DanoMarcado {
  id: string;
  tipo: TipoDano;
  vista: VistaCamion;
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

const VISTA_CONFIG: Record<VistaCamion, { label: string; icon: string }> = {
  superior: { label: "Superior", icon: "⬆️" },
  lateral_izq: { label: "Lateral Izq", icon: "◀️" },
  lateral_der: { label: "Lateral Der", icon: "▶️" },
  frontal: { label: "Frontal", icon: "🔲" },
  trasera: { label: "Trasera", icon: "🔳" },
};

export const DiagramaDanosVehiculo = ({
  danos,
  onDanosChange,
  disabled = false,
}: DiagramaDanosVehiculoProps) => {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDano>("golpe");
  const [vistaActual, setVistaActual] = useState<VistaCamion>("lateral_izq");
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      const nuevoDano: DanoMarcado = {
        id: crypto.randomUUID(),
        tipo: tipoSeleccionado,
        vista: vistaActual,
        posicionX: Math.round(x * 10) / 10,
        posicionY: Math.round(y * 10) / 10,
      };

      onDanosChange([...danos, nuevoDano]);
    },
    [disabled, danos, onDanosChange, tipoSeleccionado, vistaActual]
  );

  const eliminarDano = (id: string) => {
    onDanosChange(danos.filter((d) => d.id !== id));
  };

  const limpiarTodos = () => {
    onDanosChange([]);
  };

  const getAreaLabel = (vista: VistaCamion, x: number, y: number): string => {
    switch (vista) {
      case "superior":
        if (x < 25) return "Cabina";
        return y < 50 ? "Caja Izq" : "Caja Der";
      case "lateral_izq":
      case "lateral_der":
        if (x < 20) return "Cabina";
        if (x < 40) return "Caja Frente";
        if (x < 70) return "Caja Centro";
        return "Caja Trasera";
      case "frontal":
        if (y < 30) return "Parabrisas";
        if (y < 60) return "Cofre";
        return x < 50 ? "Faro Izq" : "Faro Der";
      case "trasera":
        if (y < 70) return x < 50 ? "Puerta Izq" : "Puerta Der";
        return "Defensa";
      default:
        return "";
    }
  };

  const danosVistaActual = danos.filter(d => d.vista === vistaActual);
  const conteosPorVista = (Object.keys(VISTA_CONFIG) as VistaCamion[]).reduce((acc, vista) => {
    acc[vista] = danos.filter(d => d.vista === vista).length;
    return acc;
  }, {} as Record<VistaCamion, number>);

  // SVG Components for each view
  const renderSVG = () => {
    const commonStyles = {
      body: "fill-muted stroke-muted-foreground",
      window: "fill-accent stroke-muted-foreground",
      wheel: "fill-foreground opacity-70",
      detail: "fill-secondary stroke-muted-foreground",
      text: "fill-muted-foreground text-[8px]",
    };

    switch (vistaActual) {
      case "superior":
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Cabina - Top view */}
            <rect x="20" y="60" width="70" height="80" rx="10" className={commonStyles.body} strokeWidth="2" />
            <rect x="30" y="70" width="50" height="60" rx="5" className={commonStyles.window} strokeWidth="1" />
            <text x="55" y="105" textAnchor="middle" className={commonStyles.text}>CABINA</text>
            
            {/* Espejos */}
            <ellipse cx="20" cy="85" rx="8" ry="12" className={commonStyles.detail} strokeWidth="1" />
            <ellipse cx="90" cy="85" rx="8" ry="12" className={commonStyles.detail} strokeWidth="1" />
            <ellipse cx="20" cy="115" rx="8" ry="12" className={commonStyles.detail} strokeWidth="1" />
            <ellipse cx="90" cy="115" rx="8" ry="12" className={commonStyles.detail} strokeWidth="1" />

            {/* Caja de carga - Top view */}
            <rect x="100" y="40" width="280" height="120" rx="5" className={commonStyles.body} strokeWidth="2" />
            <line x1="100" y1="100" x2="380" y2="100" className="stroke-muted-foreground" strokeWidth="1" strokeDasharray="5,5" />
            <text x="240" y="75" textAnchor="middle" className={commonStyles.text}>CAJA - LADO IZQUIERDO</text>
            <text x="240" y="130" textAnchor="middle" className={commonStyles.text}>CAJA - LADO DERECHO</text>

            {/* Indicador frontal */}
            <polygon points="55,40 45,55 65,55" className="fill-muted-foreground" />
            <text x="55" y="35" textAnchor="middle" className={commonStyles.text}>FRENTE</text>
          </svg>
        );

      case "lateral_izq":
      case "lateral_der":
        const isLeft = vistaActual === "lateral_izq";
        return (
          <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Cabina */}
            <path 
              d="M20 140 L20 60 L50 40 L80 40 L80 140 Z" 
              className={commonStyles.body} 
              strokeWidth="2" 
            />
            {/* Parabrisas inclinado */}
            <path 
              d="M25 65 L48 45 L75 45 L75 65 Z" 
              className={commonStyles.window} 
              strokeWidth="1" 
            />
            {/* Ventana lateral */}
            <rect x="25" y="70" width="50" height="30" rx="3" className={commonStyles.window} strokeWidth="1" />
            {/* Puerta */}
            <rect x="25" y="70" width="50" height="65" rx="2" className="fill-none stroke-muted-foreground" strokeWidth="1" />
            <circle cx="70" cy="110" r="3" className="fill-muted-foreground" />
            <text x="50" y="125" textAnchor="middle" className={commonStyles.text}>CABINA</text>

            {/* Tanque de combustible */}
            <rect x="25" y="140" width="30" height="15" rx="3" className={commonStyles.detail} strokeWidth="1" />

            {/* Caja de carga */}
            <rect x="90" y="30" width="290" height="125" rx="3" className={commonStyles.body} strokeWidth="2" />
            {/* Líneas de paneles/cortinas */}
            <line x1="150" y1="30" x2="150" y2="155" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="220" y1="30" x2="220" y2="155" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="290" y1="30" x2="290" y2="155" className="stroke-muted-foreground" strokeWidth="1" />
            <text x="120" y="95" textAnchor="middle" className={commonStyles.text}>FRENTE</text>
            <text x="185" y="95" textAnchor="middle" className={commonStyles.text}>CENTRO</text>
            <text x="255" y="95" textAnchor="middle" className={commonStyles.text}>CENTRO</text>
            <text x="340" y="95" textAnchor="middle" className={commonStyles.text}>TRASERA</text>

            {/* Llanta delantera */}
            <ellipse cx="50" cy="165" rx="25" ry="12" className={commonStyles.wheel} />
            <ellipse cx="50" cy="165" rx="10" ry="5" className="fill-muted" />

            {/* Llantas traseras (dobles) */}
            <ellipse cx="320" cy="165" rx="25" ry="12" className={commonStyles.wheel} />
            <ellipse cx="320" cy="165" rx="10" ry="5" className="fill-muted" />
            <ellipse cx="355" cy="165" rx="25" ry="12" className={commonStyles.wheel} />
            <ellipse cx="355" cy="165" rx="10" ry="5" className="fill-muted" />

            {/* Indicador de dirección */}
            <polygon points={isLeft ? "10,90 2,100 10,110" : "390,90 398,100 390,110"} className="fill-muted-foreground" />
            <text x={isLeft ? "8" : "392"} y="125" textAnchor="middle" className={commonStyles.text} transform={isLeft ? "" : "rotate(90 392 125)"}>
              {isLeft ? "←" : "→"}
            </text>
          </svg>
        );

      case "frontal":
        return (
          <svg viewBox="0 0 200 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Cabina frontal */}
            <rect x="30" y="30" width="140" height="140" rx="10" className={commonStyles.body} strokeWidth="2" />
            
            {/* Parabrisas */}
            <rect x="45" y="40" width="110" height="50" rx="5" className={commonStyles.window} strokeWidth="1" />
            <text x="100" y="70" textAnchor="middle" className={commonStyles.text}>PARABRISAS</text>

            {/* Cofre/Parrilla */}
            <rect x="45" y="100" width="110" height="40" rx="3" className={commonStyles.detail} strokeWidth="1" />
            <line x1="60" y1="100" x2="60" y2="140" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="80" y1="100" x2="80" y2="140" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="100" y1="100" x2="100" y2="140" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="120" y1="100" x2="120" y2="140" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="140" y1="100" x2="140" y2="140" className="stroke-muted-foreground" strokeWidth="1" />
            <text x="100" y="125" textAnchor="middle" className={commonStyles.text}>PARRILLA</text>

            {/* Faros */}
            <ellipse cx="55" cy="155" rx="15" ry="10" className={commonStyles.window} strokeWidth="1" />
            <ellipse cx="145" cy="155" rx="15" ry="10" className={commonStyles.window} strokeWidth="1" />
            <text x="55" y="158" textAnchor="middle" className="fill-muted-foreground text-[6px]">FARO</text>
            <text x="145" y="158" textAnchor="middle" className="fill-muted-foreground text-[6px]">FARO</text>

            {/* Defensa */}
            <rect x="25" y="170" width="150" height="15" rx="3" className={commonStyles.detail} strokeWidth="1" />
            <text x="100" y="181" textAnchor="middle" className={commonStyles.text}>DEFENSA</text>

            {/* Espejos */}
            <rect x="10" y="50" width="15" height="25" rx="3" className={commonStyles.detail} strokeWidth="1" />
            <rect x="175" y="50" width="15" height="25" rx="3" className={commonStyles.detail} strokeWidth="1" />

            {/* Llantas */}
            <ellipse cx="50" cy="200" rx="20" ry="8" className={commonStyles.wheel} />
            <ellipse cx="150" cy="200" rx="20" ry="8" className={commonStyles.wheel} />

            {/* Indicador */}
            <text x="100" y="20" textAnchor="middle" className={commonStyles.text}>VISTA FRONTAL</text>
          </svg>
        );

      case "trasera":
        return (
          <svg viewBox="0 0 200 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Caja trasera */}
            <rect x="20" y="20" width="160" height="150" rx="5" className={commonStyles.body} strokeWidth="2" />
            
            {/* Puertas de carga */}
            <rect x="25" y="25" width="72" height="140" rx="3" className={commonStyles.detail} strokeWidth="1" />
            <rect x="103" y="25" width="72" height="140" rx="3" className={commonStyles.detail} strokeWidth="1" />
            
            {/* Manijas */}
            <rect x="90" y="80" width="8" height="30" rx="2" className="fill-muted-foreground" />
            <rect x="102" y="80" width="8" height="30" rx="2" className="fill-muted-foreground" />
            
            {/* Etiquetas puertas */}
            <text x="61" y="100" textAnchor="middle" className={commonStyles.text}>PUERTA</text>
            <text x="61" y="112" textAnchor="middle" className={commonStyles.text}>IZQUIERDA</text>
            <text x="139" y="100" textAnchor="middle" className={commonStyles.text}>PUERTA</text>
            <text x="139" y="112" textAnchor="middle" className={commonStyles.text}>DERECHA</text>

            {/* Calaveras */}
            <rect x="25" y="175" width="25" height="12" rx="2" className="fill-red-500/50 stroke-muted-foreground" strokeWidth="1" />
            <rect x="150" y="175" width="25" height="12" rx="2" className="fill-red-500/50 stroke-muted-foreground" strokeWidth="1" />
            <text x="37" y="184" textAnchor="middle" className="fill-muted-foreground text-[5px]">CALAV</text>
            <text x="162" y="184" textAnchor="middle" className="fill-muted-foreground text-[5px]">CALAV</text>

            {/* Placa */}
            <rect x="75" y="175" width="50" height="12" rx="2" className="fill-background stroke-muted-foreground" strokeWidth="1" />
            <text x="100" y="184" textAnchor="middle" className="fill-muted-foreground text-[6px]">PLACA</text>

            {/* Defensa */}
            <rect x="15" y="190" width="170" height="10" rx="2" className={commonStyles.detail} strokeWidth="1" />
            <text x="100" y="198" textAnchor="middle" className="fill-muted-foreground text-[6px]">DEFENSA</text>

            {/* Llantas traseras dobles */}
            <ellipse cx="40" cy="210" rx="18" ry="7" className={commonStyles.wheel} />
            <ellipse cx="60" cy="210" rx="18" ry="7" className={commonStyles.wheel} />
            <ellipse cx="140" cy="210" rx="18" ry="7" className={commonStyles.wheel} />
            <ellipse cx="160" cy="210" rx="18" ry="7" className={commonStyles.wheel} />

            {/* Indicador */}
            <text x="100" y="12" textAnchor="middle" className={commonStyles.text}>VISTA TRASERA</text>
          </svg>
        );
    }
  };

  return (
    <div className="space-y-3">
      <Label className="font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Diagrama de Daños - Camión (toca para marcar)
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

      {/* Vista tabs */}
      <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as VistaCamion)} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => (
            <TabsTrigger 
              key={vista} 
              value={vista}
              className="min-h-[40px] px-3 flex-1 min-w-[70px] data-[state=active]:bg-background"
            >
              <span className="mr-1">{VISTA_CONFIG[vista].icon}</span>
              <span className="hidden sm:inline">{VISTA_CONFIG[vista].label}</span>
              {conteosPorVista[vista] > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {conteosPorVista[vista]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => (
          <TabsContent key={vista} value={vista} className="mt-2">
            {/* Vehicle diagram container */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              className="relative w-full aspect-[2/1] max-w-lg mx-auto border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/30 cursor-crosshair select-none overflow-hidden"
              style={{ touchAction: "none" }}
            >
              {renderSVG()}

              {/* Damage markers overlay */}
              {danosVistaActual.map((dano) => {
                const index = danos.findIndex(d => d.id === dano.id);
                return (
                  <div
                    key={dano.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto group"
                    style={{
                      left: `${dano.posicionX}%`,
                      top: `${dano.posicionY}%`,
                    }}
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${TIPO_CONFIG[dano.tipo].bgColor} border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs animate-pulse`}
                    >
                      {index + 1}
                    </div>
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
                );
              })}

              {/* Touch hint */}
              {danosVistaActual.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
                    Toca para marcar daños en esta vista
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

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
          <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-lg p-2">
            {danos.map((dano, index) => (
              <div
                key={dano.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TIPO_CONFIG[dano.tipo].icon}</span>
                  <div className="text-sm">
                    <span className="font-medium">
                      {index + 1}. {TIPO_CONFIG[dano.tipo].label}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {VISTA_CONFIG[dano.vista].label} - {getAreaLabel(dano.vista, dano.posicionX, dano.posicionY)}
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

      {/* Summary badges by view */}
      {danos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => {
            const count = danos.filter((d) => d.vista === vista).length;
            if (count === 0) return null;
            return (
              <Badge key={vista} variant="outline" className="text-xs">
                {VISTA_CONFIG[vista].icon} {VISTA_CONFIG[vista].label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Summary badges by type */}
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
