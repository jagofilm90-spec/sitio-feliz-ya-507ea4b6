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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Globe, Package, Trash2, X, FileText, Upload, Loader2, CheckCircle2, Star, Phone, User, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProveedorProductosSelector from "./ProveedorProductosSelector";
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

// Interfaz unificada de Contacto (con email y checkboxes de responsabilidades)
interface ContactoProveedor {
  id?: string;
  nombre: string;
  telefono: string;
  email: string;
  recibe_ordenes: boolean;
  recibe_pagos: boolean;
  recibe_devoluciones: boolean;
  recibe_logistica: boolean;
  es_principal: boolean;
}

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

// =====================================================================
// COMPONENTES AUXILIARES (fuera del componente principal para evitar re-mount)
// =====================================================================

// Render de badges de responsabilidades
const renderResponsabilidades = (contacto: ContactoProveedor) => {
  const badges = [];
  if (contacto.recibe_ordenes) badges.push(<Badge key="ord" variant="default" className="text-xs">Órdenes</Badge>);
  if (contacto.recibe_pagos) badges.push(<Badge key="pag" variant="secondary" className="text-xs">Pagos</Badge>);
  if (contacto.recibe_devoluciones) badges.push(<Badge key="dev" variant="destructive" className="text-xs">Devoluciones</Badge>);
  if (contacto.recibe_logistica) badges.push(<Badge key="log" variant="outline" className="text-xs">Logística</Badge>);
  return badges.length > 0 ? badges : <span className="text-xs text-muted-foreground">Sin asignar</span>;
};

