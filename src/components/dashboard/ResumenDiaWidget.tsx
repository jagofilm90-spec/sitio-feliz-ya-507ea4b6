import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, DollarSign, AlertTriangle, RotateCw, BarChart3, X, Clock, User, Car, CreditCard, ArrowDownUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoAlmasa from "@/assets/logo-almasa.png";

interface RecepcionDetalle {
  proveedor: string;
  folio: string;
  entrega: number;
  bultos: number;
  chofer: string | null;
  placas: string | null;
  llegada: string | null;
  fin: string | null;
}

interface RutaDetalle {
  nombre: string;
  status: string;
  horaSalida: string | null;
  horaRegreso: string | null;
  entregas: number;
  entregadas: number;
}

interface ResumenData {
  fecha: string;
  generado_en?: string;
  compras: { recepciones: number; bultos: number; detalle?: RecepcionDetalle[] };
  rutas: { total: number; completadas: number; entregasCompletadas: number; entregasPendientes: number; detalle?: RutaDetalle[] };
  ventas: { total: number; count: number };
  ventasMostrador?: { total: number; count: number; efectivo: number; transferencia: number };
  cobros: { total: number };
  devoluciones: { count: number };
  pendientes: { porAutorizar: number; atrasadas: number; creditoExcedido?: number };
}

const formatCurrency = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;

