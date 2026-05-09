# Rediseño de Productos / Catálogo — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría productos + decisiones operativas + metodología "Mejor que Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El catálogo es el corazón del negocio. Producto vendible.

---

## 1. La filosofía

Productos es el corazón de cualquier distribuidora. ALMASA tiene 
cientos de productos: granos, harinas, aceites, conservas, dulces. 
Cada producto tiene historia: proveedor que lo trae, precio que 
fluctúa, demanda que cambia, ciclo de vida que termina.

> Principio rector: "Cada producto es una historia: imagen, código, 
> jerarquía, ciclo de vida, ficha técnica. Catálogo profesional 
> vendible."

---

## 2. Estado actual de productos

ALMASA-OS Productos es módulo MUY MADURO:

**Tabla productos — 39 campos:**
- Identidad: codigo, nombre, marca, descripcion, especificaciones
- Categoría: categoria_id FK
- Unidad: 5 tipos (kg, pieza, caja, bulto, costal)
- Peso: peso_kg, precio_por_kilo (precio dual)
- Precios: precio_venta, precio_compra, CPP, descuento_maximo
- Fiscal: codigo_sat, unidad_sat, IVA, IEPS multi-tasa
- Stock: stock_actual, stock_minimo
- Fumigación: requiere_fumigacion
- Caducidad: maneja_caducidad
- Promociones: producto_base_id, descripcion_promocion
- Control: activo, bloqueado_venta, solo_uso_interno
- Proveedor: proveedor_preferido_id

**Componentes:**
- Productos.tsx (1,281 líneas)
- SecretariaProductosTab.tsx (919 líneas)
- AlmacenProductosTab (sin precios)
- MigracionProductosDialog (598 líneas)
- normalize-product edge function (IA)

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tabla productos (39 campos) | ✅ Completo | Identidad, precio, fiscal, stock |
| Categorías | ✅ planas | categorias_productos |
| Unidades de medida | ✅ 5 tipos | kg, pieza, caja, bulto, costal |
| Precio dual (kilo/unidad) | ✅ ÚNICO | precio_por_kilo + peso_kg |
| Código SAT | ✅ | codigo_sat + unidad_sat |
| IVA/IEPS multi-tasa | ✅ ÚNICO | 6 tasas configurables |
| Stock automático | ✅ | Triggers |
| CPP triggers | ✅ | trg_actualizar_costo_promedio |
| Multi-proveedor | ✅ | proveedor_productos |
| Histórico precios proveedor | ✅ | precios_proveedor_producto |
| Promociones/variantes | ✅ | producto_base_id |
| IA normalización | ✅ ÚNICO | normalize-product edge function |
| Anti-duplicados Levenshtein | ✅ ÚNICO | algoritmo |
| Vista por rol | ✅ | admin/secretaria/almacén |
| Descuento máximo | ✅ | por producto |
| Solo uso interno | ✅ | flag |
| Fotos producto | ❌ NO existe | Sin storage |
| Código de barras | ❌ NO existe | Sin EAN |
| Categorías jerárquicas | ❌ Planas | Sin padre-hijo |
| Lifecycle | ❌ Solo activo | Sin descontinuado/reemplazado |
| Ficha técnica PDF | ❌ NO existe | Sin generador |

**Conclusión:** Módulo MUY MADURO. 5 brechas son completamiento.

---

## 3. Estándar Oracle / SAP / NetSuite

7 conceptos universales:
1. Item Master Data
2. Categorización Jerárquica
3. Unidades de Medida Múltiples
4. Supplier Links
5. Pricing Structure
6. Lifecycle
7. Equivalentes / Sustitutos

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Master data | ✅ | ✅ 39 campos | EMPATE |
| Categorías | ✅ jerárquica | ✅ → jerárquica | EMPATE (post) |
| Unidades múltiples | ✅ | ✅ 5 tipos | EMPATE |
| Precio dual kilo/unidad | ❌ | ✅ ÚNICO | ALMASA |
| Códigos SAT MX | ❌ | ✅ ÚNICO | ALMASA |
| IEPS multi-tasa MX | ❌ | ✅ ÚNICO | ALMASA |
| IA normalización | 🟡 | ✅ ÚNICO | ALMASA |
| Anti-duplicados Lev | ❌ | ✅ ÚNICO | ALMASA |
| Promociones variantes | ✅ | ✅ | EMPATE |
| Fotos producto | ✅ | ❌ → planeado | EMPATE (post) |
| Lifecycle | ✅ | ❌ → planeado | EMPATE (post) |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador post-implementación:**
ALMASA gana: 6 dimensiones (incluyendo 5 ÚNICOS)
Oracle gana: 0 dimensiones
Empate: 14 dimensiones

---

