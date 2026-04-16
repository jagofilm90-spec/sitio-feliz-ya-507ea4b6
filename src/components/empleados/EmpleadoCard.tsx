import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Pencil, Truck, Check, X, AlertTriangle } from "lucide-react";
import { FotoCropDialog } from "./FotoCropDialog";
import { format, startOfWeek, addDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  activo: boolean;
  fecha_ingreso: string;
  sueldo_bruto: number | null;
  premio_asistencia_semanal: number | null;
  dias_laborales?: string[] | null;
  telefono: string | null;
  email: string | null;
  beneficiario: string | null;
  curp: string | null;
  rfc: string | null;
  numero_seguro_social: string | null;
  contrato_firmado_fecha: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  emergencia_parentesco: string | null;
  licencia_numero: string | null;
  licencia_tipo: string | null;
  licencia_vencimiento: string | null;
}

interface Props {
  empleado: Empleado;
  foto?: string;
  onClose: () => void;
  onEditar: () => void;
  onExpediente: () => void;
  onDocumentos: () => void;
  onActas: () => void;
  onFotoChanged?: (newUrl: string) => void;
}

const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
const getInitials = (n: string) => { const p = n.split(" ").filter(Boolean); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase(); };
const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

const HORA_LIMITE_MINS = 8 * 60 + 30;
const DIA_MAP: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };
const DIA_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all min-w-0">{value}</span>
    </div>
  );
}

// ── Vehicle mini-card for choferes ──

function UnidadAsignada({ empleadoId }: { empleadoId: string }) {
  const [vehiculo, setVehiculo] = useState<{ nombre: string; tipo: string; marca: string | null; modelo: string | null; anio: number | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("vehiculos")
      .select("nombre, tipo, marca, modelo, anio")
      .eq("chofer_asignado_id", empleadoId)
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setVehiculo(data); setLoaded(true); });
  }, [empleadoId]);

  if (!loaded) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" />
        Unidad asignada
      </p>
      {vehiculo ? (
        <div className="rounded-lg border bg-ink-50/30 p-3">
          <p className="font-serif text-2xl font-bold text-ink-900">{vehiculo.nombre}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {vehiculo.tipo}{vehiculo.marca ? ` · ${vehiculo.marca}` : ""}{vehiculo.modelo ? ` ${vehiculo.modelo}` : ""}{vehiculo.anio ? ` · ${vehiculo.anio}` : ""}
          </p>
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">Sin unidad asignada</p>
      )}
    </div>
  );
}

// ── Weekly attendance mini-chart ──

