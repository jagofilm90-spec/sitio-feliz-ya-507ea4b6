import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CFDIData {
  // Comprobante attributes
  serie?: string;
  folio?: string;
  fecha?: string;
  subtotal?: number;
  descuento?: number;
  total?: number;
  moneda?: string;
  tipoCambio?: number;
  tipoComprobante?: string;
  metodoPago?: string;
  formaPago?: string;
  condicionesDePago?: string;
  
  // Emisor
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal?: string;
  };
  
  // Receptor
  receptor: {
    rfc: string;
    nombre: string;
    usoCFDI?: string;
    domicilioFiscal?: string;
    regimenFiscal?: string;
  };
  
  // Impuestos
  impuestos: {
    totalImpuestosTrasladados?: number;
    totalImpuestosRetenidos?: number;
    iva?: number;
    ieps?: number;
  };
  
  // Timbre fiscal
  uuid?: string;
  fechaTimbrado?: string;
  selloSAT?: string;
  
  // Conceptos (first 10 for preview)
  conceptos: Array<{
    claveProdServ: string;
    cantidad: number;
    claveUnidad: string;
    unidad?: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    noIdentificacion?: string;
  }>;
  
  // Metadata
  version?: string;
  cfdiRelacionados?: Array<{
    tipoRelacion: string;
    uuid: string;
  }>;
  
  // Observaciones y número de talón para vinculación
  observaciones?: string;
  numeroTalonExtraido?: string;
}

