import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MapPin,
  Pencil,
  Loader2,
  Navigation,
  Trash2,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  FileText,
  Link2,
  Info,
  CircleAlert,
} from "lucide-react";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Zona {
  id: string;
  nombre: string;
  es_foranea?: boolean;
}

interface SucursalFormData {
  nombre: string;
  codigo_sucursal: string;
  cl: string;
  direccion: string;
  zona_id: string;
  telefono: string;
  contacto: string;
  notas: string;
  horario_entrega: string;
  restricciones_vehiculo: string;
  dias_sin_entrega: string;
  no_combinar_pedidos: boolean;
  es_rosticeria: boolean;
  rfc: string;
  razon_social: string;
  direccion_fiscal: string;
  email_facturacion: string;
  latitud: number | null;
  longitud: number | null;
  // New fields
  metadata_entrega: MetadataEntrega;
  sucursal_hermana_id: string;
  sucursal_entrega_id: string;
}

interface MetadataEntrega {
  foranea?: boolean;
  personal_extra?: "normal" | "2_ayudantes" | "3_o_mas";
  zona?: {
    conflictiva?: boolean;
    cita_previa?: boolean;
    puerta_trasera?: boolean;
    avisar_minutos_antes?: number | null;
  };
  notas_libres?: string;
}

interface SucursalOption {
  id: string;
  nombre: string;
  codigo_sucursal: string | null;
}

interface SucursalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: SucursalFormData;
  setFormData: (data: SucursalFormData) => void;
  zonas: Zona[];
  isEditing: boolean;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  clienteNombre?: string;
  grupoClienteId?: string | null;
}

// ====== Helper: Parse dias_sin_entrega ======
function parseDiasSinEntrega(raw: string): { dias: string[]; razon: string } {
  if (!raw) return { dias: [], razon: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.dias) return parsed;
  } catch {}
  // Legacy comma format: "Lunes,Jueves"
  const dias = raw.split(",").map((d) => d.trim()).filter(Boolean);
  return { dias, razon: "" };
}

function serializeDiasSinEntrega(dias: string[], razon: string): string {
  if (dias.length === 0) return "";
  return JSON.stringify({ dias, razon });
}

// ====== Helper: Parse horario_entrega ======
interface HorarioEntrega {
  tipo: "cualquiera" | "manana" | "tarde" | "despues_de" | "antes_de" | "ventana";
  hora?: string;
  desde?: string;
  hasta?: string;
}

function parseHorarioEntrega(raw: string): HorarioEntrega {
  if (!raw) return { tipo: "cualquiera" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.tipo) return parsed;
  } catch {}
  // Legacy: "08:00 - 12:00" format
  const parts = raw.split(" - ");
  if (parts.length === 2) {
    return { tipo: "ventana", desde: parts[0].trim(), hasta: parts[1].trim() };
  }
  if (parts.length === 1 && parts[0].includes(":")) {
    return { tipo: "despues_de", hora: parts[0].trim() };
  }
  return { tipo: "cualquiera" };
}

function serializeHorarioEntrega(h: HorarioEntrega): string {
  if (h.tipo === "cualquiera") return "";
  return JSON.stringify(h);
}