function AsistenciaSemanal({ empleadoId, premioSemanal, diasLaborales }: { empleadoId: string; premioSemanal: number; diasLaborales: string[] }) {
  const [dias, setDias] = useState<{ label: string; status: "puntual" | "retardo" | "falta" | "futuro" | "no_laboral"; hora: string | null }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const lunes = startOfWeek(new Date(), { weekStartsOn: 1 });
      const fechaDesde = format(lunes, "yyyy-MM-dd");
      const sabado = addDays(lunes, 5);
      const fechaHasta = format(sabado, "yyyy-MM-dd");

      const { data } = await supabase
        .from("asistencia")
        .select("fecha, hora")
        .eq("empleado_id", empleadoId)
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta)
        .order("hora", { ascending: true });

      const today = new Date();
      const result: typeof dias = [];

      for (let i = 0; i < 6; i++) {
        const d = addDays(lunes, i);
        const dateStr = format(d, "yyyy-MM-dd");
        const diaKey = DIA_MAP[d.getDay()];
        const esLaboral = diasLaborales.includes(diaKey);
        const esFuturo = isAfter(d, today);

        if (!esLaboral) {
          result.push({ label: DIA_LABELS[i], status: "no_laboral", hora: null });
          continue;
        }
        if (esFuturo) {
          result.push({ label: DIA_LABELS[i], status: "futuro", hora: null });
          continue;
        }

        const regs = (data || []).filter(r => r.fecha === dateStr && r.hora).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
        if (regs.length === 0) {
          result.push({ label: DIA_LABELS[i], status: "falta", hora: null });
        } else {
          const mins = timeToMinutes(regs[0].hora!);
          result.push({
            label: DIA_LABELS[i],
            status: mins > HORA_LIMITE_MINS ? "retardo" : "puntual",
            hora: regs[0].hora!.substring(0, 5),
          });
        }
      }

      setDias(result);
      setLoaded(true);
    };
    load();
  }, [empleadoId, diasLaborales]);

  if (!loaded) return null;

  const faltas = dias.filter(d => d.status === "falta").length;
  const retardos = dias.filter(d => d.status === "retardo").length;
  const pierdePremio = faltas >= 1 || retardos >= 2;
  const premioGanado = pierdePremio ? 0 : premioSemanal;
  const motivo = faltas >= 1 ? `${faltas} falta${faltas > 1 ? "s" : ""}` : retardos >= 2 ? `${retardos} retardos` : null;

  const iconMap = {
    puntual: <Check className="h-3.5 w-3.5 text-green-600" />,
    retardo: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    falta: <X className="h-3.5 w-3.5 text-red-500" />,
    futuro: <span className="text-muted-foreground text-xs">·</span>,
    no_laboral: <span className="text-muted-foreground text-xs">—</span>,
  };

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Asistencia — semana actual
      </p>
      <div className="flex gap-1.5 mb-2">
        {dias.map((d, i) => (
          <div key={i} className="flex flex-col items-center w-10">
            <span className="text-[9px] text-muted-foreground mb-0.5">{d.label}</span>
            <div className="w-8 h-8 rounded-md border flex items-center justify-center bg-white">
              {iconMap[d.status]}
            </div>
            {d.hora && (
              <span className={`text-[9px] mt-0.5 tabular-nums ${d.status === "retardo" ? "text-amber-600" : "text-muted-foreground"}`}>
                {d.hora}
              </span>
            )}
          </div>
        ))}
      </div>
      {premioSemanal > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Premio:</span>
          {premioGanado > 0 ? (
            <span className="font-semibold text-green-600">{fmt$(premioGanado)} ✓</span>
          ) : (
            <span className="font-semibold text-red-600">$0 ✗ <span className="font-normal text-muted-foreground">— {motivo}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main card ──

export function EmpleadoCard({ empleado: e, foto, onClose, onEditar, onExpediente, onDocumentos, onActas, onFotoChanged }: Props) {
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const [iy, im, id] = e.fecha_ingreso.split("-").map(Number);
  const ingreso = new Date(iy, im - 1, id);
  const diffMs = hoy.getTime() - ingreso.getTime();
  const totalMeses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  const antig = anos > 0 ? `${anos} año${anos !== 1 ? "s" : ""}${meses > 0 ? `, ${meses} mes${meses !== 1 ? "es" : ""}` : ""}` : `${meses} mes${meses !== 1 ? "es" : ""}`;

  const enPrueba = diffMs < 90 * 24 * 60 * 60 * 1000;
  const diasPrueba = Math.ceil((90 * 24 * 60 * 60 * 1000 - diffMs) / (1000 * 60 * 60 * 24));

  let licVenceBadge: React.ReactNode = null;
  if (e.licencia_vencimiento) {
    const [ly, lm, ld] = e.licencia_vencimiento.split("-").map(Number);
    const venc = new Date(ly, lm - 1, ld);
    const diasLic = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasLic < 0) licVenceBadge = <Badge variant="destructive" className="text-xs">VENCIDA</Badge>;
    else if (diasLic <= 30) licVenceBadge = <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">Vence en {diasLic}d</Badge>;
  }

  const esChofer = e.puesto.toLowerCase() === "chofer";
  const diasLab = (e as any).dias_laborales || ["lun", "mar", "mie", "jue", "vie", "sab"];

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              {foto ? (
                <img src={foto} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: getColor(e.nombre_completo) }}>
                  {getInitials(e.nombre_completo)}
                </div>
              )}
              <label htmlFor="card-foto-upload" className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm">
                <Pencil className="h-3.5 w-3.5 text-gray-600" />
              </label>
              <input type="file" id="card-foto-upload" accept="image/*" className="hidden" onChange={(ev) => {
                const file = ev.target.files?.[0];
                if (file) setCropUrl(URL.createObjectURL(file));
                ev.target.value = "";
              }} />
              {cropUrl && (
                <FotoCropDialog imageUrl={cropUrl} open={!!cropUrl}
                  onClose={() => { URL.revokeObjectURL(cropUrl); setCropUrl(null); }}
                  onCropped={async (blob) => {
                    const fileName = `${e.id}-${Date.now()}.jpg`;
                    await supabase.storage.from("empleados-fotos").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
                    const { data: pub } = supabase.storage.from("empleados-fotos").getPublicUrl(fileName);
                    await supabase.from("empleados").update({ foto_url: pub.publicUrl } as any).eq("id", e.id);
                    if (onFotoChanged) onFotoChanged(`${pub.publicUrl}?t=${Date.now()}`);
                    URL.revokeObjectURL(cropUrl); setCropUrl(null);
                  }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold break-words">{e.nombre_completo}</h2>
              <p className="text-sm text-muted-foreground">{e.puesto}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant={e.activo ? "default" : "secondary"}>{e.activo ? "Activo" : "Inactivo"}</Badge>
                {e.contrato_firmado_fecha
                  ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Firmado</Badge>
                  : <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>
                }
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-0">
            <Row label="Fecha de ingreso" value={e.fecha_ingreso.split("-").reverse().join("/")} />
            <Row label="Antigüedad" value={antig} />
            {e.sueldo_bruto && <Row label="Sueldo bruto" value={fmt$(e.sueldo_bruto)} />}
            {e.premio_asistencia_semanal && <Row label="Premio semanal" value={fmt$(e.premio_asistencia_semanal)} />}
            <Row label="Teléfono" value={e.telefono} />
            <Row label="Email" value={e.email} />
            <Row label="Beneficiario" value={e.beneficiario} />
            <Row label="CURP" value={e.curp} />
            <Row label="RFC" value={e.rfc} />
            <Row label="NSS" value={e.numero_seguro_social} />
          </div>

          {/* Unidad asignada (chofer only) */}
          {esChofer && <UnidadAsignada empleadoId={e.id} />}

          {/* Asistencia semanal */}
          <AsistenciaSemanal
            empleadoId={e.id}
            premioSemanal={e.premio_asistencia_semanal || 0}
            diasLaborales={diasLab}
          />

          {/* Emergencia */}
          {e.contacto_emergencia_nombre && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Contacto de emergencia</p>
              <Row label="Nombre" value={e.contacto_emergencia_nombre} />
              <Row label="Teléfono" value={e.contacto_emergencia_telefono} />
              <Row label="Parentesco" value={e.emergencia_parentesco} />
            </div>
          )}

          {/* Licencia */}
          {e.licencia_numero && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Licencia de conducir</p>
              <Row label="Número" value={e.licencia_numero} />
              <Row label="Tipo" value={e.licencia_tipo} />
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted-foreground">Vencimiento</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{e.licencia_vencimiento?.split("-").reverse().join("/")}</span>
                  {licVenceBadge}
                </div>
              </div>
            </div>
          )}

          {/* Periodo prueba */}
          {e.activo && (
            <div className="mt-3 pt-3 border-t">
              {enPrueba
                ? <p className="text-xs text-yellow-700">En periodo de prueba — vence en {diasPrueba} días</p>
                : <p className="text-xs text-green-700">Pasó periodo de prueba</p>
              }
            </div>
          )}

          {/* Action */}
          <div className="mt-4 pt-3 border-t">
            <Button size="sm" variant="outline" className="w-full" onClick={onEditar}><Edit className="h-3 w-3 mr-1" />Ver perfil completo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
