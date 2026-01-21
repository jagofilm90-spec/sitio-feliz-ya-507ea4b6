import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Search, CheckCircle2, XCircle, Wrench, RefreshCw } from "lucide-react";
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

interface VehiculoCheckupsTabProps {
  empleadoId: string;
  refreshKey?: number;
}

export const VehiculoCheckupsTab = ({ empleadoId, refreshKey }: VehiculoCheckupsTabProps) => {
  const [checkups, setCheckups] = useState<Checkup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadCheckups();
  }, [refreshKey]);

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
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar checkup");
    }
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

      {/* Controles */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Historial de Checkups</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadCheckups}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Checkup
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
      </Card>

      <VehiculoCheckupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empleadoId={empleadoId}
        onSuccess={loadCheckups}
      />
    </div>
  );
};
