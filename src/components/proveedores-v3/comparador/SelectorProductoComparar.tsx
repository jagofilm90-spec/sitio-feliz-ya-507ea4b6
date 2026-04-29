import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductosMultiProveedor } from "@/hooks/useComparadorPrecios";
import { ModalComparador } from "./ModalComparador";

interface Props {
  onClose: () => void;
}

export const SelectorProductoComparar = ({ onClose }: Props) => {
  const { data, isLoading } = useProductosMultiProveedor(true);
  const [search, setSearch] = useState("");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [data, search]);

  if (seleccionado) {
    return (
      <ModalComparador
        productoId={seleccionado}
        onClose={() => {
          setSeleccionado(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] p-0 gap-0">
        <div className="px-8 pt-7 pb-4 border-b border-ink-100">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            Comparador · elige producto
          </div>
          <h2 className="font-serif text-2xl font-medium text-ink-900 mt-1">
            ¿Qué producto quieres comparar?
          </h2>
          <p className="font-serif italic text-sm text-ink-500 mt-1">
            Solo productos asociados a 2+ proveedores
          </p>
        </div>

        <div className="px-8 py-5">
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />

          <div className="max-h-[360px] overflow-y-auto -mx-2">
            {isLoading && (
              <div className="space-y-2 px-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-10 px-4">
                <div className="text-3xl mb-2">📦</div>
                <p className="font-serif italic text-sm text-ink-500">
                  {data && data.length === 0
                    ? "Necesitas asociar un producto a 2 o más proveedores antes de poder comparar precios."
                    : "Sin coincidencias"}
                </p>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <ul className="space-y-1">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSeleccionado(p.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-bg-warm transition-colors"
                    >
                      <div className="font-medium text-ink-900 text-sm">{p.nombre}</div>
                      <div className="text-xs text-ink-500 italic">
                        Disponible en {p.proveedores_count} proveedores ·{" "}
                        {p.precio_por_kilo ? "por kg" : "por bulto"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
