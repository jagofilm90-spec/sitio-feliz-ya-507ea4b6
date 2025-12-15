import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eraser } from "lucide-react";
import { FirmaDigitalDialog } from "@/components/almacen/FirmaDigitalDialog";

const TestFirma = () => {
  // ======= CANVAS AISLADO =======
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  // ======= DIALOG =======
  const [dialogOpen, setDialogOpen] = useState(false);

  const logEvent = (eventName: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [`${timestamp} - ${eventName}`, ...prev.slice(0, 19)]);
    console.log(`[FIRMA] ${eventName}`);
  };

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "hsl(220, 15%, 15%)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setContext(ctx);
      }
    }
  }, []);

  const getCoordinates = (e: React.PointerEvent | React.MouseEvent) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    logEvent(`startDrawing (${e.type})`);
    
    if ("pointerId" in e && canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
      logEvent(`setPointerCapture(${e.pointerId})`);
    }
    
    const coords = getCoordinates(e);
    if (!coords || !context) {
      logEvent(`ERROR: coords=${!!coords}, context=${!!context}`);
      return;
    }

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(coords.x, coords.y);
    logEvent(`moveTo(${coords.x.toFixed(0)}, ${coords.y.toFixed(0)})`);
  };

  const draw = (e: React.PointerEvent | React.MouseEvent) => {
    if (!isDrawing || !context) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    if (!coords) return;

    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e?: React.PointerEvent | React.MouseEvent) => {
    if (isDrawing) {
      logEvent(`stopDrawing (${e?.type || 'unknown'})`);
    }
    setIsDrawing(false);
    
    if (e && "pointerId" in e && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
    
    if (context) {
      context.closePath();
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current || !context) return;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
    setEvents([]);
    logEvent("Canvas limpiado");
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">🧪 Prueba de Canvas de Firma</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CANVAS AISLADO */}
        <Card>
          <CardHeader>
            <CardTitle>Canvas Aislado (sin modal)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este canvas NO está dentro de ningún dialog/modal. 
              Si funciona aquí pero no en el dialog, el problema es Radix UI.
            </p>
            
            <div className="border-2 border-dashed border-blue-500 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full cursor-crosshair"
                style={{ touchAction: 'none' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                onPointerCancel={stopDrawing}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            
            <Button variant="outline" onClick={clearCanvas} disabled={!hasSignature} className="w-full">
              <Eraser className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </CardContent>
        </Card>

        {/* LOG DE EVENTOS */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Log de Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-gray-500">Interactúa con el canvas para ver eventos...</p>
              ) : (
                events.map((event, i) => <div key={i}>{event}</div>)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PRUEBA CON DIALOG */}
      <Card>
        <CardHeader>
          <CardTitle>Canvas en FirmaDigitalDialog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Prueba el mismo canvas pero dentro del dialog modal para comparar.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            Abrir Dialog de Firma
          </Button>
        </CardContent>
      </Card>

      <FirmaDigitalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={(firma) => {
          console.log("Firma capturada:", firma.substring(0, 50) + "...");
          setDialogOpen(false);
        }}
        titulo="Prueba de Firma en Dialog"
      />
    </div>
  );
};

export default TestFirma;
