import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generarContratoPDF, generarAvisoPrivacidadPDF } from "@/lib/generarContratoPDF";
import { supabase } from "@/integrations/supabase/client";

interface FirmaContratoFlowProps {
  open: boolean;
  onClose: () => void;
  onSigned?: () => void;
  empleado: {
    id: string;
    nombre_completo: string;
    rfc: string;
    curp: string;
    puesto: string;
    sueldo_bruto: number;
    fecha_ingreso: string;
    email?: string | null;
    direccion?: string | null;
    beneficiario?: string;
    premio_asistencia_semanal?: number | null;
  };
  empresa: {
    representante_legal: string;
    razon_social: string;
    rfc: string;
    domicilio: string;
  };
}

// ═══ CANVAS DE FIRMA ═══

function SignatureCanvas({
  label,
  canvasRef,
  onDraw,
  onClear,
  height = 120,
}: {
  label: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onDraw: () => void;
  onClear: () => void;
  height?: number;
}) {
  const isDrawing = useRef(false);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
    onDraw();
  };

  const stopDraw = () => { isDrawing.current = false; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Small delay to ensure DOM has rendered with correct dimensions
    const timer = setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [canvasRef, height]);

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <canvas
        ref={canvasRef}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
        style={{ height }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <Button type="button" variant="outline" size="sm" onClick={handleClear}>
        Limpiar firma
      </Button>
    </div>
  );
}

// ═══ COMPONENTE PRINCIPAL ═══

