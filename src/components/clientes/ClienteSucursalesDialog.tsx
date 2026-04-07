import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SucursalFormModal } from "./SucursalFormModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MapPin, Search, ChevronLeft, ChevronRight, CheckSquare, Wand2, AlertTriangle, FileText, Loader2, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface ClienteSucursalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: { id: string; nombre: string; grupo_cliente_id?: string | null } | null;
}

interface Sucursal {
  id: string;
  nombre: string;
  codigo_sucursal: string | null;
  cl: string | null;
  direccion: string;
  zona_id: string | null;
  telefono: string | null;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
  zona?: { nombre: string; es_foranea?: boolean } | null;
  horario_entrega: string | null;
  restricciones_vehiculo: string | null;
  dias_sin_entrega: string | null;
  no_combinar_pedidos: boolean;
  es_rosticeria: boolean;
  rfc: string | null;
  razon_social: string | null;
  direccion_fiscal: string | null;
  email_facturacion: string | null;
  latitud: number | null;
  longitud: number | null;
  metadata_entrega: any;
  sucursal_hermana_id: string | null;
  sucursal_entrega_id: string | null;
}

interface Zona {
  id: string;
  nombre: string;
  es_foranea?: boolean;
}

const ITEMS_POR_PAGINA = 20;

const ClienteSucursalesDialog = ({
  open,
  onOpenChange,
  cliente,
}: ClienteSucursalesDialogProps) => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'rosticeria' | 'regular'>('todas');
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkZonaId, setBulkZonaId] = useState<string>("");
  const [autoDetectando, setAutoDetectando] = useState(false);
  const [geocodificandoTodas, setGeocodificandoTodas] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Helper para abrir URLs externas (compatible con Chrome COOP)
  const openExternalUrl = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para abrir Google Maps con la dirección o coordenadas
  const openGoogleMaps = (sucursal: Sucursal) => {
    if (sucursal.latitud && sucursal.longitud) {
      // Si tiene coordenadas, abrir con pin exacto usando Maps URL API
      openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${sucursal.latitud},${sucursal.longitud}`);
    } else if (sucursal.direccion) {
      // Fallback a búsqueda por texto
      const encodedAddress = encodeURIComponent(sucursal.direccion);
      openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
    } else {
      toast({
        title: "Sin dirección",
        description: "Esta sucursal no tiene dirección registrada",
        variant: "destructive"
      });
    }
  };

  // Función para geocodificar todas las sucursales sin coordenadas
  const geocodificarTodas = async () => {
    const sinCoordenadas = sucursales.filter(s => s.direccion && (!s.latitud || !s.longitud));
    
    if (sinCoordenadas.length === 0) {
      toast({
        title: "Sin sucursales pendientes",
        description: "Todas las sucursales con dirección ya tienen coordenadas"
      });
      return;
    }

    setGeocodificandoTodas(true);
    try {
      const addresses = sinCoordenadas.map(s => ({
        id: s.id,
        address: s.direccion!
      }));

      const { data, error } = await supabase.functions.invoke('geocode-addresses', {
        body: { addresses }
      });

      if (error) throw error;

      const results = data?.results || [];
      let actualizadas = 0;

      for (const result of results) {
        if (result.lat && result.lng) {
          const { error: updateError } = await supabase
            .from('cliente_sucursales')
            .update({ latitud: result.lat, longitud: result.lng })
            .eq('id', result.id);
          
          if (!updateError) actualizadas++;
        }
      }

      toast({
        title: "Geocodificación completada",
        description: `Se geocodificaron ${actualizadas} de ${sinCoordenadas.length} sucursales`
      });

      // Recargar sucursales
      loadSucursales();
    } catch (error) {
      console.error('Error geocodificando:', error);
      toast({
        title: "Error",
        description: "No se pudieron geocodificar las sucursales",
        variant: "destructive"
      });
    } finally {
      setGeocodificandoTodas(false);
    }
  };

  // Función para detectar zona desde el texto de dirección
  const detectarZonaDesdeDireccion = (direccion: string, zonasDisponibles: Zona[]): Zona | null => {
    if (!direccion) return null;
    
    const direccionNormalizada = direccion
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Quitar acentos

    // Buscar coincidencia con nombres de zonas
    for (const zona of zonasDisponibles) {
      const zonaNormalizada = zona.nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      // Patrones de búsqueda comunes
      const patrones = [
        new RegExp(`\\b${zonaNormalizada}\\b`), // Palabra exacta
        new RegExp(`${zonaNormalizada},`), // Seguido de coma
        new RegExp(`, ${zonaNormalizada}`), // Precedido por coma
      ];
      
      for (const patron of patrones) {
        if (patron.test(direccionNormalizada)) {
          return zona;
        }
      }
    }
    return null;
  };

  // Auto-detectar zonas para sucursales seleccionadas o sin zona
  const handleAutoDetectarZonas = async () => {
    setAutoDetectando(true);
    try {
      // Determinar qué sucursales procesar
      const sucursalesAProcesar = selectedIds.size > 0
        ? sucursales.filter(s => selectedIds.has(s.id))
        : sucursales.filter(s => !s.zona_id); // Solo sin zona

      if (sucursalesAProcesar.length === 0) {
        toast({ 
          title: "Sin sucursales", 
          description: selectedIds.size > 0 
            ? "No hay sucursales seleccionadas" 
            : "Todas las sucursales ya tienen zona asignada" 
        });
        return;
      }

      let actualizadas = 0;
      let sinDetectar = 0;

      for (const sucursal of sucursalesAProcesar) {
        const zonaDetectada = detectarZonaDesdeDireccion(sucursal.direccion || "", zonas);
        
        if (zonaDetectada) {
          const { error } = await supabase
            .from("cliente_sucursales")
            .update({ zona_id: zonaDetectada.id })
            .eq("id", sucursal.id);
          
          if (!error) {
            actualizadas++;
          }
        } else {
          sinDetectar++;
        }
      }

      toast({
        title: `Auto-detección completada`,
        description: `${actualizadas} zonas asignadas${sinDetectar > 0 ? `, ${sinDetectar} sin detectar` : ""}`,
      });

      setSelectedIds(new Set());
      loadSucursales();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAutoDetectando(false);
    }
  };

  const [formData, setFormData] = useState({
    nombre: "",
    codigo_sucursal: "",
    cl: "",
    direccion: "",
    zona_id: "",
    telefono: "",
    contacto: "",
    notas: "",
    horario_entrega: "",
    restricciones_vehiculo: "",
    dias_sin_entrega: "",
    no_combinar_pedidos: false,
    es_rosticeria: false,
    rfc: "",
    razon_social: "",
    direccion_fiscal: "",
    email_facturacion: "",
    latitud: null as number | null,
    longitud: null as number | null,
    metadata_entrega: {} as any,
    sucursal_hermana_id: "",
    sucursal_entrega_id: "",
  });

  // Filtrar sucursales según el tipo y búsqueda
  const sucursalesFiltradas = sucursales.filter(s => {
    // Filtro por tipo
    if (filtroTipo === 'rosticeria' && !s.es_rosticeria) return false;
    if (filtroTipo === 'regular' && s.es_rosticeria) return false;
    
    // Filtro por búsqueda
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      return (
        s.nombre.toLowerCase().includes(term) ||
        (s.codigo_sucursal && s.codigo_sucursal.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Paginación
  const totalPaginas = Math.ceil(sucursalesFiltradas.length / ITEMS_POR_PAGINA);
  const sucursalesPaginadas = sucursalesFiltradas.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTipo, busqueda]);

  const countRosticerias = sucursales.filter(s => s.es_rosticeria).length;
  const countRegulares = sucursales.filter(s => !s.es_rosticeria).length;
  const countConCoordenadas = sucursales.filter(s => s.latitud && s.longitud).length;
  const countSinCoordenadas = sucursales.filter(s => s.direccion && (!s.latitud || !s.longitud)).length;

  // Selección masiva
  const allFilteredSelected = sucursalesFiltradas.length > 0 && 
    sucursalesFiltradas.every(s => selectedIds.has(s.id));
  
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sucursalesFiltradas.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Edición masiva
  const handleBulkSetRosticeria = async (esRosticeria: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const { error } = await supabase
        .from("cliente_sucursales")
        .update({ es_rosticeria: esRosticeria })
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `${selectedIds.size} sucursales actualizadas` });
      setSelectedIds(new Set());
      loadSucursales();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkSetZona = async () => {
    if (selectedIds.size === 0 || !bulkZonaId) return;
    try {
      const { error } = await supabase
        .from("cliente_sucursales")
        .update({ zona_id: bulkZonaId })
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Zona asignada a ${selectedIds.size} sucursales` });
      setSelectedIds(new Set());
      setBulkZonaId("");
      loadSucursales();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (open && cliente) {
      loadSucursales();
      loadZonas();
    }
  }, [open, cliente]);

  const loadSucursales = async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cliente_sucursales")
        .select(`
          *,
          zona:zona_id (nombre, es_foranea)
        `)
        .eq("cliente_id", cliente.id)
        .order("codigo_sucursal");

      if (error) throw error;
      
      // Ordenar numéricamente por codigo_sucursal (1, 2, 3... 100, 200, 300)
      const sortedData = (data || []).sort((a, b) => {
        const codeA = parseInt(a.codigo_sucursal || '0', 10);
        const codeB = parseInt(b.codigo_sucursal || '0', 10);
        return codeA - codeB;
      });
      setSucursales(sortedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadZonas = async () => {
    try {
      const { data, error } = await supabase
        .from("zonas")
        .select("id, nombre, es_foranea")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setZonas(data || []);
    } catch (error: any) {
      console.error("Error loading zones:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    try {
      // Verificar si ya existe una sucursal con el mismo nombre
      const { data: existingSucursales, error: checkError } = await supabase
        .from("cliente_sucursales")
        .select("id, nombre")
        .eq("cliente_id", cliente.id)
        .ilike("nombre", formData.nombre.trim())
        .eq("activo", true);

      if (checkError) throw checkError;

      // Si encontramos una sucursal con el mismo nombre y no estamos editando esa misma sucursal
      if (existingSucursales && existingSucursales.length > 0) {
        const isDuplicate = editingSucursal 
          ? existingSucursales.some(s => s.id !== editingSucursal.id)
          : true;

        if (isDuplicate) {
          toast({
            title: "❌ Nombre duplicado",
            description: `Ya existe una sucursal con el nombre "${formData.nombre}" para este cliente`,
            variant: "destructive",
          });
          return;
        }
      }

      // Verificar si ya existe una sucursal con el mismo codigo_sucursal
      if (formData.codigo_sucursal?.trim()) {
        const { data: existingCodigos, error: checkCodigoError } = await supabase
          .from("cliente_sucursales")
          .select("id, codigo_sucursal")
          .eq("cliente_id", cliente.id)
          .eq("codigo_sucursal", formData.codigo_sucursal.trim());

        if (checkCodigoError) throw checkCodigoError;

        if (existingCodigos && existingCodigos.length > 0) {
          const isDuplicateCodigo = editingSucursal 
            ? existingCodigos.some(s => s.id !== editingSucursal.id)
            : true;

          if (isDuplicateCodigo) {
            toast({
              title: "❌ Código duplicado",
              description: `Ya existe una sucursal con el código "${formData.codigo_sucursal}" para este cliente`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      const sucursalData = {
        cliente_id: cliente.id,
        nombre: formData.nombre.trim(),
        codigo_sucursal: formData.codigo_sucursal?.trim() || null,
        cl: formData.cl?.trim() || null,
        direccion: formData.direccion || null,
        zona_id: formData.zona_id || null,
        telefono: formData.telefono || null,
        contacto: formData.contacto || null,
        notas: formData.notas || null,
        horario_entrega: formData.horario_entrega || null,
        restricciones_vehiculo: formData.restricciones_vehiculo || null,
        dias_sin_entrega: formData.dias_sin_entrega || null,
        no_combinar_pedidos: formData.no_combinar_pedidos,
        es_rosticeria: formData.es_rosticeria,
        rfc: formData.rfc || null,
        razon_social: formData.razon_social || null,
        direccion_fiscal: formData.direccion_fiscal || null,
        email_facturacion: formData.email_facturacion || null,
        latitud: formData.latitud,
        longitud: formData.longitud,
        metadata_entrega: formData.metadata_entrega || {},
        sucursal_hermana_id: formData.sucursal_hermana_id || null,
        sucursal_entrega_id: formData.sucursal_entrega_id || null,
      };

      if (editingSucursal) {
        const { error } = await supabase
          .from("cliente_sucursales")
          .update(sucursalData)
          .eq("id", editingSucursal.id);

        if (error) throw error;
        toast({ title: "Sucursal actualizada" });
      } else {
        const { error } = await supabase
          .from("cliente_sucursales")
          .insert([sucursalData]);

        if (error) throw error;
        toast({ title: "Sucursal creada" });
      }

      setFormOpen(false);
      resetForm();
      loadSucursales();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (sucursal: Sucursal) => {
    setEditingSucursal(sucursal);
    setFormData({
      nombre: sucursal.nombre,
      codigo_sucursal: sucursal.codigo_sucursal || "",
      cl: sucursal.cl || "",
      direccion: sucursal.direccion,
      zona_id: sucursal.zona_id || "",
      telefono: sucursal.telefono || "",
      contacto: sucursal.contacto || "",
      notas: sucursal.notas || "",
      horario_entrega: sucursal.horario_entrega || "",
      restricciones_vehiculo: sucursal.restricciones_vehiculo || "",
      dias_sin_entrega: sucursal.dias_sin_entrega || "",
      no_combinar_pedidos: sucursal.no_combinar_pedidos || false,
      es_rosticeria: sucursal.es_rosticeria || false,
      rfc: sucursal.rfc || "",
      razon_social: sucursal.razon_social || "",
      direccion_fiscal: sucursal.direccion_fiscal || "",
      email_facturacion: sucursal.email_facturacion || "",
      latitud: sucursal.latitud,
      longitud: sucursal.longitud,
      metadata_entrega: sucursal.metadata_entrega || {},
      sucursal_hermana_id: sucursal.sucursal_hermana_id || "",
      sucursal_entrega_id: sucursal.sucursal_entrega_id || "",
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta sucursal?")) return;

    try {
      const { error } = await supabase
        .from("cliente_sucursales")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sucursal eliminada" });
      loadSucursales();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingSucursal(null);
    setFormData({
      nombre: "",
      codigo_sucursal: "",
      cl: "",
      direccion: "",
      zona_id: "",
      telefono: "",
      contacto: "",
      notas: "",
      horario_entrega: "",
      restricciones_vehiculo: "",
      dias_sin_entrega: "",
      no_combinar_pedidos: false,
      es_rosticeria: false,
      rfc: "",
      razon_social: "",
      direccion_fiscal: "",
      email_facturacion: "",
      latitud: null,
      longitud: null,
      metadata_entrega: {},
      sucursal_hermana_id: "",
      sucursal_entrega_id: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sucursales de {cliente?.nombre}
          </DialogTitle>
          <DialogDescription>
            Gestiona las ubicaciones de entrega del cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {/* Header con botón Nueva Sucursal */}
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between gap-4'}`}>
              {/* Filtros scrollables en móvil */}
              <div className={`${isMobile ? 'overflow-x-auto -mx-2 px-2 pb-2 scrollbar-hide' : ''}`}>
                <div className={`flex items-center gap-2 ${isMobile ? 'w-max' : ''}`}>
                  <Button
                    size="sm"
                    variant={filtroTipo === 'todas' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('todas')}
                    className="whitespace-nowrap"
                  >
                    {isMobile ? `(${sucursales.length})` : `Todas (${sucursales.length})`}
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroTipo === 'rosticeria' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('rosticeria')}
                    className={`whitespace-nowrap ${filtroTipo === 'rosticeria' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                  >
                    🍗 {isMobile ? `(${countRosticerias})` : `Rosticerías (${countRosticerias})`}
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroTipo === 'regular' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('regular')}
                    className="whitespace-nowrap"
                  >
                    {isMobile ? `Reg. (${countRegulares})` : `Regulares (${countRegulares})`}
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setFormOpen(true);
                }}
                className={isMobile ? 'w-full' : ''}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sucursal
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Indicador de estado de geocodificación */}
            {sucursales.length > 0 && (
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2'} text-xs`}>
                <Badge variant={countSinCoordenadas === 0 ? "default" : "outline"} className={countSinCoordenadas === 0 ? "bg-green-500" : "bg-amber-100 text-amber-700 border-amber-300"}>
                  <MapPin className="h-3 w-3 mr-1" />
                  {countConCoordenadas}/{sucursales.length} geocodificadas
                </Badge>
                {countSinCoordenadas > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={geocodificarTodas}
                    disabled={geocodificandoTodas}
                    className="h-6 text-xs"
                  >
                    {geocodificandoTodas ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Navigation className="h-3 w-3 mr-1" />
                    )}
                    Geocodificar {countSinCoordenadas} pendientes
                  </Button>
                )}
              </div>
            )}
          </div>

          <SucursalFormModal
            open={formOpen}
            onOpenChange={setFormOpen}
            formData={formData}
            setFormData={setFormData}
            zonas={zonas}
            isEditing={!!editingSucursal}
            onSave={handleSave}
            onCancel={() => setFormOpen(false)}
            onDelete={editingSucursal ? () => handleDelete(editingSucursal.id) : undefined}
            clienteNombre={cliente?.nombre}
            grupoClienteId={cliente?.grupo_cliente_id}
          />

          {/* Barra de acciones masivas */}
          {selectedIds.size > 0 ? (
            <div className={`p-3 bg-primary/10 border border-primary/20 rounded-lg ${isMobile ? 'space-y-3' : 'flex items-center gap-3 flex-wrap'}`}>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedIds.size} seleccionadas</span>
                {isMobile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-auto"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2 ml-auto flex-wrap'}`}>
                <div className={`flex ${isMobile ? 'flex-wrap gap-2' : 'gap-2'}`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={isMobile ? 'flex-1 min-w-[45%]' : ''}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className={`${isMobile ? 'w-full' : ''} opacity-50`}
                          >
                            <Wand2 className="h-4 w-4 mr-1" />
                            {isMobile ? 'Auto-zona' : 'Auto-detectar Zona'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>⚠️ Auto-detect en mantenimiento — asignar manualmente por ahora</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={geocodificarTodas}
                    disabled={geocodificandoTodas}
                    className={isMobile ? 'flex-1 min-w-[45%]' : ''}
                  >
                    {geocodificandoTodas ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4 mr-1" />
                    )}
                    Geocodificar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkSetRosticeria(true)}
                    className={isMobile ? 'flex-1 min-w-[45%]' : ''}
                  >
                    🍗 {isMobile ? 'Rosticería' : 'Marcar Rosticería'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkSetRosticeria(false)}
                    className={isMobile ? 'flex-1 min-w-[45%]' : ''}
                  >
                    {isMobile ? 'No rost.' : 'Quitar Rosticería'}
                  </Button>
                </div>
                <div className={`flex items-center gap-1 ${isMobile ? 'w-full' : ''}`}>
                  <Select value={bulkZonaId} onValueChange={setBulkZonaId}>
                    <SelectTrigger className={`h-8 ${isMobile ? 'flex-1' : 'w-[150px]'}`}>
                      <SelectValue placeholder="Asignar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map((zona) => (
                        <SelectItem key={zona.id} value={zona.id}>
                          {zona.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkSetZona}
                    disabled={!bulkZonaId}
                  >
                    Aplicar
                  </Button>
                </div>
                {!isMobile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Botón para auto-detectar todas las sucursales sin zona
            sucursales.filter(s => !s.zona_id).length > 0 && (
              <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-3'} p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm">
                    {sucursales.filter(s => !s.zona_id).length} {isMobile ? 'sin zona' : 'sucursales sin zona asignada'}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={isMobile ? 'w-full' : 'ml-auto'}>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className={`${isMobile ? 'w-full' : ''} opacity-50`}
                        >
                          <Wand2 className="h-4 w-4 mr-1" />
                          {isMobile ? "Auto-detectar" : "Auto-detectar Zonas"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>⚠️ Auto-detect en mantenimiento — asignar manualmente por ahora</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )
          )}

          {/* Vista móvil: Tarjetas */}
          {isMobile ? (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : sucursalesFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {sucursales.length === 0 
                    ? "No hay sucursales registradas"
                    : `No hay sucursales ${filtroTipo === 'rosticeria' ? 'rosticerías' : 'regulares'}`
                  }
                </div>
              ) : (
                sucursalesPaginadas.map((sucursal) => (
                  <Card 
                    key={sucursal.id} 
                    className={`${selectedIds.has(sucursal.id) ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(sucursal.id)}
                          onCheckedChange={() => toggleSelect(sucursal.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Nombre y badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {sucursal.codigo_sucursal && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {sucursal.codigo_sucursal}
                              </Badge>
                            )}
                            <span className="font-medium">{sucursal.nombre}</span>
                            {sucursal.es_rosticeria && (
                              <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                🍗
                              </Badge>
                            )}
                          </div>
                          
                          {/* RFC Badge */}
                          {sucursal.rfc && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Factura propia
                            </Badge>
                          )}

                          {/* Dirección */}
                          {sucursal.direccion && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {sucursal.direccion}
                            </p>
                          )}

                          {/* Zona y otros badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {sucursal.zona ? (
                              <>
                                <Badge variant="outline">{sucursal.zona.nombre}</Badge>
                                {sucursal.zona.es_foranea && (
                                  <Badge className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                                    🚛 Foránea
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin zona</span>
                            )}
                            {sucursal.no_combinar_pedidos && (
                              <Badge variant="secondary" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                No combinar
                              </Badge>
                            )}
                          </div>

                          {/* Contacto */}
                          {(sucursal.contacto || sucursal.telefono) && (
                            <p className="text-xs text-muted-foreground">
                              {sucursal.contacto} {sucursal.telefono && `• ${sucursal.telefono}`}
                            </p>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openGoogleMaps(sucursal)}
                            title={sucursal.latitud ? "Ver ubicación exacta" : "Buscar en Google Maps"}
                            className={sucursal.latitud ? "text-green-600" : "text-amber-500"}
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(sucursal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sucursal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Vista desktop: Tabla */
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : sucursalesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {sucursales.length === 0 
                          ? "No hay sucursales registradas"
                          : `No hay sucursales ${filtroTipo === 'rosticeria' ? 'rosticerías' : 'regulares'}`
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    sucursalesPaginadas.map((sucursal) => (
                      <TableRow key={sucursal.id} className={selectedIds.has(sucursal.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(sucursal.id)}
                            onCheckedChange={() => toggleSelect(sucursal.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {sucursal.codigo_sucursal && (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {sucursal.codigo_sucursal}
                                </Badge>
                              )}
                              {sucursal.nombre}
                              {sucursal.es_rosticeria && (
                                <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                  🍗
                                </Badge>
                              )}
                            </div>
                            {sucursal.rfc && (
                              <Badge variant="outline" className="text-xs w-fit">
                                <FileText className="h-3 w-3 mr-1" />
                                Factura propia
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {sucursal.direccion}
                        </TableCell>
                        <TableCell>
                          {sucursal.zona ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline">{sucursal.zona.nombre}</Badge>
                              {sucursal.zona.es_foranea && (
                                <Badge className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                                  🚛 Foránea
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {sucursal.contacto || sucursal.telefono || "—"}
                            {sucursal.no_combinar_pedidos && (
                              <Badge variant="secondary" className="text-xs w-fit">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                No combinar
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openGoogleMaps(sucursal)}
                              title={sucursal.latitud ? "Ver ubicación exacta" : "Buscar en Google Maps"}
                              className={sucursal.latitud ? "text-green-600" : "text-amber-500"}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(sucursal)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(sucursal.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {((paginaActual - 1) * ITEMS_POR_PAGINA) + 1}-{Math.min(paginaActual * ITEMS_POR_PAGINA, sucursalesFiltradas.length)} de {sucursalesFiltradas.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {paginaActual} / {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteSucursalesDialog;