## 5. Las 5 Brechas

### Brecha 1 — Fotos de Producto

```sql
ALTER TABLE productos 
  ADD COLUMN imagen_principal_url TEXT,
  ADD COLUMN imagenes_galeria_urls TEXT[];

CREATE TABLE productos_imagenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  url TEXT NOT NULL,
  hash_sha256 TEXT,
  tipo TEXT CHECK (tipo IN ('principal', 'galeria', 'empaque', 'detalle')),
  orden INTEGER DEFAULT 0,
  alt_text TEXT,
  ancho_px INTEGER,
  alto_px INTEGER,
  bytes BIGINT,
  subido_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Storage bucket:** `productos-imagenes`

**UI:** Catálogo grid con imágenes, drag & drop, lazy loading, recorte auto thumbnails.

**Esfuerzo:** 1 semana  
**Prioridad:** ALTA COMERCIAL

### Brecha 2 — Código de Barras (Preparar Futuro)

```sql
ALTER TABLE productos 
  ADD COLUMN codigo_barras_ean TEXT,
  ADD COLUMN codigo_barras_interno TEXT,
  ADD COLUMN codigo_barras_imagen_url TEXT;

CREATE UNIQUE INDEX idx_productos_ean_unico 
  ON productos(codigo_barras_ean) 
  WHERE codigo_barras_ean IS NOT NULL;

CREATE UNIQUE INDEX idx_productos_interno_unico 
  ON productos(codigo_barras_interno) 
  WHERE codigo_barras_interno IS NOT NULL;
```

**Formato interno:** ALM-XXXX-NNNN (ALM + 4 letras categoría + secuencia)

**Uso futuro:** Cycle counting con scanner (/audit/08), almacén tablet escanea para confirmar.

**Esfuerzo:** 1-2 semanas  
**Prioridad:** NICE (preparar futuro)

### Brecha 3 — Categorías Jerárquicas

```sql
ALTER TABLE categorias_productos 
  ADD COLUMN parent_categoria_id UUID 
    REFERENCES categorias_productos(id),
  ADD COLUMN nivel INTEGER DEFAULT 1,
  ADD COLUMN path_completo TEXT;

CREATE OR REPLACE FUNCTION calcular_path_categoria()
RETURNS TRIGGER AS $$
DECLARE
  v_path TEXT;
BEGIN
  IF NEW.parent_categoria_id IS NULL THEN
    NEW.path_completo := NEW.nombre;
    NEW.nivel := 1;
  ELSE
    SELECT path_completo, nivel + 1
    INTO v_path, NEW.nivel
    FROM categorias_productos
    WHERE id = NEW.parent_categoria_id;
    NEW.path_completo := v_path || ' > ' || NEW.nombre;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_path_categoria
BEFORE INSERT OR UPDATE OF nombre, parent_categoria_id 
ON categorias_productos
FOR EACH ROW EXECUTE FUNCTION calcular_path_categoria();

CREATE OR REPLACE FUNCTION productos_de_categoria_recursiva(p_categoria_id UUID)
RETURNS SETOF productos AS $$
WITH RECURSIVE cat_descendientes AS (
  SELECT id FROM categorias_productos WHERE id = p_categoria_id
  UNION ALL
  SELECT c.id FROM categorias_productos c
  JOIN cat_descendientes cd ON c.parent_categoria_id = cd.id
)
SELECT p.* FROM productos p
WHERE p.categoria_id IN (SELECT id FROM cat_descendientes);
$$ LANGUAGE sql;
```

**Estructura ejemplo:**
```
Abarrotes > Granos > Arroz
Abarrotes > Harinas > Trigo
Abarrotes > Aceites > Vegetal
```

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE

### Brecha 4 — Lifecycle Management Completo

```sql
CREATE TYPE lifecycle_producto AS ENUM (
  'nuevo', 'activo', 'decadencia', 'descontinuado', 'reemplazado'
);

ALTER TABLE productos 
  ADD COLUMN lifecycle lifecycle_producto DEFAULT 'activo',
  ADD COLUMN lifecycle_changed_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN lifecycle_razon TEXT,
  ADD COLUMN reemplazado_por_producto_id UUID REFERENCES productos(id),
  ADD COLUMN reemplazado_en DATE;