export function FirmaContratoFlow({ open, onClose, onSigned, empleado, empresa }: FirmaContratoFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Track whether current canvas has been drawn on
  const [hasSignature, setHasSignature] = useState(false);

  // Saved signature images
  const [firmaEmpleadoImg, setFirmaEmpleadoImg] = useState("");
  const [firmaAdminImg, setFirmaAdminImg] = useState("");

  // Step 3
  const [consentimientoSi, setConsentimientoSi] = useState(true);

  // One canvas ref per step
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep(1);
      setConsentimientoSi(true);
      setHasSignature(false);
      setFirmaEmpleadoImg("");
      setFirmaAdminImg("");
    }
  }, [open]);

  const fetchExtras = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { beneficiario: null, premio_asistencia_semanal: null };
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_empleado_extras`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ p_empleado_id: empleado.id }),
        }
      );
      if (!response.ok) return { beneficiario: null, premio_asistencia_semanal: null };
      return await response.json();
    } catch {
      return { beneficiario: null, premio_asistencia_semanal: null };
    }
  }, [empleado.id]);

  const captureAndNext = (nextStep: 2 | 3) => {
    if (!hasSignature) return;
    const img = canvasRef.current?.toDataURL("image/png") ?? "";
    if (step === 1) setFirmaEmpleadoImg(img);
    if (step === 2) setFirmaAdminImg(img);
    setHasSignature(false);
    setStep(nextStep);
  };

  const handleFinalize = async () => {
    if (!hasSignature) return;
    setLoading(true);

    try {
      const extras = await fetchExtras();
      const premioDefault = empleado.puesto === "Ayudante de Chofer" ? 958 : empleado.puesto === "Chofer" ? 1262 : null;
      const premio = extras?.premio_asistencia_semanal || empleado.premio_asistencia_semanal || premioDefault;
      const beneficiario = extras?.beneficiario || empleado.beneficiario || "Por designar";
      const firmaEmpleado2Img = canvasRef.current?.toDataURL("image/png") ?? "";

      // Generate signed contract PDF
      const contratoResult = await generarContratoPDF({
        empleado: {
          nombre_completo: empleado.nombre_completo,
          rfc: empleado.rfc,
          curp: empleado.curp,
          puesto: empleado.puesto,
          sueldo_bruto: empleado.sueldo_bruto,
          premio_asistencia: premio,
          beneficiario,
          fecha_ingreso: empleado.fecha_ingreso,
          fecha_contrato: new Date().toISOString().split("T")[0],
          direccion: empleado.direccion || null,
        },
        empresa,
        firmas: {
          empleado: firmaEmpleadoImg,
          admin: firmaAdminImg,
        },
      });

      // Generate signed privacy notice PDF
      const avisoResult = await generarAvisoPrivacidadPDF({
        nombre_empleado: empleado.nombre_completo,
        fecha: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
        firma_empleado: firmaEmpleado2Img,
        checkbox_si: consentimientoSi,
        checkbox_no: !consentimientoSi,
      });

      // Upload to Supabase Storage
      const hoy = new Date().toISOString().split("T")[0];
      const contratoPath = `${empleado.id}/contrato_firmado_${hoy}.pdf`;
      const avisoPath = `${empleado.id}/aviso_privacidad_${hoy}.pdf`;
      let contratoUploaded = false;
      let avisoUploaded = false;

      try {
        await supabase.storage.createBucket("documentos-empleados", { public: false }).catch(() => {});

        if (contratoResult.pdfBlob) {
          console.log("[Firma] Uploading contrato, blob size:", contratoResult.pdfBlob.size);
          const { error: upErr } = await supabase.storage.from("documentos-empleados").upload(contratoPath, contratoResult.pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });
          if (upErr) console.error("[Firma] Error upload contrato:", upErr);
          else contratoUploaded = true;
        } else {
          console.warn("[Firma] contratoResult.pdfBlob is undefined");
        }

        if (avisoResult.pdfBlob) {
          console.log("[Firma] Uploading aviso, blob size:", avisoResult.pdfBlob.size);
          const { error: upErr } = await supabase.storage.from("documentos-empleados").upload(avisoPath, avisoResult.pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });
          if (upErr) console.error("[Firma] Error upload aviso:", upErr);
          else avisoUploaded = true;
        } else {
          console.warn("[Firma] avisoResult.pdfBlob is undefined");
        }

        console.log("[Firma] Upload results — contrato:", contratoUploaded, "aviso:", avisoUploaded);

        // Update empleado record via RPC
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_empleado_extras`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              p_empleado_id: empleado.id,
              p_beneficiario: beneficiario,
              p_premio_asistencia_semanal: premio,
            }),
          });
        }
      } catch (uploadErr) {
        console.error("[Firma] Error en upload/RPC:", uploadErr);
      }

      // Send welcome email with PDFs attached via gmail-api
      if (empleado.email) {
        try {
          // Convert blobs to base64 for email attachments
          const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const contratoBase64 = contratoResult.pdfBlob ? await blobToBase64(contratoResult.pdfBlob) : null;
          const avisoBase64 = avisoResult.pdfBlob ? await blobToBase64(avisoResult.pdfBlob) : null;
          const nombreArchivo = empleado.nombre_completo.replace(/\s+/g, "_");

          const fechaIngresoFmt = empleado.fecha_ingreso.split("-").reverse().join("/");

          const htmlBody = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/><p style="margin:4px 0 0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px;font-weight:600">Trabajando por un México mejor</p></td></tr>
<tr><td style="padding:32px 36px">
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Estimado/a <strong>${empleado.nombre_completo}</strong>,</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Es un placer darte la bienvenida a <strong>Abarrotes La Manita, S.A. de C.V.</strong> Estamos muy contentos de que formes parte de la familia ALMASA.</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Somos una empresa con más de 120 años de historia, fundada en 1904, donde el compromiso, la honestidad y el trabajo en equipo son los valores que nos han acompañado generación tras generación. Creemos que nuestra gente es lo más importante, y por eso nos esforzamos cada día en construir un lugar de trabajo donde todos crezcan.</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">A partir del <strong>${fechaIngresoFmt}</strong> te incorporas a nuestro equipo como <strong>${empleado.puesto}</strong>. Estamos seguros de que tu esfuerzo y dedicación serán una gran aportación para seguir trabajando por un México mejor.</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Aquí encontrarás un equipo comprometido que te recibirá con los brazos abiertos. No dudes en acercarte a nosotros si necesitas algo.</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 28px">Te deseamos mucho éxito en esta nueva etapa. Bienvenido a la familia.</p>
<p style="color:#222;font-size:14px;margin:0 0 4px">Con gusto,</p>
<p style="color:#222;font-size:14px;font-weight:700;margin:0 0 2px">José Antonio Gómez Ortega</p>
<p style="color:#888;font-size:12px;margin:0">Director General</p>
<p style="color:#888;font-size:12px;margin:0">Abarrotes La Manita, S.A. de C.V.</p>
<div style="border-top:1px solid #eee;margin-top:28px;padding-top:20px">
<p style="font-size:13px;font-weight:600;color:#222;margin:0 0 10px">Adjunto encontrarás tus documentos firmados:</p>
<p style="font-size:13px;color:#555;margin:4px 0">• Contrato Individual de Trabajo</p>
<p style="font-size:13px;color:#555;margin:4px 0">• Aviso de Privacidad</p>
</div>
</td></tr>
<tr><td style="padding:16px 36px;border-top:1px solid #eee"><p style="margin:0;color:#999;font-size:10px;line-height:1.6">Abarrotes La Manita, S.A. de C.V. | Melchor Ocampo #59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX | Tel: 55 5552-0168</p></td></tr>
</table></td></tr></table>`;

          const attachments: Array<{ filename: string; mimeType: string; content: string }> = [];
          if (contratoBase64) attachments.push({ filename: `Contrato_${nombreArchivo}.pdf`, mimeType: "application/pdf", content: contratoBase64 });
          if (avisoBase64) attachments.push({ filename: `Aviso_Privacidad_${nombreArchivo}.pdf`, mimeType: "application/pdf", content: avisoBase64 });

          const { error: emailError } = await supabase.functions.invoke("gmail-api", {
            body: {
              action: "send",
              email: "1904@almasa.com.mx",
              to: empleado.email,
              subject: `¡Bienvenido/a a la familia ALMASA! — ${empleado.nombre_completo}`,
              body: htmlBody,
              attachments,
            },
          });

          if (emailError) {
            console.warn("Email de bienvenida no enviado:", emailError.message);
            toast({ title: "Documentos firmados y descargados", description: "No se pudo enviar el email de bienvenida, pero los documentos se guardaron correctamente." });
          } else {
            toast({ title: "Documentos firmados", description: `Email de bienvenida enviado a ${empleado.email}` });
          }
        } catch (emailErr) {
          console.warn("Error enviando email de bienvenida:", emailErr);
          toast({ title: "Documentos firmados y descargados", description: "No se pudo enviar el email de bienvenida, pero los documentos se guardaron correctamente." });
        }
      } else {
        toast({ title: "Documentos firmados y descargados", description: "Contrato y Aviso de Privacidad generados con firmas digitales." });
      }
      // Mark contract as signed (direct fetch to bypass schema cache)
      const { data: { session: signSession } } = await supabase.auth.getSession();
      if (signSession) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?id=eq.${empleado.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${signSession.access_token}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ contrato_firmado_fecha: new Date().toISOString() }),
        });
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
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 1 de 3 — Firma del Empleado</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <strong>{empleado.nombre_completo}</strong> firma su contrato individual de trabajo.
            </p>
            <div className="mt-4">
              <SignatureCanvas
                label="Firma del empleado"
                canvasRef={canvasRef}
                onDraw={() => setHasSignature(true)}
                onClear={() => setHasSignature(false)}
                height={250}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => captureAndNext(2)} disabled={!hasSignature}>Siguiente</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 2 de 3 — Firma del Representante Legal</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <strong>José Antonio Gómez Ortega</strong> firma como representante de la empresa.
            </p>
            <div className="mt-4">
              <SignatureCanvas
                label="Firma del representante legal"
                canvasRef={canvasRef}
                onDraw={() => setHasSignature(true)}
                onClear={() => setHasSignature(false)}
                height={250}
              />
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => { setHasSignature(false); setStep(1); }}>Volver</Button>
              <Button onClick={() => captureAndNext(3)} disabled={!hasSignature}>Siguiente</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 3 de 3 — Aviso de Privacidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="consentimiento" checked={consentimientoSi} onChange={() => setConsentimientoSi(true)} className="mt-1" />
                <span className="text-sm">Sí otorgo mi consentimiento a fin de que se lleve a cabo el tratamiento y transferencia de mis datos personales, financieros y sensibles para las finalidades necesarias y no necesarias en los términos del presente.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="consentimiento" checked={!consentimientoSi} onChange={() => setConsentimientoSi(false)} className="mt-1" />
                <span className="text-sm">No otorgo mi consentimiento, a fin de que se lleve a cabo el tratamiento de mis datos personales en los términos del presente y entiendo que la Empresa no podrá cumplir con las obligaciones derivadas de una relación de trabajo.</span>
              </label>
            </div>
            <div className="mt-2">
              <p className="text-sm"><strong>Nombre:</strong> {empleado.nombre_completo}</p>
              <p className="text-sm text-muted-foreground">Fecha: {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="mt-4">
              <SignatureCanvas
                label="Firma del empleado"
                canvasRef={canvasRef}
                onDraw={() => setHasSignature(true)}
                onClear={() => setHasSignature(false)}
                height={250}
              />
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => { setHasSignature(false); setStep(2); }}>Volver</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button onClick={handleFinalize} disabled={!hasSignature || loading}>
                  {loading ? "Generando..." : "Firmar y finalizar"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
