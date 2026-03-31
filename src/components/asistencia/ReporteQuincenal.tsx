import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, CalendarDays } from "lucide-react";
import { format, eachDayOfInterval, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { exportToExcel } from "@/utils/exportData";

const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  sueldo_bruto: number | null;
  dias_laborales: string[] | null;
  periodo_pago: string | null;
}

export function ReporteQuincenal() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<{ empleado_id: string | null; fecha: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const quincenas = useMemo(() => {
    const result: { value: string; label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monthOffset = Math.floor(i / 2);
      const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      if (i % 2 === 0) {
        // Second half (16-end)
        const start = new Date(year, month, 16);
        const end = new Date(year, month + 1, 0);
        if (start <= now) {
          result.push({
            value: `${format(start, "yyyy-MM")}-Q2`,
            label: `16–${end.getDate()} ${format(start, "MMMM yyyy", { locale: es })}`,
            start, end,
          });
        }
      } else {
        // First half (1-15)
        const start = new Date(year, month, 1);
        const end = new Date(year, month, 15);
        result.push({
          value: `${format(start, "yyyy-MM")}-Q1`,
          label: `1–15 ${format(start, "MMMM yyyy", { locale: es })}`,
          start, end,
        });
      }
    }
    return result;
  }, []);

  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState(quincenas[0]?.value || "");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const q = quincenas.find(q => q.value === quincenaSeleccionada);
      if (!q) return;
      const fechaDesde = format(q.start, "yyyy-MM-dd");
      const fechaHasta = format(q.end, "yyyy-MM-dd");

      const [{ data: empData }, { data: asistData }] = await Promise.all([
        (supabase as any)
          .from("empleados")
          .select("id, nombre_completo, puesto, sueldo_bruto, dias_laborales, periodo_pago")
          .eq("activo", true)
          .eq("periodo_pago", "quincenal")
          .order("nombre_completo"),
        supabase
          .from("asistencia")
          .select("empleado_id, fecha")
          .gte("fecha", fechaDesde)
          .lte("fecha", fechaHasta),
      ]);
      setEmpleados((empData || []) as Empleado[]);
      setRegistros((asistData || []) as any[]);
      setLoading(false);
    };
    load();
  }, [quincenaSeleccionada, quincenas]);

  const reporte = useMemo(() => {
    const q = quincenas.find(q => q.value === quincenaSeleccionada);
    if (!q) return [];
    const today = new Date();
    const effectiveEnd = isAfter(q.end, today) ? today : q.end;
    const allDays = eachDayOfInterval({ start: q.start, end: effectiveEnd });

    return empleados.map(emp => {
      const diasLab = emp.dias_laborales || ["lun", "mar", "mie", "jue", "vie"];
      const diasHabiles = allDays.filter(d => diasLab.includes(DIA_MAP[d.getDay()])).length;
      const empFechas = new Set(registros.filter(r => r.empleado_id === emp.id).map(r => r.fecha).filter(Boolean));
      const diasAsistidos = allDays.filter(d => {
        const ds = format(d, "yyyy-MM-dd");
        return empFechas.has(ds);
      }).length;
      const ausencias = Math.max(0, diasHabiles - diasAsistidos);
      const sueldoQuincenal = emp.sueldo_bruto ? emp.sueldo_bruto / 2 : 0;

      return {
        empleado_id: emp.id,
        nombre: emp.nombre_completo,
        puesto: emp.puesto,
        diasHabiles,
        diasAsistidos,
        ausencias,
        sueldoQuincenal,
      };
    });
  }, [empleados, registros, quincenaSeleccionada, quincenas]);

  const handleExport = () => {
    const columns = [
      { key: "nombre", header: "Empleado" },
      { key: "puesto", header: "Puesto" },
      { key: "diasHabiles", header: "Días Hábiles" },
      { key: "diasAsistidos", header: "Días Asistidos" },
      { key: "ausencias", header: "Ausencias" },
      { key: "sueldoQuincenal", header: "Sueldo Quincenal", transform: (v: number) => v.toFixed(2) },
    ];
    const q = quincenas.find(q => q.value === quincenaSeleccionada);
    const label = q ? format(q.start, "dd_MMM_yyyy", { locale: es }) : quincenaSeleccionada;
    exportToExcel(reporte, `Nomina_Quincenal_${label}`, columns, "Nómina Quincenal");
  };

  const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Reporte Quincenal — Nómina
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={quincenaSeleccionada} onValueChange={setQuincenaSeleccionada}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quincenas.map(q => (
                  <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={loading || reporte.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reporte.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Sin empleados con pago quincenal</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead className="text-center">Días Hábiles</TableHead>
                <TableHead className="text-center">Días Asistidos</TableHead>
                <TableHead className="text-center">Ausencias</TableHead>
                <TableHead className="text-right">Sueldo Quincenal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.map(r => (
                <TableRow key={r.empleado_id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.puesto}</TableCell>
                  <TableCell className="text-center font-mono">{r.diasHabiles}</TableCell>
                  <TableCell className="text-center font-mono">{r.diasAsistidos}</TableCell>
                  <TableCell className="text-center font-mono">{r.ausencias > 0 ? <span className="text-destructive">{r.ausencias}</span> : "0"}</TableCell>
                  <TableCell className="text-right font-mono">{fmt$(r.sueldoQuincenal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
