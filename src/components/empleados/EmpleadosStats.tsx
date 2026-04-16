import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Users, FileCheck, AlertTriangle, FolderOpen } from "lucide-react";

export function EmpleadosStats() {
  const [stats, setStats] = useState({
    totalActivos: 0,
    desglose: "",
    conContrato: 0,
    sinContrato: 0,
    licVencidas: 0,
    licVencidasNombres: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: empleados } = await (supabase as any)
        .from("empleados")
        .select("id, puesto, contrato_firmado_fecha, licencia_vencimiento, nombre_completo")
        .eq("activo", true);

      const emps = empleados || [];
      const totalActivos = emps.length;

      // Desglose por puesto
      const puestoCount: Record<string, number> = {};
      emps.forEach((e: any) => { puestoCount[e.puesto] = (puestoCount[e.puesto] || 0) + 1; });
      const desglose = Object.entries(puestoCount)
        .sort((a, b) => b[1] - a[1])
        .map(([p, n]) => `${n} ${p.toLowerCase()}${n > 1 ? "s" : ""}`)
        .join(" · ");

      // Contrato
      const conContrato = emps.filter((e: any) => e.contrato_firmado_fecha).length;
      const sinContrato = totalActivos - conContrato;

      // Licencias vencidas (choferes)
      const hoy = new Date().toISOString().split("T")[0];
      const choferes = emps.filter((e: any) => e.puesto === "Chofer" && e.licencia_vencimiento);
      const vencidas = choferes.filter((e: any) => e.licencia_vencimiento < hoy);
      const nombres = vencidas.slice(0, 2).map((e: any) => e.nombre_completo.split(" ")[0]).join(", ")
        + (vencidas.length > 2 ? ` y ${vencidas.length - 2} más` : "");

      setStats({ totalActivos, desglose, conContrato, sinContrato, licVencidas: vencidas.length, licVencidasNombres: nombres });
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded) return null;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total activos"
        value={stats.totalActivos}
        icon={<Users className="h-4 w-4" />}
        meta={stats.desglose}
      />
      <StatCard
        label="Con contrato"
        value={stats.conContrato}
        icon={<FileCheck className="h-4 w-4" />}
        meta={stats.sinContrato > 0
          ? <span className={stats.sinContrato > stats.conContrato ? "text-crimson-500" : ""}>{stats.sinContrato} sin contrato firmado</span>
          : "Todos con contrato"}
      />
      <StatCard
        label="Expediente"
        value="—"
        icon={<FolderOpen className="h-4 w-4" />}
        meta="Próximamente"
      />
      <StatCard
        label="Licencias vencidas"
        value={stats.licVencidas}
        icon={<AlertTriangle className="h-4 w-4" />}
        className={stats.licVencidas > 0 ? "border-crimson-300" : undefined}
        meta={stats.licVencidas > 0 ? stats.licVencidasNombres : "Todas vigentes"}
      />
    </div>
  );
}
