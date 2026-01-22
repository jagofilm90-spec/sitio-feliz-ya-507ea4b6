import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Truck, Eye, EyeOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DanoMarcado, TipoDano, VistaCamion } from "./DiagramaDanosVehiculo";

interface HistorialDanosVehiculoProps {
  vehiculoId: string;
  vehiculoNombre: string;
  vehiculoPlaca: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheckupConDanos {
  id: string;
  fecha_checkup: string;
  danos: DanoMarcado[];
  chofer_nombre: string | null;
}

interface DanoConHistorial extends DanoMarcado {
  esNuevo: boolean;
  primeraVez: string;
  diasDeAntiguedad: number;
  checkupId: string;
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

// Tolerancia para considerar dos daños como "el mismo" (en %)
const TOLERANCE = 8;

const esMismoDano = (a: DanoMarcado, b: DanoMarcado): boolean => {
  if (a.vista !== b.vista || a.tipo !== b.tipo) return false;
  return Math.abs(a.posicionX - b.posicionX) < TOLERANCE &&
         Math.abs(a.posicionY - b.posicionY) < TOLERANCE;
};

export const HistorialDanosVehiculo = ({
  vehiculoId,
  vehiculoNombre,
  vehiculoPlaca,
  open,
  onOpenChange,
}: HistorialDanosVehiculoProps) => {
  const [loading, setLoading] = useState(true);
  const [checkups, setCheckups] = useState<CheckupConDanos[]>([]);
  const [vistaActual, setVistaActual] = useState<VistaCamion>("lateral_izq");
  const [mostrarPreexistentes, setMostrarPreexistentes] = useState(true);
  const [checkupSeleccionado, setCheckupSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    if (open && vehiculoId) {
      loadHistorialDanos();
    }
  }, [open, vehiculoId]);

  const loadHistorialDanos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehiculos_checkups")
        .select(`
          id,
          fecha_checkup,
          observaciones_golpes,
          chofer:chofer_id (nombre_completo)
        `)
        .eq("vehiculo_id", vehiculoId)
        .order("fecha_checkup", { ascending: false })
        .limit(20);

      if (error) throw error;

      const checkupsConDanos: CheckupConDanos[] = (data || [])
        .map((c) => {
          let danos: DanoMarcado[] = [];
          if (c.observaciones_golpes) {
            try {
              const parsed = JSON.parse(c.observaciones_golpes as string);
              if (Array.isArray(parsed)) {
                danos = parsed;
              }
            } catch (e) {
              console.error("Error parsing damage data:", e);
            }
          }
          return {
            id: c.id,
            fecha_checkup: c.fecha_checkup,
            danos,
            chofer_nombre: (c.chofer as any)?.nombre_completo || null,
          };
        })
        .filter((c) => c.danos.length > 0); // Solo checkups con daños

