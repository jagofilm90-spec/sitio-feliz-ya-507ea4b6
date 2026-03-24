// Normalización de texto para el sistema ALMASA
// Garantiza consistencia en nombres, direcciones y datos capturados.

// Palabras que no se capitalizan (excepto al inicio)
const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "el", "en", "y", "e", "o", "u", "al", "a", "con", "sin", "por", "para"]);

// Abreviaturas que mantienen su formato
const ABBREVIATIONS: Record<string, string> = {
  "col.": "Col.", "col": "Col.", "c.p.": "C.P.", "cp": "C.P.", "c.p": "C.P.",
  "no.": "No.", "num.": "Núm.", "núm.": "Núm.", "int.": "Int.", "ext.": "Ext.",
  "av.": "Av.", "av": "Av.", "blvd.": "Blvd.", "blvd": "Blvd.",
  "fracc.": "Fracc.", "fracc": "Fracc.", "mza.": "Mza.", "mza": "Mza.",
  "lt.": "Lt.", "lt": "Lt.", "piso": "Piso", "depto.": "Depto.", "depto": "Depto.",
  "esq.": "Esq.", "esq": "Esq.", "km.": "Km.", "km": "Km.",
  "s.a.": "S.A.", "sa": "SA", "s.a": "S.A.",
  "c.v.": "C.V.", "cv": "CV", "c.v": "C.V.",
  "s.c.": "S.C.", "sc": "SC",
  "s.r.l.": "S.R.L.", "srl": "SRL",
  "cdmx": "CDMX", "edo.": "Edo.", "mex.": "Méx.",
  "rfc": "RFC", "curp": "CURP", "imss": "IMSS", "nss": "NSS",
};

// Sufijos de empresa que van en mayúsculas
const COMPANY_SUFFIXES = ["SA", "CV", "SC", "SRL", "SAPI", "SPR"];

/**
 * Title Case: primera letra de cada palabra en mayúscula.
 * Respeta artículos/preposiciones en minúscula (excepto al inicio).
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Todo mayúsculas, trimmed.
 */
export function toUpperTrimmed(text: string | null | undefined): string {
  if (!text) return "";
  return text.trim().toUpperCase();
}

/**
 * Normaliza direcciones: Title Case respetando abreviaturas.
 * "melchor ocampo no. 59, col. magdalena" → "Melchor Ocampo No. 59, Col. Magdalena"
 */
export function normalizeAddress(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Limpiar puntuación final para lookup
      const cleanWord = word.replace(/[.,;:]+$/, "");
      const punct = word.slice(cleanWord.length);

      // Revisar abreviaturas
      const abbr = ABBREVIATIONS[cleanWord.toLowerCase()];
      if (abbr) return abbr + punct;

      // Números y códigos postales
      if (/^\d/.test(cleanWord)) return word;

      // Preposiciones (excepto al inicio)
      if (index > 0 && LOWERCASE_WORDS.has(cleanWord)) return word;

      // Title case normal
      if (cleanWord.length === 0) return word;
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1) + punct;
    })
    .join(" ");
}

/**
 * Normaliza nombre de empresa: Title Case + sufijos corporativos en UPPER.
 * "abarrotes la manita sa de cv" → "Abarrotes la Manita SA de CV"
 */
export function normalizeCompanyName(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (COMPANY_SUFFIXES.includes(upper)) return upper;
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Helper para usar en onBlur de inputs React.
 * Retorna un handler que normaliza el valor del input.
 */
export function onBlurNormalize(
  setter: (value: string) => void,
  type: "title" | "upper" | "address" | "company" = "title"
) {
  return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (!value.trim()) return;
    switch (type) {
      case "title": setter(toTitleCase(value)); break;
      case "upper": setter(toUpperTrimmed(value)); break;
      case "address": setter(normalizeAddress(value)); break;
      case "company": setter(normalizeCompanyName(value)); break;
    }
  };
}
