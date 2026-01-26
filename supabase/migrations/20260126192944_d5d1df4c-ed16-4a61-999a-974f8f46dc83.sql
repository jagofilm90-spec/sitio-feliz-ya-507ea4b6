-- Tabla para almacenar el detalle de productos conciliados en facturas
CREATE TABLE public.proveedor_factura_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.proveedor_facturas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id),
  cantidad_facturada INTEGER NOT NULL,
  precio_unitario_facturado NUMERIC NOT NULL,
  subtotal_facturado NUMERIC NOT NULL,
  precio_original_oc NUMERIC NOT NULL,
  diferencia NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nuevos campos en proveedor_facturas para control de conciliación
ALTER TABLE public.proveedor_facturas
ADD COLUMN IF NOT EXISTS requiere_conciliacion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS conciliacion_completada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS diferencia_total NUMERIC DEFAULT 0;

-- Habilitar RLS
ALTER TABLE public.proveedor_factura_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para proveedor_factura_detalles
CREATE POLICY "Authenticated users can view proveedor_factura_detalles"
ON public.proveedor_factura_detalles FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert proveedor_factura_detalles"
ON public.proveedor_factura_detalles FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update proveedor_factura_detalles"
ON public.proveedor_factura_detalles FOR UPDATE
TO authenticated USING (true);

-- Función para conciliar factura y ajustar costos
CREATE OR REPLACE FUNCTION public.conciliar_factura_proveedor(
  p_factura_id UUID,
  p_productos JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto RECORD;
  v_oc_id UUID;
BEGIN
  -- Obtener la OC de la factura
  SELECT orden_compra_id INTO v_oc_id
  FROM proveedor_facturas
  WHERE id = p_factura_id;

  IF v_oc_id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada o sin OC asociada';
  END IF;

  -- Por cada producto, ajustar costos
  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos) 
    AS x(producto_id UUID, precio_facturado NUMERIC, cantidad INTEGER)
  LOOP
    -- Actualizar lotes de inventario de esta OC
    UPDATE inventario_lotes
    SET precio_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE orden_compra_id = v_oc_id
      AND producto_id = v_producto.producto_id;

    -- Actualizar detalle de la OC
    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = COALESCE(cantidad_recibida, cantidad) * v_producto.precio_facturado
    WHERE orden_compra_id = v_oc_id
      AND producto_id = v_producto.producto_id;

    -- Recalcular costo promedio del producto
    UPDATE productos 
    SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE id = v_producto.producto_id;
  END LOOP;

  -- Recalcular total de la OC
  UPDATE ordenes_compra
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = v_oc_id
  ),
  total_ajustado = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = v_oc_id
  ) - COALESCE(monto_devoluciones, 0),
  updated_at = now()
  WHERE id = v_oc_id;

  -- Marcar factura como conciliada
  UPDATE proveedor_facturas
  SET conciliacion_completada = true,
      updated_at = now()
  WHERE id = p_factura_id;
END;
$$;