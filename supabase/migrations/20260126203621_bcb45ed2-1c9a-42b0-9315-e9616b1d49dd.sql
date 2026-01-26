-- Add monto_pagado column to track partial payments
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS monto_pagado numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN ordenes_compra.monto_pagado IS 'Total amount paid so far (sum of paid invoices). Used to track partial payments.';