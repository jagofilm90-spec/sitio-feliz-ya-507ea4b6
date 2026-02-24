import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { Search, Plus, MapPin, Phone, Building2, MessageCircle, ShoppingCart, History, Navigation, AlertTriangle, MapPinned, Pencil, Trash2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VendedorNuevoClienteSheet } from "./VendedorNuevoClienteSheet";
import { GeocodificarSucursalSheet } from "./GeocodificarSucursalSheet";
import { EditarClienteSheet } from "./EditarClienteSheet";

interface Props {
  onClienteCreado: () => void;
}

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface Zona {
  nombre: string;
  region: string | null;
}

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  saldo_pendiente: number | null;
  ultimo_pedido?: string | null;
  sucursales_count?: number;
  sucursales_sin_gps?: number;
  sucursales?: Sucursal[];
  zona?: Zona | null;
}

// Regions that belong to Valle de México (metropolitan area)
const VALLE_MEXICO_REGIONS = [
  'cdmx_norte', 'cdmx_centro', 'cdmx_sur', 
  'cdmx_oriente', 'cdmx_poniente',
  'edomex_norte', 'edomex_oriente'
];

// Foráneas regions as separate tabs
const REGIONES_FORANEAS = [
  { key: 'toluca', label: 'Toluca', regions: ['toluca'] },
  { key: 'morelos', label: 'Morelos', regions: ['morelos'] },
  { key: 'puebla', label: 'Puebla', regions: ['puebla'] },
  { key: 'hidalgo', label: 'Hidalgo', regions: ['hidalgo'] },
  { key: 'queretaro', label: 'Querétaro', regions: ['queretaro'] },
  { key: 'tlaxcala', label: 'Tlaxcala', regions: ['tlaxcala'] },
];

