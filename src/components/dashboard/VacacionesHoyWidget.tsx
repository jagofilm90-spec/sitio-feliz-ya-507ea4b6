import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Palmtree } from "lucide-react";

interface VacacionHoy {
  nombre: string;
  puesto: string;
  fecha_fin: string;
}

export function VacacionesHoyWidget() {
  const [vacaciones, setVacaciones] = useState<VacacionHoy[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados_vacaciones?status=eq.tomada&fecha_inicio=lte.${hoy}&fecha_fin=gte.${hoy}&select=empleado_id,fecha_fin`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;

      // Get employee names
      const ids = data.map((v: any) => v.empleado_id);
      const empRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?id=in.(${ids.join(",")})&select=id,nombre_completo,puesto`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      const emps = await empRes.json();
      if (!Array.isArray(emps)) return;

      const result: VacacionHoy[] = data.map((v: any) => {
        const emp = emps.find((e: any) => e.id === v.empleado_id);
        const [y, m, d] = v.fecha_fin.split("-");
        return { nombre: emp?.nombre_completo || "—", puesto: emp?.puesto || "", fecha_fin: `${d}/${m}/${y}` };
      });
      setVacaciones(result);
    };
    load();
  }, []);

  if (vacaciones.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Palmtree className="h-4 w-4 text-blue-500" />
        De vacaciones hoy ({vacaciones.length})
      </h3>
      <div className="space-y-1">
        {vacaciones.map((v) => (
          <div key={v.nombre} className="flex items-center justify-between text-xs">
            <span><strong>{v.nombre}</strong> — {v.puesto}</span>
            <span className="text-muted-foreground">Regresa {v.fecha_fin}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
