import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Plus, AlertTriangle, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { useConteosCiegos, useGenerarConteoCiego } from "@/hooks/useConteoCiego";
import { useEmpleadosPorPuesto } from "@/hooks/useAlmacenSurtido";
import { useNavigate } from "react-router-dom";

const ESTADO_BADGE: Record<string, { color: string; label: string }> = {
  programado: { color: "bg-blue-100 text-blue-800", label: "Programado" },
  en_curso: { color: "bg-amber-100 text-amber-800", label: "En curso" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
};

export default function ConteosCiegos() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<string | undefined>(undefined);
  const [showNuevo, setShowNuevo] = useState(false);
  const [asignadoA, setAsignadoA] = useState("");
  const [motivo, setMotivo] = useState("");

  const { data: conteos, isLoading } = useConteosCiegos(filtro ? { estado: filtro } : undefined);
  const { data: empleados } = useEmpleadosPorPuesto();
  const generarMutation = useGenerarConteoCiego();

  const handleCrear = () => {
    if (!asignadoA) return;
    generarMutation.mutate(
      { asignado_a: asignadoA, motivo: motivo || "Conteo ciego aleatorio" },
      { onSuccess: () => { setShowNuevo(false); setAsignadoA(""); setMotivo(""); } }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader title="Conteos Ciegos" description="Inventario ciego — empleado NO ve cantidad teórica" />

        <div className="flex items-center justify-between gap-4">
          <Select value={filtro || "todos"} onValueChange={(v) => setFiltro(v === "todos" ? undefined : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="programado">Programados</SelectItem>
              <SelectItem value="en_curso">En curso</SelectItem>
              <SelectItem value="finalizado">Finalizados</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowNuevo(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo conteo
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Cargando...</p>
        ) : !conteos?.length ? (
          <Card><CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay conteos ciegos</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {conteos.map((c: any) => {
              const badge = ESTADO_BADGE[c.estado] || ESTADO_BADGE.programado;
              return (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => c.estado !== "programado" ? null : navigate(`/conteos-ciegos/${c.id}`)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{c.folio}</span>
                          <Badge className={badge.color}>{badge.label}</Badge>
                          {c.shrinkage_rate > 2 && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Shrinkage {c.shrinkage_rate?.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Asignado: {c.empleados?.nombre_completo || "—"} · {c.total_productos} productos
                          {c.productos_con_diferencia > 0 && ` · ${c.productos_con_diferencia} con diferencia`}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                        {c.valor_diferencia > 0 && (
                          <p className="text-red-600 font-medium">${c.valor_diferencia?.toLocaleString("es-MX")}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog nuevo conteo */}
        <Dialog open={showNuevo} onOpenChange={setShowNuevo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Programar Conteo Ciego</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Asignar a empleado</Label>
                <Select value={asignadoA} onValueChange={setAsignadoA}>
                  <SelectTrigger><SelectValue placeholder="Selecciona empleado..." /></SelectTrigger>
                  <SelectContent>
                    {(empleados || []).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Motivo (opcional)</Label>
                <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Conteo ciego aleatorio" />
              </div>
              <p className="text-xs text-muted-foreground">
                Se seleccionarán 20 productos aleatorios con stock. El empleado NO verá las cantidades teóricas.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNuevo(false)}>Cancelar</Button>
              <Button onClick={handleCrear} disabled={!asignadoA || generarMutation.isPending}>
                {generarMutation.isPending ? "Creando..." : "Crear conteo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
