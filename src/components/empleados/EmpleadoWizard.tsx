import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onCreated: () => void;
}

const PUESTOS = ["Chofer", "Ayudante de Chofer", "Secretaria", "Almacenista", "Gerente de Almacén", "Vendedor", "Contadora"];
const PERIODOS = ["semanal", "quincenal"];
const DOC_TYPES = [
  { key: "ine", label: "INE" },
  { key: "curp", label: "CURP" },
  { key: "comprobante_domicilio", label: "Comprobante de domicilio" },
  { key: "acta_nacimiento", label: "Acta de nacimiento" },
  { key: "constancia_situacion_fiscal", label: "Constancia situación fiscal" },
  { key: "licencia_conducir", label: "Licencia de manejo" },
];

const inputClass = "w-full px-3 py-2 text-[13px] border border-[#eae8e4] rounded-lg bg-white focus:outline-none focus:border-[#c41e3a] focus:ring-1 focus:ring-[#c41e3a]/20";
const labelClass = "text-[11px] font-medium text-[#3a3a42] mb-1 block";

function StepCircle({ num, status }: { num: number; status: "active" | "completed" | "pending" }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors";
  if (status === "active") return <div className={`${base} bg-[#c41e3a] text-white border-[#c41e3a]`}>{num}</div>;
  if (status === "completed") return <div className={`${base} bg-[#1a1a1f] text-white border-[#1a1a1f]`}><Check className="h-4 w-4" /></div>;
  return <div className={`${base} bg-white text-[#a8a8ae] border-[#eae8e4]`}>{num}</div>;
}