function extractAttribute(xmlString: string, attributeName: string): string | undefined {
  // Try multiple patterns for attribute extraction
  const patterns = [
    new RegExp(`${attributeName}="([^"]*)"`, 'i'),
    new RegExp(`${attributeName}='([^']*)'`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = xmlString.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

function extractNumericAttribute(xmlString: string, attributeName: string): number | undefined {
  const value = extractAttribute(xmlString, attributeName);
  if (value) {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

function extractElementBlock(xmlString: string, tagName: string): string | undefined {
  // Handle namespaced tags like cfdi:Emisor or just Emisor
  const patterns = [
    new RegExp(`<[a-z]*:?${tagName}[^>]*/>`, 'gi'),  // Self-closing
    new RegExp(`<[a-z]*:?${tagName}[^>]*>.*?</[a-z]*:?${tagName}>`, 'gis'),  // Full element
    new RegExp(`<${tagName}[^>]*/>`, 'gi'),  // Self-closing without namespace
    new RegExp(`<${tagName}[^>]*>.*?</${tagName}>`, 'gis'),  // Full element without namespace
  ];
  
  for (const pattern of patterns) {
    const match = xmlString.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

function extractAllElementBlocks(xmlString: string, tagName: string): string[] {
  const patterns = [
    new RegExp(`<[a-z]*:?${tagName}[^>]*/>`, 'gi'),
    new RegExp(`<[a-z]*:?${tagName}[^>]*>.*?</[a-z]*:?${tagName}>`, 'gis'),
  ];
  
  const results: string[] = [];
  for (const pattern of patterns) {
    const matches = xmlString.matchAll(pattern);
    for (const match of matches) {
      results.push(match[0]);
    }
  }
  return results;
}

// Extract talon number from text using common patterns
function extractNumeroTalon(textos: string[]): string | null {
  const patterns = [
    /n[uú]mero\s*(?:de\s*)?tal[oó]n[:\s]*(\d+)/i,
    /tal[oó]n[:\s]*(\d+)/i,
    /ticket[:\s]*(\d+)/i,
    /boleto[:\s]*(\d+)/i,
    /nota[:\s]*(\d{4,})/i, // At least 4 digits to avoid false positives
  ];
  
  const combinedText = textos.filter(Boolean).join(' ');
  
  for (const pattern of patterns) {
    const match = combinedText.match(pattern);
    if (match) {
      console.log("Talon number found:", match[1], "using pattern:", pattern.toString());
      return match[1];
    }
  }
  
  return null;
}

function parseCFDI(xmlContent: string): CFDIData {
  console.log("Parsing CFDI XML, length:", xmlContent.length);
  
  // Remove BOM if present
  const cleanXml = xmlContent.replace(/^\uFEFF/, '').trim();
  
  // Extract Comprobante root element
  const comprobanteMatch = cleanXml.match(/<[a-z]*:?Comprobante[^>]*>/i);
  const comprobanteTag = comprobanteMatch ? comprobanteMatch[0] : cleanXml;
  
  // Extract main attributes from Comprobante
  const result: CFDIData = {
    version: extractAttribute(comprobanteTag, 'Version') || extractAttribute(comprobanteTag, 'version'),
    serie: extractAttribute(comprobanteTag, 'Serie') || extractAttribute(comprobanteTag, 'serie'),
    folio: extractAttribute(comprobanteTag, 'Folio') || extractAttribute(comprobanteTag, 'folio'),
    fecha: extractAttribute(comprobanteTag, 'Fecha') || extractAttribute(comprobanteTag, 'fecha'),
    subtotal: extractNumericAttribute(comprobanteTag, 'SubTotal') || extractNumericAttribute(comprobanteTag, 'subTotal'),
    descuento: extractNumericAttribute(comprobanteTag, 'Descuento') || extractNumericAttribute(comprobanteTag, 'descuento'),
    total: extractNumericAttribute(comprobanteTag, 'Total') || extractNumericAttribute(comprobanteTag, 'total'),
    moneda: extractAttribute(comprobanteTag, 'Moneda') || extractAttribute(comprobanteTag, 'moneda') || 'MXN',
    tipoCambio: extractNumericAttribute(comprobanteTag, 'TipoCambio'),
    tipoComprobante: extractAttribute(comprobanteTag, 'TipoDeComprobante') || extractAttribute(comprobanteTag, 'tipoDeComprobante'),
    metodoPago: extractAttribute(comprobanteTag, 'MetodoPago') || extractAttribute(comprobanteTag, 'metodoPago'),
    formaPago: extractAttribute(comprobanteTag, 'FormaPago') || extractAttribute(comprobanteTag, 'formaPago'),
    condicionesDePago: extractAttribute(comprobanteTag, 'CondicionesDePago'),
    
    emisor: { rfc: '', nombre: '' },
    receptor: { rfc: '', nombre: '' },
    impuestos: {},
    conceptos: [],
  };
  
  // Extract Emisor
  const emisorBlock = extractElementBlock(cleanXml, 'Emisor');
  if (emisorBlock) {
    result.emisor = {
      rfc: extractAttribute(emisorBlock, 'Rfc') || extractAttribute(emisorBlock, 'rfc') || '',
      nombre: extractAttribute(emisorBlock, 'Nombre') || extractAttribute(emisorBlock, 'nombre') || '',
      regimenFiscal: extractAttribute(emisorBlock, 'RegimenFiscal') || extractAttribute(emisorBlock, 'regimenFiscal'),
    };
  }
  console.log("Emisor extracted:", result.emisor);
  
  // Extract Receptor
  const receptorBlock = extractElementBlock(cleanXml, 'Receptor');
  if (receptorBlock) {
    result.receptor = {
      rfc: extractAttribute(receptorBlock, 'Rfc') || extractAttribute(receptorBlock, 'rfc') || '',
      nombre: extractAttribute(receptorBlock, 'Nombre') || extractAttribute(receptorBlock, 'nombre') || '',
      usoCFDI: extractAttribute(receptorBlock, 'UsoCFDI') || extractAttribute(receptorBlock, 'usoCFDI'),
      domicilioFiscal: extractAttribute(receptorBlock, 'DomicilioFiscalReceptor'),
      regimenFiscal: extractAttribute(receptorBlock, 'RegimenFiscalReceptor'),
    };
  }
  console.log("Receptor extracted:", result.receptor);
  
  // Extract TimbreFiscalDigital
  const timbreBlock = extractElementBlock(cleanXml, 'TimbreFiscalDigital');
  if (timbreBlock) {
    result.uuid = extractAttribute(timbreBlock, 'UUID') || extractAttribute(timbreBlock, 'uuid');
    result.fechaTimbrado = extractAttribute(timbreBlock, 'FechaTimbrado');
    result.selloSAT = extractAttribute(timbreBlock, 'SelloSAT');
  }
  console.log("UUID extracted:", result.uuid);
  
  // Extract Impuestos totals
  const impuestosBlock = extractElementBlock(cleanXml, 'Impuestos');
  if (impuestosBlock) {
    result.impuestos.totalImpuestosTrasladados = extractNumericAttribute(impuestosBlock, 'TotalImpuestosTrasladados');
    result.impuestos.totalImpuestosRetenidos = extractNumericAttribute(impuestosBlock, 'TotalImpuestosRetenidos');
    
    // Look for IVA and IEPS in Traslados
    const trasladosBlocks = extractAllElementBlocks(impuestosBlock, 'Traslado');
    for (const traslado of trasladosBlocks) {
      const impuesto = extractAttribute(traslado, 'Impuesto');
      const importe = extractNumericAttribute(traslado, 'Importe');
      
      if (impuesto === '002') { // IVA
        result.impuestos.iva = (result.impuestos.iva || 0) + (importe || 0);
      } else if (impuesto === '003') { // IEPS
        result.impuestos.ieps = (result.impuestos.ieps || 0) + (importe || 0);
      }
    }
  }
  console.log("Impuestos extracted:", result.impuestos);
  
  // Extract Conceptos (limit to 10 for preview)
  const conceptosBlocks = extractAllElementBlocks(cleanXml, 'Concepto');
  result.conceptos = conceptosBlocks.slice(0, 10).map(concepto => ({
    claveProdServ: extractAttribute(concepto, 'ClaveProdServ') || '',
    cantidad: extractNumericAttribute(concepto, 'Cantidad') || 0,
    claveUnidad: extractAttribute(concepto, 'ClaveUnidad') || '',
    unidad: extractAttribute(concepto, 'Unidad'),
    descripcion: extractAttribute(concepto, 'Descripcion') || '',
    valorUnitario: extractNumericAttribute(concepto, 'ValorUnitario') || 0,
    importe: extractNumericAttribute(concepto, 'Importe') || 0,
    noIdentificacion: extractAttribute(concepto, 'NoIdentificacion'),
  }));
  console.log("Conceptos extracted:", result.conceptos.length);
  
  // Extract CfdiRelacionados if present
  const relacionadosBlock = extractElementBlock(cleanXml, 'CfdiRelacionados');
  if (relacionadosBlock) {
    const tipoRelacion = extractAttribute(relacionadosBlock, 'TipoRelacion');
    const relacionados = extractAllElementBlocks(relacionadosBlock, 'CfdiRelacionado');
    result.cfdiRelacionados = relacionados.map(rel => ({
      tipoRelacion: tipoRelacion || '',
      uuid: extractAttribute(rel, 'UUID') || '',
    }));
  }
  
  // Extract observaciones and talon number
  // Sources: CondicionesDePago, Concepto descriptions, Addenda
  const condiciones = result.condicionesDePago || '';
  const descripciones = result.conceptos.map(c => c.descripcion);
  
  // Try to extract Addenda text (proprietary extensions)
  const addendaMatch = cleanXml.match(/<[a-z]*:?Addenda[^>]*>([\s\S]*?)<\/[a-z]*:?Addenda>/i);
  const addendaText = addendaMatch ? addendaMatch[1] : '';
  
  // Combine all possible sources for observaciones
  const allTexts = [condiciones, ...descripciones, addendaText].filter(Boolean);
  result.observaciones = condiciones || (addendaText ? addendaText.substring(0, 500) : undefined);
  
  // Extract numero de talon from any source
  result.numeroTalonExtraido = extractNumeroTalon(allTexts) || undefined;
  console.log("Observaciones:", result.observaciones?.substring(0, 100));
  console.log("Numero talon extraido:", result.numeroTalonExtraido);
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { xmlContent } = await req.json();
    
    if (!xmlContent) {
      return new Response(
        JSON.stringify({ error: "Se requiere el contenido XML" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received XML content, starting parse...");
    
    // Parse the CFDI XML
    const cfdiData = parseCFDI(xmlContent);
    
    // Validate that we got essential data
    if (!cfdiData.emisor?.rfc) {
      return new Response(
        JSON.stringify({ 
          error: "No se pudo extraer el RFC del emisor. El XML podría no ser un CFDI válido.",
          partial: cfdiData
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("CFDI parsed successfully:", {
      emisorRfc: cfdiData.emisor.rfc,
      emisorNombre: cfdiData.emisor.nombre,
      folio: cfdiData.folio,
      total: cfdiData.total,
      uuid: cfdiData.uuid,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cfdiData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error parsing CFDI:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Error al procesar el CFDI",
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
