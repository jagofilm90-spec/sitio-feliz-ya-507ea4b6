import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Palmtree, PenLine } from "lucide-react";
import { format, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";

interface AsistenciaRow { id: string; zk_user_id: string; empleado_id: string | null; fecha: string | null; hora: string | null; tipo: string | null; fecha_hora: string; dispositivo: string; }
interface Empleado { id: string; nombre_completo: string; puesto: string; activo: boolean; foto_url: string | null; }

function formatTime12(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function getInitials(name: string): string { return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(); }
function getCurrentMxTime(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const AREAS = [
  { label: "ALMACÉN", puestos: ["Almacenista", "Gerente de Almacén"] },
  { label: "CHOFERES", puestos: ["Chofer"] },
  { label: "AYUDANTES", puestos: ["Ayudante de Chofer"] },
  { label: "OFICINA", puestos: ["Secretaria", "Vendedor", "Contadora"] },
];
const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];

const MOTIVOS_MANUAL = [
  { value: "olvido_checar", label: "Olvidó checar" },
  { value: "falla_equipo", label: "Falla en equipo" },
  { value: "otro", label: "Otro" },
];

export function AsistenciaView() {
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [mappedIds, setMappedIds] = useState<Set<string>>(new Set());
  const [cierreMotivo, setCierreMotivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  // Manual entry dialog
  const [manualEmpleado, setManualEmpleado] = useState<Empleado | null>(null);
  const [manualHora, setManualHora] = useState("");
  const [manualMotivo, setManualMotivo] = useState("olvido_checar");
  const [manualSaving, setManualSaving] = useState(false);

  const { isAdmin, isGerenteAlmacen } = useUserRoles();
  const canRegisterManual = isAdmin || isGerenteAlmacen;

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const horaActual = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" })).getHours();

  const fetchData = useCallback(async () => {
    const ws = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const [{ data: e }, { data: a }, { data: m }] = await Promise.all([
      (supabase as any).from("empleados").select("id,nombre_completo,puesto,activo,foto_url").eq("activo", true).order("nombre_completo"),
      supabase.from("asistencia").select("id,zk_user_id,empleado_id,fecha,hora,tipo,fecha_hora,dispositivo").gte("fecha", ws).lte("fecha", hoy).order("hora", { ascending: true }),
      (supabase as any).from("zk_mapeo").select("empleado_id"),
    ]);
    setEmpleados((e || []) as Empleado[]);
    setRegistros((a || []) as AsistenciaRow[]);
    setMappedIds(new Set((m || []).map((x: any) => x.empleado_id)));
    const { data: vacHoy } = await (supabase as any).from("empleados_vacaciones").select("empleado_id, notas").eq("status", "tomada").lte("fecha_inicio", hoy).gte("fecha_fin", hoy);
    if (vacHoy && vacHoy.length > 0) {
      const activeCount = (e || []).length;
      const vacCount = new Set(vacHoy.map((v: any) => v.empleado_id)).size;
      if (vacCount >= activeCount * 0.7) {
        const motivos = vacHoy.map((v: any) => v.notas).filter(Boolean);
        const moda = motivos.sort((a: string, b: string) => motivos.filter((v: string) => v === b).length - motivos.filter((v: string) => v === a).length)[0];
        setCierreMotivo(moda || "Cierre de empresa");
      }
    }
    setLoading(false);
  }, [hoy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Set of empleado_ids that have at least one manual record today
  const manualesHoy = useMemo(() => {
    const s = new Set<string>();
    for (const r of registros) {
      if (r.fecha === hoy && r.dispositivo === "manual" && r.empleado_id) s.add(r.empleado_id);
    }
    return s;
  }, [registros, hoy]);

  // For weekly report: map fecha+empleado_id -> isManual
  const manualesSemana = useMemo(() => {
    const s = new Set<string>();
    for (const r of registros) {
      if (r.dispositivo === "manual" && r.empleado_id && r.fecha) s.add(`${r.fecha}:${r.empleado_id}`);
    }
    return s;
  }, [registros]);

  const datosHoy = useMemo(() => {
    const r = new Map<string, { entrada: string | null; salida: string | null }>();
    for (const x of registros) { if (!x.empleado_id || x.fecha !== hoy) continue; if (!r.has(x.empleado_id)) r.set(x.empleado_id, { entrada: x.hora, salida: null }); else r.get(x.empleado_id)!.salida = x.hora; }
    return r;
  }, [registros, hoy]);

  const historial = useMemo(() => {
    if (!selectedEmpleado) return [];
    const days = eachDayOfInterval({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() });
    return days.map(d => {
      const ds = format(d, "yyyy-MM-dd");
      const rs = registros.filter(r => r.empleado_id === selectedEmpleado.id && r.fecha === ds).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
      const isManual = manualesSemana.has(`${ds}:${selectedEmpleado.id}`);
      return { fecha: ds, dia: format(d, "EEEE", { locale: es }), entrada: rs[0]?.hora || null, salida: rs.length > 1 ? rs[rs.length - 1]?.hora || null : null, isManual };
    });
  }, [selectedEmpleado, registros, manualesSemana]);

  const empsZk = empleados.filter(e => mappedIds.has(e.id));
  const presCount = empsZk.filter(e => datosHoy.has(e.id)).length;
  const getStatus = (e: Empleado) => { const d = datosHoy.get(e.id); if (!d) return (cierreMotivo || horaActual < 9) ? "no_llegado" : "ausente"; return d.salida ? "salio" : "trabajando"; };
  const sCfg: Record<string, { label: string; cls: string }> = { trabajando: { label: "Trabajando", cls: "bg-green-100 text-green-700 border-green-300" }, salio: { label: "Salió", cls: "bg-blue-100 text-blue-700 border-blue-300" }, no_llegado: { label: "No ha llegado", cls: "bg-gray-100 text-gray-600 border-gray-300" }, ausente: { label: "Ausente", cls: "bg-red-100 text-red-700 border-red-300" } };

  const openManualDialog = (emp: Empleado, e: React.MouseEvent) => {
    e.stopPropagation();
    setManualEmpleado(emp);
    setManualHora(getCurrentMxTime());
    setManualMotivo("olvido_checar");
  };

  const handleManualSave = async () => {
    if (!manualEmpleado || !manualHora) return;
    setManualSaving(true);
    try {
      const fechaHora = `${hoy}T${manualHora}:00`;
      const motivoLabel = MOTIVOS_MANUAL.find(m => m.value === manualMotivo)?.label || manualMotivo;
      const { error } = await supabase.from("asistencia").insert({
        empleado_id: manualEmpleado.id,
        fecha: hoy,
        hora: manualHora,
        tipo: `entrada_manual:${motivoLabel}`,
        dispositivo: "manual",
        zk_user_id: "MANUAL",
        fecha_hora: fechaHora,
      });
      if (error) throw error;
      toast.success(`Entrada manual registrada para ${manualEmpleado.nombre_completo}`);
      setManualEmpleado(null);
      await fetchData();
    } catch (err: any) {
      toast.error("Error al registrar: " + (err.message || "Intente de nuevo"));
    } finally {
      setManualSaving(false);
    }
  };

  if (loading) return <AlmasaLoading size={48} />;

  return (
    <div className="space-y-6">
      {cierreMotivo && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center gap-2">
          <Palmtree className="h-5 w-5 shrink-0" />
          La empresa está cerrada hoy: {cierreMotivo}
        </div>
      )}
      <Badge variant="secondary" className="text-sm px-3 py-1"><Users className="h-4 w-4 mr-1.5" />{presCount} de {empsZk.length} presentes</Badge>

      {AREAS.map(area => {
        const ae = empsZk.filter(e => area.puestos.includes(e.puesto));
        if (!ae.length) return null;
        return (
          <div key={area.label}>
            <div className="flex items-center gap-2 mb-2"><h3 className="text-sm font-bold text-muted-foreground tracking-wide">{area.label}</h3><Badge variant="outline" className="text-xs">{ae.filter(e => datosHoy.has(e.id)).length}/{ae.length}</Badge></div>
            <div className="space-y-1">
              {ae.map(emp => { const d = datosHoy.get(emp.id); const s = getStatus(emp); const c = sCfg[s]; const isManual = manualesHoy.has(emp.id); return (
                <div key={emp.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedEmpleado(emp)}>
                  <Avatar className="h-10 w-10 shrink-0">{emp.foto_url ? <AvatarImage src={emp.foto_url} /> : null}<AvatarFallback style={{ backgroundColor: getColor(emp.nombre_completo) }} className="text-white text-sm font-bold">{getInitials(emp.nombre_completo)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{emp.nombre_completo}</p></div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{d ? `${formatTime12(d.entrada)}${d.salida ? ` → ${formatTime12(d.salida)}` : ""}` : "—"}</span>
                  <Badge variant="outline" className={`text-xs shrink-0 ${c.cls}`}>{c.label}</Badge>
                  {isManual && <Badge variant="outline" className="text-xs shrink-0 bg-orange-50 text-orange-600 border-orange-300">Manual</Badge>}
                  {canRegisterManual && (s === "no_llegado" || s === "ausente") && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => openManualDialog(emp, e)}>
                      <PenLine className="h-3.5 w-3.5 mr-1" />Registrar
                    </Button>
                  )}
                </div>); })}
            </div>
          </div>);
      })}

      {horaActual >= 9 && (() => { const aus = empsZk.filter(e => !datosHoy.has(e.id)); if (!aus.length) return null; return (
        <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-red-600">AUSENTES HOY ({aus.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">{aus.map(e => (
            <div key={e.id} className="flex items-center gap-3 p-1">
              <Avatar className="h-8 w-8">{e.foto_url ? <AvatarImage src={e.foto_url} /> : null}<AvatarFallback style={{ backgroundColor: getColor(e.nombre_completo) }} className="text-white text-xs font-bold">{getInitials(e.nombre_completo)}</AvatarFallback></Avatar>
              <span className="text-sm">{e.nombre_completo}</span>
              <span className="text-xs text-muted-foreground">— {e.puesto}</span>
              {canRegisterManual && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-auto text-muted-foreground hover:text-foreground" onClick={(ev) => openManualDialog(e, ev)}>
                  <PenLine className="h-3.5 w-3.5 mr-1" />Registrar
                </Button>
              )}
            </div>
          ))}</CardContent></Card>); })()}

      {/* Weekly detail dialog */}
      <Dialog open={!!selectedEmpleado} onOpenChange={o => !o && setSelectedEmpleado(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar className="h-10 w-10">{selectedEmpleado?.foto_url ? <AvatarImage src={selectedEmpleado.foto_url} /> : null}<AvatarFallback>{selectedEmpleado ? getInitials(selectedEmpleado.nombre_completo) : ""}</AvatarFallback></Avatar><div><p>{selectedEmpleado?.nombre_completo}</p><p className="text-sm font-normal text-muted-foreground">{selectedEmpleado?.puesto}</p></div></DialogTitle></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Día</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead></TableRow></TableHeader>
            <TableBody>{historial.map(r => (
              <TableRow key={r.fecha}>
                <TableCell className="capitalize">{r.dia}</TableCell>
                <TableCell className="font-mono text-sm">
                  {r.entrada ? formatTime12(r.entrada) : "—"}
                  {r.isManual && r.entrada && <span className="text-orange-500 ml-0.5" title="Registro manual">*</span>}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {r.salida ? formatTime12(r.salida) : "—"}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          {historial.some(r => r.isManual) && (
            <p className="text-xs text-muted-foreground mt-1"><span className="text-orange-500">*</span> Registro manual</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual entry dialog */}
      <Dialog open={!!manualEmpleado} onOpenChange={o => !o && setManualEmpleado(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar entrada manual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Empleado</Label>
              <p className="text-sm font-medium">{manualEmpleado?.nombre_completo}</p>
              <p className="text-xs text-muted-foreground">{manualEmpleado?.puesto}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-hora">Hora de entrada</Label>
              <Input id="manual-hora" type="time" value={manualHora} onChange={e => setManualHora(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={manualMotivo} onValueChange={setManualMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_MANUAL.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleManualSave} disabled={manualSaving || !manualHora}>
              {manualSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
