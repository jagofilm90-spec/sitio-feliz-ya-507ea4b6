import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProveedorCardMobile } from "./ProveedorCardMobile";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Globe, Package, Trash2, X, FileText, Upload, Loader2, CheckCircle2, Star, Phone, User, Mail, ChevronDown, Building2, Landmark, HandCoins, CreditCard, BookOpen, RotateCcw, Power } from "lucide-react";
import CuentaCorrienteProveedorDialog from "./CuentaCorrienteProveedorDialog";
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

// =====================================================================
// CONSTANTS
// =====================================================================

const CATEGORIAS = [
  "Azúcares", "Granos y semillas", "Abarrotes secos", "Lácteos",
  "Aceites", "Botanas", "Bebidas", "Limpieza", "Mascotas", "Otros"
];

const TERMINOS_PAGO = [
  { value: "contado", label: "Contado" },
  { value: "8_dias", label: "8 días" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "45_dias", label: "45 días" },
  { value: "60_dias", label: "60 días" },
  { value: "anticipado", label: "Anticipado" },
];

const FRECUENCIAS = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "segun_necesidad", label: "Según necesidad" },
];

const DIAS_VISITA = [
  { value: "lunes", label: "Lun" },
  { value: "martes", label: "Mar" },
  { value: "miercoles", label: "Mié" },
  { value: "jueves", label: "Jue" },
  { value: "viernes", label: "Vie" },
  { value: "sabado", label: "Sáb" },
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Azúcares": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Granos y semillas": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Lácteos": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Aceites": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Abarrotes secos": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Botanas": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "Bebidas": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  "Limpieza": "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  "Mascotas": "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const getTerminoPagoBadge = (termino: string | null | undefined) => {
  if (!termino || termino === "contado") return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs">Contado</Badge>;
  if (termino === "anticipado") return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs">Anticipado</Badge>;
  const label = TERMINOS_PAGO.find(t => t.value === termino)?.label || termino;
  return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs">{label}</Badge>;
};

const getCategoriaBadge = (cat: string | null | undefined) => {
  if (!cat) return <span className="text-xs text-muted-foreground">—</span>;
  const colorClass = CATEGORIA_COLORS[cat] || "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`${colorClass} border-0 text-xs`}>{cat}</Badge>;
};

// =====================================================================
// INTERFACES
// =====================================================================

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
  nombre_comercial?: string | null;
  categoria?: string | null;
  nombre_contacto: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  pais: string;
  rfc: string | null;
  regimen_fiscal?: string | null;
  calle?: string | null;
  numero_exterior?: string | null;
  numero_interior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  codigo_postal?: string | null;
  termino_pago?: string | null;
  dias_visita?: string[] | null;
  frecuencia_compra?: string | null;
  banco?: string | null;
  beneficiario?: string | null;
  cuenta_bancaria?: string | null;
  clabe_interbancaria?: string | null;
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
// SECCIÓN DEL FORMULARIO: Reusable section components
// =====================================================================

interface FormSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  subtitle?: string;
}

