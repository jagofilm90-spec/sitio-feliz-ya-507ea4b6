-- Add email column for manual suppliers in purchase orders
ALTER TABLE ordenes_compra 
ADD COLUMN proveedor_email_manual TEXT;