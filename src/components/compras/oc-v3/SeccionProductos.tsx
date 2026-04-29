import { useEffect, useMemo, useState } from "react";
import { Plus, X, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { LineaOC, ProductoLite } from "./types";

interface Props {
  proveedorId: string | null;
  lineas: LineaOC[];
  setLineas: React.Dispatch<React.SetStateAction<LineaOC[]>>;
}

export default function SeccionProductos({ proveedorId, lineas, setLineas }: Props) {
  const [productos, setProductos] = useState<ProductoLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!proveedorId) {
      setProductos([]);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("proveedor_productos")
        .select("costo_proveedor, productos!inner(id, codigo, nombre, precio_compra, activo)")
        .eq("proveedor_id", proveedorId);
      if (!error && data) {
        const list: ProductoLite[] = (data as any[])
          .filter((r) => r.productos?.activo === true)
          .map((r) => ({
            id: r.productos.id,
            codigo: r.productos.codigo,
            nombre: r.productos.nombre,
            precio_compra: r.productos.precio_compra ?? 0,
            costo_proveedor: r.costo_proveedor ?? null,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setProductos(list);
      }
      setLoading(false);
    })();
  }, [proveedorId]);

  const productosDisponibles = useMemo(() => {
    const usados = new Set(lineas.map((l) => l.producto_id));
    return productos.filter((p) => !usados.has(p.id));
  }, [productos, lineas]);

  const agregarProducto = (p: ProductoLite) => {
    const precio = p.costo_proveedor ?? p.precio_compra ?? 0;
    setLineas((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        producto_id: p.id,
        producto: p,
        cantidad: 1,
        precio_unitario: Number(precio) || 0,
      },
    ]);
    setOpen(false);
  };

  const updateLinea = (uid: string, patch: Partial<LineaOC>) => {
    setLineas((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  };

  const eliminarLinea = (uid: string) => {
    setLineas((prev) => prev.filter((l) => l.uid !== uid));
  };

  return (
    <section className="rounded-xl border border-ink-100 bg-white p-8 shadow-xs-soft">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-medium">Sección 2</p>
        <h2 className="font-serif italic text-2xl text-ink-900 mt-1">Qué le compras.</h2>
      </div>

      {!proveedorId ? (
        <p className="text-sm text-ink-400 italic font-serif">Selecciona un proveedor primero.</p>
      ) : (
        <>
          {lineas.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-ink-100 mb-4">
              <table className="w-full text-sm">
                <thead className="bg-bg-soft">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink-500">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium w-32 text-right">Cantidad</th>
                    <th className="px-4 py-3 font-medium w-40 text-right">Precio unitario</th>
                    <th className="px-4 py-3 font-medium w-36 text-right">Subtotal</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {lineas.map((l) => {
                    const subtotal = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
                    return (
                      <tr key={l.uid} className="hover:bg-bg-soft/50">
                        <td className="px-4 py-3">
                          <div className="text-ink-900">{l.producto.nombre}</div>
                          <div className="text-xs text-ink-400">{l.producto.codigo}</div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={l.cantidad}
                            onChange={(e) => updateLinea(l.uid, { cantidad: Number(e.target.value) || 0 })}
                            className="h-9 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={l.precio_unitario}
                            onChange={(e) => updateLinea(l.uid, { precio_unitario: Number(e.target.value) || 0 })}
                            className="h-9 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                          ${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => eliminarLinea(l.uid)}
                            className="p-1.5 rounded hover:bg-ink-100 text-ink-400 hover:text-crimson-500 transition-colors"
                            aria-label="Eliminar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={loading || productosDisponibles.length === 0} className="gap-2">
                <Plus className="h-4 w-4" />
                {loading
                  ? "Cargando productos..."
                  : productosDisponibles.length === 0 && productos.length > 0
                    ? "Todos los productos agregados"
                    : "Agregar producto"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0 bg-popover" align="start">
              <Command>
                <CommandInput placeholder="Buscar producto..." />
                <CommandList>
                  <CommandEmpty>
                    {productos.length === 0
                      ? "Este proveedor no tiene productos asociados."
                      : "No se encontraron productos."}
                  </CommandEmpty>
                  <CommandGroup>
                    {productosDisponibles.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.codigo} ${p.nombre}`}
                        onSelect={() => agregarProducto(p)}
                      >
                        <div className="flex flex-col flex-1">
                          <span className="text-ink-900">{p.nombre}</span>
                          <span className="text-xs text-ink-400">{p.codigo}</span>
                        </div>
                        <span className="text-xs tabular-nums text-ink-500 ml-2">
                          ${Number(p.costo_proveedor ?? p.precio_compra ?? 0).toFixed(2)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </>
      )}
    </section>
  );
}