const formatDuracion = (inicio: string | null, fin: string | null) => {
  if (!inicio || !fin) return "—";
  const min = Math.floor((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} min`;
};

const formatHora = (ts: string | null) => {
  if (!ts) return "—";
  try { return format(new Date(ts), "HH:mm"); } catch { return "—"; }
};

export const ResumenDiaWidget = () => {
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());

  useEffect(() => { loadResumen(); }, []);

  const loadResumen = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("resumenes_diarios" as any)
        .select("datos")
        .eq("fecha", hoy)
        .maybeSingle();
      if (data) setResumen((data as any).datos as ResumenData);
      else setResumen(null);
    } catch (e) { console.error("Error cargando resumen:", e); }
    finally { setLoading(false); }
  };

  const generarResumen = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("resumen-diario", { body: { fecha: hoy } });
      if (error) throw error;
      if (data?.datos) {
        setResumen(data.datos);
        toast({ title: "Resumen generado", description: "Se envió push y email" });
        setDialogOpen(true);
      }
    } catch (e) {
      console.error("Error generando resumen:", e);
      toast({ title: "Error", description: "No se pudo generar el resumen", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  if (loading) return null;

  // No resumen yet
  if (!resumen) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Reporte Ejecutivo del Día</p>
              <p className="text-xs text-muted-foreground">Se genera automáticamente a las 8pm</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={generarResumen} disabled={generating} className="gap-1">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
            Generar ahora
          </Button>
        </CardContent>
      </Card>
    );
  }

  const d = resumen;
  const totalPendientes = d.pendientes.porAutorizar + d.pendientes.atrasadas + (d.pendientes.creditoExcedido || 0);
  const fechaDisplay = format(new Date(d.fecha + "T12:00:00"), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const generadoDisplay = d.generado_en ? format(new Date(d.generado_en), "HH:mm") : "—";

  return (
    <>
      {/* Summary card */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDialogOpen(true)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Reporte del Día
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); generarResumen(); }} disabled={generating} className="h-7 gap-1 text-xs">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                Actualizar
              </Button>
              <Badge variant="outline" className="text-xs">Ver detalle</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-1.5 mb-1"><Package className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs font-medium text-blue-700 dark:text-blue-400">Compras</span></div>
              <p className="text-lg font-bold">{d.compras.recepciones}</p>
              <p className="text-xs text-muted-foreground">{d.compras.bultos.toLocaleString()} bultos</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50">
              <div className="flex items-center gap-1.5 mb-1"><Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Rutas</span></div>
              <p className="text-lg font-bold">{d.rutas.completadas}/{d.rutas.total}</p>
              <p className="text-xs text-muted-foreground">{d.rutas.entregasCompletadas} entregas</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs font-medium text-amber-700 dark:text-amber-400">Ventas</span></div>
              <p className="text-lg font-bold">{formatCurrency(d.ventas.total + (d.ventasMostrador?.total || 0))}</p>
              <p className="text-xs text-muted-foreground">Cobros: {formatCurrency(d.cobros.total)}</p>
            </div>
            <div className={`p-3 rounded-lg border ${totalPendientes > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50" : "bg-green-50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50"}`}>
              <div className="flex items-center gap-1.5 mb-1"><AlertTriangle className={`h-4 w-4 ${totalPendientes > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} /><span className={`text-xs font-medium ${totalPendientes > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>Pendientes</span></div>
              <p className="text-lg font-bold">{totalPendientes}</p>
              <p className="text-xs text-muted-foreground">{totalPendientes > 0 ? `${d.pendientes.porAutorizar} autorizar · ${d.pendientes.atrasadas} atrasadas` : "Todo al día"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="sr-only"><DialogTitle>Reporte Ejecutivo</DialogTitle></DialogHeader>

          {/* Header fijo */}
          <div className="flex items-center justify-between p-4 border-b bg-background flex-shrink-0">
            <img src={logoAlmasa} alt="ALMASA" className="h-8 object-contain" />
            <div className="text-center">
              <p className="font-bold text-sm">REPORTE EJECUTIVO DEL DÍA</p>
              <p className="text-xs text-muted-foreground capitalize">{fechaDisplay}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDialogOpen(false)} className="touch-manipulation">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Generado a las */}
          <div className="px-4 py-2 bg-muted/30 border-b flex-shrink-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Generado a las {generadoDisplay}</span>
            <Button size="sm" variant="ghost" onClick={generarResumen} disabled={generating} className="h-6 text-xs gap-1">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
              Regenerar
            </Button>
          </div>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* ===== RECEPCIONES ===== */}
            <section>
              <h3 className="font-bold text-sm uppercase tracking-wide text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" /> Recepciones de Mercancía
                <Badge variant="secondary" className="ml-auto">{d.compras.recepciones} · {d.compras.bultos.toLocaleString()} bultos</Badge>
              </h3>
              {d.compras.detalle && d.compras.detalle.length > 0 ? (
                <div className="space-y-2">
                  {d.compras.detalle.map((r, i) => (
                    <div key={i} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{r.proveedor}</p>
                          <p className="text-xs text-muted-foreground">{r.folio} · Entrega #{r.entrega}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{r.bultos} bultos</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatHora(r.llegada)} → {formatHora(r.fin)}</span>
                        <span className="font-medium text-foreground">{formatDuracion(r.llegada, r.fin)}</span>
                        {r.chofer && <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.chofer}</span>}
                        {r.placas && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{r.placas}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Sin recepciones hoy</p>
              )}
            </section>

            {/* ===== RUTAS ===== */}
            <section>
              <h3 className="font-bold text-sm uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4" /> Rutas y Entregas
                <Badge variant="secondary" className="ml-auto">{d.rutas.completadas}/{d.rutas.total} completadas · {d.rutas.entregasCompletadas} entregas</Badge>
              </h3>
              {d.rutas.detalle && d.rutas.detalle.length > 0 ? (
                <div className="space-y-2">
                  {d.rutas.detalle.map((r, i) => (
                    <div key={i} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.nombre || `Ruta ${i + 1}`}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {r.horaSalida && <span>Salida: {formatHora(r.horaSalida)}</span>}
                          {r.horaRegreso && <span>Regreso: {formatHora(r.horaRegreso)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{r.entregadas}/{r.entregas}</p>
                        <Badge variant={r.status === "completada" ? "default" : "secondary"} className="text-xs">
                          {r.status === "completada" ? "Completada" : r.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Sin rutas hoy</p>
              )}
            </section>

            {/* ===== VENTAS ===== */}
            <section>
              <h3 className="font-bold text-sm uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4" /> Ventas y Cobros
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Ventas (Pedidos)</p>
                  <p className="text-xl font-bold">{formatCurrency(d.ventas.total)}</p>
                  <p className="text-xs text-muted-foreground">{d.ventas.count} pedidos</p>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Cobros del Día</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(d.cobros.total)}</p>
                </div>
                {d.ventasMostrador && d.ventasMostrador.count > 0 && (
                  <>
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Ventas Mostrador</p>
                      <p className="text-xl font-bold">{formatCurrency(d.ventasMostrador.total)}</p>
                      <p className="text-xs text-muted-foreground">{d.ventasMostrador.count} ventas</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Desglose Mostrador</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Efectivo</span>
                        <span className="font-medium">{formatCurrency(d.ventasMostrador.efectivo)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="flex items-center gap-1"><ArrowDownUp className="h-3 w-3" /> Transferencia</span>
                        <span className="font-medium">{formatCurrency(d.ventasMostrador.transferencia)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ===== DEVOLUCIONES ===== */}
            {d.devoluciones.count > 0 && (
              <section>
                <h3 className="font-bold text-sm uppercase tracking-wide text-orange-700 dark:text-orange-400 flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" /> Devoluciones
                  <Badge variant="secondary" className="ml-auto">{d.devoluciones.count}</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">{d.devoluciones.count} devolución(es) a proveedores registrada(s)</p>
              </section>
            )}

            {/* ===== PENDIENTES ===== */}
            {totalPendientes > 0 && (
              <section>
                <h3 className="font-bold text-sm uppercase tracking-wide text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" /> Pendientes Críticos
                </h3>
                <div className="space-y-2">
                  {d.pendientes.porAutorizar > 0 && (
                    <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
                      <span className="text-sm">Pedidos sin autorizar</span>
                      <Badge variant="destructive">{d.pendientes.porAutorizar}</Badge>
                    </div>
                  )}
                  {d.pendientes.atrasadas > 0 && (
                    <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
                      <span className="text-sm">Entregas de proveedor atrasadas</span>
                      <Badge variant="destructive">{d.pendientes.atrasadas}</Badge>
                    </div>
                  )}
                  {(d.pendientes.creditoExcedido || 0) > 0 && (
                    <div className="p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
                      <span className="text-sm">Clientes con crédito excedido</span>
                      <Badge variant="secondary">{d.pendientes.creditoExcedido}</Badge>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Footer fijo */}
          <div className="p-4 border-t bg-muted/30 flex-shrink-0 text-center">
            <p className="text-xs text-muted-foreground">
              Generado por ALMASA ERP · {fechaDisplay}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
