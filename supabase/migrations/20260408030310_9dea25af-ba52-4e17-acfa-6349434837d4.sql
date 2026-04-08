
-- ============================================================
-- FIX 1: UNIQUE constraint en RFC (partial index)
-- ============================================================
-- Duplicado conocido: PRO921020PY4 (Pan Roll / PAN ROLL S.A. DE C.V.)
-- El índice se crea de todos modos — Jose debe limpiar el duplicado
-- Si falla por el duplicado, se reportará
DO $$
DECLARE
  v_dup_count INT;
  v_dup_record RECORD;
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
    RAISE NOTICE '⚠️  Se encontraron % RFCs duplicados. Índice NO aplicado:', v_dup_count;
    FOR v_dup_record IN
      SELECT rfc, COUNT(*) as cnt, string_agg(nombre, ', ') as nombres
      FROM clientes
      WHERE rfc IS NOT NULL AND rfc != '' AND activo = true
      GROUP BY rfc
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
    LOOP
      RAISE NOTICE '   RFC: % | Veces: % | Clientes: %',
        v_dup_record.rfc, v_dup_record.cnt, v_dup_record.nombres;
    END LOOP;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_rfc_unique
      ON clientes(rfc)
      WHERE rfc IS NOT NULL AND rfc != '' AND activo = true;
    RAISE NOTICE '✅ UNIQUE index en RFC aplicado';
  END IF;
END $$;

-- ============================================================
-- FIX 2: Función generar_codigo_cliente
-- ============================================================
CREATE OR REPLACE FUNCTION public.generar_codigo_cliente()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_max_num INTEGER;
  v_codigo TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 2) AS INTEGER)), 0)
  INTO v_max_num
  FROM clientes
  WHERE codigo ~ '^C[0-9]+$';

  v_codigo := 'C' || LPAD((v_max_num + 1)::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM clientes WHERE codigo = v_codigo) LOOP
    v_max_num := v_max_num + 1;
    v_codigo := 'C' || LPAD((v_max_num + 1)::TEXT, 4, '0');
  END LOOP;

  RETURN v_codigo;
END;
$$;

COMMENT ON FUNCTION public.generar_codigo_cliente() IS
'Genera el siguiente código de cliente disponible (C0001, C0002...) de forma atómica.';

-- ============================================================
-- FIX 3: Columnas CFDI
-- ============================================================
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS uso_cfdi_default TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT;

COMMENT ON COLUMN clientes.uso_cfdi_default IS 'Uso de CFDI por defecto (G01, G03, S01, etc.)';
COMMENT ON COLUMN clientes.regimen_fiscal IS 'Régimen fiscal según catálogo SAT (601, 612, 626, etc.)';

-- ============================================================
-- FIX 4: RLS — Reemplazar policy ALL permisiva
-- ============================================================
-- Drop the overly-permissive ALL policy that gives vendedores full access
DROP POLICY IF EXISTS "Admins and vendedores can manage clients" ON clientes;

-- Admin + secretaria: full access (replaces the dropped policy for these roles)
CREATE POLICY "admin_secretaria_all_clientes"
ON clientes FOR ALL
TO authenticated
USING (has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role]))
WITH CHECK (has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role]));

-- Vendedor INSERT: only if assigned to themselves
CREATE POLICY "vendedor_insert_clientes_propios"
ON clientes FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND vendedor_asignado = auth.uid()
);

-- Vendedor UPDATE: only their own clients
CREATE POLICY "vendedor_update_clientes_propios"
ON clientes FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND vendedor_asignado = auth.uid()
)
WITH CHECK (
  vendedor_asignado = auth.uid()
);
