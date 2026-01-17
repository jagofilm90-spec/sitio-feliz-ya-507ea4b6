-- Limpiar campo especificaciones que contiene solo peso (debe estar en contenido_empaque)
-- y asegurar que contenido_empaque tenga el formato correcto

UPDATE productos SET
  -- Establecer contenido_empaque si está vacío y tenemos peso_kg
  contenido_empaque = CASE 
    WHEN (contenido_empaque IS NULL OR contenido_empaque = '') AND peso_kg IS NOT NULL 
    THEN peso_kg::text || ' kg'
    ELSE contenido_empaque 
  END,
  -- Limpiar especificaciones de pesos
  especificaciones = CASE
    -- Si especificaciones es solo un peso como "25kg", "25 kg", "25Kg", etc. -> NULL
    WHEN especificaciones ~ '^\s*[0-9]+\.?[0-9]*\s*[kK][gG]\s*$' THEN NULL
    -- Si especificaciones termina con peso, quitar el peso (ej: "Original 20kg" -> "Original")
    WHEN especificaciones ~ '\s+[0-9]+\.?[0-9]*\s*[kK][gG]\s*$' 
    THEN TRIM(REGEXP_REPLACE(especificaciones, '\s+[0-9]+\.?[0-9]*\s*[kK][gG]\s*$', ''))
    -- Si especificaciones es peso con x (ej: "12x800g", "24x400g") -> NULL (esto es contenido_empaque)
    WHEN especificaciones ~ '^\s*[0-9]+\s*[xX×]\s*[0-9]+\.?[0-9]*\s*[gGkK][gG]?\s*$' THEN NULL
    -- Si no aplica ninguna regla, mantener como está
    ELSE especificaciones
  END
WHERE activo = true;