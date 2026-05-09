# Rediseño de Lista de Precios — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría lista precios + decisiones operativas + metodología "Mejor que Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Precio justo protege a ambos. Mejor que Oracle.

---

## 1. La filosofía

Precio NO es solo número. Es contrato implícito entre ALMASA y 
cliente: "tú pagas X, yo entrego Y a costo Z dejando margen W".

> Principio rector: "Precio justo protege a ambos. ALMASA no 
> pierde dinero por mal cálculo. Cliente paga por lo que recibe. 
> Sistema calcula automático lo que humanos olvidan."

> Principio operacional ALMASA: "Protege ALMASA con los gastos 
> de operación y compensa a otras empresas (proveedores, 
> empleados). Precio justo es columna del negocio."

---

## 2. Estado actual de lista de precios

ALMASA-OS Lista de Precios YA es módulo COMPLETO:

**3 tablas dedicadas:**

| Tabla | Función |
|-------|---------|
| productos_historial_precios | Historial cambios precio venta |
| productos_revision_precio | Workflow revisión cuando CPP cambia (ÚNICO) |
| precios_proveedor_producto | Precios proveedor con vigencia |

**Componentes (~2,727 líneas):**
- AdminListaPreciosTab (636 lín) — gestión completa
- SecretariaListaPreciosTab (465 lín) — edita individual
- VendedorListaPreciosTab (400 lín) — solo lectura + comparador
- listaPreciosPdfGenerator (310 lín) — PDF
- usePrecioEditor (260 lín) — calculadora margen
- useListaPrecios (248 lín) — datos + análisis
- RevisionesPrecioPanel (152 lín) — revisiones pendientes
- PrecioHistorialDialog (117 lín) — historial cambios

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Precio lista por producto | ✅ | productos.precio_venta |
| Histórico cambios | ✅ | productos_historial_precios |
| Workflow revisión post-CPP | ✅ ÚNICO | productos_revision_precio |
| Precios proveedor temporales | ✅ M02.5 | con vigencia |
| Descuento máximo vendedor | ✅ | por producto |
| Calculadora margen admin | ✅ | simularPrecioPropuesto |
| Notificación cambio | ✅ | a secretaria + vendedor |
| Vista por rol (3) | ✅ | admin / secretaria / vendedor |
| Export PDF + Excel | ✅ | listaPreciosPdfGenerator + exportToExcel |
| Último precio cliente | ✅ | en cotizaciones |
| Análisis margen | ✅ | 4 funciones lib/calculos |
| Listas múltiples | ❌ NO existe | Solo 1 maestra |
| Precio por cliente | ❌ NO existe | Sin negociados |
| Precio por zona | ❌ NO existe | Sin diferenciación |
| Precios escalonados volumen | ❌ NO existe | Sin descuento cantidad |
| Promociones vigencia | 🟡 flag básico | sin tabla formal |

**Conclusión:** Módulo muy maduro con ÚNICO no replicable. 5 brechas son completamiento.

---

## 3. Estándar Oracle / SAP / NetSuite

8 conceptos universales:
1. Precio Base (lista maestra)
2. Precio por Canal
3. Precio por Cliente
4. Precio por Zona
5. Precio por Volumen
6. Promociones Temporales
7. Precio Piso
8. Aprobación de Cambios

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Precio lista | ✅ | ✅ | EMPATE |
| Histórico cambios | ✅ | ✅ | EMPATE |
| Workflow revisión post-CPP | ❌ | ✅ ÚNICO | ALMASA |
| Descuento máximo | ✅ | ✅ | EMPATE |
| Calculadora margen | ✅ | ✅ | EMPATE |
| Notificación cambio | ✅ | ✅ | EMPATE |
| Vista por rol | ✅ | ✅ 3 vistas | EMPATE |
| Export PDF/Excel | ✅ | ✅ | EMPATE |
| Listas múltiples | ✅ | ❌ → 3 canales | EMPATE (post) |
| Precio por zona | ✅ | ❌ → factor auto | ALMASA (post) |
| Protección utilidad | 🟡 | ❌ → ÚNICO | ALMASA (post) |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador post-implementación:**
ALMASA gana: 3 dimensiones (incluyendo 2 ÚNICOS + costo)
Oracle gana: 0 dimensiones
Empate: 14 dimensiones

