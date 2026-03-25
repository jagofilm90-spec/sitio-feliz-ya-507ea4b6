-- Simplified authorization: add "rechazado" status + helper columns on pedidos_detalles

-- 1. Add "rechazado" enum value (admin rejects, vendor can edit and resubmit)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rechazado' AFTER 'por_autorizar';

-- 2. Add per-product authorization fields to pedidos_detalles (for audit)
ALTER TABLE pedidos_detalles
  ADD COLUMN IF NOT EXISTS autorizacion_status text NOT NULL DEFAULT 'pendiente'
    CHECK (autorizacion_status IN ('pendiente','aprobado','precio_modificado','rechazado')),
  ADD COLUMN IF NOT EXISTS precio_autorizado numeric NULL;
