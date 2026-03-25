ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rechazado' AFTER 'por_autorizar';

ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS autorizacion_status text NOT NULL DEFAULT 'pendiente' CHECK (autorizacion_status IN ('pendiente','aprobado','precio_modificado','rechazado'));

ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS precio_autorizado numeric NULL;