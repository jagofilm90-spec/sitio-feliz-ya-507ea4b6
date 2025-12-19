import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Globe, Package, Trash2, X, Mail, FileText, Upload, Loader2, CheckCircle2, Star, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProveedorProductosSelector from "./ProveedorProductosSelector";

type PuestoContacto = 'general' | 'ventas' | 'cobranza' | 'logistica' | 'devoluciones';

interface ContactoProveedor {
  id?: string;
  nombre: string;
  telefono: string;
  puesto?: PuestoContacto;
  es_principal: boolean;
}

const PUESTOS: { value: PuestoContacto; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'cobranza', label: 'Cobranza' },
  { value: 'logistica', label: 'Logística' },
  { value: 'devoluciones', label: 'Devoluciones' },
];

const getPuestoLabel = (puesto?: PuestoContacto): string => {
  if (!puesto) return 'General';
  return PUESTOS.find(p => p.value === puesto)?.label || puesto;
};

const getPuestoVariant = (puesto?: PuestoContacto): "default" | "secondary" | "outline" | "destructive" => {
  switch (puesto) {
    case 'ventas': return 'default';
    case 'cobranza': return 'secondary';
    case 'devoluciones': return 'destructive';
    case 'logistica': return 'outline';
    default: return 'outline';
  }
};
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

type PropositoCorreo = 'general' | 'ordenes' | 'pagos' | 'devoluciones';

interface CorreoProveedor {
  id?: string;
  email: string;
  nombre_contacto?: string;
  proposito: PropositoCorreo;
  es_principal: boolean;
}

const PROPOSITOS: { value: PropositoCorreo; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'ordenes', label: 'Órdenes de compra' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'devoluciones', label: 'Devoluciones' },
];

const getPropositoLabel = (proposito: PropositoCorreo): string => {
  return PROPOSITOS.find(p => p.value === proposito)?.label || proposito;
};

const getPropositoVariant = (proposito: PropositoCorreo): "default" | "secondary" | "outline" | "destructive" => {
  switch (proposito) {
    case 'ordenes': return 'default';
    case 'pagos': return 'secondary';
    case 'devoluciones': return 'destructive';
    default: return 'outline';
  }
};

interface Proveedor {
  id: string;
  nombre: string;
  nombre_contacto: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  pais: string;
  rfc: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

const ProveedoresTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProductosDialogOpen, setIsProductosDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [productosProveedor, setProductosProveedor] = useState<Proveedor | null>(null);
  const [deletingProveedor, setDeletingProveedor] = useState<Proveedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // CSF upload state
  const [isParsingCSF, setIsParsingCSF] = useState(false);
  const [csfParsed, setCSFParsed] = useState(false);
  const csfInputRef = useRef<HTMLInputElement>(null);
  
  // Correos con propósitos - para crear
  const [correosNuevos, setCorreosNuevos] = useState<CorreoProveedor[]>([]);
  const [nuevoCorreoEmail, setNuevoCorreoEmail] = useState("");
  const [nuevoCorreoContacto, setNuevoCorreoContacto] = useState("");
  const [nuevoCorreoProposito, setNuevoCorreoProposito] = useState<PropositoCorreo>("general");
  
  // Correos con propósitos - para editar
  const [correosEdit, setCorreosEdit] = useState<CorreoProveedor[]>([]);
  const [editCorreoEmail, setEditCorreoEmail] = useState("");
  const [editCorreoContacto, setEditCorreoContacto] = useState("");
  const [editCorreoProposito, setEditCorreoProposito] = useState<PropositoCorreo>("general");
  const [isLoadingCorreos, setIsLoadingCorreos] = useState(false);
  
  // Contactos con nombre y teléfono - para crear
  const [contactosNuevos, setContactosNuevos] = useState<ContactoProveedor[]>([]);
  const [nuevoContactoNombre, setNuevoContactoNombre] = useState("");
  const [nuevoContactoTelefono, setNuevoContactoTelefono] = useState("");
  const [nuevoContactoPuesto, setNuevoContactoPuesto] = useState<PuestoContacto>("general");
  
  // Contactos con nombre y teléfono - para editar
  const [contactosEdit, setContactosEdit] = useState<ContactoProveedor[]>([]);
  const [editContactoNombre, setEditContactoNombre] = useState("");
  const [editContactoTelefono, setEditContactoTelefono] = useState("");
  const [editContactoPuesto, setEditContactoPuesto] = useState<PuestoContacto>("general");
  const [isLoadingContactos, setIsLoadingContactos] = useState(false);
  
