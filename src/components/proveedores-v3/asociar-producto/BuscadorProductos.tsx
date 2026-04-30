import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export interface ProductoBuscado {
  id: string;
  nombre: string;
  marca: string | null;
  especificaciones: string | null;
  codigo: string | null;
  peso_kg: number | null;
  precio_por_kilo: boolean | null;
  aplica_iva: boolean | null;
  aplica_ieps: boolean | null;
}

interface Props {
  proveedorId: string;
  selected: ProductoBuscado | null;
  onSelect: (p: ProductoBuscado | null) => void;
}

export const BuscadorProductos = ({ proveedorId, selected, onSelect }: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<ProductoBuscado[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (selected) return;
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const term = `%${debounced.trim()}%`;
      // Get already associated products (including soft-deleted to avoid duplicates UI)
      const { data: linked } = await supabase
        .from("proveedor_productos")
        .select("producto_id")
        .eq("proveedor_id", proveedorId)
        .eq("activo", true);
      const excluded = new Set((linked || []).map((l: any) => l.producto_id));

      const { data, error } = await supabase
        .from("productos")
        .select(
          "id, nombre, marca, especificaciones, codigo, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps"
        )
        .eq("activo", true)
        .or(`nombre.ilike.${term},marca.ilike.${term},codigo.ilike.${term}`)
        .order("nombre")
        .limit(30);

      if (cancelled) return;
      if (error) {
        setResults([]);
      } else {
        setResults((data || []).filter((p: any) => !excluded.has(p.id)));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, proveedorId, selected]);

  if (selected) {
    return (
      <div>
        <label className="block text-xs uppercase tracking-wider text-ink-500 font-medium mb-2">
          Producto a asociar
        </label>
        <div className="bg-bg-warm border border-ink-100 rounded-lg px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-ink-900 truncate">{selected.nombre}</div>
            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-ink-500">
              {selected.marca && <span>{selected.marca}</span>}
              {selected.especificaciones && <span>· {selected.especificaciones}</span>}
              <span className="inline-flex items-center px-1.5 py-px rounded bg-ink-50 text-ink-700 font-medium">
                {selected.precio_por_kilo ? "/ kg" : "/ bulto"}
              </span>
              {selected.aplica_iva && (
                <span className="inline-flex items-center px-1.5 py-px rounded bg-blue-50 text-blue-700 font-semibold">
                  IVA
                </span>
              )}
              {selected.aplica_ieps && (
                <span className="inline-flex items-center px-1.5 py-px rounded bg-amber-50 text-amber-700 font-semibold">
                  IEPS
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery("");
              setResults([]);
            }}
            className="text-xs font-medium text-crimson-700 hover:text-crimson-900 shrink-0"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs uppercase tracking-wider text-ink-500 font-medium mb-2">
        Producto a asociar <span className="text-crimson-700">*</span>
      </label>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
        />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="BUSCAR POR NOMBRE, MARCA O CÓDIGO..."
          style={{ textTransform: "uppercase" }}
          className="pl-9"
        />
      </div>
      {open && debounced.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-ink-100 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-xs text-ink-500">Buscando…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-ink-700 font-medium">No se encontraron productos</p>
              <p className="text-xs text-ink-500 mt-1">
                Verifica el nombre o crea el producto primero
              </p>
              <button
                type="button"
                onClick={() => navigate("/productos")}
                className="text-xs font-medium text-crimson-700 hover:text-crimson-900 mt-2"
              >
                Ir a Productos →
              </button>
            </div>
          )}
          {!loading &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-bg-warm transition-colors border-b last:border-b-0 border-ink-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-900 text-sm truncate">{p.nombre}</div>
                    <div className="text-[11px] text-ink-500 truncate">
                      {[p.marca, p.especificaciones, p.codigo].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium bg-ink-50 text-ink-700">
                      {p.precio_por_kilo ? "/ kg" : "/ bulto"}
                    </span>
                    {p.aplica_iva && (
                      <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                        IVA
                      </span>
                    )}
                    {p.aplica_ieps && (
                      <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                        IEPS
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