CREATE OR REPLACE FUNCTION detectar_productos_decadencia()
RETURNS TABLE (
  producto_id UUID,
  ventas_caida_pct NUMERIC,
  ventas_actuales_90d NUMERIC,
  ventas_anteriores_90d NUMERIC
) AS $$
WITH ventas_actuales AS (
  SELECT producto_id, SUM(cantidad) AS total
  FROM pedidos_detalles pd
  JOIN pedidos p ON p.id = pd.pedido_id
  WHERE p.created_at > CURRENT_DATE - INTERVAL '90 days'
  GROUP BY producto_id
),
ventas_anteriores AS (
  SELECT producto_id, SUM(cantidad) AS total
  FROM pedidos_detalles pd
  JOIN pedidos p ON p.id = pd.pedido_id
  WHERE p.created_at BETWEEN CURRENT_DATE - INTERVAL '180 days' 
    AND CURRENT_DATE - INTERVAL '90 days'
  GROUP BY producto_id
)
SELECT 
  va.producto_id,
  ROUND(((COALESCE(vac.total, 0) - va.total) / NULLIF(va.total, 0)) * 100, 2),
  COALESCE(vac.total, 0),
  va.total
FROM ventas_anteriores va
LEFT JOIN ventas_actuales vac ON vac.producto_id = va.producto_id
WHERE COALESCE(vac.total, 0) < va.total * 0.5;
$$ LANGUAGE sql;
```

**UI:** Badge lifecycle, reemplazado_por link, reporte mensual decadencia.

**Esfuerzo:** 1-2 semanas  
**Prioridad:** IMPORTANTE

### Brecha 5 — Ficha Técnica PDF

PDF profesional con:
- Foto principal + datos básicos
- Especificaciones técnicas + fiscal (SAT, IVA, IEPS)
- Contacto ALMASA + QR portal cliente
- Hash SHA-256 auto-verificable

**Uso:** Vendedor envía por WhatsApp, portal cliente descarga.

**Esfuerzo:** 1 semana  
**Prioridad:** NICE COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/22 generado |
| Julio | Brecha 1: Fotos producto (1 sem) |
| Julio | Brecha 3: Categorías jerárquicas (1 sem) |
| Agosto | Brecha 4: Lifecycle (1-2 sem) |
| Agosto | Brecha 5: Ficha técnica PDF (1 sem) |
| Septiembre | Brecha 2: Código de barras (1-2 sem) |

**Tiempo total:** 4 meses  
**Inversión:** $0 software

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Estructura categorías
- Validar árbol propuesto
- Qué categorías raíz tiene ALMASA?

### Decisión 2 — Política fotos
- Obligatorio que cada producto tenga foto?
- Quién las toma?

### Decisión 3 — Códigos de barras
- Migrar EANs existentes?
- O empezar con código interno ALMASA?

### Decisión 4 — Umbral decadencia
- 50% caída en 90 días es buen threshold?
- Considerar estacionalidad?

### Decisión 5 — Reemplazos automáticos
- Si producto descontinuado: sistema sugiere reemplazo?
- Cliente sigue pidiendo el viejo?

### Decisión 6 — Ficha técnica info confidencial
- Mostrar precio en PDF?
- Solo en versión cliente registrado?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #6 (Doble Unidad): precio_dual ya implementado
- Principio #4 (CPP real): precio_compra alimentado por compras
- Principio #10 (Users Before Perfection): MVP por brechas

### Conexiones cruzadas:
- /audit/08 Inventario: stock_actual, stock_minimo
- /audit/09 Compras: alimenta CPP
- /audit/13 Pedidos: precio_venta + descuento_maximo
- /audit/16 Cobranza: factura usa codigo_sat
- /audit/18 Clientes: cliente_productos_frecuentes
- /audit/19 Dashboard: lifecycle alimenta predicciones IA
- /audit/21 Fumigaciones: requiere_fumigacion flag

### Ventajas únicas:
1. Precio dual kilo/unidad (Principio #6)
2. Códigos SAT MX nativos
3. IEPS multi-tasa (6 tasas)
4. IA normalización (edge function)
5. Anti-duplicados Levenshtein

---

## 9. Recomendación final

ALMASA-OS Productos es módulo MUY MADURO con 5 ventajas únicas. 
Las 5 brechas son completamiento:

1. FOTOS — catálogo profesional
2. CÓDIGO DE BARRAS — preparar cycle counting
3. CATEGORÍAS JERÁRQUICAS — estructura natural
4. LIFECYCLE — manejo profesional ciclo de vida
5. FICHA TÉCNICA PDF — profesionalismo cliente

**Orden estricto:**
1. JULIO: Fotos + Categorías jerárquicas
2. AGOSTO: Lifecycle + Ficha técnica PDF
3. SEPTIEMBRE: Código de barras

Una vez completas, ALMASA-OS Productos será **superior a Oracle 
Product Master, SAP Material Master y NetSuite Items** para 
distribuidoras mexicanas, con costo $0 y 5 ventajas únicas.

---

*ALMASA-OS · Rediseño de Productos / Catálogo · v1.0*  
*Generado el 10 de mayo de 2026*  
*El catálogo es el corazón. Producto vendible.*
