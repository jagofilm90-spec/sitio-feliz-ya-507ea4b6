import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, CalendarDays } from "lucide-react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { exportToExcel } from "@/utils/exportData";

const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  dias_laborales: string[] | null;
}

interface AsistenciaRow {
  empleado_id: string | null;
  fecha: string | null;
  hora: string | null;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function ReporteAsistenciaMensual() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(() => format(new Date(), "yyyy-MM"));

  const meses = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy", { locale: es }),
      });
    }
    return result;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [year, month] = mesSeleccionado.split("-").map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(start);
      const fechaDesde = format(start, "yyyy-MM-dd");
      const fechaHasta = format(end, "yyyy-MM-dd");

      const [{ data: empData }, { data: asistData }, { data: mapeoData }] = await Promise.all([
        (supabase as any)
          .from("empleados")
          .select("id, nombre_completo, puesto, dias_laborales")
          .eq("activo", true)
          .order("nombre_completo"),
        supabase
          .from("asistencia")
          .select("empleado_id, fecha, hora")
          .gte("fecha", fechaDesde)
          .lte("fecha", fechaHasta)
          .order("hora", { ascending: true }),
        (supabase as any)
          .from("zk_mapeo")
          .select("empleado_id"),
      ]);
      const mappedIds = new Set((mapeoData || []).map((m: any) => m.empleado_id));
      const filtered = (empData || []).filter((e: any) => mappedIds.has(e.id));
      setEmpleados(filtered as Empleado[]);
      setRegistros((asistData || []) as AsistenciaRow[]);
      setLoading(false);
    };
    load();
  }, [mesSeleccionado]);

  const reporte = useMemo(() => {
    const [year, month] = mesSeleccionado.split("-").map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    const today = new Date();
    const effectiveEnd = isAfter(end, today) ? today : end;
    const allDays = eachDayOfInterval({ start, end: effectiveEnd });

    return empleados.map(emp => {
      const diasLab = emp.dias_laborales || ["lun", "mar", "mie", "jue", "vie", "sab"];
      const diasHabiles = allDays.filter(d => diasLab.includes(DIA_MAP[d.getDay()]));
      const totalDiasHabiles = diasHabiles.length;

      const empRegistros = registros.filter(r => r.empleado_id === emp.id);
      const diasConRegistro = new Set(empRegistros.map(r => r.fecha).filter(Boolean));
      const diasAsistidos = diasConRegistro.size;
      const diasAusente = Math.max(0, totalDiasHabiles - diasAsistidos);

      const primerasEntradas: number[] = [];
      for (const fecha of diasConRegistro) {
        const regs = empRegistros.filter(r => r.fecha === fecha && r.hora).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
        if (regs[0]?.hora) {
          primerasEntradas.push(timeToMinutes(regs[0].hora));
        }
      }
      const horaPromedioMins = primerasEntradas.length > 0
        ? primerasEntradas.reduce((a, b) => a + b, 0) / primerasEntradas.length
        : null;

      return {
        empleado_id: emp.id,
        nombre: emp.nombre_completo,
        puesto: emp.puesto,
        diasAsistidos,
        diasAusente,
        totalDiasHabiles,
        horaPromedioLlegada: horaPromedioMins !== null ? formatMinutesToTime(horaPromedioMins) : "—",
      };
    });
  }, [empleados, registros, mesSeleccionado]);

  const handleExport = () => {
    const columns = [
      { key: "nombre", header: "Empleado" },
      { key: "puesto", header: "Puesto" },
      { key: "diasAsistidos", header: "Días Asistidos" },
      { key: "diasAusente", header: "Días Ausente" },
      { key: "totalDiasHabiles", header: "Días Hábiles" },
      { key: "horaPromedioLlegada", header: "Hora Promedio Llegada" },
    ];
    const [year, month] = mesSeleccionado.split("-").map(Number);
    const mesLabel = format(new Date(year, month - 1), "MMMM_yyyy", { locale: es });
    exportToExcel(reporte, `Asistencia_${mesLabel}`, columns, "Asistencia");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Reporte Mensual
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
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
          <p className="text-muted-foreground text-sm text-center py-4">Sin datos para este mes</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead className="text-center">Días Asistidos</TableHead>
                <TableHead className="text-center">Días Ausente</TableHead>
                <TableHead className="text-center">Días Hábiles</TableHead>
                <TableHead>Hora Prom. Llegada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.map(r => (
                <TableRow key={r.empleado_id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.puesto}</TableCell>
                  <TableCell className="text-center font-mono">{r.diasAsistidos}</TableCell>
                  <TableCell className="text-center font-mono">{r.diasAusente}</TableCell>
                  <TableCell className="text-center font-mono">{r.totalDiasHabiles}</TableCell>
                  <TableCell className="font-mono text-sm">{r.horaPromedioLlegada}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
