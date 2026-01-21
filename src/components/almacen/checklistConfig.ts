import { ChecklistStatus } from "./ChecklistItemRow";

// Definición de categorías y items del checklist profesional
export interface ChecklistItem {
  key: string;
  label: string;
  isNN: boolean; // No Negociable
}

export interface ChecklistCategory {
  key: string;
  label: string;
  icon: string;
  items: ChecklistItem[];
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    key: "sistema_luces",
    label: "Sistema de Luces",
    icon: "💡",
    items: [
      { key: "luz_delantera_alta", label: "Luz Delantera Alta", isNN: true },
      { key: "luz_delantera_baja", label: "Luz Delantera Baja", isNN: true },
      { key: "luces_emergencia", label: "Luces de Emergencia", isNN: true },
      { key: "luces_neblineros", label: "Luces Neblineros", isNN: false },
      { key: "luz_direccional", label: "Luz Direccional", isNN: false },
      { key: "luz_freno_posterior", label: "Luz de Freno Posterior", isNN: false },
      { key: "luces_faros_piratas", label: "Luces de Faros Piratas", isNN: false },
    ],
  },
  {
    key: "parte_externa",
    label: "Parte Externa",
    icon: "🚐",
    items: [
      { key: "parabrisas_delantero", label: "Parabrisas Delantero", isNN: false },
      { key: "parabrisas_posterior", label: "Parabrisas Posterior", isNN: false },
      { key: "limpia_parabrisas", label: "Limpia Parabrisas", isNN: false },
      { key: "vidrio_parabrisas", label: "Vidrio Parabrisas (sin daños)", isNN: false },
      { key: "espejo_retrovisor", label: "Espejo Retrovisor", isNN: false },
      { key: "espejos_laterales", label: "Espejos Laterales", isNN: false },
    ],
  },
  {
    key: "parte_interna",
    label: "Parte Interna",
    icon: "🪑",
    items: [
      { key: "tablero_indicadores", label: "Tablero / Indicadores Operativos", isNN: false },
      { key: "freno_mano", label: "Freno de Mano", isNN: true },
      { key: "freno_servicio", label: "Freno de Servicio", isNN: true },
      { key: "cinturon_chofer", label: "Cinturón Chofer", isNN: true },
      { key: "cinturon_copiloto", label: "Cinturón Copiloto", isNN: true },
      { key: "cinturon_posterior", label: "Cinturón Posterior", isNN: true },
      { key: "espejo_antideslumbrante", label: "Espejo Antideslumbrante", isNN: true },
      { key: "linterna_mano", label: "Linterna de Mano", isNN: false },
      { key: "orden_limpieza_cabina", label: "Orden y Limpieza Cabina", isNN: false },
      { key: "direccion", label: "Dirección", isNN: true },
      { key: "orden_limpieza_caja", label: "Orden y Limpieza Caja", isNN: false },
    ],
  },
  {
    key: "estado_llantas",
    label: "Estado de Llantas",
    icon: "🛞",
    items: [
      { key: "llanta_delantera_derecha", label: "Llanta Delantera Derecha", isNN: false },
      { key: "llanta_delantera_izquierda", label: "Llanta Delantera Izquierda", isNN: false },
      { key: "llanta_posterior_derecha", label: "Llanta Posterior Derecha", isNN: false },
      { key: "llanta_posterior_izquierda", label: "Llanta Posterior Izquierda", isNN: false },
      { key: "llanta_repuesto", label: "Llanta de Repuesto", isNN: false },
    ],
  },
  {
    key: "accesorios_seguridad",
    label: "Accesorios de Seguridad",
    icon: "🦺",
    items: [
      { key: "conos_seguridad", label: "Conos de Seguridad", isNN: false },
      { key: "extintor", label: "Extintor", isNN: false },
      { key: "alarma_retrocesos", label: "Alarma de Retrocesos", isNN: true },
      { key: "claxon", label: "Claxon", isNN: true },
      { key: "cunas_seguridad", label: "Cuñas de Seguridad", isNN: false },
    ],
  },
  {
    key: "tapas_otros",
    label: "Tapas y Otros",
    icon: "🔧",
    items: [
      { key: "tapa_tanque_gasolina", label: "Tapa Tanque Gasolina", isNN: false },
      { key: "gata_hidraulica", label: "Gata Hidráulica", isNN: false },
      { key: "herramientas_palanca", label: "Herramientas / Palanca", isNN: false },
      { key: "cable_cadena_estrobo", label: "Cable / Cadena / Estrobo", isNN: false },
      { key: "refrigeracion_thermo", label: "Refrigeración / Thermo King", isNN: false },
    ],
  },
];

// Obtener todos los items planos
export const getAllChecklistItems = (): ChecklistItem[] => {
  return CHECKLIST_CATEGORIES.flatMap((cat) => cat.items);
};

// Obtener solo los items No Negociables
export const getNNItems = (): ChecklistItem[] => {
  return getAllChecklistItems().filter((item) => item.isNN);
};

// Crear checklist inicial con todos los valores en "B"
export const createInitialChecklist = (): Record<string, ChecklistStatus> => {
  const checklist: Record<string, ChecklistStatus> = {};
  getAllChecklistItems().forEach((item) => {
    checklist[item.key] = "B";
  });
  return checklist;
};

// Validar items NN fallados
export const validateNNItems = (
  checklist: Record<string, ChecklistStatus>
): { isValid: boolean; failedItems: ChecklistItem[] } => {
  const nnItems = getNNItems();
  const failedItems = nnItems.filter((item) => checklist[item.key] === "M");
  return {
    isValid: failedItems.length === 0,
    failedItems,
  };
};

// Contar items por estado
export const countItemsByStatus = (
  checklist: Record<string, ChecklistStatus>
): { bueno: number; mal: number; na: number; total: number } => {
  const allItems = getAllChecklistItems();
  let bueno = 0,
    mal = 0,
    na = 0;

  allItems.forEach((item) => {
    const status = checklist[item.key];
    if (status === "B") bueno++;
    else if (status === "M") mal++;
    else if (status === "NA") na++;
  });

  return { bueno, mal, na, total: allItems.length };
};

// Mapear nuevo formato a campos legacy para compatibilidad
export const mapToLegacyFields = (
  checklist: Record<string, ChecklistStatus>
): Record<string, boolean> => {
  return {
    frenos_ok: checklist.freno_servicio === "B" && checklist.freno_mano === "B",
    luces_ok:
      checklist.luz_delantera_alta === "B" &&
      checklist.luz_delantera_baja === "B" &&
      checklist.luces_emergencia === "B",
    llantas_ok:
      checklist.llanta_delantera_derecha === "B" &&
      checklist.llanta_delantera_izquierda === "B" &&
      checklist.llanta_posterior_derecha === "B" &&
      checklist.llanta_posterior_izquierda === "B",
    aceite_ok: true, // No hay item específico en nuevo formato
    anticongelante_ok: true, // No hay item específico en nuevo formato
    espejos_ok:
      checklist.espejo_retrovisor === "B" &&
      checklist.espejos_laterales === "B" &&
      checklist.espejo_antideslumbrante === "B",
    limpiadores_ok: checklist.limpia_parabrisas === "B",
    bateria_ok: true, // No hay item específico en nuevo formato
    direccion_ok: checklist.direccion === "B",
    suspension_ok: true, // No hay item específico en nuevo formato
    escape_ok: true, // No hay item específico en nuevo formato
    cinturones_ok:
      checklist.cinturon_chofer === "B" &&
      checklist.cinturon_copiloto === "B" &&
      checklist.cinturon_posterior === "B",
  };
};