// ====== Helper: Parse restricciones_vehiculo ======
function parseVehiculos(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

function serializeVehiculos(arr: string[]): string {
  if (arr.length === 0) return "";
  return JSON.stringify(arr);
}

// ====== CONSTANTS ======
const DIAS_SEMANA = [
  { short: "Lun", full: "lun" },
  { short: "Mar", full: "mar" },
  { short: "Mié", full: "mie" },
  { short: "Jue", full: "jue" },
  { short: "Vie", full: "vie" },
  { short: "Sáb", full: "sab" },
  { short: "Dom", full: "dom" },
];

const RAZONES_DIAS = ["tianguis", "descanso", "cerrado", "feria"];

const VEHICULOS = [
  { label: "Camioneta chica (Urvan, NPR)", value: "camioneta" },
  { label: "Rabón", value: "rabon" },
  { label: "Tortón", value: "torton" },
  { label: "Mini rabón", value: "mini_rabon" },
  { label: "Tráiler", value: "trailer" },
];

const GRUPO_LECAROZ_ID = "aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa";

// ====== MAIN COMPONENT ======
export const SucursalFormModal = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  zonas,
  isEditing,
  onSave,
  onCancel,
  onDelete,
  clienteNombre,
  grupoClienteId,
}: SucursalFormModalProps) => {
  const [activeTab, setActiveTab] = useState("datos");
  const [editandoDireccion, setEditandoDireccion] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);
  const [editandoCoordenadas, setEditandoCoordenadas] = useState(false);
  const [coordenadasInput, setCoordenadasInput] = useState("");
  const [sucursalesHermanas, setSucursalesHermanas] = useState<SucursalOption[]>([]);
  const [razonOtra, setRazonOtra] = useState("");
  const { toast } = useToast();

  // Derived state for structured fields
  const diasData = useMemo(() => parseDiasSinEntrega(formData.dias_sin_entrega), [formData.dias_sin_entrega]);
  const horarioData = useMemo(() => parseHorarioEntrega(formData.horario_entrega), [formData.horario_entrega]);
  const vehiculosData = useMemo(() => parseVehiculos(formData.restricciones_vehiculo), [formData.restricciones_vehiculo]);
  const meta = formData.metadata_entrega || {};

  const isLecaroz = grupoClienteId === "aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa";

  useEffect(() => {
    if (open) {
      setActiveTab("datos");
      setEditandoDireccion(!formData.direccion);
      setEditandoCoordenadas(false);
      setCoordenadasInput("");
      // Check if razon is custom
      const r = diasData.razon;
      if (r && !RAZONES_DIAS.includes(r)) {
        setRazonOtra(r);
      } else {
        setRazonOtra("");
      }
    }
  }, [open]);

  // Load sibling sucursales for Relaciones tab
  useEffect(() => {
    if (open && isLecaroz && grupoClienteId) {
      loadSucursalesHermanas();
    }
  }, [open, isLecaroz, grupoClienteId]);

  const loadSucursalesHermanas = async () => {
    if (!grupoClienteId) return;
    // Get all clients that belong to this group, then their sucursales
    const { data: clientesGrupo } = await supabase
      .from("clientes")
      .select("id")
      .eq("grupo_cliente_id", grupoClienteId);

    if (!clientesGrupo) return;
    const clienteIds = clientesGrupo.map((c) => c.id);
    // Also include the group itself
    clienteIds.push(grupoClienteId);

    const { data } = await supabase
      .from("cliente_sucursales")
      .select("id, nombre, codigo_sucursal")
      .in("cliente_id", clienteIds)
      .eq("activo", true)
      .order("codigo_sucursal");

    if (data) {
      const sorted = data.sort((a, b) => {
        const cA = parseInt(a.codigo_sucursal || "0", 10);
        const cB = parseInt(b.codigo_sucursal || "0", 10);
        return cA - cB;
      });
      setSucursalesHermanas(sorted);
    }
  };

  // ====== Handlers ======
  const updateMeta = (partial: Partial<MetadataEntrega>) => {
    setFormData({ ...formData, metadata_entrega: { ...meta, ...partial } });
  };

  const updateMetaZona = (partial: Partial<NonNullable<MetadataEntrega["zona"]>>) => {
    const currentZona = meta.zona || {};
    updateMeta({ zona: { ...currentZona, ...partial } });
  };

  const setDias = (dias: string[], razon: string) => {
    setFormData({ ...formData, dias_sin_entrega: serializeDiasSinEntrega(dias, razon) });
  };

  const setHorario = (h: HorarioEntrega) => {
    setFormData({ ...formData, horario_entrega: serializeHorarioEntrega(h) });
  };

  const setVehiculos = (v: string[]) => {
    setFormData({ ...formData, restricciones_vehiculo: serializeVehiculos(v) });
  };

  const parsearCoordenadas = (input: string): { lat: number; lng: number } | null => {
    const parts = input.trim().replace(/\s+/g, " ").split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  };

  const guardarCoordenadasManuales = () => {
    const coords = parsearCoordenadas(coordenadasInput);
    if (coords) {
      setFormData({ ...formData, latitud: coords.lat, longitud: coords.lng });
      setEditandoCoordenadas(false);
      setCoordenadasInput("");
      toast({ title: "Coordenadas actualizadas", description: `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}` });
    } else {
      toast({ title: "Formato inválido", description: "Usa formato: 19.478451, -99.051683", variant: "destructive" });
    }
  };

  const geocodificarDireccion = async () => {
    if (!formData.direccion) {
      toast({ title: "Sin dirección", description: "Primero ingresa una dirección", variant: "destructive" });
      return;
    }
    setGeocodificando(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-addresses", {
        body: { addresses: [{ id: "sucursal", address: formData.direccion }] },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.lat && result?.lng) {
        setFormData({ ...formData, latitud: result.lat, longitud: result.lng });
        toast({ title: "Coordenadas obtenidas", description: `Lat: ${result.lat.toFixed(6)}, Lng: ${result.lng.toFixed(6)}` });
      } else {
        toast({ title: "No se encontró ubicación", description: result?.error || "Intenta con otra dirección", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo geocodificar", variant: "destructive" });
    } finally {
      setGeocodificando(false);
    }
  };

  const geocodificarPorPlaceId = async (placeId: string) => {
    setGeocodificando(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-place-details?place_id=${encodeURIComponent(placeId)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const data = await response.json();
      if (data.lat && data.lng) {
        setFormData({ ...formData, latitud: data.lat, longitud: data.lng });
        toast({ title: "Coordenadas obtenidas", description: `Lat: ${data.lat.toFixed(6)}, Lng: ${data.lng.toFixed(6)}` });
      }
    } catch {
      console.error("Error getting place details");
    } finally {
      setGeocodificando(false);
    }
  };

  const abrirEnMapa = () => {
    if (formData.latitud && formData.longitud) {
      const link = document.createElement("a");
      link.href = `https://www.google.com/maps/search/?api=1&query=${formData.latitud},${formData.longitud}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(e);
  };

  // ====== Preview Logic ======
  const previewLines = useMemo(() => {
    const lines: { icon: string; text: string }[] = [];

    // Vehiculos
    if (vehiculosData.length > 0) {
      const names = vehiculosData.map((v) => {
        const found = VEHICULOS.find((x) => x.value === v);
        return found ? found.label.split(" (")[0] : v;
      });
      lines.push({ icon: "🚫", text: `Solo: ${names.join(", ")}` });
    }

    // Dias sin entrega
    if (diasData.dias.length > 0) {
      const diasLabels = diasData.dias.map((d) => {
        const found = DIAS_SEMANA.find((x) => x.full === d);
        return found ? found.short : d;
      });
      const razonText = diasData.razon ? ` (${diasData.razon})` : "";
      lines.push({ icon: "📅", text: `No entregar ${diasLabels.join(", ")}${razonText}` });
    }

    // Horario
    if (horarioData.tipo === "manana") lines.push({ icon: "⏰", text: "Solo por la mañana (6-12)" });
    else if (horarioData.tipo === "tarde") lines.push({ icon: "⏰", text: "Solo por la tarde (12-18)" });
    else if (horarioData.tipo === "despues_de" && horarioData.hora) lines.push({ icon: "⏰", text: `Después de las ${horarioData.hora}` });
    else if (horarioData.tipo === "antes_de" && horarioData.hora) lines.push({ icon: "⏰", text: `Antes de las ${horarioData.hora}` });
    else if (horarioData.tipo === "ventana" && horarioData.desde && horarioData.hasta) lines.push({ icon: "⏰", text: `De ${horarioData.desde} a ${horarioData.hasta}` });

    // Personal
    if (meta.personal_extra === "2_ayudantes") lines.push({ icon: "👷", text: "Mandar 2 ayudantes" });
    else if (meta.personal_extra === "3_o_mas") lines.push({ icon: "👷", text: "Mandar 3+ ayudantes" });

    // Zona
    if (meta.zona?.conflictiva) lines.push({ icon: "⚠️", text: "Zona conflictiva — entregar temprano" });
    if (meta.zona?.cita_previa) lines.push({ icon: "📞", text: "Requiere cita previa (avisar día antes)" });
    if (meta.zona?.puerta_trasera) lines.push({ icon: "🚪", text: "Entrar por puerta trasera" });
    if (meta.zona?.avisar_minutos_antes) lines.push({ icon: "📝", text: `Avisar ${meta.zona.avisar_minutos_antes} min antes de llegar` });

    // No combinar
    if (formData.no_combinar_pedidos) lines.push({ icon: "📦", text: "No combinar con otros pedidos" });

    // Notas libres
    if (meta.notas_libres) lines.push({ icon: "💬", text: meta.notas_libres });

    return lines;
  }, [vehiculosData, diasData, horarioData, meta, formData.no_combinar_pedidos]);

  // ====== RENDER ======
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            {isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
            {formData.codigo_sucursal && ` · #${formData.codigo_sucursal}`}
            {formData.nombre && ` ${formData.nombre}`}
          </DialogTitle>
          {clienteNombre && (
            <DialogDescription className="text-xs truncate">
              {clienteNombre}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Tabs */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 sm:px-6 shrink-0">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="datos" className="text-xs sm:text-sm">Datos</TabsTrigger>
                <TabsTrigger value="ruteo" className="text-xs sm:text-sm">Ruteo</TabsTrigger>
                <TabsTrigger value="restricciones" className="text-xs sm:text-sm">Restricciones</TabsTrigger>
                {isLecaroz && (
                  <TabsTrigger value="relaciones" className="text-xs sm:text-sm">Relaciones</TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {/* ======== TAB DATOS ======== */}
              <TabsContent value="datos" className="mt-0 space-y-4">
                {/* Row 1: codigo + nombre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="suc_codigo" className="text-sm">Número de Sucursal *</Label>
                    <Input
                      id="suc_codigo"
                      value={formData.codigo_sucursal}
                      onChange={(e) => setFormData({ ...formData, codigo_sucursal: e.target.value })}
                      placeholder="Ej: 309"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="suc_nombre" className="text-sm">Nombre *</Label>
                    <Input
                      id="suc_nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Bosques de Aragón"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Tipo + Foránea */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tipo</Label>
                    <RadioGroup
                      value={formData.es_rosticeria ? "rosticeria" : "panaderia"}
                      onValueChange={(v) => setFormData({ ...formData, es_rosticeria: v === "rosticeria" })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="panaderia" id="tipo_pan" />
                        <Label htmlFor="tipo_pan" className="text-sm font-normal cursor-pointer">🥖 Panadería</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="rosticeria" id="tipo_rost" />
                        <Label htmlFor="tipo_rost" className="text-sm font-normal cursor-pointer">🍗 Rosticería</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="suc_foranea"
                        checked={meta.foranea || false}
                        onCheckedChange={(checked) => updateMeta({ foranea: checked === true })}
                      />
                      <Label htmlFor="suc_foranea" className="text-sm font-normal cursor-pointer">
                        Sucursal fuera de CDMX
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Row 3: Dirección */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Dirección de Entrega</Label>
                  {formData.direccion && !editandoDireccion ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed break-words">{formData.direccion}</p>
                          {formData.latitud && formData.longitud && !editandoCoordenadas && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {formData.latitud.toFixed(6)}, {formData.longitud.toFixed(6)}
                            </p>
                          )}
                          {editandoCoordenadas && (
                            <div className="mt-2 space-y-2">
                              <Input
                                placeholder="19.478451, -99.051683"
                                value={coordenadasInput}
                                onChange={(e) => setCoordenadasInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardarCoordenadasManuales(); } }}
                                className="text-xs"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={guardarCoordenadasManuales} disabled={!coordenadasInput.trim()}>Guardar</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditandoCoordenadas(false); setCoordenadasInput(""); }}>Cancelar</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditandoDireccion(true)} className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" /> Cambiar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={geocodificarDireccion} disabled={geocodificando} className="gap-1.5">
                          {geocodificando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                          {formData.latitud ? "Re-geocodificar" : "Geocodificar"}
                        </Button>
                        {formData.latitud && formData.longitud && !editandoCoordenadas && (
                          <>
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditandoCoordenadas(true); setCoordenadasInput(`${formData.latitud}, ${formData.longitud}`); }} className="gap-1.5">
                              <Pencil className="h-3.5 w-3.5" /> Editar coords
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={abrirEnMapa} className="gap-1.5">
                              <MapPin className="h-3.5 w-3.5" /> Ver en mapa
                            </Button>
                          </>
                        )}
                        {!formData.latitud && !editandoCoordenadas && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditandoCoordenadas(true)} className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" /> Agregar coords
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <GoogleMapsAddressAutocomplete
                        id="suc_direccion"
                        value={formData.direccion}
                        onChange={(value, placeId) => {
                          setFormData({ ...formData, direccion: value, latitud: null, longitud: null });
                          if (value) {
                            setEditandoDireccion(false);
                            if (placeId) geocodificarPorPlaceId(placeId);
                          }
                        }}
                        placeholder="Buscar dirección..."
                      />
                      {formData.direccion && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditandoDireccion(false)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 4: Teléfono + Contacto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="suc_telefono" className="text-sm">Teléfono</Label>
                    <Input id="suc_telefono" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} placeholder="Teléfono" autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="suc_contacto" className="text-sm">Contacto</Label>
                    <Input id="suc_contacto" value={formData.contacto} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} placeholder="Nombre del contacto" autoComplete="off" />
                  </div>
                </div>

                {/* Row 5: RFC + Email facturación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="suc_rfc" className="text-sm">RFC (si factura independiente)</Label>
                    <Input id="suc_rfc" value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })} placeholder="RFC" autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="suc_email_fac" className="text-sm">Email facturación</Label>
                    <Input id="suc_email_fac" type="email" value={formData.email_facturacion} onChange={(e) => setFormData({ ...formData, email_facturacion: e.target.value })} placeholder="email@ejemplo.com" autoComplete="off" />
                  </div>
                </div>

                {/* Activo */}
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="suc_activo_hidden"
                    checked={true}
                    disabled
                  />
                  <Label htmlFor="suc_activo_hidden" className="text-sm font-normal text-muted-foreground">Sucursal activa</Label>
                </div>
              </TabsContent>

              {/* ======== TAB RUTEO ======== */}
              <TabsContent value="ruteo" className="mt-0 space-y-5">
                {/* Zona */}
                <div className="space-y-2">
                  <Label className="text-sm">Zona asignada</Label>
                  <Select
                    value={formData.zona_id}
                    onValueChange={(value) => setFormData({ ...formData, zona_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehículos */}
                <div className="space-y-2">
                  <Label className="text-sm">Vehículos permitidos</Label>
                  <p className="text-xs text-muted-foreground">Marca los vehículos que SÍ pueden entregar. Si no marcas ninguno, se permite cualquiera.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {VEHICULOS.map((v) => (
                      <div key={v.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`veh_${v.value}`}
                          checked={vehiculosData.includes(v.value)}
                          onCheckedChange={(checked) => {
                            if (checked) setVehiculos([...vehiculosData, v.value]);
                            else setVehiculos(vehiculosData.filter((x) => x !== v.value));
                          }}
                        />
                        <Label htmlFor={`veh_${v.value}`} className="text-sm font-normal cursor-pointer">{v.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* No combinar */}
                <TooltipProvider>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id="suc_no_combinar"
                      checked={formData.no_combinar_pedidos}
                      onCheckedChange={(checked) => setFormData({ ...formData, no_combinar_pedidos: checked === true })}
                    />
                    <Label htmlFor="suc_no_combinar" className="text-sm font-normal cursor-pointer">
                      No combinar pedidos con otras sucursales
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">El pedido de esta sucursal debe ir en camión separado</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                {/* CL */}
                <div className="space-y-1.5">
                  <Label htmlFor="suc_cl" className="text-sm">CL (código logístico)</Label>
                  <Input id="suc_cl" value={formData.cl || ""} onChange={(e) => setFormData({ ...formData, cl: e.target.value })} placeholder="Ej: 1931" autoComplete="off" className="max-w-xs" />
                </div>
              </TabsContent>

              {/* ======== TAB RESTRICCIONES ======== */}
              <TabsContent value="restricciones" className="mt-0 space-y-6">
                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-300">
                    Estas notas aparecerán automáticamente al chofer en su app cuando entregue esta sucursal.
                  </p>
                </div>

                {/* Section A: Días sin entrega */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Días sin entrega
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map((d) => (
                      <div key={d.full} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`dia_${d.full}`}
                          checked={diasData.dias.includes(d.full)}
                          onCheckedChange={(checked) => {
                            const newDias = checked
                              ? [...diasData.dias, d.full]
                              : diasData.dias.filter((x) => x !== d.full);
                            setDias(newDias, diasData.razon);
                          }}
                        />
                        <Label htmlFor={`dia_${d.full}`} className="text-sm font-normal cursor-pointer">{d.short}</Label>
                      </div>
                    ))}
                  </div>
                  {diasData.dias.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Razón</Label>
                      <Select
                        value={RAZONES_DIAS.includes(diasData.razon) ? diasData.razon : (diasData.razon ? "otro" : "")}
                        onValueChange={(v) => {
                          if (v === "otro") {
                            setDias(diasData.dias, razonOtra || "otro");
                          } else {
                            setDias(diasData.dias, v);
                            setRazonOtra("");
                          }
                        }}
                      >
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Seleccionar razón..." />
                        </SelectTrigger>
                        <SelectContent>
                          {RAZONES_DIAS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                          <SelectItem value="otro">Otro (escribir)</SelectItem>
                        </SelectContent>
                      </Select>
                      {(!RAZONES_DIAS.includes(diasData.razon) && diasData.razon) && (
                        <Input
                          value={razonOtra || diasData.razon}
                          onChange={(e) => {
                            setRazonOtra(e.target.value);
                            setDias(diasData.dias, e.target.value);
                          }}
                          placeholder="Escribir razón..."
                          className="max-w-xs text-sm"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Section B: Horario */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Horario de entrega
                  </h4>
                  <RadioGroup
                    value={horarioData.tipo}
                    onValueChange={(v) => {
                      const tipo = v as HorarioEntrega["tipo"];
                      if (tipo === "manana") setHorario({ tipo: "manana" });
                      else if (tipo === "tarde") setHorario({ tipo: "tarde" });
                      else if (tipo === "despues_de") setHorario({ tipo: "despues_de", hora: horarioData.hora || "18:00" });
                      else if (tipo === "antes_de") setHorario({ tipo: "antes_de", hora: horarioData.hora || "12:00" });
                      else if (tipo === "ventana") setHorario({ tipo: "ventana", desde: horarioData.desde || "09:00", hasta: horarioData.hasta || "13:00" });
                      else setHorario({ tipo: "cualquiera" });
                    }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="cualquiera" id="h_cualquiera" />
                      <Label htmlFor="h_cualquiera" className="text-sm font-normal cursor-pointer">Cualquier hora</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="manana" id="h_manana" />
                      <Label htmlFor="h_manana" className="text-sm font-normal cursor-pointer">Solo por la mañana (6:00 - 12:00)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="tarde" id="h_tarde" />
                      <Label htmlFor="h_tarde" className="text-sm font-normal cursor-pointer">Solo por la tarde (12:00 - 18:00)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="despues_de" id="h_despues" />
                      <Label htmlFor="h_despues" className="text-sm font-normal cursor-pointer">Después de las</Label>
                      {horarioData.tipo === "despues_de" && (
                        <Input type="time" value={horarioData.hora || ""} onChange={(e) => setHorario({ ...horarioData, hora: e.target.value })} className="w-28 h-8" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="antes_de" id="h_antes" />
                      <Label htmlFor="h_antes" className="text-sm font-normal cursor-pointer">Antes de las</Label>
                      {horarioData.tipo === "antes_de" && (
                        <Input type="time" value={horarioData.hora || ""} onChange={(e) => setHorario({ ...horarioData, hora: e.target.value })} className="w-28 h-8" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RadioGroupItem value="ventana" id="h_ventana" />
                      <Label htmlFor="h_ventana" className="text-sm font-normal cursor-pointer">Ventana:</Label>
                      {horarioData.tipo === "ventana" && (
                        <>
                          <Input type="time" value={horarioData.desde || ""} onChange={(e) => setHorario({ ...horarioData, desde: e.target.value })} className="w-28 h-8" />
                          <span className="text-xs text-muted-foreground">a</span>
                          <Input type="time" value={horarioData.hasta || ""} onChange={(e) => setHorario({ ...horarioData, hasta: e.target.value })} className="w-28 h-8" />
                        </>
                      )}
                    </div>
                  </RadioGroup>
                </div>

                {/* Section C: Personal extra */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    Personal extra requerido
                  </h4>
                  <RadioGroup
                    value={meta.personal_extra || "normal"}
                    onValueChange={(v) => updateMeta({ personal_extra: v as MetadataEntrega["personal_extra"] })}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="normal" id="pe_normal" />
                      <Label htmlFor="pe_normal" className="text-sm font-normal cursor-pointer">Normal (1 chofer + 1 ayudante)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="2_ayudantes" id="pe_2" />
                      <Label htmlFor="pe_2" className="text-sm font-normal cursor-pointer">Mandar 2 ayudantes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="3_o_mas" id="pe_3" />
                      <Label htmlFor="pe_3" className="text-sm font-normal cursor-pointer">Mandar 3 o más ayudantes</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Section D: Zona y riesgo */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CircleAlert className="h-4 w-4 text-red-500" />
                    Zona y riesgo
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="zona_conflictiva"
                        checked={meta.zona?.conflictiva || false}
                        onCheckedChange={(checked) => updateMetaZona({ conflictiva: checked === true })}
                      />
                      <Label htmlFor="zona_conflictiva" className="text-sm font-normal cursor-pointer">
                        Zona conflictiva — entregar temprano en la ruta
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="zona_cita"
                        checked={meta.zona?.cita_previa || false}
                        onCheckedChange={(checked) => updateMetaZona({ cita_previa: checked === true })}
                      />
                      <Label htmlFor="zona_cita" className="text-sm font-normal cursor-pointer">
                        Requiere cita previa (avisar día antes)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="zona_puerta"
                        checked={meta.zona?.puerta_trasera || false}
                        onCheckedChange={(checked) => updateMetaZona({ puerta_trasera: checked === true })}
                      />
                      <Label htmlFor="zona_puerta" className="text-sm font-normal cursor-pointer">
                        Entrar por puerta trasera
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="zona_avisar"
                        checked={meta.zona?.avisar_minutos_antes != null}
                        onCheckedChange={(checked) => {
                          if (checked) updateMetaZona({ avisar_minutos_antes: 30 });
                          else updateMetaZona({ avisar_minutos_antes: null });
                        }}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor="zona_avisar" className="text-sm font-normal cursor-pointer">
                          Avisar al llegar:
                        </Label>
                        {meta.zona?.avisar_minutos_antes != null && (
                          <>
                            <Input
                              type="number"
                              min={5}
                              max={120}
                              value={meta.zona.avisar_minutos_antes}
                              onChange={(e) => updateMetaZona({ avisar_minutos_antes: parseInt(e.target.value) || 30 })}
                              className="w-16 h-8 text-sm"
                            />
                            <span className="text-sm text-muted-foreground">minutos antes</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section E: Notas adicionales */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Notas adicionales
                  </h4>
                  <Textarea
                    value={meta.notas_libres || ""}
                    onChange={(e) => updateMeta({ notas_libres: e.target.value })}
                    placeholder="Cómo llegar, contacto alternativo, rampa rota, etc."
                    rows={3}
                  />
                </div>

                {/* Preview */}
                {previewLines.length > 0 && (
                  <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5 space-y-2">
                    <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                      {formData.es_rosticeria ? "🍗" : "🥖"} Así lo verá el chofer:
                    </p>
                    <div className="text-sm font-medium">
                      #{formData.codigo_sucursal || "?"} {formData.nombre || "..."} — {formData.es_rosticeria ? "Rosticería" : "Panadería"}
                    </div>
                    {formData.direccion && (
                      <p className="text-xs text-muted-foreground truncate">{formData.direccion}</p>
                    )}
                    <div className="space-y-1 mt-2">
                      {previewLines.map((line, i) => (
                        <p key={i} className="text-xs">
                          {line.icon} {line.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ======== TAB RELACIONES ======== */}
              {isLecaroz && (
                <TabsContent value="relaciones" className="mt-0 space-y-5">
                  {/* Sucursal hermana */}
                  <div className="space-y-2">
                    <Label className="text-sm">Sucursal hermana</Label>
                    <Select
                      value={formData.sucursal_hermana_id || "none"}
                      onValueChange={(v) => setFormData({ ...formData, sucursal_hermana_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguna" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">Ninguna</SelectItem>
                        {sucursalesHermanas
                          .filter((s) => s.id !== (isEditing ? formData.codigo_sucursal : ""))
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              #{s.codigo_sucursal || "?"} {s.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {formData.sucursal_hermana_id && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        Esta sucursal comparte ubicación física con la sucursal seleccionada. Ambas reciben pedidos pero se entregan en el mismo lugar.
                      </p>
                    )}
                  </div>

                  {/* Sucursal de entrega (consolidación) */}
                  <div className="space-y-2">
                    <Label className="text-sm">Descargar pedidos en</Label>
                    <Select
                      value={formData.sucursal_entrega_id || "none"}
                      onValueChange={(v) => setFormData({ ...formData, sucursal_entrega_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Entrega directa (por defecto)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">Entrega directa</SelectItem>
                        {sucursalesHermanas.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            #{s.codigo_sucursal || "?"} {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.sucursal_entrega_id ? (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        Los pedidos de esta sucursal NO se entregan aquí, sino que se descargan en la sucursal seleccionada (consolidación logística).
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Esta sucursal es independiente — los pedidos se entregan directamente en su propia dirección.
                      </p>
                    )}
                  </div>
                </TabsContent>
              )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t px-4 sm:px-6 py-3 flex items-center justify-between gap-2 bg-background">
              <Button type="button" variant="outline" onClick={onCancel} size="sm">
                Cancelar
              </Button>
              <div className="flex items-center gap-2">
                {isEditing && onDelete && (
                  <Button type="button" variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                )}
                <Button type="submit" size="sm">
                  {isEditing ? "Guardar Cambios" : "Crear Sucursal"}
                </Button>
              </div>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
};
