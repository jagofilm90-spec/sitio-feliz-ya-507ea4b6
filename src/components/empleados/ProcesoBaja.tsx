import { useState, useRef, useEffect } from "react";
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
const MOTIVO_LABEL: Record<string, string> = { renuncia: "renuncia voluntaria", despido: "despido", abandono: "abandono de trabajo" };

export function ProcesoBaja({ empleado, open, onClose, onCompleted }: Props) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [entregados, setEntregados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Firma states
  const [showFirma, setShowFirma] = useState(false);
  const [firmaStep, setFirmaStep] = useState<1 | 2>(1);
  const [firmaEmpleadoImg, setFirmaEmpleadoImg] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const toggle = (item: string) => {
    const s = new Set(entregados); s.has(item) ? s.delete(item) : s.add(item); setEntregados(s);
  };

  // Canvas
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect(); const sx = c.width / r.width, sy = c.height / r.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); isDrawing.current = true; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const { x, y } = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing.current) return; e.preventDefault(); const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const { x, y } = getPos(e); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000"; ctx.lineTo(x, y); ctx.stroke(); setHasSignature(true); };
  const stopDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => { const c = canvasRef.current; if (!c) return; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); setHasSignature(false); };

  useEffect(() => {
    if (!showFirma) return;
    const t = setTimeout(() => { const c = canvasRef.current; if (!c) return; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); const r = c.getBoundingClientRect(); if (r.width > 0) { c.width = r.width; c.height = r.height; } }, 100);
    return () => clearTimeout(t);
  }, [showFirma, firmaStep]);

  const handleContinuarFirma = () => {
    if (!motivo) { toast({ title: "Selecciona motivo", variant: "destructive" }); return; }
    setShowFirma(true); setFirmaStep(1); setHasSignature(false); setFirmaEmpleadoImg("");
  };

  const captureAndNext = () => {
    if (!hasSignature) return;
    setFirmaEmpleadoImg(canvasRef.current?.toDataURL("image/png") ?? "");
    setHasSignature(false); setFirmaStep(2);
  };

  const generarPDF = (firmaEmp: string, firmaRep: string): Blob => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const w = pdf.internal.pageSize.getWidth(), mL = 22, mR = 22, maxW = w - mL - mR;
    let y = 20;
    // Header formal C
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.text("ABARROTES LA MANITA, S.A. DE C.V.", w / 2, y, { align: "center" }); y += 6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(80);
    pdf.text("RFC: AMA 700701GI8  |  Melchor Ocampo #59, Magdalena Mixiuhca, C.P. 15850, Ciudad de México", w / 2, y, { align: "center" }); y += 4;
    pdf.setFont("helvetica", "italic"); pdf.setFontSize(7); pdf.setTextColor(130);
    pdf.text("Desde 1904 — Trabajando por un México mejor", w / 2, y, { align: "center" }); y += 3;
    pdf.setTextColor(0); pdf.setLineWidth(0.3); pdf.setDrawColor(150); pdf.line(mL, y, w - mR, y); pdf.setDrawColor(0); pdf.setLineWidth(0.2); y += 8;
    // Title
    const titulo = motivo === "renuncia" ? "CARTA DE RENUNCIA VOLUNTARIA" : motivo === "despido" ? "CARTA DE DESPIDO" : "ACTA DE ABANDONO DE TRABAJO";
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
    pdf.text(titulo, w / 2, y, { align: "center" }); y += 10;
    // Body
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    const hoy = hoyMexico(); const [hy, hm, hd] = hoy.split("-"); const fechaFmt = `${hd}/${hm}/${hy}`;
    let texto = "";
    if (motivo === "renuncia") texto = `Por medio de la presente, yo ${empleado.nombre_completo.toUpperCase()}, con puesto de ${empleado.puesto}, manifiesto mi voluntad de dar por terminada la relación laboral con ABARROTES LA MANITA, S.A. DE C.V., a partir del día ${fechaFmt}.\n\nAgradezco las oportunidades brindadas durante mi estancia en la empresa.`;
    else if (motivo === "despido") texto = `Por medio de la presente, se notifica al trabajador ${empleado.nombre_completo.toUpperCase()}, con puesto de ${empleado.puesto}, que a partir del día ${fechaFmt} queda rescindida su relación laboral con ABARROTES LA MANITA, S.A. DE C.V.\n\nMotivo: ${notas || "No especificado."}`;
    else texto = `Se hace constar que el trabajador ${empleado.nombre_completo.toUpperCase()}, con puesto de ${empleado.puesto}, ha dejado de presentarse a laborar sin justificación a partir del ${fechaFmt}, configurándose abandono de trabajo conforme al artículo 47 de la Ley Federal del Trabajo.`;
    for (const l of pdf.splitTextToSize(texto, maxW)) { pdf.text(l, mL, y); y += 5; }
    y += 10;
    // Checklist
    pdf.setFontSize(9); pdf.text("Entrega de materiales:", mL, y); y += 6;
    CHECKLIST.forEach(item => { pdf.text(`[${entregados.has(item) ? "X" : " "}] ${item}`, mL + 4, y); y += 5; });
    y += 10;
    // Signatures
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.text("TRABAJADOR", mL + maxW * 0.25, y, { align: "center" });
    pdf.text("REPRESENTANTE LEGAL", mL + maxW * 0.75, y, { align: "center" }); y += 3;
    if (firmaEmp === "NEGADO") {
      pdf.setTextColor(200, 0, 0); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
      pdf.text("SE NEGÓ A FIRMAR", mL + maxW * 0.25, y + 8, { align: "center" }); pdf.setTextColor(0);
    } else if (firmaEmp) { try { pdf.addImage(firmaEmp, "PNG", mL + maxW * 0.05, y, maxW * 0.35, 15); } catch {} }
    if (firmaRep) { try { pdf.addImage(firmaRep, "PNG", mL + maxW * 0.55, y, maxW * 0.35, 15); } catch {} }
    y += 15;
    pdf.line(mL, y, mL + maxW * 0.4, y); pdf.line(mL + maxW * 0.6, y, mL + maxW, y); y += 4;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text(empleado.nombre_completo, mL + maxW * 0.25, y, { align: "center" });
    pdf.text("JOSE ANTONIO GOMEZ ORTEGA", mL + maxW * 0.75, y, { align: "center" });
    return pdf.output("blob");
  };

  const handleFinalizar = async () => {
    if (!hasSignature) return;
    setLoading(true);
    try {
      const firmaRepImg = canvasRef.current?.toDataURL("image/png") ?? "";
      const pdfBlob = generarPDF(firmaEmpleadoImg, firmaRepImg);
      // Download
      const url = URL.createObjectURL(pdfBlob); const a = document.createElement("a"); a.href = url; a.download = `Baja_${empleado.nombre_completo.replace(/\s+/g, "_")}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      // Upload to storage
      await supabase.storage.from("empleados-documentos").upload(`${empleado.id}/baja_${motivo}_${hoyMexico()}.pdf`, pdfBlob, { contentType: "application/pdf", upsert: true }).catch(() => {});
      // Deactivate
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?id=eq.${empleado.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" },
          body: JSON.stringify({ activo: false, fecha_baja: hoyMexico(), motivo_baja: motivo, notas_baja: notas || null }),
        });
      }
      if (empleado.user_id) await supabase.functions.invoke("delete-user", { body: { userId: empleado.user_id } }).catch(() => {});
      if (empleado.puesto === "Chofer") await supabase.from("vehiculos").update({ chofer_asignado_id: null } as any).eq("chofer_asignado_id", empleado.id);
      toast({ title: "Baja procesada", description: `${empleado.nombre_completo} dado de baja por ${MOTIVO_LABEL[motivo] || motivo}.` });
      onCompleted(); onClose();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !loading) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {!showFirma ? (
          <>
            <DialogHeader><DialogTitle>Dar de baja — {empleado.nombre_completo}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Motivo *</Label>
                <Select value={motivo} onValueChange={setMotivo}><SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger><SelectContent>
                  <SelectItem value="renuncia">Renuncia voluntaria</SelectItem>
                  <SelectItem value="despido">Despido</SelectItem>
                  <SelectItem value="abandono">Abandono de trabajo</SelectItem>
                </SelectContent></Select>
              </div>
              <div><Label>Notas / motivo detallado</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} /></div>
              <div><Label>Entrega de materiales</Label>
                <div className="space-y-1 mt-2">{CHECKLIST.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={entregados.has(item)} onChange={() => toggle(item)} />{item}</label>
                ))}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button variant="destructive" onClick={handleContinuarFirma} disabled={!motivo}>Continuar a firma</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {firmaStep === 1 && (<>
              <DialogHeader><DialogTitle>Paso 1 de 2 — Firma del empleado</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground"><strong>{empleado.nombre_completo}</strong> firma de conformidad con su {MOTIVO_LABEL[motivo] || "baja"}.</p>
            </>)}
            {firmaStep === 2 && (<>
              <DialogHeader><DialogTitle>Paso 2 de 2 — Firma del representante legal</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground"><strong>José Antonio Gómez Ortega</strong> firma como representante de la empresa.</p>
            </>)}
            <div className="space-y-1 mt-2">
              <canvas ref={canvasRef} className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white touch-none" style={{ height: 200 }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
              <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>Limpiar</Button>
            </div>
            <div className="flex justify-between mt-2">
              {firmaStep === 1 ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowFirma(false)}>Volver</Button>
                  <Button variant="destructive" size="sm" onClick={() => { setFirmaEmpleadoImg("NEGADO"); setHasSignature(false); setFirmaStep(2); }}>Se negó a firmar</Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => { setHasSignature(false); setFirmaStep(1); }}>Volver</Button>
              )}
              {firmaStep === 1 ? (
                <Button onClick={captureAndNext} disabled={!hasSignature}>Siguiente</Button>
              ) : (
                <Button variant="destructive" onClick={handleFinalizar} disabled={!hasSignature || loading}>{loading ? "Procesando..." : "Firmar y finalizar"}</Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
