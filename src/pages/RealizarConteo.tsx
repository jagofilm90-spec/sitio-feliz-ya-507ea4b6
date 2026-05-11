import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, CheckCircle, ClipboardCheck } from "lucide-react";
import { useConteoCiego, useConteoDetalles, useRegistrarCantidad, useFinalizarConteo } from "@/hooks/useConteoCiego";

export default function RealizarConteo() {
  const { conteoId } = useParams<{ conteoId: string }>();
  const navigate = useNavigate();
  const { data: conteo, isLoading: loadConteo } = useConteoCiego(conteoId);
  const { data: detalles, isLoading: loadDet } = useConteoDetalles(conteoId);
  const registrar = useRegistrarCantidad();
  const finalizar = useFinalizarConteo();

  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  if (loadConteo || loadDet) {
    return <Layout><div className="p-6"><Skeleton className="h-40 w-full" /></div></Layout>;
  }

  if (!conteo) {
    return <Layout><div className="text-center py-12"><p>Conteo no encontrado</p></div></Layout>;
  }

  const items = detalles || [];
  const contados = items.filter((d: any) => d.cantidad_contada !== null).length;
  const progreso = items.length > 0 ? (contados / items.length) * 100 : 0;
  const todosContados = contados === items.length && items.length > 0;
  const esFinalizado = conteo.estado === "finalizado";

  const handleRegistrar = (detalleId: string) => {
    const cant = parseFloat(cantidades[detalleId] || "0");
    if (isNaN(cant) || cant < 0) return;
    registrar.mutate({ detalleId, cantidad: cant });
  };

  const handleFinalizar = () => {
    if (!conteoId) return;
    finalizar.mutate(conteoId, { onSuccess: () => navigate("/conteos-ciegos") });
  };

  // Auto-start
  if (conteo.estado === "programado") {
    (async () => {
      await (await import("@/integrations/supabase/client")).supabase
        .from("conteos_ciegos")
        .update({ estado: "en_curso", inicio_at: new Date().toISOString() })
        .eq("id", conteoId);
    })();
  }

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header sticky */}
        <div className="sticky top-0 bg-white border-b z-10 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/conteos-ciegos")} className="mb-1">
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-[#c41e3a]" /> {conteo.folio}
              </h1>
              <p className="text-xs text-muted-foreground">{conteo.motivo}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">{contados}/{items.length}</p>
            </div>
          </div>
          <Progress value={progreso} className="mt-2 h-2" />
        </div>

        <div className="px-4 py-4 pb-28 space-y-3">
          {esFinalizado && (
            <Card className="p-3 bg-green-50 border-green-200">
              <p className="text-sm font-medium text-green-800">
                Conteo finalizado. Shrinkage: {conteo.shrinkage_rate?.toFixed(2)}% ·
                {conteo.productos_con_diferencia} productos con diferencia.
              </p>
            </Card>
          )}

          {items.map((d: any) => {
            const yaContado = d.cantidad_contada !== null;
            const tieneDiff = esFinalizado && d.diferencia && Math.abs(d.diferencia) > 0.01;

            return (
              <Card key={d.id} className={`p-4 border-2 ${
                esFinalizado && tieneDiff ? "border-red-400 bg-red-50/30" :
                yaContado ? "border-green-400 bg-green-50/30" : "border-gray-200"
              }`}>
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-mono">{d.codigo_producto}</p>
                    <p className="text-sm font-medium">{d.nombre_producto}</p>

                    {esFinalizado ? (
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span>Contado: <strong>{d.cantidad_contada}</strong></span>
                        <span className="text-muted-foreground">Teórico: {d.cantidad_teorica}</span>
                        {tieneDiff && (
                          <Badge className="bg-red-100 text-red-800">
                            Diff: {d.diferencia > 0 ? "+" : ""}{d.diferencia}
                          </Badge>
                        )}
                      </div>
                    ) : yaContado ? (
                      <div className="flex items-center gap-2 mt-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">Contado: {d.cantidad_contada}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Cantidad..."
                          value={cantidades[d.id] || ""}
                          onChange={(e) => setCantidades({ ...cantidades, [d.id]: e.target.value })}
                          className="h-10 w-28 text-lg"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRegistrar(d.id)}
                          disabled={registrar.isPending || !cantidades[d.id]}
                          className="bg-[#c41e3a] hover:bg-[#a01830] text-white h-10"
                        >
                          Registrar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        {!esFinalizado && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {todosContados ? "Todos contados" : `Faltan ${items.length - contados}`}
              </p>
              <Button
                size="lg"
                className="bg-[#c41e3a] hover:bg-[#a01830] text-white"
                disabled={!todosContados || finalizar.isPending}
                onClick={handleFinalizar}
              >
                {finalizar.isPending ? "Finalizando..." : "Finalizar conteo"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
