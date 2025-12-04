-- Índice único para evitar códigos de sucursal duplicados por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_sucursales_codigo_unico 
ON cliente_sucursales (cliente_id, codigo_sucursal) 
WHERE codigo_sucursal IS NOT NULL;