import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Eraser,
  Save,
  Loader2
} from "lucide-react";

interface RegistrarEntregaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrega: {
    id: string;
    orden_entrega: number;
    pedido: {
      folio: string;
      cliente: { nombre: string };
      sucursal: { nombre: string } | null;
    };
  };
  onSuccess: () => void;
}

type StatusEntrega = "entregado" | "parcial" | "rechazado";

const MOTIVOS_RECHAZO = [
  "Cliente no se encontraba",
  "Negocio cerrado",
  "Cliente rechazó el pedido",
  "Producto en mal estado",
  "Error en el pedido",
  "No pudo recibir por falta de espacio",
  "Otro"
];

export function RegistrarEntregaSheet({ 
  open, 
  onOpenChange, 
  entrega,
  onSuccess 
}: RegistrarEntregaSheetProps) {
  const [status, setStatus] = useState<StatusEntrega>("entregado");
  const [nombreReceptor, setNombreReceptor] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [notasAdicionales, setNotasAdicionales] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Canvas para firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasFirma, setHasFirma] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Inicializar canvas
  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        context.strokeStyle = "#000";
        context.lineWidth = 2;
        context.lineCap = "round";
        context.lineJoin = "round";
        setCtx(context);
        clearCanvas();
      }
    }
  }, [open]);

  const clearCanvas = () => {
    if (canvasRef.current && ctx) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasFirma(false);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasFirma(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (status === "entregado" && !nombreReceptor.trim()) {
      toast.error("Ingresa el nombre de quien recibió");
      return;
    }

    if (status === "entregado" && !hasFirma) {
      toast.error("Se requiere la firma del receptor");
      return;
    }

    if ((status === "parcial" || status === "rechazado") && !motivoRechazo) {
      toast.error("Selecciona el motivo");
      return;
    }

    setLoading(true);
    try {
      // Obtener firma como base64
      let firmaBase64: string | null = null;
      if (hasFirma && canvasRef.current) {
        firmaBase64 = canvasRef.current.toDataURL("image/png");
      }

      // Actualizar entrega
      const { error } = await supabase
        .from("entregas")
        .update({
          entregado: status === "entregado",
          status_entrega: status,
          nombre_receptor: nombreReceptor.trim() || null,
          firma_recibido: firmaBase64,
          hora_entrega_real: new Date().toISOString(),
          motivo_rechazo: status !== "entregado" ? motivoRechazo : null,
          notas: notasAdicionales.trim() || null
        })
        .eq("id", entrega.id);

      if (error) throw error;

      toast.success(
        status === "entregado" 
          ? "¡Entrega registrada exitosamente!" 
          : status === "parcial"
            ? "Entrega parcial registrada"
            : "Rechazo registrado"
      );
      
      // Limpiar y cerrar
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar la entrega");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStatus("entregado");
    setNombreReceptor("");
    setMotivoRechazo("");
    setNotasAdicionales("");
    setHasFirma(false);
    if (ctx && canvasRef.current) {
      clearCanvas();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Registrar Entrega #{entrega.orden_entrega}</SheetTitle>
          <SheetDescription>
            {entrega.pedido.sucursal?.nombre || entrega.pedido.cliente.nombre}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status de entrega */}
          <div className="space-y-3">
            <Label>¿Cómo fue la entrega?</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as StatusEntrega)}
              className="grid grid-cols-3 gap-2"
            >
              <Label 
                htmlFor="entregado"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  status === "entregado" 
                    ? "border-green-500 bg-green-500/10" 
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <RadioGroupItem value="entregado" id="entregado" className="sr-only" />
                <CheckCircle2 className={`h-8 w-8 ${status === "entregado" ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Completa</span>
              </Label>
              
              <Label 
                htmlFor="parcial"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  status === "parcial" 
                    ? "border-yellow-500 bg-yellow-500/10" 
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <RadioGroupItem value="parcial" id="parcial" className="sr-only" />
                <AlertTriangle className={`h-8 w-8 ${status === "parcial" ? "text-yellow-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Parcial</span>
              </Label>
              
              <Label 
                htmlFor="rechazado"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  status === "rechazado" 
                    ? "border-destructive bg-destructive/10" 
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <RadioGroupItem value="rechazado" id="rechazado" className="sr-only" />
                <XCircle className={`h-8 w-8 ${status === "rechazado" ? "text-destructive" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Rechazada</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Nombre del receptor (solo si entrega completa o parcial) */}
          {(status === "entregado" || status === "parcial") && (
            <div className="space-y-2">
              <Label htmlFor="nombreReceptor">
                Nombre de quien recibe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombreReceptor"
                placeholder="Ej: Juan Pérez García"
                value={nombreReceptor}
                onChange={(e) => setNombreReceptor(e.target.value)}
                className="text-lg h-12"
              />
            </div>
          )}

          {/* Motivo de rechazo/parcial */}
          {(status === "parcial" || status === "rechazado") && (
            <div className="space-y-2">
              <Label>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {MOTIVOS_RECHAZO.map((motivo) => (
                  <Button
                    key={motivo}
                    type="button"
                    variant={motivoRechazo === motivo ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-2 px-3 text-left justify-start"
                    onClick={() => setMotivoRechazo(motivo)}
                  >
                    {motivo}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Firma digital (solo si entrega completa o parcial) */}
          {(status === "entregado" || status === "parcial") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Firma del receptor <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>
              <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={150}
                  className="w-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Firme con el dedo o stylus sobre el recuadro
              </p>
            </div>
          )}

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas adicionales (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Observaciones sobre la entrega..."
              value={notasAdicionales}
              onChange={(e) => setNotasAdicionales(e.target.value)}
              rows={2}
            />
          </div>

          {/* Botón de confirmar */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Confirmar Entrega
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
