import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, RefreshCw } from "lucide-react";
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
    <Card className="border-dashed max-w-lg mx-auto md:mt-8 animate-fade-in">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="rounded-full bg-primary/10 p-5">
          <Truck className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Sin ruta asignada</h2>
        <p className="text-muted-foreground">{getMensaje(now.getHours())}</p>
        <p className="text-sm text-muted-foreground/70">
          {format(now, "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })}
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Verificar rutas
        </Button>
      </CardContent>
    </Card>
  );
}
