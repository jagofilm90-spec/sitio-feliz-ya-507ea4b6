import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck, FileText, AlertCircle, Sparkles, Loader2, Palette, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, parseISO } from "date-fns";

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
}

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
  placa: string | null;
  numero_serie: string | null;
  tipo_combustible: string | null;
  peso_maximo_local_kg: number;
  peso_maximo_foraneo_kg: number;
  status: string;
  notas: string | null;
  activo: boolean;
  tarjeta_circulacion_url: string | null;
  tarjeta_circulacion_vencimiento: string | null;
  tarjeta_circulacion_expedicion: string | null;
  poliza_seguro_url: string | null;
  poliza_seguro_vencimiento: string | null;
  numero_motor: string | null;
  cilindros: string | null;
  modelo: string | null;
  clave_vehicular: string | null;
  clase_tipo: string | null;
  marca: string | null;
  chofer_asignado_id: string | null;
  // Federal card fields
  tipo_tarjeta_circulacion: string | null;
  peso_vehicular_ton: number | null;
  numero_ejes: number | null;
  numero_llantas: number | null;
  capacidad_toneladas: number | null;
  clase_federal: string | null;
  permiso_ruta: string | null;
  tipo_suspension: string | null;
  dimensiones_alto: number | null;
  dimensiones_ancho: number | null;
  dimensiones_largo: number | null;
}

