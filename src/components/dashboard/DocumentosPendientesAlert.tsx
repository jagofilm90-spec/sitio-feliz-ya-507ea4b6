import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileWarning } from "lucide-react";

const DOCS_OBLIGATORIOS = ["ine", "curp", "rfc", "acta_nacimiento", "comprobante_domicilio", "nss", "cuenta_bancaria", "fotos"];

interface EmpIncompleto {
  nombre: string;
  faltantes: number;
  total: number;
}

export function DocumentosPendientesAlert() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState<EmpIncompleto[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?activo=eq.true&select=id,nombre_completo`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      const emps = await res.json();
      if (!Array.isArray(emps)) return;

      const resultado: EmpIncompleto[] = [];
      for (const emp of emps) {
        const { data: files } = await supabase.storage.from("empleados-documentos").list(`${emp.id}/docs`, { limit: 100 });
        const keys = new Set((files || []).map((f: any) => f.name.split("_")[0]));
        const faltantes = DOCS_OBLIGATORIOS.filter(k => !keys.has(k)).length;
        if (faltantes > 0) {
          resultado.push({ nombre: emp.nombre_completo, faltantes, total: DOCS_OBLIGATORIOS.length });
        }
      }
      resultado.sort((a, b) => b.faltantes - a.faltantes);
      setEmpleados(resultado);
    };
    load();
  }, []);

  if (empleados.length === 0) return null;

  return (
    <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/empleados")}>
      <div className="flex items-center gap-2 mb-2">
        <FileWarning className="h-4 w-4 text-orange-500" />
        <span className="font-semibold text-sm">
          {empleados.length} empleado{empleados.length !== 1 ? "s" : ""} con expediente incompleto
        </span>
      </div>
      <div className="space-y-1">
        {empleados.slice(0, 5).map((emp) => (
          <div key={emp.nombre} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate">{emp.nombre}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {emp.total - emp.faltantes}/{emp.total}
            </Badge>
          </div>
        ))}
        {empleados.length > 5 && (
          <p className="text-xs text-muted-foreground">y {empleados.length - 5} más...</p>
        )}
      </div>
    </Card>
  );
}
