import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Truck, AlertTriangle, CheckCircle, Clock, XCircle, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartasPorteList, useCreateCartaPorte } from "@/hooks/useCartasPorte";
import { useRutasDisponibles } from "@/hooks/useCartaPorteWizard";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "borrador":
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Borrador</Badge>;
    case "validado":
      return <Badge className="gap-1 bg-blue-600"><CheckCircle className="h-3 w-3" />Validado</Badge>;
    case "timbrado":
      return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Timbrado</Badge>;
    case "cancelado":
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelado</Badge>;
    case "error":
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Error</Badge>;
    default:
      return <Badge variant="secondary">{estado}</Badge>;
  }
};

const CartasPorte = () => {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [showRutaDialog, setShowRutaDialog] = useState(false);
  const { data: cartas, isLoading } = useCartasPorteList(
    filtroEstado !== "todos" ? { estado: filtroEstado } : undefined
  );
  const createMutation = useCreateCartaPorte();
  const { data: rutas } = useRutasDisponibles();

  const handleNueva = async (rutaId?: string, vehiculoId?: string, choferId?: string) => {
    const cp = await createMutation.mutateAsync({
      ruta_id: rutaId,
      vehiculo_id: vehiculoId,
      chofer_id: choferId,
    });
    if (cp?.id) {
      setShowRutaDialog(false);
      navigate(`/cartas-porte/${cp.id}`);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Cartas Porte"
          description="Complemento Carta Porte 3.1 para traslados federales"
        />

        <div className="flex items-center justify-between gap-4">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="validado">Validado</SelectItem>
              <SelectItem value="timbrado">Timbrado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Dialog open={showRutaDialog} onOpenChange={setShowRutaDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Route className="h-4 w-4 mr-2" />
                  Desde Ruta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear desde Ruta existente</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {rutas?.length ? rutas.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleNueva(r.id, r.vehiculo_id || undefined, r.chofer_id || undefined)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      disabled={createMutation.isPending}
                    >
                      <span className="font-mono text-sm font-medium">{r.folio}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {format(new Date(r.fecha_ruta), "d MMM yyyy", { locale: es })} · {r.status}
                      </span>
                    </button>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay rutas disponibles</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => handleNueva()} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Carta Porte
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !cartas?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin cartas porte</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Genera tu primera carta porte para cumplir con el complemento 3.1 del SAT.
              </p>
              <Button onClick={handleNueva} disabled={createMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera carta porte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {cartas.map((cp) => (
              <Card
                key={cp.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/cartas-porte/${cp.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-crimson-50 p-2 rounded-lg">
                        <Truck className="h-5 w-5 text-crimson-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono text-sm">{cp.folio}</span>
                          {getEstadoBadge(cp.estado)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {cp.vehiculos && (
                            <span>{cp.vehiculos.nombre} ({cp.vehiculos.placa})</span>
                          )}
                          {cp.empleados && (
                            <span>Chofer: {cp.empleados.nombre_completo}</span>
                          )}
                          {cp.rutas && (
                            <span>Ruta: {cp.rutas.folio}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {format(new Date(cp.created_at), "d MMM yyyy HH:mm", { locale: es })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CartasPorte;
