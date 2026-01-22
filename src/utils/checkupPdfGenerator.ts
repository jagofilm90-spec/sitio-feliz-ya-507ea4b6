import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";

// Category labels for the checklist
const CATEGORY_LABELS: Record<string, string> = {
  sistema_luces: "Sistema de Luces",
  parte_externa: "Parte Externa",
  parte_interna: "Parte Interna",
  estado_llantas: "Estado de Llantas",
  accesorios_seguridad: "Accesorios de Seguridad",
  tapas_otros: "Tapas y Otros",
};

// Item labels
const ITEM_LABELS: Record<string, string> = {
  luz_delantera_alta: "Luz Delantera Alta",
  luz_delantera_baja: "Luz Delantera Baja",
  luces_emergencia: "Luces de Emergencia",
  luces_neblineros: "Luces Neblineros",
  luz_direccional: "Luz Direccional",
  luz_freno_posterior: "Luz de Freno Posterior",
  luces_faros_piratas: "Luces de Faros Piratas",
  parabrisas_delantero: "Parabrisas Delantero",
  parabrisas_posterior: "Parabrisas Posterior",
  limpia_parabrisas: "Limpia Parabrisas",
  vidrio_parabrisas: "Vidrio Parabrisas",
  espejo_retrovisor: "Espejo Retrovisor",
  espejos_laterales: "Espejos Laterales",
  tablero_indicadores: "Tablero / Indicadores",
  freno_mano: "Freno de Mano",
  freno_servicio: "Freno de Servicio",
  cinturon_chofer: "Cinturón Chofer",
  cinturon_copiloto: "Cinturón Copiloto",
  cinturon_posterior: "Cinturón Posterior",
  espejo_antideslumbrante: "Espejo Antideslumbrante",
  linterna_mano: "Linterna de Mano",
  orden_limpieza_cabina: "Orden y Limpieza Cabina",
  direccion: "Dirección",
  orden_limpieza_caja: "Orden y Limpieza Caja",
  llanta_delantera_derecha: "Llanta Delantera Derecha",
  llanta_delantera_izquierda: "Llanta Delantera Izquierda",
  llanta_posterior_derecha: "Llanta Posterior Derecha",
  llanta_posterior_izquierda: "Llanta Posterior Izquierda",
  llanta_repuesto: "Llanta de Repuesto",
  conos_seguridad: "Conos de Seguridad",
  extintor: "Extintor",
  alarma_retrocesos: "Alarma de Retrocesos",
  claxon: "Claxon",
  cunas_seguridad: "Cuñas de Seguridad",
  tapa_tanque_gasolina: "Tapa Tanque Gasolina",
  gata_hidraulica: "Gata Hidráulica",
  herramientas_palanca: "Herramientas / Palanca",
  cable_cadena_estrobo: "Cable / Cadena / Estrobo",
  refrigeracion_thermo: "Refrigeración / Thermo King",
};

// NN (No Negociable) items
const NN_ITEMS = [
  "luz_delantera_alta", "luz_delantera_baja", "luces_emergencia",
  "freno_mano", "freno_servicio", 
  "cinturon_chofer", "cinturon_copiloto", "cinturon_posterior",
  "espejo_antideslumbrante", "direccion",
  "alarma_retrocesos", "claxon"
];

// Categories with their items
const CATEGORIES = [
  { key: 'sistema_luces', items: ['luz_delantera_alta', 'luz_delantera_baja', 'luces_emergencia', 'luces_neblineros', 'luz_direccional', 'luz_freno_posterior', 'luces_faros_piratas'] },
  { key: 'parte_externa', items: ['parabrisas_delantero', 'parabrisas_posterior', 'limpia_parabrisas', 'vidrio_parabrisas', 'espejo_retrovisor', 'espejos_laterales'] },
  { key: 'parte_interna', items: ['tablero_indicadores', 'freno_mano', 'freno_servicio', 'cinturon_chofer', 'cinturon_copiloto', 'cinturon_posterior', 'espejo_antideslumbrante', 'linterna_mano', 'orden_limpieza_cabina', 'direccion', 'orden_limpieza_caja'] },
  { key: 'estado_llantas', items: ['llanta_delantera_derecha', 'llanta_delantera_izquierda', 'llanta_posterior_derecha', 'llanta_posterior_izquierda', 'llanta_repuesto'] },
  { key: 'accesorios_seguridad', items: ['conos_seguridad', 'extintor', 'alarma_retrocesos', 'claxon', 'cunas_seguridad'] },
  { key: 'tapas_otros', items: ['tapa_tanque_gasolina', 'gata_hidraulica', 'herramientas_palanca', 'cable_cadena_estrobo', 'refrigeracion_thermo'] },
];

