import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Plus, Trash2, Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useReconciliarHoja, useProcesarHojaConIA } from "@/hooks/useHojaSalida";

interface Props {
  open: boolean;
  onClose: () => void;
  hojaId: string;
  folio: string;
  fotoUrl?: string | null;
  iaData?: {
    ia_procesada_at?: string | null;
    ia_clasificacion?: string | null;
    ia_sello_detectado?: boolean | null;
    ia_firma_detectada?: boolean | null;
    ia_observaciones_texto?: string | null;
    ia_raw_response?: any;
  } | null;
}

interface ItemFaltante {
  descripcion: string;
  cantidad_esperada: number;
  cantidad_real: number;
}

export default function ReconciliarHojaDialog({ open, onClose, hojaId, folio, fotoUrl, iaData }: Props) {
  const [sello, setSello] = useState<string>(iaData?.ia_sello_detectado ? "si" : "no");
  const [firma, setFirma] = useState<string>(iaData?.ia_firma_detectada ? "si" : "no");
  const [clasificacion, setClasificacion] = useState(iaData?.ia_clasificacion || "completo");
  const [observaciones, setObservaciones] = useState(iaData?.ia_observaciones_texto || "");
  const [faltantes, setFaltantes] = useState<ItemFaltante[]>([]);
  const reconciliar = useReconciliarHoja();
  const procesarIA = useProcesarHojaConIA();

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

  const handleReprocesar = () => {
    if (!fotoUrl) return;
    procesarIA.mutate({ hoja_salida_id: hojaId, foto_url: fotoUrl });
  };

  // Use fresh IA data from mutation if available
  const currentIA = procesarIA.data
    ? {
        ia_procesada_at: new Date().toISOString(),
        ia_clasificacion: procesarIA.data.clasificacion,
        ia_sello_detectado: procesarIA.data.sello_detectado,
        ia_firma_detectada: procesarIA.data.firma_detectada,
        ia_observaciones_texto: procesarIA.data.observaciones_texto,
        sello_confianza: procesarIA.data.sello_confianza,
        firma_confianza: procesarIA.data.firma_confianza,
      }
    : iaData;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#c41e3a]" /> Reconciliar {folio}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column: photo + IA panel */}
          <div className="space-y-3">
            {fotoUrl ? (
              <img src={fotoUrl} alt="Hoja sellada" className="w-full rounded border object-contain max-h-[300px] bg-gray-50" />
            ) : (
              <div className="h-48 bg-gray-100 rounded flex items-center justify-center text-sm text-muted-foreground">
                Sin foto capturada
              </div>
            )}

            {/* IA Results Panel */}
            {currentIA?.ia_procesada_at && (
              <Card className="border-[#c41e3a]/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-[#c41e3a]" /> Análisis IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sello</span>
                    <div className="flex items-center gap-1">
                      {currentIA.ia_sello_detectado ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-500" />}
                      <span>{currentIA.ia_sello_detectado ? "Detectado" : "No detectado"}</span>
                      {(currentIA as any).sello_confianza != null && (
                        <span className="text-muted-foreground">({(currentIA as any).sello_confianza}%)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Firma</span>
                    <div className="flex items-center gap-1">
                      {currentIA.ia_firma_detectada ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-500" />}
                      <span>{currentIA.ia_firma_detectada ? "Detectada" : "No detectada"}</span>
                      {(currentIA as any).firma_confianza != null && (
                        <span className="text-muted-foreground">({(currentIA as any).firma_confianza}%)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Clasificación</span>
                    <Badge className={
                      currentIA.ia_clasificacion === "completo" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }>{currentIA.ia_clasificacion}</Badge>
                  </div>
                  {currentIA.ia_observaciones_texto && (
                    <div className="bg-gray-50 rounded p-2 mt-1">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Observaciones leídas:</p>
                      <p className="text-xs italic">"{currentIA.ia_observaciones_texto}"</p>
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground">
                    Procesado: {new Date(currentIA.ia_procesada_at).toLocaleString("es-MX")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Re-process button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleReprocesar}
              disabled={!fotoUrl || procesarIA.isPending}
            >
              {procesarIA.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Procesando...</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" /> {currentIA?.ia_procesada_at ? "Re-procesar con IA" : "Procesar con IA"}</>
              )}
            </Button>
          </div>

          {/* Right column: form */}
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
