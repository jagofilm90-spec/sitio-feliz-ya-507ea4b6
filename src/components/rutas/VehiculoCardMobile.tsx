import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Edit, Trash2, FileText, User, Scale, Calendar, Shield, AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Vehiculo {
  id: string;
  nombre: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  capacidad_kg_local: number | null;
  capacidad_kg_foranea: number | null;
  chofer_asignado: string | null;
  tarjeta_circulacion_vencimiento: string | null;
  poliza_seguro_vencimiento: string | null;
  status: string | null;
}

interface VehiculoCardMobileProps {
  vehiculo: Vehiculo;
  choferName: string | null;
  onEdit: (vehiculo: Vehiculo) => void;
  onDelete: (vehiculo: Vehiculo) => void;
  onViewDocs?: (vehiculo: Vehiculo) => void;
}

export function VehiculoCardMobile({ 
  vehiculo, 
  choferName, 
  onEdit, 
  onDelete,
  onViewDocs 
}: VehiculoCardMobileProps) {
  
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "disponible":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Disponible</Badge>;
      case "en_ruta":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">En Ruta</Badge>;
      case "mantenimiento":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Mantenimiento</Badge>;
      default:
        return <Badge variant="secondary">{status || "Sin estado"}</Badge>;
    }
  };

  const getDocAlert = (fecha: string | null, tipo: string) => {
    if (!fecha) return null;
    const dias = differenceInDays(parseISO(fecha), new Date());
    
    if (dias < 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>{tipo} vencida</span>
        </div>
      );
    }
    if (dias <= 30) {
      return (
        <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          <span>{tipo} vence en {dias} días</span>
        </div>
      );
    }
    return null;
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "No registrada";
    return format(parseISO(fecha), "dd/MMM/yyyy", { locale: es });
  };

  const tarjetaAlert = getDocAlert(vehiculo.tarjeta_circulacion_vencimiento, "Tarjeta");
  const polizaAlert = getDocAlert(vehiculo.poliza_seguro_vencimiento, "Póliza");

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Truck className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{vehiculo.nombre}</p>
              <p className="text-xs text-muted-foreground">
                Placa: {vehiculo.placa} • {vehiculo.marca} {vehiculo.anio}
              </p>
            </div>
          </div>
          {getStatusBadge(vehiculo.status)}
        </div>

        {/* Chofer */}
        {choferName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{choferName}</span>
          </div>
        )}

        {/* Capacidades */}
        <div className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <span>
            Local: {vehiculo.capacidad_kg_local?.toLocaleString() || "—"} kg
            {vehiculo.capacidad_kg_foranea && ` • Foránea: ${vehiculo.capacidad_kg_foranea.toLocaleString()} kg`}
          </span>
        </div>

        {/* Documentos */}
        <div className="space-y-1 text-sm border-t pt-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Tarjeta: {formatFecha(vehiculo.tarjeta_circulacion_vencimiento)}</span>
          </div>
          {tarjetaAlert}
          
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>Póliza: {formatFecha(vehiculo.poliza_seguro_vencimiento)}</span>
          </div>
          {polizaAlert}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(vehiculo)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          {onViewDocs && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDocs(vehiculo)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(vehiculo)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
