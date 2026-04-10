import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import {
  History,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  ArrowRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface HistorialRow {
  id: string;
  producto_id: string;
  precio_anterior: number;
  precio_nuevo: number;
  usuario_id: string | null;
  created_at: string;
  producto_codigo: string | null;
  producto_nombre: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
}

interface UsuarioOption {
  id: string;
  nombre: string;
}

const PAGE_SIZE = 100;

// ── Helpers ────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
}

function formatRelativeOrDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `Hace ${mins} min`;
  }
  if (diffH < 24 && date.getDate() === now.getDate()) {
    const h = Math.floor(diffH);
    return `Hace ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1; // Lunes
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function defaultDesde() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ── Component ──────────────────────────────────────────

export default function ProductosHistorialPrecios() {
  const [rows, setRows] = useState<HistorialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [usuarioFilter, setUsuarioFilter] = useState("all");
  const [desde, setDesde] = useState(defaultDesde());
  const [hasta, setHasta] = useState(todayISO());

  // ── Fetch helper ────────────────────────────────────

  const fetchPage = useCallback(
    async (currentOffset: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);

      try {
        // 1. Historial + producto join
        let query = supabase
          .from("productos_historial_precios")
          .select(
            "id, producto_id, precio_anterior, precio_nuevo, usuario_id, created_at, productos:producto_id ( codigo, nombre )"
          )
          .order("created_at", { ascending: false });

        if (desde) query = query.gte("created_at", `${desde}T00:00:00`);
        if (hasta) query = query.lte("created_at", `${hasta}T23:59:59`);

        const { data, error } = await query.range(
          currentOffset,
          currentOffset + PAGE_SIZE - 1
        );

        if (error) throw error;
        const list = (data || []) as any[];

        // 2. Resolver nombres de usuarios (join lateral via profiles)
        const userIds = Array.from(
          new Set(list.map((r) => r.usuario_id).filter(Boolean))
        ) as string[];

        let profilesMap = new Map<string, { full_name: string | null; email: string | null }>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          for (const p of profiles || []) {
            profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
          }
        }

        const mapped: HistorialRow[] = list.map((r) => {
          const profile = r.usuario_id ? profilesMap.get(r.usuario_id) : null;
          return {
            id: r.id,
            producto_id: r.producto_id,
            precio_anterior: Number(r.precio_anterior),
            precio_nuevo: Number(r.precio_nuevo),
            usuario_id: r.usuario_id,
            created_at: r.created_at,
            producto_codigo: r.productos?.codigo ?? null,
            producto_nombre: r.productos?.nombre ?? null,
            usuario_nombre: profile?.full_name ?? null,
            usuario_email: profile?.email ?? null,
          };
        });

        setRows((prev) => (replace ? mapped : [...prev, ...mapped]));
        setHasMore(list.length === PAGE_SIZE);
        setOffset(currentOffset + list.length);
      } catch (err) {
        console.error("Error cargando historial de precios:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [desde, hasta]
  );

  // Reload when date filters change
  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  // ── Stats (computadas en memoria sobre las filas cargadas) ──

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now).getTime();
    const week = startOfWeek(now).getTime();
    const month = startOfMonth(now).getTime();
    let hoy = 0,
      semana = 0,
      mes = 0;
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (t >= month) mes++;
      if (t >= week) semana++;
      if (t >= today) hoy++;
    }
    return { hoy, semana, mes };
  }, [rows]);

  // ── Usuario options ─────────────────────────────────

  const usuarioOptions: UsuarioOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!r.usuario_id) continue;
      if (!map.has(r.usuario_id)) {
        map.set(r.usuario_id, r.usuario_nombre || r.usuario_email || "Usuario eliminado");
      }
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [rows]);

  // ── Filtered rows ───────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.producto_codigo ?? ""} ${r.producto_nombre ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (usuarioFilter !== "all" && r.usuario_id !== usuarioFilter) return false;
      return true;
    });
  }, [rows, search, usuarioFilter]);

  // ── Render ──────────────────────────────────────────

  return (
    <Layout>
      <PageHeader
        eyebrow="Catálogos"
        title="Historial de"
        titleAccent="precios."
        lead="Todos los cambios de precio registrados automáticamente."
      />

      {/* ── Stats tiles ─────────────────────────────── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-8">
        <StatCard
          label="Cambios hoy"
          value={stats.hoy}
          icon={<CalendarIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Cambios esta semana"
          value={stats.semana}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Cambios este mes"
          value={stats.mes}
          icon={<CalendarRange className="h-4 w-4" />}
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <Input
          placeholder="Buscar producto por código o nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:max-w-xs"
        />
        <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
          <SelectTrigger className="lg:w-52">
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los usuarios</SelectItem>
            {usuarioOptions.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 uppercase tracking-wider">Desde</span>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-[150px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 uppercase tracking-wider">Hasta</span>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      <p className="text-xs text-ink-400 mb-3">
        Mostrando {filtered.length} de {rows.length} cambios cargados.
      </p>

      {/* ── Table ───────────────────────────────────── */}
      <div className="rounded-xl border border-ink-100 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ink-50/50">
              <TableHead className="w-[140px] px-3 py-2 text-[11px] uppercase tracking-wider text-ink-400">
                Fecha
              </TableHead>
              <TableHead className="w-[160px] px-3 py-2 text-[11px] uppercase tracking-wider text-ink-400">
                Usuario
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wider text-ink-400">
                Producto
              </TableHead>
              <TableHead className="w-[220px] px-3 py-2 text-right text-[11px] uppercase tracking-wider text-ink-400">
                Cambio
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-ink-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Cargando historial…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16">
                  <div className="text-center text-ink-400">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium text-ink-500">
                      Sin cambios de precio registrados aún.
                    </p>
                    <p className="text-xs mt-1">
                      Los cambios que se hagan a partir de ahora aparecerán aquí
                      automáticamente.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const delta = r.precio_nuevo - r.precio_anterior;
                const pct =
                  r.precio_anterior > 0
                    ? (delta / r.precio_anterior) * 100
                    : 0;
                const subio = delta > 0;
                const bajo = delta < 0;
                const Icon = subio ? TrendingUp : bajo ? TrendingDown : Minus;
                const colorClass = subio
                  ? "text-emerald-600"
                  : bajo
                  ? "text-crimson-500"
                  : "text-ink-400";

                const userLabel =
                  r.usuario_nombre ||
                  (r.usuario_email
                    ? r.usuario_email.split("@")[0]
                    : "Usuario eliminado");

                return (
                  <TableRow key={r.id}>
                    <TableCell className="px-3 py-2 text-xs text-ink-500">
                      {formatRelativeOrDate(r.created_at)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span
                        className="block truncate text-sm text-ink-700 max-w-[160px]"
                        title={userLabel}
                      >
                        {userLabel}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm">
                      {r.producto_codigo && (
                        <span className="font-mono text-xs text-ink-500 mr-2">
                          {r.producto_codigo}
                        </span>
                      )}
                      <span className="text-ink-800">
                        {r.producto_nombre || "Producto eliminado"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums">
                      <div className="inline-flex items-center gap-2 text-sm">
                        <span className="text-ink-400 line-through">
                          {formatCurrency(r.precio_anterior)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-ink-300" />
                        <span className="font-medium text-ink-800">
                          {formatCurrency(r.precio_nuevo)}
                        </span>
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] mt-0.5 ${colorClass}`}
                      >
                        <Icon className="h-3 w-3" />
                        {subio || bajo
                          ? `${subio ? "+" : ""}${formatCurrency(delta)} (${
                              subio ? "+" : ""
                            }${pct.toFixed(1)}%)`
                          : "Sin variación"}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Load more ───────────────────────────────── */}
      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchPage(offset, false)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando…
              </>
            ) : (
              "Cargar más"
            )}
          </Button>
        </div>
      )}
    </Layout>
  );
}
