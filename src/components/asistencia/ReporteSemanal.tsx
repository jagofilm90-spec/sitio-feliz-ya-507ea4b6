import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, CalendarDays, Check, X } from "lucide-react";
import { format, addDays, startOfWeek, subWeeks, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { exportToExcel } from "@/utils/exportData";

const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  sueldo_bruto: number | null;
  premio_asistencia_semanal: number | null;
  dias_laborales: string[] | null;
  periodo_pago: string | null;
}

interface AsistenciaRow {
  empleado_id: string | null;
  fecha: string | null;
  hora: string | null;
}

function timeToAMPM(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function ReporteSemanal() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const semanas = useMemo(() => {
    const result: { value: string; label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const monday = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const saturday = addDays(monday, 5);
      result.push({
        value: format(monday, "yyyy-MM-dd"),
        label: `${format(monday, "d MMM", { locale: es })} – ${format(saturday, "d MMM yyyy", { locale: es })}`,
        start: monday,
        end: saturday,
      });
    }
    return result;
  }, []);

  const [semanaSeleccionada, setSemanaSeleccionada] = useState(semanas[0]?.value || "");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sem = semanas.find(s => s.value === semanaSeleccionada);
      if (!sem) return;
      const fechaDesde = format(sem.start, "yyyy-MM-dd");
      const fechaHasta = format(sem.end, "yyyy-MM-dd");

      const [{ data: empData }, { data: asistData }, { data: mapeoData }] = await Promise.all([
        (supabase as any)
          .from("empleados")
          .select("id, nombre_completo, puesto, sueldo_bruto, premio_asistencia_semanal, dias_laborales, periodo_pago")
          .eq("activo", true)
          .eq("periodo_pago", "semanal")
          .order("nombre_completo"),
        supabase
          .from("asistencia")
          .select("empleado_id, fecha, hora")
          .gte("fecha", fechaDesde)
          .lte("fecha", fechaHasta)
          .order("hora", { ascending: true }),
        (supabase as any).from("zk_mapeo").select("empleado_id"),
      ]);
      const mappedIds = new Set((mapeoData || []).map((m: any) => m.empleado_id));
      const filtered = (empData || []).filter((e: any) => e.zk_id || mappedIds.has(e.id));
      setEmpleados(filtered.length > 0 ? filtered : (empData || []) as Empleado[]);
      setRegistros((asistData || []) as AsistenciaRow[]);
      setLoading(false);
    };
    load();
  }, [semanaSeleccionada, semanas]);

  const diasSemana = useMemo(() => {
    const sem = semanas.find(s => s.value === semanaSeleccionada);
    if (!sem) return [];
    const days: { date: Date; dateStr: string; label: string; diaKey: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = addDays(sem.start, i);
      days.push({
        date: d,
        dateStr: format(d, "yyyy-MM-dd"),
        label: format(d, "EEE d", { locale: es }),
        diaKey: DIA_MAP[d.getDay()],
      });
    }
    return days;
  }, [semanaSeleccionada, semanas]);

  const reporte = useMemo(() => {
    const today = new Date();
    return empleados.map(emp => {
      const diasLab = emp.dias_laborales || ["lun", "mar", "mie", "jue", "vie", "sab"];
      const empRegistros = registros.filter(r => r.empleado_id === emp.id);
      const diasInfo = diasSemana.map(dia => {
        const debeTrabjar = diasLab.includes(dia.diaKey);
        const isFuture = isAfter(dia.date, today);
        const regs = empRegistros.filter(r => r.fecha === dia.dateStr && r.hora).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
        const asistio = regs.length > 0;
        const horaEntrada = regs[0]?.hora ? timeToAMPM(regs[0].hora) : null;
        return { ...dia, debeTrabjar, asistio, horaEntrada, isFuture };
      });

      const diasQueTocaba = diasInfo.filter(d => d.debeTrabjar && !d.isFuture);
      const diasTrabajados = diasInfo.filter(d => d.asistio).length;
      const diasFaltados = diasQueTocaba.filter(d => !d.asistio).length;
      const sueldoDiario = emp.sueldo_bruto ? emp.sueldo_bruto / 30 : 0;
      const premioAplica = diasFaltados === 0 && diasQueTocaba.length > 0;
      const premio = premioAplica ? (emp.premio_asistencia_semanal || 0) : 0;
      const totalPagar = (sueldoDiario * diasTrabajados) + premio;

      return {
        empleado_id: emp.id,
        nombre: emp.nombre_completo,
        puesto: emp.puesto,
        diasInfo,
        diasTrabajados,
        sueldoDiario,
        premioAplica,
        premio,
        totalPagar,
      };
    });
  }, [empleados, registros, diasSemana]);

  const handleExport = () => {
    const exportData = reporte.map(r => {
      const row: Record<string, any> = { Empleado: r.nombre };
      diasSemana.forEach((dia, i) => {
        const info = r.diasInfo[i];
        row[dia.label] = info.asistio ? (info.horaEntrada || "✓") : (info.debeTrabjar && !info.isFuture ? "✗" : "—");
      });
      row["Total días"] = r.diasTrabajados;
      row["Sueldo diario"] = r.sueldoDiario.toFixed(2);
      row["Premio"] = r.premioAplica ? r.premio.toFixed(2) : "—";
      row["Total a pagar"] = r.totalPagar.toFixed(2);
      return row;
    });
    const sem = semanas.find(s => s.value === semanaSeleccionada);
    const label = sem ? format(sem.start, "dd_MMM", { locale: es }) : semanaSeleccionada;
    const columns = Object.keys(exportData[0] || {}).map(k => ({ key: k, header: k }));
    exportToExcel(exportData, `Nomina_Semanal_${label}`, columns, "Nómina Semanal");
  };

  const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Reporte Semanal — Nómina
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={semanaSeleccionada} onValueChange={setSemanaSeleccionada}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {semanas.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
          <p className="text-muted-foreground text-sm text-center py-4">Sin empleados con pago semanal</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Empleado</TableHead>
                  {diasSemana.map(d => (
                    <TableHead key={d.dateStr} className="text-center text-xs whitespace-nowrap">{d.label}</TableHead>
                  ))}
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead className="text-right">S. Diario</TableHead>
                  <TableHead className="text-right">Premio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reporte.map(r => (
                  <TableRow key={r.empleado_id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 whitespace-nowrap">{r.nombre}</TableCell>
                    {r.diasInfo.map((d, i) => (
                      <TableCell key={i} className="text-center p-1">
                        {d.asistio ? (
                          <div className="flex flex-col items-center">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-[10px] text-muted-foreground">{d.horaEntrada}</span>
                          </div>
                        ) : d.isFuture ? (
                          <span className="text-muted-foreground">—</span>
                        ) : d.debeTrabjar ? (
                          <X className="h-4 w-4 text-destructive mx-auto" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-mono">{r.diasTrabajados}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt$(r.sueldoDiario)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.premioAplica ? <span className="text-green-600">{fmt$(r.premio)}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt$(r.totalPagar)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell className="sticky left-0 bg-background z-10">TOTAL</TableCell>
                  {diasSemana.map((_, i) => <TableCell key={i} />)}
                  <TableCell className="text-center font-mono">{reporte.reduce((s, r) => s + r.diasTrabajados, 0)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono">{fmt$(reporte.reduce((s, r) => s + r.premio, 0))}</TableCell>
                  <TableCell className="text-right font-mono">{fmt$(reporte.reduce((s, r) => s + r.totalPagar, 0))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
