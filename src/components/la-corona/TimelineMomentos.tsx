import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, MapPin, Camera, FileText, Truck, User, Brain, Shield } from "lucide-react";
import { useMomentosClave, useEventosConciliacion } from "@/hooks/useLaCorona";

const MOMENTO_ICONS: Record<string, any> = {
  almacen_surte: FileText,
  sistema_imprime_hoja: FileText,
  chofer_recibe_mercancia: Truck,
  chofer_sale_bodega: MapPin,
  chofer_en_ruta: MapPin,
  cliente_recibe_fisico: Camera,
  ia_procesa_hoja: Brain,
  chofer_regresa_bodega: MapPin,
  reconciliacion_final: Shield,
};

interface Props {
  entregaId: string;
}

export default function TimelineMomentos({ entregaId }: Props) {
  const { data: momentos, isLoading: loadingMomentos } = useMomentosClave();
  const { data: eventos, isLoading: loadingEventos } = useEventosConciliacion(entregaId);

  if (loadingMomentos || loadingEventos) {
    return <Skeleton className="h-40 w-full" />;
  }

  const completedMomentos = new Set((eventos || []).map((e: any) => e.momento_id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#c41e3a]" /> Timeline 9 Momentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-3">
            {(momentos || []).map((m: any) => {
              const completed = completedMomentos.has(m.id);
              const evento = (eventos || []).find((e: any) => e.momento_id === m.id);
              const Icon = MOMENTO_ICONS[m.id] || Clock;

              return (
                <div key={m.id} className="flex items-start gap-3 relative">
                  <div
                    className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 ${
                      completed
                        ? "bg-green-50 border-green-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    {completed ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${completed ? "text-green-700" : "text-gray-500"}`}>
                        {m.orden_secuencia}. {m.nombre}
                      </span>
                      {m.bloqueante && !completed && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0">requerido</Badge>
                      )}
                    </div>
                    {evento && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(evento.timestamp_evento).toLocaleString("es-MX")}
                        {evento.notas && ` — ${evento.notas}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
