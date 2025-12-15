import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Eraser, Check, X } from "lucide-react";

interface FirmaDigitalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (firmaBase64: string) => void;
  titulo: string;
  loading?: boolean;
}

export const FirmaDigitalDialog = ({
  open,
  onOpenChange,
  onConfirm,
  titulo,
  loading = false,
}: FirmaDigitalDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Forzar pointer-events en body mientras el dialog está abierto
  useEffect(() => {
    if (open) {
      const originalPointerEvents = document.body.style.pointerEvents;
      const originalOverflow = document.body.style.overflow;

      document.body.style.pointerEvents = "auto";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.pointerEvents = originalPointerEvents;
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Radix (Sheet/Dialog) puede aplicar `inert` / `aria-hidden` y bloquear eventos táctiles.
  // Mientras este dialog esté abierto, removemos temporalmente esos atributos y restauramos al cerrar.
  useEffect(() => {
    if (!open) return;

    const portalRoot = document.getElementById("firma-portal-root") as HTMLElement | null;
    const prevPortalStyles = portalRoot
      ? {
          pointerEvents: portalRoot.style.pointerEvents,
          position: portalRoot.style.position,
          zIndex: portalRoot.style.zIndex,
          isolation: portalRoot.style.isolation,
        }
      : null;

    if (portalRoot) {
      portalRoot.style.pointerEvents = "auto";
      if (!portalRoot.style.position) portalRoot.style.position = "relative";
      portalRoot.style.zIndex = "999999";
      portalRoot.style.isolation = "isolate";
    }

    const inertElements = Array.from(document.querySelectorAll<HTMLElement>("[inert]"));
    const inertSnapshot = inertElements.map((el) => ({
      el,
      value: el.getAttribute("inert"),
    }));
    inertElements.forEach((el) => el.removeAttribute("inert"));

    const ariaHiddenElements = Array.from(
      document.querySelectorAll<HTMLElement>("[aria-hidden=\"true\"]")
    );
    const ariaHiddenSnapshot = ariaHiddenElements.map((el) => ({
      el,
      value: el.getAttribute("aria-hidden"),
    }));
    ariaHiddenElements.forEach((el) => el.removeAttribute("aria-hidden"));

    return () => {
      inertSnapshot.forEach(({ el, value }) => {
        el.setAttribute("inert", value ?? "");
      });
      ariaHiddenSnapshot.forEach(({ el, value }) => {
        el.setAttribute("aria-hidden", value ?? "true");
      });

      if (portalRoot && prevPortalStyles) {
        portalRoot.style.pointerEvents = prevPortalStyles.pointerEvents;
        portalRoot.style.position = prevPortalStyles.position;
        portalRoot.style.zIndex = prevPortalStyles.zIndex;
        portalRoot.style.isolation = prevPortalStyles.isolation;
      }
    };
  }, [open]);

  // Inicializar canvas cuando se abre
  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.strokeStyle = "hsl(220, 15%, 15%)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        setContext(ctx);
        
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if ("pointerId" in e && canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
    }
    
    const coords = getCoordinates(e);
    if (!coords || !context) return;

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDrawing || !context) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsDrawing(false);
    
    if (e && "pointerId" in e && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // Ignorar si ya fue liberado
      }
    }
    
    if (context) {
      context.closePath();
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current || !context) return;
    const canvas = canvasRef.current;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
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

  // No renderizar si no está abierto
  if (!open) return null;

  const portalContainer =
    (document.getElementById("firma-portal-root") as HTMLElement | null) ?? document.body;

  // Usar createPortal para renderizar fuera del árbol de Radix (Sheet/Dialog)
  // y evitar que `inert` bloquee eventos del stylus/touch.
  return createPortal(
    <>
      {/* Overlay - z-index muy alto para estar encima de todo */}
      <div 
        className="fixed inset-0 bg-black/80"
        style={{ 
          zIndex: 99999,
          pointerEvents: 'auto'
        }}
        onClick={handleClose}
      />
      
      {/* Content - z-index aún más alto */}
      <div
        className="fixed left-1/2 top-1/2 w-full max-w-lg border bg-background p-6 shadow-lg rounded-lg"
        style={{ 
          zIndex: 100000,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          onClick={handleClose}
          disabled={loading}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>

        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight">{titulo}</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dibuja tu firma para confirmar
          </p>

          {/* Canvas de firma */}
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white"
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full cursor-crosshair"
              style={{ 
                touchAction: 'none',
                pointerEvents: 'auto'
              }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <Button
            variant="outline"
            onClick={clearCanvas}
            disabled={!hasSignature || loading}
            className="w-full"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Limpiar firma
          </Button>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasSignature || loading}
            className="min-w-32"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmar
          </Button>
        </div>
      </div>
    </>,
    portalContainer
  );
};
