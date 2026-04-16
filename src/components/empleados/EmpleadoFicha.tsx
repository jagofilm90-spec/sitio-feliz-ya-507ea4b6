import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Truck, Check, X, AlertTriangle, Trophy } from "lucide-react";
import { format, startOfWeek, addDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentosChecklist } from "./DocumentosChecklist";
import { ActasAdministrativas } from "./ActasAdministrativas";
import { VacacionesEmpleado } from "./VacacionesEmpleado";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Empleado {
  id: string;
  nombre_completo: string;
  nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  puesto: string;
  activo: boolean;
  fecha_ingreso: string;
  sueldo_bruto: number | null;
  premio_asistencia_semanal: number | null;
  periodo_pago: string | null;
  telefono: string | null;
  email: string | null;
  curp: string | null;
  rfc: string | null;
  numero_seguro_social: string | null;
  fecha_nacimiento: string | null;
  tipo_sangre: string | null;
  estado_civil: string | null;
  nivel_estudios: string | null;
  numero_dependientes: number | null;
  beneficiario: string | null;
  cuenta_bancaria: string | null;
  clabe_interbancaria: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  emergencia_parentesco?: string | null;
  licencia_numero: string | null;
  licencia_tipo: string | null;
  licencia_vencimiento: string | null;
  dias_laborales?: string[] | null;
  contrato_firmado_fecha: string | null;
}

interface Props {
  empleado: Empleado;
  foto?: string;
  onBack: () => void;
  onEditar: () => void;
}

const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
const getInitials = (n: string) => { const p = n.split(" ").filter(Boolean); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase(); };
const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const HORA_LIMITE_MINS = 8 * 60 + 30;
const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };
const DIA_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function timeToMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function timeToAMPM(t: string) { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }

const tabClass = "px-0 py-3 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-crimson-500 data-[state=active]:border-b-2 data-[state=active]:border-crimson-500 rounded-none text-ink-500 font-medium text-sm";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-ink-800">{value || <span className="italic text-ink-300">Sin capturar</span>}</p>
    </div>
  );
}

function SectionHeading({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 pb-1 mb-3">
      <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ink-400">{title}</h3>
      {onEdit && <button onClick={onEdit} className="text-[11px] text-crimson-500 hover:underline">Editar</button>}
    </div>
  );
}

