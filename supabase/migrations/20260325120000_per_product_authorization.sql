-- Per-product authorization: new status + new columns on pedidos_detalles

-- 1. Add new enum value for vendor price confirmation
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'por_confirmar_vendedor' AFTER 'por_autorizar';

-- 2. Add per-product authorization fields to pedidos_detalles
ALTER TABLE pedidos_detalles
  ADD COLUMN IF NOT EXISTS autorizacion_status text NOT NULL DEFAULT 'pendiente'
    CHECK (autorizacion_status IN ('pendiente','aprobado','precio_modificado','rechazado')),
  ADD COLUMN IF NOT EXISTS precio_autorizado numeric NULL;
