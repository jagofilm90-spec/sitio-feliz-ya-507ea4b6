-- Entrega cruzada: una sucursal puede entregarse en otra sucursal
-- Ejemplo: Lecaroz "45 Ander" se entrega en "34 Bosques"
-- Si sucursal_entrega_id es NULL, se entrega en su propia dirección (default)
ALTER TABLE cliente_sucursales
ADD COLUMN IF NOT EXISTS sucursal_entrega_id UUID REFERENCES cliente_sucursales(id);

-- Sucursal hermana: vincular panadería con rosticería
-- Ejemplo: Rosticería Bosques es hermana de Panadería Bosques
ALTER TABLE cliente_sucursales
ADD COLUMN IF NOT EXISTS sucursal_hermana_id UUID REFERENCES cliente_sucursales(id);

-- Index para queries de entrega cruzada
CREATE INDEX IF NOT EXISTS idx_sucursales_entrega_cruzada
ON cliente_sucursales(sucursal_entrega_id)
WHERE sucursal_entrega_id IS NOT NULL;

-- Index para queries de sucursales hermanas
CREATE INDEX IF NOT EXISTS idx_sucursales_hermana
ON cliente_sucursales(sucursal_hermana_id)
WHERE sucursal_hermana_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN cliente_sucursales.sucursal_entrega_id IS 'Si no es NULL, los pedidos de esta sucursal se ENTREGAN en la sucursal referenciada';
COMMENT ON COLUMN cliente_sucursales.sucursal_hermana_id IS 'Sucursal hermana (ej: rosticería al lado de panadería), se entregan juntas';
