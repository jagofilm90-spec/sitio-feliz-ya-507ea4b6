import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { hoyMexico } from "@/lib/generarContratoPDF";
import { Plus, Check, X } from "lucide-react";

interface Vacacion { id: string; fecha_inicio: string; fecha_fin: string; dias: number; status: string; notas: string | null; }
interface Props { empleadoId: string; empleadoNombre: string; fechaIngreso: string; isAdmin: boolean; }

function diasPorLey(anos: number): number {
  if (anos < 1) return 0;
  if (anos === 1) return 12;
  if (anos === 2) return 14;
  if (anos === 3) return 16;
  if (anos === 4) return 18;
  if (anos === 5) return 20;
  if (anos <= 10) return 22;
  if (anos <= 15) return 24;
  if (anos <= 20) return 26;
  if (anos <= 25) return 28;
  if (anos <= 30) return 30;
  return 32;
}

export function VacacionesEmpleado({ empleadoId, empleadoNombre, fechaIngreso, isAdmin }: Props) {
  const { toast } = useToast();
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", notas: "" });
  const [loading, setLoading] = useState(false);

  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const [iy, im, id] = fechaIngreso.split("-").map(Number);
  const ingreso = new Date(iy, im - 1, id);
  const anosAntig = Math.floor((hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const diasCorresponden = diasPorLey(anosAntig);
  const diasTomados = vacaciones.filter(v => v.status === "aprobada" || v.status === "tomada").reduce((s, v) => s + v.dias, 0);
  const diasPendientes = diasCorresponden - diasTomados;

  const loadVacaciones = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_vacaciones?empleado_id=eq.${empleadoId}&select=*&order=fecha_inicio.desc`, {
      headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setVacaciones(data);
  };

  useEffect(() => { loadVacaciones(); }, [empleadoId]);

  const calcDias = () => {
    if (!form.fecha_inicio || !form.fecha_fin) return 0;
    const ini = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    return Math.max(0, Math.ceil((fin.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSolicitar = async () => {
    const dias = calcDias();
    if (dias <= 0) { toast({ title: "Fechas inválidas", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_vacaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ empleado_id: empleadoId, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin, dias, notas: form.notas || null }),
      });
      toast({ title: "Solicitud enviada" });
      setForm({ fecha_inicio: "", fecha_fin: "", notas: "" });
      setShowForm(false);
      await loadVacaciones();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleAction = async (vacId: string, status: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_vacaciones?id=eq.${vacId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" },
      body: JSON.stringify({ status, aprobada_por: session.user.id }),
    });
    toast({ title: status === "aprobada" ? "Aprobada" : "Rechazada" });
    await loadVacaciones();
  };

  const statusColor: Record<string, string> = { pendiente: "bg-yellow-100 text-yellow-800", aprobada: "bg-green-100 text-green-800", rechazada: "bg-red-100 text-red-800", tomada: "bg-blue-100 text-blue-800" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-md bg-muted/50"><p className="text-xs text-muted-foreground">Corresponden</p><p className="text-lg font-bold">{diasCorresponden}</p><p className="text-xs text-muted-foreground">{anosAntig} año{anosAntig !== 1 ? "s" : ""} antig.</p></div>
        <div className="p-3 rounded-md bg-muted/50"><p className="text-xs text-muted-foreground">Tomados</p><p className="text-lg font-bold">{diasTomados}</p></div>
        <div className={`p-3 rounded-md ${diasPendientes > 0 ? "bg-green-50" : "bg-muted/50"}`}><p className="text-xs text-muted-foreground">Pendientes</p><p className="text-lg font-bold">{diasPendientes}</p></div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Solicitudes</p>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" />{showForm ? "Cancelar" : "Solicitar"}</Button>
      </div>

      {showForm && (
        <div className="space-y-3 p-3 border rounded-md">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Inicio</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
            <div><Label>Fin</Label><Input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
          </div>
          {calcDias() > 0 && <p className="text-sm">Días solicitados: <strong>{calcDias()}</strong></p>}
          <div><Label>Notas</Label><Input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
          <Button onClick={handleSolicitar} disabled={loading || calcDias() <= 0}>{loading ? "Enviando..." : "Enviar solicitud"}</Button>
        </div>
      )}

      {vacaciones.length > 0 && (
        <div className="space-y-2">
          {vacaciones.map(v => (
            <div key={v.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{v.fecha_inicio.split("-").reverse().join("/")} — {v.fecha_fin.split("-").reverse().join("/")}</span>
                  <Badge className={`text-xs ${statusColor[v.status] || ""}`}>{v.status}</Badge>
                  <span className="text-xs text-muted-foreground">{v.dias} día{v.dias !== 1 ? "s" : ""}</span>
                </div>
                {v.notas && <p className="text-xs text-muted-foreground mt-1">{v.notas}</p>}
              </div>
              {isAdmin && v.status === "pendiente" && (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="text-green-600 h-7" onClick={() => handleAction(v.id, "aprobada")}><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={() => handleAction(v.id, "rechazada")}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