export function EmpleadoFicha({ empleado: e, foto, onBack, onEditar }: Props) {
  const { isAdmin } = useUserRoles();
  const esChofer = e.puesto.toLowerCase() === "chofer";
  const diasLab = (e as any).dias_laborales || ["lun", "mar", "mie", "jue", "vie", "sab"];

  // Antigüedad
  const hoy = new Date();
  const [iy, im, id] = e.fecha_ingreso.split("-").map(Number);
  const ingreso = new Date(iy, im - 1, id);
  const totalMeses = Math.floor((hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  const antig = anos > 0 ? `${anos} año${anos !== 1 ? "s" : ""}${meses > 0 ? `, ${meses} m` : ""}` : `${meses} mes${meses !== 1 ? "es" : ""}`;

  // Licencia
  let licStatus: "vigente" | "vencida" | "por_vencer" | null = null;
  if (e.licencia_vencimiento) {
    const [ly, lm, ld] = e.licencia_vencimiento.split("-").map(Number);
    const venc = new Date(ly, lm - 1, ld);
    const dias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    licStatus = dias < 0 ? "vencida" : dias <= 30 ? "por_vencer" : "vigente";
  }

  // Vehicle (chofer only)
  const [vehiculo, setVehiculo] = useState<{ nombre: string; tipo: string; marca: string | null; modelo: string | null; anio: number | null } | null>(null);
  useEffect(() => {
    if (!esChofer) return;
    supabase.from("vehiculos").select("nombre, tipo, marca, modelo, anio").eq("chofer_asignado_id", e.id).eq("activo", true).limit(1).maybeSingle().then(({ data }) => setVehiculo(data));
  }, [e.id, esChofer]);

  // Attendance
  const [asistDias, setAsistDias] = useState<{ label: string; status: "puntual" | "retardo" | "falta" | "futuro" | "no_laboral"; hora: string | null }[]>([]);
  useEffect(() => {
    const load = async () => {
      const lunes = startOfWeek(new Date(), { weekStartsOn: 1 });
      const { data } = await supabase.from("asistencia").select("fecha, hora").eq("empleado_id", e.id).gte("fecha", format(lunes, "yyyy-MM-dd")).lte("fecha", format(addDays(lunes, 5), "yyyy-MM-dd")).order("hora", { ascending: true });
      const today = new Date();
      const result: typeof asistDias = [];
      for (let i = 0; i < 6; i++) {
        const d = addDays(lunes, i);
        const dateStr = format(d, "yyyy-MM-dd");
        const diaKey = DIA_MAP[d.getDay()];
        if (!diasLab.includes(diaKey)) { result.push({ label: DIA_LABELS[i], status: "no_laboral", hora: null }); continue; }
        if (isAfter(d, today)) { result.push({ label: DIA_LABELS[i], status: "futuro", hora: null }); continue; }
        const regs = (data || []).filter(r => r.fecha === dateStr && r.hora).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
        if (regs.length === 0) { result.push({ label: DIA_LABELS[i], status: "falta", hora: null }); }
        else { result.push({ label: DIA_LABELS[i], status: timeToMinutes(regs[0].hora!) > HORA_LIMITE_MINS ? "retardo" : "puntual", hora: regs[0].hora!.substring(0, 5) }); }
      }
      setAsistDias(result);
    };
    load();
  }, [e.id]);

  const faltas = asistDias.filter(d => d.status === "falta").length;
  const retardos = asistDias.filter(d => d.status === "retardo").length;
  const pierdePremio = faltas >= 1 || retardos >= 2;
  const premioSemanal = e.premio_asistencia_semanal || 0;
  const premioGanado = pierdePremio ? 0 : premioSemanal;
  const motivo = faltas >= 1 ? `${faltas} falta${faltas > 1 ? "s" : ""}` : retardos >= 2 ? `${retardos} retardos` : null;

  // Sueldo historial
  const [sueldoHist, setSueldoHist] = useState<{ sueldo_anterior: number; sueldo_nuevo: number; fecha_inicio: string }[]>([]);
  useEffect(() => {
    supabase.from("empleados_historial_sueldo" as any).select("sueldo_anterior, sueldo_nuevo, fecha_inicio").eq("empleado_id", e.id).order("fecha_inicio", { ascending: false }).then(({ data }) => setSueldoHist((data || []) as any));
  }, [e.id]);

  const iconMap: Record<string, React.ReactNode> = {
    puntual: <Check className="h-5 w-5 text-green-600" />,
    retardo: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    falta: <X className="h-5 w-5 text-red-500" />,
    futuro: <span className="text-ink-300 text-sm">·</span>,
    no_laboral: <span className="text-ink-300 text-sm">—</span>,
  };
  const bgMap: Record<string, string> = {
    puntual: "bg-green-50 border-green-200",
    retardo: "bg-amber-50 border-amber-200",
    falta: "bg-red-50 border-red-200",
    futuro: "bg-ink-50 border-ink-100",
    no_laboral: "bg-ink-50/50 border-dashed border-ink-100",
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px]">
      {/* ── Sidebar ── */}
      <div className="w-full lg:w-[300px] shrink-0 bg-stone-50 border-b lg:border-b-0 lg:border-r border-ink-100 p-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-ink-500" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver a lista
        </Button>

        <div className="flex flex-col items-center text-center mb-6">
          {foto ? (
            <img src={foto} className="w-24 h-24 rounded-full object-cover mb-3" />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3" style={{ backgroundColor: getColor(e.nombre_completo) }}>
              {getInitials(e.nombre_completo)}
            </div>
          )}
          <h2 className="font-serif text-2xl font-medium text-ink-900">{e.nombre_completo}</h2>
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink-400 font-medium mt-1">{e.puesto}</p>
          <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
            <Badge variant={e.activo ? "default" : "secondary"}>{e.activo ? "Activo" : "Inactivo"}</Badge>
            {esChofer && licStatus && (
              <Badge variant="outline" className={licStatus === "vencida" ? "border-red-300 text-red-600 bg-red-50" : licStatus === "por_vencer" ? "border-amber-300 text-amber-600 bg-amber-50" : "border-green-300 text-green-600 bg-green-50"}>
                Lic. {licStatus === "vencida" ? "vencida" : licStatus === "por_vencer" ? "por vencer" : "vigente"}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-0 text-sm">
          <div className="flex justify-between py-1.5 border-b border-ink-100"><span className="text-ink-400 text-xs">Ingreso</span><span className="text-xs font-medium">{e.fecha_ingreso.split("-").reverse().join("/")}</span></div>
          <div className="flex justify-between py-1.5 border-b border-ink-100"><span className="text-ink-400 text-xs">Antigüedad</span><span className="text-xs font-medium">{antig}</span></div>
          {e.periodo_pago && <div className="flex justify-between py-1.5 border-b border-ink-100"><span className="text-ink-400 text-xs">Periodo</span><span className="text-xs font-medium capitalize">{e.periodo_pago}</span></div>}
          {e.telefono && <div className="flex justify-between py-1.5 border-b border-ink-100"><span className="text-ink-400 text-xs">Teléfono</span><span className="text-xs font-medium">{e.telefono}</span></div>}
          {e.email && <div className="flex justify-between py-1.5 border-b border-ink-100"><span className="text-ink-400 text-xs">Email</span><span className="text-xs font-medium truncate ml-2">{e.email}</span></div>}
        </div>

        {/* Unidad asignada (chofer only) */}
        {esChofer && (
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold flex items-center gap-1 mb-2"><Truck className="h-3.5 w-3.5" />Unidad asignada</p>
            {vehiculo ? (
              <div className="rounded-lg border bg-white p-3">
                <p className="font-serif text-3xl font-bold text-ink-900">{vehiculo.nombre}</p>
                <p className="text-xs text-ink-500 mt-0.5">{vehiculo.tipo}{vehiculo.marca ? ` · ${vehiculo.marca}` : ""}{vehiculo.modelo ? ` ${vehiculo.modelo}` : ""}{vehiculo.anio ? ` · ${vehiculo.anio}` : ""}</p>
              </div>
            ) : (
              <p className="text-xs italic text-ink-400">Sin unidad asignada</p>
            )}
          </div>
        )}

        <div className="mt-5">
          <Button size="sm" variant="outline" className="w-full" onClick={onEditar}><Edit className="h-3 w-3 mr-1.5" />Editar empleado</Button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0 p-6">
        <Tabs defaultValue="general">
          <TabsList className="bg-transparent border-b border-ink-100 rounded-none p-0 h-auto gap-6 mb-6">
            <TabsTrigger value="general" className={tabClass}>General</TabsTrigger>
            <TabsTrigger value="asistencia" className={tabClass}>Asistencia</TabsTrigger>
            <TabsTrigger value="documentos" className={tabClass}>Documentos</TabsTrigger>
            <TabsTrigger value="nomina" className={tabClass}>Nómina</TabsTrigger>
            <TabsTrigger value="actas" className={tabClass}>Actas</TabsTrigger>
            <TabsTrigger value="vacaciones" className={tabClass}>Vacaciones</TabsTrigger>
          </TabsList>

          {/* TAB GENERAL */}
          <TabsContent value="general" className="space-y-6">
            <div>
              <SectionHeading title="Datos personales" onEdit={onEditar} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Nombre" value={e.nombre} />
                <Field label="Primer apellido" value={e.primer_apellido} />
                <Field label="Segundo apellido" value={e.segundo_apellido} />
                <Field label="CURP" value={e.curp} />
                <Field label="RFC" value={e.rfc} />
                <Field label="NSS" value={e.numero_seguro_social} />
                <Field label="Fecha de nacimiento" value={e.fecha_nacimiento?.split("-").reverse().join("/")} />
                <Field label="Tipo de sangre" value={e.tipo_sangre} />
                <Field label="Estado civil" value={e.estado_civil} />
                <Field label="Nivel de estudios" value={e.nivel_estudios} />
                <Field label="Dependientes" value={e.numero_dependientes?.toString()} />
                <Field label="Beneficiario" value={e.beneficiario} />
              </div>
            </div>

            {e.contacto_emergencia_nombre && (
              <div>
                <SectionHeading title="Contacto de emergencia" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Nombre" value={e.contacto_emergencia_nombre} />
                  <Field label="Teléfono" value={e.contacto_emergencia_telefono} />
                  <Field label="Parentesco" value={(e as any).emergencia_parentesco} />
                </div>
              </div>
            )}

            {esChofer && (
              <div>
                <SectionHeading title="Licencia de manejo" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Número" value={e.licencia_numero} />
                  <Field label="Tipo" value={e.licencia_tipo} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-400 font-medium mb-0.5">Vencimiento</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-800">{e.licencia_vencimiento?.split("-").reverse().join("/") || <span className="italic text-ink-300">Sin capturar</span>}</span>
                      {licStatus === "vencida" && <Badge variant="destructive" className="text-[10px]">VENCIDA</Badge>}
                      {licStatus === "por_vencer" && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">Por vencer</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <SectionHeading title="Datos bancarios" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cuenta bancaria" value={e.cuenta_bancaria} />
                <Field label="CLABE interbancaria" value={e.clabe_interbancaria} />
              </div>
            </div>

            <div>
              <SectionHeading title="Días laborales" />
              <div className="flex gap-1.5 mb-2">
                {["lun", "mar", "mie", "jue", "vie", "sab", "dom"].map(d => (
                  <span key={d} className={`w-10 h-8 flex items-center justify-center rounded text-xs font-medium ${diasLab.includes(d) ? "bg-ink-800 text-white" : "border border-dashed border-ink-200 text-ink-300"}`}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-400">Horario de entrada: antes de las 8:30 AM</p>
            </div>
          </TabsContent>

          {/* TAB ASISTENCIA */}
          <TabsContent value="asistencia" className="space-y-6">
            <div>
              <SectionHeading title="Semana actual" />
              <div className="flex gap-2 mb-4">
                {asistDias.map((d, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-[10px] text-ink-400 mb-1">{d.label}</span>
                    <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${bgMap[d.status]}`}>
                      {iconMap[d.status]}
                    </div>
                    {d.hora && (
                      <span className={`text-[10px] mt-1 tabular-nums ${d.status === "retardo" ? "text-amber-600 font-medium" : "text-ink-400"}`}>
                        {timeToAMPM(d.hora)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {premioSemanal > 0 && (
                <div className={`rounded-xl border p-4 flex items-center gap-4 ${premioGanado > 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <Trophy className={`h-8 w-8 ${premioGanado > 0 ? "text-green-600" : "text-red-400"}`} />
                  <div>
                    <p className={`font-serif text-3xl font-bold tabular-nums ${premioGanado > 0 ? "text-green-700" : "text-red-600"}`}>
                      {fmt$(premioGanado)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {premioGanado > 0 ? "Premio de asistencia ganado" : `Premio perdido — ${motivo}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB DOCUMENTOS */}
          <TabsContent value="documentos">
            <DocumentosChecklist empleadoId={e.id} empleadoNombre={e.nombre_completo} />
          </TabsContent>

          {/* TAB NÓMINA */}
          <TabsContent value="nomina" className="space-y-4">
            <SectionHeading title="Historial de sueldo" />
            {e.sueldo_bruto && (
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-crimson-500 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-semibold tabular-nums">{fmt$(e.sueldo_bruto)}</p>
                  <p className="text-xs text-ink-400">Sueldo actual</p>
                </div>
              </div>
            )}
            {sueldoHist.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-ink-200 mt-1 shrink-0" />
                <div>
                  <p className="text-sm tabular-nums text-ink-600">{fmt$(h.sueldo_anterior)} → {fmt$(h.sueldo_nuevo)}</p>
                  <p className="text-xs text-ink-400">{h.fecha_inicio?.split("-").reverse().join("/")}</p>
                </div>
              </div>
            ))}
            {!e.sueldo_bruto && sueldoHist.length === 0 && (
              <p className="text-sm italic text-ink-400">Sin historial de sueldo</p>
            )}
          </TabsContent>

          {/* TAB ACTAS */}
          <TabsContent value="actas">
            <ActasAdministrativas empleadoId={e.id} empleadoNombre={e.nombre_completo} empleadoPuesto={e.puesto} empleadoEmail={e.email || undefined} />
          </TabsContent>

          {/* TAB VACACIONES */}
          <TabsContent value="vacaciones">
            <VacacionesEmpleado empleadoId={e.id} empleadoNombre={e.nombre_completo} fechaIngreso={e.fecha_ingreso} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
