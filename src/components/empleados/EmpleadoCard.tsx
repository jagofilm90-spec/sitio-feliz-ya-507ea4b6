import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, FileText, FolderOpen, FileWarning } from "lucide-react";

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  activo: boolean;
  fecha_ingreso: string;
  sueldo_bruto: number | null;
  premio_asistencia_semanal: number | null;
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
}

const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
const getInitials = (n: string) => { const p = n.split(" ").filter(Boolean); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase(); };
const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

export function EmpleadoCard({ empleado: e, foto, onClose, onEditar, onExpediente, onDocumentos, onActas }: Props) {
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

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            {foto ? (
              <img src={foto} className="w-[120px] h-[120px] rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full flex items-center justify-center text-white text-3xl font-bold shrink-0" style={{ backgroundColor: getColor(e.nombre_completo) }}>
                {getInitials(e.nombre_completo)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{e.nombre_completo}</h2>
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

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button size="sm" variant="outline" className="flex-1" onClick={onEditar}><Edit className="h-3 w-3 mr-1" />Editar</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onExpediente}><FolderOpen className="h-3 w-3 mr-1" />Expediente</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onDocumentos}><FileText className="h-3 w-3 mr-1" />Docs</Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onActas}><FileWarning className="h-3 w-3 mr-1" />Actas</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
