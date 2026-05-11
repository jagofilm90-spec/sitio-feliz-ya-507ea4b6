import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, MapPin, Camera, FileText, Truck, Brain, Shield, User } from "lucide-react";
import { useMomentosClave } from "@/hooks/useLaCorona";
import { useEventosConciliacion } from "@/hooks/useHojaSalida";

const ICONS: Record<string, any> = {
  almacen_surte: FileText,
  sistema_genera_hoja: FileText,
  chofer_recibe: Truck,
  chofer_sale: MapPin,
  en_ruta: MapPin,
  cliente_sella_firma: Camera,
  ia_procesa: Brain,
  chofer_regresa: MapPin,
  reconciliacion_final: Shield,
};

interface Props {
  hojaSalidaId: string;
}

export default function TimelineMomentos({ hojaSalidaId }: Props) {
  const { data: momentos, isLoading: m1 } = useMomentosClave();
  const { data: eventos, isLoading: m2 } = useEventosConciliacion(hojaSalidaId);

  if (m1 || m2) return <Skeleton className="h-40 w-full" />;

  const completedSet = new Set((eventos || []).map((e: any) => e.momento_id));
  const anomaliaSet = new Set((eventos || []).filter((e: any) => e.tiene_anomalia).map((e: any) => e.momento_id));

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
              const done = completedSet.has(m.id);
              const hasAnomalia = anomaliaSet.has(m.id);
              const evento = (eventos || []).find((e: any) => e.momento_id === m.id);
              const Icon = ICONS[m.id] || Clock;

              return (
                <div key={m.id} className="flex items-start gap-3 relative">
                  <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 ${
                    hasAnomalia ? "bg-red-50 border-red-400" :
                    done ? "bg-[#c41e3a] border-[#c41e3a]" :
                    "bg-white border-gray-200"
                  }`}>
                    {done ? (
                      <Check className={`h-3.5 w-3.5 ${hasAnomalia ? "text-red-600" : "text-white"}`} />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${done ? (hasAnomalia ? "text-red-700" : "text-gray-900") : "text-gray-400"}`}>
                        {m.orden_secuencia}. {m.nombre}
                      </span>
                      {m.bloqueante && !done && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0">requerido</Badge>
                      )}
                      {hasAnomalia && (
                        <Badge className="text-[8px] bg-red-100 text-red-800">anomalía</Badge>
                      )}
                    </div>
                    {evento && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(evento.completado_at || evento.created_at).toLocaleString("es-MX")}
                        {evento.usuario_nombre && ` — ${evento.usuario_nombre}`}
                        {evento.duracion_segundos && ` (${Math.round(evento.duracion_segundos / 60)}min)`}
                      </p>
                    )}
                    {evento?.notas && <p className="text-[10px] text-muted-foreground italic">{evento.notas}</p>}
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
