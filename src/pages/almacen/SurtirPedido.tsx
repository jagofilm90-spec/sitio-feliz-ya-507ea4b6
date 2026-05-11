import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Package,
  Users,
} from "lucide-react";
import {
  usePedidoSurtido,
  useMarcarLineaSurtida,
  useIniciarSurtido,
  useEntregaDePedido,
} from "@/hooks/useAlmacenSurtido";
import AsignarCuadrillaDialog from "@/components/almacen-surtido/AsignarCuadrillaDialog";

export default function SurtirPedido() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const { data: pedido, isLoading } = usePedidoSurtido(pedidoId);
  const { data: entrega } = useEntregaDePedido(pedidoId);
  const marcarLinea = useMarcarLineaSurtida();
  const iniciarSurtido = useIniciarSurtido();

  const [modalParcial, setModalParcial] = useState<any>(null);
  const [cantidadParcial, setCantidadParcial] = useState("");
  const [showCuadrilla, setShowCuadrilla] = useState(false);

  // Auto-start surtido
  useEffect(() => {
    if (pedido && pedido.estado_surtido === "pendiente") {
      iniciarSurtido.mutate(pedido.id);
    }
  }, [pedido?.id, pedido?.estado_surtido]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!pedido) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pedido no encontrado</p>
          <Button variant="link" onClick={() => navigate("/almacen-tablet")}>
            Volver
          </Button>
        </div>
      </Layout>
    );
  }

  const lineas = pedido.pedidos_detalles || [];
  const surtidas = lineas.filter((l: any) => l.estado_surtido !== "pendiente").length;
  const progreso = lineas.length > 0 ? (surtidas / lineas.length) * 100 : 0;
  const todosCompletos = surtidas === lineas.length && lineas.length > 0;

  const ESTADO_COLORS: Record<string, string> = {
    pendiente: "border-gray-200",
    completo: "border-green-500 bg-green-50/50",
    parcial: "border-amber-500 bg-amber-50/50",
    sin_stock: "border-red-500 bg-red-50/50",
    sustituido: "border-blue-500 bg-blue-50/50",
  };

  const ESTADO_LABELS: Record<string, string> = {
    completo: "Completo",
    parcial: "Parcial",
    sin_stock: "Sin stock",
    sustituido: "Sustituido",
  };

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header sticky */}
        <div className="sticky top-0 bg-white border-b z-10 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/almacen-tablet")} className="mb-1">
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">{pedido.clientes?.razon_social || pedido.clientes?.nombre}</h1>
              <p className="text-xs text-muted-foreground font-mono">{pedido.folio}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">{surtidas}/{lineas.length}</p>
            </div>
          </div>
          <Progress value={progreso} className="mt-2 h-2" />
        </div>

        {/* Lista productos touch-friendly */}
        <div className="px-4 py-4 pb-28 space-y-3">
          {lineas.map((linea: any) => {
            const estado = linea.estado_surtido || "pendiente";
            const prod = linea.productos;

            return (
              <Card key={linea.id} className={`p-4 border-2 transition-all ${ESTADO_COLORS[estado]}`}>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-mono">{prod?.codigo}</p>
                        <p className="text-sm font-medium truncate">{prod?.nombre}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold font-mono text-[#c41e3a]">{linea.cantidad}</p>
                        <p className="text-[10px] text-muted-foreground">{prod?.unidad || "pz"}</p>
                      </div>
                    </div>
                    {estado !== "pendiente" && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {ESTADO_LABELS[estado]}
                        {estado === "parcial" && linea.cantidad_surtida_real != null && `: ${linea.cantidad_surtida_real}`}
                      </Badge>
                    )}
                  </div>
                </div>

                {estado === "pendiente" && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <Button
                      className="h-14 bg-green-600 hover:bg-green-700 text-white text-xs"
                      onClick={() => marcarLinea.mutate({ pedido_detalle_id: linea.id, estado: "completo", cantidad_real: linea.cantidad })}
                      disabled={marcarLinea.isPending}
                    >
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="mt-0.5">Completo</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 border-amber-500 text-amber-700 text-xs"
                      onClick={() => { setModalParcial(linea); setCantidadParcial(""); }}
                    >
                      <div className="flex flex-col items-center">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="mt-0.5">Parcial</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 border-red-500 text-red-700 text-xs"
                      onClick={() => marcarLinea.mutate({ pedido_detalle_id: linea.id, estado: "sin_stock" })}
                      disabled={marcarLinea.isPending}
                    >
                      <div className="flex flex-col items-center">
                        <XCircle className="h-5 w-5" />
                        <span className="mt-0.5">Sin stock</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 border-blue-500 text-blue-700 text-xs"
                      onClick={() => marcarLinea.mutate({ pedido_detalle_id: linea.id, estado: "sustituido", notas: "Producto sustituido" })}
                      disabled={marcarLinea.isPending}
                    >
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-5 w-5" />
                        <span className="mt-0.5">Sustituir</span>
                      </div>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Footer sticky */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-10">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <p className="text-sm text-muted-foreground">
              {todosCompletos ? "Todos los productos marcados" : `Faltan ${lineas.length - surtidas} productos`}
            </p>
            <Button
              size="lg"
              className="bg-[#c41e3a] hover:bg-[#a01830] text-white px-6"
              disabled={!todosCompletos}
              onClick={() => setShowCuadrilla(true)}
            >
              <Users className="mr-2 h-4 w-4" /> Terminar y asignar cuadrilla
            </Button>
          </div>
        </div>

        {/* Modal Parcial */}
        <Dialog open={!!modalParcial} onOpenChange={() => setModalParcial(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cantidad parcial surtida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                Pedido: <strong>{modalParcial?.cantidad} {modalParcial?.productos?.unidad}</strong> de {modalParcial?.productos?.nombre}
              </p>
              <div>
                <label className="text-sm font-medium">Cantidad surtida real:</label>
                <Input
                  type="number"
                  value={cantidadParcial}
                  onChange={(e) => setCantidadParcial(e.target.value)}
                  max={modalParcial?.cantidad}
                  min={0}
                  className="text-xl h-12 mt-2"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalParcial(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  const cant = parseFloat(cantidadParcial);
                  if (!cant || cant <= 0) return;
                  marcarLinea.mutate(
                    { pedido_detalle_id: modalParcial.id, estado: "parcial", cantidad_real: cant },
                    { onSuccess: () => setModalParcial(null) }
                  );
                }}
                disabled={marcarLinea.isPending}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cuadrilla dialog */}
        {showCuadrilla && entrega && (
          <AsignarCuadrillaDialog
            open={showCuadrilla}
            onClose={() => setShowCuadrilla(false)}
            pedidoId={pedido.id}
            entregaId={entrega.id}
            onSuccess={() => navigate("/almacen-tablet")}
          />
        )}
      </div>
    </Layout>
  );
}
