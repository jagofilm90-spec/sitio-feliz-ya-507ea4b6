ALTER TABLE public.solicitudes_descuento
  ADD CONSTRAINT solicitudes_descuento_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES public.profiles(id);