/**
 * ==========================================================
 * 🚨 MÓDULO CRÍTICO: RUTAS Y ENTREGAS
 * ==========================================================
 * 
 * Este módulo maneja operaciones críticas de entregas.
 * 
 * ⚠️ NO MODIFICAR sin validar en preview primero.
 * ⚠️ Contiene componentes de Google Maps - ver ARQUITECTURA.md
 * 
 * Última actualización: 2025-12-15
 * ==========================================================
 */

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Truck, MapPin, Route, Play, Square, Gauge, Pencil, Globe, Activity, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import VehiculosTab from "@/components/rutas/VehiculosTab";
import ZonasTab from "@/components/rutas/ZonasTab";
import PlanificadorRutas from "@/components/rutas/PlanificadorRutas";
import RutaKilometrajeDialog from "@/components/rutas/RutaKilometrajeDialog";
import EditarRutaDialog from "@/components/rutas/EditarRutaDialog";
import { MapaGlobalSucursales } from "@/components/rutas/MapaGlobalSucursales";
import AsignacionesDelDiaTab from "@/components/rutas/AsignacionesDelDiaTab";
import AyudantesExternosTab from "@/components/rutas/AyudantesExternosTab";
import DisponibilidadPersonalTab from "@/components/rutas/DisponibilidadPersonalTab";
import { MonitoreoRutasTab } from "@/components/rutas/MonitoreoRutasTab";
import { useMonitoreoRutas } from "@/hooks/useMonitoreoRutas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, CalendarCheck, UserPlus, ClipboardList } from "lucide-react";