const VehiculosTab = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [uploadingTarjeta, setUploadingTarjeta] = useState(false);
  const [uploadingPoliza, setUploadingPoliza] = useState(false);
  const [extractingData, setExtractingData] = useState(false);
  const [dataExtracted, setDataExtracted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "camioneta",
    placa: "",
    numero_serie: "",
    tipo_combustible: "diesel",
    peso_maximo_local_kg: "7800",
    peso_maximo_foraneo_kg: "7000",
    status: "disponible",
    notas: "",
    tarjeta_circulacion_url: "",
    tarjeta_circulacion_vencimiento: "",
    tarjeta_circulacion_expedicion: "",
    poliza_seguro_url: "",
    poliza_seguro_vencimiento: "",
    numero_motor: "",
    cilindros: "",
    modelo: "",
    clave_vehicular: "",
    clase_tipo: "",
    marca: "",
    // Federal card fields
    tipo_tarjeta_circulacion: "estatal",
    peso_vehicular_ton: "",
    numero_ejes: "",
    numero_llantas: "",
    capacidad_toneladas: "",
    clase_federal: "",
    permiso_ruta: "",
    tipo_suspension: "",
    dimensiones_alto: "",
    dimensiones_ancho: "",
    dimensiones_largo: "",
    chofer_asignado_id: "",
  });

  useEffect(() => {
    loadVehiculos();
    loadChoferes();
  }, []);

  const loadChoferes = async () => {
    try {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto")
        .eq("activo", true)
        .eq("puesto", "Chofer")
        .order("nombre_completo");

      if (error) throw error;
      setChoferes(data || []);
    } catch (error: any) {
      console.error("Error loading choferes:", error);
    }
  };

  const loadVehiculos = async () => {
    try {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setVehiculos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extractTarjetaCirculacionData = async (file: File) => {
    setExtractingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sesión expirada", variant: "destructive" });
        return;
      }

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get pure base64
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      toast({ title: "Analizando tarjeta de circulación con IA..." });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-tarjeta-circulacion`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pdfBase64: base64 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar documento');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        const isFederal = data.tipo_tarjeta === 'federal';
        
        setFormData(prev => ({
          ...prev,
          // Common fields
          numero_serie: data.serie_vehicular || prev.numero_serie,
          numero_motor: data.numero_motor || prev.numero_motor,
          modelo: data.modelo || prev.modelo,
          tipo_combustible: mapCombustible(data.combustible) || prev.tipo_combustible,
          clase_tipo: data.clase_tipo || prev.clase_tipo,
          placa: data.placa || prev.placa,
          tarjeta_circulacion_expedicion: data.fecha_expedicion || prev.tarjeta_circulacion_expedicion,
          marca: data.marca || prev.marca,
          tipo_tarjeta_circulacion: data.tipo_tarjeta || prev.tipo_tarjeta_circulacion,
          
          // State card fields
          cilindros: data.cilindros || prev.cilindros,
          clave_vehicular: data.clave_vehicular || prev.clave_vehicular,
          tarjeta_circulacion_vencimiento: data.fecha_vigencia || prev.tarjeta_circulacion_vencimiento,
          
          // Federal card fields
          peso_vehicular_ton: data.peso_vehicular_ton?.toString() || prev.peso_vehicular_ton,
          numero_ejes: data.numero_ejes?.toString() || prev.numero_ejes,
          numero_llantas: data.numero_llantas?.toString() || prev.numero_llantas,
          capacidad_toneladas: data.capacidad_toneladas?.toString() || prev.capacidad_toneladas,
          clase_federal: data.clase_federal || prev.clase_federal,
          permiso_ruta: data.permiso_ruta || prev.permiso_ruta,
          tipo_suspension: data.tipo_suspension || prev.tipo_suspension,
          dimensiones_alto: data.dimensiones_alto?.toString() || prev.dimensiones_alto,
          dimensiones_ancho: data.dimensiones_ancho?.toString() || prev.dimensiones_ancho,
          dimensiones_largo: data.dimensiones_largo?.toString() || prev.dimensiones_largo,
        }));

        setDataExtracted(true);
        
        const extractedFields = [
          data.serie_vehicular && "Serie",
          data.numero_motor && "Motor",
          data.placa && "Placa",
          data.modelo && "Modelo",
          data.marca && "Marca",
          !isFederal && data.fecha_vigencia && "Vigencia",
          isFederal && data.peso_vehicular_ton && "Peso",
          isFederal && data.capacidad_toneladas && "Capacidad",
          isFederal && data.clase_federal && "Clase Federal",
        ].filter(Boolean);

        toast({
          title: `✓ Datos extraídos (Tarjeta ${isFederal ? 'Federal' : 'Estatal'})`,
          description: `Campos detectados: ${extractedFields.join(", ")}`,
        });
      }
    } catch (error: any) {
      console.error('Error extracting data:', error);
      toast({
        title: "Error al extraer datos",
        description: error.message || "Ingresa los datos manualmente",
        variant: "destructive",
      });
    } finally {
      setExtractingData(false);
    }
  };

  const mapCombustible = (combustible: string | null): string => {
    if (!combustible) return "diesel";
    const lower = combustible.toLowerCase();
    if (lower.includes("gasolina")) return "gasolina";
    if (lower.includes("gas")) return "gas";
    if (lower.includes("diesel") || lower.includes("diésel")) return "diesel";
    return "diesel";
  };

  const handleFileUpload = async (
    file: File, 
    type: 'tarjeta' | 'poliza',
    vehiculoId?: string
  ) => {
    const setUploading = type === 'tarjeta' ? setUploadingTarjeta : setUploadingPoliza;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehiculoId || 'temp'}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehiculos-documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehiculos-documentos')
        .getPublicUrl(filePath);

      if (type === 'tarjeta') {
        setFormData(prev => ({
          ...prev,
          tarjeta_circulacion_url: publicUrl,
        }));
        // Extract all data from tarjeta de circulación
        await extractTarjetaCirculacionData(file);
      } else {
        setFormData(prev => ({
          ...prev,
          poliza_seguro_url: publicUrl,
        }));
        toast({ title: "Póliza de seguro cargada" });
      }
    } catch (error: any) {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isFederal = formData.tipo_tarjeta_circulacion === 'federal';
      
      const vehiculoData: any = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        placa: formData.placa || null,
        numero_serie: formData.numero_serie || null,
        tipo_combustible: formData.tipo_combustible,
        peso_maximo_local_kg: parseFloat(formData.peso_maximo_local_kg),
        peso_maximo_foraneo_kg: parseFloat(formData.peso_maximo_foraneo_kg),
        status: formData.status,
        notas: formData.notas || null,
        tarjeta_circulacion_url: formData.tarjeta_circulacion_url || null,
        tarjeta_circulacion_vencimiento: formData.tarjeta_circulacion_vencimiento || null,
        tarjeta_circulacion_expedicion: formData.tarjeta_circulacion_expedicion || null,
        poliza_seguro_url: formData.poliza_seguro_url || null,
        poliza_seguro_vencimiento: formData.poliza_seguro_vencimiento || null,
        numero_motor: formData.numero_motor || null,
        cilindros: formData.cilindros || null,
        modelo: formData.modelo || null,
        clave_vehicular: formData.clave_vehicular || null,
        clase_tipo: formData.clase_tipo || null,
        marca: formData.marca || null,
        tipo_tarjeta_circulacion: formData.tipo_tarjeta_circulacion,
        // Federal fields
        peso_vehicular_ton: formData.peso_vehicular_ton ? parseFloat(formData.peso_vehicular_ton) : null,
        numero_ejes: formData.numero_ejes ? parseInt(formData.numero_ejes) : null,
        numero_llantas: formData.numero_llantas ? parseInt(formData.numero_llantas) : null,
        capacidad_toneladas: formData.capacidad_toneladas ? parseFloat(formData.capacidad_toneladas) : null,
        clase_federal: formData.clase_federal || null,
        permiso_ruta: formData.permiso_ruta || null,
        tipo_suspension: formData.tipo_suspension || null,
        dimensiones_alto: formData.dimensiones_alto ? parseFloat(formData.dimensiones_alto) : null,
        dimensiones_ancho: formData.dimensiones_ancho ? parseFloat(formData.dimensiones_ancho) : null,
        dimensiones_largo: formData.dimensiones_largo ? parseFloat(formData.dimensiones_largo) : null,
        chofer_asignado_id: formData.chofer_asignado_id || null,
      };

      if (editingVehiculo) {
        const { error } = await supabase
          .from("vehiculos")
          .update(vehiculoData)
          .eq("id", editingVehiculo.id);

        if (error) throw error;
        toast({ title: "Vehículo actualizado correctamente" });
      } else {
        const { error } = await supabase
          .from("vehiculos")
          .insert([vehiculoData]);

        if (error) throw error;
        toast({ title: "Vehículo creado correctamente" });
      }

      setDialogOpen(false);
      resetForm();
      loadVehiculos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vehiculo: Vehiculo) => {
    setEditingVehiculo(vehiculo);
    setFormData({
      nombre: vehiculo.nombre,
      tipo: vehiculo.tipo,
      placa: vehiculo.placa || "",
      numero_serie: vehiculo.numero_serie || "",
      tipo_combustible: vehiculo.tipo_combustible || "diesel",
      peso_maximo_local_kg: vehiculo.peso_maximo_local_kg.toString(),
      peso_maximo_foraneo_kg: vehiculo.peso_maximo_foraneo_kg.toString(),
      status: vehiculo.status,
      notas: vehiculo.notas || "",
      tarjeta_circulacion_url: vehiculo.tarjeta_circulacion_url || "",
      tarjeta_circulacion_vencimiento: vehiculo.tarjeta_circulacion_vencimiento || "",
      tarjeta_circulacion_expedicion: vehiculo.tarjeta_circulacion_expedicion || "",
      poliza_seguro_url: vehiculo.poliza_seguro_url || "",
      poliza_seguro_vencimiento: vehiculo.poliza_seguro_vencimiento || "",
      numero_motor: vehiculo.numero_motor || "",
      cilindros: vehiculo.cilindros || "",
      modelo: vehiculo.modelo || "",
      clave_vehicular: vehiculo.clave_vehicular || "",
      clase_tipo: vehiculo.clase_tipo || "",
      marca: vehiculo.marca || "",
      tipo_tarjeta_circulacion: vehiculo.tipo_tarjeta_circulacion || "estatal",
      peso_vehicular_ton: vehiculo.peso_vehicular_ton?.toString() || "",
      numero_ejes: vehiculo.numero_ejes?.toString() || "",
      numero_llantas: vehiculo.numero_llantas?.toString() || "",
      capacidad_toneladas: vehiculo.capacidad_toneladas?.toString() || "",
      clase_federal: vehiculo.clase_federal || "",
      permiso_ruta: vehiculo.permiso_ruta || "",
      tipo_suspension: vehiculo.tipo_suspension || "",
      dimensiones_alto: vehiculo.dimensiones_alto?.toString() || "",
      dimensiones_ancho: vehiculo.dimensiones_ancho?.toString() || "",
      dimensiones_largo: vehiculo.dimensiones_largo?.toString() || "",
      chofer_asignado_id: vehiculo.chofer_asignado_id || "",
    });
    setDataExtracted(false);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este vehículo?")) return;

    try {
      const { error } = await supabase
        .from("vehiculos")
        .update({ activo: false })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Vehículo eliminado" });
      loadVehiculos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingVehiculo(null);
    setDataExtracted(false);
    setFormData({
      nombre: "",
      tipo: "camioneta",
      placa: "",
      numero_serie: "",
      tipo_combustible: "diesel",
      peso_maximo_local_kg: "7800",
      peso_maximo_foraneo_kg: "7000",
      status: "disponible",
      notas: "",
      tarjeta_circulacion_url: "",
      tarjeta_circulacion_vencimiento: "",
      tarjeta_circulacion_expedicion: "",
      poliza_seguro_url: "",
      poliza_seguro_vencimiento: "",
      numero_motor: "",
      cilindros: "",
      modelo: "",
      clave_vehicular: "",
      clase_tipo: "",
      marca: "",
      tipo_tarjeta_circulacion: "estatal",
      peso_vehicular_ton: "",
      numero_ejes: "",
      numero_llantas: "",
      capacidad_toneladas: "",
      clase_federal: "",
      permiso_ruta: "",
      tipo_suspension: "",
      dimensiones_alto: "",
      dimensiones_ancho: "",
      dimensiones_largo: "",
      chofer_asignado_id: "",
    });
  };

  const getChoferName = (choferId: string | null) => {
    if (!choferId) return null;
    const chofer = choferes.find(c => c.id === choferId);
    return chofer?.nombre_completo || null;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      disponible: "default",
      en_ruta: "secondary",
      mantenimiento: "destructive",
    };
    const labels: Record<string, string> = {
      disponible: "Disponible",
      en_ruta: "En Ruta",
      mantenimiento: "Mantenimiento",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getExpirationBadge = (dateStr: string | null, label: string, tipoTarjeta?: string | null) => {
    // Federal cards don't have expiration dates
    if (label === "tarjeta" && tipoTarjeta === "federal") {
      return <Badge variant="secondary" className="text-xs">Federal (sin venc.)</Badge>;
    }
    
    if (!dateStr) return <span className="text-muted-foreground text-sm">Sin {label}</span>;
    
    const date = parseISO(dateStr);
    const daysUntilExpiry = differenceInDays(date, new Date());
    
    let variant: "default" | "secondary" | "destructive" = "default";
    let icon = null;
    
    if (daysUntilExpiry < 0) {
      variant = "destructive";
      icon = <AlertCircle className="h-3 w-3 mr-1" />;
    } else if (daysUntilExpiry <= 30) {
      variant = "secondary";
      icon = <AlertCircle className="h-3 w-3 mr-1" />;
    }

    return (
      <Badge variant={variant} className="text-xs">
        {icon}
        {format(date, "dd/MM/yyyy")}
      </Badge>
    );
  };

  const isFederalCard = formData.tipo_tarjeta_circulacion === 'federal';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Vehículos</h2>
          <p className="text-sm text-muted-foreground">Gestiona tu flota de vehículos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/disenos-camioneta')}>
            <Palette className="h-4 w-4 mr-2" />
            Diseñar Rotulado
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Vehículo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVehiculo ? "Editar Vehículo" : "Nuevo Vehículo"}
              </DialogTitle>
              <DialogDescription>
                Configura la información del vehículo. Sube la tarjeta de circulación para auto-rellenar datos.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Tarjeta de Circulación Upload - Prominent */}
              <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <Label className="font-medium">Tarjeta de Circulación (Extracción automática)</Label>
                  {formData.tipo_tarjeta_circulacion && (
                    <Badge variant={isFederalCard ? "default" : "secondary"} className="text-xs">
                      {isFederalCard ? "Federal (SICT)" : "Estatal"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Sube la tarjeta de circulación (estatal o federal) y el sistema extraerá automáticamente los datos.
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'tarjeta', editingVehiculo?.id);
                    }}
                    disabled={uploadingTarjeta || extractingData}
                    className="flex-1"
                  />
                  {(uploadingTarjeta || extractingData) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {extractingData ? "Analizando..." : "Subiendo..."}
                    </div>
                  )}
                </div>
                {formData.tarjeta_circulacion_url && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    <span>Documento cargado</span>
                    {dataExtracted && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Datos extraídos con IA
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Card type selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Tarjeta</Label>
                  <Select
                    value={formData.tipo_tarjeta_circulacion}
                    onValueChange={(value) => setFormData({ ...formData, tipo_tarjeta_circulacion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estatal">Estatal</SelectItem>
                      <SelectItem value="federal">Federal (SICT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Ej: Nissan, HINO, International"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre / No. Económico *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Unidad 01"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camioneta">Camioneta</SelectItem>
                      <SelectItem value="urvan">Urvan</SelectItem>
                      <SelectItem value="rabon">Rabón</SelectItem>
                      <SelectItem value="torton">Tortón</SelectItem>
                      <SelectItem value="trailer">Tráiler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa</Label>
                  <Input
                    id="placa"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                    placeholder="ABC-123"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_serie">Serie Vehicular (NIV)</Label>
                  <Input
                    id="numero_serie"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    placeholder="17 caracteres"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_motor">Número de Motor</Label>
                  <Input
                    id="numero_motor"
                    value={formData.numero_motor}
                    onChange={(e) => setFormData({ ...formData, numero_motor: e.target.value })}
                    placeholder="No. Motor"
                    autoComplete="off"
                  />
                </div>
                {!isFederalCard && (
                  <div className="space-y-2">
                    <Label htmlFor="cilindros">Cilindros</Label>
                    <Input
                      id="cilindros"
                      value={formData.cilindros}
                      onChange={(e) => setFormData({ ...formData, cilindros: e.target.value })}
                      placeholder="4, 6, 8..."
                      autoComplete="off"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo (Año)</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    placeholder="2024"
                    autoComplete="off"
                  />
                </div>
              </div>

              {!isFederalCard && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clave_vehicular">Clave Vehicular</Label>
                    <Input
                      id="clave_vehicular"
                      value={formData.clave_vehicular}
                      onChange={(e) => setFormData({ ...formData, clave_vehicular: e.target.value })}
                      placeholder="Clave oficial"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clase_tipo">Clase y Tipo</Label>
                    <Input
                      id="clase_tipo"
                      value={formData.clase_tipo}
                      onChange={(e) => setFormData({ ...formData, clase_tipo: e.target.value })}
                      placeholder="Ej: Camioneta Pick Up"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              {/* Federal Card Specific Fields */}
              {isFederalCard && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Badge variant="default">Federal</Badge>
                    Datos de Tarjeta Federal (SICT)
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clase_federal">Clase Federal</Label>
                      <Input
                        id="clase_federal"
                        value={formData.clase_federal}
                        onChange={(e) => setFormData({ ...formData, clase_federal: e.target.value })}
                        placeholder="C2, C3, T3S2..."
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="peso_vehicular_ton">Peso Vehicular (Ton)</Label>
                      <Input
                        id="peso_vehicular_ton"
                        type="number"
                        step="0.1"
                        value={formData.peso_vehicular_ton}
                        onChange={(e) => setFormData({ ...formData, peso_vehicular_ton: e.target.value })}
                        placeholder="6.0"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacidad_toneladas">Capacidad (Ton)</Label>
                      <Input
                        id="capacidad_toneladas"
                        type="number"
                        step="0.1"
                        value={formData.capacidad_toneladas}
                        onChange={(e) => setFormData({ ...formData, capacidad_toneladas: e.target.value })}
                        placeholder="11.0"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero_ejes">Número de Ejes</Label>
                      <Input
                        id="numero_ejes"
                        type="number"
                        value={formData.numero_ejes}
                        onChange={(e) => setFormData({ ...formData, numero_ejes: e.target.value })}
                        placeholder="2, 3, 5..."
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_llantas">Número de Llantas</Label>
                      <Input
                        id="numero_llantas"
                        type="number"
                        value={formData.numero_llantas}
                        onChange={(e) => setFormData({ ...formData, numero_llantas: e.target.value })}
                        placeholder="6, 10, 18..."
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo_suspension">Tipo de Suspensión</Label>
                      <Select
                        value={formData.tipo_suspension}
                        onValueChange={(value) => setFormData({ ...formData, tipo_suspension: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mecánica">Mecánica</SelectItem>
                          <SelectItem value="Neumática">Neumática</SelectItem>
                          <SelectItem value="Mixta">Mixta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dimensiones_largo">Largo (m)</Label>
                      <Input
                        id="dimensiones_largo"
                        type="number"
                        step="0.01"
                        value={formData.dimensiones_largo}
                        onChange={(e) => setFormData({ ...formData, dimensiones_largo: e.target.value })}
                        placeholder="8.50"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dimensiones_ancho">Ancho (m)</Label>
                      <Input
                        id="dimensiones_ancho"
                        type="number"
                        step="0.01"
                        value={formData.dimensiones_ancho}
                        onChange={(e) => setFormData({ ...formData, dimensiones_ancho: e.target.value })}
                        placeholder="2.60"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dimensiones_alto">Alto (m)</Label>
                      <Input
                        id="dimensiones_alto"
                        type="number"
                        step="0.01"
                        value={formData.dimensiones_alto}
                        onChange={(e) => setFormData({ ...formData, dimensiones_alto: e.target.value })}
                        placeholder="4.10"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permiso_ruta">Permiso de Ruta</Label>
                      <Input
                        id="permiso_ruta"
                        value={formData.permiso_ruta}
                        onChange={(e) => setFormData({ ...formData, permiso_ruta: e.target.value })}
                        placeholder="No. permiso"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_combustible">Tipo de Combustible</Label>
                  <Select
                    value={formData.tipo_combustible}
                    onValueChange={(value) => setFormData({ ...formData, tipo_combustible: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">Diésel</SelectItem>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="gas">Gas LP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="en_ruta">En Ruta</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Chofer Asignado */}
              <div className="space-y-2">
                <Label htmlFor="chofer_asignado_id" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Chofer Asignado al Vehículo
                </Label>
                <Select
                  value={formData.chofer_asignado_id}
                  onValueChange={(value) => setFormData({ ...formData, chofer_asignado_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar chofer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {choferes.map((chofer) => (
                      <SelectItem key={chofer.id} value={chofer.id}>
                        {chofer.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El chofer que normalmente opera este vehículo
                </p>
              </div>

              {/* Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="peso_maximo_local_kg">Capacidad Local (kg) *</Label>
                  <Input
                    id="peso_maximo_local_kg"
                    type="number"
                    value={formData.peso_maximo_local_kg}
                    onChange={(e) => setFormData({ ...formData, peso_maximo_local_kg: e.target.value })}
                    required
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">CDMX y zona metropolitana</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso_maximo_foraneo_kg">Capacidad Foránea (kg) *</Label>
                  <Input
                    id="peso_maximo_foraneo_kg"
                    type="number"
                    value={formData.peso_maximo_foraneo_kg}
                    onChange={(e) => setFormData({ ...formData, peso_maximo_foraneo_kg: e.target.value })}
                    required
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">Estados fuera de CDMX</p>
                </div>
              </div>

              {/* Dates from Tarjeta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarjeta_expedicion">Fecha Expedición (Tarjeta)</Label>
                  <Input
                    id="tarjeta_expedicion"
                    type="date"
                    value={formData.tarjeta_circulacion_expedicion}
                    onChange={(e) => setFormData({ ...formData, tarjeta_circulacion_expedicion: e.target.value })}
                  />
                </div>
                {!isFederalCard && (
                  <div className="space-y-2">
                    <Label htmlFor="tarjeta_vencimiento">Fecha Vigencia (Tarjeta)</Label>
                    <Input
                      id="tarjeta_vencimiento"
                      type="date"
                      value={formData.tarjeta_circulacion_vencimiento}
                      onChange={(e) => setFormData({ ...formData, tarjeta_circulacion_vencimiento: e.target.value })}
                    />
                  </div>
                )}
                {isFederalCard && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vigencia</Label>
                    <p className="text-sm text-muted-foreground pt-2">
                      Las tarjetas federales no tienen fecha de vencimiento
                    </p>
                  </div>
                )}
              </div>

              {/* Póliza de Seguro */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Póliza de Seguro</h3>
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'poliza', editingVehiculo?.id);
                      }}
                      disabled={uploadingPoliza}
                      className="flex-1"
                    />
                    {uploadingPoliza && <span className="text-sm text-muted-foreground">Subiendo...</span>}
                  </div>
                  {formData.poliza_seguro_url && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="h-4 w-4" />
                      <span>Documento cargado</span>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <Label htmlFor="poliza_vencimiento" className="text-sm whitespace-nowrap">Vencimiento:</Label>
                    <Input
                      id="poliza_vencimiento"
                      type="date"
                      value={formData.poliza_seguro_vencimiento}
                      onChange={(e) => setFormData({ ...formData, poliza_seguro_vencimiento: e.target.value })}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Input
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  autoComplete="off"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={extractingData}>
                  {extractingData ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Chofer Asignado</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Local (kg)</TableHead>
              <TableHead>Foránea (kg)</TableHead>
              <TableHead>Tarjeta Circ.</TableHead>
              <TableHead>Póliza Seguro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : vehiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  <div className="py-8 flex flex-col items-center gap-2">
                    <Truck className="h-8 w-8 text-muted-foreground" />
                    <p>No hay vehículos registrados</p>
                    <p className="text-sm text-muted-foreground">
                      Agrega tu primer vehículo para empezar a planificar rutas
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              vehiculos.map((vehiculo) => (
                <TableRow key={vehiculo.id}>
                  <TableCell className="font-medium">{vehiculo.nombre}</TableCell>
                  <TableCell className="capitalize">{vehiculo.tipo}</TableCell>
                  <TableCell>{vehiculo.placa || "—"}</TableCell>
                  <TableCell>
                    {getChoferName(vehiculo.chofer_asignado_id) ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getChoferName(vehiculo.chofer_asignado_id)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vehiculo.marca || vehiculo.modelo ? (
                      <span>{[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ")}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{vehiculo.peso_maximo_local_kg.toLocaleString()}</TableCell>
                  <TableCell>{vehiculo.peso_maximo_foraneo_kg.toLocaleString()}</TableCell>
                  <TableCell>{getExpirationBadge(vehiculo.tarjeta_circulacion_vencimiento, "tarjeta", vehiculo.tipo_tarjeta_circulacion)}</TableCell>
                  <TableCell>{getExpirationBadge(vehiculo.poliza_seguro_vencimiento, "póliza")}</TableCell>
                  <TableCell>{getStatusBadge(vehiculo.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(vehiculo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(vehiculo.id)}>
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
    </div>
  );
};

export default VehiculosTab;
