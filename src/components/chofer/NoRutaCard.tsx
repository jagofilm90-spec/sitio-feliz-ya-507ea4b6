import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function getMensaje(hora: number) {
  if (hora < 10) return "Buenos días, prepárate para una gran jornada";
  if (hora < 14) return "Sin rutas pendientes por el momento";
  return "Por hoy terminaste, ¡buen trabajo!";
}

interface NoRutaCardProps {
  onRefresh: () => void;
}

export function NoRutaCard({ onRefresh }: NoRutaCardProps) {
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center pt-32 md:pt-40 animate-fade-in">
      <h2 className="font-serif text-[28px] font-medium italic text-ink-400">
        Sin ruta asignada.
      </h2>
      <p className="text-[14px] text-ink-500 mt-2">{getMensaje(now.getHours())}</p>
      <p className="text-[11px] text-ink-400 italic mt-3">
        {format(now, "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        className="mt-6 text-ink-600 border-ink-200 hover:bg-ink-50"
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
        Verificar rutas
      </Button>
    </div>
  );
}
