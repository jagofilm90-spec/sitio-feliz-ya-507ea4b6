import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, MapPin, X, Mail, BarChart3, Loader2, Sparkles, User, Package, Map, ClipboardList, FileSpreadsheet, Users, Building2, Gift, CalendarDays, Home, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AuditoriaFiscalSheet } from "@/components/clientes/AuditoriaFiscalSheet";
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
import ClienteSucursalesDialog from "@/components/clientes/ClienteSucursalesDialog";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";
import ClienteHistorialAnalytics from "@/components/analytics/ClienteHistorialAnalytics";
import { ClienteUsuarioTab } from "@/components/clientes/ClienteUsuarioTab";
import { ClienteFormContent } from "@/components/clientes/ClienteFormContent";
import { ClienteProductosTab } from "@/components/clientes/ClienteProductosTab";
import { ClienteProductosDialog } from "@/components/clientes/ClienteProductosDialog";
import { ClienteCreditosExcepcionesTab } from "@/components/clientes/ClienteCreditosExcepcionesTab";
import { ClienteCortesiasTab } from "@/components/clientes/ClienteCortesiasTab";
import { ClienteProgramacionTab } from "@/components/clientes/ClienteProgramacionTab";
import { useUserRoles } from "@/hooks/useUserRoles";
import { CreditCard } from "lucide-react";
import { ImportarCatalogoAspelDialog } from "@/components/clientes/ImportarCatalogoAspelDialog";
import { AgruparClientesDialog } from "@/components/clientes/AgruparClientesDialog";
import { DetectarGruposDialog } from "@/components/clientes/DetectarGruposDialog";
import { ImportarSucursalesExcelDialog } from "@/components/clientes/ImportarSucursalesExcelDialog";
import { ClienteCardMobile } from "@/components/clientes/ClienteCardMobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog as HistorialDialog,
  DialogContent as HistorialDialogContent,
  DialogHeader as HistorialDialogHeader,
  DialogTitle as HistorialDialogTitle,
} from "@/components/ui/dialog";

interface Zona {
  id: string;
  nombre: string;
}

interface SucursalForm {
  id: string;
  nombre: string;
  direccion: string;
  zona_id: string;
  telefono: string;
  contacto: string;
}

interface CorreoForm {
  id: string;
  email: string;
  nombre_contacto: string;
  proposito: string;
  es_principal: boolean;
  isNew?: boolean;
}

interface Vendedor {
  user_id: string;
  nombre: string;
  nombre_corto: string;
}

