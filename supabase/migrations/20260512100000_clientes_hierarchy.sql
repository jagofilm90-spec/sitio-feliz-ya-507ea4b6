-- ============================================
-- CUSTOMER HIERARCHY — Enterprise+
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS parent_cliente_id uuid;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente text DEFAULT 'individual';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS hereda_credito_padre boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clientes_parent ON clientes(parent_cliente_id) WHERE parent_cliente_id IS NOT NULL;

-- Prevenir loops circulares
CREATE OR REPLACE FUNCTION prevenir_loop_hierarchy()
RETURNS TRIGGER AS $$
DECLARE v_current uuid; v_depth int := 0;
BEGIN
  IF NEW.parent_cliente_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_cliente_id = NEW.id THEN RAISE EXCEPTION 'Cliente no puede ser su propio padre'; END IF;
  v_current := NEW.parent_cliente_id;
  WHILE v_current IS NOT NULL AND v_depth < 10 LOOP
    IF v_current = NEW.id THEN RAISE EXCEPTION 'Loop circular detectado'; END IF;
    SELECT parent_cliente_id INTO v_current FROM clientes WHERE id = v_current;
    v_depth := v_depth + 1;
  END LOOP;
  IF v_depth >= 10 THEN RAISE EXCEPTION 'Jerarquía máximo 10 niveles'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevenir_loop ON clientes;
CREATE TRIGGER trg_prevenir_loop BEFORE INSERT OR UPDATE ON clientes
FOR EACH ROW WHEN (NEW.parent_cliente_id IS NOT NULL) EXECUTE FUNCTION prevenir_loop_hierarchy();

-- Auto-set tipo
CREATE OR REPLACE FUNCTION auto_tipo_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_cliente_id IS NOT NULL THEN NEW.tipo_cliente := 'sucursal'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_tipo ON clientes;
CREATE TRIGGER trg_auto_tipo BEFORE INSERT OR UPDATE OF parent_cliente_id ON clientes
FOR EACH ROW EXECUTE FUNCTION auto_tipo_cliente();

-- Marcar padre como matriz
CREATE OR REPLACE FUNCTION marcar_padre_matriz()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_cliente_id IS NOT NULL THEN
    UPDATE clientes SET tipo_cliente = 'matriz' WHERE id = NEW.parent_cliente_id AND tipo_cliente = 'individual';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marcar_matriz ON clientes;
CREATE TRIGGER trg_marcar_matriz AFTER INSERT OR UPDATE OF parent_cliente_id ON clientes
FOR EACH ROW WHEN (NEW.parent_cliente_id IS NOT NULL) EXECUTE FUNCTION marcar_padre_matriz();

-- RPC: hierarchy tree
CREATE OR REPLACE FUNCTION get_cliente_hierarchy(p_cliente_id uuid)
RETURNS TABLE (cliente_id uuid, parent_id uuid, nombre text, tipo_cliente text, nivel int, hereda_credito boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE find_root AS (
    SELECT id, parent_cliente_id, 1 AS depth FROM clientes WHERE id = p_cliente_id
    UNION ALL
    SELECT c.id, c.parent_cliente_id, fr.depth + 1 FROM clientes c JOIN find_root fr ON c.id = fr.parent_cliente_id WHERE fr.depth < 10
  ),
  root AS (SELECT id FROM find_root WHERE parent_cliente_id IS NULL LIMIT 1),
  hierarchy AS (
    SELECT c.id, c.parent_cliente_id, c.nombre, c.tipo_cliente, 0 AS nivel, c.hereda_credito_padre
    FROM clientes c, root WHERE c.id = root.id
    UNION ALL
    SELECT c.id, c.parent_cliente_id, c.nombre, c.tipo_cliente, h.nivel + 1, c.hereda_credito_padre
    FROM clientes c JOIN hierarchy h ON c.parent_cliente_id = h.id WHERE h.nivel < 10
  )
  SELECT h.id, h.parent_cliente_id, h.nombre, h.tipo_cliente, h.nivel, h.hereda_credito_padre
  FROM hierarchy h ORDER BY h.nivel, h.nombre;
END; $$;

-- RPC: balance consolidado
CREATE OR REPLACE FUNCTION get_balance_consolidado(p_matriz_id uuid)
RETURNS TABLE (total_clientes int, limite_consolidado numeric, balance_consolidado numeric, disponible_consolidado numeric, clientes_en_hold int)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT id FROM clientes WHERE id = p_matriz_id
    UNION ALL
    SELECT c.id FROM clientes c JOIN descendants d ON c.parent_cliente_id = d.id
  )
  SELECT COUNT(*)::int, COALESCE(SUM(cc.credito_limite), 0), COALESCE(SUM(cc.credito_balance), 0),
    COALESCE(SUM(cc.credito_limite - cc.credito_balance), 0),
    COUNT(*) FILTER (WHERE cc.hold_activo)::int
  FROM descendants d LEFT JOIN cliente_credito cc ON cc.cliente_id = d.id;
END; $$;

GRANT EXECUTE ON FUNCTION get_cliente_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_consolidado TO authenticated;
