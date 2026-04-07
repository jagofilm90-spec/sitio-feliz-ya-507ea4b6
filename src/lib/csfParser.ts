/**
 * Parser para Constancia de Situación Fiscal (CSF) del SAT
 * Procesamiento 100% en cliente usando pdfjs-dist
 */
import * as pdfjs from "pdfjs-dist";

// Configure worker — use Vite's ?url import to bundle locally
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface CSFDireccion {
  calle: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia: string;
  municipio: string;
  entidad: string;
  codigoPostal: string;
  completa: string;
}

export interface CSFData {
  rfc: string;
  razonSocial: string;
  regimenCapital?: string;
  regimenFiscal: { codigo: string; nombre: string };
  direccionFiscal: CSFDireccion;
  situacion: "Activo" | "Suspendido" | "Cancelado" | "Desconocido";
  fechaInicioOperaciones?: string;
}

function clean(val: string | undefined | null): string {
  return (val || "").replace(/\s+/g, " ").trim();
}

function extractField(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return m ? clean(m[1]) : "";
}

function buildDireccionCompleta(d: Omit<CSFDireccion, "completa">): string {
  const parts: string[] = [];

  if (d.calle) {
    let line = d.calle;
    if (d.numeroExterior) line += ` ${d.numeroExterior}`;
    if (d.numeroInterior) line += `, Int. ${d.numeroInterior}`;
    parts.push(line);
  }
  if (d.colonia) parts.push(`Col. ${d.colonia}`);
  if (d.municipio) parts.push(d.municipio);
  if (d.entidad) parts.push(d.entidad);
  if (d.codigoPostal) parts.push(`CP ${d.codigoPostal}`);

  return parts.join(", ");
}

export async function parseCSF(file: File): Promise<CSFData> {
  // Read file
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  // Extract all text
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  // Normalize
  fullText = fullText.replace(/\s+/g, " ");

  // --- RFC ---
  const rfc = extractField(fullText, /RFC:\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  if (!rfc) {
    throw new Error("No parece ser una Constancia de Situación Fiscal");
  }

  // --- Razón Social / Nombre ---
  let razonSocial = extractField(
    fullText,
    /Denominaci[oó]n[\s/]*Raz[oó]n\s*Social:\s*([^:]+?)(?:\s*R[eé]gimen|\s*Nombre\s*Comercial)/i
  );
  if (!razonSocial) {
    // Persona física
    const nombre = extractField(fullText, /Nombre\s*\(s\):\s*([^:]+?)(?:\s*Primer\s*Apellido)/i);
    const ap1 = extractField(fullText, /Primer\s*Apellido:\s*([^:]+?)(?:\s*Segundo\s*Apellido)/i);
    const ap2 = extractField(fullText, /Segundo\s*Apellido:\s*([^:]+?)(?:\s*Fecha)/i);
    razonSocial = [nombre, ap1, ap2].filter(Boolean).join(" ");
  }
  if (!razonSocial) {
    throw new Error("CSF reconocida pero no pude extraer la razón social");
  }

  // --- Régimen de capital ---
  const regimenCapital = extractField(fullText, /R[eé]gimen\s*(?:de\s*)?Capital:\s*([^:]+?)(?:\s*Nombre\s*Comercial|\s*R[eé]gimen)/i);

  // --- Régimen fiscal ---
  const regimenMatch = fullText.match(/R[eé]gimen:\s*(\d{3})\s*[-–—]?\s*([^:]+?)(?:\s*Fecha|\s*Obligaciones|\s*R[eé]gimen|\s*\d{3})/i);
  const regimenFiscal = {
    codigo: regimenMatch ? regimenMatch[1] : "",
    nombre: regimenMatch ? clean(regimenMatch[2]) : "",
  };

  // --- Domicilio fiscal ---
  const tipoVialidad = extractField(fullText, /Tipo\s*(?:de\s*)?Vialidad:\s*([^:]+?)(?:\s*Nombre\s*(?:de\s*)?Vialidad)/i);
  const nombreVialidad = extractField(fullText, /Nombre\s*(?:de\s*)?Vialidad:\s*([^:]+?)(?:\s*N[uú]mero\s*Exterior)/i);
  const numExt = extractField(fullText, /N[uú]mero\s*Exterior:\s*([^:]+?)(?:\s*N[uú]mero\s*Interior)/i);
  const numInt = extractField(fullText, /N[uú]mero\s*Interior:\s*([^:]+?)(?:\s*Nombre\s*(?:de\s*la\s*)?Colonia)/i);
  const colonia = extractField(fullText, /Nombre\s*(?:de\s*la\s*)?Colonia:\s*([^:]+?)(?:\s*Nombre\s*(?:de\s*la\s*)?Localidad|\s*Nombre\s*(?:del\s*)?Municipio)/i);
  const municipio = extractField(fullText, /Nombre\s*(?:del\s*)?Municipio\s*(?:o\s*Demarcaci[oó]n\s*Territorial)?:\s*([^:]+?)(?:\s*Nombre\s*(?:de\s*la\s*)?Entidad)/i);
  const entidad = extractField(fullText, /Nombre\s*(?:de\s*la\s*)?Entidad\s*Federativa:\s*([^:]+?)(?:\s*Entre\s*Calle|\s*C[oó]digo\s*Postal|\s*Tel[eé]fono)/i);
  const cp = extractField(fullText, /C[oó]digo\s*Postal:\s*(\d{5})/i);

  const calle = [tipoVialidad, nombreVialidad].filter(Boolean).join(" ");

  const direccionParts = {
    calle,
    numeroExterior: numExt || undefined,
    numeroInterior: numInt || undefined,
    colonia,
    municipio,
    entidad,
    codigoPostal: cp,
  };

  const direccionFiscal: CSFDireccion = {
    ...direccionParts,
    completa: buildDireccionCompleta(direccionParts),
  };

  // --- Situación ---
  const sitRaw = extractField(fullText, /Situaci[oó]n\s*(?:del\s*contribuyente)?:\s*([^\s:]+)/i);
  let situacion: CSFData["situacion"] = "Desconocido";
  if (/activo/i.test(sitRaw)) situacion = "Activo";
  else if (/suspendido/i.test(sitRaw)) situacion = "Suspendido";
  else if (/cancelado/i.test(sitRaw)) situacion = "Cancelado";

  // --- Fecha inicio ---
  const fechaInicioOperaciones = extractField(
    fullText,
    /Fecha\s*(?:de\s*)?Inicio\s*(?:de\s*)?[Oo]peraciones:\s*(\d{2}\/\d{2}\/\d{4})/i
  ) || undefined;

  return {
    rfc: rfc.toUpperCase(),
    razonSocial,
    regimenCapital: regimenCapital || undefined,
    regimenFiscal,
    direccionFiscal,
    situacion,
    fechaInicioOperaciones,
  };
}
