import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Building2, 
  Edit, 
  MapPin, 
  Package, 
  Trash2,
  Users 
} from "lucide-react";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  termino_credito: string;
  limite_credito: number | null;
  saldo_pendiente: number | null;
  activo: boolean;
  es_grupo: boolean;
  grupo_padre?: { id: string; nombre: string; codigo: string } | null;
  cliente_sucursales?: { count: number }[];
  cliente_productos_frecuentes?: { count: number }[];
  vendedor_asignado?: string | null;
}

interface ClienteCardMobileProps {
  cliente: Cliente;
  onEdit: (cliente: Cliente) => void;
  onViewSucursales: (cliente: { id: string; nombre: string }) => void;
  onViewHistorial: (cliente: { id: string; nombre: string }) => void;
  onViewProductos: (cliente: { id: string; nombre: string }) => void;
  onDelete: (clienteId: string) => void;
  getVendedorNombre?: (vendedorId: string | null) => string | null;
  getCreditLabel: (term: string) => string;
}

export const ClienteCardMobile = ({ 
  cliente, 
  onEdit, 
  onViewSucursales,
  onViewHistorial,
  onViewProductos,
  onDelete,
  getVendedorNombre,
  getCreditLabel
}: ClienteCardMobileProps) => {
  const sucursalesCount = cliente.cliente_sucursales?.[0]?.count || 0;
  const productosCount = cliente.cliente_productos_frecuentes?.[0]?.count || 0;
  const vendedorNombre = getVendedorNombre?.(cliente.vendedor_asignado || null);
  
  const saldoExcedido = (cliente.saldo_pendiente || 0) > (cliente.limite_credito || 0) && (cliente.limite_credito || 0) > 0;

  return (
    <Card className={cn(
      "border-l-4",
      !cliente.activo && "opacity-60 border-l-muted",
      cliente.activo && saldoExcedido && "border-l-destructive",
      cliente.activo && !saldoExcedido && "border-l-primary",
      cliente.grupo_padre && "bg-muted/30"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Nombre y badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Badges de grupo */}
            <div className="flex flex-wrap gap-1 mb-1">
              {cliente.es_grupo && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 bg-primary/10">
                  <Building2 className="h-3 w-3" />
                  Grupo
                </Badge>
              )}
              {cliente.grupo_padre && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                  <Users className="h-3 w-3" />
                  {cliente.grupo_padre.nombre}
                </Badge>
              )}
            </div>
            
            {/* Código y nombre */}
            <p className="text-[10px] text-muted-foreground font-mono">{cliente.codigo}</p>
            <h3 className="font-semibold text-sm leading-tight">{cliente.nombre}</h3>
          </div>
          
          {/* Estado */}
          <Badge variant={cliente.activo ? "default" : "destructive"} className="text-[10px] shrink-0">
            {cliente.activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        {/* Info principal */}
        <div className="space-y-1.5 text-sm">
          {cliente.rfc && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">RFC:</span>
              <span className="font-mono text-xs">{cliente.rfc}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Crédito:</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {getCreditLabel(cliente.termino_credito)}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Límite:</span>
            <span className="text-xs font-medium">
              ${(cliente.limite_credito || 0).toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Saldo:</span>
            <span className={cn(
              "text-xs font-medium",
              (cliente.saldo_pendiente || 0) > 0 && "text-destructive"
            )}>
              ${(cliente.saldo_pendiente || 0).toLocaleString()}
            </span>
          </div>
          
          {vendedorNombre && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Vendedor:</span>
              <span className="text-xs">{vendedorNombre}</span>
            </div>
          )}
        </div>

        {/* Contadores */}
        <div className="flex gap-4 pt-1 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{sucursalesCount} sucursales</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>{productosCount} productos</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewHistorial({ id: cliente.id, nombre: cliente.nombre })}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Historial
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewSucursales({ id: cliente.id, nombre: cliente.nombre })}
          >
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Sucursales
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onEdit(cliente)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(cliente.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