// Damage type configuration
const DANO_CONFIG: Record<string, { label: string; color: { r: number; g: number; b: number } }> = {
  golpe: { label: "Golpe", color: { r: 220, g: 38, b: 38 } },
  raspadura: { label: "Raspadura", color: { r: 217, g: 119, b: 6 } },
  grieta: { label: "Grieta", color: { r: 37, g: 99, b: 235 } },
};

// Brand colors
const BRAND_RED = { r: 180, g: 30, b: 30 };
const BRAND_DARK = { r: 40, g: 40, b: 40 };
const BRAND_GRAY = { r: 100, g: 100, b: 100 };
const BRAND_GREEN = { r: 22, g: 163, b: 74 };

interface DanoMarcado {
  id: string;
  tipo: string;
  vista: string;
  posicionX: number;
  posicionY: number;
}

interface CheckupData {
  id: string;
  fecha_checkup: string;
  hora_inspeccion?: string | null;
  kilometraje_inicial?: number | null;
  prioridad?: string | null;
  tiene_items_nn_fallados?: boolean | null;
  checklist_detalle?: Record<string, string> | null;
  fallas_detectadas?: string | null;
  observaciones_golpes?: string | null;
  firma_conductor?: string | null;
  firma_supervisor?: string | null;
}

interface VehiculoData {
  id: string;
  nombre: string;
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
}

interface ChoferData {
  id: string;
  nombre_completo: string;
  telefono?: string | null;
}

interface CheckupPDFParams {
  checkup: CheckupData;
  vehiculo: VehiculoData;
  chofer?: ChoferData | null;
  realizadoPor?: string | null;
}

// Helper function to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
};

// Get priority display info
const getPrioridadDisplay = (prioridad: string | null | undefined): { text: string; color: { r: number; g: number; b: number } } => {
  const prioridadMap: Record<string, { text: string; color: { r: number; g: number; b: number } }> = {
    urgente: { text: "URGENTE - Atender hoy", color: { r: 220, g: 38, b: 38 } },
    alta: { text: "ALTA - Atender esta semana", color: { r: 234, g: 88, b: 12 } },
    media: { text: "MEDIA - Atender pronto", color: { r: 202, g: 138, b: 4 } },
    baja: { text: "BAJA - Puede esperar", color: { r: 107, g: 114, b: 128 } },
  };
  return prioridadMap[prioridad || 'media'] || prioridadMap.media;
};

// Get area label from coordinates
const getAreaLabel = (x: number, y: number): string => {
  let vertical = "";
  let horizontal = "";
  
  if (y < 30) vertical = "Frente";
  else if (y > 70) vertical = "Trasera";
  else vertical = "Centro";
  
  if (x < 35) horizontal = "Izquierda";
  else if (x > 65) horizontal = "Derecha";
  else horizontal = "";
  
  return `${vertical}${horizontal ? ` ${horizontal}` : ""}`;
};

// Parse daños from observaciones_golpes
const parseDanos = (observacionesGolpes: string | null | undefined): DanoMarcado[] => {
  if (!observacionesGolpes) return [];
  try {
    const data = JSON.parse(observacionesGolpes);
    return data.danos || [];
  } catch {
    return [];
  }
};

const getNotasDanos = (observacionesGolpes: string | null | undefined): string => {
  if (!observacionesGolpes) return '';
  try {
    const data = JSON.parse(observacionesGolpes);
    return data.notas || '';
  } catch {
    return observacionesGolpes; // Legacy format - plain text
  }
};

