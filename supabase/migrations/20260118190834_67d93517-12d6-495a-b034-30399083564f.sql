-- Agregar campos fiscales completos a proveedores (estilo CSF)
ALTER TABLE proveedores
ADD COLUMN IF NOT EXISTS calle TEXT,
ADD COLUMN IF NOT EXISTS numero_exterior TEXT,
ADD COLUMN IF NOT EXISTS numero_interior TEXT,
ADD COLUMN IF NOT EXISTS colonia TEXT,
ADD COLUMN IF NOT EXISTS municipio TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT,
ADD COLUMN IF NOT EXISTS nombre_comercial TEXT;

COMMENT ON COLUMN proveedores.calle IS 'Nombre de la calle del domicilio fiscal';
COMMENT ON COLUMN proveedores.numero_exterior IS 'Número exterior del domicilio fiscal';
COMMENT ON COLUMN proveedores.numero_interior IS 'Número interior del domicilio fiscal (opcional)';
COMMENT ON COLUMN proveedores.colonia IS 'Colonia del domicilio fiscal';
COMMENT ON COLUMN proveedores.municipio IS 'Municipio o Delegación del domicilio fiscal';
COMMENT ON COLUMN proveedores.estado IS 'Estado o Entidad Federativa del domicilio fiscal';
COMMENT ON COLUMN proveedores.codigo_postal IS 'Código postal del domicilio fiscal';
COMMENT ON COLUMN proveedores.regimen_fiscal IS 'Clave del régimen fiscal SAT (ej: 601, 612, 626)';
COMMENT ON COLUMN proveedores.nombre_comercial IS 'Nombre comercial del proveedor (opcional)';