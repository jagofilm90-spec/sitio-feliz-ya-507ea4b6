import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Truck, Users, FileText } from "lucide-react";
import { useEmpleadosPorPuesto, useTerminarSurtido } from "@/hooks/useAlmacenSurtido";

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoId: string;
  entregaId: string;
  onSuccess: () => void;
}

export default function AsignarCuadrillaDialog({ open, onClose, pedidoId, entregaId, onSuccess }: Props) {
  const [choferId, setChoferId] = useState("");
  const [ayudantes, setAyudantes] = useState<string[]>([]);
  const [hojaGenerada, setHojaGenerada] = useState<any>(null);

  const { data: choferes } = useEmpleadosPorPuesto("chofer");
  const { data: todosEmpleados } = useEmpleadosPorPuesto();
  const terminar = useTerminarSurtido();

  const handleGenerar = async () => {
    const cuadrilla = [
      { empleado_id: choferId, rol: "chofer" as const },
      ...ayudantes.map((id, idx) => ({
        empleado_id: id,
        rol: "ayudante" as const,
        orden_ayudante: idx + 1,
      })),
    ];

    const result = await terminar.mutateAsync({ pedido_id: pedidoId, entrega_id: entregaId, cuadrilla });
    setHojaGenerada(result);
  };

  // PDF preview after generation
  if (hojaGenerada) {
    return (
      <Dialog open onOpenChange={() => onSuccess()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#c41e3a]">
              <FileText className="h-5 w-5" /> Hoja de Salida generada
            </DialogTitle>
            <p className="text-sm font-mono">{hojaGenerada.folio}</p>
          </DialogHeader>
          <div className="my-4">
            {hojaGenerada.html ? (
              <iframe srcDoc={hojaGenerada.html} className="w-full h-[60vh] border rounded" />
            ) : (
              <p className="text-center py-12 text-muted-foreground">PDF generado correctamente</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              const w = window.open("", "_blank");
              if (w && hojaGenerada.html) { w.document.write(hojaGenerada.html); w.document.close(); w.print(); }
            }}>
              Imprimir
            </Button>
            <Button onClick={onSuccess} className="bg-[#c41e3a] hover:bg-[#a01830] text-white">
              Despachar y volver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#c41e3a]" /> Asignar cuadrilla
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Chofer */}
          <div>
            <label className="text-sm font-medium flex items-center mb-2">
              <Truck className="mr-2 h-4 w-4 text-[#c41e3a]" /> Chofer
            </label>
            <Select value={choferId} onValueChange={setChoferId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecciona chofer..." />
              </SelectTrigger>
              <SelectContent>
                {(choferes || todosEmpleados || []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ayudantes */}
          <div>
            <label className="text-sm font-medium flex items-center mb-2">
              <Users className="mr-2 h-4 w-4 text-[#c41e3a]" /> Ayudantes
            </label>
            {ayudantes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {ayudantes.map((id) => {
                  const emp = todosEmpleados?.find((e: any) => e.id === id);
                  return (
                    <Badge key={id} variant="outline" className="pl-3 pr-1 py-1">
                      {emp?.nombre_completo || id.slice(0, 8)}
                      <button onClick={() => setAyudantes(ayudantes.filter((a) => a !== id))} className="ml-1 hover:bg-muted rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <Select onValueChange={(v) => { if (!ayudantes.includes(v)) setAyudantes([...ayudantes, v]); }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Agregar ayudante..." />
              </SelectTrigger>
              <SelectContent>
                {(todosEmpleados || [])
                  .filter((e: any) => e.id !== choferId && !ayudantes.includes(e.id))
                  .map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="p-3 bg-[#c41e3a]/5 border-[#c41e3a]/20">
            <p className="text-xs text-[#c41e3a]">
              <FileText className="inline h-3 w-3 mr-1" />
              Se generará Hoja de Salida automática con folio HS-YYYYMM-NNNN
            </p>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleGenerar}
            disabled={!choferId || terminar.isPending}
            className="bg-[#c41e3a] hover:bg-[#a01830] text-white"
          >
            {terminar.isPending ? "Generando..." : "Generar Hoja de Salida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