// Form de agregar contacto reutilizable - DEBE estar fuera para no perder foco
const ContactoForm = ({ 
  contacto, 
  setContacto, 
  onAdd, 
  disabled,
  prefix = "contacto"
}: { 
  contacto: ContactoProveedor; 
  setContacto: (c: ContactoProveedor) => void; 
  onAdd: () => void; 
  disabled: boolean;
  prefix?: string;
}) => (
  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Nombre *</Label>
        <Input
          placeholder="Nombre del contacto"
          value={contacto.nombre}
          onChange={(e) => setContacto({ ...contacto, nombre: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Teléfono</Label>
        <Input
          placeholder="55 1234 5678"
          value={contacto.telefono}
          onChange={(e) => setContacto({ ...contacto, telefono: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Correo</Label>
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={contacto.email}
          onChange={(e) => setContacto({ ...contacto, email: e.target.value })}
        />
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <Label className="text-xs text-muted-foreground">Recibe comunicaciones de:</Label>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${prefix}-recibe_ordenes`}
          checked={contacto.recibe_ordenes}
          onCheckedChange={(c) => setContacto({ ...contacto, recibe_ordenes: c === true })}
        />
        <Label htmlFor={`${prefix}-recibe_ordenes`} className="text-sm font-normal cursor-pointer">Órdenes</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${prefix}-recibe_pagos`}
          checked={contacto.recibe_pagos}
          onCheckedChange={(c) => setContacto({ ...contacto, recibe_pagos: c === true })}
        />
        <Label htmlFor={`${prefix}-recibe_pagos`} className="text-sm font-normal cursor-pointer">Pagos</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${prefix}-recibe_devoluciones`}
          checked={contacto.recibe_devoluciones}
          onCheckedChange={(c) => setContacto({ ...contacto, recibe_devoluciones: c === true })}
        />
        <Label htmlFor={`${prefix}-recibe_devoluciones`} className="text-sm font-normal cursor-pointer">Devoluciones</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${prefix}-recibe_logistica`}
          checked={contacto.recibe_logistica}
          onCheckedChange={(c) => setContacto({ ...contacto, recibe_logistica: c === true })}
        />
        <Label htmlFor={`${prefix}-recibe_logistica`} className="text-sm font-normal cursor-pointer">Logística</Label>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled} className="ml-auto">
        <Plus className="h-4 w-4 mr-1" />
        Agregar
      </Button>
    </div>
  </div>
);

// Lista de contactos reutilizable con edición inline - DEBE estar fuera para no perder foco
const ContactosList = ({ 
  contactos, 
  onRemove, 
  onSetPrincipal,
  onEdit,
  editingIndex,
  editingContacto,
  setEditingContacto,
  onSaveEdit,
  onCancelEdit,
}: { 
  contactos: ContactoProveedor[]; 
  onRemove: (index: number) => void; 
  onSetPrincipal: (index: number) => void;
  onEdit: (index: number) => void;
  editingIndex: number | null;
  editingContacto: ContactoProveedor | null;
  setEditingContacto: (c: ContactoProveedor) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) => (
  <div className="space-y-2">
    {contactos.map((contacto, index) => (
      <div key={contacto.id || index} className="p-3 border rounded-lg bg-background">
        {editingIndex === index && editingContacto ? (
          // Modo edición inline
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre *</Label>
                <Input
                  placeholder="Nombre del contacto"
                  value={editingContacto.nombre}
                  onChange={(e) => setEditingContacto({ ...editingContacto, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teléfono</Label>
                <Input
                  placeholder="55 1234 5678"
                  value={editingContacto.telefono}
                  onChange={(e) => setEditingContacto({ ...editingContacto, telefono: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Correo</Label>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={editingContacto.email}
                  onChange={(e) => setEditingContacto({ ...editingContacto, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Label className="text-xs text-muted-foreground">Recibe comunicaciones de:</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-inline-recibe_ordenes-${index}`}
                  checked={editingContacto.recibe_ordenes}
                  onCheckedChange={(c) => setEditingContacto({ ...editingContacto, recibe_ordenes: c === true })}
                />
                <Label htmlFor={`edit-inline-recibe_ordenes-${index}`} className="text-sm font-normal cursor-pointer">Órdenes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-inline-recibe_pagos-${index}`}
                  checked={editingContacto.recibe_pagos}
                  onCheckedChange={(c) => setEditingContacto({ ...editingContacto, recibe_pagos: c === true })}
                />
                <Label htmlFor={`edit-inline-recibe_pagos-${index}`} className="text-sm font-normal cursor-pointer">Pagos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-inline-recibe_devoluciones-${index}`}
                  checked={editingContacto.recibe_devoluciones}
                  onCheckedChange={(c) => setEditingContacto({ ...editingContacto, recibe_devoluciones: c === true })}
                />
                <Label htmlFor={`edit-inline-recibe_devoluciones-${index}`} className="text-sm font-normal cursor-pointer">Devoluciones</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-inline-recibe_logistica-${index}`}
                  checked={editingContacto.recibe_logistica}
                  onCheckedChange={(c) => setEditingContacto({ ...editingContacto, recibe_logistica: c === true })}
                />
                <Label htmlFor={`edit-inline-recibe_logistica-${index}`} className="text-sm font-normal cursor-pointer">Logística</Label>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={onSaveEdit} disabled={!editingContacto.nombre.trim()}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          // Modo lectura
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{contacto.nombre}</span>
                {contacto.es_principal && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {contacto.telefono && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contacto.telefono}
                  </span>
                )}
                {contacto.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contacto.email}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {renderResponsabilidades(contacto)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEdit(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar contacto</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!contacto.es_principal && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onSetPrincipal(index)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Marcar como principal</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => onRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
);

// =====================================================================
// FIN COMPONENTES AUXILIARES
// =====================================================================

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
  
  // Contactos unificados - para crear
  const [contactosNuevos, setContactosNuevos] = useState<ContactoProveedor[]>([]);
  const [nuevoContacto, setNuevoContacto] = useState<ContactoProveedor>({
    nombre: "",
    telefono: "",
    email: "",
    recibe_ordenes: false,
    recibe_pagos: false,
    recibe_devoluciones: false,
    recibe_logistica: false,
    es_principal: false,
  });
  
  // Contactos unificados - para editar
  const [contactosEdit, setContactosEdit] = useState<ContactoProveedor[]>([]);
  const [editContacto, setEditContacto] = useState<ContactoProveedor>({
    nombre: "",
    telefono: "",
    email: "",
    recibe_ordenes: false,
    recibe_pagos: false,
    recibe_devoluciones: false,
    recibe_logistica: false,
    es_principal: false,
  });
  const [isLoadingContactos, setIsLoadingContactos] = useState(false);
  
  // Estado para edición inline de contactos
  const [editingContactoNuevoIndex, setEditingContactoNuevoIndex] = useState<number | null>(null);
  const [editingContactoNuevo, setEditingContactoNuevo] = useState<ContactoProveedor | null>(null);
  const [editingContactoEditIndex, setEditingContactoEditIndex] = useState<number | null>(null);
  const [editingContactoEdit, setEditingContactoEdit] = useState<ContactoProveedor | null>(null);
  
  const [newProveedor, setNewProveedor] = useState({
    nombre: "",
    direccion: "",
    pais: "México",
    rfc: "",
    notas: "",
    // Campos fiscales estructurados
    regimen_fiscal: "",
    nombre_comercial: "",
    calle: "",
    numero_exterior: "",
    numero_interior: "",
    colonia: "",
    municipio: "",
    estado: "",
    codigo_postal: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset nuevo contacto form
  const resetNuevoContacto = () => {
    setNuevoContacto({
      nombre: "",
      telefono: "",
      email: "",
      recibe_ordenes: false,
      recibe_pagos: false,
      recibe_devoluciones: false,
      recibe_logistica: false,
      es_principal: false,
    });
  };

  const resetEditContacto = () => {
    setEditContacto({
      nombre: "",
      telefono: "",
      email: "",
      recibe_ordenes: false,
      recibe_pagos: false,
      recibe_devoluciones: false,
      recibe_logistica: false,
      es_principal: false,
    });
  };

  // Agregar contacto nuevo (formulario crear)
  const handleAddContactoNuevo = () => {
    if (!nuevoContacto.nombre.trim()) return;
    
    const esPrincipal = contactosNuevos.length === 0;
    
    setContactosNuevos([...contactosNuevos, {
      ...nuevoContacto,
      nombre: nuevoContacto.nombre.trim(),
      telefono: nuevoContacto.telefono.trim(),
      email: nuevoContacto.email.trim(),
      es_principal: esPrincipal,
    }]);
    resetNuevoContacto();
  };

  const handleRemoveContactoNuevo = (index: number) => {
    const updated = contactosNuevos.filter((_, i) => i !== index);
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
    if (!editContacto.nombre.trim()) return;
    
    const esPrincipal = contactosEdit.length === 0;
    
    setContactosEdit([...contactosEdit, {
      ...editContacto,
      nombre: editContacto.nombre.trim(),
      telefono: editContacto.telefono.trim(),
      email: editContacto.email.trim(),
      es_principal: esPrincipal,
    }]);
    resetEditContacto();
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

  // Funciones para edición inline de contactos (formulario crear)
  const handleStartEditContactoNuevo = (index: number) => {
    setEditingContactoNuevoIndex(index);
    setEditingContactoNuevo({ ...contactosNuevos[index] });
  };

  const handleSaveEditContactoNuevo = () => {
    if (editingContactoNuevoIndex === null || !editingContactoNuevo) return;
    const updated = [...contactosNuevos];
    updated[editingContactoNuevoIndex] = { ...editingContactoNuevo };
    setContactosNuevos(updated);
    setEditingContactoNuevoIndex(null);
    setEditingContactoNuevo(null);
  };

  const handleCancelEditContactoNuevo = () => {
    setEditingContactoNuevoIndex(null);
    setEditingContactoNuevo(null);
  };

  // Funciones para edición inline de contactos (formulario editar proveedor)
  const handleStartEditContactoEdit = (index: number) => {
    setEditingContactoEditIndex(index);
    setEditingContactoEdit({ ...contactosEdit[index] });
  };

  const handleSaveEditContactoEdit = () => {
    if (editingContactoEditIndex === null || !editingContactoEdit) return;
    const updated = [...contactosEdit];
    updated[editingContactoEditIndex] = { ...editingContactoEdit };
    setContactosEdit(updated);
    setEditingContactoEditIndex(null);
    setEditingContactoEdit(null);
  };

  const handleCancelEditContactoEdit = () => {
    setEditingContactoEditIndex(null);
    setEditingContactoEdit(null);
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
        telefono: c.telefono || "",
        email: c.email || "",
        recibe_ordenes: c.recibe_ordenes || false,
        recibe_pagos: c.recibe_pagos || false,
        recibe_devoluciones: c.recibe_devoluciones || false,
        recibe_logistica: c.recibe_logistica || false,
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
            email: contacto.email,
            recibe_ordenes: contacto.recibe_ordenes,
            recibe_pagos: contacto.recibe_pagos,
            recibe_devoluciones: contacto.recibe_devoluciones,
            recibe_logistica: contacto.recibe_logistica,
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
            email: contacto.email,
            recibe_ordenes: contacto.recibe_ordenes,
            recibe_pagos: contacto.recibe_pagos,
            recibe_devoluciones: contacto.recibe_devoluciones,
            recibe_logistica: contacto.recibe_logistica,
            es_principal: contacto.es_principal,
            activo: true,
          });
      }
    }
  };

  // Helper para obtener contacto principal (para backwards compatibility)
  const getContactoPrincipal = (contactos: ContactoProveedor[]): { nombre: string | null; telefono: string | null; email: string | null } => {
    const principal = contactos.find(c => c.es_principal) || contactos[0];
    return {
      nombre: principal?.nombre || null,
      telefono: principal?.telefono || null,
      email: principal?.email || null,
    };
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
      
      const { data, error } = await supabase.functions.invoke('parse-csf', {
        body: { pdfBase64: base64 }
      });
      
      if (error) throw error;
      
      if (data?.data) {
        const csfData = data.data;
        
        let nombreCompleto = csfData.razon_social || '';
        if (csfData.regimen_capital) {
          nombreCompleto += ` ${csfData.regimen_capital}`;
        }
        
        const direccionCompleta = buildDireccionFromCSF(csfData);
        
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
      if (contactosNuevos.length > 0) {
        await saveContactosProveedor(data.id, contactosNuevos);
      }
      
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-contactos"] });
      setIsDialogOpen(false);
      setNewProveedor({
        nombre: "",
        direccion: "",
        pais: "México",
        rfc: "",
        notas: "",
        regimen_fiscal: "",
        nombre_comercial: "",
        calle: "",
        numero_exterior: "",
        numero_interior: "",
        colonia: "",
        municipio: "",
        estado: "",
        codigo_postal: "",
      });
      setContactosNuevos([]);
      resetNuevoContacto();
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
          email: contactoPrincipal.email,
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
      await saveContactosProveedor(proveedorId, contactosEdit);
      
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-contactos"] });
      setIsEditDialogOpen(false);
      setEditingProveedor(null);
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
      await supabase
        .from("proveedor_productos")
        .delete()
        .eq("proveedor_id", proveedorId);
      
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

  // Nota: renderResponsabilidades, ContactoForm y ContactosList están definidos
  // FUERA del componente para evitar re-mount y pérdida de foco en inputs

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

              {/* Sección de Contactos Unificados */}
              <div className="space-y-3">
                <Label>Contactos del proveedor</Label>
                <ContactoForm
                  prefix="nuevo"
                  contacto={nuevoContacto}
                  setContacto={setNuevoContacto}
                  onAdd={handleAddContactoNuevo}
                  disabled={!nuevoContacto.nombre.trim()}
                />
                {contactosNuevos.length > 0 && (
                  <ContactosList
                    contactos={contactosNuevos}
                    onRemove={handleRemoveContactoNuevo}
                    onSetPrincipal={handleSetPrincipalContactoNuevo}
                    onEdit={handleStartEditContactoNuevo}
                    editingIndex={editingContactoNuevoIndex}
                    editingContacto={editingContactoNuevo}
                    setEditingContacto={setEditingContactoNuevo}
                    onSaveEdit={handleSaveEditContactoNuevo}
                    onCancelEdit={handleCancelEditContactoNuevo}
                  />
                )}
                {nuevoContacto.nombre.trim() && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    ⚠️ Tienes un contacto pendiente. Se agregará automáticamente al guardar.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Agrega contactos con nombre, teléfono, correo y selecciona qué comunicaciones reciben. ⭐ indica el contacto principal.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Av. Principal #123, Col. Centro"
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
                  // Auto-agregar contacto pendiente si tiene nombre
                  let contactosFinales = [...contactosNuevos];
                  if (nuevoContacto.nombre.trim()) {
                    const esPrincipal = contactosFinales.length === 0;
                    contactosFinales.push({
                      ...nuevoContacto,
                      nombre: nuevoContacto.nombre.trim(),
                      telefono: nuevoContacto.telefono.trim(),
                      email: nuevoContacto.email.trim(),
                      es_principal: esPrincipal,
                    });
                    // Actualizar el estado para reflejar el cambio
                    setContactosNuevos(contactosFinales);
                    setNuevoContacto({
                      nombre: "",
                      telefono: "",
                      email: "",
                      es_principal: false,
                      recibe_ordenes: true,
                      recibe_pagos: false,
                      recibe_devoluciones: false,
                      recibe_logistica: false,
                    });
                  }
                  const contactoPrincipal = getContactoPrincipal(contactosFinales);
                  createProveedor.mutate({ 
                    ...newProveedor, 
                    email: contactoPrincipal.email || "",
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
                          await loadContactosProveedor(proveedor.id);
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

              {/* Sección de Contactos Unificados - Editar */}
              <div className="space-y-3">
                <Label>Contactos del proveedor</Label>
                {isLoadingContactos ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando contactos...
                  </div>
                ) : (
                  <>
                    <ContactoForm
                      prefix="edit"
                      contacto={editContacto}
                      setContacto={setEditContacto}
                      onAdd={handleAddContactoEdit}
                      disabled={!editContacto.nombre.trim()}
                    />
                    {contactosEdit.length > 0 && (
                      <ContactosList
                        contactos={contactosEdit}
                        onRemove={handleRemoveContactoEdit}
                        onSetPrincipal={handleSetPrincipalContactoEdit}
                        onEdit={handleStartEditContactoEdit}
                        editingIndex={editingContactoEditIndex}
                        editingContacto={editingContactoEdit}
                        setEditingContacto={setEditingContactoEdit}
                        onSaveEdit={handleSaveEditContactoEdit}
                        onCancelEdit={handleCancelEditContactoEdit}
                      />
                    )}
                    {editContacto.nombre.trim() && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500">
                        ⚠️ Tienes un contacto pendiente. Se agregará automáticamente al guardar.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Agrega contactos con nombre, teléfono, correo y selecciona qué comunicaciones reciben. ⭐ indica el contacto principal.
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
                <Checkbox
                  id="edit-activo"
                  checked={editingProveedor.activo}
                  onCheckedChange={(c) =>
                    setEditingProveedor({
                      ...editingProveedor,
                      activo: c === true,
                    })
                  }
                />
                <Label htmlFor="edit-activo" className="text-sm font-normal cursor-pointer">
                  Proveedor activo
                </Label>
              </div>

              <Button
                onClick={() => {
                  if (editingProveedor) {
                    // Auto-agregar contacto pendiente si tiene nombre
                    let contactosFinales = [...contactosEdit];
                    if (editContacto.nombre.trim()) {
                      const esPrincipal = contactosFinales.length === 0;
                      contactosFinales.push({
                        ...editContacto,
                        nombre: editContacto.nombre.trim(),
                        telefono: editContacto.telefono.trim(),
                        email: editContacto.email.trim(),
                        es_principal: esPrincipal,
                      });
                      // Actualizar el estado para reflejar el cambio
                      setContactosEdit(contactosFinales);
                      setEditContacto({
                        nombre: "",
                        telefono: "",
                        email: "",
                        es_principal: false,
                        recibe_ordenes: true,
                        recibe_pagos: false,
                        recibe_devoluciones: false,
                        recibe_logistica: false,
                      });
                    }
                    updateProveedor.mutate(editingProveedor);
                  }
                }}
                disabled={!editingProveedor?.nombre || updateProveedor.isPending}
                className="w-full"
              >
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isProductosDialogOpen} onOpenChange={setIsProductosDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Productos de {productosProveedor?.nombre}
            </DialogTitle>
          </DialogHeader>
          {productosProveedor && (
            <div className="flex-1 overflow-hidden">
              <ProveedorProductosSelector proveedorId={productosProveedor.id} proveedorNombre={productosProveedor.nombre} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el proveedor "{deletingProveedor?.nombre}" y todas sus relaciones con productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProveedor) {
                  deleteProveedor.mutate(deletingProveedor.id);
                }
              }}
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
