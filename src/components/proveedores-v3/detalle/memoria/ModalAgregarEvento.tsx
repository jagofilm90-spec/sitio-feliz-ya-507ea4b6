import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MANUAL_EVENT_TYPES } from "@/lib/eventos-proveedor-utils";
import { useCreateEvento } from "@/hooks/useProveedorMemoria";

interface Props {
  proveedorId: string;
  proveedorNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModalAgregarEvento({
  proveedorId,
  proveedorNombre,
  open,
  onOpenChange,
}: Props) {
  const [tipo, setTipo] = useState<string>("manual_observacion");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const create = useCreateEvento(proveedorId);

  const reset = () => {
    setTipo("manual_observacion");
    setTitulo("");
    setDescripcion("");
  };

  const handleSubmit = () => {
    if (titulo.trim().length < 3) return;
    create.mutate(
      {
        tipo_evento: tipo,
        titulo: titulo.trim().slice(0, 100),
        descripcion: descripcion.trim() ? descripcion.trim().slice(0, 500) : null,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  const canSubmit = titulo.trim().length >= 3 && !create.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Agregar evento manual</DialogTitle>
          <DialogDescription>
            Captura algo importante sobre {proveedorNombre}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tipo (opcional)</Label>
            <p className="text-xs text-ink-500">
              Si no eliges, será una observación general
            </p>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value.slice(0, 100))}
              placeholder="Ej. Roberto cambió de teléfono"
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value.slice(0, 500))}
              placeholder="Detalles adicionales..."
              maxLength={500}
              className="min-h-[80px]"
            />
            <div className="text-[11px] text-ink-500 text-right">
              {descripcion.length}/500
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Guardar evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