function formatMoney(val: string): string {
  const num = parseFloat(val.replace(/,/g, ""));
  if (isNaN(num) || val === "") return val;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseMoney(val: string): string {
  return val.replace(/,/g, "");
}

export function EmpleadoWizard({ onBack, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Step 1
  const [nombre, setNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [puesto, setPuesto] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split("T")[0]);
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [sueldoBruto, setSueldoBruto] = useState("");
  const [periodoPago, setPeriodoPago] = useState("semanal");
  const [premioAsistencia, setPremioAsistencia] = useState("");
  const [tieneComision, setTieneComision] = useState(false);
  const [porcentajeComision, setPorcentajeComision] = useState("");
  const [nss, setNss] = useState("");
  const [rfc, setRfc] = useState("");
  const [curp, setCurp] = useState("");
  const [diasLaborales, setDiasLaborales] = useState(["lun", "mar", "mie", "jue", "vie", "sab"]);

  // Step 3
  const [docs, setDocs] = useState<Record<string, File | null>>({});

  const stepLabels = ["Datos básicos", "Laboral", "Documentos", "Resumen"];
  const stepTitles = ["¿Quién es el nuevo integrante?", "¿Cuánto y cómo le pagas?", "Sube los documentos que tengas", "Revisa antes de guardar"];

  const validateStep1 = () => {
    const errs: Record<string, boolean> = {};
    if (!nombre.trim()) errs.nombre = true;
    if (!primerApellido.trim()) errs.primerApellido = true;
    if (!puesto) errs.puesto = true;
    if (!fechaIngreso) errs.fechaIngreso = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setErrors({});
    setStep(s => Math.min(4, s + 1));
  };

  const handleBack = () => { setErrors({}); setStep(s => Math.max(1, s - 1)); };

  const nombreCompleto = [nombre, primerApellido, segundoApellido].filter(Boolean).join(" ");
  const esChofer = puesto.toLowerCase() === "chofer";
  const showPremio = ["Chofer", "Ayudante de Chofer"].includes(puesto);
  const showComision = ["Chofer", "Vendedor"].includes(puesto);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("empleados").insert({
        nombre_completo: nombreCompleto,
        nombre: nombre || null,
        primer_apellido: primerApellido || null,
        segundo_apellido: segundoApellido || null,
        puesto,
        fecha_ingreso: fechaIngreso,
        telefono: telefono || null,
        email: email || null,
        sueldo_bruto: sueldoBruto ? parseFloat(sueldoBruto.replace(/,/g, "")) : null,
        periodo_pago: periodoPago,
        premio_asistencia_semanal: premioAsistencia ? parseFloat(premioAsistencia.replace(/,/g, "")) : null,
        porcentaje_comision: tieneComision && porcentajeComision ? parseFloat(porcentajeComision) : null,
        numero_seguro_social: nss || null,
        rfc: rfc || null,
        curp: curp || null,
        dias_laborales: diasLaborales,
        activo: true,
      } as any);

      if (error) throw error;
      toast.success(`${nombreCompleto} dado de alta`);
      onCreated();
    } catch (err: any) {
      toast.error("Error al guardar: " + (err?.message || "Intenta de nuevo"));
    } finally {
      setSaving(false);
    }
  }, [nombreCompleto, nombre, primerApellido, segundoApellido, puesto, fechaIngreso, telefono, email, sueldoBruto, periodoPago, premioAsistencia, tieneComision, porcentajeComision, nss, rfc, curp, diasLaborales, onCreated]);

  const borderErr = (field: string) => errors[field] ? "border-[#c41e3a]" : "";

  return (
    <div className="p-6">
      <div className="bg-white border border-[#eae8e4] rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#eae8e4]">
          <div className="px-8 py-5 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#a8a8ae] font-semibold mb-1">Nuevo empleado</p>
              <h1 className="font-serif text-[24px] font-medium text-[#1a1a1f]">{stepTitles[step - 1]}</h1>
            </div>
            <button onClick={onBack} className="text-[12px] text-[#78787e] hover:text-[#1a1a1f] transition-colors">✕ Cerrar</button>
          </div>
          {/* Stepper bar */}
          <div className="px-8 py-3 bg-[#f8f6f3] border-t border-[#eae8e4] flex items-center justify-center gap-3 max-w-lg mx-auto">
            {stepLabels.map((label, i) => {
              const num = i + 1;
              const status = step > num ? "completed" : step === num ? "active" : "pending";
              return (
                <div key={num} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-0.5 ${step > num ? "bg-[#1a1a1f]" : "bg-[#eae8e4]"}`} />}
                  <div className="flex flex-col items-center gap-1">
                    <StepCircle num={num} status={status} />
                    <span className={`text-[11px] font-medium ${status === "active" ? "text-[#1a1a1f]" : "text-[#a8a8ae]"}`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-l-[3px] border-[#c41e3a] bg-[#f8f6f3] p-4 rounded-r-lg mb-6 text-[12px] text-[#78787e]">
              Campos requeridos: nombre, primer apellido, puesto, fecha de ingreso.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              <div><label className={labelClass}>Nombre <span className="text-[#c41e3a]">*</span></label><input className={`${inputClass} ${borderErr("nombre")}`} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
              <div><label className={labelClass}>Primer apellido <span className="text-[#c41e3a]">*</span></label><input className={`${inputClass} ${borderErr("primerApellido")}`} value={primerApellido} onChange={e => setPrimerApellido(e.target.value)} /></div>
              <div><label className={labelClass}>Segundo apellido</label><input className={inputClass} value={segundoApellido} onChange={e => setSegundoApellido(e.target.value)} /></div>
              <div><label className={labelClass}>Puesto <span className="text-[#c41e3a]">*</span></label><select className={`${inputClass} ${borderErr("puesto")}`} value={puesto} onChange={e => {
                const p = e.target.value;
                setPuesto(p);
                const esSemanal = p === "Chofer" || p === "Ayudante de Chofer";
                setPeriodoPago(esSemanal ? "semanal" : "quincenal");
                if (!["Chofer", "Ayudante de Chofer"].includes(p)) setPremioAsistencia("");
                if (!["Chofer", "Vendedor"].includes(p)) { setTieneComision(false); setPorcentajeComision(""); }
              }}><option value="">Seleccionar...</option>{PUESTOS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className={labelClass}>Fecha de ingreso <span className="text-[#c41e3a]">*</span></label><input type="date" className={`${inputClass} ${borderErr("fechaIngreso")}`} value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} /></div>
              <div><label className={labelClass}>Teléfono</label><input className={inputClass} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="55 1234 5678" /></div>
              <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              <div><label className={labelClass}>Sueldo bruto mensual (MXN)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#a8a8ae]">$</span><input type="text" inputMode="decimal" className={`${inputClass} pl-7 tabular-nums`} value={sueldoBruto} onChange={e => setSueldoBruto(e.target.value.replace(/[^0-9.,]/g, ""))} onFocus={() => setSueldoBruto(sueldoBruto.replace(/,/g, ""))} onBlur={() => { const n = parseFloat(sueldoBruto.replace(/,/g, "")); if (!isNaN(n)) setSueldoBruto(n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }} placeholder="16,975.00" /></div></div>
              <div><label className={labelClass}>Periodo de pago</label><select className={inputClass} value={periodoPago} onChange={e => setPeriodoPago(e.target.value)}>{PERIODOS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></div>
              {showPremio && <div><label className={labelClass}>Premio asistencia semanal (MXN)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#a8a8ae]">$</span><input type="text" inputMode="decimal" className={`${inputClass} pl-7 tabular-nums`} value={premioAsistencia} onChange={e => setPremioAsistencia(e.target.value.replace(/[^0-9.,]/g, ""))} onFocus={() => setPremioAsistencia(premioAsistencia.replace(/,/g, ""))} onBlur={() => { const n = parseFloat(premioAsistencia.replace(/,/g, "")); if (!isNaN(n)) setPremioAsistencia(n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }} placeholder="957.00" /></div></div>}
              {showComision && <div><label className={labelClass}>¿Tiene comisión?</label><select className={inputClass} value={tieneComision ? "si" : "no"} onChange={e => setTieneComision(e.target.value === "si")}><option value="no">No</option><option value="si">Sí</option></select></div>}
              {showComision && tieneComision && <div><label className={labelClass}>% Comisión</label><div className="relative"><input type="number" className={`${inputClass} pr-7`} value={porcentajeComision} onChange={e => setPorcentajeComision(e.target.value)} placeholder="1" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#a8a8ae]">%</span></div></div>}
              <div><label className={labelClass}>NSS</label><input className={`${inputClass} font-mono text-[12px] tracking-[0.03em]`} value={nss} onChange={e => setNss(e.target.value)} /></div>
              <div><label className={labelClass}>RFC</label><input className={`${inputClass} font-mono text-[12px] tracking-[0.03em]`} value={rfc} onChange={e => setRfc(e.target.value)} /></div>
              <div><label className={labelClass}>CURP</label><input className={`${inputClass} font-mono text-[12px] tracking-[0.03em]`} value={curp} onChange={e => setCurp(e.target.value)} /></div>
            </div>

            <div className="mt-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae] mb-3">Días laborales</p>
              <div className="flex gap-1.5">
                {["lun", "mar", "mie", "jue", "vie", "sab", "dom"].map(d => {
                  const active = diasLaborales.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => setDiasLaborales(active ? diasLaborales.filter(x => x !== d) : [...diasLaborales, d])}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer hover:opacity-80 ${active ? "bg-[#1a1a1f] text-white" : "border border-dashed border-[#eae8e4] text-[#a8a8ae]"}`}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <p className="text-[13px] text-[#78787e]">Nada es obligatorio ahora — puedes subir después desde la ficha.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DOC_TYPES.map(dt => {
                const file = docs[dt.key];
                const showChoferNote = dt.key === "licencia_conducir" && esChofer;
                return (
                  <label key={dt.key} className={`border rounded-lg p-4 cursor-pointer transition-colors ${file ? "border-emerald-300 bg-emerald-50/30" : "border-[#eae8e4] hover:border-[#c41e3a]/30 border-dashed"}`}>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { const f = e.target.files?.[0]; if (f) setDocs(prev => ({ ...prev, [dt.key]: f })); e.target.value = ""; }} />
                    <div className="flex items-center gap-3">
                      {file ? <Check className="h-5 w-5 text-emerald-600 shrink-0" /> : <FileText className="h-5 w-5 text-[#a8a8ae] shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium ${file ? "text-emerald-700" : "text-[#1a1a1f]"}`}>{dt.label}</p>
                        {file ? (
                          <p className="text-[11px] text-emerald-600 truncate">{file.name}</p>
                        ) : (
                          <p className="text-[11px] text-[#a8a8ae]">Click para subir</p>
                        )}
                        {showChoferNote && !file && <p className="text-[10px] text-[#c41e3a] mt-0.5">Requerida para choferes</p>}
                      </div>
                      {file && (
                        <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setDocs(prev => { const n = { ...prev }; delete n[dt.key]; return n; }); }} className="text-[#a8a8ae] hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            {/* TODO: Implement actual upload to supabase storage on save. File refs stored in docs state, upload in handleSave. */}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <p className="text-[13px] text-[#78787e]">Verifica que todo esté correcto.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#eae8e4] rounded-xl p-4">
                <div className="flex justify-between items-center mb-3"><h4 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Datos básicos</h4><button onClick={() => setStep(1)} className="text-[11px] text-[#c41e3a] font-medium hover:underline">Editar</button></div>
                <p className="text-[14px] font-medium text-[#1a1a1f]">{nombreCompleto || "—"}</p>
                <p className="text-[12px] text-[#78787e] mt-0.5">{puesto || "—"}</p>
                <p className="text-[12px] text-[#78787e]">Ingreso: {fechaIngreso.split("-").reverse().join("/")}</p>
                {telefono && <p className="text-[12px] text-[#78787e]">Tel: {telefono}</p>}
              </div>
              <div className="border border-[#eae8e4] rounded-xl p-4">
                <div className="flex justify-between items-center mb-3"><h4 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Laboral</h4><button onClick={() => setStep(2)} className="text-[11px] text-[#c41e3a] font-medium hover:underline">Editar</button></div>
                <p className="text-[14px] font-medium text-[#1a1a1f] tabular-nums">{sueldoBruto ? `$${formatMoney(parseMoney(sueldoBruto))}` : "—"}</p>
                <p className="text-[12px] text-[#78787e] capitalize">{periodoPago}</p>
                {premioAsistencia && <p className="text-[12px] text-[#78787e]">Premio: ${formatMoney(parseMoney(premioAsistencia))}/sem</p>}
                {tieneComision && <p className="text-[12px] text-[#78787e]">Comisión: {porcentajeComision}%</p>}
              </div>
              <div className="border border-[#eae8e4] rounded-xl p-4">
                <div className="flex justify-between items-center mb-3"><h4 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Documentos</h4><button onClick={() => setStep(3)} className="text-[11px] text-[#c41e3a] font-medium hover:underline">Editar</button></div>
                <p className="text-[14px] font-medium text-[#1a1a1f]">{Object.keys(docs).length} de {DOC_TYPES.length} subidos</p>
                {Object.keys(docs).length === 0 && <p className="text-[12px] text-[#a8a8ae] italic">Ninguno — se pueden subir después</p>}
              </div>
              <div className="border border-[#eae8e4] rounded-xl p-4">
                <div className="flex justify-between items-center mb-3"><h4 className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a8a8ae]">Días laborales</h4><button onClick={() => setStep(2)} className="text-[11px] text-[#c41e3a] font-medium hover:underline">Editar</button></div>
                <div className="flex gap-1">{["lun", "mar", "mie", "jue", "vie", "sab", "dom"].map(d => (
                  <span key={d} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${diasLaborales.includes(d) ? "bg-[#1a1a1f] text-white" : "text-[#a8a8ae]"}`}>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                ))}</div>
              </div>
            </div>
            <div className="border-l-2 border-[#eae8e4] pl-3 py-2 text-[12px] text-[#78787e] rounded-r-md">
              Después de guardar, completa el expediente desde la ficha del empleado.
            </div>
          </div>
        )}
      </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-[#eae8e4] bg-[#f8f6f3] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#a8a8ae]">Paso {step} de 4</span>
          <div className="w-24 h-1.5 bg-[#eae8e4] rounded-full overflow-hidden">
            <div className="h-full bg-[#c41e3a] rounded-full transition-all" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[12px] text-[#78787e] hover:text-[#1a1a1f] px-3 py-1.5">Cancelar</button>
          {step > 1 && <button onClick={handleBack} className="text-[12px] text-[#78787e] hover:text-[#1a1a1f] px-3 py-1.5 flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" />Atrás</button>}
          {step < 4 ? (
            <button onClick={handleNext} className="bg-[#c41e3a] hover:bg-[#a31830] text-white text-[12px] px-4 py-2 rounded-md font-medium flex items-center gap-1">
              Siguiente<ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="bg-[#c41e3a] hover:bg-[#a31830] text-white text-[12px] px-4 py-2 rounded-md font-medium flex items-center gap-1 disabled:opacity-50">
              {saving ? "Guardando..." : <><Check className="h-3.5 w-3.5" />Dar de alta</>}
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
