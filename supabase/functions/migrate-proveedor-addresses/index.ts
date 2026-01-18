import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista de estados mexicanos para detección
const ESTADOS_MEXICANOS = [
  'AGUASCALIENTES', 'BAJA CALIFORNIA', 'BAJA CALIFORNIA SUR', 'CAMPECHE',
  'CHIAPAS', 'CHIHUAHUA', 'CIUDAD DE MEXICO', 'CDMX', 'COAHUILA', 'COLIMA',
  'DURANGO', 'ESTADO DE MEXICO', 'EDO. DE MEXICO', 'EDO DE MEXICO', 'GUANAJUATO',
  'GUERRERO', 'HIDALGO', 'JALISCO', 'MEXICO', 'MICHOACAN', 'MORELOS', 'NAYARIT',
  'NUEVO LEON', 'OAXACA', 'PUEBLA', 'QUERETARO', 'QUINTANA ROO', 'SAN LUIS POTOSI',
  'SINALOA', 'SONORA', 'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ', 'YUCATAN', 'ZACATECAS'
];

interface ParsedAddress {
  calle: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  colonia: string | null;
  municipio: string | null;
  estado: string | null;
  codigo_postal: string | null;
}

function normalizeString(str: string): string {
  return str.toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

function parseDireccionProveedor(direccion: string | null): ParsedAddress {
  const result: ParsedAddress = {
    calle: null,
    numero_exterior: null,
    numero_interior: null,
    colonia: null,
    municipio: null,
    estado: null,
    codigo_postal: null,
  };

  if (!direccion || direccion.trim() === '') {
    return result;
  }

  const normalized = normalizeString(direccion);
  let remaining = direccion.trim();

  // 1. Extraer Código Postal (C.P. XXXXX o CP XXXXX o solo 5 dígitos al final)
  const cpPatterns = [
    /C\.?\s*P\.?\s*(\d{5})/i,
    /CODIGO\s*POSTAL\s*(\d{5})/i,
    /,\s*(\d{5})\s*$/,
  ];
  
  for (const pattern of cpPatterns) {
    const cpMatch = remaining.match(pattern);
    if (cpMatch) {
      result.codigo_postal = cpMatch[1];
      remaining = remaining.replace(cpMatch[0], ',').replace(/,\s*,/g, ',');
      break;
    }
  }

  // 2. Extraer Estado (de lista conocida)
  const normalizedRemaining = normalizeString(remaining);
  for (const estado of ESTADOS_MEXICANOS) {
    if (normalizedRemaining.includes(estado)) {
      result.estado = estado;
      // Remove estado from remaining (case insensitive)
      const estadoRegex = new RegExp(estado.replace(/\s+/g, '\\s*'), 'i');
      remaining = remaining.replace(estadoRegex, ',').replace(/,\s*,/g, ',');
      break;
    }
  }

  // 3. Extraer Número Interior (Int. XXX, Interior XXX, Int XXX)
  const intPatterns = [
    /,?\s*Int\.?\s*([A-Z0-9\-]+)/i,
    /,?\s*Interior\s+([A-Z0-9\-]+)/i,
    /,?\s*Depto\.?\s*([A-Z0-9\-]+)/i,
    /,?\s*Piso\s+([A-Z0-9\-]+)/i,
  ];
  
  for (const pattern of intPatterns) {
    const intMatch = remaining.match(pattern);
    if (intMatch) {
      result.numero_interior = intMatch[1].trim();
      remaining = remaining.replace(intMatch[0], ',').replace(/,\s*,/g, ',');
      break;
    }
  }

  // 4. Extraer Número Exterior (#XXX, No. XXX, Num. XXX, Número XXX)
  const extPatterns = [
    /#\s*(\d+[A-Z]?(?:\s*-\s*\d+)?)/i,
    /No\.?\s*(\d+[A-Z]?(?:\s*-\s*\d+)?)/i,
    /Num\.?\s*(\d+[A-Z]?(?:\s*-\s*\d+)?)/i,
    /Numero\s+(\d+[A-Z]?(?:\s*-\s*\d+)?)/i,
  ];
  
  for (const pattern of extPatterns) {
    const extMatch = remaining.match(pattern);
    if (extMatch) {
      result.numero_exterior = extMatch[1].trim();
      remaining = remaining.replace(extMatch[0], ',').replace(/,\s*,/g, ',');
      break;
    }
  }

  // 5. Extraer Colonia (Col. XXX, Colonia XXX, Fracc. XXX, Fraccionamiento XXX)
  const coloniaPatterns = [
    /,?\s*Col\.?\s+([^,]+)/i,
    /,?\s*Colonia\s+([^,]+)/i,
    /,?\s*Fracc\.?\s+([^,]+)/i,
    /,?\s*Fraccionamiento\s+([^,]+)/i,
    /,?\s*Barrio\s+([^,]+)/i,
    /,?\s*Zona\s+([^,]+)/i,
  ];
  
  for (const pattern of coloniaPatterns) {
    const coloniaMatch = remaining.match(pattern);
    if (coloniaMatch) {
      result.colonia = coloniaMatch[1].trim().replace(/,+$/, '');
      remaining = remaining.replace(coloniaMatch[0], ',').replace(/,\s*,/g, ',');
      break;
    }
  }

  // 6. Limpiar y parsear lo que queda
  remaining = remaining
    .replace(/^,+/, '')
    .replace(/,+$/, '')
    .replace(/,\s*,+/g, ',')
    .trim();

  // Split remaining by commas
  const parts = remaining.split(',').map(p => p.trim()).filter(p => p.length > 0);

  if (parts.length >= 1 && !result.calle) {
    // First part is usually the street
    result.calle = parts[0];
  }

  if (parts.length >= 2 && !result.municipio) {
    // If we have estado already, the part before it might be municipio
    // Or if it's the last remaining part, it could be municipio
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Skip if it looks like a number or is very short
      if (!/^\d+$/.test(part) && part.length > 2) {
        if (!result.colonia) {
          // Could be colonia if not yet set
          result.colonia = part;
        } else if (!result.municipio) {
          result.municipio = part;
        }
      }
    }
  }

  // Clean up values
  if (result.calle) {
    result.calle = result.calle.replace(/,+$/, '').trim();
  }
  if (result.colonia) {
    result.colonia = result.colonia.replace(/,+$/, '').trim();
  }
  if (result.municipio) {
    result.municipio = result.municipio.replace(/,+$/, '').trim();
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user auth
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const preview = url.searchParams.get('preview') === 'true';
    const execute = url.searchParams.get('execute') === 'true';

    // Fetch all proveedores with direccion but without structured address
    const { data: proveedores, error: fetchError } = await supabase
      .from('proveedores')
      .select('id, nombre, direccion, calle, numero_exterior, numero_interior, colonia, municipio, estado, codigo_postal')
      .not('direccion', 'is', null)
      .neq('direccion', '');

    if (fetchError) {
      console.error('Error fetching proveedores:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener proveedores', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only those that need migration (no structured address yet)
    const proveedoresToMigrate = proveedores?.filter(p => 
      !p.calle && !p.numero_exterior && !p.colonia && !p.municipio && !p.estado && !p.codigo_postal
    ) || [];

    console.log(`Found ${proveedoresToMigrate.length} proveedores to migrate`);

    // Parse addresses
    const results = proveedoresToMigrate.map(p => ({
      id: p.id,
      nombre: p.nombre,
      direccion_original: p.direccion,
      parsed: parseDireccionProveedor(p.direccion),
    }));

    // If preview mode, just return the parsed results
    if (preview || (!preview && !execute)) {
      return new Response(
        JSON.stringify({
          mode: 'preview',
          total_proveedores: proveedores?.length || 0,
          to_migrate: results.length,
          results: results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute mode - update the database
    if (execute) {
      let updated = 0;
      let errors: string[] = [];

      for (const result of results) {
        const { parsed } = result;
        
        // Only update if we extracted at least one field
        const hasData = parsed.calle || parsed.numero_exterior || parsed.colonia || 
                       parsed.municipio || parsed.estado || parsed.codigo_postal;
        
        if (!hasData) {
          console.log(`Skipping ${result.nombre} - no data extracted`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('proveedores')
          .update({
            calle: parsed.calle,
            numero_exterior: parsed.numero_exterior,
            numero_interior: parsed.numero_interior,
            colonia: parsed.colonia,
            municipio: parsed.municipio,
            estado: parsed.estado,
            codigo_postal: parsed.codigo_postal,
          })
          .eq('id', result.id);

        if (updateError) {
          console.error(`Error updating ${result.nombre}:`, updateError);
          errors.push(`${result.nombre}: ${updateError.message}`);
        } else {
          updated++;
          console.log(`Updated ${result.nombre}`);
        }
      }

      return new Response(
        JSON.stringify({
          mode: 'execute',
          total_processed: results.length,
          updated: updated,
          errors: errors,
          results: results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Parámetro inválido. Use ?preview=true o ?execute=true' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in migrate-proveedor-addresses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Error interno', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