  const [newProveedor, setNewProveedor] = useState({
    nombre: "",
    direccion: "",
    pais: "México",
    rfc: "",
    notas: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to join emails for DB storage (for backwards compatibility)
  const joinEmails = (correos: CorreoProveedor[]): string => {
    return correos.map(c => c.email).join(", ");
  };

  // Agregar correo nuevo (formulario crear)
  const handleAddCorreoNuevo = () => {
    if (!nuevoCorreoEmail || !nuevoCorreoEmail.includes("@")) return;
    if (correosNuevos.some(c => c.email === nuevoCorreoEmail.trim())) return;
    
    // Determinar si debe ser principal para su propósito
    const existePrincipalEnProposito = correosNuevos.some(
      c => c.proposito === nuevoCorreoProposito && c.es_principal
    );
    
    setCorreosNuevos([...correosNuevos, {
      email: nuevoCorreoEmail.trim(),
      nombre_contacto: nuevoCorreoContacto.trim() || undefined,
      proposito: nuevoCorreoProposito,
      es_principal: !existePrincipalEnProposito,
    }]);
    setNuevoCorreoEmail("");
    setNuevoCorreoContacto("");
  };

  const handleRemoveCorreoNuevo = (email: string) => {
    setCorreosNuevos(correosNuevos.filter(c => c.email !== email));
  };

  const handleSetPrincipalNuevo = (email: string, proposito: PropositoCorreo) => {
    setCorreosNuevos(correosNuevos.map(c => ({
      ...c,
      es_principal: c.proposito === proposito ? c.email === email : c.es_principal
    })));
  };

  // Agregar correo (formulario editar)
  const handleAddCorreoEdit = () => {
    if (!editCorreoEmail || !editCorreoEmail.includes("@")) return;
    if (correosEdit.some(c => c.email === editCorreoEmail.trim())) return;
    
    const existePrincipalEnProposito = correosEdit.some(
      c => c.proposito === editCorreoProposito && c.es_principal
    );
    
    setCorreosEdit([...correosEdit, {
      email: editCorreoEmail.trim(),
      nombre_contacto: editCorreoContacto.trim() || undefined,
      proposito: editCorreoProposito,
      es_principal: !existePrincipalEnProposito,
    }]);
    setEditCorreoEmail("");
    setEditCorreoContacto("");
  };

  const handleRemoveCorreoEdit = (email: string) => {
    setCorreosEdit(correosEdit.filter(c => c.email !== email));
  };

  const handleSetPrincipalEdit = (email: string, proposito: PropositoCorreo) => {
    setCorreosEdit(correosEdit.map(c => ({
      ...c,
      es_principal: c.proposito === proposito ? c.email === email : c.es_principal
    })));
  };

  // === CONTACTOS HELPERS ===
  
  // Agregar contacto nuevo (formulario crear)
  const handleAddContactoNuevo = () => {
    if (!nuevoContactoNombre.trim() || !nuevoContactoTelefono.trim()) return;
    
    const esPrincipal = contactosNuevos.length === 0;
    
    setContactosNuevos([...contactosNuevos, {
      nombre: nuevoContactoNombre.trim(),
      telefono: nuevoContactoTelefono.trim(),
      puesto: nuevoContactoPuesto,
      es_principal: esPrincipal,
    }]);
    setNuevoContactoNombre("");
    setNuevoContactoTelefono("");
  };

  const handleRemoveContactoNuevo = (index: number) => {
    const updated = contactosNuevos.filter((_, i) => i !== index);
    // Si eliminamos el principal, hacer principal al primero
    if (contactosNuevos[index]?.es_principal && updated.length > 0) {
      updated[0].es_principal = true;
    }
    setContactosNuevos(updated);
  };

  const handleSetPrincipalContactoNuevo = (index: number) => {
    setContactosNuevos(contactosNuevos.map((c, i) => ({
      ...c,
      es_principal: i === index
    })));
  };

  // Agregar contacto (formulario editar)
  const handleAddContactoEdit = () => {
    if (!editContactoNombre.trim() || !editContactoTelefono.trim()) return;
    
    const esPrincipal = contactosEdit.length === 0;
    
    setContactosEdit([...contactosEdit, {
      nombre: editContactoNombre.trim(),
      telefono: editContactoTelefono.trim(),
      puesto: editContactoPuesto,
      es_principal: esPrincipal,
    }]);
    setEditContactoNombre("");
    setEditContactoTelefono("");
  };

  const handleRemoveContactoEdit = (index: number) => {
    const updated = contactosEdit.filter((_, i) => i !== index);
    if (contactosEdit[index]?.es_principal && updated.length > 0) {
      updated[0].es_principal = true;
    }
    setContactosEdit(updated);
  };

  const handleSetPrincipalContactoEdit = (index: number) => {
    setContactosEdit(contactosEdit.map((c, i) => ({
      ...c,
      es_principal: i === index
    })));
  };

  // Cargar contactos existentes cuando se abre el diálogo de editar
  const loadContactosProveedor = async (proveedorId: string) => {
    setIsLoadingContactos(true);
    try {
      const { data, error } = await supabase
        .from("proveedor_contactos")
        .select("*")
        .eq("proveedor_id", proveedorId)
        .eq("activo", true)
        .order("es_principal", { ascending: false });
      
      if (error) throw error;
      
      setContactosEdit((data || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        puesto: (c.puesto || 'general') as PuestoContacto,
        es_principal: c.es_principal || false,
      })));
    } catch (error) {
      console.error("Error loading contactos:", error);
      setContactosEdit([]);
    } finally {
      setIsLoadingContactos(false);
    }
  };

