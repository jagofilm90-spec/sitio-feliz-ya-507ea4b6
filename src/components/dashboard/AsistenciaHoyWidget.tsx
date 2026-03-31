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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const hoy = new Date().toISOString().split("T")[0];

      // Get employees with zk_id (those who should check in)
      const { data: emps } = await (supabase as any)
        .from("empleados")
        .select("id, zk_id")
        .eq("activo", true)
        .not("zk_id", "is", null);

      const totalEmps = emps?.length || 0;
      setTotal(totalEmps);

      if (totalEmps === 0) {
        setPresentes(0);
        setAusentes(0);
        setLoading(false);
        return;
      }

      // Get today's attendance
      const { data: asist } = await supabase
        .from("asistencia")
        .select("empleado_id")
        .eq("fecha", hoy);

      const presenteIds = new Set((asist || []).map(a => a.empleado_id).filter(Boolean));
      const pres = (emps || []).filter((e: any) => presenteIds.has(e.id)).length;

      setPresentes(pres);
      setAusentes(totalEmps - pres);
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
          {presentes} presentes · {ausentes} ausentes de {total}
        </p>
      </CardContent>
    </Card>
  );
}