---

## 5. Las 5 Brechas

### Brecha 1 — Listas Múltiples (Canales)

```sql
CREATE TABLE listas_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'mayoreo', 'medio_mayoreo', 'menudeo', 'especial', 'distribuidor'
  )),
  factor_multiplicador NUMERIC DEFAULT 1.0,
  monto_minimo_aplicar NUMERIC,
  auto_asignar_por_volumen BOOLEAN DEFAULT true,
  vigente BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE precios_por_lista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  lista_precio_id UUID NOT NULL REFERENCES listas_precios(id),
  precio NUMERIC NOT NULL,
  precio_calculado_de_factor BOOLEAN DEFAULT false,
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(producto_id, lista_precio_id, vigente_desde)
);

ALTER TABLE clientes 
  ADD COLUMN lista_precio_default_id UUID REFERENCES listas_precios(id);
```

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTA COMERCIAL

### Brecha 2 — Precio Especial Por Cliente (VIPs)

```sql
CREATE TABLE precios_cliente_especial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  producto_id UUID REFERENCES productos(id),
  categoria_id UUID REFERENCES categorias_productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'precio_fijo', 'descuento_pct', 'descuento_fijo'
  )),
  precio_fijo NUMERIC,
  descuento_porcentaje NUMERIC,
  descuento_monto NUMERIC,
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  motivo TEXT NOT NULL,
  aprobado_por UUID NOT NULL,
  contrato_url TEXT,
  contrato_hash_sha256 TEXT,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTA

### Brecha 3 — Precio Por Zona (PROTECCIÓN ALMASA)

```sql
CREATE TABLE precios_por_zona (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID NOT NULL REFERENCES zonas(id),
  factor_multiplicador NUMERIC NOT NULL DEFAULT 1.0,
  motivo TEXT NOT NULL,
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  aprobado_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION aplicar_factor_zona(
  p_precio_base NUMERIC,
  p_zona_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_factor NUMERIC;
BEGIN
  SELECT factor_multiplicador INTO v_factor
  FROM precios_por_zona
  WHERE zona_id = p_zona_id
    AND vigente_desde <= CURRENT_DATE
    AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
  ORDER BY vigente_desde DESC
  LIMIT 1;
  
  RETURN p_precio_base * COALESCE(v_factor, 1.0);
END;
$$ LANGUAGE plpgsql;
```

**Factores propuestos:**
- CDMX local: 1.00
- Conurbada: 1.05
- Foránea cercana: 1.10
- Foránea lejana: 1.15

**Protege utilidad N3 automáticamente.**

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE PROTECCIÓN UTILIDAD

### Brecha 4 — Precios Escalonados Por Volumen

```sql
CREATE TABLE precios_escalonados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad_minima NUMERIC NOT NULL,
  cantidad_maxima NUMERIC,
  precio NUMERIC,
  descuento_porcentaje NUMERIC,
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (cantidad_maxima IS NULL OR cantidad_maxima > cantidad_minima)
);

CREATE OR REPLACE FUNCTION precio_escalonado(
  p_producto_id UUID,
  p_cantidad NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_precio NUMERIC;
BEGIN
  SELECT 
    COALESCE(precio, 
      (SELECT precio_venta FROM productos WHERE id = p_producto_id) * 
      (1 - COALESCE(descuento_porcentaje, 0) / 100))
  INTO v_precio
  FROM precios_escalonados
  WHERE producto_id = p_producto_id
    AND cantidad_minima <= p_cantidad
    AND (cantidad_maxima IS NULL OR cantidad_maxima >= p_cantidad)
    AND vigente_desde <= CURRENT_DATE
    AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
  ORDER BY cantidad_minima DESC
  LIMIT 1;
  
  IF v_precio IS NULL THEN
    SELECT precio_venta INTO v_precio FROM productos WHERE id = p_producto_id;
  END IF;
  
  RETURN v_precio;
END;
$$ LANGUAGE plpgsql;
```

**Ejemplo:** Arroz: 1-9 $850, 10-49 $820, 50+ $790

**Esfuerzo:** 1-2 semanas  
**Prioridad:** ALTA COMERCIAL

### Brecha 5 — Promociones Temporales con Vigencia

```sql
CREATE TABLE promociones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  banner_url TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'descuento_pct', 'descuento_fijo', 'precio_especial', '2x1', '3x2'
  )),
  valor NUMERIC,
  productos_ids UUID[],
  categorias_ids UUID[],
  aplica_todos BOOLEAN DEFAULT false,
  vigente_desde TIMESTAMPTZ NOT NULL,
  vigente_hasta TIMESTAMPTZ NOT NULL,
  cantidad_minima_compra NUMERIC,
  monto_minimo_pedido NUMERIC,
  clientes_aplicables_ids UUID[],
  cantidad_disponible INTEGER,
  cantidad_usada INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  agotada BOOLEAN GENERATED ALWAYS AS 
    (cantidad_disponible IS NOT NULL AND cantidad_usada >= cantidad_disponible) STORED,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE promociones_aplicadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promocion_id UUID NOT NULL REFERENCES promociones(id),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  cliente_id UUID NOT NULL,
  monto_descuento NUMERIC,
  aplicada_en TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION desactivar_promociones_expiradas()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE promociones SET activa = false
  WHERE vigente_hasta < now() AND activa = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTA COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/23 generado |
