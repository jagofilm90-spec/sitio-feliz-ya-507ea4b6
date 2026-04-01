import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";
import { format, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";

interface AsistenciaRow { id: string; zk_user_id: string; empleado_id: string | null; fecha: string | null; hora: string | null; tipo: string | null; fecha_hora: string; }
interface Empleado { id: string; nombre_completo: string; puesto: string; activo: boolean; foto_url: string | null; }

function formatTime12(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function getInitials(name: string): string { return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(); }

const AREAS = [
  { label: "ALMACÉN", puestos: ["Almacenista", "Gerente de Almacén"] },
  { label: "CHOFERES", puestos: ["Chofer"] },
  { label: "AYUDANTES", puestos: ["Ayudante de Chofer"] },
  { label: "OFICINA", puestos: ["Secretaria", "Vendedor", "Contadora"] },
];
const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];

export function AsistenciaView() {
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [mappedIds, setMappedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const horaActual = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" })).getHours();

  useEffect(() => {
    (async () => {
      const ws = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const [{ data: e }, { data: a }, { data: m }] = await Promise.all([
        (supabase as any).from("empleados").select("id,nombre_completo,puesto,activo,foto_url").eq("activo", true).order("nombre_completo"),
        supabase.from("asistencia").select("id,zk_user_id,empleado_id,fecha,hora,tipo,fecha_hora").gte("fecha", ws).lte("fecha", hoy).order("hora", { ascending: true }),
        (supabase as any).from("zk_mapeo").select("empleado_id"),
      ]);
      setEmpleados((e || []) as Empleado[]);
      setRegistros((a || []) as AsistenciaRow[]);
      setMappedIds(new Set((m || []).map((x: any) => x.empleado_id)));
      setLoading(false);
    })();
  }, []);

  const datosHoy = useMemo(() => {
    const r = new Map<string, { entrada: string | null; salida: string | null }>();
    for (const x of registros) { if (!x.empleado_id || x.fecha !== hoy) continue; if (!r.has(x.empleado_id)) r.set(x.empleado_id, { entrada: x.hora, salida: null }); else r.get(x.empleado_id)!.salida = x.hora; }
    return r;
  }, [registros, hoy]);

  const historial = useMemo(() => {
    if (!selectedEmpleado) return [];
    const days = eachDayOfInterval({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() });
    return days.map(d => { const ds = format(d, "yyyy-MM-dd"); const rs = registros.filter(r => r.empleado_id === selectedEmpleado.id && r.fecha === ds).sort((a, b) => (a.hora || "").localeCompare(b.hora || "")); return { fecha: ds, dia: format(d, "EEEE", { locale: es }), entrada: rs[0]?.hora || null, salida: rs.length > 1 ? rs[rs.length - 1]?.hora || null : null }; });
  }, [selectedEmpleado, registros]);

  const empsZk = empleados.filter(e => mappedIds.has(e.id));
  const presCount = empsZk.filter(e => datosHoy.has(e.id)).length;
  const getStatus = (e: Empleado) => { const d = datosHoy.get(e.id); if (!d) return horaActual >= 9 ? "ausente" : "no_llegado"; return d.salida ? "salio" : "trabajando"; };
  const sCfg: Record<string, { label: string; cls: string }> = { trabajando: { label: "Trabajando", cls: "bg-green-100 text-green-700 border-green-300" }, salio: { label: "Salió", cls: "bg-blue-100 text-blue-700 border-blue-300" }, no_llegado: { label: "No ha llegado", cls: "bg-gray-100 text-gray-600 border-gray-300" }, ausente: { label: "Ausente", cls: "bg-red-100 text-red-700 border-red-300" } };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Badge variant="secondary" className="text-sm px-3 py-1"><Users className="h-4 w-4 mr-1.5" />{presCount} de {empsZk.length} presentes</Badge>

      {AREAS.map(area => {
        const ae = empsZk.filter(e => area.puestos.includes(e.puesto));
        if (!ae.length) return null;
        return (
          <div key={area.label}>
            <div className="flex items-center gap-2 mb-2"><h3 className="text-sm font-bold text-muted-foreground tracking-wide">{area.label}</h3><Badge variant="outline" className="text-xs">{ae.filter(e => datosHoy.has(e.id)).length}/{ae.length}</Badge></div>
            <div className="space-y-1">
              {ae.map(emp => { const d = datosHoy.get(emp.id); const s = getStatus(emp); const c = sCfg[s]; return (
                <div key={emp.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedEmpleado(emp)}>
                  <Avatar className="h-10 w-10 shrink-0">{emp.foto_url ? <AvatarImage src={emp.foto_url} /> : null}<AvatarFallback style={{ backgroundColor: getColor(emp.nombre_completo) }} className="text-white text-sm font-bold">{getInitials(emp.nombre_completo)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{emp.nombre_completo}</p></div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{d ? `${formatTime12(d.entrada)}${d.salida ? ` → ${formatTime12(d.salida)}` : ""}` : "—"}</span>
                  <Badge variant="outline" className={`text-xs shrink-0 ${c.cls}`}>{c.label}</Badge>
                </div>); })}
            </div>
          </div>);
      })}

      {horaActual >= 9 && (() => { const aus = empsZk.filter(e => !datosHoy.has(e.id)); if (!aus.length) return null; return (
        <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-red-600">AUSENTES HOY ({aus.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">{aus.map(e => (
            <div key={e.id} className="flex items-center gap-3 p-1"><Avatar className="h-8 w-8">{e.foto_url ? <AvatarImage src={e.foto_url} /> : null}<AvatarFallback style={{ backgroundColor: getColor(e.nombre_completo) }} className="text-white text-xs font-bold">{getInitials(e.nombre_completo)}</AvatarFallback></Avatar><span className="text-sm">{e.nombre_completo}</span><span className="text-xs text-muted-foreground">— {e.puesto}</span></div>
          ))}</CardContent></Card>); })()}

      <Dialog open={!!selectedEmpleado} onOpenChange={o => !o && setSelectedEmpleado(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar className="h-10 w-10">{selectedEmpleado?.foto_url ? <AvatarImage src={selectedEmpleado.foto_url} /> : null}<AvatarFallback>{selectedEmpleado ? getInitials(selectedEmpleado.nombre_completo) : ""}</AvatarFallback></Avatar><div><p>{selectedEmpleado?.nombre_completo}</p><p className="text-sm font-normal text-muted-foreground">{selectedEmpleado?.puesto}</p></div></DialogTitle></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Día</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead></TableRow></TableHeader><TableBody>{historial.map(r => (<TableRow key={r.fecha}><TableCell className="capitalize">{r.dia}</TableCell><TableCell className="font-mono text-sm">{r.entrada ? formatTime12(r.entrada) : "—"}</TableCell><TableCell className="font-mono text-sm">{r.salida ? formatTime12(r.salida) : "—"}</TableCell></TableRow>))}</TableBody></Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
