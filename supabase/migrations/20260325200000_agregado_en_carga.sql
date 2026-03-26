-- Track products added by vendor during warehouse loading
ALTER TABLE pedidos_detalles
  ADD COLUMN IF NOT EXISTS agregado_en_carga boolean NOT NULL DEFAULT false;