export const generarCheckupPDF = async (params: CheckupPDFParams): Promise<Blob> => {
  const { checkup, vehiculo, chofer, realizadoPor } = params;
  
  console.log("Generando PDF de checkup vehicular...", {
    checkupId: checkup.id,
    vehiculoId: vehiculo.id
  });
  
  const doc = new jsPDF();
  
  // ================ HEADER WITH BRAND BAR ================
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.rect(0, 0, 210, 10, "F");
  
  // Load and add logo
  try {
    const logoUrl = `${window.location.origin}/logo-almasa-pdf.png`;
    const logoBase64 = await loadImageAsBase64(logoUrl);
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 14, 40, 16);
    }
  } catch (logoError) {
    console.warn("No se pudo cargar el logo:", logoError);
  }
  
  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("CHECK LIST - REVISIÓN DE SALIDA", 195, 20, { align: "right" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text(COMPANY_DATA.razonSocial, 195, 26, { align: "right" });
  doc.setFontSize(7);
  doc.text(`RFC: ${COMPANY_DATA.rfc} | Sistema de Gestión de Flotilla`, 195, 30, { align: "right" });
  
  // Horizontal line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, 36, 195, 36);
  
  // ================ VEHICLE INFO SECTION ================
  let yPos = 44;
  
  // Vehicle badge
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.roundedRect(15, yPos - 5, 60, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(vehiculo.nombre, 45, yPos + 2, { align: "center" });
  
  // Placa badge
  if (vehiculo.placa) {
    doc.setFillColor(70, 70, 70);
    doc.roundedRect(80, yPos - 5, 35, 12, 2, 2, "F");
    doc.setFontSize(10);
    doc.text(vehiculo.placa, 97.5, yPos + 2, { align: "center" });
  }
  
  // Priority badge (if has issues)
  if (checkup.prioridad && checkup.prioridad !== 'baja') {
    const prioridadInfo = getPrioridadDisplay(checkup.prioridad);
    doc.setFillColor(prioridadInfo.color.r, prioridadInfo.color.g, prioridadInfo.color.b);
    doc.roundedRect(120, yPos - 5, 75, 12, 2, 2, "F");
    doc.setFontSize(9);
    doc.text(prioridadInfo.text, 157.5, yPos + 2, { align: "center" });
  }
  
  yPos += 18;
  
  // ================ MAIN INFO BOX ================
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(15, yPos, 180, 32, 3, 3, "FD");
  
  yPos += 8;
  
  // Left column
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("CHOFER", 20, yPos);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(chofer?.nombre_completo || "No asignado", 20, yPos + 5);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("REALIZADO POR", 20, yPos + 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(realizadoPor || "—", 20, yPos + 19);
  
  // Middle column
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("MARCA / MODELO", 85, yPos);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  const marcaModelo = [vehiculo.marca, vehiculo.modelo, vehiculo.anio].filter(Boolean).join(" ");
  doc.text(marcaModelo || "—", 85, yPos + 5);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("KILOMETRAJE", 85, yPos + 14);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(checkup.kilometraje_inicial ? `${checkup.kilometraje_inicial.toLocaleString()} km` : "—", 85, yPos + 20);
  
  // Right column
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("FECHA", 150, yPos);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(format(new Date(checkup.fecha_checkup), "dd/MM/yyyy"), 150, yPos + 7);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("HORA", 150, yPos + 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(checkup.hora_inspeccion || "—", 150, yPos + 19);
  
  yPos += 38;
  
  // ================ NN ALERT (if applicable) ================
  if (checkup.tiene_items_nn_fallados) {
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.roundedRect(15, yPos, 180, 16, 3, 3, "FD");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(153, 27, 27);
    doc.text("⚠️ PUNTOS NO NEGOCIABLES CON FALLA - VEHÍCULO NO PUEDE SALIR", 105, yPos + 10, { align: "center" });
    
    yPos += 22;
    doc.setLineWidth(0.5);
  }
  
  // ================ CHECKLIST TABLE ================
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("CHECKLIST DE INSPECCIÓN", 15, yPos);
  
  yPos += 6;
  
  const checklist = checkup.checklist_detalle || {};
  
  for (const cat of CATEGORIES) {
    // Check if need new page
    if (yPos > 255) {
      doc.addPage();
      yPos = 20;
    }
    
    // Category header
    doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.rect(15, yPos, 180, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(CATEGORY_LABELS[cat.key] || cat.key, 20, yPos + 5);
    
    yPos += 9;
    
    // Items in 2 columns
    const itemsPerColumn = Math.ceil(cat.items.length / 2);
    let maxRowY = yPos;
    
    for (let col = 0; col < 2; col++) {
      const startX = col === 0 ? 15 : 105;
      let colY = yPos;
      
      for (let i = 0; i < itemsPerColumn; i++) {
        const itemIndex = col * itemsPerColumn + i;
        if (itemIndex >= cat.items.length) break;
        
        const itemKey = cat.items[itemIndex];
        const value = checklist[itemKey] || 'NA';
        const label = ITEM_LABELS[itemKey] || itemKey;
        const isNN = NN_ITEMS.includes(itemKey);
        
        // Background for alternating rows
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(startX, colY - 3, 88, 6, "F");
        }
        
        // Item label
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
        doc.text(label, startX + 2, colY);
        
        // NN badge
        if (isNN) {
          doc.setFillColor(251, 191, 36);
          doc.roundedRect(startX + 60, colY - 3, 8, 5, 1, 1, "F");
          doc.setFontSize(5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(120, 53, 15);
          doc.text("NN", startX + 64, colY, { align: "center" });
        }
        
        // Status
        let statusX = startX + 80;
        if (value === 'B') {
          doc.setTextColor(BRAND_GREEN.r, BRAND_GREEN.g, BRAND_GREEN.b);
          doc.setFont("helvetica", "bold");
          doc.text("✓ B", statusX, colY);
        } else if (value === 'M') {
          doc.setTextColor(220, 38, 38);
          doc.setFont("helvetica", "bold");
          doc.text("✗ M", statusX, colY);
        } else {
          doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
          doc.setFont("helvetica", "normal");
          doc.text("○ NA", statusX, colY);
        }
        
        colY += 6;
      }
      
      if (colY > maxRowY) maxRowY = colY;
    }
    
    yPos = maxRowY + 3;
  }
  
  // ================ DAÑOS SECTION ================
  const danos = parseDanos(checkup.observaciones_golpes);
  const notasDanos = getNotasDanos(checkup.observaciones_golpes);
  
  if (danos.length > 0 || notasDanos) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.text("🚗 GOLPES Y RASPADURAS", 15, yPos);
    
    yPos += 8;
    
    if (danos.length > 0) {
      // Table header
      doc.setFillColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
      doc.rect(15, yPos - 4, 180, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("#", 20, yPos);
      doc.text("TIPO", 35, yPos);
      doc.text("VISTA", 80, yPos);
      doc.text("UBICACIÓN APROX.", 130, yPos);
      
      yPos += 6;
      
      danos.forEach((dano, index) => {
        const config = DANO_CONFIG[dano.tipo] || DANO_CONFIG.golpe;
        const ubicacion = getAreaLabel(dano.posicionX, dano.posicionY);
        
        // Alternating row
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, yPos - 3, 180, 6, "F");
        }
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
        doc.text(String(index + 1), 20, yPos);
        
        // Tipo with color
        doc.setTextColor(config.color.r, config.color.g, config.color.b);
        doc.setFont("helvetica", "bold");
        doc.text(config.label, 35, yPos);
        
        doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
        doc.setFont("helvetica", "normal");
        doc.text(dano.vista || "—", 80, yPos);
        doc.text(ubicacion, 130, yPos);
        
        yPos += 6;
      });
    }
    
    if (notasDanos) {
      yPos += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
      const notasLines = doc.splitTextToSize(`Notas: ${notasDanos}`, 175);
      notasLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 4;
      });
    }
    
    yPos += 5;
  }
  
  // ================ OBSERVATIONS SECTION ================
  if (checkup.fallas_detectadas) {
    if (yPos > 245) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(255, 248, 240);
    doc.setDrawColor(255, 200, 150);
    
    const obsLines = doc.splitTextToSize(checkup.fallas_detectadas, 168);
    const obsHeight = 12 + (obsLines.length * 4);
    
    doc.roundedRect(15, yPos, 180, obsHeight, 3, 3, "FD");
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 100, 40);
    doc.text("📝 OBSERVACIONES / FALLAS DETECTADAS", 20, yPos + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    
    let obsY = yPos + 14;
    obsLines.forEach((line: string) => {
      doc.text(line, 20, obsY);
      obsY += 4;
    });
    
    yPos += obsHeight + 8;
  }
  
  // ================ SIGNATURES SECTION ================
  if (checkup.firma_conductor || checkup.firma_supervisor) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.text("✍️ FIRMAS DE CONFORMIDAD", 15, yPos);
    
    yPos += 8;
    
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(15, yPos, 180, 45, 3, 3, "FD");
    
    // Firma Conductor
    if (checkup.firma_conductor) {
      try {
        doc.addImage(checkup.firma_conductor, "PNG", 25, yPos + 3, 65, 28);
      } catch (e) {
        console.warn("Error adding conductor signature:", e);
      }
    }
    doc.setDrawColor(180, 180, 180);
    doc.line(25, yPos + 33, 90, yPos + 33);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    doc.text("Firma del Conductor", 57.5, yPos + 39, { align: "center" });
    
    // Firma Supervisor
    if (checkup.firma_supervisor) {
      try {
        doc.addImage(checkup.firma_supervisor, "PNG", 120, yPos + 3, 65, 28);
      } catch (e) {
        console.warn("Error adding supervisor signature:", e);
      }
    }
    doc.line(120, yPos + 33, 185, yPos + 33);
    doc.text("Firma del Supervisor", 152.5, yPos + 39, { align: "center" });
    
    yPos += 52;
  }
  
  // ================ FOOTER ================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer bar
    doc.setFillColor(250, 250, 250);
    doc.rect(0, 285, 210, 12, "F");
    doc.setDrawColor(220, 220, 220);
    doc.line(0, 285, 210, 285);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    doc.text(COMPANY_DATA.razonSocial, 15, 291);
    doc.text(`Documento generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 105, 291, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, 195, 291, { align: "right" });
  }
  
  console.log("PDF de checkup generado exitosamente");
  
  return doc.output("blob");
};

export const descargarCheckupPDF = async (params: CheckupPDFParams): Promise<void> => {
  const blob = await generarCheckupPDF(params);
  
  const fecha = format(new Date(params.checkup.fecha_checkup), "yyyy-MM-dd");
  const fileName = `Checkup_${params.vehiculo.nombre.replace(/\s+/g, '_')}_${fecha}.pdf`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
