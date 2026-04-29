export const getTipoEventoLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    auto_faltante: "Faltante",
    auto_precio_subio: "Precio subió",
    auto_precio_bajo: "Precio bajó",
    auto_lead_time_mejoro: "Lead time mejor",
    auto_lead_time_empeoro: "Lead time peor",
    manual_aviso: "Aviso",
    manual_cambio_contacto: "Cambio contacto",
    manual_cambio_precio: "Cambio precio",
    manual_observacion: "Observación",
  };
  return labels[tipo] || "Evento";
};

export const getTipoEventoIcon = (tipo: string): string => {
  const icons: Record<string, string> = {
    auto_faltante: "⚠",
    auto_precio_subio: "📈",
    auto_precio_bajo: "📉",
    auto_lead_time_mejoro: "⚡",
    auto_lead_time_empeoro: "🐢",
    manual_aviso: "📢",
    manual_cambio_contacto: "👤",
    manual_cambio_precio: "💰",
    manual_observacion: "📝",
  };
  return icons[tipo] || "📋";
};

export type IconTone = "amber" | "red" | "green" | "blue" | "warm";

export const getTipoEventoTone = (tipo: string): IconTone => {
  const tones: Record<string, IconTone> = {
    auto_faltante: "amber",
    auto_precio_subio: "red",
    auto_precio_bajo: "green",
    auto_lead_time_mejoro: "green",
    auto_lead_time_empeoro: "amber",
    manual_aviso: "blue",
    manual_cambio_contacto: "blue",
    manual_cambio_precio: "blue",
    manual_observacion: "warm",
  };
  return tones[tipo] || "warm";
};

export const toneClasses: Record<IconTone, string> = {
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  warm: "bg-warm-100 text-ink-700",
};

export const MANUAL_EVENT_TYPES = [
  { value: "manual_observacion", label: "📝 Observación general" },
  { value: "manual_aviso", label: "📢 Aviso" },
  { value: "manual_cambio_contacto", label: "👤 Cambio de contacto" },
  { value: "manual_cambio_precio", label: "💰 Cambio de precio" },
] as const;

export interface EventoProveedor {
  id: string;
  proveedor_id: string;
  tipo_evento: string;
  titulo: string;
  descripcion: string | null;
  metadata: any;
  created_by: string | null;
  origen: "auto" | "manual";
  created_at: string;
}
