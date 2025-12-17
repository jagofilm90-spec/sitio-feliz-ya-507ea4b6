import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface MotivoCorreccionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string, nota: string) => void;
  productoNombre: string;
  loading?: boolean;
}

const MOTIVOS = [
  { id: "error_conteo", label: "Error en el conteo" },
  { id: "producto_danado", label: "Producto dañado encontrado" },
  { id: "lote_incorrecto", label: "Lote incorrecto seleccionado" },
  { id: "stock_insuficiente", label: "Stock insuficiente en bodega" },
  { id: "otro", label: "Otro motivo" },
];

export function MotivoCorreccionDialog({
  open,
  onOpenChange,
  onConfirm,
  productoNombre,
  loading = false,
}: MotivoCorreccionDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");

  const handleConfirm = () => {
    if (!motivo) return;
    const motivoLabel = MOTIVOS.find(m => m.id === motivo)?.label || motivo;
    const motivoCompleto = nota ? `${motivoLabel}: ${nota}` : motivoLabel;
    onConfirm(motivo, motivoCompleto);
    // Reset state
    setMotivo("");
    setNota("");
  };

  const handleClose = () => {
    if (!loading) {
      setMotivo("");
      setNota("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Motivo de corrección
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Estás desmarcando el producto{" "}
            <span className="font-medium text-foreground">{productoNombre}</span>
            . Se restaurará el inventario. Indica el motivo:
          </p>

          <RadioGroup value={motivo} onValueChange={setMotivo}>
            {MOTIVOS.map((m) => (
              <div key={m.id} className="flex items-center space-x-3 py-2">
                <RadioGroupItem value={m.id} id={m.id} className="h-5 w-5" />
                <Label htmlFor={m.id} className="text-base cursor-pointer">
                  {m.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {motivo === "otro" && (
            <Textarea
              placeholder="Describe el motivo..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="min-h-[80px]"
            />
          )}

          {motivo && motivo !== "otro" && (
            <Textarea
              placeholder="Nota adicional (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="min-h-[60px]"
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!motivo || loading}
            variant="destructive"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Confirmar corrección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