  // Guardar contactos en la tabla proveedor_contactos
  const saveContactosProveedor = async (proveedorId: string, contactos: ContactoProveedor[]) => {
    // Primero marcar todos los contactos existentes como inactivos
    await supabase
      .from("proveedor_contactos")
      .update({ activo: false })
      .eq("proveedor_id", proveedorId);
    
    // Insertar/actualizar los nuevos contactos
    for (const contacto of contactos) {
      if (contacto.id) {
        await supabase
          .from("proveedor_contactos")
          .update({
            nombre: contacto.nombre,
            telefono: contacto.telefono,
            puesto: contacto.puesto || 'general',
            es_principal: contacto.es_principal,
            activo: true,
          })
          .eq("id", contacto.id);
      } else {
        await supabase
          .from("proveedor_contactos")
          .insert({
            proveedor_id: proveedorId,
            nombre: contacto.nombre,
            telefono: contacto.telefono,
            puesto: contacto.puesto || 'general',
            es_principal: contacto.es_principal,
            activo: true,
          });
      }
    }
  };

  // Helper para obtener contacto principal (para backwards compatibility)
  const getContactoPrincipal = (contactos: ContactoProveedor[]): { nombre: string | null; telefono: string | null } => {
    const principal = contactos.find(c => c.es_principal) || contactos[0];
    return {
      nombre: principal?.nombre || null,
      telefono: principal?.telefono || null,
    };
  };

  // Cargar correos existentes cuando se abre el diálogo de editar
  const loadCorreosProveedor = async (proveedorId: string) => {
    setIsLoadingCorreos(true);
    try {
      const { data, error } = await supabase
        .from("proveedor_correos")
        .select("*")
        .eq("proveedor_id", proveedorId)
        .eq("activo", true)
        .order("proposito")
        .order("es_principal", { ascending: false });
      
      if (error) throw error;
      
      setCorreosEdit((data || []).map(c => ({
        id: c.id,
        email: c.email,
        nombre_contacto: c.nombre_contacto || undefined,
        proposito: (c.proposito || 'general') as PropositoCorreo,
        es_principal: c.es_principal || false,
      })));
    } catch (error) {
      console.error("Error loading correos:", error);
      setCorreosEdit([]);
    } finally {
      setIsLoadingCorreos(false);
    }
  };

  // Guardar correos en la tabla proveedor_correos
  const saveCorreosProveedor = async (proveedorId: string, correos: CorreoProveedor[]) => {
    // Primero marcar todos los correos existentes como inactivos
    await supabase
      .from("proveedor_correos")
      .update({ activo: false })
      .eq("proveedor_id", proveedorId);
    
    // Insertar/actualizar los nuevos correos
    for (const correo of correos) {
      if (correo.id) {
        // Actualizar existente
        await supabase
          .from("proveedor_correos")
          .update({
            email: correo.email,
            nombre_contacto: correo.nombre_contacto || null,
            proposito: correo.proposito,
            es_principal: correo.es_principal,
            activo: true,
          })
          .eq("id", correo.id);
      } else {
        // Insertar nuevo
        await supabase
          .from("proveedor_correos")
          .insert({
            proveedor_id: proveedorId,
            email: correo.email,
            nombre_contacto: correo.nombre_contacto || null,
            proposito: correo.proposito,
            es_principal: correo.es_principal,
            activo: true,
          });
      }
    }
  };

