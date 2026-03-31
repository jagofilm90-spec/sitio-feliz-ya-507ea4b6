import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Fingerprint } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function AsistenciaHoyWidget() {
  const navigate = useNavigate();
  const [presentes, setPresentes] = useState(0);
  const [ausentes, setAusentes] = useState(0);
  const [total, setTotal] = useState(0);
  const [ausentesNombres, setAusentesNombres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const h = { "apikey": KEY, "Authorization": `Bearer ${session.access_token}` };
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

      // Get mapped employees from zk_mapeo
      const mapRes = await fetch(`${API}/rest/v1/zk_mapeo?select=empleado_id`, { headers: h });
      const mapData = await mapRes.json();
      const mappedIds = new Set(Array.isArray(mapData) ? mapData.map((m: any) => m.empleado_id) : []);
      if (mappedIds.size === 0) { setLoading(false); return; }

      // Get employee names
      const empRes = await fetch(`${API}/rest/v1/empleados?activo=eq.true&select=id,nombre_completo`, { headers: h });
      const emps = (await empRes.json()) as any[];
      const mappedEmps = Array.isArray(emps) ? emps.filter(e => mappedIds.has(e.id)) : [];
      setTotal(mappedEmps.length);

      // Get today's attendance
      const aRes = await fetch(`${API}/rest/v1/asistencia?fecha=eq.${hoy}&select=empleado_id`, { headers: h });
      const aData = await aRes.json();
      const presenteIds = new Set(Array.isArray(aData) ? aData.map((a: any) => a.empleado_id).filter(Boolean) : []);

      const pres = mappedEmps.filter(e => presenteIds.has(e.id)).length;
      const ausentesList = mappedEmps.filter(e => !presenteIds.has(e.id)).map(e => e.nombre_completo.split(" ").slice(0, 2).join(" "));

      setPresentes(pres);
      setAusentes(mappedEmps.length - pres);
      setAusentesNombres(ausentesList);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || total === 0) return null;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/asistencia")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Fingerprint className="h-4 w-4" />Asistencia Hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5"><UserCheck className="h-4 w-4 text-green-600" /><span className="text-2xl font-bold text-green-600">{presentes}</span></div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1.5"><UserX className="h-4 w-4 text-red-500" /><span className="text-2xl font-bold text-red-500">{ausentes}</span></div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{presentes} presentes de {total}</p>
        {ausentesNombres.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">No han llegado:</p>
            <div className="flex flex-wrap gap-1">
              {ausentesNombres.slice(0, 5).map((name, i) => (<Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{name}</Badge>))}
              {ausentesNombres.length > 5 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{ausentesNombres.length - 5}</Badge>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
