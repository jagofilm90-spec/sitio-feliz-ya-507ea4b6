-- MEJORA 1: Progress tracking on routes
ALTER TABLE rutas
  ADD COLUMN IF NOT EXISTS porcentaje_carga smallint NOT NULL DEFAULT 0;

-- MEJORA 2: Weight confirmation per product
ALTER TABLE carga_productos
  ADD COLUMN IF NOT EXISTS peso_confirmado boolean NOT NULL DEFAULT false;
