import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProveedorDetalle } from "@/hooks/useProveedorDetalle";
import { DetailHero } from "@/components/proveedores-v3/detalle/DetailHero";
import { DetailTabs, type TabKey } from "@/components/proveedores-v3/detalle/DetailTabs";
import { TabResumen } from "@/components/proveedores-v3/detalle/TabResumen";

const PLACEHOLDER: Record<Exclude<TabKey, "resumen">, { icon: string; title: string }> = {
  productos: { icon: "📦", title: "Productos" },
  ocs: { icon: "📋", title: "Histórico OCs" },
  faltantes: { icon: "⚠", title: "Faltantes" },
  cuenta: { icon: "💰", title: "Cuenta corriente" },
  memoria: { icon: "📝", title: "Memoria" },
};

const ProveedorDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as TabKey) || "resumen";
  const setActiveTab = (k: TabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", k);
    setSearchParams(next, { replace: true });
  };

  const { data, isLoading, error } = useProveedorDetalle(id);

  const breadcrumbName = useMemo(
    () => data?.proveedor?.nombre_comercial || data?.proveedor?.nombre || "Proveedor",
    [data]
  );

  return (
    <Layout>
      {/* Topbar / breadcrumb */}
      <div className="px-8 py-4 border-b border-ink-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate("/compras")}
            className="text-ink-500 hover:text-ink-900 transition-colors"
          >
            ← Compras
          </button>
          <span className="text-ink-300">/</span>
          <button
            onClick={() => navigate("/compras/proveedores-v3")}
            className="text-ink-500 hover:text-ink-900 transition-colors"
          >
            Proveedores
          </button>
          <span className="text-ink-300">/</span>
          <span className="text-ink-900 font-medium truncate max-w-[300px]">
            {isLoading ? "…" : breadcrumbName}
          </span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <>
          <div className="px-8 py-6 border-b border-ink-100">
            <Skeleton className="h-4 w-40 mb-3" />
            <Skeleton className="h-10 w-2/3 mb-3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="px-8 py-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[110px] rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Skeleton className="h-[210px] rounded-xl" />
              <Skeleton className="h-[210px] rounded-xl" />
            </div>
          </div>
        </>
      )}

      {/* Error state */}
      {!isLoading && (error || !data) && (
        <div className="px-8 py-20 text-center">
          <h2 className="font-serif text-2xl text-ink-900 mb-2">Proveedor no encontrado</h2>
          <p className="font-serif italic text-ink-500 mb-5">
            El proveedor solicitado no existe o fue eliminado
          </p>
          <Button variant="outline" onClick={() => navigate("/compras/proveedores-v3")}>
            ← Volver a proveedores
          </Button>
        </div>
      )}

      {/* Content */}
      {!isLoading && data && (
        <>
          <DetailHero proveedor={data.proveedor} kpis={data.kpis} />
          <DetailTabs
            active={activeTab}
            onChange={setActiveTab}
            productosCount={data.productosCount}
            ocsCount={data.ocsTotalCount}
            faltantesCount={data.faltantesPendientesCount}
            eventosCount={data.eventosCount}
          />

          {activeTab === "resumen" ? (
            <TabResumen data={data} onVerTodasOCs={() => setActiveTab("ocs")} />
          ) : (
            <div className="px-8 py-20 text-center">
              <div className="text-5xl mb-3">{PLACEHOLDER[activeTab].icon}</div>
              <h2 className="font-serif text-2xl text-ink-500 mb-1">
                {PLACEHOLDER[activeTab].title}
              </h2>
              <p className="font-serif italic text-ink-500">Próximamente en Fase C.2</p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default ProveedorDetalle;
