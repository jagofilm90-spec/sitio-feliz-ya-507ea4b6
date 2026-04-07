ALTER TABLE cliente_sucursales
ADD COLUMN IF NOT EXISTS sucursal_entrega_id UUID REFERENCES cliente_sucursales(id);

ALTER TABLE cliente_sucursales
ADD COLUMN IF NOT EXISTS sucursal_hermana_id UUID REFERENCES cliente_sucursales(id);

CREATE INDEX IF NOT EXISTS idx_sucursales_entrega_cruzada
ON cliente_sucursales(sucursal_entrega_id)
WHERE sucursal_entrega_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sucursales_hermana
ON cliente_sucursales(sucursal_hermana_id)
WHERE sucursal_hermana_id IS NOT NULL;

COMMENT ON COLUMN cliente_sucursales.sucursal_entrega_id IS 'Si no es NULL, los pedidos de esta sucursal se ENTREGAN en la sucursal referenciada';
COMMENT ON COLUMN cliente_sucursales.sucursal_hermana_id IS 'Sucursal hermana (ej: rosticería al lado de panadería), se entregan juntas';