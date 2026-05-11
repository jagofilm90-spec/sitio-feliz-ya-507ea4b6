import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, XCircle } from "lucide-react";
import { useCancelarCartaPorte } from "@/hooks/useCartasPorte";

const MOTIVOS = [
  { value: "01", label: "01 - Con errores, con relación (requiere UUID sustituto)" },
  { value: "02", label: "02 - Con errores, sin relación" },
  { value: "03", label: "03 - No se llevó a cabo la operación" },
  { value: "04", label: "04 - Nominativa en factura global" },
];

interface Props {
  cartaPorteId: string;
  folio: string;
}

export default function CancelarDialog({ cartaPorteId, folio }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [uuidSustituto, setUuidSustituto] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const cancelarMutation = useCancelarCartaPorte();

  const canCancel = motivo && confirmText === "CANCELAR" && (motivo !== "01" || uuidSustituto);

  const handleCancel = () => {
    cancelarMutation.mutate(
      {
        cartaPorteId,
        motivo: motivo as "01" | "02" | "03" | "04",
        uuidSustituto: motivo === "01" ? uuidSustituto : undefined,
      },
      {
        onSuccess: () => setOpen(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="h-4 w-4 mr-2" /> Cancelar CFDI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Cancelar Carta Porte
          </DialogTitle>
          <DialogDescription>
            Esta acción cancelará <span className="font-mono font-bold">{folio}</span> ante el SAT.
            Esta operación es irreversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Motivo de Cancelación (SAT)*</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Selecciona motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {motivo === "01" && (
            <div>
              <Label className="text-xs">UUID del CFDI sustituto*</Label>
              <Input
                value={uuidSustituto}
                onChange={(e) => setUuidSustituto(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="text-sm font-mono"
              />
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-xs text-red-800 mb-2">
              Escribe <span className="font-bold">CANCELAR</span> para confirmar:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CANCELAR"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            No, volver
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={!canCancel || cancelarMutation.isPending}
          >
            {cancelarMutation.isPending ? "Cancelando..." : "Confirmar Cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
