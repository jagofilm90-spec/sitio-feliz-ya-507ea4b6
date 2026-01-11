import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Package, AlertTriangle, Check, X, MapPin, Calendar, User, Sparkles, Search, Filter, Globe, Home, Eye } from "lucide-react";
import { SugerirRutasAIDialog } from "./SugerirRutasAIDialog";
import { PedidoPreviewPopover } from "./PedidoPreviewPopover";
import { AyudantesMultiSelect } from "./AyudantesMultiSelect";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useRouteNotifications } from "@/hooks/useRouteNotifications";

interface Chofer {
  id: string; // empleado_id - usado para guardar en rutas.chofer_id
  nombre_completo: string;
  empleado_id: string;
  user_id?: string | null; // para notificaciones push
}

interface Almacenista {
  id: string;
  nombre_completo: string;
}

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
  peso_maximo_local_kg: number;
  peso_maximo_foraneo_kg: number;
  status: string;
  chofer_asignado_id: string | null;
}

interface Pedido {
  id: string;
  folio: string;
  cliente_id: string;
  cliente: {
    nombre: string;
    direccion: string | null;
    zona: { id: string; nombre: string; es_foranea: boolean; region: string | null } | null;
  };
  sucursal: { 
    nombre: string;
    zona: { id: string; nombre: string; es_foranea: boolean; region: string | null } | null;
  } | null;
  total: number;
  peso_total_kg: number;
  fecha_pedido: string;
  fecha_entrega_estimada: string | null;
  prioridad_entrega: string | null;
}

// Helper to get effective delivery zone (sucursal zone > cliente zone)
const getZonaEntrega = (pedido: Pedido) => {
  return pedido.sucursal?.zona || pedido.cliente.zona;
};

interface PedidoSeleccionado extends Pedido {
  orden: number;
}

// Region labels for grouping
const REGION_LABELS: Record<string, string> = {
  cdmx_norte: "CDMX Norte",
  cdmx_sur: "CDMX Sur",
  cdmx_centro: "CDMX Centro",
  cdmx_oriente: "CDMX Oriente",
  cdmx_poniente: "CDMX Poniente",
  edomex_oriente: "EdoMex Oriente",
  edomex_norte: "EdoMex Norte",
  edomex_poniente: "EdoMex Poniente",
  morelos: "Morelos",
  puebla: "Puebla",
  queretaro: "Querétaro",
  hidalgo: "Hidalgo",
  tlaxcala: "Tlaxcala",
  otro: "Otras Regiones",
};

