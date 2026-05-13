-- ALMASA-OS · FASE 1 · Sprint 1
-- Agrega campos del Blueprint v0.5 a productos:
-- 3 listas de precio, precio piso, claves SAT, marca propia, código de barras
-- Refs: Blueprint v0.5 · FASE 1

BEGIN;

-- 1. Las 3 listas de precio
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS precio_mayoreo NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS precio_medio NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS precio_menudeo NUMERIC(12,2);

COMMENT ON COLUMN public.productos.precio_mayoreo IS 'Precio para clientes mayoreo (top 5 + cola larga grande)';
COMMENT ON COLUMN public.productos.precio_medio IS 'Precio para clientes medio mayoreo';
COMMENT ON COLUMN public.productos.precio_menudeo IS 'Precio para mostrador y mercados';

-- 2. Precio piso (absoluto en pesos, no %)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS precio_piso NUMERIC(12,2);

COMMENT ON COLUMN public.productos.precio_piso IS 'Precio mínimo absoluto. No bloquea pedidos, solo señala. Si precio < piso → yellow flag + notif a Jose.';

-- 3. Claves SAT (sin FK formal, validación en app)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS clave_prod_serv TEXT,
  ADD COLUMN IF NOT EXISTS clave_unidad_sat TEXT;

COMMENT ON COLUMN public.productos.clave_prod_serv IS 'SAT c_ClaveProdServ (8 dígitos). Se llena en Sprint 2 con IA + validación.';
COMMENT ON COLUMN public.productos.clave_unidad_sat IS 'SAT c_ClaveUnidad (ej. KGM, H87, BO). Se llena en Sprint 2.';

-- 4. Marca propia
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS marca_propia BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.productos.marca_propia IS 'TRUE = SKU re-empacado por ALMASA con marca propia (latas almíbar, cosateles, futuro retail).';

-- 5. Código de barras (preparado, no en uso hoy)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

COMMENT ON COLUMN public.productos.codigo_barras IS 'EAN-13 o UPC-A. Preparado para futuro re-empaque y retail.';

-- Índice único condicional: solo cuando hay valor
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_barras_unique
  ON public.productos(codigo_barras)
  WHERE codigo_barras IS NOT NULL;

-- 6. BACKFILL · 347 SKUs existentes
-- precio_mayoreo = precio_venta (mayoría de ALMASA es mayoreo hoy)
UPDATE public.productos
  SET precio_mayoreo = precio_venta
  WHERE precio_mayoreo IS NULL AND precio_venta IS NOT NULL;

-- precio_piso = precio_venta * 0.85 (15% bajo, sugerencia conservadora)
UPDATE public.productos
  SET precio_piso = ROUND(precio_venta * 0.85, 2)
  WHERE precio_piso IS NULL AND precio_venta IS NOT NULL;

-- precio_medio y precio_menudeo quedan NULL — se llenan en Sprint 2 con UI explícita
-- (no se inventan markups arbitrarios; mejor que Adriana/Lupita los definan)

COMMIT;
