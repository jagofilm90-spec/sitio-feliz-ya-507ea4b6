import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  AlertTriangle,
  Edit,
  FileStack,
  FileText,
  Mail,
  Phone,
  User,
  Calendar,
  Briefcase
} from "lucide-react";

interface EmpleadoDocumento {
  id: string;
  tipo_documento: string;
  fecha_vencimiento: string | null;
}

interface Empleado {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  email: string | null;
  fecha_ingreso: string;
  puesto: string;
  activo: boolean;
}

interface EmpleadoCardMobileProps {
  empleado: Empleado;
  documentos: EmpleadoDocumento[];
  documentosPendientes: { id: string }[];
  onEdit: (empleado: Empleado) => void;
  onViewDocs: (empleadoId: string) => void;
  onAnalyzeExpediente: (empleado: Empleado) => void;
}

const PUESTOS_LABELS: Record<string, string> = {
  chofer: "Chofer",
  vendedor: "Vendedor",
  secretaria: "Secretaria",
  almacenista: "Almacenista",
  "gerente de almacén": "Gerente Almacén",
  admin: "Admin",
};

export const EmpleadoCardMobile = ({
  empleado,
  documentos,
  documentosPendientes,
  onEdit,
  onViewDocs,
  onAnalyzeExpediente,
}: EmpleadoCardMobileProps) => {
  const pendientesCount = documentosPendientes.length;
  const docsCount = documentos.length;
  
  // Verificar si hay documentos próximos a vencer (30 días)
  const hoy = new Date();
  const docsProximosVencer = documentos.filter(doc => {
    if (!doc.fecha_vencimiento) return false;
    const vencimiento = new Date(doc.fecha_vencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30 && diasRestantes > 0;
  });

  return (
    <Card className={cn(
      "border-l-4",
      !empleado.activo && "opacity-60 border-l-muted",
      empleado.activo && pendientesCount > 0 && "border-l-amber-500",
      empleado.activo && pendientesCount === 0 && docsProximosVencer.length > 0 && "border-l-orange-400",
      empleado.activo && pendientesCount === 0 && docsProximosVencer.length === 0 && "border-l-primary"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Avatar, nombre y estado */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">
                {empleado.nombre_completo}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {PUESTOS_LABELS[empleado.puesto] || empleado.puesto}
                </span>
              </div>
            </div>
          </div>
          
          <Badge variant={empleado.activo ? "default" : "destructive"} className="text-[10px] shrink-0">
            {empleado.activo ? "Activo" : "Baja"}
          </Badge>
        </div>

        {/* Info de contacto */}
        <div className="space-y-1.5 text-sm">
          {empleado.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs truncate">{empleado.email}</span>
            </div>
          )}
          {empleado.telefono && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">{empleado.telefono}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">
              Ingreso: {format(new Date(empleado.fecha_ingreso), "dd/MMM/yyyy", { locale: es })}
            </span>
          </div>
        </div>

        {/* Estado de documentos */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {docsCount} documentos
            </span>
          </div>
          
          {pendientesCount > 0 && (
            <Badge variant="outline" className="text-[10px] flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3 w-3" />
              {pendientesCount} pendientes
            </Badge>
          )}
          
          {pendientesCount === 0 && docsProximosVencer.length > 0 && (
            <Badge variant="outline" className="text-[10px] flex items-center gap-1 bg-orange-50 text-orange-700 border-orange-200">
              <AlertTriangle className="h-3 w-3" />
              {docsProximosVencer.length} por vencer
            </Badge>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewDocs(empleado.id)}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Documentos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onAnalyzeExpediente(empleado)}
          >
            <FileStack className="h-3.5 w-3.5 mr-1" />
            Expediente
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onEdit(empleado)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
