import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { Plus, Download } from "lucide-react";
import { hoyMexico } from "@/lib/generarContratoPDF";

interface Acta { id: string; tipo: string; descripcion: string; fecha: string; testigo_1: string | null; testigo_2: string | null; firmada: boolean; }
interface Props { empleadoId: string; empleadoNombre: string; empleadoPuesto: string; empleadoEmail?: string | null; }

const TIPOS: Record<string, string> = { falta: "Falta injustificada", retardo: "Retardo", conducta: "Conducta inapropiada", otro: "Otro" };

export function ActasAdministrativas({ empleadoId, empleadoNombre, empleadoPuesto, empleadoEmail }: Props) {
  const { toast } = useToast();
  const [actas, setActas] = useState<Acta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: "", descripcion: "", testigo_1: "", testigo_2: "" });
  const [loading, setLoading] = useState(false);
  const [showFirma, setShowFirma] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

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

  // Canvas drawing
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); isDrawing.current = true;
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const { x, y } = getPos(e); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return; e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000";
    ctx.lineTo(x, y); ctx.stroke(); setHasSignature(true);
  };
  const stopDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height); setHasSignature(false);
  };
  useEffect(() => {
    if (!showFirma) return;
    const t = setTimeout(() => {
      const c = canvasRef.current; if (!c) return;
      const r = c.getBoundingClientRect();
      if (r.width > 0) { c.width = r.width; c.height = r.height; }
    }, 100);
    return () => clearTimeout(t);
  }, [showFirma]);

  const handleOpenFirma = () => {
    if (!form.tipo || !form.descripcion) { toast({ title: "Campos requeridos", description: "Tipo y descripción son obligatorios.", variant: "destructive" }); return; }
    setShowFirma(true);
    setHasSignature(false);
  };

  const handleFirmarYGuardar = async () => {
    if (!hasSignature) return;
    setLoading(true);
    try {
      const firmaImg = canvasRef.current?.toDataURL("image/png") ?? "";
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const fecha = hoyMexico();

      // Insert acta
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_actas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ empleado_id: empleadoId, tipo: form.tipo, descripcion: form.descripcion, fecha, testigo_1: form.testigo_1 || null, testigo_2: form.testigo_2 || null, firmada: true, created_by: session.user.id }),
      });

      // Generate PDF with signature
      const pdfBlob = generarPDFConFirma({ tipo: form.tipo, descripcion: form.descripcion, fecha, testigo_1: form.testigo_1, testigo_2: form.testigo_2 }, firmaImg);

      // Save + download
      const link = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a"); a.href = link; a.download = `Acta_${empleadoNombre.replace(/\s+/g, "_")}_${fecha}.pdf`; a.click(); URL.revokeObjectURL(link);

      // Upload to storage
      await supabase.storage.from("empleados-documentos").upload(`${empleadoId}/acta_${form.tipo}_${fecha}.pdf`, pdfBlob, { contentType: "application/pdf", upsert: true }).catch(() => {});

      // Email
      if (empleadoEmail) {
        const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res((r.result as string).split(",")[1]); r.readAsDataURL(pdfBlob); });
        await supabase.functions.invoke("gmail-api", {
          body: { action: "send", email: "1904@almasa.com.mx", to: empleadoEmail, subject: `Acta administrativa — ${TIPOS[form.tipo] || form.tipo} — ALMASA`, body: `<p>Estimado/a ${empleadoNombre}, se adjunta el acta administrativa levantada el día ${fecha.split("-").reverse().join("/")}.</p><p style="color:#888">Abarrotes La Manita, S.A. de C.V.</p>`, attachments: [{ filename: `Acta_${form.tipo}_${fecha}.pdf`, content: b64, mimeType: "application/pdf" }] },
        }).catch(() => {});
      }

      toast({ title: "Acta firmada y guardada" });
      setForm({ tipo: "", descripcion: "", testigo_1: "", testigo_2: "" });
      setShowForm(false);
      setShowFirma(false);
      await loadActas();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const generarPDFConFirma = (acta: { tipo: string; descripcion: string; fecha: string; testigo_1: string; testigo_2: string }, firmaImg?: string): Blob => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const w = pdf.internal.pageSize.getWidth(), mL = 22, mR = 22, maxW = w - mL - mR;
    let y = 20;
    // Header formal opción C
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.text("ABARROTES LA MANITA, S.A. DE C.V.", w / 2, y, { align: "center" }); y += 6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(80);
    pdf.text("RFC: AMA 700701GI8  |  Melchor Ocampo #59, Magdalena Mixiuhca, C.P. 15850, Ciudad de México", w / 2, y, { align: "center" }); y += 4;
    pdf.setFont("helvetica", "italic"); pdf.setFontSize(7); pdf.setTextColor(130);
    pdf.text("Desde 1904 — Trabajando por un México mejor", w / 2, y, { align: "center" }); y += 3;
    pdf.setTextColor(0); pdf.setLineWidth(0.3); pdf.setDrawColor(150);
    pdf.line(mL, y, w - mR, y); pdf.setDrawColor(0); pdf.setLineWidth(0.2); y += 8;
    // Title
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
    pdf.text("ACTA ADMINISTRATIVA", w / 2, y, { align: "center" }); y += 10;
    // Body
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    const [ay, am, ad] = acta.fecha.split("-");
    const lines = pdf.splitTextToSize(`En la Ciudad de México, a ${ad}/${am}/${ay}, se levanta la presente acta administrativa al trabajador ${empleadoNombre.toUpperCase()}, quien se desempeña como ${empleadoPuesto.toUpperCase()}, por el siguiente motivo:`, maxW);
    for (const l of lines) { pdf.text(l, mL, y); y += 5; } y += 5;
    pdf.setFont("helvetica", "bold"); pdf.text(`Tipo: ${TIPOS[acta.tipo] || acta.tipo}`, mL, y); y += 8;
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(acta.descripcion, maxW);
    for (const l of descLines) { pdf.text(l, mL, y); y += 5; } y += 8;
    pdf.text("Se le hace saber que de reincidir podrá hacerse acreedor a sanciones mayores conforme a la Ley Federal del Trabajo.", mL, y); y += 8;
    pdf.setFontSize(9);
    pdf.text("Con mi firma confirmo estar enterado/a del contenido de la presente acta.", mL, y); y += 12;
    // Signatures
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.text("TRABAJADOR", mL + maxW * 0.25, y, { align: "center" });
    pdf.text("REPRESENTANTE", mL + maxW * 0.75, y, { align: "center" }); y += 3;
    if (firmaImg) { try { pdf.addImage(firmaImg, "PNG", mL + maxW * 0.05, y, maxW * 0.35, 15); } catch {} }
    y += 15;
    pdf.line(mL, y, mL + maxW * 0.4, y); pdf.line(mL + maxW * 0.6, y, mL + maxW, y); y += 4;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text(empleadoNombre, mL + maxW * 0.25, y, { align: "center" });
    pdf.text("JOSE ANTONIO GOMEZ ORTEGA", mL + maxW * 0.75, y, { align: "center" }); y += 12;
    // Testigos
    if (acta.testigo_1 || acta.testigo_2) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
      pdf.text("TESTIGOS", w / 2, y, { align: "center" }); y += 12;
      pdf.line(mL, y, mL + maxW * 0.4, y); pdf.line(mL + maxW * 0.6, y, mL + maxW, y); y += 4;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      pdf.text(acta.testigo_1 || "Testigo 1", mL + maxW * 0.25, y, { align: "center" });
      pdf.text(acta.testigo_2 || "Testigo 2", mL + maxW * 0.75, y, { align: "center" });
    }
    return pdf.output("blob");
  };

  // Download existing acta (re-generate without signature for old ones)
  const handleDownload = (acta: Acta) => {
    const blob = generarPDFConFirma({ tipo: acta.tipo, descripcion: acta.descripcion, fecha: acta.fecha, testigo_1: acta.testigo_1 || "", testigo_2: acta.testigo_2 || "" });
    const link = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = link; a.download = `Acta_${empleadoNombre.replace(/\s+/g, "_")}_${acta.fecha}.pdf`; a.click(); URL.revokeObjectURL(link);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">{actas.length} acta{actas.length !== 1 ? "s" : ""}</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" />{showForm ? "Cancelar" : "Nueva acta"}</Button>
        </div>
        {showForm && (
          <div className="space-y-3 p-3 border rounded-md">
            <div><Label>Tipo *</Label><Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Descripción *</Label><Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label>Testigo 1</Label><Input value={form.testigo_1} onChange={e => setForm({ ...form, testigo_1: e.target.value })} /></div><div><Label>Testigo 2</Label><Input value={form.testigo_2} onChange={e => setForm({ ...form, testigo_2: e.target.value })} /></div></div>
            <Button onClick={handleOpenFirma} disabled={loading}>Continuar a firma</Button>
          </div>
        )}
        {actas.length > 0 && (
          <div className="space-y-2">
            {actas.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{TIPOS[a.tipo] || a.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">{a.fecha.split("-").reverse().join("/")}</span>
                    {a.firmada && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Firmada</Badge>}
                  </div>
                  <p className="text-sm truncate mt-1">{a.descripcion}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(a)} title="Descargar PDF"><Download className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signature dialog */}
      <Dialog open={showFirma} onOpenChange={o => { if (!o) setShowFirma(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Firma del empleado — Enterado del acta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{empleadoNombre} firma confirmando estar enterado/a del contenido del acta.</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm font-medium">Firma del empleado</p>
            <canvas ref={canvasRef} className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white touch-none" style={{ height: 200 }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>Limpiar</Button>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowFirma(false)}>Cancelar</Button>
            <Button onClick={handleFirmarYGuardar} disabled={!hasSignature || loading}>
              {loading ? "Guardando..." : "Firmar y guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
