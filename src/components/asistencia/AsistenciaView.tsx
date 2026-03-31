import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Clock, UserCheck, UserX } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";

interface AsistenciaRow {
  id: string;
  zk_user_id: string;
  empleado_id: string | null;
  fecha: string | null;
  hora: string | null;
  tipo: string | null;
  fecha_hora: string;
}

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  activo: boolean;
  zk_id: string | null;
}

interface ResumenDia {
  empleado_id: string;
  nombre: string;
  puesto: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
  horas: string | null;
  retardo: boolean;
}

const HORA_ENTRADA = 8 * 60; // 8:00 AM in minutes

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${m}m`;
}

export function AsistenciaView() {
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split("T")[0]);
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>("todos");

  const loadData = async () => {
    setLoading(true);

    const { data: empData } = await (supabase as any)
      .from("empleados")
      .select("id, nombre_completo, puesto, activo, zk_id")
      .eq("activo", true)
      .order("nombre_completo");

    setEmpleados((empData || []) as Empleado[]);

    const { data: asistData } = await supabase
      .from("asistencia")
      .select("id, zk_user_id, empleado_id, fecha, hora, tipo, fecha_hora")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: true });

    setRegistros((asistData || []) as AsistenciaRow[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [fechaDesde, fechaHasta]);

  const empMap = useMemo(() => new Map(empleados.map(e => [e.id, e])), [empleados]);

  // Build daily summaries
  const resumen = useMemo(() => {
    const byDay = new Map<string, AsistenciaRow[]>();

    for (const r of registros) {
      if (!r.empleado_id || !r.fecha) continue;
      const key = `${r.empleado_id}|${r.fecha}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(r);
    }

    const rows: ResumenDia[] = [];
    for (const [key, recs] of byDay) {
      const [empId, fecha] = key.split("|");
      const emp = empMap.get(empId);
      if (!emp) continue;

      // Sort by hora
      const sorted = recs.sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
      const entrada = sorted[0]?.hora || null;
      const salida = sorted.length > 1 ? sorted[sorted.length - 1]?.hora || null : null;

      let horas: string | null = null;
      if (entrada && salida) {
        const mins = timeToMinutes(salida) - timeToMinutes(entrada);
        horas = mins > 0 ? formatHoras(mins) : null;
      }

      const retardo = entrada ? timeToMinutes(entrada) > HORA_ENTRADA : false;

      rows.push({ empleado_id: empId, nombre: emp.nombre_completo, puesto: emp.puesto, fecha, entrada, salida, horas, retardo });
    }

    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre));
  }, [registros, empMap]);

  // Today's presence
  const hoy = new Date().toISOString().split("T")[0];
  const presentesHoy = useMemo(() => {
    const ids = new Set<string>();
    for (const r of registros) {
      if (r.empleado_id && r.fecha === hoy) ids.add(r.empleado_id);
    }
    return ids;
  }, [registros, hoy]);

  const filtered = useMemo(() => {
    if (filtroEmpleado === "todos") return resumen;
    return resumen.filter(r => r.empleado_id === filtroEmpleado);
  }, [resumen, filtroEmpleado]);

  const empleadosConZk = empleados.filter(e => e.zk_id);

  return (
    <div className="space-y-4">
      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {empleadosConZk.map(emp => {
          const presente = presentesHoy.has(emp.id);
          return (
            <Badge
              key={emp.id}
              className={presente
                ? "bg-green-500/10 text-green-700 border-green-300"
                : "bg-red-500/10 text-red-700 border-red-300"
              }
            >
              {presente ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
              {emp.nombre_completo.split(" ")[0]}
              {presente ? " - Presente" : " - Ausente"}
            </Badge>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Empleado</label>
              <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {empleadosConZk.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registros de Asistencia
            <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No hay registros en el rango seleccionado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Retardo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={`${r.empleado_id}-${r.fecha}-${i}`}>
                    <TableCell className="font-medium">
                      <div>{r.nombre}</div>
                      <span className="text-xs text-muted-foreground">{r.puesto}</span>
                    </TableCell>
                    <TableCell>
                      {r.fecha ? format(parseISO(r.fecha), "EEE dd/MM", { locale: es }) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.entrada ? r.entrada.substring(0, 5) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.salida ? r.salida.substring(0, 5) : "-"}
                    </TableCell>
                    <TableCell>{r.horas || "-"}</TableCell>
                    <TableCell>
                      {r.retardo ? (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-300">
                          Retardo
                        </Badge>
                      ) : r.entrada ? (
                        <Badge className="bg-green-500/10 text-green-700 border-green-300">
                          A tiempo
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
