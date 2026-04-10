import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";
import { getDisplayName } from "@/lib/productUtils";
import {
  Package,
  Scale,
  Box,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface ProductoModoCobro {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  unidad: string | null;
  contenido_empaque: string | null;
  peso_kg: number | null;
  precio_por_kilo: boolean;
  categoria_id: string | null;
  categoria_nombre: string | null;
}

// ── Component ──────────────────────────────────────────

export default function ProductosModoCobro() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categorias = [] } = useCategorias();

  // Filters
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [modoFilter, setModoFilter] = useState("all");

  // Change tracking: Map<productoId, newValue>
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // ── Fetch products ──────────────────────────────────

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["productos-modo-cobro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select(
          "id, codigo, nombre, especificaciones, marca, unidad, contenido_empaque, peso_kg, precio_por_kilo, categoria_id, categorias_productos(nombre)"
        )
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("nombre");
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        especificaciones: p.especificaciones,
        marca: p.marca,
        unidad: p.unidad,
        contenido_empaque: p.contenido_empaque,
        peso_kg: p.peso_kg,
        precio_por_kilo: p.precio_por_kilo,
        categoria_id: p.categoria_id,
        categoria_nombre: p.categorias_productos?.nombre ?? null,
      })) as ProductoModoCobro[];
    },
  });

  // ── Effective value (in-memory override or DB) ──────

  const getEffective = useCallback(
    (p: ProductoModoCobro) =>
      changes.has(p.id) ? changes.get(p.id)! : p.precio_por_kilo,
    [changes]
  );

  // ── Stats ───────────────────────────────────────────

  const stats = useMemo(() => {
    let porKilo = 0;
    let porPieza = 0;
    let sinPeso = 0;
    for (const p of productos) {
      const eff = getEffective(p);
      if (eff) {
        porKilo++;
        if (p.peso_kg == null || p.peso_kg <= 0) sinPeso++;
      } else {
        porPieza++;
      }
    }
    return { total: productos.length, porKilo, porPieza, sinPeso };
  }, [productos, getEffective]);

  // ── Filtered list ───────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return productos.filter((p) => {
      // Search
      if (q) {
        const haystack = `${p.codigo} ${p.nombre} ${p.marca ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Category
      if (categoriaFilter !== "all" && p.categoria_id !== categoriaFilter)
        return false;
      // Modo
      if (modoFilter !== "all") {
        const eff = getEffective(p);
        if (modoFilter === "kilo" && !eff) return false;
        if (modoFilter === "pieza" && eff) return false;
      }
      return true;
    });
  }, [productos, search, categoriaFilter, modoFilter, getEffective]);

  // ── Toggle handler ──────────────────────────────────

  const handleToggle = useCallback(
    (p: ProductoModoCobro, newVal: boolean) => {
      setChanges((prev) => {
        const next = new Map(prev);
        // If toggling back to original, remove from changes
        if (newVal === p.precio_por_kilo) {
          next.delete(p.id);
        } else {
          next.set(p.id, newVal);
        }
        return next;
      });
    },
    []
  );

  // ── Discard ─────────────────────────────────────────

  const handleDiscard = useCallback(() => setChanges(new Map()), []);

  // ── Apply ───────────────────────────────────────────

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      // Group by new value
      const toTrue: string[] = [];
      const toFalse: string[] = [];
      for (const [id, val] of changes) {
        if (val) toTrue.push(id);
        else toFalse.push(id);
      }

      const promises: Promise<any>[] = [];

      if (toTrue.length > 0) {
        promises.push(
          supabase
            .from("productos")
            .update({ precio_por_kilo: true, updated_at: new Date().toISOString() })
            .in("id", toTrue)
            .then(({ error }) => { if (error) throw error; })
        );
      }
      if (toFalse.length > 0) {
        promises.push(
          supabase
            .from("productos")
            .update({ precio_por_kilo: false, updated_at: new Date().toISOString() })
            .in("id", toFalse)
            .then(({ error }) => { if (error) throw error; })
        );
      }

      await Promise.all(promises);

      toast({
        title: `${changes.size} producto${changes.size > 1 ? "s" : ""} actualizado${changes.size > 1 ? "s" : ""} correctamente`,
      });

      setChanges(new Map());
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["productos-modo-cobro"] });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
    } catch (err: any) {
      toast({
        title: "Error al actualizar",
        description: err?.message || "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  }, [changes, toast, queryClient]);

  // ── Render ──────────────────────────────────────────

  const pendingCount = changes.size;

  return (
    <Layout>
      <PageHeader
        eyebrow="Catálogos"
        title="Modo de"
        titleAccent="cobro."
        lead="Define cómo se cobra cada producto — por kilo o por pieza."
      />

      {/* ── Stats tiles ─────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Total productos"
          value={stats.total}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Por kilo"
          value={stats.porKilo}
          icon={<Scale className="h-4 w-4" />}
        />
        <StatCard
          label="Por pieza"
          value={stats.porPieza}
          icon={<Box className="h-4 w-4" />}
        />
        <StatCard
          label="Sin peso asignado"
          value={stats.sinPeso}
          icon={<AlertTriangle className="h-4 w-4" />}
          className={
            stats.sinPeso > 0
              ? "border-amber-300 bg-amber-50/40"
              : undefined
          }
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Buscar por código, nombre o marca…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modoFilter} onValueChange={setModoFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Modo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="kilo">Por kilo</SelectItem>
            <SelectItem value="pieza">Por pieza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-ink-400 mb-3">
        Mostrando {filtered.length} de {productos.length} productos.
      </p>

      {/* ── Table ───────────────────────────────────── */}
      <div
        className="rounded-xl border border-ink-100 bg-white overflow-hidden"
        style={{ maxHeight: 600 }}
      >
        <div className="overflow-auto" style={{ maxHeight: 600 }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-ink-50/50">
                <TableHead className="w-[90px] px-3 py-2 text-[11px] uppercase tracking-wider text-ink-400">
                  Código
                </TableHead>
                <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-ink-400">
                  Producto
                </TableHead>
                <TableHead className="w-[140px] px-3 py-2 text-[11px] uppercase tracking-wider text-ink-400">
                  Categoría
                </TableHead>
                <TableHead className="w-[80px] px-3 py-2 text-right text-[11px] uppercase tracking-wider text-ink-400">
                  Peso kg
                </TableHead>
                <TableHead className="w-[180px] px-3 py-2 text-right text-[11px] uppercase tracking-wider text-ink-400">
                  Modo de cobro
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-ink-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando productos…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-ink-400">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const eff = getEffective(p);
                  const hasChange = changes.has(p.id);
                  return (
                    <TableRow
                      key={p.id}
                      className={hasChange ? "bg-cream-100/60" : undefined}
                    >
                      {/* Indicator dot + código */}
                      <TableCell className="px-3 py-1.5">
                        <span className="flex items-center gap-1.5">
                          {hasChange && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-crimson-500 shrink-0" />
                          )}
                          <span className="font-mono text-xs text-ink-500">
                            {p.codigo}
                          </span>
                        </span>
                      </TableCell>

                      {/* Display name */}
                      <TableCell className="px-3 py-1.5 text-sm text-ink-800">
                        {getDisplayName(p)}
                      </TableCell>

                      {/* Categoría */}
                      <TableCell className="px-3 py-1.5">
                        {p.categoria_nombre ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 font-normal"
                          >
                            {p.categoria_nombre}
                          </Badge>
                        ) : (
                          <span className="text-xs text-ink-300">—</span>
                        )}
                      </TableCell>

                      {/* Peso kg */}
                      <TableCell className="px-3 py-1.5 text-right tabular-nums text-sm text-ink-600">
                        {p.peso_kg != null && p.peso_kg > 0
                          ? p.peso_kg
                          : <span className="text-ink-300">—</span>}
                      </TableCell>

                      {/* Toggle */}
                      <TableCell className="px-3 py-1.5 text-right">
                        <SegmentedToggle
                          value={eff}
                          onChange={(v) => handleToggle(p, v)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Sticky footer ───────────────────────────── */}
      {pendingCount > 0 && (
        <div className="sticky bottom-0 mt-6 -mx-6 sm:-mx-8 lg:-mx-12 px-6 sm:px-8 lg:px-12 py-4 bg-white/95 backdrop-blur border-t border-ink-100 flex items-center justify-between gap-4 z-10">
          <span className="text-sm text-ink-600">
            ← <strong className="font-semibold">{pendingCount}</strong>{" "}
            producto{pendingCount > 1 ? "s" : ""} con cambios pendientes
          </span>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleDiscard}>
              Descartar
            </Button>
            <Button
              size="sm"
              className="bg-crimson-500 hover:bg-crimson-600 text-white"
              onClick={() => setConfirmOpen(true)}
            >
              Aplicar cambios
            </Button>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ──────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Aplicar {pendingCount} cambio{pendingCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vas a actualizar el modo de cobro de {pendingCount} producto
              {pendingCount > 1 ? "s" : ""}. Esta acción se puede deshacer
              editando productos individualmente desde el form de producto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApply}
              disabled={applying}
              className="bg-crimson-500 hover:bg-crimson-600"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando…
                </>
              ) : (
                "Sí, aplicar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

// ── Segmented toggle sub-component ────────────────────

function SegmentedToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span className="inline-flex rounded-md border border-ink-200 overflow-hidden text-[11px] font-medium leading-none">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-2.5 py-1 transition-colors ${
          value
            ? "bg-crimson-500 text-white"
            : "bg-white text-ink-500 hover:bg-ink-50"
        }`}
      >
        Por kilo
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-2.5 py-1 transition-colors border-l border-ink-200 ${
          !value
            ? "bg-crimson-500 text-white"
            : "bg-white text-ink-500 hover:bg-ink-50"
        }`}
      >
        Por pieza
      </button>
    </span>
  );
}