  // Helper function to build complete address from CSF data
  const buildDireccionFromCSF = (data: any): string => {
    const parts = [];
    
    if (data.tipo_vialidad && data.nombre_vialidad) {
      parts.push(`${data.tipo_vialidad} ${data.nombre_vialidad}`);
    } else if (data.nombre_vialidad) {
      parts.push(data.nombre_vialidad);
    }
    
    if (data.numero_exterior) {
      parts.push(`#${data.numero_exterior}`);
    }
    
    if (data.numero_interior) {
      parts.push(`Int. ${data.numero_interior}`);
    }
    
    if (data.nombre_colonia) {
      parts.push(`Col. ${data.nombre_colonia}`);
    }
    
    const localidadParts = [];
    if (data.nombre_localidad) localidadParts.push(data.nombre_localidad);
    if (data.nombre_municipio && data.nombre_municipio !== data.nombre_localidad) {
      localidadParts.push(data.nombre_municipio);
    }
    if (localidadParts.length > 0) {
      parts.push(localidadParts.join(", "));
    }
    
    if (data.nombre_entidad_federativa) {
      parts.push(data.nombre_entidad_federativa);
    }
    
    if (data.codigo_postal) {
      parts.push(`C.P. ${data.codigo_postal}`);
    }
    
    return parts.join(", ");
  };

