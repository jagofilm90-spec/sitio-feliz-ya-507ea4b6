-- ============================================================================
-- MIGRACIÓN: Alinear BD existente con el código del ERP
-- ============================================================================
-- ESTRATEGIA:
-- 1. Crear enums que el código necesita
-- 2. Crear tablas que no existen
-- 3. Agregar columnas faltantes a tablas existentes
-- 4. NO se borra nada existente
-- ============================================================================

-- ══════════════════════════════════════════════════════════════
-- PASO 1: ENUMS
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin','vendedor','chofer','almacen','secretaria','cliente','contadora','gerente_almacen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('borrador','por_autorizar','rechazado','pendiente','en_ruta','entregado','cancelado','por_cobrar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE credit_term AS ENUM ('contado','8_dias','15_dias','30_dias','60_dias');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_priority AS ENUM ('vip_mismo_dia','deadline','dia_fijo_recurrente','fecha_sugerida','flexible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('kg','pieza','caja','bulto','costal','litro','churla','cubeta','balón','paquete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE zona_region AS ENUM ('cdmx_norte','cdmx_centro','cdmx_sur','cdmx_oriente','cdmx_poniente','edomex_norte','edomex_oriente','toluca','morelos','puebla','hidalgo','queretaro','tlaxcala');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('individual','grupo_personalizado','grupo_puesto','broadcast');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE preferencia_facturacion AS ENUM ('siempre_factura','siempre_remision','variable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 2: TABLA profiles (el código usa esto en vez de usuarios)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  phone text,
  last_module text,
  last_seen timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrar datos de usuarios a profiles si la tabla usuarios existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios' AND table_schema = 'public') THEN
    INSERT INTO profiles (id, email, full_name, phone, created_at, updated_at)
    SELECT auth_id, email, COALESCE(nombre || ' ' || apellidos, nombre, email), telefono, created_at, updated_at
    FROM usuarios
    WHERE auth_id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 3: TABLA user_roles (roles por usuario)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ══════════════════════════════════════════════════════════════
-- PASO 4: TABLA zonas (zonas geográficas)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS zonas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  es_foranea boolean NOT NULL DEFAULT false,
  region zona_region,
  zonas_cercanas uuid[],
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 5: TABLA bodegas
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bodegas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  latitud numeric,
  longitud numeric,
  radio_deteccion_metros numeric DEFAULT 100,
  wifi_ssids text[],
  es_externa boolean NOT NULL DEFAULT false,
  costo_por_kilo numeric,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 6: TABLA empleados (choferes, ayudantes, almacenistas)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text,
  nombre_completo text NOT NULL,
  primer_apellido text,
  segundo_apellido text,
  puesto text NOT NULL, -- 'Chofer', 'Ayudante de Chofer', 'Almacenista', 'Gerente Almacén', etc.
  email text,
  telefono text,
  foto_url text,
  user_id uuid REFERENCES auth.users(id),
  activo boolean NOT NULL DEFAULT true,
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  fecha_nacimiento date,
  fecha_baja date,
  motivo_baja text,
  rfc text,
  curp text,
  numero_seguro_social text,
  direccion text,
  estado_civil text,
  tipo_sangre text,
  nivel_estudios text,
  numero_dependientes int,
  contacto_emergencia_nombre text,
  contacto_emergencia_telefono text,
  sueldo_bruto numeric,
  periodo_pago text,
  periodo_comision text,
  porcentaje_comision numeric,
  cuenta_bancaria text,
  clabe_interbancaria text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 7: TABLA cliente_sucursales (puntos de entrega)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cliente_sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  direccion text,
  codigo_sucursal text,
  telefono text,
  contacto text,
  email_facturacion text,
  rfc text,
  razon_social text,
  latitud numeric,
  longitud numeric,
  zona_id uuid REFERENCES zonas(id),
  horario_entrega text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 8: TABLA notificaciones
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'pedido_autorizado', 'pedido_rechazado', 'nuevo_pedido_vendedor', etc.
  titulo text NOT NULL,
  descripcion text,
  pedido_id uuid,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 9: COLUMNAS FALTANTES EN pedidos
-- ══════════════════════════════════════════════════════════════

-- El código espera "folio" pero la BD tiene "numero_pedido"
-- El código espera "status" pero la BD tiene "estado"
-- Agregar las columnas que el código necesita sin romper lo existente

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS vendedor_id uuid;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES cliente_sucursales(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS peso_total_kg numeric;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pagado boolean NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS saldo_pendiente numeric;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS termino_credito text DEFAULT 'contado';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS requiere_factura boolean NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS facturado boolean NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS factura_enviada_al_cliente boolean NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS factura_solicitada_por_cliente boolean NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_entrega_estimada timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_entrega_real timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_factura_enviada timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_dia int;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS prioridad_entrega text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS datos_fiscales_factura jsonb;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS deadline_dias_habiles int;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS dia_fijo_semanal text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS impuestos numeric;

-- Sincronizar folio desde numero_pedido si existe
UPDATE pedidos SET folio = numero_pedido WHERE folio IS NULL AND numero_pedido IS NOT NULL;
-- Sincronizar status desde estado si existe
UPDATE pedidos SET status = estado WHERE status IS NULL AND estado IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- PASO 10: TABLA pedidos_detalles (el código usa este nombre)
-- ══════════════════════════════════════════════════════════════

-- Si la BD tiene "pedido_detalle", crear pedidos_detalles como tabla nueva
-- (no renombrar para no romper código existente que use el nombre viejo)

CREATE TABLE IF NOT EXISTS pedidos_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id),
  cantidad numeric NOT NULL,
  cantidad_original numeric,
  precio_unitario numeric NOT NULL,
  precio_original numeric,
  precio_ajustado_por uuid,
  fecha_ajuste_precio timestamptz,
  subtotal numeric NOT NULL,
  kilos_totales numeric,
  unidades_manual numeric,
  es_cortesia boolean DEFAULT false,
  linea_dividida_de uuid,
  notas_ajuste text,
  autorizacion_status text NOT NULL DEFAULT 'pendiente',
  precio_autorizado numeric,
  agregado_en_carga boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migrar datos de pedido_detalle a pedidos_detalles si existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedido_detalle' AND table_schema = 'public') THEN
    INSERT INTO pedidos_detalles (pedido_id, producto_id, cantidad, precio_unitario, subtotal, created_at)
    SELECT pedido_id, producto_id, cantidad, precio_unitario, subtotal, created_at
    FROM pedido_detalle
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 11: COLUMNAS FALTANTES EN vehiculos
-- ══════════════════════════════════════════════════════════════

ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS peso_maximo_local_kg numeric NOT NULL DEFAULT 15000;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS peso_maximo_foraneo_kg numeric NOT NULL DEFAULT 15000;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS chofer_asignado_id uuid;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'disponible';
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'camioneta';
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS numero_serie text;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS numero_motor text;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS capacidad_toneladas numeric;

-- Sincronizar nombre desde marca+modelo si existe
UPDATE vehiculos SET nombre = COALESCE(marca || ' ' || modelo, marca, 'Vehículo ' || COALESCE(placa, id::text)) WHERE nombre IS NULL;
-- Sincronizar peso_maximo desde capacidad_kg si existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehiculos' AND column_name = 'capacidad_kg') THEN
    UPDATE vehiculos SET peso_maximo_local_kg = capacidad_kg WHERE capacidad_kg IS NOT NULL AND peso_maximo_local_kg = 15000;
    UPDATE vehiculos SET peso_maximo_foraneo_kg = capacidad_kg WHERE capacidad_kg IS NOT NULL AND peso_maximo_foraneo_kg = 15000;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 12: COLUMNAS FALTANTES EN rutas
-- ══════════════════════════════════════════════════════════════

ALTER TABLE rutas ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS tipo_ruta text DEFAULT 'local';
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS status text DEFAULT 'programada';
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS almacenista_id uuid;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS ayudante_id uuid;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS ayudantes_ids uuid[];
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS ayudante_externo_id uuid;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS costo_ayudante_externo numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS peso_total_kg numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS porcentaje_carga smallint NOT NULL DEFAULT 0;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS distancia_total_km numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS tiempo_estimado_minutos numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS hora_salida_sugerida text;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS fecha_hora_inicio timestamptz;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS fecha_hora_fin timestamptz;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS kilometros_recorridos numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS kilometraje_inicial numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS kilometraje_final numeric;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_iniciada_en timestamptz;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_iniciada_por uuid;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_completada boolean DEFAULT false;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_completada_en timestamptz;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_completada_por uuid;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS fase_carga text;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS firma_almacenista_carga text; -- base64
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS firma_chofer_carga text; -- base64
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS firma_chofer_carga_fecha timestamptz;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS lleva_sellos boolean DEFAULT false;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS numero_sello_salida text;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS impresion_requerida boolean;

-- Sincronizar folio desde nombre si existe
UPDATE rutas SET folio = nombre WHERE folio IS NULL AND nombre IS NOT NULL;
-- Sincronizar status desde estado si existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rutas' AND column_name = 'estado') THEN
    UPDATE rutas SET status = estado WHERE status = 'programada' AND estado IS NOT NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 13: TABLA entregas
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL REFERENCES pedidos(id),
  orden_entrega int NOT NULL DEFAULT 1,
  -- Carga
  carga_confirmada boolean DEFAULT false,
  carga_confirmada_por uuid,
  carga_confirmada_en timestamptz,
  -- Entrega
  status_entrega text, -- null=pendiente, 'entregado', 'parcial', 'rechazado'
  entregado boolean DEFAULT false,
  fecha_entrega date,
  hora_entrega_real text,
  nombre_receptor text,
  firma_recibido text, -- base64
  motivo_rechazo text,
  notas text,
  -- Conciliación
  papeles_recibidos boolean DEFAULT false,
  papeles_recibidos_en timestamptz,
  papeles_recibidos_por uuid,
  notas_conciliacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 14: TABLA carga_productos
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS carga_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  pedido_detalle_id uuid NOT NULL REFERENCES pedidos_detalles(id),
  cantidad_solicitada numeric NOT NULL,
  cantidad_cargada numeric,
  cargado boolean DEFAULT false,
  cargado_en timestamptz,
  cargado_por uuid,
  lote_id uuid,
  peso_real_kg numeric,
  peso_confirmado boolean NOT NULL DEFAULT false,
  movimiento_inventario_id uuid,
  corregido_en timestamptz,
  motivo_correccion text,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 15: TABLA carga_evidencias
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS carga_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
  tipo_evidencia text NOT NULL,
  ruta_storage text NOT NULL,
  nombre_archivo text,
  capturado_por uuid,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 16: TABLA inventario_lotes
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventario_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id),
  bodega_id uuid REFERENCES bodegas(id),
  cantidad_disponible numeric NOT NULL DEFAULT 0,
  precio_compra numeric NOT NULL DEFAULT 0,
  precio_compra_provisional numeric,
  fecha_entrada date NOT NULL DEFAULT CURRENT_DATE,
  fecha_caducidad date,
  fecha_ultima_fumigacion date,
  lote_referencia text,
  orden_compra_id uuid,
  recibido_por uuid,
  conciliado boolean DEFAULT false,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 17: TABLA inventario_movimientos
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id),
  tipo_movimiento text NOT NULL, -- 'entrada', 'salida', 'ajuste', 'merma', 'consumo_interno'
  cantidad numeric NOT NULL,
  bodega_origen_id uuid REFERENCES bodegas(id),
  bodega_destino_id uuid REFERENCES bodegas(id),
  cliente_destino_id uuid,
  referencia text,
  lote text,
  fecha_caducidad date,
  stock_anterior numeric,
  stock_nuevo numeric,
  notas text,
  usuario_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 18: TABLA chofer_ubicaciones (GPS tracking)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chofer_ubicaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid REFERENCES rutas(id),
  user_id uuid NOT NULL,
  latitud numeric NOT NULL,
  longitud numeric NOT NULL,
  velocidad numeric,
  heading numeric,
  precision_metros numeric,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PASO 19: FUNCIONES RPC (decrementar/incrementar lotes)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION decrementar_lote(p_lote_id uuid, p_cantidad numeric)
