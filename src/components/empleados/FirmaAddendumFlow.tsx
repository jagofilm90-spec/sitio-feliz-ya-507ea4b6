import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generarAddendumPDF, hoyMexico } from "@/lib/generarContratoPDF";
import { supabase } from "@/integrations/supabase/client";

interface FirmaAddendumFlowProps {
  empleado: {
    id: string;
    nombre_completo: string;
    puesto: string;
    fecha_ingreso: string;
    email?: string | null;
  };
  historial: {
    sueldo_anterior: number;
    sueldo_nuevo: number;
    premio_anterior: number | null;
    premio_nuevo: number | null;
  };
  onClose: () => void;
  onSigned?: () => void;
}

function SignatureCanvas({ label, canvasRef, onDraw, onClear }: {
  label: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onDraw: () => void;
  onClear: () => void;
}) {
  const isDrawing = useRef(false);
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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
    ctx.lineTo(x, y); ctx.stroke(); onDraw();
  };
  const stop = () => { isDrawing.current = false; };
  const clear = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height); onClear();
  };
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const t = setTimeout(() => { const r = c.getBoundingClientRect(); if (r.width > 0) { c.width = r.width; c.height = r.height; } }, 50);
    return () => clearTimeout(t);
  }, [canvasRef]);
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <canvas ref={canvasRef} className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white touch-none" style={{ height: 250 }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stop} />
      <Button type="button" variant="outline" size="sm" onClick={clear}>Limpiar firma</Button>
    </div>
  );
}

export function FirmaAddendumFlow({ empleado, historial, onClose, onSigned }: FirmaAddendumFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [firmaEmpleadoImg, setFirmaEmpleadoImg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setStep(1); setHasSignature(false); setFirmaEmpleadoImg(""); }, []);

  const captureAndNext = () => {
    if (!hasSignature) return;
    setFirmaEmpleadoImg(canvasRef.current?.toDataURL("image/png") ?? "");
    setHasSignature(false);
    setStep(2);
  };

  const handleFinalize = async () => {
    if (!hasSignature) return;
    setLoading(true);
    try {
      const firmaAdminImg = canvasRef.current?.toDataURL("image/png") ?? "";

      const result = await generarAddendumPDF({
        empleado_nombre: empleado.nombre_completo,
        puesto: empleado.puesto,
        fecha_contrato: empleado.fecha_ingreso,
        sueldo_anterior: historial.sueldo_anterior,
        sueldo_nuevo: historial.sueldo_nuevo,
        premio_anterior: historial.premio_anterior,
        premio_nuevo: historial.premio_nuevo,
        empresa_representante: "JOSE ANTONIO GOMEZ ORTEGA",
        firmaEmpleado: firmaEmpleadoImg,
        firmaRepresentante: firmaAdminImg,
      });

      // Upload to storage
      const hoy = hoyMexico();
      if (result.pdfBlob) {
        await supabase.storage.from("empleados-documentos").upload(
          `${empleado.id}/addendum_sueldo_${hoy}.pdf`, result.pdfBlob,
          { contentType: "application/pdf", upsert: true }
        );
      }

      // Send email
      if (empleado.email && result.pdfBlob) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(result.pdfBlob);
          });
          const nombreArchivo = empleado.nombre_completo.replace(/\s+/g, "_");
          const fechaFmt = empleado.fecha_ingreso.split("-").reverse().join("/");
          await supabase.functions.invoke("gmail-api", {
            body: {
              action: "send",
              email: "1904@almasa.com.mx",
              to: empleado.email,
              subject: `Addendum a tu contrato — ALMASA`,
              body: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/></td></tr>
<tr><td style="padding:28px 36px">
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Estimado/a <strong>${empleado.nombre_completo}</strong>,</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Adjunto encontrarás el addendum a tu contrato con la actualización de sueldo.</p>
<p style="color:#222;font-size:14px;margin:0 0 4px">Con gusto,</p>
<p style="color:#222;font-size:14px;font-weight:700;margin:0 0 2px">José Antonio Gómez Ortega</p>
<p style="color:#888;font-size:12px;margin:0">Director General — ALMASA</p>
</td></tr>
<tr><td style="padding:16px 36px;border-top:1px solid #eee"><p style="margin:0;color:#999;font-size:10px">Abarrotes La Manita, S.A. de C.V. | Melchor Ocampo #59, CDMX | Tel: 55 5552-0168</p></td></tr>
</table></td></tr></table>`,
              attachments: [{ filename: `Addendum_${nombreArchivo}.pdf`, content: base64, mimeType: "application/pdf" }],
            },
          });
          toast({ title: "Addendum firmado", description: `PDF descargado y enviado a ${empleado.email}` });
        } catch {
          toast({ title: "Addendum firmado", description: "PDF descargado. No se pudo enviar el email." });
        }
      } else {
        toast({ title: "Addendum firmado", description: "PDF descargado correctamente." });
      }

      onSigned?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 1 de 2 — Firma del Empleado</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <strong>{empleado.nombre_completo}</strong> firma el addendum de cambio de sueldo.
            </p>
            <div className="mt-4">
              <SignatureCanvas label="Firma del empleado" canvasRef={canvasRef}
                onDraw={() => setHasSignature(true)} onClear={() => setHasSignature(false)} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={captureAndNext} disabled={!hasSignature}>Siguiente</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 2 de 2 — Firma del Representante Legal</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <strong>José Antonio Gómez Ortega</strong> firma como representante de la empresa.
            </p>
            <div className="mt-4">
              <SignatureCanvas label="Firma del representante legal" canvasRef={canvasRef}
                onDraw={() => setHasSignature(true)} onClear={() => setHasSignature(false)} />
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => { setHasSignature(false); setStep(1); }}>Volver</Button>
              <Button onClick={handleFinalize} disabled={!hasSignature || loading}>
                {loading ? "Generando..." : "Firmar y finalizar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
