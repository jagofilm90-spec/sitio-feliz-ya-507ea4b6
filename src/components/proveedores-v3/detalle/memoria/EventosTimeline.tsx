import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventosProveedor } from "@/hooks/useProveedorMemoria";
import { EventoItem } from "./EventoItem";
import { ModalAgregarEvento } from "./ModalAgregarEvento";

interface Props {
  proveedorId: string;
  proveedorNombre: string;
}

type Filtro = "todos" | "auto" | "manual";

export function EventosTimeline({ proveedorId, proveedorNombre }: Props) {
  const { data: eventos, isLoading } = useEventosProveedor(proveedorId);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const list = eventos || [];
  const showFilters = list.length > 5;

  const filtered = useMemo(() => {
    if (filtro === "todos") return list;
    return list.filter((e) => e.origen === filtro);
  }, [list, filtro]);

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className="text-[18px] text-ink-900 leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Historial de <em>eventos</em>
          </h3>
          <p
            className="text-xs text-ink-500 italic mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Auto + manuales · cronológico
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs"
        >
          + Agregar evento
        </Button>
      </div>

      {showFilters && (
        <div className="flex gap-1.5 mb-3">
          {(["todos", "auto", "manual"] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                filtro === f
                  ? "bg-ink-900 text-white border-ink-900"
                  : "bg-white text-ink-700 border-ink-200 hover:border-ink-300"
              }`}
            >
              {f === "todos" ? "Todos" : f === "auto" ? "Auto" : "Manuales"}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[68px] rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 px-6 border border-dashed border-ink-200 rounded-xl bg-white">
          <div className="text-4xl mb-2">📋</div>
          <h4
            className="text-base text-ink-900 mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Sin eventos registrados
          </h4>
          <p className="text-xs text-ink-500 italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Los eventos automáticos aparecerán cuando recibas OCs
          </p>
          <p className="text-xs text-ink-500 italic mt-0.5" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Puedes agregar notas manuales con el botón arriba
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {filtered.map((e) => (
            <EventoItem key={e.id} evento={e} proveedorId={proveedorId} />
          ))}
        </div>
      )}

      <ModalAgregarEvento
        proveedorId={proveedorId}
        proveedorNombre={proveedorNombre}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
