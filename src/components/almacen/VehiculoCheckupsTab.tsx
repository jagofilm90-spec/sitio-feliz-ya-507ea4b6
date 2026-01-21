import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Search, CheckCircle2, XCircle, Wrench, RefreshCw, 
  ClipboardCheck, ChevronDown, ChevronUp, Truck, AlertTriangle,
  Clock
} from "lucide-react";
import { VehiculoCheckupDialog } from "./VehiculoCheckupDialog";

interface Checkup {
  id: string;
  fecha_checkup: string;
  vehiculo_nombre: string;
  vehiculo_placa: string;
  chofer_nombre: string | null;
  realizado_por_nombre: string;
  items_ok: number;
  items_total: number;
  fallas_detectadas: string | null;
  prioridad: string | null;
  requiere_reparacion: boolean;
  resuelto: boolean;
  notificado_mecanico: boolean;
}

interface VehiculoConCheckup {
  id: string;
  nombre: string;
  placa: string | null;
  chofer_nombre: string | null;
  ultimo_checkup_fecha: string | null;
  ultimo_checkup_items_ok: number | null;
  dias_desde_checkup: number | null;
  tiene_fallas_pendientes: boolean;
}

interface VehiculoCheckupsTabProps {
  empleadoId: string;
  refreshKey?: number;
}

