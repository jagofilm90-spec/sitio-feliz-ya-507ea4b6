import { Bell, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useAlertasActivas, useMarcarAlertaVista } from "@/hooks/useGPSGeofence";

const SEV_COLORS: Record<string, string> = {
  info: "text-blue-600",
  media: "text-amber-600",
  alta: "text-orange-600",
  critica: "text-red-600",
};

export default function AlertasBell() {
  const { data: alertas } = useAlertasActivas();
  const navigate = useNavigate();
  const marcarVista = useMarcarAlertaVista();

  const count = alertas?.length || 0;
  const criticas = alertas?.filter((a: any) => a.severidad === "critica").length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 ${criticas > 0 ? "animate-pulse text-red-600" : ""}`} />
          {count > 0 && (
            <Badge
              variant={criticas > 0 ? "destructive" : "default"}
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h3 className="text-sm font-semibold">Alertas LA CORONA</h3>
          <p className="text-[10px] text-muted-foreground">{count} activa{count !== 1 ? "s" : ""}</p>
        </div>
        <ScrollArea className="max-h-80">
          {!count ? (
            <p className="text-center py-8 text-xs text-muted-foreground">Sin alertas activas</p>
          ) : (
            <div className="divide-y">
              {(alertas || []).slice(0, 10).map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 hover:bg-accent/50 cursor-pointer"
                  onClick={() => { marcarVista.mutate(a.id); navigate("/la-corona"); }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${SEV_COLORS[a.severidad] || ""}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.titulo}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{a.mensaje}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(a.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {count > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs text-[#c41e3a]" onClick={() => navigate("/la-corona")}>
              Ver todas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
