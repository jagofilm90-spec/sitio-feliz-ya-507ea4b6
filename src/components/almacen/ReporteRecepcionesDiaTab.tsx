import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Calendar as CalendarIcon,
  FileDown,
  FileSpreadsheet,
  RefreshCw,
  Package,
  Clock,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/exportData";
import { generarReporteRecepcionesDiaPDF } from "@/utils/reporteRecepcionesDiaPdfGenerator";
import { toast } from "sonner";
import { getDisplayName } from "@/lib/productUtils";

interface ProductoRecibido {
  id: string;
  codigo: string;
  nombre: string;
  marca?: string | null;
  cantidadOrdenada: number;
  cantidadRecibida: number;
  diferencia: number;
  razonDiferencia?: string | null;
}

interface RecepcionDelDia {
  id: string;
  folio: string;
  proveedor: string;
  numeroEntrega: number | null;
  bultos: number;
  productos: ProductoRecibido[];
  recibidoPor: string;
  horaLlegada: string;
  horaFinRecepcion: string;
  duracionMinutos: number;
  tieneDiferencias: boolean;
}

interface ReporteStats {
  totalRecepciones: number;
  tiempoPromedioMinutos: number;
  conDiferencias: number;
  personalActivo: string[];
}

const RAZON_LABELS: Record<string, string> = {
  faltante: "Faltante",
  danado: "Dañado",
  no_solicitado: "No solicitado",
  diferencia_peso: "Diferencia de peso",
  otro: "Otro",
};

