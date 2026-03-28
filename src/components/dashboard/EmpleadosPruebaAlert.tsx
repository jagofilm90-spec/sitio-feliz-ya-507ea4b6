import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmpleadoPrueba {
  nombre_completo: string;
  puesto: string;
  fecha_vencimiento: string;
  dias_restantes: number;
}

export function EmpleadosPruebaAlert() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState<EmpleadoPrueba[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("empleados")
        .select("nombre_completo, puesto, fecha_ingreso")
        .eq("activo", true)
        .order("fecha_ingreso", { ascending: false });

      if (!data) return;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const enPrueba: EmpleadoPrueba[] = [];
      for (const emp of data) {
        const [y, m, d] = emp.fecha_ingreso.split("-").map(Number);
        const ingreso = new Date(y, m - 1, d);
        const vencimiento = new Date(ingreso);
        vencimiento.setDate(vencimiento.getDate() + 90);
        const dias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (dias > 0 && dias <= 14) {
          enPrueba.push({
            nombre_completo: emp.nombre_completo,
            puesto: emp.puesto,
            fecha_vencimiento: `${vencimiento.getDate()}/${vencimiento.getMonth() + 1 < 10 ? "0" : ""}${vencimiento.getMonth() + 1}/${vencimiento.getFullYear()}`,
            dias_restantes: dias,
          });
        }
      }
      setEmpleados(enPrueba.sort((a, b) => a.dias_restantes - b.dias_restantes));
    };
    load();
  }, []);

  if (empleados.length === 0) return null;

  return (
    <Card
      className="p-4 border-yellow-300 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors"
      onClick={() => navigate("/empleados")}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span className="font-semibold text-sm text-yellow-800">
          Periodo de prueba por vencer ({empleados.length})
        </span>
      </div>
      <div className="space-y-1">
        {empleados.map((emp) => (
          <div key={emp.nombre_completo} className="flex items-center justify-between text-xs">
            <span className="text-yellow-900">{emp.nombre_completo} — {emp.puesto}</span>
            <Badge
              variant={emp.dias_restantes <= 7 ? "destructive" : "outline"}
              className={emp.dias_restantes <= 7 ? "animate-pulse text-xs" : "text-xs bg-yellow-100 border-yellow-400 text-yellow-700"}
            >
              {emp.dias_restantes}d — {emp.fecha_vencimiento}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
