import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartaPorteEventos } from "@/hooks/useCartasPorte";
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Stamp,
  Edit,
  Shield,
  Clock,
} from "lucide-react";

const EVENTO_ICONS: Record<string, { icon: any; color: string }> = {
  creado: { icon: FileText, color: "text-gray-500" },
  editado: { icon: Edit, color: "text-blue-500" },
  validacion_solicitada: { icon: Shield, color: "text-blue-600" },
  validacion_exitosa: { icon: CheckCircle, color: "text-green-600" },
  validacion_fallida: { icon: AlertTriangle, color: "text-amber-600" },
  timbrado_exitoso: { icon: Stamp, color: "text-green-700" },
  timbrado_fallido: { icon: XCircle, color: "text-red-600" },
  timbrado: { icon: Stamp, color: "text-green-700" },
  cancelado: { icon: XCircle, color: "text-red-700" },
  cancelacion_fallida: { icon: AlertTriangle, color: "text-red-500" },
};

interface Props {
  cartaPorteId: string;
}

export default function AuditoriaTab({ cartaPorteId }: Props) {
  const { data: eventos, isLoading } = useCartaPorteEventos(cartaPorteId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Auditoría LA CORONA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!eventos?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay eventos registrados.
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

            <div className="space-y-4">
              {eventos.map((ev: any) => {
                const config = EVENTO_ICONS[ev.tipo_evento] || { icon: FileText, color: "text-gray-400" };
                const Icon = config.icon;

                return (
                  <div key={ev.id} className="flex items-start gap-3 relative">
                    <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full bg-white border-2 border-gray-200 flex items-center justify-center`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {ev.tipo_evento}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString("es-MX")}
                        </span>
                      </div>
                      {ev.usuario_nombre && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          por {ev.usuario_nombre}
                        </p>
                      )}
                      {ev.detalle && Object.keys(ev.detalle).length > 0 && (
                        <pre className="text-[9px] text-muted-foreground bg-gray-50 rounded p-1 mt-1 overflow-x-auto">
                          {JSON.stringify(ev.detalle, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
