import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Eraser, Check } from "lucide-react";

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

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Configurar canvas
        ctx.strokeStyle = "hsl(220, 15%, 15%)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        setContext(ctx);
        
        // Limpiar canvas
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

    // Pointer events (stylus, touch, mouse todos usan esto)
    if ("pointerId" in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    // Touch events (fallback)
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    // Mouse events (fallback)
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    
    // Capturar pointer para seguimiento continuo del stylus
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
    if (!isDrawing || !context) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(false);
    
    // Liberar pointer capture
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dibuja tu firma para confirmar que la carga está completa
          </p>

          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full cursor-crosshair"
              style={{ touchAction: 'none' }}
              // Pointer events (stylus, touch, mouse)
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
              // Fallback para dispositivos sin Pointer API
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
