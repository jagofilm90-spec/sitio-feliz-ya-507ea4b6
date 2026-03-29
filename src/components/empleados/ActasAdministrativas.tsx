import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { Plus, Download } from "lucide-react";
import { hoyMexico } from "@/lib/generarContratoPDF";

interface Acta { id: string; tipo: string; descripcion: string; fecha: string; testigo_1: string | null; testigo_2: string | null; firmada: boolean; }
interface Props { empleadoId: string; empleadoNombre: string; empleadoPuesto: string; }

const TIPOS: Record<string, string> = { falta: "Falta injustificada", retardo: "Retardo", conducta: "Conducta inapropiada", otro: "Otro" };

export function ActasAdministrativas({ empleadoId, empleadoNombre, empleadoPuesto }: Props) {
  const { toast } = useToast();
  const [actas, setActas] = useState<Acta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "", descripcion: "", testigo_1: "", testigo_2: "" });
  const [loading, setLoading] = useState(false);

  const loadActas = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_actas?empleado_id=eq.${empleadoId}&select=*&order=fecha.desc`, {
      headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setActas(data);
  };

  useEffect(() => { loadActas(); }, [empleadoId]);

  const handleSave = async () => {
    if (!form.tipo || !form.descripcion) { toast({ title: "Campos requeridos", description: "Tipo y descripción son obligatorios.", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_actas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ empleado_id: empleadoId, tipo: form.tipo, descripcion: form.descripcion, fecha: hoyMexico(), testigo_1: form.testigo_1 || null, testigo_2: form.testigo_2 || null, created_by: session.user.id }),
      });
      toast({ title: "Acta guardada" });
      setForm({ tipo: "", descripcion: "", testigo_1: "", testigo_2: "" });
      setShowForm(false);
      await loadActas();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const generarPDF = (acta: Acta) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const w = pdf.internal.pageSize.getWidth(), mL = 22, mR = 22, maxW = w - mL - mR;
    let y = 20;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.text("ABARROTES LA MANITA, S.A. DE C.V.", w / 2, y, { align: "center" }); y += 6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(80);
    pdf.text("RFC: AMA 700701GI8 | Melchor Ocampo #59, CDMX", w / 2, y, { align: "center" }); y += 10;
    pdf.setTextColor(0); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
    pdf.text("ACTA ADMINISTRATIVA", w / 2, y, { align: "center" }); y += 10;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    const [ay, am, ad] = acta.fecha.split("-"); const fechaFmt = `${ad}/${am}/${ay}`;
    const lines = pdf.splitTextToSize(`En la Ciudad de México, a ${fechaFmt}, se levanta la presente acta administrativa al trabajador ${empleadoNombre.toUpperCase()}, quien se desempeña como ${empleadoPuesto.toUpperCase()}, por el siguiente motivo:`, maxW);
    for (const l of lines) { pdf.text(l, mL, y); y += 5; } y += 5;
    pdf.setFont("helvetica", "bold"); pdf.text(`Tipo: ${TIPOS[acta.tipo] || acta.tipo}`, mL, y); y += 8;
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(acta.descripcion, maxW);
    for (const l of descLines) { pdf.text(l, mL, y); y += 5; } y += 10;
    pdf.text("Se le hace saber que de reincidir podrá hacerse acreedor a sanciones mayores.", mL, y); y += 15;
    pdf.line(mL, y, mL + 60, y); pdf.line(w - mR - 60, y, w - mR, y); y += 4;
    pdf.setFontSize(8);
    pdf.text("Firma del trabajador", mL + 30, y, { align: "center" });
    pdf.text("Firma del representante", w - mR - 30, y, { align: "center" }); y += 12;
    if (acta.testigo_1 || acta.testigo_2) {
      pdf.line(mL, y, mL + 60, y); pdf.line(w - mR - 60, y, w - mR, y); y += 4;
      pdf.text(acta.testigo_1 || "Testigo 1", mL + 30, y, { align: "center" });
      pdf.text(acta.testigo_2 || "Testigo 2", w - mR - 30, y, { align: "center" });
    }
    pdf.save(`Acta_${empleadoNombre.replace(/\s+/g, "_")}_${acta.fecha}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{actas.length} acta{actas.length !== 1 ? "s" : ""} registrada{actas.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" />{showForm ? "Cancelar" : "Nueva acta"}</Button>
      </div>
      {showForm && (
        <div className="space-y-3 p-3 border rounded-md">
          <div><Label>Tipo *</Label><Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Descripción *</Label><Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></div>
          <div className="grid grid-cols-2 gap-2"><div><Label>Testigo 1</Label><Input value={form.testigo_1} onChange={e => setForm({ ...form, testigo_1: e.target.value })} /></div><div><Label>Testigo 2</Label><Input value={form.testigo_2} onChange={e => setForm({ ...form, testigo_2: e.target.value })} /></div></div>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar acta"}</Button>
        </div>
      )}
      {actas.length > 0 && (
        <div className="space-y-2">
          {actas.map(a => (
            <div key={a.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{TIPOS[a.tipo] || a.tipo}</Badge><span className="text-xs text-muted-foreground">{a.fecha.split("-").reverse().join("/")}</span></div>
                <p className="text-sm truncate mt-1">{a.descripcion}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => generarPDF(a)} title="Descargar PDF"><Download className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