const FormSection = ({ title, icon, children, collapsible, defaultOpen = true, subtitle }: FormSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b">
          {icon}
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex items-center gap-2 w-full pb-1 border-b hover:bg-muted/30 rounded px-1 -mx-1 transition-colors">
          {icon}
          <div className="flex-1 text-left">
            <h4 className="text-sm font-semibold">{title}</h4>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

// =====================================================================
// Supplier Form Content (shared between create and edit)
// =====================================================================

interface SupplierFormData {
  nombre: string;
  nombre_comercial: string;
  categoria: string;
  direccion: string;
  pais: string;
  rfc: string;
  regimen_fiscal: string;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigo_postal: string;
  termino_pago: string;
  dias_visita: string[];
  frecuencia_compra: string;
  banco: string;
  beneficiario: string;
  cuenta_bancaria: string;
  clabe_interbancaria: string;
  notas: string;
}

const SupplierFormFields = ({
  data,
  setData,
  prefix,
  clabeError,
  setClabeError,
}: {
  data: SupplierFormData;
  setData: (d: SupplierFormData) => void;
  prefix: string;
  clabeError: string;
  setClabeError: (e: string) => void;
}) => {
  const handleClabeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 18);
    setData({ ...data, clabe_interbancaria: cleaned });
    if (cleaned.length > 0 && cleaned.length !== 18) {
      setClabeError("La CLABE debe tener exactamente 18 dígitos");
    } else {
      setClabeError("");
    }
  };

  return (
    <div className="space-y-5">
      {/* SECCIÓN 1: Información básica */}
      <FormSection title="Información básica" icon={<Building2 className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-nombre`}>Nombre del proveedor *</Label>
          <Input
            id={`${prefix}-nombre`}
            placeholder="Ej: Ingenio El Mante, Nestlé"
            value={data.nombre}
            onChange={(e) => setData({ ...data, nombre: e.target.value })}
            className="text-base font-medium"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-nombre_comercial`}>Nombre comercial</Label>
            <Input
              id={`${prefix}-nombre_comercial`}
              placeholder="Ej: El Mante, Nestlé"
              value={data.nombre_comercial}
              onChange={(e) => setData({ ...data, nombre_comercial: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-categoria`}>Categoría</Label>
            <Select value={data.categoria} onValueChange={(v) => setData({ ...data, categoria: v })}>
              <SelectTrigger id={`${prefix}-categoria`}>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-pais`}>País</Label>
          <Input
            id={`${prefix}-pais`}
            placeholder="México"
            value={data.pais}
            onChange={(e) => setData({ ...data, pais: e.target.value })}
          />
        </div>
      </FormSection>

      {/* SECCIÓN 2: Datos fiscales */}
      <FormSection
        title="Datos fiscales (RFC y dirección)"
        icon={<FileText className="h-4 w-4 text-primary" />}
        collapsible
        defaultOpen={false}
      >
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-rfc`}>RFC</Label>
          <Input
            id={`${prefix}-rfc`}
            placeholder="ABC123456XYZ"
            value={data.rfc}
            onChange={(e) => setData({ ...data, rfc: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-regimen_fiscal`}>Régimen fiscal</Label>
          <Input
            id={`${prefix}-regimen_fiscal`}
            placeholder="601 - General de Ley"
            value={data.regimen_fiscal}
            onChange={(e) => setData({ ...data, regimen_fiscal: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Calle</Label>
            <Input placeholder="Av. Principal" value={data.calle} onChange={(e) => setData({ ...data, calle: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Num. Ext.</Label>
              <Input placeholder="#123" value={data.numero_exterior} onChange={(e) => setData({ ...data, numero_exterior: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Num. Int.</Label>
              <Input placeholder="4A" value={data.numero_interior} onChange={(e) => setData({ ...data, numero_interior: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Colonia</Label>
            <Input placeholder="Col. Centro" value={data.colonia} onChange={(e) => setData({ ...data, colonia: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Municipio</Label>
            <Input placeholder="Monterrey" value={data.municipio} onChange={(e) => setData({ ...data, municipio: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Input placeholder="Nuevo León" value={data.estado} onChange={(e) => setData({ ...data, estado: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Código postal</Label>
            <Input placeholder="64000" value={data.codigo_postal} onChange={(e) => setData({ ...data, codigo_postal: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-direccion`}>Dirección completa (legacy)</Label>
          <Input
            id={`${prefix}-direccion`}
            placeholder="Av. Principal #123, Col. Centro"
            value={data.direccion}
            onChange={(e) => setData({ ...data, direccion: e.target.value })}
          />
        </div>
      </FormSection>

      {/* SECCIÓN 3: Condiciones comerciales */}
      <FormSection
        title="Condiciones comerciales"
        icon={<HandCoins className="h-4 w-4 text-primary" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-termino_pago`}>Término de pago</Label>
            <Select value={data.termino_pago} onValueChange={(v) => setData({ ...data, termino_pago: v })}>
              <SelectTrigger id={`${prefix}-termino_pago`}>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {TERMINOS_PAGO.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-frecuencia`}>Frecuencia de compra</Label>
            <Select value={data.frecuencia_compra} onValueChange={(v) => setData({ ...data, frecuencia_compra: v })}>
              <SelectTrigger id={`${prefix}-frecuencia`}>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {FRECUENCIAS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Días de visita</Label>
          <div className="flex flex-wrap gap-3">
            {DIAS_VISITA.map(dia => (
              <div key={dia.value} className="flex items-center space-x-1.5">
                <Checkbox
                  id={`${prefix}-dia-${dia.value}`}
                  checked={(data.dias_visita || []).includes(dia.value)}
                  onCheckedChange={(checked) => {
                    const current = data.dias_visita || [];
                    setData({
                      ...data,
                      dias_visita: checked
                        ? [...current, dia.value]
                        : current.filter(d => d !== dia.value)
                    });
                  }}
                />
                <Label htmlFor={`${prefix}-dia-${dia.value}`} className="text-sm font-normal cursor-pointer">{dia.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </FormSection>

      {/* SECCIÓN 4: Datos bancarios */}
      <FormSection
        title="Datos bancarios"
        subtitle="Para pagos y transferencias"
        icon={<Landmark className="h-4 w-4 text-primary" />}
        collapsible
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-banco`}>Banco</Label>
            <Input
              id={`${prefix}-banco`}
              placeholder="Ej: BBVA, Banamex, Santander"
              value={data.banco}
              onChange={(e) => setData({ ...data, banco: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-beneficiario`}>Beneficiario</Label>
            <Input
              id={`${prefix}-beneficiario`}
              placeholder="Nombre del titular"
              value={data.beneficiario}
              onChange={(e) => setData({ ...data, beneficiario: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-cuenta`}>Número de cuenta</Label>
            <Input
              id={`${prefix}-cuenta`}
              placeholder="10 dígitos"
              value={data.cuenta_bancaria}
              onChange={(e) => setData({ ...data, cuenta_bancaria: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-clabe`}>CLABE interbancaria</Label>
            <Input
              id={`${prefix}-clabe`}
              placeholder="18 dígitos"
              value={data.clabe_interbancaria}
              onChange={(e) => handleClabeChange(e.target.value)}
              className={clabeError ? "border-destructive" : ""}
            />
            {clabeError && <p className="text-xs text-destructive">{clabeError}</p>}
          </div>
        </div>
      </FormSection>
    </div>
  );
};

// =====================================================================
// FIN COMPONENTES AUXILIARES
// =====================================================================

const ProveedoresTab = () => {
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProductosDialogOpen, setIsProductosDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCuentaDialogOpen, setIsCuentaDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [productosProveedor, setProductosProveedor] = useState<Proveedor | null>(null);
  const [deletingProveedor, setDeletingProveedor] = useState<Proveedor | null>(null);
  const [proveedorCuenta, setProveedorCuenta] = useState<Proveedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filters
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [filterTermino, setFilterTermino] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("activos");
  
  // CLABE validation
  const [clabeErrorNew, setClabeErrorNew] = useState("");
  const [clabeErrorEdit, setClabeErrorEdit] = useState("");
  
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
  
  const emptyForm: SupplierFormData = {
    nombre: "",
    nombre_comercial: "",
    categoria: "",
    direccion: "",
    pais: "México",
    rfc: "",
    regimen_fiscal: "",
    calle: "",
    numero_exterior: "",
    numero_interior: "",
    colonia: "",
    municipio: "",
    estado: "",
    codigo_postal: "",
    termino_pago: "contado",
    dias_visita: [],
    frecuencia_compra: "",
    banco: "",
    beneficiario: "",
    cuenta_bancaria: "",
    clabe_interbancaria: "",
    notas: "",
  };

  const [newProveedor, setNewProveedor] = useState<SupplierFormData>({ ...emptyForm });

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
    await supabase
      .from("proveedor_contactos")
      .update({ activo: false })
      .eq("proveedor_id", proveedorId);
    
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
    if (data.numero_exterior) parts.push(`#${data.numero_exterior}`);
    if (data.numero_interior) parts.push(`Int. ${data.numero_interior}`);
    if (data.nombre_colonia) parts.push(`Col. ${data.nombre_colonia}`);
    const localidadParts = [];
    if (data.nombre_localidad) localidadParts.push(data.nombre_localidad);
    if (data.nombre_municipio && data.nombre_municipio !== data.nombre_localidad) {
      localidadParts.push(data.nombre_municipio);
    }
    if (localidadParts.length > 0) parts.push(localidadParts.join(", "));
    if (data.nombre_entidad_federativa) parts.push(data.nombre_entidad_federativa);
    if (data.codigo_postal) parts.push(`C.P. ${data.codigo_postal}`);
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
          calle: csfData.nombre_vialidad ? `${csfData.tipo_vialidad || ''} ${csfData.nombre_vialidad}`.trim() : prev.calle,
          numero_exterior: csfData.numero_exterior || prev.numero_exterior,
          numero_interior: csfData.numero_interior || prev.numero_interior,
          colonia: csfData.nombre_colonia || prev.colonia,
          municipio: csfData.nombre_municipio || prev.municipio,
          estado: csfData.nombre_entidad_federativa || prev.estado,
          codigo_postal: csfData.codigo_postal || prev.codigo_postal,
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
        .select(`
          *,
          proveedor_productos(count),
          proveedor_contactos(
            id, nombre, telefono, email,
            es_principal, activo
          )
        `)
        .order("nombre");

      if (error) throw error;
      return data as any[];
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
      setNewProveedor({ ...emptyForm });
      setContactosNuevos([]);
      resetNuevoContacto();
      setCSFParsed(false);
      setClabeErrorNew("");
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
          nombre_comercial: proveedor.nombre_comercial,
          categoria: proveedor.categoria,
          nombre_contacto: contactoPrincipal.nombre,
          email: contactoPrincipal.email,
          telefono: contactoPrincipal.telefono,
          direccion: proveedor.direccion,
          pais: proveedor.pais,
          rfc: proveedor.rfc,
          regimen_fiscal: proveedor.regimen_fiscal,
          calle: proveedor.calle,
          numero_exterior: proveedor.numero_exterior,
          numero_interior: proveedor.numero_interior,
          colonia: proveedor.colonia,
          municipio: proveedor.municipio,
          estado: proveedor.estado,
          codigo_postal: proveedor.codigo_postal,
          termino_pago: proveedor.termino_pago,
          dias_visita: proveedor.dias_visita,
          frecuencia_compra: proveedor.frecuencia_compra,
          banco: proveedor.banco,
          beneficiario: proveedor.beneficiario,
          cuenta_bancaria: proveedor.cuenta_bancaria,
          clabe_interbancaria: proveedor.clabe_interbancaria,
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
      setClabeErrorEdit("");
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

  const deactivateProveedor = useMutation({
    mutationFn: async (proveedorId: string) => {
      const { error } = await supabase
        .from("proveedores")
        .update({ activo: false })
        .eq("id", proveedorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      setIsDeleteDialogOpen(false);
      setDeletingProveedor(null);
      toast({ title: "Proveedor desactivado" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo desactivar el proveedor" });
    },
  });

  const reactivateProveedor = useMutation({
    mutationFn: async (proveedorId: string) => {
      const { error } = await supabase
        .from("proveedores")
        .update({ activo: true })
        .eq("id", proveedorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      toast({ title: "Proveedor reactivado" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo reactivar el proveedor" });
    },
  });

  // Filtering logic
  const filteredProveedores = proveedores.filter((p) => {
    // Search
    const matchSearch = !searchTerm || 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pais.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.rfc && p.rfc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.nombre_comercial && p.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Categoria
    const matchCategoria = filterCategoria === "todos" || p.categoria === filterCategoria;
    
    // Termino
    const matchTermino = filterTermino === "todos" || 
      (filterTermino === "contado" && (!p.termino_pago || p.termino_pago === "contado")) ||
      (filterTermino === "credito" && p.termino_pago && !["contado", "anticipado"].includes(p.termino_pago)) ||
      (filterTermino === "anticipado" && p.termino_pago === "anticipado");
    
    // Estado
    const matchEstado = filterEstado === "todos" || 
      (filterEstado === "activos" && p.activo) ||
      (filterEstado === "inactivos" && !p.activo);
    
    return matchSearch && matchCategoria && matchTermino && matchEstado;
  });

  // Edit form data helper
  const getEditFormData = (): SupplierFormData | null => {
    if (!editingProveedor) return null;
    return {
      nombre: editingProveedor.nombre,
      nombre_comercial: editingProveedor.nombre_comercial || "",
      categoria: editingProveedor.categoria || "",
      direccion: editingProveedor.direccion || "",
      pais: editingProveedor.pais,
      rfc: editingProveedor.rfc || "",
      regimen_fiscal: editingProveedor.regimen_fiscal || "",
      calle: editingProveedor.calle || "",
      numero_exterior: editingProveedor.numero_exterior || "",
      numero_interior: editingProveedor.numero_interior || "",
      colonia: editingProveedor.colonia || "",
      municipio: editingProveedor.municipio || "",
      estado: editingProveedor.estado || "",
      codigo_postal: editingProveedor.codigo_postal || "",
      termino_pago: editingProveedor.termino_pago || "contado",
      dias_visita: editingProveedor.dias_visita || [],
      frecuencia_compra: editingProveedor.frecuencia_compra || "",
      banco: editingProveedor.banco || "",
      beneficiario: editingProveedor.beneficiario || "",
      cuenta_bancaria: editingProveedor.cuenta_bancaria || "",
      clabe_interbancaria: editingProveedor.clabe_interbancaria || "",
      notas: editingProveedor.notas || "",
    };
  };

  const updateEditFormData = (formData: SupplierFormData) => {
    if (!editingProveedor) return;
    setEditingProveedor({
      ...editingProveedor,
      ...formData,
    });
  };

  return (
    <Card className="p-6">
      {/* Search and filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Proveedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* CSF Upload Section */}
                <div className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50">
                  <input
                    ref={csfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleCSFUpload}
                    className="hidden"
                    id="csf-upload"
                  />
                  <label
                    htmlFor="csf-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer py-2"
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

                {/* Form fields */}
                <SupplierFormFields
                  data={newProveedor}
                  setData={setNewProveedor}
                  prefix="new"
                  clabeError={clabeErrorNew}
                  setClabeError={setClabeErrorNew}
                />

                {/* SECCIÓN 5: Contactos */}
                <FormSection title="Contactos" icon={<User className="h-4 w-4 text-primary" />}>
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
                </FormSection>

                {/* SECCIÓN 6: Notas */}
                <div className="space-y-2">
                  <Label htmlFor="new-notas">Notas</Label>
                  <Textarea
                    id="new-notas"
                    placeholder="Información adicional sobre el proveedor"
                    value={newProveedor.notas}
                    onChange={(e) => setNewProveedor({ ...newProveedor, notas: e.target.value })}
                  />
                </div>

                <Button
                  onClick={() => {
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

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las categorías</SelectItem>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTermino} onValueChange={setFilterTermino}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Término" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="contado">Contado</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="anticipado">Anticipado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            Mostrando {filteredProveedores.length} de {proveedores.length} proveedores
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando proveedores...
        </div>
      ) : filteredProveedores.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || filterCategoria !== "todos" || filterTermino !== "todos" || filterEstado !== "activos"
            ? "No se encontraron proveedores con esos filtros"
            : "No hay proveedores registrados"}
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredProveedores.map((proveedor) => (
            <ProveedorCardMobile
              key={proveedor.id}
              proveedor={proveedor}
              productosCount={
                proveedor.proveedor_productos?.[0]?.count || 0
              }
              contactoPrincipal={
                proveedor.proveedor_contactos?.find(
                  (c: any) => c.es_principal && c.activo
                ) || proveedor.proveedor_contactos?.find(
                  (c: any) => c.activo
                ) || null
              }
              onEdit={async (p) => {
                setEditingProveedor(p);
                await loadContactosProveedor(p.id);
                setIsEditDialogOpen(true);
              }}
              onViewProductos={(p) => {
                setProductosProveedor(p);
                setIsProductosDialogOpen(true);
              }}
              onDelete={(p) => {
                setDeletingProveedor(p);
                setIsDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Término pago</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell className="font-medium">
                    <div>
                      {proveedor.nombre}
                      {proveedor.nombre_comercial && proveedor.nombre_comercial !== proveedor.nombre && (
                        <span className="block text-xs text-muted-foreground">{proveedor.nombre_comercial}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getCategoriaBadge(proveedor.categoria)}</TableCell>
                  <TableCell>{getTerminoPagoBadge(proveedor.termino_pago)}</TableCell>
                  <TableCell>{proveedor.nombre_contacto || "-"}</TableCell>
                  <TableCell>{proveedor.telefono || "-"}</TableCell>
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
                          setProveedorCuenta(proveedor);
                          setIsCuentaDialogOpen(true);
                        }}
                        title="Ver cuenta corriente"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
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
                      {proveedor.activo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingProveedor(proveedor);
                            setIsDeleteDialogOpen(true);
                          }}
                          title="Desactivar proveedor"
                          className="text-destructive hover:text-destructive"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reactivateProveedor.mutate(proveedor.id)}
                          title="Reactivar proveedor"
                          className="text-green-600 hover:text-green-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
          </DialogHeader>
          {editingProveedor && (
            <div className="space-y-5">
              <SupplierFormFields
                data={getEditFormData()!}
                setData={updateEditFormData}
                prefix="edit"
                clabeError={clabeErrorEdit}
                setClabeError={setClabeErrorEdit}
              />

              {/* Contactos */}
              <FormSection title="Contactos" icon={<User className="h-4 w-4 text-primary" />}>
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
              </FormSection>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="edit-notas">Notas</Label>
                <Textarea
                  id="edit-notas"
                  value={editingProveedor.notas || ""}
                  onChange={(e) => setEditingProveedor({ ...editingProveedor, notas: e.target.value })}
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

      {/* Productos Dialog */}
      <Dialog open={isProductosDialogOpen} onOpenChange={setIsProductosDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col overflow-x-hidden">
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

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              El proveedor "{deletingProveedor?.nombre}" dejará de aparecer en órdenes de compra pero se conservará su historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProveedor) {
                  deactivateProveedor.mutate(deletingProveedor.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CuentaCorrienteProveedorDialog
        open={isCuentaDialogOpen}
        onOpenChange={setIsCuentaDialogOpen}
        proveedor={proveedorCuenta}
      />
    </Card>
  );
};

export default ProveedoresTab;
