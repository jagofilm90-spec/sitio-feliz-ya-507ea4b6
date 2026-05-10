import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Save, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateCartaPorte } from "@/hooks/useCartasPorte";
import {
  useCartaPorteSubDocs,
  useRutaConEntregas,
  useValidateCartaPorte,
  useRegistrarEventoCP,
  CpMercancia,
  CpUbicacion,
  CpAutotransporte,
  CpFigura,
} from "@/hooks/useCartaPorteWizard";
import Paso1Mercancias from "./Paso1Mercancias";
import Paso2Ubicaciones from "./Paso2Ubicaciones";
import Paso3Autotransporte from "./Paso3Autotransporte";
import Paso4FiguraTransporte from "./Paso4FiguraTransporte";

interface CartaPorteWizardProps {
  cartaPorteId: string;
  rutaId: string | null;
  vehiculoId: string | null;
  choferId: string | null;
  estado: string;
}

const STEPS = [
  { label: "Mercancías", icon: "📦" },
  { label: "Ubicaciones", icon: "📍" },
  { label: "Autotransporte", icon: "🚛" },
  { label: "Operador", icon: "👤" },
];

const STORAGE_KEY = (id: string) => `cp_wizard_${id}`;

export default function CartaPorteWizard({ cartaPorteId, rutaId, vehiculoId, choferId, estado }: CartaPorteWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false]);

  // Wizard local state
  const [mercancias, setMercancias] = useState<Omit<CpMercancia, "id" | "carta_porte_id">[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Omit<CpUbicacion, "id" | "carta_porte_id">[]>([]);
  const [autotransporte, setAutotransporte] = useState<Omit<CpAutotransporte, "id" | "carta_porte_id"> | null>(null);
  const [figura, setFigura] = useState<Omit<CpFigura, "id" | "carta_porte_id"> | null>(null);

  // Hooks
  const { data: rutaData } = useRutaConEntregas(rutaId);
  const { data: subDocs, isLoading: loadingSubDocs } = useCartaPorteSubDocs(cartaPorteId);
  const validateMutation = useValidateCartaPorte();
  const registrarEvento = useRegistrarEventoCP();
  const updateCP = useUpdateCartaPorte();

  // Load existing sub-docs into local state
  useEffect(() => {
    if (!subDocs) return;
    if (subDocs.mercancias.length > 0) {
      setMercancias(subDocs.mercancias.map(({ id, carta_porte_id, ...rest }) => rest as any));
      setCompletedSteps((prev) => { const n = [...prev]; n[0] = true; return n; });
    }
    if (subDocs.ubicaciones.length > 0) {
      setUbicaciones(subDocs.ubicaciones.map(({ id, carta_porte_id, ...rest }) => rest as any));
      setCompletedSteps((prev) => { const n = [...prev]; n[1] = true; return n; });
    }
    if (subDocs.autotransporte) {
      const { id, carta_porte_id, ...rest } = subDocs.autotransporte as any;
      setAutotransporte(rest);
      setCompletedSteps((prev) => { const n = [...prev]; n[2] = true; return n; });
    }
    if (subDocs.figuras.length > 0) {
      const { id, carta_porte_id, ...rest } = subDocs.figuras[0] as any;
      setFigura(rest);
      setCompletedSteps((prev) => { const n = [...prev]; n[3] = true; return n; });
    }
  }, [subDocs]);

  // LocalStorage backup
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(cartaPorteId));
    if (saved && !subDocs) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mercancias?.length) setMercancias(parsed.mercancias);
        if (parsed.ubicaciones?.length) setUbicaciones(parsed.ubicaciones);
        if (parsed.autotransporte) setAutotransporte(parsed.autotransporte);
        if (parsed.figura) setFigura(parsed.figura);
      } catch { /* ignore */ }
    }
  }, [cartaPorteId]);

  useEffect(() => {
    const data = { mercancias, ubicaciones, autotransporte, figura };
    localStorage.setItem(STORAGE_KEY(cartaPorteId), JSON.stringify(data));
  }, [mercancias, ubicaciones, autotransporte, figura, cartaPorteId]);

  const markStepComplete = useCallback((step: number, complete: boolean) => {
    setCompletedSteps((prev) => { const n = [...prev]; n[step] = complete; return n; });
  }, []);

  const handleValidate = async () => {
    registrarEvento.mutate({ cartaPorteId, tipoEvento: "validacion_solicitada" });
    validateMutation.mutate(cartaPorteId);
  };

  const allStepsComplete = completedSteps.every(Boolean);

  if (loadingSubDocs) {
    return <div className="py-8 text-center text-muted-foreground">Cargando datos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium",
              currentStep === idx && "border-[#c41e3a] bg-red-50 text-[#c41e3a]",
              currentStep !== idx && completedSteps[idx] && "border-green-300 bg-green-50 text-green-700",
              currentStep !== idx && !completedSteps[idx] && "border-gray-200 text-gray-500 hover:border-gray-300"
            )}
          >
            {completedSteps[idx] ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-base">{step.icon}</span>
            )}
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{idx + 1}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <Paso1Mercancias
            mercancias={mercancias}
            setMercancias={setMercancias}
            rutaData={rutaData}
            cartaPorteId={cartaPorteId}
            onComplete={(complete) => markStepComplete(0, complete)}
          />
        )}
        {currentStep === 1 && (
          <Paso2Ubicaciones
            ubicaciones={ubicaciones}
            setUbicaciones={setUbicaciones}
            rutaData={rutaData}
            cartaPorteId={cartaPorteId}
            onComplete={(complete) => markStepComplete(1, complete)}
          />
        )}
        {currentStep === 2 && (
          <Paso3Autotransporte
            autotransporte={autotransporte}
            setAutotransporte={setAutotransporte}
            vehiculoId={vehiculoId}
            cartaPorteId={cartaPorteId}
            onComplete={(complete) => markStepComplete(2, complete)}
          />
        )}
        {currentStep === 3 && (
          <Paso4FiguraTransporte
            figura={figura}
            setFigura={setFigura}
            choferId={choferId}
            cartaPorteId={cartaPorteId}
            onComplete={(complete) => markStepComplete(3, complete)}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>

        <div className="flex items-center gap-2">
          {allStepsComplete && estado === "borrador" && (
            <Button
              onClick={handleValidate}
              disabled={validateMutation.isPending}
              className="bg-[#c41e3a] hover:bg-[#a01830] text-white"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              {validateMutation.isPending ? "Validando..." : "Validar Carta Porte"}
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}
          disabled={currentStep === 3}
        >
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Validation results */}
      {validateMutation.data && (
        <div className={cn(
          "rounded-lg p-4 border",
          validateMutation.data.valida ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        )}>
          <p className="font-medium text-sm mb-2">
            {validateMutation.data.valida ? "✅ Carta Porte válida" : "❌ Errores de validación"}
          </p>
          {validateMutation.data.errores.length > 0 && (
            <ul className="text-xs space-y-1 text-red-700">
              {validateMutation.data.errores.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
          {validateMutation.data.warnings.length > 0 && (
            <ul className="text-xs space-y-1 text-amber-700 mt-2">
              {validateMutation.data.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
