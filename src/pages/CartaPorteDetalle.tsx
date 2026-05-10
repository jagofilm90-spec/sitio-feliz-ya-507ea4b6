import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Truck, User, MapPin, Package, AlertTriangle, CheckCircle, Clock, History, Stamp, Download } from "lucide-react";
import { useCartaPorte, useTimbrarCartaPorte } from "@/hooks/useCartasPorte";
import { useCartaPorteSubDocs } from "@/hooks/useCartaPorteWizard";
import CartaPorteWizard from "@/components/carta-porte/CartaPorteWizard";

const estadoBadge: Record<string, { color: string; label: string }> = {
  borrador: { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Borrador" },
  validado: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Validado" },
  timbrado: { color: "bg-green-100 text-green-800 border-green-200", label: "Timbrado" },
  cancelado: { color: "bg-red-100 text-red-800 border-red-200", label: "Cancelado" },
};

const CartaPorteDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cp, isLoading } = useCartaPorte(id);
  const { data: subDocs } = useCartaPorteSubDocs(id);
  const timbrarMutation = useTimbrarCartaPorte();

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

  const badge = estadoBadge[cp.estado] || estadoBadge.borrador;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cartas-porte")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{cp.folio}</h1>
              <Badge className={`${badge.color} border text-xs`}>{badge.label}</Badge>
              <Badge variant="outline" className="text-xs">
                {cp.tipo_cfdi === "T" ? "Traslado" : "Ingreso"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Creada: {new Date(cp.created_at).toLocaleDateString("es-MX")}
              {cp.rutas && ` · Ruta: ${cp.rutas.folio}`}
            </p>
          </div>
        </div>

        {/* Warning banner for borrador */}
        {cp.estado === "borrador" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Modo borrador</p>
              <p className="text-xs text-amber-700">
                Completa los 4 pasos del wizard y valida para poder timbrar.
              </p>
            </div>
          </div>
        )}

        {/* Timbrar button for validado */}
        {cp.estado === "validado" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Carta Porte validada</p>
                <p className="text-xs text-blue-700">Lista para timbrar con PAC.</p>
              </div>
            </div>
            <Button
              onClick={() => timbrarMutation.mutate(cp.id)}
              disabled={timbrarMutation.isPending}
              className="bg-[#c41e3a] hover:bg-[#a01830] text-white"
            >
              <Stamp className="h-4 w-4 mr-2" />
              {timbrarMutation.isPending ? "Timbrando..." : "Timbrar con PAC"}
            </Button>
          </div>
        )}

        {/* Timbrado banner */}
        {cp.estado === "timbrado" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-900">Timbrado exitosamente</p>
            </div>
            <p className="text-xs text-green-800">UUID SAT: <span className="font-mono">{cp.uuid_sat}</span></p>
            {cp.fecha_timbrado && (
              <p className="text-xs text-green-700">Fecha: {new Date(cp.fecha_timbrado).toLocaleString("es-MX")}</p>
            )}
            <div className="flex gap-2 pt-1">
              {cp.xml_url && (
                <a href={cp.xml_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" /> XML
                  </Button>
                </a>
              )}
              {cp.pdf_url && (
                <a href={cp.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Tabs: Wizard vs Resumen */}
        <Tabs defaultValue={cp.estado === "borrador" ? "wizard" : "resumen"}>
          <TabsList>
            <TabsTrigger value="wizard" className="text-xs">
              <FileText className="h-3 w-3 mr-1" /> Wizard / Editar
            </TabsTrigger>
            <TabsTrigger value="resumen" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Resumen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard" className="mt-4">
            <CartaPorteWizard
              cartaPorteId={cp.id}
              rutaId={cp.ruta_id}
              vehiculoId={cp.vehiculo_id}
              choferId={cp.chofer_id}
              estado={cp.estado}
            />
          </TabsContent>

          <TabsContent value="resumen" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Autotransporte */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Autotransporte
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {subDocs?.autotransporte ? (
                    <>
                      <p><span className="text-muted-foreground">Permiso:</span> {subDocs.autotransporte.perm_sct} - {subDocs.autotransporte.num_permiso_sct}</p>
                      <p><span className="text-muted-foreground">Config:</span> {subDocs.autotransporte.config_vehicular}</p>
                      <p><span className="text-muted-foreground">Placa:</span> {subDocs.autotransporte.placa_vm}</p>
                      <p><span className="text-muted-foreground">Año:</span> {subDocs.autotransporte.anio_modelo_vm}</p>
                      <p><span className="text-muted-foreground">Seguro RC:</span> {subDocs.autotransporte.asegura_resp_civil} / {subDocs.autotransporte.poliza_resp_civil}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">Sin datos de autotransporte</p>
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
                  {subDocs?.figuras?.length ? (
                    subDocs.figuras.map((f: any, idx: number) => (
                      <div key={idx}>
                        <p><span className="text-muted-foreground">Tipo:</span> {f.tipo_figura} - {f.nombre_figura}</p>
                        <p><span className="text-muted-foreground">RFC:</span> {f.rfc_figura}</p>
                        <p><span className="text-muted-foreground">Licencia:</span> {f.num_licencia || "—"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">Sin operador asignado</p>
                  )}
                </CardContent>
              </Card>

              {/* Ubicaciones */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Ubicaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {subDocs?.ubicaciones?.length ? (
                    subDocs.ubicaciones.map((u: any, idx: number) => (
                      <div key={idx} className={`p-2 rounded text-xs ${u.tipo === "Origen" ? "bg-blue-50" : "bg-orange-50"}`}>
                        <span className="font-semibold">{u.tipo} #{u.orden_secuencia}</span>
                        <span className="ml-2">{u.nombre_remitente_destinatario || u.rfc}</span>
                        <span className="ml-2 text-muted-foreground">CP: {u.codigo_postal}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">Sin ubicaciones</p>
                  )}
                </CardContent>
              </Card>

              {/* Mercancías */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" /> Mercancías ({subDocs?.mercancias?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {subDocs?.mercancias?.length ? (
                    <>
                      {subDocs.mercancias.slice(0, 5).map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs border-b pb-1">
                          <span>{m.descripcion}</span>
                          <span className="text-muted-foreground">{m.cantidad} {m.unidad} · {m.peso_en_kg}kg</span>
                        </div>
                      ))}
                      {subDocs.mercancias.length > 5 && (
                        <p className="text-xs text-muted-foreground">+{subDocs.mercancias.length - 5} más...</p>
                      )}
                      <p className="text-xs font-medium mt-2">
                        Peso total: {subDocs.mercancias.reduce((a: number, m: any) => a + (m.peso_en_kg || 0), 0).toFixed(2)} kg
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">Sin mercancías</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* UUID SAT if timbrado */}
            {cp.uuid_sat && (
              <Card className="mt-4">
                <CardContent className="py-3">
                  <p className="text-xs"><span className="font-medium">UUID SAT:</span> {cp.uuid_sat}</p>
                  {cp.fecha_timbrado && (
                    <p className="text-xs text-muted-foreground">Timbrado: {new Date(cp.fecha_timbrado).toLocaleString("es-MX")}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Validation errors */}
            {cp.errores_validacion?.length > 0 && (
              <Card className="mt-4 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-700">Errores de validación</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs space-y-1 text-red-600">
                    {cp.errores_validacion.map((e: any, idx: number) => (
                      <li key={idx}>• {typeof e === "string" ? e : JSON.stringify(e)}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CartaPorteDetalle;