const RutasContent = () => {
  const [rutas, setRutas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [kmDialogOpen, setKmDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState<any>(null);
  const [kmMode, setKmMode] = useState<"iniciar" | "finalizar">("iniciar");
  const [selectedRutas, setSelectedRutas] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  
  // Hook de monitoreo para obtener alertas activas
  const { alertas } = useMonitoreoRutas();

  useEffect(() => {
    loadRutas();
  }, []);

  const loadRutas = async () => {
    try {
      // Cargar rutas sin JOIN de chofer (chofer_id es UUID de empleados, no profiles)
      const { data: rutasData, error } = await supabase
        .from("rutas")
        .select(`
          *,
          vehiculo:vehiculo_id (id, nombre, peso_maximo_local_kg, peso_maximo_foraneo_kg)
        `)
        .order("fecha_ruta", { ascending: false });

      if (error) throw error;

      // Obtener IDs de choferes únicos
      const choferIds = [...new Set((rutasData || []).map(r => r.chofer_id).filter(Boolean))];
      
      // DEBUG: Mostrar choferIds extraídos
      console.log('🔍 DEBUG Rutas.tsx - choferIds:', choferIds);
      console.log('🔍 DEBUG Rutas.tsx - rutasData sample:', rutasData?.slice(0, 3).map(r => ({ id: r.id, folio: r.folio, chofer_id: r.chofer_id })));
      
      // Cargar nombres de choferes desde empleados
      let choferesMap: Record<string, string> = {};
      if (choferIds.length > 0) {
        const { data: empleados, error: empError } = await supabase
          .from("empleados")
          .select("id, nombre_completo")
          .in("id", choferIds);
        
        // DEBUG: Mostrar resultado de empleados
        console.log('🔍 DEBUG Rutas.tsx - empleados query error:', empError);
        console.log('🔍 DEBUG Rutas.tsx - empleados data:', empleados);
        
        empleados?.forEach(emp => {
          choferesMap[emp.id] = emp.nombre_completo;
        });
        
        // DEBUG: Mostrar mapa final
        console.log('🔍 DEBUG Rutas.tsx - choferesMap:', choferesMap);
      }

      // Mapear nombres a rutas
      const rutasConChofer = (rutasData || []).map(ruta => {
        const choferNombre = ruta.chofer_id ? choferesMap[ruta.chofer_id] : null;
        // DEBUG: Solo mostrar si hay problema
        if (ruta.chofer_id && !choferNombre) {
          console.warn('⚠️ DEBUG Rutas.tsx - Chofer no encontrado para ruta:', { 
            rutaId: ruta.id, 
            folio: ruta.folio, 
            chofer_id: ruta.chofer_id,
            existeEnMapa: ruta.chofer_id in choferesMap
          });
        }
        return {
          ...ruta,
          chofer: ruta.chofer_id ? { full_name: choferNombre || 'Chofer desconocido' } : null
        };
      });

      setRutas(rutasConChofer);
      setSelectedRutas([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las rutas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRutas = rutas.filter(
    (r) =>
      r.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.chofer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vehiculo?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Solo rutas que se pueden eliminar (programada o cancelada)
  const deletableRutas = filteredRutas.filter(r => 
    r.status === "programada" || r.status === "cancelada"
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      programada: "secondary",
      en_curso: "default",
      completada: "outline",
      cancelada: "destructive",
    };

    const labels: Record<string, string> = {
      programada: "Programada",
      en_curso: "En Curso",
      completada: "Completada",
      cancelada: "Cancelada",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleIniciarRuta = (ruta: any) => {
    setSelectedRuta(ruta);
    setKmMode("iniciar");
    setKmDialogOpen(true);
  };

  const handleFinalizarRuta = (ruta: any) => {
    setSelectedRuta(ruta);
    setKmMode("finalizar");
    setKmDialogOpen(true);
  };

  const handleEditarRuta = (ruta: any) => {
    setSelectedRuta(ruta);
    setEditDialogOpen(true);
  };

  const handleSelectRuta = (rutaId: string, checked: boolean) => {
    if (checked) {
      setSelectedRutas(prev => [...prev, rutaId]);
    } else {
      setSelectedRutas(prev => prev.filter(id => id !== rutaId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRutas(deletableRutas.map(r => r.id));
    } else {
      setSelectedRutas([]);
    }
  };

  const handleDeleteSingle = (rutaId: string) => {
    setSelectedRutas([rutaId]);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedRutas.length === 0) return;
    
    setDeleting(true);
    try {
      // 1. Regresar pedidos a pendiente
      const { data: entregas } = await supabase
        .from("entregas")
        .select("pedido_id")
        .in("ruta_id", selectedRutas);
      
      if (entregas && entregas.length > 0) {
        const pedidoIds = entregas.map(e => e.pedido_id);
        await supabase
          .from("pedidos")
          .update({ status: "pendiente" })
          .in("id", pedidoIds);
      }

      // 2. Eliminar carga_productos
      await supabase
        .from("carga_productos")
        .delete()
        .in("entrega_id", (await supabase
          .from("entregas")
          .select("id")
          .in("ruta_id", selectedRutas)).data?.map(e => e.id) || []);

      // 3. Eliminar entregas
      await supabase
        .from("entregas")
        .delete()
        .in("ruta_id", selectedRutas);

      // 4. Eliminar evidencias
      await supabase
        .from("carga_evidencias")
        .delete()
        .in("ruta_id", selectedRutas);

      // 5. Eliminar ubicaciones
      await supabase
        .from("chofer_ubicaciones")
        .delete()
        .in("ruta_id", selectedRutas);

      // 6. Obtener vehículos para liberar
      const { data: rutasData } = await supabase
        .from("rutas")
        .select("vehiculo_id")
        .in("id", selectedRutas);

      // 7. Eliminar rutas
      const { error } = await supabase
        .from("rutas")
        .delete()
        .in("id", selectedRutas);

      if (error) throw error;

      // 8. Liberar vehículos
      if (rutasData) {
        const vehiculoIds = rutasData.map(r => r.vehiculo_id).filter(Boolean);
        if (vehiculoIds.length > 0) {
          await supabase
            .from("vehiculos")
            .update({ status: "disponible" })
            .in("id", vehiculoIds);
        }
      }

      toast({
        title: "Rutas eliminadas",
        description: `Se eliminaron ${selectedRutas.length} ruta(s) correctamente`,
      });

      loadRutas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron eliminar las rutas",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const canDelete = (status: string) => status === "programada" || status === "cancelada";

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Rutas y Entregas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Control de rutas de entrega, vehículos y zonas</p>
        </div>

        <Tabs defaultValue="planificar" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
            <TabsList className="inline-flex w-max gap-1">
              <TabsTrigger value="planificar" className="flex items-center gap-1.5 px-2 sm:px-3">
                <Route className="h-4 w-4" />
                <span className="hidden sm:inline">Planificar</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
              <TabsTrigger value="asignaciones" className="flex items-center gap-1.5 px-2 sm:px-3">
                <CalendarCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Asignaciones</span>
                <span className="sm:hidden">Asign</span>
              </TabsTrigger>
              <TabsTrigger value="monitoreo" className="flex items-center gap-1.5 px-2 sm:px-3">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Monitoreo</span>
                <span className="sm:hidden">Mon</span>
                {alertas.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1">
                    {alertas.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mapa" className="flex items-center gap-1.5 px-2 sm:px-3">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Mapa Global</span>
                <span className="sm:hidden">Mapa</span>
              </TabsTrigger>
              <TabsTrigger value="rutas" className="flex items-center gap-1.5 px-2 sm:px-3">
                <Truck className="h-4 w-4" />
                Rutas
              </TabsTrigger>
              <TabsTrigger value="vehiculos" className="flex items-center gap-1.5 px-2 sm:px-3">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Vehículos</span>
                <span className="sm:hidden">Veh</span>
              </TabsTrigger>
              <TabsTrigger value="zonas" className="flex items-center gap-1.5 px-2 sm:px-3">
                <MapPin className="h-4 w-4" />
                Zonas
              </TabsTrigger>
              <TabsTrigger value="disponibilidad" className="flex items-center gap-1.5 px-2 sm:px-3">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Disponibilidad</span>
                <span className="sm:hidden">Disp</span>
              </TabsTrigger>
              <TabsTrigger value="externos" className="flex items-center gap-1.5 px-2 sm:px-3">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Externos</span>
                <span className="sm:hidden">Ext</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="planificar">
            <PlanificadorRutas />
          </TabsContent>

          <TabsContent value="asignaciones">
            <AsignacionesDelDiaTab />
          </TabsContent>

          <TabsContent value="monitoreo">
            <MonitoreoRutasTab />
          </TabsContent>

          <TabsContent value="mapa">
            <MapaGlobalSucursales />
          </TabsContent>

          <TabsContent value="rutas" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, chofer o vehículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedRutas.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar ({selectedRutas.length})
                </Button>
              )}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={deletableRutas.length > 0 && selectedRutas.length === deletableRutas.length}
                        onCheckedChange={handleSelectAll}
                        disabled={deletableRutas.length === 0}
                      />
                    </TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Chofer</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Kilometraje</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredRutas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center">
                        No hay rutas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRutas.map((ruta) => (
                      <TableRow key={ruta.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRutas.includes(ruta.id)}
                            onCheckedChange={(checked) => handleSelectRuta(ruta.id, !!checked)}
                            disabled={!canDelete(ruta.status)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{ruta.folio}</TableCell>
                        <TableCell>
                          {new Date(ruta.fecha_ruta).toLocaleDateString("es-MX")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ruta.tipo_ruta === "local" ? "secondary" : "outline"}>
                            {ruta.tipo_ruta === "local" ? "Local" : "Foránea"}
                          </Badge>
                        </TableCell>
                        <TableCell>{ruta.vehiculo?.nombre || "—"}</TableCell>
                        <TableCell>{ruta.chofer?.full_name || "—"}</TableCell>
                        <TableCell>
                          {ruta.peso_total_kg?.toLocaleString() || 0} kg
                          {ruta.vehiculo && (
                            <span className="text-muted-foreground text-xs ml-1">
                              / {(ruta.tipo_ruta === "local" 
                                ? ruta.vehiculo.peso_maximo_local_kg 
                                : ruta.vehiculo.peso_maximo_foraneo_kg)?.toLocaleString()} kg
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <Gauge className="h-3 w-3 text-muted-foreground" />
                                  {ruta.kilometros_recorridos !== null && ruta.kilometros_recorridos > 0 ? (
                                    <span className="text-sm font-medium">
                                      {ruta.kilometros_recorridos.toLocaleString()} km
                                    </span>
                                  ) : ruta.kilometraje_inicial !== null ? (
                                    <span className="text-sm text-muted-foreground">
                                      {ruta.kilometraje_inicial.toLocaleString()} km (inicio)
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p>Inicial: {ruta.kilometraje_inicial?.toLocaleString() || "—"} km</p>
                                  <p>Final: {ruta.kilometraje_final?.toLocaleString() || "—"} km</p>
                                  {ruta.fecha_hora_inicio && (
                                    <p>Inicio: {format(new Date(ruta.fecha_hora_inicio), "dd/MM HH:mm", { locale: es })}</p>
                                  )}
                                  {ruta.fecha_hora_fin && (
                                    <p>Fin: {format(new Date(ruta.fecha_hora_fin), "dd/MM HH:mm", { locale: es })}</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{getStatusBadge(ruta.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {ruta.status === "programada" && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditarRuta(ruta)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar ruta (cambiar chofer/vehículo)</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                        onClick={() => handleIniciarRuta(ruta)}
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Iniciar ruta (registrar km inicial)</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                            {ruta.status === "en_curso" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                      onClick={() => handleFinalizarRuta(ruta)}
                                    >
                                      <Square className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Finalizar ruta (registrar km final)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {canDelete(ruta.status) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteSingle(ruta.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar ruta</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="vehiculos">
            <VehiculosTab />
          </TabsContent>

          <TabsContent value="zonas">
            <ZonasTab />
          </TabsContent>

          <TabsContent value="disponibilidad">
            <DisponibilidadPersonalTab />
          </TabsContent>

          <TabsContent value="externos">
            <AyudantesExternosTab />
          </TabsContent>
        </Tabs>

        <RutaKilometrajeDialog
          ruta={selectedRuta}
          open={kmDialogOpen}
          onOpenChange={setKmDialogOpen}
          onSuccess={loadRutas}
          mode={kmMode}
        />

        <EditarRutaDialog
          ruta={selectedRuta}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadRutas}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ruta(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará {selectedRutas.length} ruta(s) y sus entregas asociadas.
                Los pedidos volverán a estado "pendiente" para poder reprogramarse.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

/**
 * Componente principal envuelto en ErrorBoundary
 */
const Rutas = () => {
  return (
    <ErrorBoundaryModule moduleName="Rutas y Entregas">
      <RutasContent />
    </ErrorBoundaryModule>
  );
};

export default Rutas;
