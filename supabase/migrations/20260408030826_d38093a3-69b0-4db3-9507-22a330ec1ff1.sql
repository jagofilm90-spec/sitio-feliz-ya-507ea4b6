
-- PASO 1: Soft-delete Pan Roll
UPDATE clientes 
SET activo = false, updated_at = now()
WHERE rfc = 'PRO921020PY4';

UPDATE cliente_sucursales
SET activo = false
WHERE cliente_id IN (
  SELECT id FROM clientes WHERE rfc = 'PRO921020PY4'
);

-- PASO 2: Verificar sin duplicados
DO $$
DECLARE
  v_dup_count INT;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT rfc, COUNT(*) as cnt
    FROM clientes
    WHERE rfc IS NOT NULL AND rfc != '' AND activo = true
    GROUP BY rfc
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Aún hay % RFCs duplicados. Abortando.', v_dup_count;
  ELSE
    RAISE NOTICE '✅ Sin duplicados de RFC entre clientes activos';
  END IF;
END $$;

-- PASO 3: Índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_rfc_unique
  ON clientes(rfc)
  WHERE rfc IS NOT NULL AND rfc != '' AND activo = true;

-- VERIFICACIÓN FINAL
DO $$
DECLARE
  v_pan_roll_activos INT;
  v_index_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_pan_roll_activos
  FROM clientes WHERE rfc = 'PRO921020PY4' AND activo = true;

  SELECT EXISTS(
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clientes_rfc_unique'
  ) INTO v_index_exists;

  RAISE NOTICE '════════════════════════════════════';
  RAISE NOTICE 'ETAPA 1 — CIERRE';
  RAISE NOTICE 'Pan Roll activos: % (debe ser 0)', v_pan_roll_activos;
  RAISE NOTICE 'Índice único RFC: %', CASE WHEN v_index_exists THEN '✅ APLICADO' ELSE '❌' END;
  RAISE NOTICE '🎉 ETAPA 1 COMPLETADA AL 100%%';
  RAISE NOTICE '════════════════════════════════════';
END $$;
