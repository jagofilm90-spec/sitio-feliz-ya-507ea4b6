import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Truck, User, MapPin, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { useCartaPorte } from "@/hooks/useCartasPorte";

const CartaPorteDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cp, isLoading } = useCartaPorte(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!cp) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carta Porte no encontrada</p>
          <Button variant="link" onClick={() => navigate("/cartas-porte")}>Volver</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cartas-porte")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={`Carta Porte ${cp.folio}`}
            description={`Estado: ${cp.estado} · Tipo CFDI: ${cp.tipo_cfdi === "T" ? "Traslado" : "Ingreso"}`}
          />
        </div>

        {cp.estado === "borrador" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Modo borrador</p>
              <p className="text-xs text-amber-700">
                Completa los datos y valida antes de timbrar. El timbrado con PAC estará disponible próximamente.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehículo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" /> Autotransporte
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {cp.vehiculos ? (
                <>
                  <p><span className="text-muted-foreground">Vehículo:</span> {cp.vehiculos.nombre}</p>
                  <p><span className="text-muted-foreground">Placa:</span> {cp.vehiculos.placa || "—"}</p>
                  <p><span className="text-muted-foreground">Año:</span> {cp.vehiculos.anio || "—"}</p>
                  <p><span className="text-muted-foreground">No. Serie:</span> {cp.vehiculos.numero_serie || "—"}</p>
                </>
              ) : (
                <p className="text-muted-foreground italic">Sin vehículo asignado</p>
              )}
            </CardContent>
          </Card>

          {/* Operador */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Figura del Transporte
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {cp.empleados ? (
                <>
                  <p><span className="text-muted-foreground">Operador:</span> {cp.empleados.nombre_completo}</p>
                  <p><span className="text-muted-foreground">RFC:</span> {cp.empleados.rfc || "—"}</p>
                  <p><span className="text-muted-foreground">Licencia:</span> {cp.empleados.licencia_numero || "—"}</p>
                </>
              ) : (
                <p className="text-muted-foreground italic">Sin operador asignado</p>
              )}
            </CardContent>
          </Card>

          {/* Ruta / Ubicaciones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Ubicaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {cp.rutas ? (
                <p><span className="text-muted-foreground">Ruta:</span> {cp.rutas.folio} — {cp.rutas.fecha_ruta}</p>
              ) : (
                <p className="text-muted-foreground italic">Sin ruta vinculada. Agrega ubicaciones manualmente.</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Las ubicaciones detalladas (origen/destinos) se agregan en el editor completo (próximamente).
              </p>
            </CardContent>
          </Card>

          {/* Mercancías */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" /> Mercancías
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground italic">
                Las mercancías se agregarán desde los pedidos de la ruta (próximamente).
              </p>
              {cp.total_dist_recorrida && (
                <p className="mt-2">
                  <span className="text-muted-foreground">Distancia total:</span> {cp.total_dist_recorrida} km
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button variant="outline" disabled>
            <CheckCircle className="h-4 w-4 mr-2" />
            Validar (próximamente)
          </Button>
          <Button variant="outline" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Descargar PDF borrador (próximamente)
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CartaPorteDetalle;