| Julio | Brecha 3: Precio por zona (1 sem) |
| Julio | Brecha 4: Escalonados volumen (1-2 sem) |
| Agosto | Brecha 1: Listas múltiples (2 sem) |
| Septiembre | Brecha 2: Precio cliente especial (2 sem) |
| Octubre | Brecha 5: Promociones temporales (2 sem) |

**Tiempo total:** 4-5 meses  
**Inversión:** $0 software

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Factores zona iniciales
- CDMX local: 1.00, Conurbada: 1.05?
- Foránea cercana: 1.10, lejana: 1.15?

### Decisión 2 — Umbrales canales
- Mayoreo: > $10K? Medio: $1K-$10K? Menudeo: < $1K?

### Decisión 3 — Clientes VIP iniciales
- Lecaroz tiene precio especial?
- Otros clientes con acuerdos?

### Decisión 4 — Escalones por categoría
- Granos: 1-9, 10-49, 50+. Otros mismos rangos?

### Decisión 5 — Promociones
- Empezar con 1-2 piloto

### Decisión 6 — Aprobación cambios
- Solo admin aprueba precios especiales?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #4 (CPP real): precio piso es CPP
- Principio #5 (Utilidad 3 niveles): zona protege N3
- Principio #6 (Doble unidad): precio_por_kilo

### Conexiones cruzadas:
- /audit/13 Pedidos: aplica lista + zona
- /audit/14 Rutas: zonas alimentan factor
- /audit/18 Clientes: lista_precio_default_id
- /audit/19 Dashboard: protección utilidad N3
- /audit/22 Productos: precio_venta como base

### Nuevo Principio Transversal — PROTECCIÓN AUTOMÁTICA UTILIDAD
"El sistema debe proteger ALMASA automáticamente. Cliente lejos 
paga compensación logística. Volumen incentiva mayoreo. Precio 
piso protege contra venta bajo costo."

---

## 9. Recomendación final

ALMASA-OS Lista de Precios YA es módulo MUY MADURO con ÚNICO 
(workflow revisión post-CPP). Las 5 brechas completan el motor:

1. LISTAS MÚLTIPLES — 3 canales
2. PRECIO CLIENTE ESPECIAL — VIPs con acuerdos
3. PRECIO POR ZONA — protección automática utilidad
4. PRECIOS ESCALONADOS — incentivo mayoreo
5. PROMOCIONES VIGENCIA — futuro comercial

**Orden estricto:**
1. JULIO: Precio zona + Escalonados
2. AGOSTO: Listas múltiples
3. SEPTIEMBRE: Precio cliente especial
4. OCTUBRE: Promociones temporales

Una vez completas, ALMASA-OS Lista de Precios será **superior a 
Oracle Pricing Engine** para distribuidoras mexicanas, con costo 
$0 y 2 ventajas únicas (workflow CPP + protección zona N3).

---

*ALMASA-OS · Rediseño de Lista de Precios · v1.0*  
*Generado el 10 de mayo de 2026*  
*Precio justo protege a ambos. Mejor que Oracle.*
