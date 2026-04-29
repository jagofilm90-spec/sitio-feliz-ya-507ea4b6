import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PulseBar } from "@/components/proveedores-v3/PulseBar";
import { SearchFilters } from "@/components/proveedores-v3/SearchFilters";
import { SupplierCard } from "@/components/proveedores-v3/SupplierCard";
import { SelectorProductoComparar } from "@/components/proveedores-v3/comparador/SelectorProductoComparar";
import { useProveedoresV3, usePulseStatsV3, RATING_ORDER } from "@/hooks/useProveedoresV3";
import type {
  FiltroConfiabilidad,
  FiltroEstado,
  FiltroSaldo,
  SortKey,
} from "@/types/proveedor-v3";

type PulseFilter = "ninguno" | "vencidos" | "faltantes" | "transito";

const ProveedoresV3 = () => {
  const navigate = useNavigate();
  const { data: proveedores, isLoading } = useProveedoresV3();
  const { data: pulse, isLoading: pulseLoading } = usePulseStatsV3();

  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<string | "todas">("todas");
  const [confiabilidad, setConfiabilidad] = useState<FiltroConfiabilidad>("todas");
  const [estado, setEstado] = useState<FiltroEstado>("activo");
  const [saldo, setSaldo] = useState<FiltroSaldo>("todos");
  const [sort, setSort] = useState<SortKey>("confiabilidad_desc");
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>("ninguno");
  const [comparadorAbierto, setComparadorAbierto] = useState(false);

  const categorias = useMemo(() => {
    if (!proveedores) return [];
    const set = new Set<string>();
    proveedores.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set).sort();
  }, [proveedores]);

  const filtered = useMemo(() => {
    if (!proveedores) return [];
    let list = [...proveedores];

    // Estado
    if (estado === "activo") list = list.filter((p) => p.activo);
    else if (estado === "inactivo") list = list.filter((p) => !p.activo);

    // Pulse filter
    if (pulseFilter === "vencidos") list = list.filter((p) => p.saldo_vencido > 0);
    if (pulseFilter === "faltantes") list = list.filter((p) => p.faltantes_pendientes_30d > 0);
    // 'transito' no es por proveedor; lo dejamos sin recortar lista

    // Categoría
    if (categoria !== "todas") list = list.filter((p) => p.categoria === categoria);

    // Confiabilidad
    if (confiabilidad !== "todas") list = list.filter((p) => p.score.rating === confiabilidad);

    // Saldo
    if (saldo === "con_saldo") list = list.filter((p) => p.saldo_total > 0);
    else if (saldo === "vencido") list = list.filter((p) => p.saldo_vencido > 0);
    else if (saldo === "sin_saldo") list = list.filter((p) => p.saldo_total === 0);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        [p.nombre, p.rfc, p.nombre_contacto, p.telefono, p.categoria, p.nombre_comercial]
          .filter(Boolean)
          .some((s) => (s as string).toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sort) {
        case "nombre_asc":
          return a.nombre.localeCompare(b.nombre);
        case "ultima_compra_desc":
          return (b.ultima_oc_fecha || "").localeCompare(a.ultima_oc_fecha || "");
        case "saldo_desc":
          return b.saldo_total - a.saldo_total;
        case "confiabilidad_desc":
        default: {
          const ro = RATING_ORDER[b.score.rating] - RATING_ORDER[a.score.rating];
          if (ro !== 0) return ro;
          return (b.score.score || 0) - (a.score.score || 0);
        }
      }
    });

    return list;
  }, [proveedores, search, categoria, confiabilidad, estado, saldo, sort, pulseFilter]);

  const totalActivos = (proveedores || []).filter((p) => p.activo).length;
  const conAlertas = (proveedores || []).filter(
    (p) => p.saldo_vencido > 0 || p.faltantes_pendientes_30d > 0
  ).length;

  const sortLabel = {
    confiabilidad_desc: "confiabilidad",
    nombre_asc: "nombre A–Z",
    ultima_compra_desc: "última compra",
    saldo_desc: "saldo",
  }[sort];

  const limpiarFiltros = () => {
    setSearch("");
    setCategoria("todas");
    setConfiabilidad("todas");
    setEstado("activo");
    setSaldo("todos");
    setPulseFilter("ninguno");
  };

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Compras · Directorio"
          title="Tus"
          titleAccent="proveedores."
          lead={
            isLoading
              ? "Cargando…"
              : `${totalActivos} proveedores activos · ${conAlertas} con alertas activas`
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComparadorAbierto(true)}
                className="px-[18px] py-[11px] rounded-lg bg-white border border-ink-100 text-ink-700 text-sm font-medium hover:bg-bg-warm transition-colors"
              >
                🔍 Comparar precios
              </button>
              <Button onClick={() => navigate("/compras?tab=proveedores&accion=nuevo")}>
                + Nuevo proveedor
              </Button>
            </div>
          }
        />

        <PulseBar
          stats={pulse}
          loading={pulseLoading}
          activeFilter={pulseFilter}
          onFilter={setPulseFilter}
        />

        <SearchFilters
          search={search}
          onSearchChange={setSearch}
          categorias={categorias}
          categoria={categoria}
          onCategoria={setCategoria}
          confiabilidad={confiabilidad}
          onConfiabilidad={setConfiabilidad}
          estado={estado}
          onEstado={setEstado}
          saldo={saldo}
          onSaldo={setSaldo}
          sort={sort}
          onSort={setSort}
        />

        {/* Results bar */}
        {!isLoading && (
          <div className="bg-bg-warm rounded-lg px-6 py-3 text-xs text-ink-500">
            <span className="font-medium text-ink-700">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "proveedor" : "proveedores"} · ordenados por{" "}
            <em className="italic">{sortLabel}</em>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty: no proveedores en absoluto */}
        {!isLoading && (proveedores || []).length === 0 && (
          <div className="bg-white border border-ink-100 rounded-xl p-12 text-center">
            <h3 className="font-serif text-2xl text-ink-900 mb-2">
              Aún no tienes proveedores
            </h3>
            <p className="font-serif italic text-ink-500 mb-5">
              Crea tu primer proveedor para empezar
            </p>
            <Button onClick={() => navigate("/compras?tab=proveedores&accion=nuevo")}>
              + Nuevo proveedor
            </Button>
          </div>
        )}

        {/* Empty: filtros vacíos */}
        {!isLoading && (proveedores || []).length > 0 && filtered.length === 0 && (
          <div className="bg-white border border-ink-100 rounded-xl p-12 text-center">
            <h3 className="font-serif text-2xl text-ink-900 mb-2">
              Sin resultados con esos filtros
            </h3>
            <p className="font-serif italic text-ink-500 mb-5">Prueba quitando alguno</p>
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        )}

        {/* Lista */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((p) => (
              <SupplierCard key={p.id} proveedor={p} />
            ))}
          </div>
        )}
      </div>

      {comparadorAbierto && (
        <SelectorProductoComparar onClose={() => setComparadorAbierto(false)} />
      )}
    </Layout>
  );
};

export default ProveedoresV3;
