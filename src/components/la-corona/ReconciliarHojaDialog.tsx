import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Plus, Trash2 } from "lucide-react";
import { useReconciliarHoja } from "@/hooks/useHojaSalida";

interface Props {
  open: boolean;
  onClose: () => void;
  hojaId: string;
  folio: string;
  fotoUrl?: string | null;
}

interface ItemFaltante {
  descripcion: string;
  cantidad_esperada: number;
  cantidad_real: number;
}

export default function ReconciliarHojaDialog({ open, onClose, hojaId, folio, fotoUrl }: Props) {
  const [sello, setSello] = useState<string>("si");
  const [firma, setFirma] = useState<string>("si");
  const [clasificacion, setClasificacion] = useState("completo");
  const [observaciones, setObservaciones] = useState("");
  const [faltantes, setFaltantes] = useState<ItemFaltante[]>([]);
  const reconciliar = useReconciliarHoja();

  const addFaltante = () => setFaltantes([...faltantes, { descripcion: "", cantidad_esperada: 0, cantidad_real: 0 }]);
  const removeFaltante = (i: number) => setFaltantes(faltantes.filter((_, idx) => idx !== i));
  const updateFaltante = (i: number, field: keyof ItemFaltante, value: any) => {
    const upd = [...faltantes];
    upd[i] = { ...upd[i], [field]: value };
    setFaltantes(upd);
  };

  const handleSave = () => {
    reconciliar.mutate(
      {
        hojaId,
        estado: clasificacion,
        observaciones: `Sello: ${sello}. Firma: ${firma}. ${observaciones}`,
        itemsFaltantes: clasificacion === "faltante" ? faltantes : undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#c41e3a]" /> Reconciliar {folio}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: photo */}
          <div>
            {fotoUrl ? (
              <img src={fotoUrl} alt="Hoja sellada" className="w-full rounded border object-contain max-h-[400px] bg-gray-50" />
            ) : (
              <div className="h-48 bg-gray-100 rounded flex items-center justify-center text-sm text-muted-foreground">
                Sin foto capturada
              </div>
            )}
          </div>

          {/* Right: form */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Sello presente</Label>
              <RadioGroup value={sello} onValueChange={setSello} className="flex gap-4 mt-1">
                <div className="flex items-center gap-1"><RadioGroupItem value="si" id="s-si" /><Label htmlFor="s-si" className="text-xs">Sí</Label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="no" id="s-no" /><Label htmlFor="s-no" className="text-xs">No</Label></div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs">Firma presente</Label>
              <RadioGroup value={firma} onValueChange={setFirma} className="flex gap-4 mt-1">
                <div className="flex items-center gap-1"><RadioGroupItem value="si" id="f-si" /><Label htmlFor="f-si" className="text-xs">Sí</Label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="no" id="f-no" /><Label htmlFor="f-no" className="text-xs">No</Label></div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs">Clasificación</Label>
              <Select value={clasificacion} onValueChange={setClasificacion}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">Completo</SelectItem>
                  <SelectItem value="faltante">Faltante</SelectItem>
                  <SelectItem value="no_llego">No llegó</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales..."
                className="text-sm h-20"
              />
            </div>

            {clasificacion === "faltante" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold">Items faltantes</Label>
                  <Button variant="outline" size="sm" onClick={addFaltante}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                </div>
                {faltantes.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-end">
                    <div className="flex-1">
                      <Input value={f.descripcion} onChange={(e) => updateFaltante(i, "descripcion", e.target.value)} placeholder="Producto" className="h-7 text-xs" />
                    </div>
                    <div className="w-16">
                      <Input type="number" value={f.cantidad_esperada || ""} onChange={(e) => updateFaltante(i, "cantidad_esperada", +e.target.value)} placeholder="Esp." className="h-7 text-xs" />
                    </div>
                    <div className="w-16">
                      <Input type="number" value={f.cantidad_real || ""} onChange={(e) => updateFaltante(i, "cantidad_real", +e.target.value)} placeholder="Real" className="h-7 text-xs" />
                    </div>
                    <button onClick={() => removeFaltante(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={reconciliar.isPending} className="bg-[#c41e3a] hover:bg-[#a01830] text-white">
            {reconciliar.isPending ? "Guardando..." : "Guardar Reconciliación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