RETURNS void AS $$
BEGIN
  UPDATE inventario_lotes
  SET cantidad_disponible = cantidad_disponible - p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado: %', p_lote_id;
  END IF;

  -- Verificar que no quedó negativo
  IF (SELECT cantidad_disponible FROM inventario_lotes WHERE id = p_lote_id) < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en lote %', p_lote_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION incrementar_lote(p_lote_id uuid, p_cantidad numeric)
RETURNS void AS $$
BEGIN
  UPDATE inventario_lotes
  SET cantidad_disponible = cantidad_disponible + p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- PASO 20: FUNCIÓN has_any_role (usada en RLS)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION has_any_role(roles app_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(check_role app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS app_role[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT role FROM user_roles WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════
-- PASO 21: COLUMNAS FALTANTES EN productos
-- ══════════════════════════════════════════════════════════════

ALTER TABLE productos ADD COLUMN IF NOT EXISTS aplica_iva boolean NOT NULL DEFAULT true;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS aplica_ieps boolean NOT NULL DEFAULT false;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_venta numeric;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descuento_maximo numeric DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_actual numeric DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo numeric DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS peso_kg numeric;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_por_kilo boolean DEFAULT false;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad text DEFAULT 'pieza';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS especificaciones text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS contenido_empaque text;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ultimo_costo_compra numeric;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_promedio_ponderado numeric;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS bloqueado_venta boolean DEFAULT false;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS requiere_fumigacion boolean DEFAULT false;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_ultima_fumigacion date;

-- ══════════════════════════════════════════════════════════════
-- PASO 22: COLUMNAS FALTANTES EN clientes
-- ══════════════════════════════════════════════════════════════

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razon_social text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rfc text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_pendiente numeric DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS limite_credito numeric DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS termino_credito text DEFAULT 'contado';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;

-- ══════════════════════════════════════════════════════════════
-- PASO 23: RLS BÁSICAS (permisivas para que funcione)
-- ══════════════════════════════════════════════════════════════

-- Habilitar RLS en tablas nuevas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE carga_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE carga_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para usuarios autenticados (ajustar después según roles)
CREATE POLICY "Authenticated users full access" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON empleados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON zonas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON bodegas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON cliente_sucursales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON notificaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON entregas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON carga_productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON carga_evidencias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON inventario_lotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON inventario_movimientos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON pedidos_detalles FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- PASO 24: DATOS SEMILLA MÍNIMOS
-- ══════════════════════════════════════════════════════════════

-- Bodegas por defecto
INSERT INTO bodegas (nombre, activo) VALUES ('Bodega 1', true) ON CONFLICT DO NOTHING;
INSERT INTO bodegas (nombre, activo) VALUES ('Bodega 2', true) ON CONFLICT DO NOTHING;

-- Zonas por defecto
INSERT INTO zonas (nombre, region, es_foranea) VALUES ('Centro', 'cdmx_centro', false) ON CONFLICT DO NOTHING;
INSERT INTO zonas (nombre, region, es_foranea) VALUES ('Norte', 'cdmx_norte', false) ON CONFLICT DO NOTHING;
INSERT INTO zonas (nombre, region, es_foranea) VALUES ('Sur', 'cdmx_sur', false) ON CONFLICT DO NOTHING;
INSERT INTO zonas (nombre, region, es_foranea) VALUES ('Oriente', 'cdmx_oriente', false) ON CONFLICT DO NOTHING;
INSERT INTO zonas (nombre, region, es_foranea) VALUES ('Poniente', 'cdmx_poniente', false) ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- NOTA IMPORTANTE
-- ══════════════════════════════════════════════════════════════
-- Después de ejecutar esta migración:
-- 1. Crear al menos 1 empleado tipo "Chofer" y 1 "Almacenista"
-- 2. Asignar user_roles al usuario admin
-- 3. Crear al menos 1 vehículo con nombre y peso_maximo_local_kg
-- 4. Configurar las bodegas con coordenadas GPS o WiFi SSIDs
-- 5. Ejecutar: npx supabase gen types typescript para regenerar types.ts
-- ══════════════════════════════════════════════════════════════
