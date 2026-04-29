import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  fechaEntrega: string;
  setFechaEntrega: (s: string) => void;
  notas: string;
  setNotas: (s: string) => void;
  notasInternas: string;
  setNotasInternas: (s: string) => void;
}

export default function SeccionEntrega({
  fechaEntrega,
  setFechaEntrega,
  notas,
  setNotas,
  notasInternas,
  setNotasInternas,
}: Props) {
  return (
    <section className="rounded-xl border border-ink-100 bg-white p-8 shadow-xs-soft">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-medium">Sección 3</p>
        <h2 className="font-serif italic text-2xl text-ink-900 mt-1">Cuándo te llega.</h2>
      </div>

      <div className="space-y-6">
        <div className="max-w-xs">
          <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Fecha de entrega esperada</Label>
          <Input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Notas al proveedor</Label>
          <Textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Visible para el proveedor en la OC..."
            className="mt-2 min-h-[80px]"
          />
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Notas internas</Label>
          <Textarea
            value={notasInternas}
            onChange={(e) => setNotasInternas(e.target.value)}
            placeholder="Solo visible para tu equipo..."
            className="mt-2 min-h-[80px]"
          />
        </div>
      </div>
    </section>
  );
}