      setCheckups(checkupsConDanos);
      if (checkupsConDanos.length > 0) {
        setCheckupSeleccionado(checkupsConDanos[0].id);
      }
    } catch (error) {
      console.error("Error loading damage history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Clasifica daños como nuevos o preexistentes
  const clasificarDanos = (): DanoConHistorial[] => {
    if (checkups.length === 0) return [];

    const todosLosDanos: DanoConHistorial[] = [];
    const danosVistos: DanoMarcado[] = [];

    // Procesar checkups del más reciente al más antiguo
    checkups.forEach((checkup, checkupIndex) => {
      const fechaCheckup = new Date(checkup.fecha_checkup);
      const diasDesdeCheckup = differenceInDays(new Date(), fechaCheckup);

      checkup.danos.forEach((dano) => {
        // Verificar si este daño ya fue visto en un checkup anterior
        const danoExistente = danosVistos.find((d) => esMismoDano(d, dano));

        if (!danoExistente) {
          // Es la primera vez que aparece este daño (desde el checkup más reciente hacia atrás)
          todosLosDanos.push({
            ...dano,
            esNuevo: checkupIndex === 0, // Es nuevo solo si está en el checkup más reciente
            primeraVez: checkup.fecha_checkup,
            diasDeAntiguedad: diasDesdeCheckup,
            checkupId: checkup.id,
          });
          danosVistos.push(dano);
        }
      });
    });

    return todosLosDanos;
  };

  const danosClasificados = clasificarDanos();
  const danosVistaActual = danosClasificados.filter((d) => d.vista === vistaActual);
  const danosFiltrados = mostrarPreexistentes
    ? danosVistaActual
    : danosVistaActual.filter((d) => d.esNuevo);

  // Estadísticas
  const stats = {
    total: danosClasificados.length,
    nuevos: danosClasificados.filter((d) => d.esNuevo).length,
    preexistentes: danosClasificados.filter((d) => !d.esNuevo).length,
    golpes: danosClasificados.filter((d) => d.tipo === "golpe").length,
    raspaduras: danosClasificados.filter((d) => d.tipo === "raspadura").length,
    grietas: danosClasificados.filter((d) => d.tipo === "grieta").length,
  };

  // Tendencia: comparar último checkup con el anterior
  const getTendencia = () => {
    if (checkups.length < 2) return "neutral";
    const ultimoDanos = checkups[0]?.danos.length || 0;
    const anteriorDanos = checkups[1]?.danos.length || 0;
    if (ultimoDanos > anteriorDanos) return "peor";
    if (ultimoDanos < anteriorDanos) return "mejor";
    return "neutral";
  };

  const tendencia = getTendencia();

  const conteosPorVista = (Object.keys(VISTA_CONFIG) as VistaCamion[]).reduce((acc, vista) => {
    acc[vista] = danosClasificados.filter((d) => d.vista === vista).length;
    return acc;
  }, {} as Record<VistaCamion, number>);

  const getOpacityClass = (dano: DanoConHistorial): string => {
    if (dano.esNuevo) return "opacity-100";
    if (dano.diasDeAntiguedad <= 3) return "opacity-80";
    if (dano.diasDeAntiguedad <= 7) return "opacity-50";
    return "opacity-30";
  };

  const getBorderClass = (dano: DanoConHistorial): string => {
    if (dano.esNuevo) return "ring-2 ring-white ring-offset-2 ring-offset-background";
    return "";
  };

  // SVG simplificado para historial (sin interacción)
  const renderHistorialSVG = () => {
    const styles = {
      body: "fill-slate-200 stroke-slate-400",
      cabin: "fill-slate-300 stroke-slate-500",
      window: "fill-sky-200/60 stroke-slate-400",
      wheel: "fill-slate-600",
      bumper: "fill-slate-400 stroke-slate-500",
      text: "fill-slate-400 text-[7px] font-medium",
    };

    switch (vistaActual) {
      case "superior":
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x="15" y="55" width="80" height="90" rx="12" className={styles.cabin} strokeWidth="1.5" />
            <rect x="25" y="65" width="60" height="70" rx="8" className={styles.window} strokeWidth="1" />
            <rect x="105" y="35" width="280" height="130" rx="4" className={styles.body} strokeWidth="1.5" />
            <line x1="105" y1="100" x2="385" y2="100" className="stroke-slate-300" strokeWidth="1" strokeDasharray="8,4" />
            <text x="55" y="105" textAnchor="middle" className={styles.text}>CABINA</text>
            <text x="250" y="100" textAnchor="middle" className="fill-slate-400 text-[12px] font-semibold">CAJA</text>
          </svg>
        );

      case "lateral_izq":
      case "lateral_der":
        return (
          <svg viewBox="0 0 420 190" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <path d="M15 150 L15 55 Q15 45 25 45 L55 30 Q60 28 65 30 L85 40 Q90 42 90 48 L90 150 Z" className={styles.cabin} strokeWidth="1.5" />
            <path d="M22 62 L52 35 L82 45 L82 62 Q82 65 78 65 L26 65 Q22 65 22 62 Z" className={styles.window} strokeWidth="1" />
            <rect x="22" y="70" width="62" height="28" rx="4" className={styles.window} strokeWidth="1" />
            <ellipse cx="52" cy="172" rx="28" ry="13" className={styles.wheel} />
            <rect x="100" y="25" width="305" height="130" rx="3" className={styles.body} strokeWidth="1.5" />
            <line x1="170" y1="22" x2="170" y2="155" className="stroke-slate-300" strokeWidth="1" strokeDasharray="4,2" />
            <line x1="250" y1="22" x2="250" y2="155" className="stroke-slate-300" strokeWidth="1" strokeDasharray="4,2" />
            <line x1="330" y1="22" x2="330" y2="155" className="stroke-slate-300" strokeWidth="1" strokeDasharray="4,2" />
            <ellipse cx="355" cy="172" rx="26" ry="12" className={styles.wheel} />
            <text x="52" y="40" textAnchor="middle" className={styles.text}>CABINA</text>
            <text x="250" y="95" textAnchor="middle" className="fill-slate-400 text-[12px] font-semibold">CAJA</text>
          </svg>
        );

      case "frontal":
        return (
          <svg viewBox="0 0 220 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x="25" y="35" width="170" height="155" rx="12" className={styles.cabin} strokeWidth="1.5" />
            <rect x="40" y="45" width="140" height="55" rx="6" className={styles.window} strokeWidth="1" />
            <rect x="45" y="108" width="130" height="45" rx="5" className="fill-slate-100 stroke-slate-400" strokeWidth="1" />
            <ellipse cx="55" cy="165" rx="20" ry="14" className="fill-amber-200 stroke-slate-400" strokeWidth="1" />
            <ellipse cx="165" cy="165" rx="20" ry="14" className="fill-amber-200 stroke-slate-400" strokeWidth="1" />
            <rect x="20" y="185" width="180" height="18" rx="4" className={styles.bumper} strokeWidth="1" />
            <ellipse cx="50" cy="218" rx="25" ry="10" className={styles.wheel} />
            <ellipse cx="170" cy="218" rx="25" ry="10" className={styles.wheel} />
          </svg>
        );

      case "trasera":
        return (
          <svg viewBox="0 0 220 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x="15" y="15" width="190" height="165" rx="6" className={styles.body} strokeWidth="1.5" />
            <rect x="22" y="55" width="85" height="118" rx="3" className="fill-slate-100 stroke-slate-400" strokeWidth="1" />
            <rect x="113" y="55" width="85" height="118" rx="3" className="fill-slate-100 stroke-slate-400" strokeWidth="1" />
            <line x1="108" y1="55" x2="108" y2="173" className="stroke-slate-400" strokeWidth="2" />
            <rect x="20" y="182" width="30" height="15" rx="3" className="fill-red-300 stroke-slate-400" strokeWidth="1" />
            <rect x="170" y="182" width="30" height="15" rx="3" className="fill-red-300 stroke-slate-400" strokeWidth="1" />
            <rect x="10" y="200" width="200" height="12" rx="3" className={styles.bumper} strokeWidth="1" />
            <ellipse cx="58" cy="225" rx="30" ry="10" className={styles.wheel} />
            <ellipse cx="162" cy="225" rx="30" ry="10" className={styles.wheel} />
          </svg>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">{vehiculoNombre}</div>
              <div className="text-sm text-muted-foreground font-normal">
                {vehiculoPlaca || "Sin placa"} • Historial de Daños
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : checkups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay daños registrados para este vehículo</p>
              </div>
            ) : (
              <>
                {/* Resumen estadístico */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total acumulado</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.nuevos}</div>
                    <div className="text-xs text-muted-foreground">Nuevos (último)</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{stats.preexistentes}</div>
                    <div className="text-xs text-muted-foreground">Preexistentes</div>
                  </div>
                </div>

                {/* Tendencia */}
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <span className="text-sm font-medium">Tendencia:</span>
                  <div className="flex items-center gap-2">
                    {tendencia === "mejor" && (
                      <>
                        <TrendingDown className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-medium">Mejorando</span>
                      </>
                    )}
                    {tendencia === "peor" && (
                      <>
                        <TrendingUp className="h-5 w-5 text-red-600" />
                        <span className="text-red-600 font-medium">Empeorando</span>
                      </>
                    )}
                    {tendencia === "neutral" && (
                      <>
                        <Minus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">Sin cambios</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Control de visibilidad */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mostrar daños:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarPreexistentes(!mostrarPreexistentes)}
                  >
                    {mostrarPreexistentes ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Todos ({danosVistaActual.length})
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Solo nuevos ({danosVistaActual.filter((d) => d.esNuevo).length})
                      </>
                    )}
                  </Button>
                </div>

                {/* Diagrama con daños superpuestos */}
                <div>
                  <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as VistaCamion)}>
                    <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                      {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => (
                        <TabsTrigger
                          key={vista}
                          value={vista}
                          className="min-h-[36px] px-2 flex-1 min-w-[60px] text-xs data-[state=active]:bg-background"
                        >
                          <span className="mr-1">{VISTA_CONFIG[vista].icon}</span>
                          {conteosPorVista[vista] > 0 && (
                            <Badge
                              variant={conteosPorVista[vista] > 0 ? "destructive" : "secondary"}
                              className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center"
                            >
                              {conteosPorVista[vista]}
                            </Badge>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => (
                      <TabsContent key={vista} value={vista} className="mt-3">
                        <div className="relative w-full aspect-[2/1] max-w-md mx-auto border rounded-xl bg-muted/20 overflow-hidden">
                          {renderHistorialSVG()}

                          {/* Damage markers overlay */}
                          {danosFiltrados.map((dano, index) => (
                            <div
                              key={`${dano.checkupId}-${dano.id}`}
                              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${getOpacityClass(dano)}`}
                              style={{
                                left: `${dano.posicionX}%`,
                                top: `${dano.posicionY}%`,
                              }}
                              title={`${TIPO_CONFIG[dano.tipo].label} - ${dano.esNuevo ? "Nuevo" : `Desde ${format(new Date(dano.primeraVez), "dd/MM/yy")}`}`}
                            >
                              <div
                                className={`w-6 h-6 rounded-full ${TIPO_CONFIG[dano.tipo].bgColor} border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs ${getBorderClass(dano)} ${dano.esNuevo ? "animate-pulse" : ""}`}
                              >
                                {dano.esNuevo ? "!" : ""}
                              </div>
                            </div>
                          ))}

                          {danosFiltrados.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
                                Sin daños en esta vista
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* Leyenda de colores */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leyenda</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-500 animate-pulse ring-2 ring-white ring-offset-2" />
                      <span>Nuevo (último checkup)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-500 opacity-80" />
                      <span className="text-muted-foreground">1-3 días</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-500 opacity-50" />
                      <span className="text-muted-foreground">4-7 días</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-500 opacity-30" />
                      <span className="text-muted-foreground">7+ días</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Timeline de checkups */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Historial de Checkups con Daños
                  </h3>
                  <div className="space-y-2">
                    {checkups.map((checkup, index) => (
                      <div
                        key={checkup.id}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          checkupSeleccionado === checkup.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => setCheckupSeleccionado(checkup.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {format(new Date(checkup.fecha_checkup), "dd MMM yyyy, HH:mm", { locale: es })}
                              {index === 0 && (
                                <Badge variant="default" className="ml-2 text-xs">
                                  Último
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {checkup.chofer_nombre || "Sin chofer asignado"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {checkup.danos.map((_, di) => (
                              <span key={di} className="text-xs">
                                {di < 3 && (
                                  <span>
                                    {TIPO_CONFIG[checkup.danos[di].tipo]?.icon}
                                  </span>
                                )}
                              </span>
                            ))}
                            {checkup.danos.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{checkup.danos.length - 3}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {checkup.danos.length} daño{checkup.danos.length > 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conteo por tipo */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <span className="text-lg">🔴</span>
                    <div>
                      <div className="text-sm font-medium">{stats.golpes}</div>
                      <div className="text-xs text-muted-foreground">Golpes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <span className="text-lg">🟡</span>
                    <div>
                      <div className="text-sm font-medium">{stats.raspaduras}</div>
                      <div className="text-xs text-muted-foreground">Raspaduras</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <span className="text-lg">🔵</span>
                    <div>
                      <div className="text-sm font-medium">{stats.grietas}</div>
                      <div className="text-xs text-muted-foreground">Grietas</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
