import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Clock, Users } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
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
  foto_url: string | null;
}

function formatTime12(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export function AsistenciaView() {
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [mappedIds, setMappedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

  const loadData = async () => {
    setLoading(true);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    // Load mapped employee IDs from zk_mapeo via fetch
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const h = { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` };
      const mapRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/zk_mapeo?select=empleado_id`, { headers: h });
      const mapData = await mapRes.json();
      if (Array.isArray(mapData)) setMappedIds(new Set(mapData.map((m: any) => m.empleado_id)));
    }

    const [{ data: empData }, { data: asistData }, { data: mapeoData }] = await Promise.all([
      (supabase as any)
        .from("empleados")
        .select("id, nombre_completo, puesto, activo, foto_url")
        .eq("activo", true)
        .order("nombre_completo"),
      supabase
        .from("asistencia")
        .select("id, zk_user_id, empleado_id, fecha, hora, tipo, fecha_hora")
        .gte("fecha", weekStartStr)
        .lte("fecha", hoy)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: true }),
      (supabase as any)
        .from("zk_mapeo")
        .select("empleado_id"),
    ]);

    setEmpleados((empData || []) as Empleado[]);
    setRegistros((asistData || []) as AsistenciaRow[]);
    setMappedIds(new Set((mapeoData || []).map((m: any) => m.empleado_id)));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Map: empleado_id → { entrada, salida }
  const registrosHoy = useMemo(() => {
    const map = new Map<string, { entrada: string; salida: string | null }>();
    for (const r of registros) {
      if (!r.empleado_id || r.fecha !== hoy) continue;
      const existing = map.get(r.empleado_id);
      if (!existing) {
        map.set(r.empleado_id, { entrada: r.hora || "", salida: null });
      } else {
        // Update salida to latest record
        existing.salida = r.hora || "";
      }
    }
    return map;
  }, [registros, hoy]);

  const horaLimite = 9; // 9:00 AM
  const horaActual = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City", hour: "numeric", hour12: false });
  const pasadaHoraLimite = parseInt(horaActual) >= horaLimite;

  // Weekly history for selected employee
  const historialSemana = useMemo(() => {
    if (!selectedEmpleado) return [];
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: now > weekEnd ? weekEnd : now });

    return days.map(day => {
      const dateStr = day.toISOString().split("T")[0];
      const dayRecords = registros
        .filter(r => r.empleado_id === selectedEmpleado.id && r.fecha === dateStr)
        .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

      const entrada = dayRecords[0]?.hora || null;
      const salida = dayRecords.length > 1 ? dayRecords[dayRecords.length - 1]?.hora || null : null;

      return { fecha: dateStr, dia: format(day, "EEEE", { locale: es }), entrada, salida };
    });
  }, [selectedEmpleado, registros]);

  const empleadosConZk = empleados.filter(e => mappedIds.has(e.id));
  const presenteCount = empleadosConZk.filter(e => registrosHoy.has(e.id)).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="h-4 w-4 mr-1.5" />
          {presenteCount} de {empleadosConZk.length} presentes
        </Badge>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {empleadosConZk.map(emp => {
          const horaEntrada = presentesHoy.get(emp.id);
          const presente = horaEntrada !== undefined;

          return (
            <Card
              key={emp.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                presente
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                  : "border-border bg-muted/30"
              }`}
              onClick={() => setSelectedEmpleado(emp)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Avatar className="h-16 w-16">
                  {emp.foto_url ? (
                    <AvatarImage src={emp.foto_url} alt={emp.nombre_completo} />
                  ) : null}
                  <AvatarFallback className={`text-lg font-bold ${
                    presente 
                      ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {getInitials(emp.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm leading-tight">{emp.nombre_completo.split(" ").slice(0, 2).join(" ")}</p>
                  <p className="text-xs text-muted-foreground">{emp.puesto}</p>
                </div>
                {presente ? (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime12(horaEntrada)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs text-muted-foreground">
                    Sin registro
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Absent list */}
      {empleadosConZk.some(e => !presentesHoy.has(e.id)) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              No han llegado hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {empleadosConZk.filter(e => !presentesHoy.has(e.id)).map(emp => (
              <Badge key={emp.id} variant="outline" className="text-xs">
                {emp.nombre_completo.split(" ").slice(0, 2).join(" ")}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weekly history dialog */}
      <Dialog open={!!selectedEmpleado} onOpenChange={(open) => !open && setSelectedEmpleado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {selectedEmpleado?.foto_url ? (
                  <AvatarImage src={selectedEmpleado.foto_url} alt={selectedEmpleado.nombre_completo} />
                ) : null}
                <AvatarFallback>{selectedEmpleado ? getInitials(selectedEmpleado.nombre_completo) : ""}</AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedEmpleado?.nombre_completo}</p>
                <p className="text-sm font-normal text-muted-foreground">{selectedEmpleado?.puesto}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Día</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historialSemana.map(row => (
                <TableRow key={row.fecha}>
                  <TableCell className="capitalize">{row.dia}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {row.entrada ? formatTime12(row.entrada) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {row.salida ? formatTime12(row.salida) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
