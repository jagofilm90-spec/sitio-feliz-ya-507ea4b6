import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Truck, Check, X, AlertTriangle, Trophy, Save, FileCheck, FilePlus, Camera } from "lucide-react";
import { FotoCropDialog } from "./FotoCropDialog";
import { format, startOfWeek, addDays, isAfter } from "date-fns";
import { toast } from "sonner";
import { DocumentosChecklist } from "./DocumentosChecklist";
import { ActasAdministrativas } from "./ActasAdministrativas";
import { VacacionesEmpleado } from "./VacacionesEmpleado";
import { ExpedienteDigital } from "./ExpedienteDigital";
import { FirmaContratoFlow } from "./FirmaContratoFlow";
import { FirmaAddendumFlow } from "./FirmaAddendumFlow";
import { ProcesoBaja } from "./ProcesoBaja";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Empleado {
  id: string; nombre_completo: string; nombre: string | null; primer_apellido: string | null;
  segundo_apellido: string | null; puesto: string; activo: boolean; fecha_ingreso: string;
  sueldo_bruto: number | null; premio_asistencia_semanal: number | null; periodo_pago: string | null;
  telefono: string | null; email: string | null; curp: string | null; rfc: string | null;
  numero_seguro_social: string | null; fecha_nacimiento: string | null; tipo_sangre: string | null;
  estado_civil: string | null; nivel_estudios: string | null; numero_dependientes: number | null;
  beneficiario: string | null; cuenta_bancaria: string | null; clabe_interbancaria: string | null;
  contacto_emergencia_nombre: string | null; contacto_emergencia_telefono: string | null;
  emergencia_parentesco?: string | null; licencia_numero: string | null; licencia_tipo: string | null;
  licencia_vencimiento: string | null; dias_laborales?: string[] | null; contrato_firmado_fecha: string | null;
}

interface Props {
  empleado: Empleado;
  foto?: string;
  onBack: () => void;
  onEmpleadoUpdated?: (updated: Partial<Empleado>) => void;
  onBajaCompleted?: () => void;
}

type SeccionEditable = "personales" | "contacto" | "emergencia" | "laboral" | "licencia" | "bancarios" | "laborales" | null;

const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
const getInitials = (n: string) => { const p = n.split(" ").filter(Boolean); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase(); };
const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const HORA_LIMITE_MINS = 8 * 60 + 30;
const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };
const DIA_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function timeToMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function timeToAMPM(t: string) { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }

const tabClass = "px-0 mr-5 pb-3.5 bg-transparent shadow-none rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-[#c41e3a] data-[state=active]:text-[#1a1a1f] text-[#78787e] font-medium text-[13px]";
const inputClass = "w-full px-3 py-2 text-[13px] border border-[#eae8e4] rounded-lg bg-white focus:outline-none focus:border-[#c41e3a] focus:ring-1 focus:ring-[#c41e3a]/20";
const inputClassMono = inputClass + " font-mono text-[12px] tracking-[0.03em]";

const TIPO_SANGRE = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const ESTADO_CIVIL = ["Soltero", "Casado", "Divorciado", "Viudo", "Unión libre"];
const NIVEL_ESTUDIOS = ["Primaria", "Secundaria", "Preparatoria", "Universidad", "Posgrado"];
const LICENCIA_TIPOS = ["A", "B", "C", "D", "E"];

// ── Editable field ──

