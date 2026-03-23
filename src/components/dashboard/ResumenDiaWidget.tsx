import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, DollarSign, AlertTriangle, RotateCw, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResumenData {
  fecha: string;
  compras: { recepciones: number; bultos: number };
  rutas: { completadas: number; entregasCompletadas: number; entregasPendientes: number };
  ventas: { total: number; count: number };
  cobros: { total: number };
  devoluciones: { count: number };
  pendientes: { porAutorizar: number; atrasadas: number };
}

const formatCurrency = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;

export const ResumenDiaWidget = () => {
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadResumen();
  }, []);

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
    } catch (e) {
      console.error("Error cargando resumen:", e);
    } finally {
      setLoading(false);
    }
  };

  const generarResumen = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("resumen-diario", {
        body: { fecha: hoy },
      });
      if (error) throw error;
      if (data?.datos) {
        setResumen(data.datos);
        toast({ title: "Resumen generado", description: "Se envió push y email al admin" });
      }
    } catch (e) {
      console.error("Error generando resumen:", e);
      toast({ title: "Error", description: "No se pudo generar el resumen", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  if (!resumen) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Resumen del Día</p>
              <p className="text-xs text-muted-foreground">Se genera automáticamente a las 8pm</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={generarResumen} disabled={generating} className="gap-1">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
            Generar ahora
          </Button>
        </CardContent>
      </Card>
    );
  }

  const d = resumen;
  const totalPendientes = d.pendientes.porAutorizar + d.pendientes.atrasadas;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumen de Hoy
          </div>
          <Button size="sm" variant="ghost" onClick={generarResumen} disabled={generating} className="h-7 gap-1 text-xs">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
            Actualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Compras */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Compras</span>
            </div>
            <p className="text-lg font-bold">{d.compras.recepciones}</p>
            <p className="text-xs text-muted-foreground">{d.compras.bultos.toLocaleString()} bultos</p>
          </div>

          {/* Rutas */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Rutas</span>
            </div>
            <p className="text-lg font-bold">{d.rutas.completadas}</p>
            <p className="text-xs text-muted-foreground">{d.rutas.entregasCompletadas} entregas</p>
          </div>

          {/* Ventas */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Ventas</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(d.ventas.total)}</p>
            <p className="text-xs text-muted-foreground">Cobros: {formatCurrency(d.cobros.total)}</p>
          </div>

          {/* Pendientes */}
          <div className={`p-3 rounded-lg border ${totalPendientes > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50" : "bg-green-50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className={`h-4 w-4 ${totalPendientes > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} />
              <span className={`text-xs font-medium ${totalPendientes > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>Pendientes</span>
            </div>
            <p className="text-lg font-bold">{totalPendientes}</p>
            <p className="text-xs text-muted-foreground">
              {totalPendientes > 0
                ? `${d.pendientes.porAutorizar} por autorizar · ${d.pendientes.atrasadas} atrasadas`
                : "Todo al día"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
