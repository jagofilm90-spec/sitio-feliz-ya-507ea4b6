import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

interface LicenciaAlerta {
  nombre: string;
  vencimiento: string;
  dias: number;
  vencida: boolean;
}

export function LicenciasVencimientoAlert() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<LicenciaAlerta[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?activo=eq.true&puesto=in.(Chofer,"Ayudante de Chofer")&licencia_vencimiento=not.is.null&select=nombre_completo,licencia_vencimiento`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
      hoy.setHours(0, 0, 0, 0);
      const resultado: LicenciaAlerta[] = [];
      for (const emp of data) {
        const [y, m, d] = emp.licencia_vencimiento.split("-").map(Number);
        const venc = new Date(y, m - 1, d);
        const dias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (dias <= 30) resultado.push({ nombre: emp.nombre_completo, vencimiento: `${d}/${m}/${y}`, dias, vencida: dias < 0 });
      }
      resultado.sort((a, b) => a.dias - b.dias);
      setAlertas(resultado);
    };
    load();
  }, []);

  if (alertas.length === 0) return null;

  return (
    <Card className="p-4 border-orange-200 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/empleados?tab=chofer")}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span className="font-semibold text-sm">Licencias de conducir ({alertas.length})</span>
      </div>
      <div className="space-y-1">
        {alertas.map((a) => (
          <div key={a.nombre} className="flex items-center justify-between text-xs">
            <span className="truncate">{a.nombre}</span>
            <Badge variant={a.vencida ? "destructive" : "outline"} className={`text-xs ${!a.vencida ? "bg-yellow-50 text-yellow-700 border-yellow-300" : ""}`}>
              {a.vencida ? "VENCIDA" : `Vence ${a.vencimiento}`}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
