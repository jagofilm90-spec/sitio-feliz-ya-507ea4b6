-- ALMASA-OS · FASE 1 · Sprint 1 (corregida en Sprint 1.5)
-- Amplía enum unit_type del Blueprint v0.5 sin duplicar valores existentes.
-- balón (con acento) ya existía desde 20251202032126 — NO agregamos balon (sin acento).
-- Solo agregamos lo que realmente falta: cubeta, bolsa.
--
-- Nota: Sprint 1.5 cambió la decisión de "agregar balon" a "respetar balón existente"
-- para no crear valores duplicados que signifiquen lo mismo.
-- Refs: Blueprint v0.5 · FASE 1 · Sprint 1.5

-- ALTER TYPE ADD VALUE no es transaccional, no envolvemos en BEGIN/COMMIT.
-- IF NOT EXISTS hace la migración idempotente.

-- cubeta y bolsa: agregar si no existen
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'cubeta';
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'bolsa';

-- balón con acento ya existe en la migración 20251202032126.
-- Es el valor canónico para esa unidad en ALMASA. NO agregamos balon sin acento.

COMMENT ON TYPE public.unit_type IS 'Tipos de unidad de venta de ALMASA. Valor canónico para balón es CON acento (legacy). Demás valores sin acento por convención del catálogo.';
