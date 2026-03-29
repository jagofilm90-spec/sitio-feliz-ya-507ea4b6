import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { hoyMexico } from "@/lib/generarContratoPDF";

interface Props {
  empleado: { id: string; nombre_completo: string; puesto: string; user_id: string | null; fecha_ingreso: string };
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

const CHECKLIST = ["Uniforme", "Llaves", "Herramienta", "Credencial/gafete", "Equipo de cómputo"];

export function ProcesoBaja({ empleado, open, onClose, onCompleted }: Props) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [entregados, setEntregados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggle = (item: string) => {
    const s = new Set(entregados);
    s.has(item) ? s.delete(item) : s.add(item);
    setEntregados(s);
  };

  const generarPDF = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const w = pdf.internal.pageSize.getWidth(), mL = 22, maxW = w - 44;
    let y = 20;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.text("ABARROTES LA MANITA, S.A. DE C.V.", w / 2, y, { align: "center" }); y += 6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(80);
    pdf.text("RFC: AMA 700701GI8 | Melchor Ocampo #59, CDMX", w / 2, y, { align: "center" }); y += 10;
    pdf.setTextColor(0);
    const titulo = motivo === "renuncia" ? "CARTA DE RENUNCIA VOLUNTARIA" : motivo === "despido" ? "CARTA DE DESPIDO" : "ACTA DE ABANDONO DE TRABAJO";
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
    pdf.text(titulo, w / 2, y, { align: "center" }); y += 10;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    const hoy = hoyMexico();
    const [hy, hm, hd] = hoy.split("-");
    const fechaFmt = `${hd}/${hm}/${hy}`;
    let texto = "";
    if (motivo === "renuncia") {
      texto = `Por medio de la presente, yo ${empleado.nombre_completo.toUpperCase()}, con puesto de ${empleado.puesto}, manifiesto mi voluntad de dar por terminada la relación laboral con ABARROTES LA MANITA, S.A. DE C.V., a partir del día ${fechaFmt}.\n\nAgradezco las oportunidades brindadas durante mi estancia en la empresa.`;
    } else if (motivo === "despido") {
      texto = `Por medio de la presente, se notifica al trabajador ${empleado.nombre_completo.toUpperCase()}, con puesto de ${empleado.puesto}, que a partir del día ${fechaFmt} queda rescindida su relación laboral con ABARROTES LA MANITA, S.A. DE C.V.\n\nMotivo: ${notas || "No especificado."}`;
    } else {
      texto = `Se hace constar que el trabajador ${empleado.nombre_completo.toUpperCase()}, con puesto de ${empleado.puesto}, ha dejado de presentarse a laborar sin justificación a partir del ${fechaFmt}, configurándose abandono de trabajo conforme al artículo 47 de la Ley Federal del Trabajo.`;
    }
    const lines = pdf.splitTextToSize(texto, maxW);
    for (const l of lines) { pdf.text(l, mL, y); y += 5; }
    y += 15;
    pdf.text("Entrega de materiales:", mL, y); y += 6;
    CHECKLIST.forEach(item => { pdf.text(`[${entregados.has(item) ? "X" : " "}] ${item}`, mL + 4, y); y += 5; });
    y += 15;
    pdf.line(mL, y, mL + 60, y); pdf.line(w - 22 - 60, y, w - 22, y); y += 4;
    pdf.setFontSize(8);
    pdf.text(motivo === "renuncia" ? "Firma del trabajador" : "Representante legal", mL + 30, y, { align: "center" });
    pdf.text(motivo === "renuncia" ? "Representante legal" : "Firma del trabajador", w - 22 - 30, y, { align: "center" });
    pdf.save(`Baja_${empleado.nombre_completo.replace(/\s+/g, "_")}.pdf`);
  };

  const handleConfirmar = async () => {
    if (!motivo) { toast({ title: "Selecciona motivo", variant: "destructive" }); return; }
    setLoading(true);
    try {
      // 1. Desactivar empleado
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?id=eq.${empleado.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" },
          body: JSON.stringify({ activo: false, fecha_baja: hoyMexico(), motivo_baja: motivo, notas_baja: notas || null }),
        });
      }
      // 2. Eliminar acceso
      if (empleado.user_id) {
        await supabase.functions.invoke("delete-user", { body: { userId: empleado.user_id } }).catch(() => {});
      }
      // 3. Desasignar vehículo
      if (empleado.puesto === "Chofer") {
        await supabase.from("vehiculos").update({ chofer_asignado_id: null } as any).eq("chofer_asignado_id", empleado.id);
      }
      // 4. Generar PDF
      generarPDF();
      toast({ title: "Baja procesada", description: `${empleado.nombre_completo} dado de baja por ${motivo}.` });
      onCompleted();
      onClose();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Dar de baja — {empleado.nombre_completo}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="renuncia">Renuncia voluntaria</SelectItem>
                <SelectItem value="despido">Despido</SelectItem>
                <SelectItem value="abandono">Abandono de trabajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas / motivo detallado</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} /></div>
          <div>
            <Label>Entrega de materiales</Label>
            <div className="space-y-1 mt-2">
              {CHECKLIST.map(item => (
                <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={entregados.has(item)} onChange={() => toggle(item)} />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmar} disabled={!motivo || loading}>
              {loading ? "Procesando..." : "Confirmar baja"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