export const ReporteRecepcionesDiaTab = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [recepciones, setRecepciones] = useState<RecepcionDelDia[]>([]);
  const [stats, setStats] = useState<ReporteStats>({
    totalRecepciones: 0,
    tiempoPromedioMinutos: 0,
    conDiferencias: 0,
    personalActivo: [],
  });
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadRecepciones = async () => {
    setLoading(true);
    try {
      const fechaStr = format(selectedDate, "yyyy-MM-dd");

      // Consultar entregas recibidas en la fecha seleccionada
      const { data: entregas, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id,
          numero_entrega,
          cantidad_bultos,
          llegada_registrada_en,
          recepcion_finalizada_en,
          recibido_por,
          orden_compra_id
        `)
        .eq("status", "recibida")
        .gte("fecha_entrega_real", fechaStr)
        .lte("fecha_entrega_real", fechaStr)
        .order("recepcion_finalizada_en", { ascending: true });

      if (error) throw error;

      if (!entregas || entregas.length === 0) {
        setRecepciones([]);
        setStats({
          totalRecepciones: 0,
          tiempoPromedioMinutos: 0,
          conDiferencias: 0,
          personalActivo: [],
        });
        setLoading(false);
        return;
      }

      // Obtener IDs únicos para consultas adicionales
      const ordenIds = [...new Set(entregas.map((e) => e.orden_compra_id))];
      const recibidoPorIds = [...new Set(entregas.map((e) => e.recibido_por).filter((id): id is string => !!id))];

      // Consultas paralelas
      const [ordenesRes, profilesRes, detallesRes] = await Promise.all([
        supabase
          .from("ordenes_compra")
          .select("id, folio, proveedor_id, proveedor_nombre_manual, proveedores(nombre)")
          .in("id", ordenIds),
        recibidoPorIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", recibidoPorIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        supabase
          .from("ordenes_compra_detalles")
          .select("id, orden_compra_id, cantidad_ordenada, cantidad_recibida, razon_diferencia, productos(codigo, nombre, marca)")
          .in("orden_compra_id", ordenIds),
      ]);

      // Crear mapas para lookup rápido
      const ordenesMap = new Map<string, any>(ordenesRes.data?.map((o) => [o.id, o] as [string, any]) || []);
      const profilesMap = new Map<string, string>(
        (profilesRes.data || []).map((p) => [p.id, p.full_name || "Sin nombre"] as [string, string])
      );
      const detallesMap = new Map<string, any[]>();
      detallesRes.data?.forEach((d) => {
        if (!detallesMap.has(d.orden_compra_id)) {
          detallesMap.set(d.orden_compra_id, []);
        }
        detallesMap.get(d.orden_compra_id)!.push(d);
      });

      // Mapear recepciones
      const recepcionesData: RecepcionDelDia[] = entregas.map((entrega) => {
        const orden = ordenesMap.get(entrega.orden_compra_id);
        const detalles = detallesMap.get(entrega.orden_compra_id) || [];

        const productos: ProductoRecibido[] = detalles.map((d) => ({
          id: d.id,
          codigo: d.productos?.codigo || "",
          nombre: d.productos?.nombre || "",
          marca: d.productos?.marca,
          cantidadOrdenada: d.cantidad_ordenada || 0,
          cantidadRecibida: d.cantidad_recibida || 0,
          diferencia: (d.cantidad_recibida || 0) - (d.cantidad_ordenada || 0),
          razonDiferencia: d.razon_diferencia,
        }));

        const tieneDiferencias = productos.some((p) => p.diferencia !== 0);
        const recibidoPorNombre: string = entrega.recibido_por
          ? profilesMap.get(entrega.recibido_por) || "Desconocido"
          : "No registrado";

        // Calcular duración
        let duracionMinutos = 0;
        if (entrega.llegada_registrada_en && entrega.recepcion_finalizada_en) {
          const llegada = new Date(entrega.llegada_registrada_en);
          const fin = new Date(entrega.recepcion_finalizada_en);
          duracionMinutos = Math.round((fin.getTime() - llegada.getTime()) / 60000);
        }

        return {
          id: entrega.id,
          folio: orden?.folio || "N/A",
          proveedor: orden?.proveedor_id
            ? (orden.proveedores as any)?.nombre || "N/A"
            : orden?.proveedor_nombre_manual || "N/A",
          numeroEntrega: entrega.numero_entrega,
          bultos: entrega.cantidad_bultos || 0,
          productos,
          recibidoPor: recibidoPorNombre,
          horaLlegada: entrega.llegada_registrada_en
            ? format(parseISO(entrega.llegada_registrada_en), "HH:mm")
            : "--:--",
          horaFinRecepcion: entrega.recepcion_finalizada_en
            ? format(parseISO(entrega.recepcion_finalizada_en), "HH:mm")
            : "--:--",
          duracionMinutos,
          tieneDiferencias,
        };
      });

      // Calcular estadísticas
      const totalRecepciones = recepcionesData.length;
      const tiemposValidos = recepcionesData.filter((r) => r.duracionMinutos > 0);
      const tiempoPromedioMinutos =
        tiemposValidos.length > 0
          ? Math.round(
              tiemposValidos.reduce((acc, r) => acc + r.duracionMinutos, 0) / tiemposValidos.length
            )
          : 0;
      const conDiferencias = recepcionesData.filter((r) => r.tieneDiferencias).length;
      const personalActivo = [...new Set(recepcionesData.map((r) => r.recibidoPor))];

      setRecepciones(recepcionesData);
      setStats({
        totalRecepciones,
        tiempoPromedioMinutos,
        conDiferencias,
        personalActivo,
      });
    } catch (error) {
      console.error("Error loading recepciones:", error);
      toast.error("Error al cargar recepciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecepciones();
  }, [selectedDate]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleExportPDF = async () => {
    if (recepciones.length === 0) {
      toast.error("No hay recepciones para exportar");
      return;
    }

    setGeneratingPdf(true);
    try {
      await generarReporteRecepcionesDiaPDF(selectedDate, recepciones, stats);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleExportExcel = () => {
    if (recepciones.length === 0) {
      toast.error("No hay recepciones para exportar");
      return;
    }

    // Aplanar datos para Excel
    const dataFlat = recepciones.flatMap((r) =>
      r.productos.map((p) => ({
        folio: r.folio,
        proveedor: r.proveedor,
        numeroEntrega: r.numeroEntrega || 1,
        bultos: r.bultos,
        horaLlegada: r.horaLlegada,
        horaFin: r.horaFinRecepcion,
        duracion: formatDuration(r.duracionMinutos),
        recibidoPor: r.recibidoPor,
        codigoProducto: p.codigo,
        nombreProducto: p.nombre,
        cantidadOrdenada: p.cantidadOrdenada,
        cantidadRecibida: p.cantidadRecibida,
        diferencia: p.diferencia,
        razonDiferencia: p.razonDiferencia ? RAZON_LABELS[p.razonDiferencia] || p.razonDiferencia : "",
      }))
    );

    const columns = [
      { key: "folio", header: "Folio OC" },
      { key: "proveedor", header: "Proveedor" },
      { key: "numeroEntrega", header: "# Entrega" },
      { key: "bultos", header: "Bultos" },
      { key: "horaLlegada", header: "Hora Llegada" },
      { key: "horaFin", header: "Hora Fin" },
      { key: "duracion", header: "Duración" },
      { key: "recibidoPor", header: "Recibido Por" },
      { key: "codigoProducto", header: "Código Producto" },
      { key: "nombreProducto", header: "Producto" },
      { key: "cantidadOrdenada", header: "Ordenado" },
      { key: "cantidadRecibida", header: "Recibido" },
      { key: "diferencia", header: "Diferencia" },
      { key: "razonDiferencia", header: "Razón Diferencia" },
    ];

    const fechaStr = format(selectedDate, "yyyy-MM-dd");
    exportToExcel(dataFlat, `Recepciones_${fechaStr}`, columns, "Recepciones");
    toast.success("Excel exportado exitosamente");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reporte del día."
        lead="Cierre operativo"
      />
      {/* Header con controles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 px-4 text-lg gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={loadRecepciones} className="h-12 w-12">
                <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={loading || recepciones.length === 0 || generatingPdf}
                className="h-12 gap-2"
              >
                {generatingPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileDown className="w-5 h-5" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={loading || recepciones.length === 0}
                className="h-12 gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border border-ink-100 rounded-xl"><CardContent className="p-4"><p className="font-serif text-[32px] font-medium tabular-nums text-ink-900 leading-none">{stats.totalRecepciones}</p><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 mt-2">Recepciones</p></CardContent></Card>
        <Card className="bg-white border border-ink-100 rounded-xl"><CardContent className="p-4"><p className="font-serif text-[32px] font-medium tabular-nums text-ink-900 leading-none">{formatDuration(stats.tiempoPromedioMinutos)}</p><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 mt-2">Tiempo Promedio</p></CardContent></Card>
        <Card className="bg-white border border-ink-100 rounded-xl"><CardContent className="p-4"><p className="font-serif text-[32px] font-medium tabular-nums text-crimson-600 leading-none">{stats.conDiferencias}</p><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 mt-2">Con Diferencias</p></CardContent></Card>
        <Card className="bg-white border border-ink-100 rounded-xl"><CardContent className="p-4"><p className="font-serif text-[32px] font-medium tabular-nums text-ink-900 leading-none">{stats.personalActivo.length}</p><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 mt-2">Personal Activo</p></CardContent></Card>
      </div>

      {/* Tabla de recepciones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Detalle de Recepciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : recepciones.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No hay recepciones para esta fecha</p>
              <p className="text-sm">Selecciona otra fecha para ver el historial</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Folio OC</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-center">Bultos</TableHead>
                    <TableHead className="text-center">Llegó</TableHead>
                    <TableHead className="text-center">Terminó</TableHead>
                    <TableHead className="text-center">Duración</TableHead>
                    <TableHead>Recibió</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recepciones.map((recepcion) => (
                    <Collapsible key={recepcion.id} asChild>
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <CollapsibleTrigger asChild>
                            <TableCell
                              onClick={() => toggleRow(recepcion.id)}
                              className="cursor-pointer"
                            >
                              {expandedRows.has(recepcion.id) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </TableCell>
                          </CollapsibleTrigger>
                          <TableCell className="font-medium">
                            {recepcion.folio}
                            {recepcion.numeroEntrega && recepcion.numeroEntrega > 1 && (
                              <Badge variant="outline" className="ml-2">
                                #{recepcion.numeroEntrega}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {recepcion.proveedor}
                          </TableCell>
                          <TableCell className="text-center">{recepcion.bultos}</TableCell>
                          <TableCell className="text-center font-mono">
                            {recepcion.horaLlegada}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {recepcion.horaFinRecepcion}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {formatDuration(recepcion.duracionMinutos)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {recepcion.recibidoPor}
                          </TableCell>
                          <TableCell className="text-center">
                            {recepcion.tieneDiferencias ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Diferencias
                              </Badge>
                            ) : (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                                Completa
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={9} className="p-0">
                              <div className="p-4">
                                <p className="text-sm font-medium mb-2 text-muted-foreground">
                                  Productos recibidos ({recepcion.productos.length})
                                </p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Código</TableHead>
                                      <TableHead>Producto</TableHead>
                                      <TableHead className="text-center">Ordenado</TableHead>
                                      <TableHead className="text-center">Recibido</TableHead>
                                      <TableHead className="text-center">Diferencia</TableHead>
                                      <TableHead>Razón</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {recepcion.productos.map((producto) => (
                                      <TableRow key={producto.id}>
                                        <TableCell className="font-mono text-sm">
                                          {producto.codigo}
                                        </TableCell>
                                        <TableCell>
                                          {getDisplayName({
                                            nombre: producto.nombre,
                                            marca: producto.marca,
                                          })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {producto.cantidadOrdenada}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {producto.cantidadRecibida}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {producto.diferencia !== 0 ? (
                                            <Badge
                                              variant={
                                                producto.diferencia < 0 ? "destructive" : "default"
                                              }
                                            >
                                              {producto.diferencia > 0 ? "+" : ""}
                                              {producto.diferencia}
                                            </Badge>
                                          ) : (
                                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {producto.razonDiferencia ? (
                                            <span className="text-sm text-muted-foreground">
                                              {RAZON_LABELS[producto.razonDiferencia] ||
                                                producto.razonDiferencia}
                                            </span>
                                          ) : (
                                            "-"
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