const formatKg = (value: number) => {
  return Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const PlanificadorRutas = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [almacenistas, setAlmacenistas] = useState<Almacenista[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const { toast } = useToast();
  const { notifyRouteAssignment, notifyAlmacenistaAssignment } = useRouteNotifications();

  // Form state
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>("");
  const [selectedChofer, setSelectedChofer] = useState<string>("");
  const [selectedAyudantes, setSelectedAyudantes] = useState<string[]>([]);
  const [selectedAlmacenista, setSelectedAlmacenista] = useState<string>("");
  const [horaSalida, setHoraSalida] = useState<string>("09:00");
  const [fechaRuta, setFechaRuta] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [tipoRuta, setTipoRuta] = useState<"local" | "foranea">("local");
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<PedidoSeleccionado[]>([]);
  const [notas, setNotas] = useState("");

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<"todos" | "local" | "foranea">("todos");
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load available vehicles with assigned driver info
      const { data: vehiculosData, error: vehiculosError } = await supabase
        .from("vehiculos")
        .select("id, nombre, tipo, peso_maximo_local_kg, peso_maximo_foraneo_kg, status, chofer_asignado_id")
        .eq("activo", true)
        .eq("status", "disponible")
        .order("nombre");

      if (vehiculosError) throw vehiculosError;
      setVehiculos(vehiculosData || []);

      // Load drivers from empleados table by puesto exacto "Chofer" (no incluye "Ayudante de Chofer")
      // IMPORTANTE: Guardamos empleado_id en rutas.chofer_id, NO user_id
      const { data: choferesData, error: choferesError } = await supabase
        .from("empleados")
        .select("id, nombre_completo, user_id")
        .eq("activo", true)
        .eq("puesto", "Chofer")
        .order("nombre_completo");

      if (!choferesError && choferesData) {
        const transformedChoferes = choferesData.map((c) => ({
          id: c.id, // SIEMPRE usar empleado_id para guardar en rutas.chofer_id
          nombre_completo: c.nombre_completo,
          empleado_id: c.id,
          user_id: c.user_id, // Guardar user_id por separado para notificaciones
        }));
        setChoferes(transformedChoferes);
      }

      // Load almacenistas from empleados table by puesto
      const { data: almacenistasData, error: almacenistasError } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .eq("activo", true)
        .or("puesto.ilike.%Almacen%,puesto.ilike.%almacen%,puesto.ilike.%Almacenista%,puesto.ilike.%almacenista%")
        .order("nombre_completo");

      if (!almacenistasError && almacenistasData) {
        setAlmacenistas(almacenistasData);
      }

      // Load pending orders with sucursal zone info (priority) and client zone as fallback
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          id,
          folio,
          cliente_id,
          total,
          peso_total_kg,
          fecha_pedido,
          fecha_entrega_estimada,
          prioridad_entrega,
          sucursal:sucursal_id (
            nombre,
            zona:zona_id (id, nombre, es_foranea, region)
          ),
          cliente:cliente_id (
            nombre,
            direccion,
            zona:zona_id (id, nombre, es_foranea, region)
          )
        `)
        .eq("status", "pendiente")
        .order("fecha_pedido");

      if (pedidosError) throw pedidosError;
      
      const transformedPedidos = (pedidosData || []).map((p: any) => ({
        ...p,
        cliente_id: p.cliente_id,
        cliente: p.cliente || { nombre: "Sin cliente", direccion: null, zona: null },
        sucursal: p.sucursal || null,
      }));
      
      setPedidosPendientes(transformedPedidos);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill chofer when vehicle selected
  const handleVehiculoChange = (vehiculoId: string) => {
    setSelectedVehiculo(vehiculoId);
    const vehiculo = vehiculos.find(v => v.id === vehiculoId);
    if (vehiculo?.chofer_asignado_id) {
      const choferAsignado = choferes.find(c => c.empleado_id === vehiculo.chofer_asignado_id);
      if (choferAsignado) {
        setSelectedChofer(choferAsignado.id);
      }
    }
  };

  const vehiculoSeleccionado = vehiculos.find(v => v.id === selectedVehiculo);
  const choferAsignadoAlVehiculo = vehiculoSeleccionado?.chofer_asignado_id
    ? choferes.find(c => c.empleado_id === vehiculoSeleccionado.chofer_asignado_id)
    : null;
  
  const pesoTotal = pedidosSeleccionados.reduce((sum, p) => sum + (p.peso_total_kg || 0), 0);
  const capacidadMaxima = vehiculoSeleccionado 
    ? (tipoRuta === "local" ? vehiculoSeleccionado.peso_maximo_local_kg : vehiculoSeleccionado.peso_maximo_foraneo_kg)
    : 0;
  const porcentajeCapacidad = capacidadMaxima > 0 ? (pesoTotal / capacidadMaxima) * 100 : 0;
  const excedido = pesoTotal > capacidadMaxima;

  // Check zone consistency and auto-detect route type using effective delivery zone
  const zonasUnicas = [...new Set(pedidosSeleccionados
    .map(p => getZonaEntrega(p)?.nombre)
    .filter(Boolean))];
  const zonasMultiples = zonasUnicas.length > 1;

  const agregarPedido = (pedido: Pedido) => {
    if (pedidosSeleccionados.some(p => p.id === pedido.id)) return;
    
    // Use sucursal zone if available, otherwise client zone
    const zonaEntrega = getZonaEntrega(pedido);
    
    // Auto-detect foranea if delivery zone is foranea
    if (zonaEntrega?.es_foranea && tipoRuta === "local") {
      setTipoRuta("foranea");
      toast({
        title: "Tipo de ruta actualizado automáticamente",
        description: `Zona de entrega "${zonaEntrega.nombre}" es foránea.`,
      });
    }
    
    setPedidosSeleccionados([
      ...pedidosSeleccionados,
      { ...pedido, orden: pedidosSeleccionados.length + 1 }
    ]);
  };

  const quitarPedido = (pedidoId: string) => {
    const nuevos = pedidosSeleccionados
      .filter(p => p.id !== pedidoId)
      .map((p, idx) => ({ ...p, orden: idx + 1 }));
    setPedidosSeleccionados(nuevos);
    
    // Re-evaluate route type if no foranea zones remain (using effective delivery zone)
    const remainingForanea = nuevos.some(p => getZonaEntrega(p)?.es_foranea);
    if (!remainingForanea && tipoRuta === "foranea") {
      setTipoRuta("local");
    }
  };

  const handleCrearRuta = async () => {
    if (!selectedVehiculo || !selectedChofer || pedidosSeleccionados.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un vehículo, chofer y al menos un pedido",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate folio
      const { data: lastRuta } = await supabase
        .from("rutas")
        .select("folio")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastNumber = lastRuta?.[0]?.folio 
        ? parseInt(lastRuta[0].folio.replace("RUT-", "")) 
        : 0;
      const newFolio = `RUT-${String(lastNumber + 1).padStart(4, "0")}`;

      // Create route with ayudantes_ids array (no usar ayudante_id por foreign key a profiles)
      const { data: rutaData, error: rutaError } = await supabase
        .from("rutas")
        .insert([{
          folio: newFolio,
          fecha_ruta: fechaRuta,
          chofer_id: selectedChofer,
          // ayudante_id eliminado - tiene FK a profiles(id) pero guardamos empleados(id)
          ayudantes_ids: selectedAyudantes.length > 0 ? selectedAyudantes : null,
          vehiculo_id: selectedVehiculo,
          almacenista_id: selectedAlmacenista || null,
          hora_salida_sugerida: horaSalida,
          peso_total_kg: pesoTotal,
          tipo_ruta: tipoRuta,
          status: "programada",
          notas: notas || null,
        }])
        .select()
        .single();

      if (rutaError) throw rutaError;

      // Create entregas for each pedido
      const entregasData = pedidosSeleccionados.map(pedido => ({
        ruta_id: rutaData.id,
        pedido_id: pedido.id,
        orden_entrega: pedido.orden,
        entregado: false,
      }));

      const { error: entregasError } = await supabase
        .from("entregas")
        .insert(entregasData);

      if (entregasError) throw entregasError;

      // Update pedidos status to en_ruta
      const pedidoIds = pedidosSeleccionados.map(p => p.id);
      await supabase
        .from("pedidos")
        .update({ status: "en_ruta" })
        .in("id", pedidoIds);

      // Update vehicle status
      await supabase
        .from("vehiculos")
        .update({ status: "en_ruta" })
        .eq("id", selectedVehiculo);

      toast({ title: `Ruta ${newFolio} creada correctamente` });

      // Send "en_ruta" notification to each client
      const choferInfo = choferes.find(c => c.id === selectedChofer);
      for (const pedido of pedidosSeleccionados) {
        try {
          await supabase.functions.invoke("send-client-notification", {
            body: {
              clienteId: pedido.cliente_id,
              tipo: "en_ruta",
              data: {
                pedidoFolio: pedido.folio,
                choferNombre: choferInfo?.nombre_completo || "Nuestro equipo",
              },
            },
          });
        } catch (notifError) {
          console.error("Error sending en_ruta notification:", notifError);
        }
      }

      // Send notifications usando user_id para push (no empleado_id)
      const choferSeleccionado = choferes.find(c => c.id === selectedChofer);
      await notifyRouteAssignment({
        choferId: choferSeleccionado?.user_id || selectedChofer, // Usar user_id si disponible
        ayudanteId: selectedAyudantes[0] || null,
        rutaFolio: newFolio,
        rutaId: rutaData.id,
        fechaRuta: fechaRuta,
      });

      if (selectedAlmacenista) {
        const vehiculoInfo = vehiculos.find(v => v.id === selectedVehiculo);
        await notifyAlmacenistaAssignment({
          almacenistaId: selectedAlmacenista,
          rutaFolio: newFolio,
          rutaId: rutaData.id,
          fechaRuta: fechaRuta,
          horaSalida: horaSalida,
          vehiculoNombre: vehiculoInfo?.nombre,
        });
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedVehiculo("");
    setSelectedChofer("");
    setSelectedAyudantes([]);
    setSelectedAlmacenista("");
    setHoraSalida("09:00");
    setFechaRuta(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setTipoRuta("local");
    setPedidosSeleccionados([]);
    setNotas("");
    setSearchTerm("");
    setFilterTipo("todos");
  };

  // Filter and group pending orders
  const pedidosDisponibles = useMemo(() => {
    return pedidosPendientes.filter(p => {
      // Exclude already selected
      if (pedidosSeleccionados.some(ps => ps.id === p.id)) return false;
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesFolio = p.folio.toLowerCase().includes(term);
        const matchesCliente = p.cliente.nombre.toLowerCase().includes(term);
        const matchesSucursal = p.sucursal?.nombre?.toLowerCase().includes(term);
        if (!matchesFolio && !matchesCliente && !matchesSucursal) return false;
      }
      
      // Type filter using effective delivery zone
      const zona = getZonaEntrega(p);
      if (filterTipo === "local" && zona?.es_foranea) return false;
      if (filterTipo === "foranea" && !zona?.es_foranea) return false;
      
      return true;
    });
  }, [pedidosPendientes, pedidosSeleccionados, searchTerm, filterTipo]);

  // Group by region using effective delivery zone
  const pedidosAgrupados = useMemo(() => {
    const groups: Record<string, Pedido[]> = {};
    
    pedidosDisponibles.forEach(pedido => {
      const zona = getZonaEntrega(pedido);
      const region = zona?.region || "otro";
      if (!groups[region]) groups[region] = [];
      groups[region].push(pedido);
    });
    
    // Sort regions: foranea regions at end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const aForanea = groups[a].some(p => getZonaEntrega(p)?.es_foranea);
      const bForanea = groups[b].some(p => getZonaEntrega(p)?.es_foranea);
      if (aForanea && !bForanea) return 1;
      if (!aForanea && bForanea) return -1;
      return a.localeCompare(b);
    });
    
    return { groups, sortedKeys };
  }, [pedidosDisponibles]);

  const getRegionStats = (pedidos: Pedido[]) => {
    const totalPeso = pedidos.reduce((sum, p) => sum + (p.peso_total_kg || 0), 0);
    const esForanea = pedidos.some(p => getZonaEntrega(p)?.es_foranea);
    return { count: pedidos.length, peso: totalPeso, esForanea };
  };

  const getPrioridadBadge = (prioridad: string | null) => {
    switch (prioridad) {
      case "mismo_dia":
        return <Badge variant="destructive" className="text-xs">VIP</Badge>;
      case "fecha_limite":
        return <Badge className="bg-orange-500 text-xs">Deadline</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Planificar Nueva Ruta</h2>
          <p className="text-sm text-muted-foreground">
            Asigna pedidos a un vehículo y optimiza la ruta
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Sugerir Rutas AI
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Ruta
          </Button>
        </div>
      </div>

      <SugerirRutasAIDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onRutaCreada={loadData}
        choferes={choferes.map(c => ({ id: c.id, full_name: c.nombre_completo }))}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planificar Nueva Ruta</DialogTitle>
            <DialogDescription>
              Selecciona un vehículo y asigna los pedidos para la ruta
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Left column - Vehicle & Capacity */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Ruta *</Label>
                  <Input
                    type="date"
                    value={fechaRuta}
                    onChange={(e) => setFechaRuta(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Salida *</Label>
                  <Input
                    type="time"
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Ruta *</Label>
                  <Select value={tipoRuta} onValueChange={(v: "local" | "foranea") => setTipoRuta(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Local (CDMX)
                        </div>
                      </SelectItem>
                      <SelectItem value="foranea">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Foránea
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vehículo *</Label>
                <Select value={selectedVehiculo} onValueChange={handleVehiculoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {v.nombre} - L:{formatKg(v.peso_maximo_local_kg)}kg / F:{formatKg(v.peso_maximo_foraneo_kg)}kg
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {choferAsignadoAlVehiculo && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Chofer asignado: {choferAsignadoAlVehiculo.nombre_completo}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Chofer *
                </Label>
                <Select value={selectedChofer} onValueChange={setSelectedChofer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un chofer" />
                  </SelectTrigger>
                  <SelectContent>
                    {choferes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre_completo}
                        {choferAsignadoAlVehiculo?.id === c.id && (
                          <span className="ml-2 text-muted-foreground">(asignado)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {choferAsignadoAlVehiculo && selectedChofer !== choferAsignadoAlVehiculo.id && selectedChofer && (
                  <p className="text-xs text-orange-600">
                    ⚠️ Chofer diferente al asignado al vehículo
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Ayudantes
                </Label>
                <AyudantesMultiSelect
                  selectedAyudantes={selectedAyudantes}
                  onSelectionChange={setSelectedAyudantes}
                  excludeIds={selectedChofer ? [selectedChofer] : []}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Almacenista Responsable de Carga
                </Label>
                <Select value={selectedAlmacenista} onValueChange={(v) => setSelectedAlmacenista(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar almacenista..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {almacenistas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {vehiculoSeleccionado && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Capacidad del Vehículo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cargado: {formatKg(pesoTotal)} kg</span>
                        <span>Máximo: {formatKg(capacidadMaxima)} kg</span>
                      </div>
                      <Progress 
                        value={Math.min(porcentajeCapacidad, 100)} 
                        className={excedido ? "bg-destructive/20" : ""}
                      />
                      {excedido && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          Excede la capacidad por {formatKg(pesoTotal - capacidadMaxima)} kg
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {zonasMultiples && (
                <Card className="border-yellow-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        Mezcla de zonas: {zonasUnicas.join(", ")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas para el chofer..."
                  autoComplete="off"
                />
              </div>

              {/* Selected orders */}
              <div className="space-y-2">
                <Label>Pedidos Asignados ({pedidosSeleccionados.length}) - {formatKg(pesoTotal)} kg</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {pedidosSeleccionados.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Selecciona pedidos de la lista
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pedidosSeleccionados.map((pedido) => (
                        <div key={pedido.id} className="p-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                              {pedido.orden}
                            </Badge>
                            <PedidoPreviewPopover pedidoId={pedido.id} folio={pedido.folio}>
                              <div className="cursor-pointer hover:bg-muted/50 rounded px-1">
                                <p className="text-sm font-medium">{pedido.folio}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pedido.cliente.nombre}
                                  {pedido.sucursal?.nombre && ` - ${pedido.sucursal.nombre}`}
                                </p>
                              </div>
                            </PedidoPreviewPopover>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatKg(pedido.peso_total_kg)} kg
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => quitarPedido(pedido.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column - Available orders with search and grouping */}
            <div className="space-y-3">
              <Label>Pedidos Pendientes ({pedidosDisponibles.length})</Label>
              
              {/* Search and filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar folio, cliente o sucursal..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterTipo} onValueChange={(v: "todos" | "local" | "foranea") => setFilterTipo(v)}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="local">Locales</SelectItem>
                    <SelectItem value="foranea">Foráneas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg max-h-[450px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">Cargando...</div>
                ) : pedidosDisponibles.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {searchTerm ? "Sin resultados para la búsqueda" : "No hay pedidos pendientes"}
                  </div>
                ) : (
                  <Accordion
                    type="multiple"
                    value={expandedRegions}
                    onValueChange={setExpandedRegions}
                    className="w-full"
                  >
                    {pedidosAgrupados.sortedKeys.map((region) => {
                      const pedidos = pedidosAgrupados.groups[region];
                      const stats = getRegionStats(pedidos);
                      
                      return (
                        <AccordionItem key={region} value={region} className="border-b-0">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/50">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-medium">
                                {REGION_LABELS[region] || region}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {stats.count}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatKg(stats.peso)} kg
                              </span>
                              {stats.esForanea && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Foránea
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-0">
                            <div className="divide-y">
                              {pedidos.map((pedido) => {
                                const zonaEntrega = getZonaEntrega(pedido);
                                return (
                                  <div
                                    key={pedido.id}
                                    className="px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                                  >
                                    {/* Visible eye button for product preview */}
                                    <PedidoPreviewPopover pedidoId={pedido.id} folio={pedido.folio}>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </PedidoPreviewPopover>
                                    
                                    {/* Clickable area to add order */}
                                    <div
                                      className="flex-1 min-w-0 cursor-pointer"
                                      onClick={() => agregarPedido(pedido)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{pedido.folio}</span>
                                        {getPrioridadBadge(pedido.prioridad_entrega)}
                                        {zonaEntrega?.es_foranea && (
                                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                            <Globe className="h-3 w-3" />
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm truncate">
                                        {pedido.cliente.nombre}
                                        {pedido.sucursal?.nombre && (
                                          <span className="text-muted-foreground"> - {pedido.sucursal.nombre}</span>
                                        )}
                                      </p>
                                      {zonaEntrega && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                          <MapPin className="h-3 w-3 mr-1" />
                                          {zonaEntrega.nombre}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Weight and total */}
                                    <div 
                                      className="text-right shrink-0 cursor-pointer"
                                      onClick={() => agregarPedido(pedido)}
                                    >
                                      <p className="text-sm font-medium">
                                        {formatKg(pedido.peso_total_kg)} kg
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        ${pedido.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || "0.00"}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrearRuta}
              disabled={!selectedVehiculo || !selectedChofer || pedidosSeleccionados.length === 0 || excedido}
            >
              <Check className="h-4 w-4 mr-2" />
              Crear Ruta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vehículos Disponibles</CardDescription>
            <CardTitle className="text-2xl">{vehiculos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pedidos Pendientes</CardDescription>
            <CardTitle className="text-2xl">{pedidosPendientes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Peso Total Pendiente</CardDescription>
            <CardTitle className="text-2xl">
              {formatKg(pedidosPendientes.reduce((sum, p) => sum + (p.peso_total_kg || 0), 0))} kg
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default PlanificadorRutas;