  // Handle CSF PDF upload and parsing
  const handleCSFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Por favor selecciona un archivo PDF",
      });
      return;
    }
    
    setIsParsingCSF(true);
    setCSFParsed(false);
    
    try {
      // Convert PDF to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Call parse-csf edge function
      const { data, error } = await supabase.functions.invoke('parse-csf', {
        body: { pdfBase64: base64 }
      });
      
      if (error) throw error;
      
      if (data?.data) {
        const csfData = data.data;
        
        // Build full name with regime
        let nombreCompleto = csfData.razon_social || '';
        if (csfData.regimen_capital) {
          nombreCompleto += ` ${csfData.regimen_capital}`;
        }
        
        // Build full address
        const direccionCompleta = buildDireccionFromCSF(csfData);
        
        // Auto-fill form fields
        setNewProveedor(prev => ({
          ...prev,
          nombre: nombreCompleto.trim(),
          rfc: csfData.rfc || prev.rfc,
          direccion: direccionCompleta || prev.direccion,
          pais: "México",
        }));
        
        setCSFParsed(true);
        
        toast({
          title: "CSF procesada exitosamente",
          description: `Se auto-llenaron los datos de: ${csfData.razon_social || 'proveedor'}`,
        });
      } else {
        throw new Error("No se pudieron extraer datos de la CSF");
      }
    } catch (error) {
      console.error("Error parsing CSF:", error);
      toast({
        variant: "destructive",
        title: "Error al procesar CSF",
        description: error instanceof Error ? error.message : "No se pudo analizar el documento",
      });
    } finally {
      setIsParsingCSF(false);
      // Reset file input
      if (csfInputRef.current) {
        csfInputRef.current.value = '';
      }
    }
  };

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre");
      
      if (error) throw error;
      return data as Proveedor[];
    },
  });

  const createProveedor = useMutation({
    mutationFn: async (proveedor: typeof newProveedor & { email: string; nombre_contacto: string | null; telefono: string | null }) => {
      const { data, error } = await supabase
        .from("proveedores")
        .insert([proveedor])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Guardar correos en proveedor_correos
      if (correosNuevos.length > 0) {
        await saveCorreosProveedor(data.id, correosNuevos);
      }
      // Guardar contactos en proveedor_contactos
      if (contactosNuevos.length > 0) {
        await saveContactosProveedor(data.id, contactosNuevos);
      }
      
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-correos"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-contactos"] });
      setIsDialogOpen(false);
      setNewProveedor({
        nombre: "",
        direccion: "",
        pais: "México",
        rfc: "",
        notas: "",
      });
      setCorreosNuevos([]);
      setNuevoCorreoEmail("");
      setNuevoCorreoContacto("");
      setContactosNuevos([]);
      setNuevoContactoNombre("");
      setNuevoContactoTelefono("");
      setCSFParsed(false);
      toast({
        title: "Proveedor creado",
        description: "El proveedor ha sido registrado exitosamente",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el proveedor",
      });
    },
  });

  const updateProveedor = useMutation({
    mutationFn: async (proveedor: Proveedor) => {
      const contactoPrincipal = getContactoPrincipal(contactosEdit);
      const { error } = await supabase
        .from("proveedores")
        .update({
          nombre: proveedor.nombre,
          nombre_contacto: contactoPrincipal.nombre,
          email: proveedor.email,
          telefono: contactoPrincipal.telefono,
          direccion: proveedor.direccion,
          pais: proveedor.pais,
          rfc: proveedor.rfc,
          notas: proveedor.notas,
          activo: proveedor.activo,
        })
        .eq("id", proveedor.id);
      
      if (error) throw error;
      return proveedor.id;
    },
    onSuccess: async (proveedorId) => {
      // Guardar correos en proveedor_correos
      await saveCorreosProveedor(proveedorId, correosEdit);
      // Guardar contactos en proveedor_contactos
      await saveContactosProveedor(proveedorId, contactosEdit);
      
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-correos"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-contactos"] });
      setIsEditDialogOpen(false);
      setEditingProveedor(null);
      setCorreosEdit([]);
      setContactosEdit([]);
      toast({
        title: "Proveedor actualizado",
        description: "Los cambios han sido guardados",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el proveedor",
      });
    },
  });

  const deleteProveedor = useMutation({
    mutationFn: async (proveedorId: string) => {
      // Primero eliminar relaciones con productos
      await supabase
        .from("proveedor_productos")
        .delete()
        .eq("proveedor_id", proveedorId);
      
      // Luego eliminar el proveedor
      const { error } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", proveedorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      setIsDeleteDialogOpen(false);
      setDeletingProveedor(null);
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor ha sido eliminado exitosamente",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el proveedor. Puede tener órdenes de compra asociadas.",
      });
    },
  });

  const filteredProveedores = proveedores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pais.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.rfc && p.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Proveedor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* CSF Upload Section */}
              <div className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50">
                <input
                  ref={csfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleCSFUpload}
                  className="hidden"
                  id="csf-upload"
                  disabled={isParsingCSF}
                />
                <label 
                  htmlFor="csf-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {isParsingCSF ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-sm font-medium">Analizando CSF...</span>
                      <span className="text-xs text-muted-foreground">Extrayendo datos fiscales con IA</span>
                    </>
                  ) : csfParsed ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span className="text-sm font-medium text-green-600">CSF procesada</span>
                      <span className="text-xs text-muted-foreground">Los datos se auto-llenaron. Haz clic para subir otra CSF.</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">Subir Constancia de Situación Fiscal (CSF)</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Arrastra o haz clic para cargar el PDF. La IA extraerá automáticamente RFC, razón social y dirección.
                      </span>
                    </>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Proveedor *</Label>
                  <Input
                    id="nombre"
                    placeholder="Distribuidora ABC"
                    value={newProveedor.nombre}
                    onChange={(e) =>
                      setNewProveedor({ ...newProveedor, nombre: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pais">País *</Label>
                  <Input
                    id="pais"
                    placeholder="México"
                    value={newProveedor.pais}
                    onChange={(e) =>
                      setNewProveedor({ ...newProveedor, pais: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  placeholder="ABC123456XYZ"
                  value={newProveedor.rfc}
                  onChange={(e) =>
                    setNewProveedor({ ...newProveedor, rfc: e.target.value })
                  }
                />
              </div>

              {/* Sección de Contactos */}
              <div className="space-y-3">
                <Label>Contactos del proveedor</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Nombre del contacto *"
                    value={nuevoContactoNombre}
                    onChange={(e) => setNuevoContactoNombre(e.target.value)}
                  />
                  <Input
                    placeholder="Teléfono *"
                    value={nuevoContactoTelefono}
                    onChange={(e) => setNuevoContactoTelefono(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select value={nuevoContactoPuesto} onValueChange={(v) => setNuevoContactoPuesto(v as PuestoContacto)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PUESTOS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={handleAddContactoNuevo} disabled={!nuevoContactoNombre.trim() || !nuevoContactoTelefono.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {contactosNuevos.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                    {contactosNuevos.map((contacto, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="font-medium truncate">{contacto.nombre}</span>
                          <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{contacto.telefono}</span>
                          <Badge variant={getPuestoVariant(contacto.puesto)} className="text-xs shrink-0">
                            {getPuestoLabel(contacto.puesto)}
                          </Badge>
                          {contacto.es_principal && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!contacto.es_principal && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleSetPrincipalContactoNuevo(index)}
                              title="Marcar como principal"
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveContactoNuevo(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Agrega contactos con nombre, teléfono y área. ⭐ indica el contacto principal.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Correos electrónicos</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    type="email"
                    placeholder="correo@proveedor.com"
                    value={nuevoCorreoEmail}
                    onChange={(e) => setNuevoCorreoEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Nombre contacto (opcional)"
                    value={nuevoCorreoContacto}
                    onChange={(e) => setNuevoCorreoContacto(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select value={nuevoCorreoProposito} onValueChange={(v) => setNuevoCorreoProposito(v as PropositoCorreo)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPOSITOS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={handleAddCorreoNuevo}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {correosNuevos.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                    {correosNuevos.map((correo) => (
                      <div key={correo.email} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{correo.email}</span>
                          {correo.nombre_contacto && (
                            <span className="text-muted-foreground truncate">({correo.nombre_contacto})</span>
                          )}
                          <Badge variant={getPropositoVariant(correo.proposito)} className="text-xs shrink-0">
                            {getPropositoLabel(correo.proposito)}
                          </Badge>
                          {correo.es_principal && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!correo.es_principal && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleSetPrincipalNuevo(correo.email, correo.proposito)}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveCorreoNuevo(correo.email)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Agrega correos con propósitos específicos. ⭐ indica el correo principal de cada propósito.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Calle, número, colonia, ciudad"
                  value={newProveedor.direccion}
                  onChange={(e) =>
                    setNewProveedor({ ...newProveedor, direccion: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  placeholder="Información adicional sobre el proveedor"
                  value={newProveedor.notas}
                  onChange={(e) =>
                    setNewProveedor({ ...newProveedor, notas: e.target.value })
                  }
                />
              </div>

              <Button
                onClick={() => {
                  const contactoPrincipal = getContactoPrincipal(contactosNuevos);
                  createProveedor.mutate({ 
                    ...newProveedor, 
                    email: joinEmails(correosNuevos),
                    nombre_contacto: contactoPrincipal.nombre,
                    telefono: contactoPrincipal.telefono,
                  });
                }}
                disabled={!newProveedor.nombre || createProveedor.isPending}
                className="w-full"
              >
                Guardar Proveedor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando proveedores...
        </div>
      ) : filteredProveedores.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm
            ? "No se encontraron proveedores con ese criterio"
            : "No hay proveedores registrados"}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {proveedor.pais}
                    </div>
                  </TableCell>
                  <TableCell>{proveedor.nombre_contacto || "-"}</TableCell>
                  <TableCell>{proveedor.telefono || "-"}</TableCell>
                  <TableCell>
                    {proveedor.email || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={proveedor.activo ? "default" : "secondary"}>
                      {proveedor.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProductosProveedor(proveedor);
                          setIsProductosDialogOpen(true);
                        }}
                        title="Gestionar productos"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setEditingProveedor(proveedor);
                          await Promise.all([
                            loadCorreosProveedor(proveedor.id),
                            loadContactosProveedor(proveedor.id),
                          ]);
                          setIsEditDialogOpen(true);
                        }}
                        title="Editar proveedor"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingProveedor(proveedor);
                          setIsDeleteDialogOpen(true);
                        }}
                        title="Eliminar proveedor"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
          </DialogHeader>
          {editingProveedor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nombre">Nombre del Proveedor *</Label>
                  <Input
                    id="edit-nombre"
                    value={editingProveedor.nombre}
                    onChange={(e) =>
                      setEditingProveedor({
                        ...editingProveedor,
                        nombre: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pais">País *</Label>
                  <Input
                    id="edit-pais"
                    value={editingProveedor.pais}
                    onChange={(e) =>
                      setEditingProveedor({
                        ...editingProveedor,
                        pais: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-rfc">RFC</Label>
                <Input
                  id="edit-rfc"
                  value={editingProveedor.rfc || ""}
                  onChange={(e) =>
                    setEditingProveedor({
                      ...editingProveedor,
                      rfc: e.target.value,
                    })
                  }
                />
              </div>

              {/* Sección de Contactos - Editar */}
              <div className="space-y-3">
                <Label>Contactos del proveedor</Label>
                {isLoadingContactos ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando contactos...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Nombre del contacto *"
                        value={editContactoNombre}
                        onChange={(e) => setEditContactoNombre(e.target.value)}
                      />
                      <Input
                        placeholder="Teléfono *"
                        value={editContactoTelefono}
                        onChange={(e) => setEditContactoTelefono(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Select value={editContactoPuesto} onValueChange={(v) => setEditContactoPuesto(v as PuestoContacto)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PUESTOS.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" onClick={handleAddContactoEdit} disabled={!editContactoNombre.trim() || !editContactoTelefono.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {contactosEdit.length > 0 && (
                      <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                        {contactosEdit.map((contacto, index) => (
                          <div key={contacto.id || index} className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="font-medium truncate">{contacto.nombre}</span>
                              <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{contacto.telefono}</span>
                              <Badge variant={getPuestoVariant(contacto.puesto)} className="text-xs shrink-0">
                                {getPuestoLabel(contacto.puesto)}
                              </Badge>
                              {contacto.es_principal && (
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!contacto.es_principal && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleSetPrincipalContactoEdit(index)}
                                  title="Marcar como principal"
                                >
                                  <Star className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveContactoEdit(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Agrega contactos con nombre, teléfono y área. ⭐ indica el contacto principal.
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <Label>Correos electrónicos</Label>
                {isLoadingCorreos ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando correos...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        type="email"
                        placeholder="correo@proveedor.com"
                        value={editCorreoEmail}
                        onChange={(e) => setEditCorreoEmail(e.target.value)}
                      />
                      <Input
                        placeholder="Nombre contacto (opcional)"
                        value={editCorreoContacto}
                        onChange={(e) => setEditCorreoContacto(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Select value={editCorreoProposito} onValueChange={(v) => setEditCorreoProposito(v as PropositoCorreo)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROPOSITOS.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" onClick={handleAddCorreoEdit}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {correosEdit.length > 0 && (
                      <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                        {correosEdit.map((correo) => (
                          <div key={correo.email} className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{correo.email}</span>
                              {correo.nombre_contacto && (
                                <span className="text-muted-foreground truncate">({correo.nombre_contacto})</span>
                              )}
                              <Badge variant={getPropositoVariant(correo.proposito)} className="text-xs shrink-0">
                                {getPropositoLabel(correo.proposito)}
                              </Badge>
                              {correo.es_principal && (
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!correo.es_principal && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleSetPrincipalEdit(correo.email, correo.proposito)}
                                >
                                  <Star className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveCorreoEdit(correo.email)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Agrega correos con propósitos específicos. ⭐ indica el correo principal de cada propósito.
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-direccion">Dirección</Label>
                <Input
                  id="edit-direccion"
                  value={editingProveedor.direccion || ""}
                  onChange={(e) =>
                    setEditingProveedor({
                      ...editingProveedor,
                      direccion: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notas">Notas</Label>
                <Textarea
                  id="edit-notas"
                  value={editingProveedor.notas || ""}
                  onChange={(e) =>
                    setEditingProveedor({
                      ...editingProveedor,
                      notas: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-activo"
                  checked={editingProveedor.activo}
                  onChange={(e) =>
                    setEditingProveedor({
                      ...editingProveedor,
                      activo: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-activo">Proveedor activo</Label>
              </div>

              <Button
                onClick={() => updateProveedor.mutate({ ...editingProveedor, email: joinEmails(correosEdit) })}
                disabled={!editingProveedor.nombre || updateProveedor.isPending || isLoadingCorreos || isLoadingContactos}
                className="w-full"
              >
                {updateProveedor.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for managing supplier products */}
      <Dialog open={isProductosDialogOpen} onOpenChange={setIsProductosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Productos del Proveedor</DialogTitle>
          </DialogHeader>
          {productosProveedor && (
            <ProveedorProductosSelector 
              proveedorId={productosProveedor.id} 
              proveedorNombre={productosProveedor.nombre}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a "{deletingProveedor?.nombre}"? 
              Esta acción no se puede deshacer y eliminará también las asociaciones con productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProveedor && deleteProveedor.mutate(deletingProveedor.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
};

export default ProveedoresTab;
