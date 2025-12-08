
-- Tabla para excepciones de crédito por cliente+producto
CREATE TABLE public.cliente_creditos_excepciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  termino_credito credit_term NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_cliente_producto UNIQUE (cliente_id, producto_id)
);

-- Índices
CREATE INDEX idx_cliente_creditos_excepciones_cliente ON cliente_creditos_excepciones(cliente_id);
CREATE INDEX idx_cliente_creditos_excepciones_producto ON cliente_creditos_excepciones(producto_id);

-- RLS
ALTER TABLE cliente_creditos_excepciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y secretarias pueden gestionar excepciones de crédito"
ON cliente_creditos_excepciones FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Vendedores pueden ver excepciones de sus clientes"
ON cliente_creditos_excepciones FOR SELECT
USING (has_role(auth.uid(), 'vendedor'::app_role) AND es_vendedor_de_cliente(cliente_id));

-- Trigger para updated_at
CREATE TRIGGER update_cliente_creditos_excepciones_updated_at
BEFORE UPDATE ON cliente_creditos_excepciones
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Insertar configuración global de plazos por tipo de producto
INSERT INTO configuracion_empresa (clave, valor, descripcion)
VALUES (
  'plazos_credito_por_tipo_producto',
  '{
    "reglas": [
      {
        "nombre": "Azúcares (8 días)",
        "termino": "8_dias",
        "patrones": ["Azúcar Refinada", "Azúcar Estándar", "Azucar Refinada", "Azucar Estandar"]
      },
      {
        "nombre": "Azúcares especiales (15 días)", 
        "termino": "15_dias",
        "patrones": ["Azúcar Glass", "Azúcar Moscabada", "Azucar Glass", "Azucar Moscabada"]
      }
    ],
    "default_otros_productos": "30_dias"
  }'::jsonb,
  'Configuración de plazos de crédito por tipo de producto. Las reglas se evalúan en orden y el primer match determina el plazo.'
)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

-- Función para obtener el término de crédito correcto
CREATE OR REPLACE FUNCTION obtener_termino_credito(
  p_cliente_id UUID,
  p_producto_id UUID
) RETURNS credit_term
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_excepcion_termino credit_term;
  v_producto_nombre TEXT;
  v_config JSONB;
  v_regla JSONB;
  v_patron TEXT;
  v_cliente_default credit_term;
BEGIN
  -- 1. Buscar excepción específica cliente+producto
  SELECT termino_credito INTO v_excepcion_termino
  FROM cliente_creditos_excepciones
  WHERE cliente_id = p_cliente_id AND producto_id = p_producto_id;
  
  IF v_excepcion_termino IS NOT NULL THEN
    RETURN v_excepcion_termino;
  END IF;
  
  -- 2. Obtener nombre del producto
  SELECT nombre INTO v_producto_nombre FROM productos WHERE id = p_producto_id;
  
  IF v_producto_nombre IS NULL THEN
    -- Si no existe el producto, retornar default del cliente
    SELECT termino_credito INTO v_cliente_default FROM clientes WHERE id = p_cliente_id;
    RETURN COALESCE(v_cliente_default, '30_dias'::credit_term);
  END IF;
  
  -- 3. Buscar en reglas globales por tipo de producto
  SELECT valor INTO v_config FROM configuracion_empresa WHERE clave = 'plazos_credito_por_tipo_producto';
  
  IF v_config IS NOT NULL AND v_config->'reglas' IS NOT NULL THEN
    FOR v_regla IN SELECT * FROM jsonb_array_elements(v_config->'reglas')
    LOOP
      FOR v_patron IN SELECT * FROM jsonb_array_elements_text(v_regla->'patrones')
      LOOP
        IF v_producto_nombre ILIKE '%' || v_patron || '%' THEN
          RETURN (v_regla->>'termino')::credit_term;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  -- 4. Retornar default del cliente
  SELECT termino_credito INTO v_cliente_default FROM clientes WHERE id = p_cliente_id;
  RETURN COALESCE(v_cliente_default, '30_dias'::credit_term);
END;
$$;
