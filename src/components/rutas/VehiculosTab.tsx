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
import { Plus, Edit, Trash2, Truck, FileText, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, parseISO } from "date-fns";

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
}

const VehiculosTab = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [uploadingTarjeta, setUploadingTarjeta] = useState(false);
  const [uploadingPoliza, setUploadingPoliza] = useState(false);
  const [extractingData, setExtractingData] = useState(false);
  const [dataExtracted, setDataExtracted] = useState(false);
  const { toast } = useToast();

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
  });

  useEffect(() => {
    loadVehiculos();
  }, []);

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
        
        setFormData(prev => ({
          ...prev,
          numero_serie: data.serie_vehicular || prev.numero_serie,
          numero_motor: data.numero_motor || prev.numero_motor,
          cilindros: data.cilindros || prev.cilindros,
          modelo: data.modelo || prev.modelo,
          clave_vehicular: data.clave_vehicular || prev.clave_vehicular,
          tipo_combustible: mapCombustible(data.combustible) || prev.tipo_combustible,
          clase_tipo: data.clase_tipo || prev.clase_tipo,
          placa: data.placa || prev.placa,
          tarjeta_circulacion_expedicion: data.fecha_expedicion || prev.tarjeta_circulacion_expedicion,
          tarjeta_circulacion_vencimiento: data.fecha_vigencia || prev.tarjeta_circulacion_vencimiento,
        }));

        setDataExtracted(true);
        
        const extractedFields = [
          data.serie_vehicular && "Serie",
          data.numero_motor && "Motor",
          data.placa && "Placa",
          data.modelo && "Modelo",
          data.fecha_vigencia && "Vigencia",
        ].filter(Boolean);

        toast({
          title: "✓ Datos extraídos automáticamente",
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
      const vehiculoData = {
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
    });
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

  const getExpirationBadge = (dateStr: string | null, label: string) => {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Vehículos</h2>
          <p className="text-sm text-muted-foreground">Gestiona tu flota de vehículos</p>
        </div>
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
                </div>
                <p className="text-sm text-muted-foreground">
                  Sube la tarjeta de circulación y el sistema extraerá automáticamente: Serie, Motor, Placa, Modelo, etc.
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
                <div className="space-y-2">
                  <Label htmlFor="tarjeta_vencimiento">Fecha Vigencia (Tarjeta)</Label>
                  <Input
                    id="tarjeta_vencimiento"
                    type="date"
                    value={formData.tarjeta_circulacion_vencimiento}
                    onChange={(e) => setFormData({ ...formData, tarjeta_circulacion_vencimiento: e.target.value })}
                  />
                </div>
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
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
                <TableCell colSpan={10} className="text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : vehiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
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
                  <TableCell>{vehiculo.modelo || "—"}</TableCell>
                  <TableCell>{vehiculo.peso_maximo_local_kg.toLocaleString()}</TableCell>
                  <TableCell>{vehiculo.peso_maximo_foraneo_kg.toLocaleString()}</TableCell>
                  <TableCell>{getExpirationBadge(vehiculo.tarjeta_circulacion_vencimiento, "tarjeta")}</TableCell>
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