function EditableField({ label, value, field, type = "text", options, mono, editing, onChange }: {
  label: string; value: string | number | null | undefined; field: string;
  type?: "text" | "date" | "number" | "select"; options?: string[];
  mono?: boolean; editing: boolean; onChange: (field: string, value: string) => void;
}) {
  const lblClass = "text-[9.5px] uppercase tracking-[0.14em] text-[#a8a8ae] font-medium mb-1";

  if (!editing) {
    return (
      <div>
        <p className={lblClass}>{label}</p>
        <p className={mono ? "font-mono text-[12.5px] tracking-[0.03em] text-[#1a1a1f]" : "text-[13.5px] text-[#1a1a1f]"}>
          {value ?? <span className="italic text-[#a8a8ae] text-[12.5px]">Sin capturar</span>}
        </p>
      </div>
    );
  }

  const strVal = value?.toString() || "";
  const cls = mono ? inputClassMono : inputClass;

  if (type === "select" && options) {
    return (
      <div>
        <p className={lblClass}>{label}</p>
        <select className={cls} defaultValue={strVal} onChange={(e) => onChange(field, e.target.value)}>
          <option value="">— Seleccionar —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div>
      <p className={lblClass}>{label}</p>
      <input type={type} className={cls} defaultValue={strVal} onChange={(e) => onChange(field, e.target.value)} />
    </div>
  );
}

function SectionHeading({ title, editing, onEdit, onSave, onCancel, saving }: {
  title: string; editing: boolean; onEdit?: () => void;
  onSave?: () => void; onCancel?: () => void; saving?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#f4f2ef]">
      <h3 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">{title}</h3>
      {!editing && onEdit && <button onClick={onEdit} className="text-[11px] text-[#c41e3a] font-medium cursor-pointer hover:underline normal-case tracking-normal">Editar</button>}
      {editing && (
        <div className="flex items-center gap-2.5">
          <button onClick={onCancel} disabled={saving} className="text-[#78787e] text-[12px] hover:text-[#1a1a1f] disabled:opacity-50">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="bg-[#c41e3a] hover:bg-[#a31830] text-white text-[12px] px-3.5 py-1.5 rounded-md font-medium disabled:opacity-50 flex items-center gap-1">
            {saving ? "Guardando..." : <><Save className="h-3 w-3" />Guardar</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──

const EMPRESA = {
  representante_legal: "JOSE ANTONIO GOMEZ ORTEGA",
  razon_social: "ABARROTES LA MANITA, S.A. DE C.V.",
  rfc: "AMA 700701GI8",
  domicilio: "MELCHOR OCAMPO 59, MAGDALENA MIXIHUCA, VENUSTIANO CARRANZA, 15850, CIUDAD DE MEXICO",
};

export function EmpleadoFicha({ empleado: initialEmpleado, foto, onBack, onEmpleadoUpdated, onBajaCompleted }: Props) {
  const [e, setE] = useState(initialEmpleado);
  const { isAdmin } = useUserRoles();
  const [showFirma, setShowFirma] = useState(false);
  const [showBaja, setShowBaja] = useState(false);
  const [showAddendum, setShowAddendum] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [localFoto, setLocalFoto] = useState(foto);
  const esChofer = e.puesto.toLowerCase() === "chofer";
  const manejaVehiculo = ["Chofer", "Vendedor"].includes(e.puesto);
  const diasLab: string[] = (e as any).dias_laborales || ["lun", "mar", "mie", "jue", "vie", "sab"];

  const [editando, setEditando] = useState<SeccionEditable>(null);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((field: string, value: string) => {
    setChanges(prev => ({ ...prev, [field]: value || null }));
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(changes).length === 0) { setEditando(null); return; }
    setSaving(true);
    setError(null);
    try {
      // Build nombre_completo if name parts changed
      const updates = { ...changes };
      if (updates.nombre || updates.primer_apellido || updates.segundo_apellido) {
        const nombre = (updates.nombre ?? e.nombre) || "";
        const ap1 = (updates.primer_apellido ?? e.primer_apellido) || "";
        const ap2 = (updates.segundo_apellido ?? e.segundo_apellido) || "";
        updates.nombre_completo = [nombre, ap1, ap2].filter(Boolean).join(" ");
      }
      if (updates.numero_dependientes !== undefined) {
        updates.numero_dependientes = updates.numero_dependientes ? parseInt(updates.numero_dependientes) : null;
      }
      if (updates.sueldo_bruto !== undefined) {
        updates.sueldo_bruto = updates.sueldo_bruto ? parseFloat(updates.sueldo_bruto) : null;
      }
      if (updates.premio_asistencia_semanal !== undefined) {
        updates.premio_asistencia_semanal = updates.premio_asistencia_semanal ? parseFloat(updates.premio_asistencia_semanal) : null;
      }
      if (updates.porcentaje_comision !== undefined) {
        updates.porcentaje_comision = updates.porcentaje_comision ? parseFloat(updates.porcentaje_comision) : null;
      }

      const { error: err } = await supabase.from("empleados").update(updates as any).eq("id", e.id);
      if (err) throw err;

      const merged = { ...e, ...updates } as Empleado;
      setE(merged);
      onEmpleadoUpdated?.(updates);
      setEditando(null);
      setChanges({});
      toast.success("Datos actualizados");
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [changes, e, onEmpleadoUpdated]);

  const startEdit = (seccion: SeccionEditable) => { setEditando(seccion); setChanges({}); setError(null); };
  const cancelEdit = () => { setEditando(null); setChanges({}); setError(null); };

  // Antigüedad
  const hoy = new Date();
  const [iy, im, id] = e.fecha_ingreso.split("-").map(Number);
  const ingreso = new Date(iy, im - 1, id);
  const totalMeses = Math.floor((hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  const antig = anos > 0 ? `${anos} año${anos !== 1 ? "s" : ""}${meses > 0 ? `, ${meses} m` : ""}` : `${meses} mes${meses !== 1 ? "es" : ""}`;

  let licStatus: "vigente" | "vencida" | "por_vencer" | null = null;
  if (e.licencia_vencimiento) {
    const [ly, lm, ld] = e.licencia_vencimiento.split("-").map(Number);
    const venc = new Date(ly, lm - 1, ld);
    const dias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    licStatus = dias < 0 ? "vencida" : dias <= 30 ? "por_vencer" : "vigente";
  }

  const [vehiculo, setVehiculo] = useState<{ nombre: string; tipo: string; marca: string | null; modelo: string | null; anio: number | null } | null>(null);
  useEffect(() => {
    if (!esChofer) return;
    supabase.from("vehiculos").select("nombre, tipo, marca, modelo, anio").eq("chofer_asignado_id", e.id).eq("activo", true).limit(1).maybeSingle().then(({ data }) => setVehiculo(data));
  }, [e.id, esChofer]);

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

  const [sueldoHist, setSueldoHist] = useState<{ sueldo_anterior: number; sueldo_nuevo: number; fecha_inicio: string }[]>([]);
  useEffect(() => {
    supabase.from("empleados_historial_sueldo" as any).select("sueldo_anterior, sueldo_nuevo, fecha_inicio").eq("empleado_id", e.id).order("fecha_inicio", { ascending: false }).then(({ data }) => setSueldoHist((data || []) as any));
  }, [e.id]);

  const iconMap: Record<string, React.ReactNode> = {
    puntual: <Check className="h-5 w-5 text-emerald-600" />,
    retardo: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    falta: <X className="h-5 w-5 text-red-500" />,
    futuro: <span className="text-stone-300 text-sm">·</span>,
    no_laboral: <span className="text-stone-300 text-sm">—</span>,
  };
  const bgMap: Record<string, string> = {
    puntual: "bg-[#ecfdf5] border-[#a7f3d0]",
    retardo: "bg-[#fefce8] border-[#fde68a]",
    falta: "bg-[#fef2f2] border-[#fca5a5]",
    futuro: "bg-[#f4f2ef] border-[#eae8e4]",
    no_laboral: "bg-[#f4f2ef]/50 border-dashed border-[#eae8e4]",
  };

  const isEditing = (s: SeccionEditable) => editando === s;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] -mx-6 sm:-mx-8 lg:-mx-12 -mt-8 lg:-mt-10 -mb-8 lg:-mb-10">
      {/* ── Sidebar ── */}
      <div className="w-full lg:w-[300px] shrink-0 bg-gradient-to-b from-[#f8f6f3] to-[#f0ece7] border-b lg:border-b-0 lg:border-r border-[#eae8e4] p-6 overflow-y-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[#78787e] hover:text-[#1a1a1f] text-[12px] cursor-pointer transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Volver a lista
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <label className="relative group cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(ev) => {
              const file = ev.target.files?.[0];
              if (file) setCropUrl(URL.createObjectURL(file));
              ev.target.value = "";
            }} />
            {localFoto ? (
              <img src={localFoto} className="w-[88px] h-[88px] rounded-full object-cover ring-[3px] ring-white shadow-lg" />
            ) : (
              <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-white text-[26px] font-bold ring-[3px] ring-white shadow-lg" style={{ backgroundColor: getColor(e.nombre_completo) }}>
                {getInitials(e.nombre_completo)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </label>
          <h2 className="font-serif text-[22px] font-medium text-[#1a1a1f] mt-3.5">{e.nombre_completo}</h2>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae] mt-1">{e.puesto}</p>
          <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${e.activo ? "bg-[#e8f5ee] text-[#1a7a4c] border border-[#e8f5ee]" : "bg-stone-100 text-stone-500"}`}>
              {e.activo ? "Activo" : "Inactivo"}
            </span>
            {manejaVehiculo && licStatus && (
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${licStatus === "vencida" ? "bg-[#fde8ec] text-[#c41e3a] border border-[#fde8ec]" : licStatus === "por_vencer" ? "bg-amber-50 text-amber-700 border border-amber-50" : "bg-[#e8f5ee] text-[#1a7a4c] border border-[#e8f5ee]"}`}>
                Lic. {licStatus === "vencida" ? "vencida" : licStatus === "por_vencer" ? "por vencer" : "vigente"}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-0">
          <div className="flex justify-between py-[8px] border-b border-[rgba(0,0,0,0.05)]"><span className="text-[12px] text-[#78787e]">Ingreso</span><span className="text-[12px] font-medium text-[#1a1a1f] text-right">{e.fecha_ingreso.split("-").reverse().join("/")}</span></div>
          <div className="flex justify-between py-[8px] border-b border-[rgba(0,0,0,0.05)]"><span className="text-[12px] text-[#78787e]">Antigüedad</span><span className="text-[12px] font-medium text-[#1a1a1f] text-right">{antig}</span></div>
          {e.periodo_pago && <div className="flex justify-between py-[8px] border-b border-[rgba(0,0,0,0.05)]"><span className="text-[12px] text-[#78787e]">Periodo</span><span className="text-[12px] font-medium text-[#1a1a1f] text-right capitalize">{e.periodo_pago}</span></div>}
          {e.sueldo_bruto && <div className="flex justify-between py-[8px] border-b border-[rgba(0,0,0,0.05)]"><span className="text-[12px] text-[#78787e]">Sueldo</span><span className="text-[12px] font-medium text-[#1a1a1f] text-right tabular-nums">{fmt$(e.sueldo_bruto)}</span></div>}
          {e.telefono && <div className="flex justify-between py-[8px] border-b border-[rgba(0,0,0,0.05)]"><span className="text-[12px] text-[#78787e]">Teléfono</span><span className="text-[12px] font-medium text-[#1a1a1f] text-right">{e.telefono}</span></div>}
          {e.email && <div className="flex justify-between py-[8px] border-b border-[rgba(0,0,0,0.05)]"><span className="text-[12px] text-[#78787e]">Email</span><span className="text-[12px] font-medium text-[#1a1a1f] text-right truncate ml-2">{e.email}</span></div>}
        </div>

        {esChofer && (
          <div className="mt-5">
            <p className="text-[9px] tracking-[0.2em] text-[#a8a8ae] uppercase font-semibold mb-1.5 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" />Unidad asignada</p>
            {vehiculo ? (
              <div className="rounded-xl border border-[#eae8e4] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#c41e3a] transition-colors cursor-pointer">
                <p className="font-serif text-[36px] font-bold text-[#1a1a1f]">{vehiculo.nombre}</p>
                <p className="text-[11.5px] text-[#78787e] mt-1">{vehiculo.tipo}{vehiculo.marca ? ` · ${vehiculo.marca}` : ""}{vehiculo.modelo ? ` ${vehiculo.modelo}` : ""}{vehiculo.anio ? ` · ${vehiculo.anio}` : ""}</p>
              </div>
            ) : (
              <p className="text-[12px] italic text-[#a8a8ae]">Sin unidad asignada</p>
            )}
          </div>
        )}

        {/* Dar de baja (admin only) */}
        {isAdmin && e.activo && (
          <button onClick={() => setShowBaja(true)} className="w-full mt-6 text-[12px] text-[#c41e3a] border border-[#fde8ec] rounded-lg px-3 py-2 hover:bg-[#fde8ec] transition-colors">
            Dar de baja
          </button>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0 p-7 overflow-y-auto">
        <Tabs defaultValue="general">
          <TabsList className="bg-transparent border-b border-[#eae8e4] rounded-none p-0 h-auto mb-7">
            <TabsTrigger value="general" className={tabClass}>General</TabsTrigger>
            <TabsTrigger value="asistencia" className={tabClass}>Asistencia</TabsTrigger>
            <TabsTrigger value="documentos" className={tabClass}>Documentos</TabsTrigger>
            <TabsTrigger value="nomina" className={tabClass}>Nómina</TabsTrigger>
            <TabsTrigger value="actas" className={tabClass}>Actas</TabsTrigger>
            <TabsTrigger value="vacaciones" className={tabClass}>Vacaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-7">
            {/* Datos personales */}
            <div>
              <SectionHeading title="Datos personales" editing={isEditing("personales")} onEdit={() => startEdit("personales")} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                <EditableField label="Nombre" value={e.nombre} field="nombre" editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Primer apellido" value={e.primer_apellido} field="primer_apellido" editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Segundo apellido" value={e.segundo_apellido} field="segundo_apellido" editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="CURP" value={e.curp} field="curp" mono editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="RFC" value={e.rfc} field="rfc" mono editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="NSS" value={e.numero_seguro_social} field="numero_seguro_social" mono editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Fecha de nacimiento" value={e.fecha_nacimiento} field="fecha_nacimiento" type="date" editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Tipo de sangre" value={e.tipo_sangre} field="tipo_sangre" type="select" options={TIPO_SANGRE} editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Estado civil" value={e.estado_civil} field="estado_civil" type="select" options={ESTADO_CIVIL} editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Nivel de estudios" value={e.nivel_estudios} field="nivel_estudios" type="select" options={NIVEL_ESTUDIOS} editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Dependientes" value={e.numero_dependientes} field="numero_dependientes" type="number" editing={isEditing("personales")} onChange={handleChange} />
                <EditableField label="Beneficiario" value={e.beneficiario} field="beneficiario" editing={isEditing("personales")} onChange={handleChange} />
              </div>
              {error && editando === "personales" && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            {/* Contacto */}
            <div>
              <SectionHeading title="Contacto" editing={isEditing("contacto")} onEdit={() => startEdit("contacto")} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                <EditableField label="Teléfono" value={e.telefono} field="telefono" editing={isEditing("contacto")} onChange={handleChange} />
                <EditableField label="Email" value={e.email} field="email" editing={isEditing("contacto")} onChange={handleChange} />
                <EditableField label="Dirección" value={(e as any).direccion} field="direccion" editing={isEditing("contacto")} onChange={handleChange} />
              </div>
              {error && editando === "contacto" && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            {/* Contacto emergencia */}
            {(e.contacto_emergencia_nombre || isEditing("emergencia")) && (
              <div>
                <SectionHeading title="Contacto de emergencia" editing={isEditing("emergencia")} onEdit={() => startEdit("emergencia")} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
                  <EditableField label="Nombre" value={e.contacto_emergencia_nombre} field="contacto_emergencia_nombre" editing={isEditing("emergencia")} onChange={handleChange} />
                  <EditableField label="Teléfono" value={e.contacto_emergencia_telefono} field="contacto_emergencia_telefono" editing={isEditing("emergencia")} onChange={handleChange} />
                  <EditableField label="Parentesco" value={(e as any).emergencia_parentesco} field="emergencia_parentesco" editing={isEditing("emergencia")} onChange={handleChange} />
                </div>
                {error && editando === "emergencia" && <p className="text-xs text-red-600 mt-2">{error}</p>}
              </div>
            )}

            {/* Datos laborales */}
            <div>
              <SectionHeading title="Datos laborales" editing={isEditing("laboral")} onEdit={() => startEdit("laboral")} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                <EditableField label="Sueldo bruto mensual" value={isEditing("laboral") ? e.sueldo_bruto : e.sueldo_bruto != null ? fmt$(e.sueldo_bruto) : null} field="sueldo_bruto" type="number" editing={isEditing("laboral")} onChange={handleChange} />
                <EditableField label="Periodo de pago" value={e.periodo_pago} field="periodo_pago" type="select" options={["semanal", "quincenal"]} editing={isEditing("laboral")} onChange={handleChange} />
                <EditableField label="Premio asistencia semanal" value={isEditing("laboral") ? e.premio_asistencia_semanal : e.premio_asistencia_semanal != null ? fmt$(e.premio_asistencia_semanal) : null} field="premio_asistencia_semanal" type="number" editing={isEditing("laboral")} onChange={handleChange} />
                {e.puesto === "Vendedor" && (
                  <EditableField label="Porcentaje comisión" value={(e as any).porcentaje_comision} field="porcentaje_comision" type="number" editing={isEditing("laboral")} onChange={handleChange} />
                )}
              </div>
              {error && editando === "laboral" && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            {/* Licencia (chofer/vendedor) */}
            {manejaVehiculo && (
              <div>
                <SectionHeading title="Licencia de manejo" editing={isEditing("licencia")} onEdit={() => startEdit("licencia")} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
                  <EditableField label="Número" value={e.licencia_numero} field="licencia_numero" mono editing={isEditing("licencia")} onChange={handleChange} />
                  <EditableField label="Tipo" value={e.licencia_tipo} field="licencia_tipo" type="select" options={LICENCIA_TIPOS} editing={isEditing("licencia")} onChange={handleChange} />
                  <EditableField label="Vencimiento" value={e.licencia_vencimiento} field="licencia_vencimiento" type="date" editing={isEditing("licencia")} onChange={handleChange} />
                </div>
                {error && editando === "licencia" && <p className="text-xs text-red-600 mt-2">{error}</p>}
              </div>
            )}

            {/* Bancarios */}
            <div>
              <SectionHeading title="Datos bancarios" editing={isEditing("bancarios")} onEdit={() => startEdit("bancarios")} onSave={handleSave} onCancel={cancelEdit} saving={saving} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <EditableField label="Cuenta bancaria" value={e.cuenta_bancaria} field="cuenta_bancaria" mono editing={isEditing("bancarios")} onChange={handleChange} />
                <EditableField label="CLABE interbancaria" value={e.clabe_interbancaria} field="clabe_interbancaria" mono editing={isEditing("bancarios")} onChange={handleChange} />
              </div>
              {error && editando === "bancarios" && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            {/* Días laborales */}
            <div>
              <SectionHeading title="Días laborales" editing={isEditing("laborales")} onEdit={() => startEdit("laborales")} onSave={() => {
                const newDias = Object.keys(changes).length > 0 ? changes.dias_laborales : diasLab;
                if (newDias) {
                  setChanges({ dias_laborales: newDias });
                }
                handleSave();
              }} onCancel={cancelEdit} saving={saving} />
              <div className="flex gap-1.5 mb-3">
                {["lun", "mar", "mie", "jue", "vie", "sab", "dom"].map(d => {
                  const active = isEditing("laborales")
                    ? (changes.dias_laborales || diasLab).includes(d)
                    : diasLab.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!isEditing("laborales")}
                      onClick={() => {
                        if (!isEditing("laborales")) return;
                        const current = changes.dias_laborales || [...diasLab];
                        const next = active ? current.filter((x: string) => x !== d) : [...current, d];
                        setChanges(prev => ({ ...prev, dias_laborales: next }));
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                        active
                          ? "bg-[#1a1a1f] text-white"
                          : "border border-dashed border-[#eae8e4] text-[#a8a8ae]"
                      } ${isEditing("laborales") ? "cursor-pointer hover:opacity-80" : ""}`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-[#a8a8ae]">Horario de entrada: antes de las 8:30 AM</p>
            </div>
          </TabsContent>

          {/* TAB ASISTENCIA */}
          <TabsContent value="asistencia" className="space-y-7">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#f4f2ef]">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Semana actual</h3>
              </div>
              <div className="flex gap-3 mb-6">
                {asistDias.map((d, i) => (
                  <div key={i} className="flex flex-col items-center w-[56px]">
                    <span className="text-[10px] text-[#a8a8ae] font-medium mb-1.5">{d.label}</span>
                    <div className={`w-[44px] h-[44px] rounded-lg border-2 flex items-center justify-center ${bgMap[d.status]}`}>
                      {iconMap[d.status]}
                    </div>
                    {d.hora && (
                      <span className={`text-[10px] mt-1.5 tabular-nums ${d.status === "retardo" ? "text-amber-600 font-medium" : "text-[#a8a8ae]"}`}>
                        {timeToAMPM(d.hora)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {premioSemanal > 0 && (
                <div className={`mt-6 p-5 rounded-xl border bg-white flex items-center gap-5 ${premioGanado > 0 ? "border-[#a7f3d0]" : "border-[#fca5a5]"}`}>
                  <Trophy className={`h-11 w-11 ${premioGanado > 0 ? "text-emerald-500" : "text-red-400"}`} />
                  <div>
                    <p className={`font-serif text-[28px] font-bold tabular-nums ${premioGanado > 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {fmt$(premioGanado)}
                    </p>
                    <p className="text-[13px] text-[#78787e] mt-1">
                      {premioGanado > 0 ? "Premio de asistencia ganado" : `Premio perdido — ${motivo}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documentos" className="space-y-7">
            {/* Estado del contrato */}
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#f4f2ef]">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Estado del contrato</h3>
              </div>
              {e.contrato_firmado_fecha ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-[#e8f5ee] text-[#1a7a4c]">
                    <FileCheck className="h-3 w-3 inline mr-1" />Contrato vigente
                  </span>
                  <span className="text-[12px] text-[#78787e]">Firmado {e.contrato_firmado_fecha.split("-").reverse().join("/")}</span>
                  {isAdmin && (
                    <button onClick={() => setShowAddendum(true)} className="text-[11px] text-[#c41e3a] font-medium hover:underline ml-auto">
                      <FilePlus className="h-3 w-3 inline mr-1" />Generar Addendum
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-[#fde8ec] text-[#c41e3a]">Sin contrato</span>
                  <button onClick={() => setShowFirma(true)} className="text-[12px] bg-[#c41e3a] hover:bg-[#a31830] text-white px-3 py-1.5 rounded-md font-medium">
                    Firmar Contrato
                  </button>
                </div>
              )}
            </div>

            {/* Expediente digital */}
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#f4f2ef]">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Expediente digital</h3>
              </div>
              <ExpedienteDigital empleadoId={e.id} isAdmin={isAdmin} />
            </div>

            {/* Checklist de documentos */}
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#f4f2ef]">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Checklist de documentos</h3>
              </div>
              <DocumentosChecklist empleadoId={e.id} empleadoNombre={e.nombre_completo} />
            </div>
          </TabsContent>

          <TabsContent value="nomina" className="space-y-5">
            <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#f4f2ef]">
              <h3 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Historial de sueldo</h3>
            </div>
            <div className="relative pl-5 ml-1.5 border-l-2 border-[#eae8e4] space-y-6">
              {e.sueldo_bruto && (
                <div className="relative">
                  <div className="absolute -left-[1.625rem] w-3 h-3 rounded-full bg-[#c41e3a] ring-4 ring-[#fde8ec]" />
                  <p className="font-serif text-[20px] font-semibold text-[#1a1a1f] tabular-nums">{fmt$(e.sueldo_bruto)}</p>
                  <p className="text-[11px] text-[#a8a8ae]">Sueldo actual</p>
                </div>
              )}
              {sueldoHist.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[1.625rem] w-3 h-3 rounded-full bg-[#a8a8ae]" />
                  <p className="font-serif text-[16px] tabular-nums text-[#78787e]">{fmt$(h.sueldo_anterior)} → {fmt$(h.sueldo_nuevo)}</p>
                  <p className="text-[11px] text-[#a8a8ae]">{h.fecha_inicio?.split("-").reverse().join("/")}</p>
                </div>
              ))}
              {!e.sueldo_bruto && sueldoHist.length === 0 && (
                <p className="text-[13px] italic text-[#a8a8ae]">Sin historial de sueldo</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actas">
            <ActasAdministrativas empleadoId={e.id} empleadoNombre={e.nombre_completo} empleadoPuesto={e.puesto} empleadoEmail={e.email || undefined} />
          </TabsContent>

          <TabsContent value="vacaciones">
            <VacacionesEmpleado empleadoId={e.id} empleadoNombre={e.nombre_completo} fechaIngreso={e.fecha_ingreso} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ── */}
      {cropUrl && (
        <FotoCropDialog
          imageUrl={cropUrl}
          open={!!cropUrl}
          onClose={() => { URL.revokeObjectURL(cropUrl); setCropUrl(null); }}
          onCropped={async (blob) => {
            const fileName = `${e.id}-${Date.now()}.jpg`;
            await supabase.storage.from("empleados-fotos").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
            const { data: pub } = supabase.storage.from("empleados-fotos").getPublicUrl(fileName);
            const newUrl = `${pub.publicUrl}?t=${Date.now()}`;
            await supabase.from("empleados").update({ foto_url: pub.publicUrl } as any).eq("id", e.id);
            setLocalFoto(newUrl);
            onEmpleadoUpdated?.({ foto_url: pub.publicUrl } as any);
            URL.revokeObjectURL(cropUrl);
            setCropUrl(null);
          }}
        />
      )}

      {showFirma && (
        <FirmaContratoFlow
          open={showFirma}
          onClose={() => setShowFirma(false)}
          onSigned={() => {
            setShowFirma(false);
            setE(prev => ({ ...prev, contrato_firmado_fecha: new Date().toISOString().split("T")[0] }));
            onEmpleadoUpdated?.({ contrato_firmado_fecha: new Date().toISOString().split("T")[0] });
          }}
          empleado={{
            id: e.id, nombre_completo: e.nombre_completo, rfc: e.rfc || "", curp: e.curp || "",
            puesto: e.puesto, sueldo_bruto: e.sueldo_bruto || 0, fecha_ingreso: e.fecha_ingreso,
            email: e.email || undefined, direccion: undefined,
            beneficiario: e.beneficiario || undefined,
            premio_asistencia_semanal: e.premio_asistencia_semanal || undefined,
          }}
          empresa={EMPRESA}
        />
      )}

      {showAddendum && sueldoHist.length > 0 && (
        <FirmaAddendumFlow
          empleado={{ id: e.id, nombre_completo: e.nombre_completo, puesto: e.puesto, fecha_ingreso: e.fecha_ingreso, email: e.email || undefined }}
          historial={{
            sueldo_anterior: sueldoHist[0].sueldo_anterior,
            sueldo_nuevo: sueldoHist[0].sueldo_nuevo,
            premio_anterior: (sueldoHist[0] as any).premio_anterior ?? 0,
            premio_nuevo: (sueldoHist[0] as any).premio_nuevo ?? 0,
          }}
          onClose={() => setShowAddendum(false)}
          onSigned={() => setShowAddendum(false)}
        />
      )}

      {showBaja && (
        <ProcesoBaja
          empleado={{ id: e.id, nombre_completo: e.nombre_completo, puesto: e.puesto, user_id: (e as any).user_id || null, fecha_ingreso: e.fecha_ingreso }}
          open={showBaja}
          onClose={() => setShowBaja(false)}
          onCompleted={() => { setShowBaja(false); onBajaCompleted?.(); }}
        />
      )}
    </div>
  );
}