export function VendedorMisClientesTab({ onClienteCreado }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [activeRegion, setActiveRegion] = useState("todos");
  
  // Geocodificación
  const [showGeocodificar, setShowGeocodificar] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
  
  // Editar cliente
  const [showEditarCliente, setShowEditarCliente] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  // Eliminar cliente
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("clientes")
        .select(`
          id, codigo, nombre, direccion, telefono, saldo_pendiente,
          zona:zonas(nombre, region),
          sucursales:cliente_sucursales(id, nombre, direccion, latitud, longitud)
        `)
        .eq("vendedor_asignado", user.id)
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;

      // Get last order date for each client and count sucursales sin GPS
      const clientesConInfo = await Promise.all(
        (data || []).map(async (cliente: any) => {
          const { data: ultimoPedido } = await supabase
            .from("pedidos")
            .select("fecha_pedido")
            .eq("cliente_id", cliente.id)
            .order("fecha_pedido", { ascending: false })
            .limit(1)
            .maybeSingle();

          const sucursales = cliente.sucursales || [];
          const sucursalesSinGps = sucursales.filter((s: Sucursal) => !s.latitud || !s.longitud).length;

          return {
            ...cliente,
            ultimo_pedido: ultimoPedido?.fecha_pedido || null,
            sucursales_count: sucursales.length,
            sucursales_sin_gps: sucursalesSinGps,
            sucursales,
          };
        })
      );

      setClientes(clientesConInfo);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a region belongs to Valle de México
  const esValledeMexico = (region: string | null | undefined) => {
    if (!region) return false;
    return VALLE_MEXICO_REGIONS.includes(region);
  };

  // Count clients per region for tab badges
  const conteosPorRegion = useMemo(() => {
    const conteos: Record<string, number> = { todos: clientes.length };
    
    // Count Valle de México
    conteos['valle_mexico'] = clientes.filter(c => esValledeMexico(c.zona?.region)).length;
    
    // Count each foránea region
    REGIONES_FORANEAS.forEach(regionInfo => {
      conteos[regionInfo.key] = clientes.filter(c => 
        regionInfo.regions.includes(c.zona?.region || '')
      ).length;
    });
    
    // Count "sin zona" (no zone assigned)
    conteos['sin_zona'] = clientes.filter(c => !c.zona?.region).length;
    
    return conteos;
  }, [clientes]);

  // Filter clients by search term first
  const clientesFiltradosPorBusqueda = useMemo(() => {
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  // Filter by region tab
  const clientesFiltrados = useMemo(() => {
    if (activeRegion === 'todos') return clientesFiltradosPorBusqueda;
    
    if (activeRegion === 'valle_mexico') {
      return clientesFiltradosPorBusqueda.filter(c => esValledeMexico(c.zona?.region));
    }
    
    if (activeRegion === 'sin_zona') {
      return clientesFiltradosPorBusqueda.filter(c => !c.zona?.region);
    }
    
    const regionInfo = REGIONES_FORANEAS.find(r => r.key === activeRegion);
    if (regionInfo) {
      return clientesFiltradosPorBusqueda.filter(c => 
        regionInfo.regions.includes(c.zona?.region || '')
      );
    }
    
    return clientesFiltradosPorBusqueda;
  }, [clientesFiltradosPorBusqueda, activeRegion]);

  // Get region tabs that have clients (to avoid showing empty tabs)
  const tabsVisibles = useMemo(() => {
    const tabs: { key: string; label: string; count: number }[] = [
      { key: 'todos', label: 'Todos', count: conteosPorRegion['todos'] },
    ];
    
    if (conteosPorRegion['valle_mexico'] > 0) {
      tabs.push({ key: 'valle_mexico', label: 'Valle de México', count: conteosPorRegion['valle_mexico'] });
    }
    
    REGIONES_FORANEAS.forEach(region => {
      if (conteosPorRegion[region.key] > 0) {
        tabs.push({ key: region.key, label: region.label, count: conteosPorRegion[region.key] });
      }
    });
    
    if (conteosPorRegion['sin_zona'] > 0) {
      tabs.push({ key: 'sin_zona', label: 'Sin zona', count: conteosPorRegion['sin_zona'] });
    }
    
    return tabs;
  }, [conteosPorRegion]);

  const handleClienteCreado = () => {
    setShowNuevoCliente(false);
    fetchClientes();
    onClienteCreado();
  };

  const handleOpenGeocodificar = (sucursal: Sucursal) => {
    setSelectedSucursal(sucursal);
    setShowGeocodificar(true);
  };

  const handleGeocodificado = () => {
    fetchClientes();
  };

  const handleDeleteCliente = async () => {
    if (!clienteToDelete) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from("clientes")
        .update({ activo: false })
        .eq("id", clienteToDelete.id);

      if (error) throw error;

      toast.success(`Cliente "${clienteToDelete.nombre}" eliminado`);
      setShowDeleteConfirm(false);
      setClienteToDelete(null);
      fetchClientes();
      onClienteCreado(); // refresh dashboard
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar el cliente");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Add - Larger for tablet */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-lg"
          />
        </div>
        <Button 
          onClick={() => setShowNuevoCliente(true)}
          className="h-14 px-6 text-base"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Nuevo Cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Region Tabs */}
      {tabsVisibles.length > 1 && (
        <Tabs value={activeRegion} onValueChange={setActiveRegion} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="h-auto p-1 flex flex-nowrap gap-1 justify-start bg-muted/50">
              {tabsVisibles.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="shrink-0 data-[state=active]:bg-background px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {tab.key === 'valle_mexico' && <MapPinned className="h-4 w-4" />}
                    <span className="text-sm">{tab.label}</span>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {tab.count}
                    </Badge>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        </Tabs>
      )}

      {/* Client Grid - Responsive for tablet/desktop */}
      <ScrollArea className="h-[calc(100vh-400px)] lg:h-[calc(100vh-350px)]">
        {clientesFiltrados.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchTerm || activeRegion !== 'todos' 
                  ? "No se encontraron clientes" 
                  : "No tienes clientes asignados"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {searchTerm 
                  ? "Intenta con otro término de búsqueda" 
                  : activeRegion !== 'todos'
                    ? "No hay clientes en esta zona"
                    : "Comienza agregando tu primer cliente para empezar a vender"}
              </p>
              {!searchTerm && activeRegion === 'todos' && (
                <Button 
                  onClick={() => setShowNuevoCliente(true)}
                  size="lg"
                  className="h-12 px-6"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar primer cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientesFiltrados.map((cliente) => (
              <Card 
                key={cliente.id} 
                className="hover:shadow-lg transition-all duration-200 hover:border-primary/50"
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate mb-1">
                        {cliente.nombre}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {cliente.codigo}
                        </Badge>
                        {cliente.zona?.nombre && (
                          <Badge variant="secondary" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {cliente.zona.nombre}
                          </Badge>
                        )}
                        {(cliente.sucursales_sin_gps || 0) > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Sin GPS
                          </Badge>
                        )}
                      </div>
                    </div>
                    {(cliente.saldo_pendiente || 0) > 0 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                        {formatCurrency(cliente.saldo_pendiente || 0)}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-2 mb-5">
                    {cliente.direccion && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{cliente.direccion}</span>
                      </div>
                    )}
                    
                    {cliente.telefono && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <a 
                          href={`tel:${cliente.telefono}`}
                          className="text-primary hover:underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cliente.telefono}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      {(cliente.sucursales_count || 0) > 0 && (
                        <span>{cliente.sucursales_count} sucursal(es)</span>
                      )}
                      {cliente.ultimo_pedido && (
                        <span>
                          Último pedido: {new Date(cliente.ultimo_pedido).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sucursales con GPS - Botón para ver en Google Maps */}
                  {cliente.sucursales?.some(s => s.latitud && s.longitud) && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                        🗺️ Ver en Google Maps:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cliente.sucursales
                          ?.filter((s) => s.latitud && s.longitud)
                          .map((sucursal) => (
                            <Button
                              key={sucursal.id}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-white dark:bg-background"
                              onClick={() => {
                                window.open(
                                  `https://www.google.com/maps?q=${sucursal.latitud},${sucursal.longitud}`,
                                  '_blank'
                                );
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {sucursal.nombre}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sucursales sin GPS - Botón para geocodificar */}
                  {(cliente.sucursales_sin_gps || 0) > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                        📍 Sucursales pendientes de geocodificar:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cliente.sucursales
                          ?.filter((s) => !s.latitud || !s.longitud)
                          .map((sucursal) => (
                            <Button
                              key={sucursal.id}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-white dark:bg-background"
                              onClick={() => handleOpenGeocodificar(sucursal)}
                            >
                              <Navigation className="h-3 w-3 mr-1" />
                              {sucursal.nombre}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - Large and tactile */}
                  <div className="grid grid-cols-5 gap-2">
                    <Button 
                      variant="outline" 
                      className="h-12 flex-col gap-1 p-2"
                      onClick={() => {
                        if (cliente.telefono) {
                          const tel = cliente.telefono.replace(/\D/g, '');
                          window.open(`https://wa.me/52${tel}`, '_blank');
                        } else {
                          toast.error("Este cliente no tiene teléfono registrado");
                        }
                      }}
                      disabled={!cliente.telefono}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-[10px]">WhatsApp</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12 flex-col gap-1 p-2"
                      onClick={() => {
                        toast.info("Ve a la pestaña 'Nueva Venta' y selecciona este cliente");
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span className="text-[10px]">Pedido</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12 flex-col gap-1 p-2"
                      onClick={() => {
                        toast.info("Ve a la pestaña 'Mis Ventas' para ver el historial");
                      }}
                    >
                      <History className="h-4 w-4" />
                      <span className="text-[10px]">Historial</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12 flex-col gap-1 p-2"
                      onClick={() => {
                        setSelectedClienteId(cliente.id);
                        setShowEditarCliente(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="text-[10px]">Editar</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12 flex-col gap-1 p-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        setClienteToDelete({ id: cliente.id, nombre: cliente.nombre });
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-[10px]">Eliminar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Client Sheet */}
      <VendedorNuevoClienteSheet
        open={showNuevoCliente}
        onOpenChange={setShowNuevoCliente}
        onClienteCreado={handleClienteCreado}
      />

      {/* Geocodificar Sheet */}
      {selectedSucursal && (
        <GeocodificarSucursalSheet
          open={showGeocodificar}
          onOpenChange={setShowGeocodificar}
          sucursalId={selectedSucursal.id}
          sucursalNombre={selectedSucursal.nombre}
          direccionActual={selectedSucursal.direccion}
          latitudActual={selectedSucursal.latitud}
          longitudActual={selectedSucursal.longitud}
          onGeocodificado={handleGeocodificado}
        />
      )}

      {/* Editar Cliente Sheet */}
      {selectedClienteId && (
        <EditarClienteSheet
          open={showEditarCliente}
          onOpenChange={setShowEditarCliente}
          clienteId={selectedClienteId}
          onClienteActualizado={fetchClientes}
        />
      )}
      {/* Confirmar eliminar cliente */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente <strong>{clienteToDelete?.nombre}</strong> será desactivado y ya no aparecerá en tu lista. Esta acción puede ser revertida por un administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCliente}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
