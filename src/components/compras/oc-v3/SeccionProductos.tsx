import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  type LineaOC,
  type ProductoLite,
  calcularPesoLinea,
  calcularSubtotalLinea,
} from "./types";
import { PrecioHint } from "./PrecioHint";

interface Props {
  proveedorId: string | null;
  lineas: LineaOC[];
  setLineas: React.Dispatch<React.SetStateAction<LineaOC[]>>;
}

const fmt2 = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PrecioSugeridoResult = {
  precio: number;
  origen: 'oc' | 'cotizacion' | 'manual' | 'fallback_catalogo' | 'primera_vez';
  vigente_desde: string | null;
  oc_folio: string | null;
};

async function obtenerPrecioSugerido(
  productoId: string,
  proveedorId: string,
  fallbackProducto: number | null,
): Promise<PrecioSugeridoResult> {
  // 1) M02.5 Pilar I: vigente trackeado o fallback a proveedor_productos
  const { data, error } = await supabase.rpc('fn_obtener_precio_sugerido' as any, {
    p_proveedor_id: proveedorId,
    p_producto_id: productoId,
  });

  if (!error && data && Array.isArray(data) && data.length > 0) {
    const r = data[0] as any;
    return {
      precio: Number(r.precio),
      origen: r.origen,
      vigente_desde: r.vigente_desde,
      oc_folio: r.oc_folio,
    };
  }

  // 2) Último recurso: precio_compra del catálogo de productos
  if (fallbackProducto != null && Number(fallbackProducto) > 0) {
    return {
      precio: Number(fallbackProducto),
      origen: 'primera_vez',
      vigente_desde: null,
      oc_folio: null,
    };
  }

  return { precio: 0, origen: 'primera_vez', vigente_desde: null, oc_folio: null };
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
        .select(
          "costo_proveedor, productos!inner(id, codigo, nombre, precio_compra, activo, aplica_iva, aplica_ieps, tasa_ieps, precio_por_kilo, peso_kg)",
        )
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
            aplica_iva: !!r.productos.aplica_iva,
            aplica_ieps: !!r.productos.aplica_ieps,
            tasa_ieps: r.productos.tasa_ieps ?? null,
            precio_por_kilo: !!r.productos.precio_por_kilo,
            peso_kg: r.productos.peso_kg ?? null,
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

  const agregarProducto = async (p: ProductoLite) => {
    setOpen(false);
    const sugerido = proveedorId
      ? await obtenerPrecioSugerido(p.id, proveedorId, p.precio_compra)
      : {
          precio: Number(p.costo_proveedor ?? p.precio_compra ?? 0),
          origen: 'primera_vez' as const,
          vigente_desde: null,
          oc_folio: null,
        };

    setLineas((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        producto_id: p.id,
        producto: p,
        cantidad: 1,
        cantidadStr: "1",
        precio_unitario: sugerido.precio,
        precioStr: sugerido.precio.toFixed(2),
        precio_origen: sugerido.origen,
        precio_sugerido_inicial: sugerido.precio,
        precio_vigente_desde: sugerido.vigente_desde,
        precio_oc_folio: sugerido.oc_folio,
      },
    ]);
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
                    <th className="px-3 py-3 font-medium w-24 text-right">Cantidad</th>
                    <th className="px-3 py-3 font-medium w-24 text-right">Peso (kg)</th>
                    <th className="px-3 py-3 font-medium w-40 text-right">Precio unit.</th>
                    <th className="px-4 py-3 font-medium w-32 text-right">Subtotal</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {lineas.map((l) => {
                    const peso = calcularPesoLinea(l);
                    const subtotal = calcularSubtotalLinea(l);
                    const porKilo = l.producto.precio_por_kilo;
                    return (
                      <tr key={l.uid} className="hover:bg-bg-soft/50 align-top">
                        <td className="px-4 py-3">
                          <div className="text-ink-900">{l.producto.nombre}</div>
                          <div className="text-xs text-ink-400">{l.producto.codigo}</div>
                          {(l.producto.aplica_iva || l.producto.aplica_ieps) && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {l.producto.aplica_iva && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-muted-foreground">
                                  IVA 16%
                                </span>
                              )}
                              {l.producto.aplica_ieps && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-muted-foreground">
                                  IEPS {Number(l.producto.tasa_ieps ?? 0)}%
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={l.cantidadStr}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              updateLinea(l.uid, {
                                cantidadStr: val,
                                cantidad: parseInt(val, 10) || 0,
                              });
                            }}
                            onBlur={() => {
                              if (l.cantidadStr === "" || l.cantidadStr === "0") {
                                updateLinea(l.uid, { cantidadStr: "1", cantidad: 1 });
                              } else {
                                const clean = String(parseInt(l.cantidadStr, 10) || 1);
                                updateLinea(l.uid, { cantidadStr: clean, cantidad: parseInt(clean, 10) });
                              }
                            }}
                            className="h-9 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-500">
                          {fmt2(peso)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              $
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={l.precioStr}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9.]/g, "");
                                const parts = val.split(".");
                                if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
                                updateLinea(l.uid, {
                                  precioStr: val,
                                  precio_unitario: parseFloat(val) || 0,
                                });
                              }}
                              onBlur={() => {
                                const num = parseFloat(l.precioStr) || 0;
                                updateLinea(l.uid, {
                                  precioStr: num.toFixed(2),
                                  precio_unitario: num,
                                });
                              }}
                              className="h-9 pl-6 pr-12 text-right tabular-nums"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                              {porKilo ? "/ kg" : "/ bulto"}
                            </span>
                          </div>
                          <PrecioHint linea={l} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                          ${fmt2(subtotal)}
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
              <Button variant="outline" disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                {loading ? "Cargando productos..." : "Agregar producto"}
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