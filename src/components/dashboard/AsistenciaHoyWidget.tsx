import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Fingerprint } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AsistenciaHoyWidget() {
  const navigate = useNavigate();
  const [presentes, setPresentes] = useState(0);
  const [ausentes, setAusentes] = useState(0);
  const [total, setTotal] = useState(0);
  const [ausentesNombres, setAusentesNombres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const hoy = new Date().toISOString().split("T")[0];

      const { data: emps } = await (supabase as any)
        .from("empleados")
        .select("id, nombre_completo, zk_id")
        .eq("activo", true)
        .not("zk_id", "is", null);

      const totalEmps = emps?.length || 0;
      setTotal(totalEmps);

      if (totalEmps === 0) {
        setPresentes(0);
        setAusentes(0);
        setAusentesNombres([]);
        setLoading(false);
        return;
      }

      const { data: asist } = await supabase
        .from("asistencia")
        .select("empleado_id")
        .eq("fecha", hoy);

      const presenteIds = new Set((asist || []).map(a => a.empleado_id).filter(Boolean));
      const pres = (emps || []).filter((e: any) => presenteIds.has(e.id)).length;
      const ausentesList = (emps || [])
        .filter((e: any) => !presenteIds.has(e.id))
        .map((e: any) => e.nombre_completo.split(" ").slice(0, 2).join(" "));

      setPresentes(pres);
      setAusentes(totalEmps - pres);
      setAusentesNombres(ausentesList);
      setLoading(false);
    };

    load();
  }, []);

  if (loading || total === 0) return null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate("/asistencia")}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Fingerprint className="h-4 w-4" />
          Asistencia Hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{presentes}</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1.5">
            <UserX className="h-4 w-4 text-red-500" />
            <span className="text-2xl font-bold text-red-500">{ausentes}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {presentes} presentes de {total}
        </p>
        {ausentesNombres.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">No han llegado:</p>
            <div className="flex flex-wrap gap-1">
              {ausentesNombres.slice(0, 5).map((name, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {name}
                </Badge>
              ))}
              {ausentesNombres.length > 5 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{ausentesNombres.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
