import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Edit,
  Globe,
  Mail,
  Package,
  Phone,
  Star,
  Trash2,
  User
} from "lucide-react";

interface ContactoProveedor {
  id?: string;
  nombre: string;
  telefono: string;
  email: string;
  es_principal: boolean;
  recibe_ordenes: boolean;
  recibe_pagos: boolean;
  recibe_devoluciones: boolean;
  recibe_logistica: boolean;
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
  termino_pago?: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

interface ProveedorCardMobileProps {
  proveedor: Proveedor;
  productosCount: number;
  contactoPrincipal: ContactoProveedor | null;
  onEdit: (proveedor: Proveedor) => void;
  onViewProductos: (proveedor: Proveedor) => void;
  onDelete: (proveedor: Proveedor) => void;
}

const CATEGORIA_COLORS: Record<string, string> = {
  "Azúcares": "bg-blue-100 text-blue-800",
  "Granos y semillas": "bg-green-100 text-green-800",
  "Lácteos": "bg-yellow-100 text-yellow-800",
  "Aceites": "bg-amber-100 text-amber-800",
  "Abarrotes secos": "bg-orange-100 text-orange-800",
  "Botanas": "bg-purple-100 text-purple-800",
  "Bebidas": "bg-cyan-100 text-cyan-800",
  "Limpieza": "bg-teal-100 text-teal-800",
  "Mascotas": "bg-pink-100 text-pink-800",
};

const TERMINOS_LABELS: Record<string, string> = {
  "contado": "Contado",
  "8_dias": "8 días",
  "15_dias": "15 días",
  "30_dias": "30 días",
  "45_dias": "45 días",
  "60_dias": "60 días",
  "anticipado": "Anticipado",
};

export const ProveedorCardMobile = ({
  proveedor,
  productosCount,
  contactoPrincipal,
  onEdit,
  onViewProductos,
  onDelete,
}: ProveedorCardMobileProps) => {
  const nombreContacto = contactoPrincipal?.nombre || proveedor.nombre_contacto;
  const telefonoContacto = contactoPrincipal?.telefono || proveedor.telefono;
  const emailContacto = contactoPrincipal?.email || proveedor.email;

  const catColor = proveedor.categoria ? (CATEGORIA_COLORS[proveedor.categoria] || "bg-muted text-muted-foreground") : null;

  const getTerminoBadgeClass = (t: string | null | undefined) => {
    if (!t || t === "contado") return "bg-green-100 text-green-800";
    if (t === "anticipado") return "bg-red-100 text-red-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <Card className={cn(
      "border-l-4",
      !proveedor.activo && "opacity-60 border-l-muted",
      proveedor.activo && "border-l-primary"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Nombre y badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {contactoPrincipal && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
              <h3 className="font-semibold text-sm truncate">{proveedor.nombre}</h3>
            </div>
            {proveedor.nombre_comercial && proveedor.nombre_comercial !== proveedor.nombre && (
              <p className="text-[10px] text-muted-foreground mb-1">{proveedor.nombre_comercial}</p>
            )}
            {proveedor.rfc && (
              <p className="text-[10px] text-muted-foreground font-mono">RFC: {proveedor.rfc}</p>
            )}
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{proveedor.pais}</span>
          </div>
        </div>

        {/* Badges: Categoría y término */}
        <div className="flex flex-wrap gap-1.5">
          {proveedor.categoria && catColor && (
            <Badge variant="outline" className={`${catColor} border-0 text-[10px]`}>
              {proveedor.categoria}
            </Badge>
          )}
          <Badge variant="outline" className={`${getTerminoBadgeClass(proveedor.termino_pago)} border-0 text-[10px]`}>
            {TERMINOS_LABELS[proveedor.termino_pago || "contado"] || "Contado"}
          </Badge>
        </div>

        {/* Contacto principal */}
        {(nombreContacto || telefonoContacto || emailContacto) && (
          <div className="space-y-1.5 py-2 border-t border-b">
            {nombreContacto && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate">
                  {nombreContacto}
                  {contactoPrincipal?.es_principal && (
                    <span className="text-muted-foreground ml-1">(Principal)</span>
                  )}
                </span>
              </div>
            )}
            {telefonoContacto && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs">{telefonoContacto}</span>
              </div>
            )}
            {emailContacto && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{emailContacto}</span>
              </div>
            )}
          </div>
        )}

        {/* Productos asociados */}
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {productosCount} productos asociados
          </span>
        </div>

        {/* Notas si existen */}
        {proveedor.notas && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            {proveedor.notas}
          </p>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewProductos(proveedor)}
          >
            <Package className="h-3.5 w-3.5 mr-1" />
            Productos
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onEdit(proveedor)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(proveedor)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
