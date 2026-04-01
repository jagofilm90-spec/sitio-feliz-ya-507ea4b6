import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Palmtree, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Emp { id: string; nombre_completo: string; puesto: string; }

export function VacacionesMasivasDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [empleados, setEmpleados] = useState<Emp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMotivo(""); setFechaInicio(""); setFechaFin(""); setSelectAll(true);
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("empleados").select("id, nombre_completo, puesto").eq("activo", true).order("nombre_completo");
      const emps = (data || []) as Emp[];
      setEmpleados(emps);
      setSelected(new Set(emps.map(e => e.id)));
      setLoading(false);
    })();
  }, [open]);

  const dias = (() => {
    if (!fechaInicio || !fechaFin) return 0;
    const ini = new Date(fechaInicio + "T00:00:00");
    const fin = new Date(fechaFin + "T00:00:00");
    if (fin < ini) return 0;
    let count = 0;
    const d = new Date(ini);
    while (d <= fin) {
      if (d.getDay() !== 0) count++; // exclude Sundays only
      d.setDate(d.getDate() + 1);
    }
    return count;
  })();

  const toggleAll = () => {
    if (selectAll) { setSelected(new Set()); setSelectAll(false); }
    else { setSelected(new Set(empleados.map(e => e.id))); setSelectAll(true); }
  };

  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
    setSelectAll(s.size === empleados.length);
  };

  const handleGuardar = async () => {
    if (!motivo || !fechaInicio || !fechaFin || dias <= 0 || selected.size === 0) {
      toast({ title: "Completa todos los campos", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const h = { "Content-Type": "application/json", "apikey": KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" };

      const records = [...selected].map(empId => ({
        empleado_id: empId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias,
        status: "tomada",
        notas: motivo,
      }));

      // Insert in batches of 50
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const res = await fetch(`${API}/rest/v1/empleados_vacaciones`, { method: "POST", headers: h, body: JSON.stringify(batch) });
        if (!res.ok) throw new Error(await res.text());
      }

      toast({ title: "Vacaciones registradas", description: `${dias} días registrados para ${selected.size} empleados.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Palmtree className="h-5 w-5" />Vacaciones masivas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Motivo *</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Cierre por Semana Santa 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha inicio</Label><Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
            <div><Label>Fecha fin</Label><Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
          </div>
          {dias > 0 && <p className="text-sm font-medium">{dias} día{dias !== 1 ? "s" : ""} de vacaciones</p>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Aplicar a:</Label>
              <button className="text-xs text-primary hover:underline" onClick={toggleAll}>{selectAll ? "Deseleccionar todos" : "Seleccionar todos"}</button>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-2">
                {empleados.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleOne(emp.id)} />
                    <span className="truncate">{emp.nombre_completo}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{emp.puesto}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {dias > 0 && selected.size > 0 && (
            <div className="p-3 bg-muted/50 rounded-md text-sm">
              Se registrarán <strong>{dias} días</strong> de vacaciones ({fechaInicio.split("-").reverse().join("/")} — {fechaFin.split("-").reverse().join("/")}) a <strong>{selected.size} empleados</strong>.
              <br /><span className="text-xs text-muted-foreground">Los días se descontarán de sus vacaciones pendientes.</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={saving || dias <= 0 || !motivo || selected.size === 0}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : `Registrar para ${selected.size} empleados`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
