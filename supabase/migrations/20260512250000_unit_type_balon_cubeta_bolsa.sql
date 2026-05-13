-- ALMASA-OS · FASE 1 · Sprint 1
-- Amplía enum unit_type con valores del Blueprint v0.5: balon, cubeta, bolsa
-- Refs: Blueprint v0.5 · FASE 1 · Sprint 1

-- Nota: ALTER TYPE ADD VALUE no es transaccional, por eso no envolvemos en BEGIN/COMMIT.
-- IF NOT EXISTS hace la migración idempotente.

-- Nota: 'cubeta' ya existe desde 20251127181800 — IF NOT EXISTS = no-op.
-- Nota: 'balón' (con acento) ya existe desde 20251202032126. 'balon' (sin acento)
--       es un valor distinto en Postgres. Ver docs/decisions/2026-05-12-unit-type-balon.md.
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'balon';
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'cubeta';
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'bolsa';

-- Documentación del orden lógico de valores (no afecta storage, solo lectura):
COMMENT ON TYPE public.unit_type IS 'Tipos de unidad de venta. Orden lógico sugerido: pieza, kg, litro, caja, bulto, costal, balon, cubeta, bolsa.';
