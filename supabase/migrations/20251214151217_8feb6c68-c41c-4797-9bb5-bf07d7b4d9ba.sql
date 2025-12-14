-- Agregar campos faltantes a tabla entregas para registro de entregas
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS nombre_receptor text;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS hora_entrega_real timestamp with time zone;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS status_entrega text DEFAULT 'pendiente';
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS motivo_rechazo text;

-- Comentarios para documentación
COMMENT ON COLUMN public.entregas.nombre_receptor IS 'Nombre de la persona que recibió la mercancía';
COMMENT ON COLUMN public.entregas.hora_entrega_real IS 'Timestamp exacto cuando se registró la entrega';
COMMENT ON COLUMN public.entregas.status_entrega IS 'Estado: pendiente, entregado, rechazado, parcial';
COMMENT ON COLUMN public.entregas.motivo_rechazo IS 'Razón del rechazo o entrega parcial';

-- RLS para que choferes puedan ver y actualizar sus entregas
CREATE POLICY "Choferes pueden ver entregas de sus rutas"
ON public.entregas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.empleados e ON e.id = r.chofer_id
    WHERE r.id = entregas.ruta_id 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Choferes pueden actualizar entregas de sus rutas"
ON public.entregas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.empleados e ON e.id = r.chofer_id
    WHERE r.id = entregas.ruta_id 
    AND e.user_id = auth.uid()
  )
);