import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Users, UserCheck, AlertTriangle, XCircle } from "lucide-react";
import { format, startOfWeek, addDays, isAfter } from "date-fns";

const HORA_LIMITE_MINS = 8 * 60 + 30;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface EmpleadoBasic {
  id: string;
  puesto: string;
  premio_asistencia_semanal: number | null;
  dias_laborales: string[] | null;
  periodo_pago: string | null;
}

const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };

export function AsistenciaStats() {
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    desglosePuestos: "",
    presentesHoy: 0,
    sinCheck: 0,
    horaActual: "",
    retardosSemana: 0,
    pierdenPremio: 0,
    motivoResumen: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      const horaActualMx = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
      const horaStr = `${String(horaActualMx.getHours()).padStart(2, "0")}:${String(horaActualMx.getMinutes()).padStart(2, "0")}`;
      const lunes = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const sabado = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd");

      const [{ data: empleados }, { data: registrosHoy }, { data: registrosSemana }, { data: mapeo }] = await Promise.all([
        (supabase as any).from("empleados").select("id, puesto, premio_asistencia_semanal, dias_laborales, periodo_pago").eq("activo", true),
        supabase.from("asistencia").select("empleado_id").eq("fecha", hoy),
        supabase.from("asistencia").select("empleado_id, fecha, hora").gte("fecha", lunes).lte("fecha", sabado).order("hora", { ascending: true }),
        (supabase as any).from("zk_mapeo").select("empleado_id"),
      ]);

      const mappedIds = new Set((mapeo || []).map((m: any) => m.empleado_id));
      const emps = ((empleados || []) as EmpleadoBasic[]).filter(e => mappedIds.has(e.id));
      const totalEmpleados = emps.length;

      // Desglose por puesto
      const puestoCount: Record<string, number> = {};
      emps.forEach(e => { puestoCount[e.puesto] = (puestoCount[e.puesto] || 0) + 1; });
      const desglosePuestos = Object.entries(puestoCount).map(([p, n]) => `${n} ${p.toLowerCase()}${n > 1 ? "s" : ""}`).join(" · ");

      // Presentes hoy
      const presentesIds = new Set((registrosHoy || []).map((r: any) => r.empleado_id).filter(Boolean));
      const presentesHoy = emps.filter(e => presentesIds.has(e.id)).length;
      const sinCheck = totalEmpleados - presentesHoy;

      // Retardos semana + pierden premio (solo semanales)
      const today = new Date();
      const diasSemana: { dateStr: string; diaKey: string; date: Date }[] = [];
      for (let i = 0; i < 6; i++) {
        const d = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
        diasSemana.push({ dateStr: format(d, "yyyy-MM-dd"), diaKey: DIA_MAP[d.getDay()], date: d });
      }

      let totalRetardos = 0;
      let pierdenPremio = 0;
      let porFaltas = 0;
      let porRetardos = 0;

      const semanales = emps.filter(e => e.periodo_pago === "semanal");
      for (const emp of semanales) {
        const diasLab = emp.dias_laborales || ["lun", "mar", "mie", "jue", "vie", "sab"];
        const empRegs = (registrosSemana || []).filter((r: any) => r.empleado_id === emp.id);

        let faltas = 0;
        let retardos = 0;
        for (const dia of diasSemana) {
          if (!diasLab.includes(dia.diaKey)) continue;
          if (isAfter(dia.date, today)) continue;
          const regs = empRegs.filter((r: any) => r.fecha === dia.dateStr && r.hora).sort((a: any, b: any) => (a.hora || "").localeCompare(b.hora || ""));
          if (regs.length === 0) { faltas++; continue; }
          if (timeToMinutes(regs[0].hora) > HORA_LIMITE_MINS) { retardos++; totalRetardos++; }
        }
        if (faltas >= 1 || retardos >= 2) {
          pierdenPremio++;
          if (faltas >= 1) porFaltas++;
          else porRetardos++;
        }
      }

      const partes: string[] = [];
      if (porFaltas > 0) partes.push(`${porFaltas} por faltas`);
      if (porRetardos > 0) partes.push(`${porRetardos} por retardos`);

      setStats({
        totalEmpleados,
        desglosePuestos,
        presentesHoy,
        sinCheck,
        horaActual: horaStr,
        retardosSemana: totalRetardos,
        pierdenPremio,
        motivoResumen: partes.join(" · "),
      });
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded) return null;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Empleados activos"
        value={stats.totalEmpleados}
        icon={<Users className="h-4 w-4" />}
        meta={stats.desglosePuestos}
      />
      <StatCard
        label="Presentes hoy"
        value={`${stats.presentesHoy} de ${stats.totalEmpleados}`}
        icon={<UserCheck className="h-4 w-4" />}
        meta={stats.sinCheck > 0 ? <span className="text-crimson-500">{stats.sinCheck} sin check a las {stats.horaActual}</span> : "Todos checaron"}
      />
      <StatCard
        label="Retardos semana"
        value={stats.retardosSemana}
        icon={<AlertTriangle className="h-4 w-4" />}
        className={stats.retardosSemana > 0 ? "border-amber-300" : undefined}
      />
      <StatCard
        label="Pierden premio"
        value={stats.pierdenPremio}
        icon={<XCircle className="h-4 w-4" />}
        className={stats.pierdenPremio > 0 ? "border-crimson-300" : undefined}
        meta={stats.motivoResumen || "Todos conservan premio"}
      />
    </div>
  );
}
