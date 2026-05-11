import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface Props {
  onSave: (dataUrl: string) => void;
  label?: string;
}

export default function SignaturePad({ onSave, label = "Firma" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const start = (e: any) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const end = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const save = () => {
    if (!canvasRef.current || !hasContent) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="border-2 border-dashed border-gray-300 rounded-lg bg-white w-full touch-none"
        style={{ height: "120px" }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear}><Eraser className="h-3 w-3 mr-1" /> Limpiar</Button>
        <Button size="sm" onClick={save} disabled={!hasContent}><Check className="h-3 w-3 mr-1" /> Guardar</Button>
      </div>
    </div>
  );
}