export const VehiculoCheckupsTab = ({ empleadoId, refreshKey }: VehiculoCheckupsTabProps) => {
  const [checkups, setCheckups] = useState<Checkup[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoConCheckup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<{id: string; nombre: string; placa: string | null} | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);

  useEffect(() => {
    loadCheckups();
    loadVehiculosConCheckups();
  }, [refreshKey]);

  const loadVehiculosConCheckups = async () => {
    setLoadingVehiculos(true);
    try {
      // Cargar vehículos activos
      const { data: vehiculosData, error: vehiculosError } = await supabase
        .from("vehiculos")
        .select(`
          id, nombre, placa,
          chofer:chofer_asignado_id (nombre_completo)
        `)
        .eq("activo", true)
        .order("nombre");

      if (vehiculosError) throw vehiculosError;

      // Para cada vehículo, obtener el último checkup
      const vehiculosConInfo: VehiculoConCheckup[] = await Promise.all(
        (vehiculosData || []).map(async (v) => {
          // Último checkup
          const { data: ultimoCheckup } = await supabase
            .from("vehiculos_checkups")
            .select(`
              fecha_checkup,
              frenos_ok, luces_ok, llantas_ok, aceite_ok, anticongelante_ok,
              espejos_ok, limpiadores_ok, bateria_ok, direccion_ok, suspension_ok,
              escape_ok, cinturones_ok
            `)
            .eq("vehiculo_id", v.id)
            .order("fecha_checkup", { ascending: false })
            .limit(1)
            .single();

          // Fallas pendientes (requiere reparación pero no resuelto)
          const { count: fallasPendientes } = await supabase
            .from("vehiculos_checkups")
            .select("id", { count: "exact", head: true })
            .eq("vehiculo_id", v.id)
            .eq("requiere_reparacion", true)
            .eq("resuelto", false);

          let itemsOk = null;
          let diasDesdeCheckup = null;

          if (ultimoCheckup) {
            const items = [
              ultimoCheckup.frenos_ok, ultimoCheckup.luces_ok, ultimoCheckup.llantas_ok,
              ultimoCheckup.aceite_ok, ultimoCheckup.anticongelante_ok, ultimoCheckup.espejos_ok,
              ultimoCheckup.limpiadores_ok, ultimoCheckup.bateria_ok, ultimoCheckup.direccion_ok,
              ultimoCheckup.suspension_ok, ultimoCheckup.escape_ok, ultimoCheckup.cinturones_ok
            ];
            itemsOk = items.filter(Boolean).length;
            diasDesdeCheckup = differenceInDays(new Date(), new Date(ultimoCheckup.fecha_checkup));
          }

          return {
            id: v.id,
            nombre: v.nombre,
            placa: v.placa,
            chofer_nombre: (v.chofer as any)?.nombre_completo || null,
            ultimo_checkup_fecha: ultimoCheckup?.fecha_checkup || null,
            ultimo_checkup_items_ok: itemsOk,
            dias_desde_checkup: diasDesdeCheckup,
            tiene_fallas_pendientes: (fallasPendientes || 0) > 0,
          };
        })
      );

      setVehiculos(vehiculosConInfo);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
      toast.error("Error al cargar vehículos");
    } finally {
      setLoadingVehiculos(false);
    }
  };

  const loadCheckups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehiculos_checkups")
        .select(`
          id,
          fecha_checkup,
          frenos_ok, luces_ok, llantas_ok, aceite_ok, anticongelante_ok,
          espejos_ok, limpiadores_ok, bateria_ok, direccion_ok, suspension_ok,
          escape_ok, cinturones_ok,
          fallas_detectadas,
          prioridad,
          requiere_reparacion,
          resuelto,
          notificado_mecanico,
          vehiculos:vehiculo_id (nombre, placa),
          chofer:chofer_id (nombre_completo),
          realizado:realizado_por (nombre_completo)
        `)
        .order("fecha_checkup", { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedCheckups: Checkup[] = (data || []).map(c => {
        const items = [
          c.frenos_ok, c.luces_ok, c.llantas_ok, c.aceite_ok, c.anticongelante_ok,
          c.espejos_ok, c.limpiadores_ok, c.bateria_ok, c.direccion_ok, c.suspension_ok,
          c.escape_ok, c.cinturones_ok
        ];
        const itemsOk = items.filter(Boolean).length;

        return {
          id: c.id,
          fecha_checkup: c.fecha_checkup,
          vehiculo_nombre: (c.vehiculos as any)?.nombre || 'Desconocido',
          vehiculo_placa: (c.vehiculos as any)?.placa || 'Sin placa',
          chofer_nombre: (c.chofer as any)?.nombre_completo || null,
          realizado_por_nombre: (c.realizado as any)?.nombre_completo || 'Desconocido',
          items_ok: itemsOk,
          items_total: 12,
          fallas_detectadas: c.fallas_detectadas,
          prioridad: c.prioridad,
          requiere_reparacion: c.requiere_reparacion,
          resuelto: c.resuelto,
          notificado_mecanico: c.notificado_mecanico,
        };
      });

      setCheckups(formattedCheckups);
    } catch (error) {
      console.error("Error cargando checkups:", error);
      toast.error("Error al cargar checkups");
    } finally {
      setLoading(false);
    }
  };

  const marcarResuelto = async (checkupId: string) => {
    try {
      const { error } = await supabase
        .from("vehiculos_checkups")
        .update({ resuelto: true, resuelto_en: new Date().toISOString() })
        .eq("id", checkupId);

      if (error) throw error;
      toast.success("Checkup marcado como resuelto");
      loadCheckups();
      loadVehiculosConCheckups();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar checkup");
    }
  };

  const iniciarCheckup = (vehiculo: VehiculoConCheckup) => {
    setVehiculoSeleccionado({
      id: vehiculo.id,
      nombre: vehiculo.nombre,
      placa: vehiculo.placa
    });
    setDialogOpen(true);
  };

  const getCheckupStatusBadge = (vehiculo: VehiculoConCheckup) => {
    if (vehiculo.tiene_fallas_pendientes) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Wrench className="h-3 w-3" />
          Fallas pendientes
        </Badge>
      );
    }

    if (vehiculo.dias_desde_checkup === null) {
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <XCircle className="h-3 w-3" />
          Sin checkups
        </Badge>
      );
    }

    if (vehiculo.dias_desde_checkup === 0) {
      return (
        <Badge variant="outline" className="text-primary gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Hoy
        </Badge>
      );
    }

    if (vehiculo.dias_desde_checkup <= 7) {
      return (
        <Badge variant="outline" className="text-primary gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Hace {vehiculo.dias_desde_checkup} día{vehiculo.dias_desde_checkup > 1 ? 's' : ''}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1 text-orange-600">
        <AlertTriangle className="h-3 w-3" />
        Hace {vehiculo.dias_desde_checkup} días
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: string | null) => {
    switch (prioridad) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'alta':
        return <Badge className="bg-orange-600 text-white">Alta</Badge>;
      case 'media':
        return <Badge variant="secondary">Media</Badge>;
      case 'baja':
        return <Badge variant="outline">Baja</Badge>;
      default:
        return null;
    }
  };

  const getEstadoBadge = (checkup: Checkup) => {
    if (checkup.resuelto) {
      return <Badge variant="outline" className="text-primary">Resuelto</Badge>;
    }
    if (checkup.requiere_reparacion) {
      return <Badge variant="destructive">Pendiente</Badge>;
    }
    if (checkup.items_ok === checkup.items_total) {
      return <Badge variant="outline" className="text-primary">OK</Badge>;
    }
    return <Badge variant="secondary">Con fallas</Badge>;
  };

  const filteredCheckups = checkups.filter(c => {
    const matchesSearch = 
      c.vehiculo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehiculo_placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.chofer_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesFiltro = 
      filtroEstado === "todos" ||
      (filtroEstado === "pendientes" && c.requiere_reparacion && !c.resuelto) ||
      (filtroEstado === "resueltos" && c.resuelto) ||
      (filtroEstado === "ok" && c.items_ok === c.items_total);

    return matchesSearch && matchesFiltro;
  });

  const stats = {
    total: checkups.length,
    pendientes: checkups.filter(c => c.requiere_reparacion && !c.resuelto).length,
    resueltos: checkups.filter(c => c.resuelto).length,
    ok: checkups.filter(c => c.items_ok === c.items_total && !c.requiere_reparacion).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Checkups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.resueltos}</div>
            <p className="text-xs text-muted-foreground">Resueltos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.ok}</div>
            <p className="text-xs text-muted-foreground">Sin Fallas</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Vehículos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehículos
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { loadVehiculosConCheckups(); loadCheckups(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVehiculos ? (
            <div className="text-center py-8 text-muted-foreground">Cargando vehículos...</div>
          ) : vehiculos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay vehículos registrados</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehiculos.map((v) => (
                <Card key={v.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    {/* Nombre y placa */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{v.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{v.placa || 'Sin placa'}</p>
                      </div>
                    </div>

                    {/* Chofer asignado */}
                    <div className="text-sm mb-3">
                      <span className="text-muted-foreground">Chofer: </span>
                      <span className={v.chofer_nombre ? "" : "text-muted-foreground italic"}>
                        {v.chofer_nombre || "Sin asignar"}
                      </span>
                    </div>

                    {/* Estado del último checkup */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Último checkup:</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {getCheckupStatusBadge(v)}
                        {v.ultimo_checkup_items_ok !== null && (
                          <span className={`text-sm font-medium ${v.ultimo_checkup_items_ok === 12 ? 'text-primary' : 'text-orange-600'}`}>
                            {v.ultimo_checkup_items_ok}/12 OK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón iniciar checkup - Optimizado para tablet */}
                    <Button 
                      size="lg"
                      className="w-full h-12"
                      onClick={() => iniciarCheckup(v)}
                    >
                      <ClipboardCheck className="h-5 w-5 mr-2" />
                      Iniciar Checkup
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial Colapsable */}
      <Collapsible open={historialOpen} onOpenChange={setHistorialOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-4 p-4 rounded-lg transition-colors">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Checkups
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{checkups.length} registros</Badge>
                  {historialOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por vehículo, placa o chofer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendientes">Pendientes</SelectItem>
                    <SelectItem value="resueltos">Resueltos</SelectItem>
                    <SelectItem value="ok">Sin Fallas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Chofer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : filteredCheckups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay checkups registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCheckups.map((checkup) => (
                        <TableRow key={checkup.id}>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(checkup.fecha_checkup), "dd MMM yyyy", { locale: es })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(checkup.fecha_checkup), "HH:mm")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{checkup.vehiculo_nombre}</div>
                            <div className="text-xs text-muted-foreground">{checkup.vehiculo_placa}</div>
                          </TableCell>
                          <TableCell>
                            {checkup.chofer_nombre || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {checkup.items_ok === checkup.items_total ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className={checkup.items_ok === checkup.items_total ? "text-green-600" : "text-red-600"}>
                                {checkup.items_ok}/{checkup.items_total}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getPrioridadBadge(checkup.prioridad)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getEstadoBadge(checkup)}
                              {checkup.notificado_mecanico && (
                                <Badge variant="outline" className="text-xs">
                                  <Wrench className="h-3 w-3 mr-1" />
                                  Notificado
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {checkup.requiere_reparacion && !checkup.resuelto && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => marcarResuelto(checkup.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Resolver
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <VehiculoCheckupDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setVehiculoSeleccionado(null);
        }}
        vehiculo={vehiculoSeleccionado}
        empleadoId={empleadoId}
        onSuccess={() => {
          loadCheckups();
          loadVehiculosConCheckups();
        }}
      />
    </div>
  );
};
