-- ============================================
-- CREDIT LIMIT SYSTEM — Enterprise+
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS cliente_credito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid UNIQUE NOT NULL,
  credito_limite numeric(14,2) NOT NULL DEFAULT 0,
  credito_balance numeric(14,2) NOT NULL DEFAULT 0,
  hold_activo boolean NOT NULL DEFAULT false,
  hold_motivo text,
  hold_activado_por uuid,
  hold_activado_at timestamptz,
  dias_gracia int NOT NULL DEFAULT 0,
  handling_policy text NOT NULL DEFAULT 'warn',
  limite_sugerido_ia numeric(14,2),
  limite_sugerido_at timestamptz,
  limite_sugerido_razon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cliente_credito_cliente ON cliente_credito(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_credito_hold ON cliente_credito(hold_activo) WHERE hold_activo = true;

CREATE TABLE IF NOT EXISTS cliente_credito_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  accion text NOT NULL,
  valor_antes numeric(14,2),
  valor_despues numeric(14,2),
  motivo text,
  referencia_tabla text,
  referencia_id uuid,
  realizado_por uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credito_log_cliente ON cliente_credito_log(cliente_id, created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_cliente_credito_ts()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cliente_credito_ts ON cliente_credito;
CREATE TRIGGER trg_cliente_credito_ts BEFORE UPDATE ON cliente_credito
FOR EACH ROW EXECUTE FUNCTION update_cliente_credito_ts();

-- Trigger: factura PPD aplica a balance
CREATE OR REPLACE FUNCTION aplicar_factura_a_credito()
RETURNS TRIGGER AS $$
DECLARE v_antes numeric; v_despues numeric;
BEGIN
  IF NEW.metodo_pago = 'PPD' THEN
    INSERT INTO cliente_credito (cliente_id, credito_balance) VALUES (NEW.cliente_id, 0) ON CONFLICT (cliente_id) DO NOTHING;
    SELECT credito_balance INTO v_antes FROM cliente_credito WHERE cliente_id = NEW.cliente_id;
    UPDATE cliente_credito SET credito_balance = credito_balance + NEW.total WHERE cliente_id = NEW.cliente_id RETURNING credito_balance INTO v_despues;
    INSERT INTO cliente_credito_log (cliente_id, accion, valor_antes, valor_despues, motivo, referencia_tabla, referencia_id)
    VALUES (NEW.cliente_id, 'factura_aplicada', v_antes, v_despues, 'Factura ' || COALESCE(NEW.folio, '') || ' aplicada', 'facturas', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_factura_credito ON facturas;
CREATE TRIGGER trg_factura_credito AFTER INSERT ON facturas FOR EACH ROW EXECUTE FUNCTION aplicar_factura_a_credito();

-- Trigger: cobro validado reduce balance
CREATE OR REPLACE FUNCTION aplicar_cobro_a_credito()
RETURNS TRIGGER AS $$
DECLARE v_antes numeric; v_despues numeric;
BEGIN
  IF NEW.estado IN ('validado', 'conciliado') AND (OLD IS NULL OR OLD.estado NOT IN ('validado', 'conciliado')) THEN
    SELECT credito_balance INTO v_antes FROM cliente_credito WHERE cliente_id = NEW.cliente_id;
    IF v_antes IS NOT NULL THEN
      UPDATE cliente_credito SET credito_balance = GREATEST(0, credito_balance - NEW.monto_total) WHERE cliente_id = NEW.cliente_id RETURNING credito_balance INTO v_despues;
      INSERT INTO cliente_credito_log (cliente_id, accion, valor_antes, valor_despues, motivo, referencia_tabla, referencia_id)
      VALUES (NEW.cliente_id, 'cobro_aplicado', v_antes, v_despues, 'Cobro ' || COALESCE(NEW.folio, ''), 'cobros', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cobro_credito ON cobros;
CREATE TRIGGER trg_cobro_credito AFTER INSERT OR UPDATE ON cobros FOR EACH ROW EXECUTE FUNCTION aplicar_cobro_a_credito();

-- RPCs
CREATE OR REPLACE FUNCTION get_cliente_credito_status(p_cliente_id uuid)
RETURNS TABLE (cliente_id uuid, credito_limite numeric, credito_balance numeric, credito_disponible numeric, hold_activo boolean, hold_motivo text, porcentaje_usado numeric, estado text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT cc.cliente_id, cc.credito_limite, cc.credito_balance, (cc.credito_limite - cc.credito_balance),
    cc.hold_activo, cc.hold_motivo,
    CASE WHEN cc.credito_limite = 0 THEN 0 ELSE ROUND((cc.credito_balance / cc.credito_limite) * 100, 2) END,
    CASE
      WHEN cc.hold_activo THEN 'BLOQUEADO'
      WHEN cc.credito_balance >= cc.credito_limite AND cc.credito_limite > 0 THEN 'LIMITE_ALCANZADO'
      WHEN cc.credito_balance >= cc.credito_limite * 0.8 AND cc.credito_limite > 0 THEN 'CERCA_LIMITE'
      WHEN cc.credito_limite = 0 THEN 'SIN_LIMITE'
      ELSE 'OK'
    END
  FROM cliente_credito cc WHERE cc.cliente_id = p_cliente_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_cliente_id, 0::numeric, 0::numeric, 0::numeric, false, NULL::text, 0::numeric, 'SIN_CONFIGURAR'::text;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION verificar_credito_para_pedido(p_cliente_id uuid, p_monto numeric)
RETURNS TABLE (permitido boolean, razon text, credito_disponible numeric)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v RECORD;
BEGIN
  SELECT * INTO v FROM get_cliente_credito_status(p_cliente_id) LIMIT 1;
  IF v.estado = 'SIN_CONFIGURAR' OR v.credito_limite = 0 THEN RETURN QUERY SELECT true, 'Sin límite configurado'::text, 0::numeric; RETURN; END IF;
  IF v.hold_activo THEN RETURN QUERY SELECT false, ('Crédito bloqueado: ' || COALESCE(v.hold_motivo, ''))::text, v.credito_disponible; RETURN; END IF;
  IF (v.credito_balance + p_monto) > v.credito_limite THEN RETURN QUERY SELECT false, 'Excede crédito disponible'::text, v.credito_disponible; RETURN; END IF;
  RETURN QUERY SELECT true, 'OK'::text, v.credito_disponible;
END; $$;

CREATE OR REPLACE FUNCTION aplicar_credit_hold(p_cliente_id uuid, p_motivo text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO cliente_credito (cliente_id) VALUES (p_cliente_id) ON CONFLICT (cliente_id) DO NOTHING;
  UPDATE cliente_credito SET hold_activo = true, hold_motivo = p_motivo, hold_activado_por = auth.uid(), hold_activado_at = now() WHERE cliente_id = p_cliente_id;
  INSERT INTO cliente_credito_log (cliente_id, accion, motivo, realizado_por) VALUES (p_cliente_id, 'hold_activado', p_motivo, auth.uid());
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION liberar_credit_hold(p_cliente_id uuid, p_motivo text DEFAULT 'Liberación manual') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE cliente_credito SET hold_activo = false, hold_motivo = NULL, hold_activado_por = NULL, hold_activado_at = NULL WHERE cliente_id = p_cliente_id;
  INSERT INTO cliente_credito_log (cliente_id, accion, motivo, realizado_por) VALUES (p_cliente_id, 'hold_liberado', p_motivo, auth.uid());
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION cambiar_credito_limite(p_cliente_id uuid, p_nuevo_limite numeric, p_motivo text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_antes numeric;
BEGIN
  SELECT credito_limite INTO v_antes FROM cliente_credito WHERE cliente_id = p_cliente_id;
  INSERT INTO cliente_credito (cliente_id, credito_limite) VALUES (p_cliente_id, p_nuevo_limite) ON CONFLICT (cliente_id) DO UPDATE SET credito_limite = p_nuevo_limite;
  INSERT INTO cliente_credito_log (cliente_id, accion, valor_antes, valor_despues, motivo, realizado_por) VALUES (p_cliente_id, 'limite_cambiado', v_antes, p_nuevo_limite, p_motivo, auth.uid());
  RETURN true;
END; $$;

-- RLS
ALTER TABLE cliente_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_credito_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credito_admin_cont" ON cliente_credito FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'contadora'::public.app_role]));
CREATE POLICY "credito_read" ON cliente_credito FOR SELECT
  USING (public.has_any_role(ARRAY['secretaria'::public.app_role, 'vendedor'::public.app_role]));

CREATE POLICY "credito_log_admin" ON cliente_credito_log FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'contadora'::public.app_role]));
CREATE POLICY "credito_log_insert" ON cliente_credito_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

GRANT EXECUTE ON FUNCTION get_cliente_credito_status TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_credito_para_pedido TO authenticated;
GRANT EXECUTE ON FUNCTION aplicar_credit_hold TO authenticated;
GRANT EXECUTE ON FUNCTION liberar_credit_hold TO authenticated;
GRANT EXECUTE ON FUNCTION cambiar_credito_limite TO authenticated;
