-- =============================================
-- M02.1: Categorías canónicas, FK, view fix, RLS
-- =============================================

-- 1. Create categorias_productos table
CREATE TABLE public.categorias_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorias_productos_activo ON public.categorias_productos(activo);
CREATE INDEX idx_categorias_productos_orden ON public.categorias_productos(orden);

-- Trigger for updated_at
CREATE TRIGGER update_categorias_productos_updated_at
  BEFORE UPDATE ON public.categorias_productos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Seed 16 canonical categories
INSERT INTO public.categorias_productos (nombre, orden) VALUES
  ('Alimento para Aves', 10),
  ('Alimentos Balanceados', 20),
  ('Alimentos para Mascotas', 30),
  ('Azúcar', 40),
  ('Bolsas', 50),
  ('Botanas y Golosinas', 60),
  ('Cereales', 70),
  ('Conservas', 80),
  ('Especias y Condimentos', 90),
  ('Frutas Secas y Nueces', 100),
  ('Papel y Polipapel', 110),
  ('Sales', 120),
  ('Semillas', 130),
  ('Temporada', 140),
  ('Varios', 150),
  ('Veladoras', 160);

-- 3. Add categoria_id FK to productos
ALTER TABLE public.productos
  ADD COLUMN categoria_id uuid REFERENCES public.categorias_productos(id);

CREATE INDEX idx_productos_categoria_id ON public.productos(categoria_id);

-- 4. Backfill: match existing string to canonical category (case-insensitive)
-- First: consolidate "Frutas Secas" and "Nueces y Frutas Secas" → "Frutas Secas y Nueces"
UPDATE public.productos p
SET categoria_id = cp.id
FROM public.categorias_productos cp
WHERE cp.nombre = 'Frutas Secas y Nueces'
  AND (LOWER(TRIM(p.categoria)) = 'frutas secas' OR LOWER(TRIM(p.categoria)) = 'nueces y frutas secas');

-- Then: match all other products by case-insensitive name
UPDATE public.productos p
SET categoria_id = cp.id
FROM public.categorias_productos cp
WHERE p.categoria_id IS NULL
  AND LOWER(TRIM(p.categoria)) = LOWER(TRIM(cp.nombre));

-- Also update the string column for consolidated products
UPDATE public.productos
SET categoria = 'Frutas Secas y Nueces'
WHERE LOWER(TRIM(categoria)) IN ('frutas secas', 'nueces y frutas secas');

-- 5. Fix productos_stock_bajo view
DROP VIEW IF EXISTS public.productos_stock_bajo;

CREATE VIEW public.productos_stock_bajo AS
SELECT *
FROM public.productos
WHERE activo = true
  AND stock_minimo > 0
  AND stock_actual <= stock_minimo;

-- 6. RLS on productos
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos_select_authenticated"
  ON public.productos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "productos_insert_admin_secretaria"
  ON public.productos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role])
  );

CREATE POLICY "productos_update_admin_secretaria"
  ON public.productos
  FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role])
  );

-- 7. RLS on categorias_productos
ALTER TABLE public.categorias_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_select_authenticated"
  ON public.categorias_productos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "categorias_insert_admin"
  ON public.categorias_productos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "categorias_update_admin"
  ON public.categorias_productos
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );