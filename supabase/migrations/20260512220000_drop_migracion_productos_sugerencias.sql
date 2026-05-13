-- Eliminar tabla de migración one-shot creada en 20260117035352 (enero 2026).
-- Ningún componente UI, hook ni RPC la referencia. La migración de datos ya concluyó.
-- Guard: aborta si la tabla tiene filas para evitar pérdida de datos no auditada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'migracion_productos_sugerencias'
  ) THEN
    IF (SELECT COUNT(*) FROM public.migracion_productos_sugerencias) > 0 THEN
      RAISE EXCEPTION
        'migracion_productos_sugerencias tiene filas vivas. Revisar antes de eliminar.';
    END IF;
    DROP TABLE public.migracion_productos_sugerencias CASCADE;
  END IF;
END $$;
