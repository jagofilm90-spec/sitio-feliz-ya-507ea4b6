import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generarContratoPDF, generarAvisoPrivacidadPDF } from "@/lib/generarContratoPDF";
import { supabase } from "@/integrations/supabase/client";

interface FirmaContratoFlowProps {
  open: boolean;
  onClose: () => void;
  empleado: {
    id: string;
    nombre_completo: string;
    rfc: string;
    curp: string;
    puesto: string;
    sueldo_bruto: number;
    fecha_ingreso: string;
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
  onSignatureChange,
}: {
  label: string;
  onSignatureChange: (hasSignature: boolean, getImage: () => string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);

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
    if (!hasDrawn.current) {
      hasDrawn.current = true;
      onSignatureChange(true, () => canvasRef.current?.toDataURL("image/png") ?? "");
    }
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    onSignatureChange(false, () => "");
  };

  // Draw placeholder
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Set high-res canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }, []);

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <canvas
        ref={canvasRef}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
        style={{ height: 120 }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <Button type="button" variant="outline" size="sm" onClick={clear}>
        Limpiar firma
      </Button>
    </div>
  );
}

// ═══ COMPONENTE PRINCIPAL ═══

export function FirmaContratoFlow({ open, onClose, empleado, empresa }: FirmaContratoFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 signatures
  const [firmaEmpleado1, setFirmaEmpleado1] = useState<{ has: boolean; get: () => string }>({ has: false, get: () => "" });
  const [firmaAdmin, setFirmaAdmin] = useState<{ has: boolean; get: () => string }>({ has: false, get: () => "" });

  // Step 2
  const [consentimientoSi, setConsentimientoSi] = useState(true);
  const [firmaEmpleado2, setFirmaEmpleado2] = useState<{ has: boolean; get: () => string }>({ has: false, get: () => "" });

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep(1);
      setConsentimientoSi(true);
      setFirmaEmpleado1({ has: false, get: () => "" });
      setFirmaAdmin({ has: false, get: () => "" });
      setFirmaEmpleado2({ has: false, get: () => "" });
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

  const handleStep1Continue = () => {
    if (!firmaEmpleado1.has || !firmaAdmin.has) return;
    setStep(2);
  };

  const handleFinalize = async () => {
    if (!firmaEmpleado2.has) return;
    setLoading(true);

    try {
      const extras = await fetchExtras();
      const premioDefault = empleado.puesto === "Ayudante de Chofer" ? 958 : empleado.puesto === "Chofer" ? 1262 : null;
      const premio = extras?.premio_asistencia_semanal || empleado.premio_asistencia_semanal || premioDefault;
      const beneficiario = extras?.beneficiario || empleado.beneficiario || "Por designar";

      // Generate signed contract PDF
      await generarContratoPDF({
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
          empleado: firmaEmpleado1.get(),
          admin: firmaAdmin.get(),
        },
      });

      // Generate signed privacy notice PDF
      await generarAvisoPrivacidadPDF({
        nombre_empleado: empleado.nombre_completo,
        fecha: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
        firma_empleado: firmaEmpleado2.get(),
        checkbox_si: consentimientoSi,
        checkbox_no: !consentimientoSi,
      });

      toast({ title: "Documentos firmados y descargados", description: "Contrato y Aviso de Privacidad generados con firmas digitales." });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 1 de 2 — Firma del Contrato Individual</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              El empleado <strong>{empleado.nombre_completo}</strong> firma el contrato para el puesto de <strong>{empleado.puesto}</strong>.
            </p>

            <div className="space-y-4 mt-4">
              <SignatureCanvas
                label="Firma del empleado"
                onSignatureChange={(has, get) => setFirmaEmpleado1({ has, get })}
              />
              <SignatureCanvas
                label="Firma del representante legal"
                onSignatureChange={(has, get) => setFirmaAdmin({ has, get })}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={handleStep1Continue}
                disabled={!firmaEmpleado1.has || !firmaAdmin.has}
              >
                Firmar y continuar
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Paso 2 de 2 — Aviso de Privacidad</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">
              Consentimiento expreso del titular de los datos personales.
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentimientoSi}
                  onChange={() => setConsentimientoSi(true)}
                  className="mt-1"
                />
                <span className="text-sm">
                  Sí otorgo mi consentimiento a fin de que se lleve a cabo el tratamiento y transferencia de mis datos personales, financieros y sensibles para las finalidades necesarias y no necesarias en los términos del presente.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!consentimientoSi}
                  onChange={() => setConsentimientoSi(false)}
                  className="mt-1"
                />
                <span className="text-sm">
                  No otorgo mi consentimiento, a fin de que se lleve a cabo el tratamiento de mis datos personales en los términos del presente y entiendo que la Empresa no podrá cumplir con las obligaciones derivadas de una relación de trabajo.
                </span>
              </label>
            </div>

            <div className="mt-2">
              <p className="text-sm"><strong>Nombre:</strong> {empleado.nombre_completo}</p>
              <p className="text-sm text-muted-foreground">Fecha: {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>

            <div className="mt-4">
              <SignatureCanvas
                label="Firma del empleado"
                onSignatureChange={(has, get) => setFirmaEmpleado2({ has, get })}
              />
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  onClick={handleFinalize}
                  disabled={!firmaEmpleado2.has || loading}
                >
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
