import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Package, Edit, Check, X } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

interface ProductoFumigacion {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  presentacion: string | null;
  stock_actual: number;
  ultima_fumigacion: string | null;
  proxima_fumigacion: string | null;
}

interface FumigacionCardMobileProps {
  producto: ProductoFumigacion;
  onUpdateFecha: (productoId: string, fecha: string) => void;
}

export function FumigacionCardMobile({ producto, onUpdateFecha }: FumigacionCardMobileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fechaEdit, setFechaEdit] = useState(producto.ultima_fumigacion || "");

  const getEstadoBadge = () => {
    if (!producto.proxima_fumigacion) {
      return <Badge variant="secondary">Sin programar</Badge>;
    }
    
    const dias = differenceInDays(parseISO(producto.proxima_fumigacion), new Date());
    
    if (dias < 0) {
      return <Badge variant="destructive">Vencida ({Math.abs(dias)} días)</Badge>;
    } else if (dias <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Próxima ({dias} días)
      </Badge>;
    } else if (dias <= 30) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        Programada ({dias} días)
      </Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Vigente ({dias} días)
      </Badge>;
    }
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "No registrada";
    return format(parseISO(fecha), "dd/MMM/yyyy", { locale: es });
  };

  const handleSave = () => {
    onUpdateFecha(producto.id, fechaEdit);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFechaEdit(producto.ultima_fumigacion || "");
    setIsEditing(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{producto.codigo}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{producto.nombre}</p>
          </div>
          {getEstadoBadge()}
        </div>

        {/* Info básica */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {producto.marca && <span>{producto.marca}</span>}
          {producto.marca && producto.presentacion && <span>•</span>}
          {producto.presentacion && <span>{producto.presentacion}</span>}
          <span>•</span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            Stock: {producto.stock_actual}
          </span>
        </div>

        {/* Fechas */}
        <div className="space-y-2 text-sm border-t pt-2">
          {/* Última fumigación - editable */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Última:</span>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={fechaEdit}
                  onChange={(e) => setFechaEdit(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span>{formatFecha(producto.ultima_fumigacion)}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Próxima fumigación */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Próxima:</span>
            </div>
            <span>{formatFecha(producto.proxima_fumigacion)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
