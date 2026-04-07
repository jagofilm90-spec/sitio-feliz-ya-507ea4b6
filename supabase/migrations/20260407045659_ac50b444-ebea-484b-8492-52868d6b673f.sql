
CREATE TABLE IF NOT EXISTS cotizaciones_lecaroz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_grupo_id UUID NOT NULL REFERENCES clientes(id),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2024 AND 2050),
  tipo TEXT NOT NULL CHECK (tipo IN ('avio_panaderias', 'avio_rosticerias', 'azucar')),
  version INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'borrador' 
    CHECK (estado IN ('borrador', 'enviada', 'vigente', 'historica', 'rechazada')),
  fecha_envio TIMESTAMPTZ,
  fecha_aprobacion TIMESTAMPTZ,
  notas TEXT,
  creado_por UUID,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_mes 
  ON cotizaciones_lecaroz(cliente_grupo_id, anio, mes, tipo, estado);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cotizacion_vigente_unica
  ON cotizaciones_lecaroz(cliente_grupo_id, mes, anio, tipo)
  WHERE estado = 'vigente';

CREATE TABLE IF NOT EXISTS cotizacion_lecaroz_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES cotizaciones_lecaroz(id) ON DELETE CASCADE,
  codigo_lecaroz INTEGER,
  nombre_lecaroz TEXT NOT NULL,
  presentacion_lecaroz TEXT,
  sku_almasa TEXT,
  nombre_almasa TEXT,
  es_reempaque BOOLEAN DEFAULT false,
  sku_padre_inventario TEXT,
  es_peso_variable BOOLEAN DEFAULT false,
  precio NUMERIC(12, 2),
  precio_pendiente BOOLEAN DEFAULT true,
  unidad_cobro TEXT DEFAULT 'pieza' CHECK (unidad_cobro IN ('pieza', 'kilo')),
  notas TEXT,
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_lineas_cot ON cotizacion_lecaroz_lineas(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_lineas_nombre ON cotizacion_lecaroz_lineas(cotizacion_id, nombre_lecaroz);

CREATE TABLE IF NOT EXISTS tandas_lecaroz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_grupo_id UUID NOT NULL REFERENCES clientes(id),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2024 AND 2050),
  numero INTEGER NOT NULL,
  nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  abierta_en TIMESTAMPTZ DEFAULT now(),
  cerrada_en TIMESTAMPTZ,
  cerrada_por UUID,
  notas_cierre TEXT,
  total_pedidos INTEGER DEFAULT 0,
  total_monto NUMERIC(14, 2) DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tanda_abierta
  ON tandas_lecaroz(cliente_grupo_id, mes, anio) WHERE estado = 'abierta';
CREATE INDEX IF NOT EXISTS idx_tandas_mes ON tandas_lecaroz(cliente_grupo_id, anio, mes);

CREATE TABLE IF NOT EXISTS email_log_lecaroz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_id TEXT UNIQUE,
  asunto TEXT,
  remitente TEXT,
  recibido_en TIMESTAMPTZ,
  detectado_en TIMESTAMPTZ DEFAULT now(),
  tanda_id UUID REFERENCES tandas_lecaroz(id),
  estado TEXT NOT NULL DEFAULT 'detectado'
    CHECK (estado IN ('detectado', 'preview', 'procesado', 'ignorado', 'error')),
  formato_detectado TEXT,
  num_sucursales_detectadas INTEGER,
  num_productos_detectados INTEGER,
  parser_output JSONB,
  error TEXT,
  procesado_en TIMESTAMPTZ,
  procesado_por UUID,
  origen TEXT DEFAULT 'gmail' CHECK (origen IN ('gmail', 'upload_manual', 'paste'))
);

CREATE INDEX IF NOT EXISTS idx_email_log_tanda ON email_log_lecaroz(tanda_id);
CREATE INDEX IF NOT EXISTS idx_email_log_estado ON email_log_lecaroz(estado);

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tanda_id UUID REFERENCES tandas_lecaroz(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS email_origen_id UUID REFERENCES email_log_lecaroz(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cotizacion_aplicada_id UUID REFERENCES cotizaciones_lecaroz(id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tanda ON pedidos(tanda_id);
