-- =====================================================
-- Normalización de texto: Title Case automático
-- =====================================================

-- Función genérica de Title Case para PostgreSQL
-- Respeta artículos/preposiciones en minúscula
CREATE OR REPLACE FUNCTION normalize_title_case(input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  words TEXT[];
  word TEXT;
  i INT := 0;
  lowercase_words TEXT[] := ARRAY['de','del','la','las','los','el','en','y','e','o','u','al','a','con','sin','por','para'];
BEGIN
  IF input IS NULL OR trim(input) = '' THEN RETURN input; END IF;
  words := string_to_array(trim(lower(input)), ' ');
  FOREACH word IN ARRAY words LOOP
    IF word = '' THEN CONTINUE; END IF;
    IF i > 0 AND word = ANY(lowercase_words) THEN
      result := result || ' ' || word;
    ELSE
      result := result || CASE WHEN i > 0 THEN ' ' ELSE '' END || initcap(word);
    END IF;
    i := i + 1;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para normalizar direcciones (Title Case + abreviaturas)
CREATE OR REPLACE FUNCTION normalize_address(input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  words TEXT[];
  word TEXT;
  clean TEXT;
  i INT := 0;
  lowercase_words TEXT[] := ARRAY['de','del','la','las','los','el','en','y','e','o','u','al','a','con','sin','por','para'];
BEGIN
  IF input IS NULL OR trim(input) = '' THEN RETURN input; END IF;
  words := string_to_array(trim(lower(input)), ' ');
  FOREACH word IN ARRAY words LOOP
    IF word = '' THEN CONTINUE; END IF;
    clean := rtrim(word, '.,;:');
    -- Abreviaturas
    IF clean IN ('col.','col') THEN word := 'Col.' || substr(word, length(clean)+1);
    ELSIF clean IN ('c.p.','c.p','cp') THEN word := 'C.P.' || substr(word, length(clean)+1);
    ELSIF clean IN ('no.','num.') THEN word := 'No.' || substr(word, length(clean)+1);
    ELSIF clean IN ('av.','av') THEN word := 'Av.' || substr(word, length(clean)+1);
    ELSIF clean IN ('blvd.','blvd') THEN word := 'Blvd.' || substr(word, length(clean)+1);
    ELSIF clean IN ('fracc.','fracc') THEN word := 'Fracc.' || substr(word, length(clean)+1);
    ELSIF clean IN ('int.') THEN word := 'Int.' || substr(word, length(clean)+1);
    ELSIF clean IN ('ext.') THEN word := 'Ext.' || substr(word, length(clean)+1);
    ELSIF clean IN ('depto.','depto') THEN word := 'Depto.' || substr(word, length(clean)+1);
    ELSIF clean = 'cdmx' THEN word := 'CDMX';
    ELSIF clean ~ '^\d' THEN NULL; -- números: no tocar
    ELSIF i > 0 AND clean = ANY(lowercase_words) THEN NULL; -- preposiciones: no tocar
    ELSE word := initcap(word);
    END IF;
    result := result || CASE WHEN i > 0 THEN ' ' ELSE '' END || word;
    i := i + 1;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGERS para normalizar al insertar/actualizar
-- =====================================================

-- CLIENTES
CREATE OR REPLACE FUNCTION trg_normalize_clientes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nombre := normalize_title_case(NEW.nombre);
  IF NEW.razon_social IS NOT NULL THEN
    NEW.razon_social := upper(trim(NEW.razon_social));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_clientes_trigger ON clientes;
CREATE TRIGGER normalize_clientes_trigger
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_clientes();

-- PROVEEDORES
CREATE OR REPLACE FUNCTION trg_normalize_proveedores()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nombre := normalize_title_case(NEW.nombre);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_proveedores_trigger ON proveedores;
CREATE TRIGGER normalize_proveedores_trigger
  BEFORE INSERT OR UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_proveedores();

-- PRODUCTOS
CREATE OR REPLACE FUNCTION trg_normalize_productos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nombre := normalize_title_case(NEW.nombre);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_productos_trigger ON productos;
CREATE TRIGGER normalize_productos_trigger
  BEFORE INSERT OR UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_productos();

-- EMPLEADOS
CREATE OR REPLACE FUNCTION trg_normalize_empleados()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nombre_completo := normalize_title_case(NEW.nombre_completo);
  IF NEW.nombre IS NOT NULL THEN
    NEW.nombre := normalize_title_case(NEW.nombre);
  END IF;
  IF NEW.primer_apellido IS NOT NULL THEN
    NEW.primer_apellido := normalize_title_case(NEW.primer_apellido);
  END IF;
  IF NEW.segundo_apellido IS NOT NULL THEN
    NEW.segundo_apellido := normalize_title_case(NEW.segundo_apellido);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_empleados_trigger ON empleados;
CREATE TRIGGER normalize_empleados_trigger
  BEFORE INSERT OR UPDATE ON empleados
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_empleados();

-- CLIENTE_SUCURSALES
CREATE OR REPLACE FUNCTION trg_normalize_sucursales()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nombre := normalize_title_case(NEW.nombre);
  IF NEW.direccion IS NOT NULL THEN
    NEW.direccion := normalize_address(NEW.direccion);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_sucursales_trigger ON cliente_sucursales;
CREATE TRIGGER normalize_sucursales_trigger
  BEFORE INSERT OR UPDATE ON cliente_sucursales
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_sucursales();

-- =====================================================
-- NORMALIZAR DATOS EXISTENTES
-- =====================================================

UPDATE clientes SET
  nombre = normalize_title_case(nombre),
  razon_social = CASE WHEN razon_social IS NOT NULL THEN upper(trim(razon_social)) ELSE razon_social END
WHERE nombre IS NOT NULL;

UPDATE proveedores SET
  nombre = normalize_title_case(nombre)
WHERE nombre IS NOT NULL;

UPDATE productos SET
  nombre = normalize_title_case(nombre)
WHERE nombre IS NOT NULL;

UPDATE empleados SET
  nombre_completo = normalize_title_case(nombre_completo),
  nombre = normalize_title_case(nombre),
  primer_apellido = normalize_title_case(primer_apellido),
  segundo_apellido = normalize_title_case(segundo_apellido)
WHERE nombre_completo IS NOT NULL;

UPDATE cliente_sucursales SET
  nombre = normalize_title_case(nombre),
  direccion = CASE WHEN direccion IS NOT NULL THEN normalize_address(direccion) ELSE direccion END
WHERE nombre IS NOT NULL;
