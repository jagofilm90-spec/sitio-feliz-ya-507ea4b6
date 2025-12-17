-- Agregar foreign keys faltantes a la tabla rutas (con verificación de existencia)

DO $$ 
BEGIN
  -- Foreign key para chofer_id → empleados.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rutas_chofer_id_fkey'
  ) THEN
    ALTER TABLE public.rutas
    ADD CONSTRAINT rutas_chofer_id_fkey 
    FOREIGN KEY (chofer_id) REFERENCES public.empleados(id);
  END IF;

  -- Foreign key para almacenista_id → empleados.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rutas_almacenista_id_fkey'
  ) THEN
    ALTER TABLE public.rutas
    ADD CONSTRAINT rutas_almacenista_id_fkey 
    FOREIGN KEY (almacenista_id) REFERENCES public.empleados(id);
  END IF;

  -- Foreign key para ayudante_id → empleados.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rutas_ayudante_id_fkey'
  ) THEN
    ALTER TABLE public.rutas
    ADD CONSTRAINT rutas_ayudante_id_fkey 
    FOREIGN KEY (ayudante_id) REFERENCES public.empleados(id);
  END IF;
END $$;