const Clientes = () => {
  const isMobile = useIsMobile();
  const [clientes, setClientes] = useState<any[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [sucursalesDialogOpen, setSucursalesDialogOpen] = useState(false);
  const [selectedClienteForSucursales, setSelectedClienteForSucursales] = useState<{ id: string; nombre: string } | null>(null);
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false);
  const [selectedClienteForHistorial, setSelectedClienteForHistorial] = useState<{ id: string; nombre: string } | null>(null);
  const [productosDialogOpen, setProductosDialogOpen] = useState(false);
  const [selectedClienteForProductos, setSelectedClienteForProductos] = useState<{ id: string; nombre: string } | null>(null);
  const [auditoriaSheetOpen, setAuditoriaSheetOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [agruparDialogOpen, setAgruparDialogOpen] = useState(false);
  const [detectarGruposDialogOpen, setDetectarGruposDialogOpen] = useState(false);
  const [importSucursalesDialogOpen, setImportSucursalesDialogOpen] = useState(false);
  const [sucursalesConRfcCount, setSucursalesConRfcCount] = useState(0);
  const [activeVendedorTab, setActiveVendedorTab] = useState("casa");
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();

  // Form state
  const [formData, setFormData] = useState<{
    codigo: string;
    nombre: string;
    razon_social: string;
    rfc: string;
    direccion: string;
    telefono: string;
    email: string;
    termino_credito: "contado" | "8_dias" | "15_dias" | "30_dias";
    limite_credito: string;
    zona_id: string;
    preferencia_facturacion: "siempre_factura" | "siempre_remision" | "variable";
    regimen_capital: string;
    codigo_postal: string;
    tipo_vialidad: string;
    nombre_vialidad: string;
    numero_exterior: string;
    numero_interior: string;
    nombre_colonia: string;
    nombre_localidad: string;
    nombre_municipio: string;
    nombre_entidad_federativa: string;
    entre_calle: string;
    y_calle: string;
    csf_archivo_url: string;
    prioridad_entrega_default: "vip_mismo_dia" | "deadline" | "dia_fijo_recurrente" | "fecha_sugerida" | "flexible";
    deadline_dias_habiles_default: string;
    es_grupo: boolean;
    vendedor_asignado: string;
  }>({
    codigo: "",
    nombre: "",
    razon_social: "",
    rfc: "",
    direccion: "",
    telefono: "",
    email: "",
    termino_credito: "contado",
    limite_credito: "",
    zona_id: "",
    preferencia_facturacion: "variable",
    regimen_capital: "",
    codigo_postal: "",
    tipo_vialidad: "",
    nombre_vialidad: "",
    numero_exterior: "",
    numero_interior: "",
    nombre_colonia: "",
    nombre_localidad: "",
    nombre_municipio: "",
    nombre_entidad_federativa: "",
    entre_calle: "",
    y_calle: "",
    csf_archivo_url: "",
    prioridad_entrega_default: "flexible",
    deadline_dias_habiles_default: "",
    es_grupo: false,
    vendedor_asignado: "",
  });
  
  // CSF file upload state
  const [csfFile, setCsfFile] = useState<File | null>(null);
  const [parsingCsf, setParsingCsf] = useState(false);

  // Delivery options state
  const [entregarMismaDireccion, setEntregarMismaDireccion] = useState(true);
  const [sucursales, setSucursales] = useState<SucursalForm[]>([]);

  // Email management state
  const [correos, setCorreos] = useState<CorreoForm[]>([]);
  const [originalCorreoIds, setOriginalCorreoIds] = useState<string[]>([]);
  const [newCorreoEmail, setNewCorreoEmail] = useState("");
  const [newCorreoNombre, setNewCorreoNombre] = useState("");

  useEffect(() => {
    loadClientes();
    loadZonas();
    loadSucursalesConRfcCount();
  }, []);

  const loadSucursalesConRfcCount = async () => {
    try {
      const { count, error } = await supabase
        .from("cliente_sucursales")
        .select("*", { count: "exact", head: true })
        .not("rfc", "is", null)
        .neq("rfc", "")
        .eq("activo", true)
        .or("razon_social.is.null,razon_social.eq.,direccion_fiscal.is.null,direccion_fiscal.eq.,email_facturacion.is.null,email_facturacion.eq.");

      if (!error) {
        setSucursalesConRfcCount(count || 0);
      }
    } catch (error) {
      console.error("Error counting sucursales:", error);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select(`
          *,
          zona:zona_id (id, nombre),
          cliente_sucursales (count),
          cliente_productos_frecuentes (count),
          grupo_padre:grupo_cliente_id (id, nombre, codigo)
        `)
        .order("nombre");

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
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
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setZonas(data || []);
    } catch (error: any) {
      console.error("Error loading zones:", error);
    }
  };

  const loadCorreosCliente = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from("cliente_correos")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("activo", true)
        .order("es_principal", { ascending: false });

      if (error) throw error;
      const loadedCorreos = (data || []).map(c => ({
        id: c.id,
        email: c.email,
        nombre_contacto: c.nombre_contacto || "",
        proposito: c.proposito || "general",
        es_principal: c.es_principal || false,
        isNew: false,
      }));
      setCorreos(loadedCorreos);
      setOriginalCorreoIds(loadedCorreos.map(c => c.id));
    } catch (error) {
      console.error("Error loading correos:", error);
      setCorreos([]);
      setOriginalCorreoIds([]);
    }
  };

  const handleAddCorreo = () => {
    if (!newCorreoEmail || !newCorreoEmail.includes("@")) return;
    if (correos.some(c => c.email.toLowerCase() === newCorreoEmail.toLowerCase())) {
      toast({
        title: "Correo duplicado",
        description: "Este correo ya está registrado",
        variant: "destructive",
      });
      return;
    }

    const newCorreo: CorreoForm = {
      id: crypto.randomUUID(),
      email: newCorreoEmail.trim(),
      nombre_contacto: newCorreoNombre.trim(),
      proposito: "general",
      es_principal: correos.length === 0,
      isNew: true,
    };
    setCorreos([...correos, newCorreo]);
    setNewCorreoEmail("");
    setNewCorreoNombre("");
  };

  const handleRemoveCorreo = (correoId: string) => {
    const correoToRemove = correos.find(c => c.id === correoId);
    const remaining = correos.filter(c => c.id !== correoId);
    
    if (correoToRemove?.es_principal && remaining.length > 0) {
      remaining[0].es_principal = true;
    }
    
    setCorreos(remaining);
  };

  const handleSetPrincipal = (correoId: string) => {
    setCorreos(correos.map(c => ({
      ...c,
      es_principal: c.id === correoId,
    })));
  };

  const handleParseCsf = async (file: File) => {
    setParsingCsf(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const { data, error } = await supabase.functions.invoke('parse-csf', {
        body: { pdfBase64: base64 }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const parsedData = data?.data;
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          rfc: parsedData.rfc || prev.rfc,
          razon_social: parsedData.razon_social || prev.razon_social,
          regimen_capital: parsedData.regimen_capital || prev.regimen_capital,
          codigo_postal: parsedData.codigo_postal || prev.codigo_postal,
          tipo_vialidad: parsedData.tipo_vialidad || prev.tipo_vialidad,
          nombre_vialidad: parsedData.nombre_vialidad || prev.nombre_vialidad,
          numero_exterior: parsedData.numero_exterior || prev.numero_exterior,
          numero_interior: parsedData.numero_interior || prev.numero_interior,
          nombre_colonia: parsedData.nombre_colonia || prev.nombre_colonia,
          nombre_localidad: parsedData.nombre_localidad || prev.nombre_localidad,
          nombre_municipio: parsedData.nombre_municipio || prev.nombre_municipio,
          nombre_entidad_federativa: parsedData.nombre_entidad_federativa || prev.nombre_entidad_federativa,
          entre_calle: parsedData.entre_calle || prev.entre_calle,
          y_calle: parsedData.y_calle || prev.y_calle,
          direccion: [
            parsedData.tipo_vialidad,
            parsedData.nombre_vialidad,
            parsedData.numero_exterior,
            parsedData.nombre_colonia,
            parsedData.nombre_municipio,
            parsedData.nombre_entidad_federativa,
            parsedData.codigo_postal
          ].filter(Boolean).join(', ') || prev.direccion,
        }));

        toast({
          title: "CSF analizada correctamente",
          description: "Los datos fiscales se han auto-llenado. Verifica que sean correctos.",
        });
      }
    } catch (error: any) {
      console.error("Error parsing CSF:", error);
      toast({
        title: "Error al analizar CSF",
        description: error.message || "No se pudo extraer la información del PDF",
        variant: "destructive",
      });
    } finally {
      setParsingCsf(false);
    }
  };

  const addSucursal = () => {
    setSucursales([
      ...sucursales,
      {
        id: crypto.randomUUID(),
        nombre: "",
        direccion: "",
        zona_id: "",
        telefono: "",
        contacto: "",
      },
    ]);
  };

  const removeSucursal = (id: string) => {
    setSucursales(sucursales.filter((s) => s.id !== id));
  };

  const updateSucursal = (id: string, field: keyof SucursalForm, value: string) => {
    setSucursales(
      sucursales.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let csfUrl = formData.csf_archivo_url;
      
      if (csfFile) {
        const fileExt = csfFile.name.split('.').pop();
        const fileName = `${formData.rfc || formData.codigo}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('clientes-csf')
          .upload(filePath, csfFile);
        
        if (uploadError) throw uploadError;
        csfUrl = filePath;
      }
      
      const clientData = {
        codigo: formData.codigo,
        nombre: formData.nombre,
        razon_social: formData.razon_social || null,
        rfc: formData.rfc || null,
        direccion: formData.direccion || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        termino_credito: formData.termino_credito,
        limite_credito: parseFloat(formData.limite_credito || "0"),
        zona_id: formData.zona_id || null,
        preferencia_facturacion: formData.preferencia_facturacion,
        regimen_capital: formData.regimen_capital || null,
        codigo_postal: formData.codigo_postal || null,
        tipo_vialidad: formData.tipo_vialidad || null,
        nombre_vialidad: formData.nombre_vialidad || null,
        numero_exterior: formData.numero_exterior || null,
        numero_interior: formData.numero_interior || null,
        nombre_colonia: formData.nombre_colonia || null,
        nombre_localidad: formData.nombre_localidad || null,
        nombre_municipio: formData.nombre_municipio || null,
        nombre_entidad_federativa: formData.nombre_entidad_federativa || null,
        entre_calle: formData.entre_calle || null,
        y_calle: formData.y_calle || null,
        csf_archivo_url: csfUrl || null,
        prioridad_entrega_default: formData.prioridad_entrega_default,
        deadline_dias_habiles_default: formData.deadline_dias_habiles_default ? parseInt(formData.deadline_dias_habiles_default) : null,
        es_grupo: formData.es_grupo,
        vendedor_asignado: formData.vendedor_asignado || null,
      };

      let clienteId: string;

      if (editingClient) {
        const { error } = await supabase
          .from("clientes")
          .update(clientData)
          .eq("id", editingClient.id);

        if (error) throw error;
        clienteId = editingClient.id;

        if (originalCorreoIds.length > 0) {
          const currentExistingIds = correos.filter(c => !c.isNew).map(c => c.id);
          const idsToDeactivate = originalCorreoIds.filter(id => !currentExistingIds.includes(id));
          
          if (idsToDeactivate.length > 0) {
            await supabase
              .from("cliente_correos")
              .update({ activo: false })
              .in("id", idsToDeactivate);
          }
        }

        for (const correo of correos.filter(c => !c.isNew)) {
          await supabase
            .from("cliente_correos")
            .update({
              email: correo.email,
              nombre_contacto: correo.nombre_contacto || null,
              proposito: correo.proposito,
              es_principal: correo.es_principal,
            })
            .eq("id", correo.id);
        }

        const newCorreos = correos.filter(c => c.isNew);
        if (newCorreos.length > 0) {
          await supabase.from("cliente_correos").insert(
            newCorreos.map(c => ({
              cliente_id: clienteId,
              email: c.email,
              nombre_contacto: c.nombre_contacto || null,
              proposito: c.proposito,
              es_principal: c.es_principal,
            }))
          );
        }

        toast({ title: "Cliente actualizado correctamente" });
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert([clientData])
          .select()
          .single();

        if (error) throw error;
        clienteId = data.id;

        if (correos.length > 0) {
          const correosData = correos.map(c => ({
            cliente_id: clienteId,
            email: c.email,
            nombre_contacto: c.nombre_contacto || null,
            proposito: c.proposito,
            es_principal: c.es_principal,
          }));

          const { error: correoError } = await supabase
            .from("cliente_correos")
            .insert(correosData);

          if (correoError) {
            console.error("Error creating correos:", correoError);
          }
        }

        if (!entregarMismaDireccion && sucursales.length > 0) {
          const sucursalesValidas = sucursales.filter(s => s.nombre && s.direccion);
          
          if (sucursalesValidas.length > 0) {
            const sucursalesData = sucursalesValidas.map(s => ({
              cliente_id: clienteId,
              nombre: s.nombre,
              direccion: s.direccion,
              zona_id: s.zona_id || null,
              telefono: s.telefono || null,
              contacto: s.contacto || null,
            }));

            const { error: sucError } = await supabase
              .from("cliente_sucursales")
              .insert(sucursalesData);

            if (sucError) {
              console.error("Error creating sucursales:", sucError);
              toast({
                title: "Cliente creado",
                description: `Pero hubo un error al crear las sucursales`,
                variant: "destructive",
              });
            } else {
              toast({ 
                title: "Cliente creado correctamente",
                description: `Se crearon ${sucursalesValidas.length} sucursal(es) de entrega y ${correos.length} correo(s)`
              });
            }
          } else {
            toast({ title: "Cliente creado correctamente" });
          }
        } else if (entregarMismaDireccion && formData.direccion) {
          const { error: sucError } = await supabase
            .from("cliente_sucursales")
            .insert([{
              cliente_id: clienteId,
              nombre: "Principal",
              direccion: formData.direccion,
              zona_id: formData.zona_id || null,
              telefono: formData.telefono || null,
              contacto: null,
            }]);

          if (sucError) {
            console.error("Error creating default sucursal:", sucError);
          }
          toast({ title: "Cliente creado correctamente" });
        } else {
          toast({ title: "Cliente creado correctamente" });
        }
      }

      setDialogOpen(false);
      resetForm();
      loadClientes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (client: any) => {
    setEditingClient(client);
    setFormData({
      codigo: client.codigo,
      nombre: client.nombre,
      razon_social: client.razon_social || "",
      rfc: client.rfc || "",
      direccion: client.direccion || "",
      telefono: client.telefono || "",
      email: client.email || "",
      termino_credito: client.termino_credito,
      limite_credito: client.limite_credito.toString(),
      zona_id: client.zona_id || "",
      preferencia_facturacion: client.preferencia_facturacion || "variable",
      regimen_capital: client.regimen_capital || "",
      codigo_postal: client.codigo_postal || "",
      tipo_vialidad: client.tipo_vialidad || "",
      nombre_vialidad: client.nombre_vialidad || "",
      numero_exterior: client.numero_exterior || "",
      numero_interior: client.numero_interior || "",
      nombre_colonia: client.nombre_colonia || "",
      nombre_localidad: client.nombre_localidad || "",
      nombre_municipio: client.nombre_municipio || "",
      nombre_entidad_federativa: client.nombre_entidad_federativa || "",
      entre_calle: client.entre_calle || "",
      y_calle: client.y_calle || "",
      csf_archivo_url: client.csf_archivo_url || "",
      prioridad_entrega_default: client.prioridad_entrega_default || "flexible",
      deadline_dias_habiles_default: client.deadline_dias_habiles_default?.toString() || "",
      es_grupo: client.es_grupo || false,
      vendedor_asignado: client.vendedor_asignado || "",
    });
    setEntregarMismaDireccion(true);
    setSucursales([]);
    setCsfFile(null);
    await loadCorreosCliente(client.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.message.includes("violates foreign key constraint")) {
          if (error.message.includes("cotizaciones")) {
            throw new Error("No se puede eliminar el cliente porque tiene cotizaciones asociadas.");
          } else if (error.message.includes("pedidos")) {
            throw new Error("No se puede eliminar el cliente porque tiene pedidos asociados.");
          } else if (error.message.includes("facturas")) {
            throw new Error("No se puede eliminar el cliente porque tiene facturas asociadas.");
          } else if (error.message.includes("cliente_sucursales")) {
            throw new Error("No se puede eliminar el cliente porque tiene sucursales asociadas.");
          } else {
            throw new Error("No se puede eliminar el cliente porque tiene registros asociados.");
          }
        }
        throw error;
      }
      toast({ title: "Cliente eliminado" });
      loadClientes();
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      codigo: "",
      nombre: "",
      razon_social: "",
      rfc: "",
      direccion: "",
      telefono: "",
      email: "",
      termino_credito: "contado",
      limite_credito: "",
      zona_id: "",
      preferencia_facturacion: "variable",
      regimen_capital: "",
      codigo_postal: "",
      tipo_vialidad: "",
      nombre_vialidad: "",
      numero_exterior: "",
      numero_interior: "",
      nombre_colonia: "",
      nombre_localidad: "",
      nombre_municipio: "",
      nombre_entidad_federativa: "",
      entre_calle: "",
      y_calle: "",
      csf_archivo_url: "",
      prioridad_entrega_default: "flexible",
      deadline_dias_habiles_default: "",
      es_grupo: false,
      vendedor_asignado: activeVendedorTab === "casa" ? "" : VENDEDORES.find(v => v.nombre_corto.toLowerCase() === activeVendedorTab)?.user_id || "",
    });
    setEntregarMismaDireccion(true);
    setSucursales([]);
    setCorreos([]);
    setOriginalCorreoIds([]);
    setNewCorreoEmail("");
    setNewCorreoNombre("");
    setCsfFile(null);
  };

  // Filter by search term
  const searchFiltered = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter by vendedor tab
  const getFilteredClientes = () => {
    if (activeVendedorTab === "casa") {
      return searchFiltered.filter(c => !c.vendedor_asignado);
    }
    const vendedor = VENDEDORES.find(v => v.nombre_corto.toLowerCase() === activeVendedorTab);
    if (vendedor) {
      return searchFiltered.filter(c => c.vendedor_asignado === vendedor.user_id);
    }
    return searchFiltered;
  };

  const filteredClientes = getFilteredClientes();

  // Count clients per tab
  const getClientCount = (tab: string) => {
    if (tab === "casa") {
      return clientes.filter(c => !c.vendedor_asignado).length;
    }
    const vendedor = VENDEDORES.find(v => v.nombre_corto.toLowerCase() === tab);
    if (vendedor) {
      return clientes.filter(c => c.vendedor_asignado === vendedor.user_id).length;
    }
    return 0;
  };

  const getCreditLabel = (term: string) => {
    const labels: Record<string, string> = {
      contado: "Contado",
      "8_dias": "8 días",
      "15_dias": "15 días",
      "30_dias": "30 días",
    };
    return labels[term] || term;
  };

  const getVendedorName = (vendedor_asignado: string | null) => {
    if (!vendedor_asignado) return null;
    const vendedor = VENDEDORES.find(v => v.user_id === vendedor_asignado);
    return vendedor?.nombre_corto || null;
  };

  const renderClienteTable = () => {
    // Vista móvil: cards
    if (isMobile) {
      return (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No se encontraron clientes</div>
          ) : (
            filteredClientes.map((cliente) => (
              <ClienteCardMobile
                key={cliente.id}
                cliente={cliente}
                onEdit={handleEdit}
                onViewSucursales={(c) => {
                  setSelectedClienteForSucursales(c);
                  setSucursalesDialogOpen(true);
                }}
                onViewHistorial={(c) => {
                  setSelectedClienteForHistorial(c);
                  setHistorialDialogOpen(true);
                }}
                onViewProductos={(c) => {
                  setSelectedClienteForProductos(c);
                  setProductosDialogOpen(true);
                }}
                onDelete={handleDelete}
                getVendedorNombre={getVendedorName}
                getCreditLabel={getCreditLabel}
              />
            ))
          )}
        </div>
      );
    }
    
    // Vista desktop: tabla
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Crédito</TableHead>
              <TableHead>Límite</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                Cargando...
              </TableCell>
            </TableRow>
          ) : filteredClientes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No se encontraron clientes
              </TableCell>
            </TableRow>
          ) : (
            filteredClientes.map((cliente) => (
              <TableRow key={cliente.id} className={cliente.grupo_cliente_id ? "bg-muted/30" : ""}>
                <TableCell className="font-mono">{cliente.codigo}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {cliente.es_grupo && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/10">
                        <Building2 className="h-3 w-3" />
                        Grupo
                      </Badge>
                    )}
                    {cliente.grupo_padre && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cliente.grupo_padre.nombre}
                      </Badge>
                    )}
                    <span>{cliente.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>{cliente.rfc || "-"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getCreditLabel(cliente.termino_credito)}
                  </Badge>
                </TableCell>
                <TableCell>${(cliente.limite_credito || 0).toLocaleString()}</TableCell>
                <TableCell className={cliente.saldo_pendiente > 0 ? "text-destructive" : ""}>
                  ${(cliente.saldo_pendiente || 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={cliente.activo ? "default" : "destructive"}>
                    {cliente.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedClienteForHistorial({ id: cliente.id, nombre: cliente.nombre });
                        setHistorialDialogOpen(true);
                      }}
                      title="Ver historial de precios"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedClienteForSucursales({ id: cliente.id, nombre: cliente.nombre });
                        setSucursalesDialogOpen(true);
                      }}
                      title={`Ver sucursales (${cliente.cliente_sucursales?.[0]?.count || 0})`}
                      className="relative"
                    >
                      <MapPin className="h-4 w-4" />
                      {cliente.cliente_sucursales?.[0]?.count > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                        >
                          {cliente.cliente_sucursales[0].count}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedClienteForProductos({ id: cliente.id, nombre: cliente.nombre });
                        setProductosDialogOpen(true);
                      }}
                      title={`Productos frecuentes (${cliente.cliente_productos_frecuentes?.[0]?.count || 0})`}
                      className="relative"
                    >
                      <Package className="h-4 w-4" />
                      {cliente.cliente_productos_frecuentes?.[0]?.count > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                        >
                          {cliente.cliente_productos_frecuentes[0].count}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cliente)}
                      title="Editar cliente"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cliente.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
    );
  };

  // Renderizar el contenido del Dialog compartido entre móvil y desktop
  const renderDialogContent = () => (
    <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
      <DialogHeader>
        <DialogTitle>
          {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
        </DialogTitle>
        <DialogDescription>
          {editingClient 
            ? "Modifica la información del cliente" 
            : "Completa la información del cliente y sus sucursales de entrega"}
        </DialogDescription>
      </DialogHeader>
      
      {/* Vendedor assignment section */}
      <div className="border rounded-lg p-4 mb-4 bg-muted/30">
        <Label className="text-sm font-medium mb-2 block">Vendedor asignado</Label>
        <Select
          value={formData.vendedor_asignado || "__none__"}
          onValueChange={(value) => setFormData({ ...formData, vendedor_asignado: value === "__none__" ? null : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Casa (sin vendedor)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Casa (sin comisión)
              </div>
            </SelectItem>
            {VENDEDORES.map((v) => (
              <SelectItem key={v.user_id} value={v.user_id}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {v.nombre}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.vendedor_asignado && formData.vendedor_asignado !== "__none__" && (
          <p className="text-xs text-muted-foreground mt-1">
            Este cliente genera comisión del 1% para el vendedor
          </p>
        )}
      </div>
      
      {editingClient ? (
        <Tabs defaultValue="datos" className="w-full">
          {isMobile ? (
            <div className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-max gap-1">
                <TabsTrigger value="datos" className="px-2 text-xs">Datos</TabsTrigger>
                <TabsTrigger value="productos" className="px-2 text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  Prod.
                </TabsTrigger>
                <TabsTrigger value="cortesias" className="px-2 text-xs">
                  <Gift className="h-3 w-3 text-amber-500" />
                </TabsTrigger>
                <TabsTrigger value="creditos" className="px-2 text-xs">Plazos</TabsTrigger>
                <TabsTrigger value="programacion" className="px-2 text-xs">Días</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="usuario" className="px-2 text-xs">
                    Portal
                    {editingClient.user_id && (
                      <Badge variant="default" className="ml-1 h-4 text-[10px] bg-green-500">✓</Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          ) : (
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="productos" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                Productos
              </TabsTrigger>
              <TabsTrigger value="cortesias" className="flex items-center gap-1">
                <Gift className="h-4 w-4 text-amber-500" />
                Cortesías
              </TabsTrigger>
              <TabsTrigger value="creditos" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Plazos
              </TabsTrigger>
              <TabsTrigger value="programacion" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                Días
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="usuario" className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Portal
                  {editingClient.user_id && (
                    <Badge variant="default" className="ml-1 h-5 bg-green-500">✓</Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          )}
          <TabsContent value="productos" className="mt-4">
            <ClienteProductosTab clienteId={editingClient.id} />
          </TabsContent>
          <TabsContent value="cortesias" className="mt-4">
            <ClienteCortesiasTab 
              clienteId={editingClient.id}
              clienteNombre={editingClient.nombre}
            />
          </TabsContent>
          <TabsContent value="creditos" className="mt-4">
            <ClienteCreditosExcepcionesTab 
              clienteId={editingClient.id}
              clienteNombre={editingClient.nombre}
              terminoDefault={editingClient.termino_credito}
            />
          </TabsContent>
          <TabsContent value="programacion" className="mt-4">
            <ClienteProgramacionTab 
              clienteId={editingClient.id}
              clienteNombre={editingClient.nombre}
            />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="usuario" className="mt-4">
              <ClienteUsuarioTab 
                cliente={{
                  id: editingClient.id,
                  nombre: editingClient.nombre,
                  email: editingClient.email,
                  user_id: editingClient.user_id,
                }}
                onUserCreated={() => {
                  loadClientes();
                  supabase
                    .from("clientes")
                    .select("*")
                    .eq("id", editingClient.id)
                    .single()
                    .then(({ data }) => {
                      if (data) setEditingClient(data);
                    });
                }}
              />
            </TabsContent>
          )}
          <TabsContent value="datos" className="mt-4">
            <ClienteFormContent 
              formData={formData}
              setFormData={setFormData}
              zonas={zonas}
              handleSave={handleSave}
              editingClient={editingClient}
              setDialogOpen={setDialogOpen}
              csfFile={csfFile}
              setCsfFile={setCsfFile}
              parsingCsf={parsingCsf}
              handleParseCsf={handleParseCsf}
              entregarMismaDireccion={entregarMismaDireccion}
              setEntregarMismaDireccion={setEntregarMismaDireccion}
              sucursales={sucursales}
              setSucursales={setSucursales}
              addSucursal={addSucursal}
              removeSucursal={removeSucursal}
              updateSucursal={updateSucursal}
              correos={correos}
              setCorreos={setCorreos}
              newCorreoEmail={newCorreoEmail}
              setNewCorreoEmail={setNewCorreoEmail}
              newCorreoNombre={newCorreoNombre}
              setNewCorreoNombre={setNewCorreoNombre}
              handleAddCorreo={handleAddCorreo}
              handleRemoveCorreo={handleRemoveCorreo}
              handleSetPrincipal={handleSetPrincipal}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ClienteFormContent 
          formData={formData}
          setFormData={setFormData}
          zonas={zonas}
          handleSave={handleSave}
          editingClient={editingClient}
          setDialogOpen={setDialogOpen}
          csfFile={csfFile}
          setCsfFile={setCsfFile}
          parsingCsf={parsingCsf}
          handleParseCsf={handleParseCsf}
          entregarMismaDireccion={entregarMismaDireccion}
          setEntregarMismaDireccion={setEntregarMismaDireccion}
          sucursales={sucursales}
          setSucursales={setSucursales}
          addSucursal={addSucursal}
          removeSucursal={removeSucursal}
          updateSucursal={updateSucursal}
          correos={correos}
          setCorreos={setCorreos}
          newCorreoEmail={newCorreoEmail}
          setNewCorreoEmail={setNewCorreoEmail}
          newCorreoNombre={newCorreoNombre}
          setNewCorreoNombre={setNewCorreoNombre}
          handleAddCorreo={handleAddCorreo}
          handleRemoveCorreo={handleRemoveCorreo}
          handleSetPrincipal={handleSetPrincipal}
        />
      )}
    </DialogContent>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header - responsive para móvil */}
        {isMobile ? (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">Clientes</h1>
                <p className="text-xs text-muted-foreground">Gestión de clientes</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo
                  </Button>
                </DialogTrigger>
                {renderDialogContent()}
              </Dialog>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetectarGruposDialogOpen(true)}
              >
                <Search className="h-4 w-4 mr-1" />
                Detectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuditoriaSheetOpen(true)}
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Auditoría
                {sucursalesConRfcCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {sucursalesConRfcCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Clientes</h1>
              <p className="text-muted-foreground">Gestión de clientes y créditos</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDetectarGruposDialogOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Detectar Grupos
              </Button>
              <Button
                variant="outline"
                onClick={() => setAgruparDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Agrupar
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar ASPEL
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportSucursalesDialogOpen(true)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Importar Sucursales
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuditoriaSheetOpen(true)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Auditoría Fiscal
                {sucursalesConRfcCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {sucursalesConRfcCount}
                  </Badge>
                )}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                  </Button>
                </DialogTrigger>
                {renderDialogContent()}
              </Dialog>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Vendedor Tabs */}
        <Tabs value={activeVendedorTab} onValueChange={setActiveVendedorTab} className="w-full">
          {isMobile ? (
            <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-max gap-1">
                <TabsTrigger value="casa" className="flex items-center gap-1.5 px-3">
                  <Home className="h-3.5 w-3.5" />
                  Casa
                  <Badge variant="secondary" className="text-xs px-1.5">{getClientCount("casa")}</Badge>
                </TabsTrigger>
                <TabsTrigger value="carlos" className="flex items-center gap-1.5 px-3">
                  Carlos
                  <Badge variant="secondary" className="text-xs px-1.5">{getClientCount("carlos")}</Badge>
                </TabsTrigger>
                <TabsTrigger value="venancio" className="flex items-center gap-1.5 px-3">
                  Venancio
                  <Badge variant="secondary" className="text-xs px-1.5">{getClientCount("venancio")}</Badge>
                </TabsTrigger>
                <TabsTrigger value="salvador" className="flex items-center gap-1.5 px-3">
                  Salvador
                  <Badge variant="secondary" className="text-xs px-1.5">{getClientCount("salvador")}</Badge>
                </TabsTrigger>
                <TabsTrigger value="martin" className="flex items-center gap-1.5 px-3">
                  Martin
                  <Badge variant="secondary" className="text-xs px-1.5">{getClientCount("martin")}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="casa" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Casa
                <Badge variant="secondary" className="ml-1">{getClientCount("casa")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="carlos" className="flex items-center gap-2">
                Carlos
                <Badge variant="secondary" className="ml-1">{getClientCount("carlos")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="venancio" className="flex items-center gap-2">
                Venancio
                <Badge variant="secondary" className="ml-1">{getClientCount("venancio")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="salvador" className="flex items-center gap-2">
                Salvador
                <Badge variant="secondary" className="ml-1">{getClientCount("salvador")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="martin" className="flex items-center gap-2">
                Martin
                <Badge variant="secondary" className="ml-1">{getClientCount("martin")}</Badge>
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="casa" className="mt-4">
            {renderClienteTable()}
          </TabsContent>
          <TabsContent value="carlos" className="mt-4">
            {renderClienteTable()}
          </TabsContent>
          <TabsContent value="venancio" className="mt-4">
            {renderClienteTable()}
          </TabsContent>
          <TabsContent value="salvador" className="mt-4">
            {renderClienteTable()}
          </TabsContent>
          <TabsContent value="martin" className="mt-4">
            {renderClienteTable()}
          </TabsContent>
        </Tabs>
      </div>

      <ClienteSucursalesDialog
        open={sucursalesDialogOpen}
        onOpenChange={setSucursalesDialogOpen}
        cliente={selectedClienteForSucursales}
      />

      <HistorialDialog open={historialDialogOpen} onOpenChange={setHistorialDialogOpen}>
        <HistorialDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <HistorialDialogHeader>
            <HistorialDialogTitle>
              Historial de {selectedClienteForHistorial?.nombre}
            </HistorialDialogTitle>
          </HistorialDialogHeader>
          {selectedClienteForHistorial && (
            <ClienteHistorialAnalytics
              clienteId={selectedClienteForHistorial.id}
              clienteNombre={selectedClienteForHistorial.nombre}
            />
          )}
        </HistorialDialogContent>
      </HistorialDialog>

      <ClienteProductosDialog
        open={productosDialogOpen}
        onOpenChange={setProductosDialogOpen}
        cliente={selectedClienteForProductos}
      />

      <AuditoriaFiscalSheet
        open={auditoriaSheetOpen}
        onOpenChange={(open) => {
          setAuditoriaSheetOpen(open);
          if (!open) loadSucursalesConRfcCount();
        }}
      />

      <ImportarCatalogoAspelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadClientes}
      />

      <AgruparClientesDialog
        open={agruparDialogOpen}
        onOpenChange={setAgruparDialogOpen}
        clientes={clientes.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          rfc: c.rfc,
          direccion: c.direccion,
          telefono: c.telefono,
          grupo_cliente_id: c.grupo_cliente_id,
          es_grupo: c.es_grupo || false,
        }))}
        onSuccess={loadClientes}
      />

      <DetectarGruposDialog
        open={detectarGruposDialogOpen}
        onOpenChange={setDetectarGruposDialogOpen}
        onSuccess={loadClientes}
      />

      <ImportarSucursalesExcelDialog
        open={importSucursalesDialogOpen}
        onOpenChange={setImportSucursalesDialogOpen}
        clientes={clientes.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          rfc: c.rfc,
          razon_social: c.razon_social,
          direccion: c.direccion,
          es_grupo: c.es_grupo || false,
          activo: c.activo,
        }))}
        onSuccess={loadClientes}
      />
    </Layout>
  );
};

export default Clientes;
