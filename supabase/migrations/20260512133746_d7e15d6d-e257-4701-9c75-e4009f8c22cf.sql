-- FASE 2: Credit system duplicado
DROP TRIGGER IF EXISTS trg_factura_credito ON facturas;
DROP TRIGGER IF EXISTS trg_cobro_credito ON cobros;
DROP TRIGGER IF EXISTS trg_cliente_credito_ts ON cliente_credito;

DROP FUNCTION IF EXISTS get_cliente_credito_status(uuid);
DROP FUNCTION IF EXISTS verificar_credito_para_pedido(uuid, numeric);
DROP FUNCTION IF EXISTS aplicar_credit_hold(uuid, text);
DROP FUNCTION IF EXISTS liberar_credit_hold(uuid, text);
DROP FUNCTION IF EXISTS cambiar_credito_limite(uuid, numeric, text);
DROP FUNCTION IF EXISTS aplicar_factura_a_credito() CASCADE;
DROP FUNCTION IF EXISTS aplicar_cobro_a_credito() CASCADE;
DROP FUNCTION IF EXISTS update_cliente_credito_ts() CASCADE;

DROP TABLE IF EXISTS cliente_credito_log CASCADE;
DROP TABLE IF EXISTS cliente_credito CASCADE;

-- FASE 3: Hierarchy duplicado
DROP TRIGGER IF EXISTS trg_prevenir_loop ON clientes;
DROP TRIGGER IF EXISTS trg_auto_tipo ON clientes;
DROP TRIGGER IF EXISTS trg_marcar_matriz ON clientes;

DROP FUNCTION IF EXISTS get_cliente_hierarchy(uuid);
DROP FUNCTION IF EXISTS get_balance_consolidado(uuid);
DROP FUNCTION IF EXISTS prevenir_loop_hierarchy() CASCADE;
DROP FUNCTION IF EXISTS auto_tipo_cliente() CASCADE;
DROP FUNCTION IF EXISTS marcar_padre_matriz() CASCADE;

ALTER TABLE clientes DROP COLUMN IF EXISTS parent_cliente_id;
ALTER TABLE clientes DROP COLUMN IF EXISTS tipo_cliente;
ALTER TABLE clientes DROP COLUMN IF EXISTS hereda_credito_padre;