-- 1. Agregar campos para proveedor manual
ALTER TABLE ordenes_compra 
ADD COLUMN proveedor_nombre_manual TEXT,
ADD COLUMN proveedor_telefono_manual TEXT;

-- 2. Hacer proveedor_id nullable
ALTER TABLE ordenes_compra 
ALTER COLUMN proveedor_id DROP NOT NULL;

-- 3. Agregar constraint para asegurar que tenga proveedor_id O nombre manual
ALTER TABLE ordenes_compra 
ADD CONSTRAINT chk_proveedor_requerido 
CHECK (proveedor_id IS NOT NULL OR proveedor_nombre_manual IS NOT NULL);