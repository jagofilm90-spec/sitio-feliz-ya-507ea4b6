import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageForUpload, validateCapturedFile } from "@/lib/imageUtils";
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
import { Plus, Edit, Trash2, Truck, FileText, AlertCircle, Sparkles, Loader2, Palette, User, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { VehiculoCardMobile } from "./VehiculoCardMobile";

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
  // Invoice fields
  factura_url: string | null;
  factura_fecha: string | null;
  factura_folio: string | null;
  factura_valor: number | null;
  factura_vendedor: string | null;
  color: string | null;
  anio: number | null;
}

const VehiculosTab = () => {
  const isMobile = useIsMobile();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [uploadingTarjeta, setUploadingTarjeta] = useState(false);
  const [uploadingPoliza, setUploadingPoliza] = useState(false);
  const [uploadingFactura, setUploadingFactura] = useState(false);
  const [extractingData, setExtractingData] = useState(false);
  const [extractingFactura, setExtractingFactura] = useState(false);
  const [dataExtracted, setDataExtracted] = useState(false);
  const [facturaExtracted, setFacturaExtracted] = useState(false);
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
    // Invoice fields
    factura_url: "",
    factura_fecha: "",
    factura_folio: "",
    factura_valor: "",
    factura_vendedor: "",
    color: "",
    anio: "",
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
      // Validar que el archivo existe y tiene contenido (evita crash en iPad)
      if (!file || file.size === 0) {
        throw new Error('Archivo vacío o inválido');
      }

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

  const extractFacturaData = async (file: File) => {
    setExtractingFactura(true);
    try {
      // Validar que el archivo existe y tiene contenido (evita crash en iPad)
      if (!file || file.size === 0) {
        throw new Error('Archivo vacío o inválido');
      }

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
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      toast({ title: "Analizando factura con IA...", description: "Esto puede tardar unos segundos" });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-factura-vehiculo`,
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

      const data = await response.json();
      
      // Update form with extracted data
      setFormData(prev => ({
        ...prev,
        // Vehicle identification
        numero_serie: data.vin || prev.numero_serie,
        numero_motor: data.numero_motor || prev.numero_motor,
        marca: data.marca || prev.marca,
        modelo: data.modelo || prev.modelo,
        placa: data.placas || prev.placa,
        tipo_combustible: data.tipo_combustible ? mapCombustible(data.tipo_combustible) : prev.tipo_combustible,
        color: data.color || prev.color,
        anio: data.anio?.toString() || prev.anio,
        // Invoice data
        factura_folio: data.folio_factura || prev.factura_folio,
        factura_fecha: data.fecha_factura || prev.factura_fecha,
        factura_valor: data.valor_factura?.toString() || prev.factura_valor,
        factura_vendedor: data.vendedor || prev.factura_vendedor,
        // Capacity if available
        peso_maximo_local_kg: data.capacidad_carga_kg?.toString() || prev.peso_maximo_local_kg,
      }));

      setFacturaExtracted(true);

      const extractedFields = [
        data.marca && "Marca",
        data.modelo && "Modelo",
        data.anio && "Año",
        data.vin && "VIN",
        data.numero_motor && "Motor",
        data.color && "Color",
        data.folio_factura && "Folio",
        data.valor_factura && "Valor",
        data.vendedor && "Vendedor",
      ].filter(Boolean);

      toast({
        title: "✓ Datos extraídos de factura",
        description: `Campos detectados: ${extractedFields.join(", ")}`,
      });
    } catch (error: any) {
      console.error('Error extracting factura data:', error);
      toast({
        title: "Error al extraer datos de factura",
        description: error.message || "Ingresa los datos manualmente",
        variant: "destructive",
      });
    } finally {
      setExtractingFactura(false);
    }
  };

  const handleFacturaUpload = async (file: File, vehiculoId?: string) => {
    setUploadingFactura(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehiculoId || 'temp'}_factura_${Date.now()}.${fileExt}`;
      const filePath = `factura/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehiculos-documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehiculos-documentos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        factura_url: publicUrl,
      }));

      // Extract data from invoice
      await extractFacturaData(file);
    } catch (error: any) {
      toast({
        title: "Error al subir factura",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFactura(false);
    }
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
        // Invoice fields
        factura_url: formData.factura_url || null,
        factura_fecha: formData.factura_fecha || null,
        factura_folio: formData.factura_folio || null,
        factura_valor: formData.factura_valor ? parseFloat(formData.factura_valor) : null,
        factura_vendedor: formData.factura_vendedor || null,
        color: formData.color || null,
        anio: formData.anio ? parseInt(formData.anio) : null,
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
      // Invoice fields
      factura_url: vehiculo.factura_url || "",
      factura_fecha: vehiculo.factura_fecha || "",
      factura_folio: vehiculo.factura_folio || "",
      factura_valor: vehiculo.factura_valor?.toString() || "",
      factura_vendedor: vehiculo.factura_vendedor || "",
      color: vehiculo.color || "",
      anio: vehiculo.anio?.toString() || "",
    });
    setDataExtracted(false);
    setFacturaExtracted(false);
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
    setFacturaExtracted(false);
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
      // Invoice fields
      factura_url: "",
      factura_fecha: "",
      factura_folio: "",
      factura_valor: "",
      factura_vendedor: "",
      color: "",
      anio: "",
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
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
                    accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                    capture="environment"
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        
                        // Validación defensiva para iPad - evita crash si la cámara falla
                        const validation = validateCapturedFile(file);
                        if (!validation.valid) {
                          if (validation.errorTitle) {
                            toast({
                              title: validation.errorTitle,
                              description: validation.errorMessage,
                              variant: "destructive",
                            });
                          }
                          return;
                        }
                        
                        // Para imágenes, comprimir antes de procesar (evita crash por memoria en iPad)
                        let processedFile = file;
                        if (file.type.startsWith('image/')) {
                          processedFile = await compressImageForUpload(file, 'ocr');
                        }
                        
                        handleFileUpload(processedFile, 'tarjeta', editingVehiculo?.id);
                      } catch (error) {
                        console.error('Error processing file:', error);
                        toast({
                          title: "Error al procesar archivo",
                          description: "Intenta de nuevo o selecciona un archivo diferente",
                          variant: "destructive",
                        });
                      }
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

              {/* Datos básicos */}
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-base font-bold"># Económico *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: 27, 50"
                  required autoComplete="off"
                  className="text-2xl font-black h-14 text-center"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camioneta">Camioneta</SelectItem>
                      <SelectItem value="torton">Tortón</SelectItem>
                      <SelectItem value="rabon">Rabón</SelectItem>
                      <SelectItem value="mini_rabon">Mini Rabón</SelectItem>
                      <SelectItem value="urvan">Urvan</SelectItem>
                      <SelectItem value="camion">Camión</SelectItem>
                      <SelectItem value="trailer">Tráiler</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Combustible</Label>
                  <Select value={formData.tipo_combustible} onValueChange={(v) => setFormData({ ...formData, tipo_combustible: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">Diésel</SelectItem>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chofer</Label>
                  <Select value={formData.chofer_asignado_id || "none"} onValueChange={(v) => setFormData({ ...formData, chofer_asignado_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {choferes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <details className="border rounded-md p-3">
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground">Datos del vehículo (opcionales)</summary>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1"><Label className="text-xs">Marca</Label><Input value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} placeholder="Ford, Isuzu..." autoComplete="off" /></div>
                  <div className="space-y-1"><Label className="text-xs">Modelo</Label><Input value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} placeholder="F-350, NPR..." autoComplete="off" /></div>
                  <div className="space-y-1"><Label className="text-xs">Año</Label><Input value={formData.anio} onChange={(e) => setFormData({ ...formData, anio: e.target.value })} placeholder="2024" autoComplete="off" /></div>
                  <div className="space-y-1"><Label className="text-xs">Placas</Label><Input value={formData.placa} onChange={(e) => setFormData({ ...formData, placa: e.target.value })} placeholder="ABC-123" autoComplete="off" /></div>
                  <div className="space-y-1"><Label className="text-xs">Color</Label><Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="Blanco" autoComplete="off" /></div>
                  <div className="space-y-1"><Label className="text-xs">No. Serie (VIN)</Label><Input value={formData.numero_serie} onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })} placeholder="17 caracteres" autoComplete="off" /></div>
                  <div className="space-y-1"><Label className="text-xs">No. Motor</Label><Input value={formData.numero_motor} onChange={(e) => setFormData({ ...formData, numero_motor: e.target.value })} placeholder="No. motor" autoComplete="off" /></div>
                  {isFederalCard && <div className="space-y-1"><Label className="text-xs">Permiso SCT</Label><Input value={formData.permiso_ruta} onChange={(e) => setFormData({ ...formData, permiso_ruta: e.target.value })} placeholder="No. permiso" autoComplete="off" /></div>}
                </div>
              </details>

              {/* Datos extraídos de tarjeta/factura se auto-llenan en Sección 2 */}

              {/* Federal Card Specific Fields */}
              {isFederalCard && (
                <details className="border rounded-md p-3">
                  <summary className="text-sm font-medium cursor-pointer text-muted-foreground flex items-center gap-2">
                    <Badge variant="default" className="text-xs">Federal</Badge>
                    Datos de Tarjeta Federal (SICT)
                  </summary>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                </details>
              )}

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
                      accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                      capture="environment"
                      onChange={async (e) => {
                        try {
                          const file = e.target.files?.[0];
                          
                          // Validación defensiva para iPad - evita crash si la cámara falla
                          const validation = validateCapturedFile(file);
                          if (!validation.valid) {
                            if (validation.errorTitle) {
                              toast({
                                title: validation.errorTitle,
                                description: validation.errorMessage,
                                variant: "destructive",
                              });
                            }
                            return;
                          }
                          
                          // Para imágenes, comprimir antes de procesar (evita crash en iPad)
                          let processedFile = file;
                          if (file.type.startsWith('image/')) {
                            processedFile = await compressImageForUpload(file, 'evidence');
                          }
                          
                          handleFileUpload(processedFile, 'poliza', editingVehiculo?.id);
                        } catch (error) {
                          console.error('Error processing file:', error);
                          toast({
                            title: "Error al procesar archivo",
                            description: "Intenta de nuevo o selecciona un archivo diferente",
                            variant: "destructive",
                          });
                        }
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

              {/* Factura de Compra - Extracción Automática */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <Label className="font-medium">Factura de Compra del Vehículo (Extracción automática)</Label>
                  {facturaExtracted && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Datos extraídos
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Sube la factura PDF y el sistema extraerá automáticamente marca, modelo, VIN, motor, color y más.
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                    capture="environment"
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        
                        // Validación defensiva para iPad - evita crash si la cámara falla
                        const validation = validateCapturedFile(file);
                        if (!validation.valid) {
                          if (validation.errorTitle) {
                            toast({
                              title: validation.errorTitle,
                              description: validation.errorMessage,
                              variant: "destructive",
                            });
                          }
                          return;
                        }
                        
                        // Para imágenes, comprimir antes de procesar (evita crash en iPad)
                        let processedFile = file;
                        if (file.type.startsWith('image/')) {
                          processedFile = await compressImageForUpload(file, 'ocr');
                        }
                        
                        handleFacturaUpload(processedFile, editingVehiculo?.id);
                      } catch (error) {
                        console.error('Error processing file:', error);
                        toast({
                          title: "Error al procesar archivo",
                          description: "Intenta de nuevo o selecciona un archivo diferente",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={uploadingFactura || extractingFactura}
                    className="flex-1"
                  />
                  {(uploadingFactura || extractingFactura) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {extractingFactura ? "Analizando..." : "Subiendo..."}
                    </div>
                  )}
                </div>
                {formData.factura_url && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    <span>Factura cargada</span>
                  </div>
                )}
                
                {/* Invoice details if extracted or manually entered */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="factura_folio" className="text-sm">Folio Factura</Label>
                    <Input
                      id="factura_folio"
                      value={formData.factura_folio}
                      onChange={(e) => setFormData({ ...formData, factura_folio: e.target.value })}
                      placeholder="A-12345"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="factura_fecha" className="text-sm">Fecha Factura</Label>
                    <Input
                      id="factura_fecha"
                      type="date"
                      value={formData.factura_fecha}
                      onChange={(e) => setFormData({ ...formData, factura_fecha: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="factura_valor" className="text-sm">Valor ($)</Label>
                    <Input
                      id="factura_valor"
                      type="number"
                      value={formData.factura_valor}
                      onChange={(e) => setFormData({ ...formData, factura_valor: e.target.value })}
                      placeholder="485000"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="factura_vendedor" className="text-sm">Vendedor/Agencia</Label>
                    <Input
                      id="factura_vendedor"
                      value={formData.factura_vendedor}
                      onChange={(e) => setFormData({ ...formData, factura_vendedor: e.target.value })}
                      placeholder="Nissan del Valle"
                      autoComplete="off"
                    />
                  </div>
                </div>

              </div>

              <div className="space-y-2 hidden">
                <Input
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
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

      {/* Lista de vehículos */}
      {isMobile ? (
        /* Vista Mobile - Cards */
        <div className="space-y-3">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : vehiculos.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <Truck className="h-8 w-8 text-muted-foreground" />
              <p>No hay vehículos registrados</p>
            </div>
          ) : (
            vehiculos.map((vehiculo) => (
              <VehiculoCardMobile
                key={vehiculo.id}
                vehiculo={{
                  id: vehiculo.id,
                  nombre: vehiculo.nombre,
                  placa: vehiculo.placa || "",
                  marca: vehiculo.marca,
                  modelo: vehiculo.modelo,
                  anio: vehiculo.anio,
                  capacidad_kg_local: vehiculo.peso_maximo_local_kg,
                  capacidad_kg_foranea: vehiculo.peso_maximo_foraneo_kg,
                  chofer_asignado: vehiculo.chofer_asignado_id,
                  tarjeta_circulacion_vencimiento: vehiculo.tarjeta_circulacion_vencimiento,
                  poliza_seguro_vencimiento: vehiculo.poliza_seguro_vencimiento,
                  status: vehiculo.status,
                }}
                choferName={getChoferName(vehiculo.chofer_asignado_id)}
                onEdit={() => handleEdit(vehiculo)}
                onDelete={() => handleDelete(vehiculo.id)}
              />
            ))
          )}
        </div>
      ) : (
        /* Vista Desktop - Tabla */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead># Económico</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Combustible</TableHead>
                <TableHead>Placas</TableHead>
                <TableHead>Chofer Asignado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : vehiculos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
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
                    <TableCell>
                      <span className="text-lg font-black">{vehiculo.nombre}</span>
                      {vehiculo.marca && <span className="text-xs text-muted-foreground ml-2">{[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ")}{vehiculo.anio ? ` ${vehiculo.anio}` : ""}</span>}
                    </TableCell>
                    <TableCell className="capitalize">{vehiculo.tipo}</TableCell>
                    <TableCell className="capitalize">{vehiculo.tipo_combustible || "—"}</TableCell>
                    <TableCell>{vehiculo.placa || "—"}</TableCell>
                    <TableCell>
                      {getChoferName(vehiculo.chofer_asignado_id) ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{getChoferName(vehiculo.chofer_asignado_id)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(vehiculo.status)}</TableCell>
                    <TableCell>
                      {(() => {
                        const docs = [vehiculo.tarjeta_circulacion_url, vehiculo.poliza_seguro_url, vehiculo.factura_url].filter(Boolean).length;
                        return <Badge variant="outline" className={`text-xs ${docs >= 3 ? "bg-green-50 text-green-700 border-green-300" : docs >= 1 ? "bg-yellow-50 text-yellow-700 border-yellow-300" : "bg-red-50 text-red-700 border-red-300"}`}>{docs}/3</Badge>;
                      })()}
                    </TableCell>
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
      )}
    </div>
  );
};

export default VehiculosTab;
