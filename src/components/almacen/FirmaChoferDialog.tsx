import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Eraser, Check, X, Truck } from "lucide-react";

interface FirmaChoferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (firmaBase64: string) => void;
  choferNombre: string;
  rutaFolio: string;
  loading?: boolean;
  titulo?: string;
  descripcion?: string;
}

export function FirmaChoferDialog({
  open,
  onOpenChange,
  onConfirm,
  choferNombre,
  rutaFolio,
  loading = false,
  titulo,
  descripcion,
}: FirmaChoferDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Manage body pointer events
  useEffect(() => {
    if (open) {
      document.body.style.pointerEvents = "auto";
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
    };
  }, [open]);

  // Remove inert attributes that block pointer events
  useEffect(() => {
    if (!open) return;
    const elementsToFix: { el: Element; attr: string; value: string | null }[] = [];
    document.querySelectorAll("[inert], [aria-hidden='true']").forEach((el) => {
      if (el.hasAttribute("inert")) {
        elementsToFix.push({ el, attr: "inert", value: "" });
        el.removeAttribute("inert");
      }
      if (el.getAttribute("aria-hidden") === "true") {
        elementsToFix.push({ el, attr: "aria-hidden", value: "true" });
        el.removeAttribute("aria-hidden");
      }
    });
    return () => {
      elementsToFix.forEach(({ el, attr, value }) => {
        if (value !== null) {
          el.setAttribute(attr, value);
        }
      });
    };
  }, [open]);

  // Initialize canvas
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setContext(ctx);
      setHasSignature(false);
    }
  }, [open]);

  const getCoordinates = (
    e: React.PointerEvent | React.TouchEvent | React.MouseEvent
  ): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("pointerId" in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    if ("clientX" in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    return null;
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (!context || !canvasRef.current) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !context) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    canvasRef.current.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
    context?.closePath();
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !hasSignature) return;
    const firmaBase64 = canvasRef.current.toDataURL("image/png");
    onConfirm(firmaBase64);
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  const portalContainer = document.getElementById("firma-portal-root") || document.body;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999, pointerEvents: "auto" }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        style={{ pointerEvents: loading ? "none" : "auto" }}
      />

      {/* Dialog content */}
      <div
        className="relative bg-background rounded-xl shadow-2xl w-[95vw] max-w-lg mx-4 overflow-hidden"
        style={{ zIndex: 100000, pointerEvents: "auto" }}
      >
        {/* Header */}
        <div className="p-4 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">{titulo || "Firma del Chofer"}</h2>
              <p className="text-sm text-muted-foreground">
                {descripcion || `Conformidad de carga - ${rutaFolio}`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Texto de conformidad */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p>
              Yo, <span className="font-semibold">{choferNombre}</span>, confirmo
              que he verificado y acepto la carga completa de la ruta{" "}
              <span className="font-semibold">{rutaFolio}</span>. Los productos
              están correctamente cargados y sellados según corresponda.
            </p>
          </div>

          {/* Canvas para firma */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Firma aquí abajo:
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                disabled={loading}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            </div>
            <div className="border-2 border-dashed border-primary/30 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full bg-white cursor-crosshair"
                style={{ touchAction: "none" }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                onPointerCancel={stopDrawing}
              />
            </div>
            {!hasSignature && (
              <p className="text-xs text-center text-muted-foreground">
                Dibuja tu firma con el dedo o stylus
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={handleClose}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={handleConfirm}
            disabled={!hasSignature || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirmar firma
          </Button>
        </div>
      </div>
    </div>,
    portalContainer
  );
}
