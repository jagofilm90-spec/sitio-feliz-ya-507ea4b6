# Rediseño de Fumigaciones — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de fumigaciones + decisiones operativas + cumplimiento COFEPRIS  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Sin plagas, sin pérdidas, sin sanciones. Compliance mexicano nativo.

---

## 1. La filosofía

Fumigación NO es opcional para una distribuidora de abarrotes. 
Es la diferencia entre:
- Inventario sano vs producto contaminado
- Cumplimiento COFEPRIS vs sanciones legales
- Operación continua vs cierre temporal por plaga

> Principio rector: "Cada fumigación debe quedar registrada con 
> evidencia. Cada certificado debe poder presentarse a autoridad. 
> Cada producto químico debe tener trazabilidad. Compliance 
> mexicano nativo."

---

## 2. Estado actual de fumigaciones

ALMASA-OS Fumigaciones es BÁSICO. Solo flag y fecha.

**Estructura actual:**

Campos en productos:
- requiere_fumigacion (boolean)
- fecha_ultima_fumigacion (date) — SE SOBREESCRIBE

Campos en inventario_lotes:
- fecha_ultima_fumigacion (date)
- requiere_fumigacion (boolean)

**Componentes (3 archivos, 922 líneas):**

| Componente | Líneas | Función |
|-----------|--------|---------|
| Fumigaciones.tsx | 357 | Página principal admin |
| AlmacenFumigacionesTab | 422 | Tab en almacén tablet |
| FumigacionCardMobile | 143 | Card mobile |

**Problema CRÍTICO:**
Cada actualización SOBREESCRIBE la fecha anterior.
= HISTORIAL SE PIERDE = SIN AUDITORÍA POSIBLE

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Flag por producto | ✅ | requiere_fumigacion |
| Fecha última | 🔴 | Se sobreescribe |
| Próxima calculada | 🟡 | Hardcoded 6 meses |
| 4 estados visuales | ✅ | UI funcional |
| Alerta dashboard | ✅ | KPI fumigacionesVencidas |
| Vista admin | ✅ | Fumigaciones.tsx |
| Vista almacén | ✅ | AlmacenFumigacionesTab |
| Tabla historial | ❌ NO existe | Crítico |
| Frecuencia configurable | ❌ Hardcoded | 6 meses fijo |
| Empresas fumigadoras | ❌ NO existe | — |
| Productos químicos | ❌ NO existe | — |
| Certificados COFEPRIS | ❌ NO existe | — |
| Bitácora oficial | ❌ NO existe | — |
| Costos | ❌ NO existe | — |

**Conclusión:** Base mínima funcional. Falta infraestructura para cumplimiento y auditoría.

---

## 3. Estándar Oracle / SAP / NetSuite

Oracle, SAP y NetSuite NO tienen módulos específicos de fumigaciones para abarrotes mexicanos.

**Conclusión:** ALMASA-OS gana por DEFAULT. No hay competencia para PYMEs distribuidoras mexicanas con módulo integrado.

---

## 4. Por qué ALMASA-OS APLASTA aquí

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Módulo dedicado fumigaciones | ❌ | ✅ → diseñado | ALMASA |
| Compliance COFEPRIS nativo | ❌ | ✅ → ÚNICO | ALMASA |
| 3 modalidades (productos/bodegas/camiones) | ❌ | ✅ → ÚNICO | ALMASA |
| Mixta interna + externa | ❌ | ✅ → ÚNICO | ALMASA |
| Histórico auditable | ❌ | ✅ → diseñado | ALMASA |
| Frecuencia configurable | ❌ | ✅ → diseñado | ALMASA |
| Bitácora oficial PDF | ❌ | ✅ → ÚNICO | ALMASA |
| FUMIPHOS / químicos MX | ❌ | ✅ → ÚNICO | ALMASA |
| Certificados con hash | ❌ | ✅ → ÚNICO | ALMASA |
| Empresas fumigadoras MX | ❌ | ✅ → ÚNICO | ALMASA |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador:** ALMASA gana 11 dimensiones. Oracle gana 0.

---

## 5. Las 5 Brechas (Módulo Completo)

### Brecha 1 — Tabla Historial (CRÍTICO)

```sql
CREATE TYPE tipo_fumigacion AS ENUM (
  'producto_lote',
  'bodega_completa',
  'camion',
  'area_general'
);

CREATE TYPE modalidad_fumigacion AS ENUM (
  'interna',
  'externa'
);

CREATE TABLE fumigaciones_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_fumigacion NOT NULL,
  modalidad modalidad_fumigacion NOT NULL,
  
  producto_id UUID REFERENCES productos(id),
  inventario_lote_id UUID REFERENCES inventario_lotes(id),
  bodega_codigo TEXT,
  vehiculo_id UUID REFERENCES vehiculos(id),
  area_descripcion TEXT,
  
  fecha_fumigacion DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  
  quimico_usado TEXT NOT NULL,
  cantidad_aplicada NUMERIC,
  unidad_cantidad TEXT,
  num_pastillas INTEGER,
  
  aplicado_por_interno UUID REFERENCES empleados(id),
  
  empresa_fumigadora_id UUID REFERENCES empresas_fumigadoras(id),
  numero_certificado TEXT,
  costo NUMERIC,
  
  certificado_url TEXT,
  certificado_hash_sha256 TEXT,
  fotos_evidencia_urls TEXT[],
  
  proxima_fecha_programada DATE,
  
  evaluacion_dias_despues INTEGER,
  evaluacion_resultado TEXT CHECK (evaluacion_resultado IN (
    'efectiva', 'parcial', 'requiere_reaplicacion', NULL
  )),
  
  registrado_por UUID NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CHECK (
    (tipo = 'producto_lote' AND (producto_id IS NOT NULL OR inventario_lote_id IS NOT NULL)) OR
    (tipo = 'bodega_completa' AND bodega_codigo IS NOT NULL) OR
    (tipo = 'camion' AND vehiculo_id IS NOT NULL) OR
    (tipo = 'area_general' AND area_descripcion IS NOT NULL)
  )
);

CREATE INDEX idx_fumigaciones_producto ON fumigaciones_historial(producto_id);
CREATE INDEX idx_fumigaciones_bodega ON fumigaciones_historial(bodega_codigo);
CREATE INDEX idx_fumigaciones_vehiculo ON fumigaciones_historial(vehiculo_id);
CREATE INDEX idx_fumigaciones_fecha ON fumigaciones_historial(fecha_fumigacion DESC);

CREATE OR REPLACE FUNCTION sync_fecha_ultima_fumigacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'producto_lote' AND NEW.producto_id IS NOT NULL THEN
    UPDATE productos 
    SET fecha_ultima_fumigacion = NEW.fecha_fumigacion
    WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_fumigacion
AFTER INSERT ON fumigaciones_historial
FOR EACH ROW EXECUTE FUNCTION sync_fecha_ultima_fumigacion();
```

**Esfuerzo:** 1-2 semanas  
**Prioridad:** CRÍTICA

### Brecha 2 — Frecuencia Configurable

```sql
ALTER TABLE productos 
  ADD COLUMN frecuencia_fumigacion_meses INTEGER DEFAULT 6;

CREATE TABLE bodegas_config_fumigacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bodega_codigo TEXT UNIQUE NOT NULL,
  nombre_bodega TEXT,
  frecuencia_meses INTEGER DEFAULT 6,
  empresa_fumigadora_default_id UUID REFERENCES empresas_fumigadoras(id),
  ultima_fumigacion DATE,
  proxima_fumigacion DATE,
  notas TEXT
);

ALTER TABLE vehiculos 
  ADD COLUMN requiere_fumigacion BOOLEAN DEFAULT false,
  ADD COLUMN frecuencia_fumigacion_meses INTEGER DEFAULT 12;

CREATE VIEW vw_fumigaciones_proximas AS
SELECT 
  'producto'::TEXT AS tipo,
  p.id AS referencia_id,
  p.nombre AS descripcion,
  fh.fecha_fumigacion AS ultima_fumigacion,
  (fh.fecha_fumigacion + (p.frecuencia_fumigacion_meses || ' months')::INTERVAL) AS proxima_fumigacion,
  EXTRACT(DAYS FROM (
    (fh.fecha_fumigacion + (p.frecuencia_fumigacion_meses || ' months')::INTERVAL) - CURRENT_DATE
  )) AS dias_restantes,
  p.frecuencia_fumigacion_meses AS frecuencia
FROM productos p
LEFT JOIN LATERAL (
  SELECT fecha_fumigacion FROM fumigaciones_historial
  WHERE producto_id = p.id
  ORDER BY fecha_fumigacion DESC LIMIT 1
) fh ON true
WHERE p.requiere_fumigacion = true

UNION ALL

SELECT 
  'bodega'::TEXT, b.id, 'Bodega ' || b.bodega_codigo,
  b.ultima_fumigacion, b.proxima_fumigacion,
  EXTRACT(DAYS FROM (b.proxima_fumigacion - CURRENT_DATE)),
  b.frecuencia_meses
FROM bodegas_config_fumigacion b

UNION ALL

SELECT 
  'camion'::TEXT, v.id, 'Camion ' || v.nombre || ' (' || v.placa || ')',
  fh.fecha_fumigacion,
  (fh.fecha_fumigacion + (v.frecuencia_fumigacion_meses || ' months')::INTERVAL),
  EXTRACT(DAYS FROM (
    (fh.fecha_fumigacion + (v.frecuencia_fumigacion_meses || ' months')::INTERVAL) - CURRENT_DATE
  )),
  v.frecuencia_fumigacion_meses
FROM vehiculos v
LEFT JOIN LATERAL (
  SELECT fecha_fumigacion FROM fumigaciones_historial
  WHERE vehiculo_id = v.id
  ORDER BY fecha_fumigacion DESC LIMIT 1
) fh ON true
WHERE v.requiere_fumigacion = true
ORDER BY dias_restantes ASC NULLS LAST;
```

**Esfuerzo:** 3-4 días  
**Prioridad:** IMPORTANTE

### Brecha 3 — Empresas Fumigadoras + Productos Químicos

```sql
CREATE TABLE empresas_fumigadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rfc TEXT,
  contacto_principal TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  licencia_cofepris TEXT,
  vigencia_licencia DATE,
  licencia_vigente BOOLEAN GENERATED ALWAYS AS 
    (vigencia_licencia >= CURRENT_DATE) STORED,
  fumiga_productos BOOLEAN DEFAULT false,
  fumiga_bodegas BOOLEAN DEFAULT false,
  fumiga_camiones BOOLEAN DEFAULT false,
  productos_quimicos_usa TEXT[],
  num_servicios INTEGER DEFAULT 0,
  costo_promedio NUMERIC,
  ultima_calificacion INTEGER CHECK (ultima_calificacion BETWEEN 1 AND 5),
  activa BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE productos_quimicos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_comercial TEXT NOT NULL,
  ingrediente_activo TEXT,
  registro_cofepris TEXT,
  para_productos BOOLEAN DEFAULT false,
  para_bodegas BOOLEAN DEFAULT false,
  para_camiones BOOLEAN DEFAULT false,
  ficha_tecnica_url TEXT,
  hoja_seguridad_url TEXT,
  vencimiento_lote DATE,
  stock_actual NUMERIC,
  unidad_stock TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true
);

INSERT INTO productos_quimicos_catalogo 
  (nombre_comercial, ingrediente_activo, para_productos)
VALUES 
  ('FUMIPHOS 570', 'Fosfuro de Aluminio', true);
```

**Esfuerzo:** 4-5 días  
**Prioridad:** IMPORTANTE

### Brecha 4 — Certificados y Evidencia con Hash

Storage buckets:
- `fumigaciones-certificados` — PDF certificados con SHA-256
- `fumigaciones-evidencia-fotos` — fotos antes/durante/después

**Política:**
- Externa: certificado OBLIGATORIO
- Interna: foto evidencia OBLIGATORIA
- Bodega: foto antes + después

**Esfuerzo:** 3-5 días  
**Prioridad:** IMPORTANTE LEGAL

### Brecha 5 — Bitácora Oficial Exportable + Costos

PDF profesional para COFEPRIS con:
- Logo ALMASA + datos fiscales
- Periodo del reporte
- Tabla de fumigaciones (fecha, tipo, modalidad, químico, cantidad, empresa, certificado, costo)
- Firmas: Director General + Responsable
- Hash del PDF (auto-verificable)

Dashboard costos:
- Costo total mes
- Costo por modalidad (interna vs externa)
- Costo por bodega
- Tendencia histórica
- Alimenta utilidad N3 (/audit/19)

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE LEGAL + DASHBOARD

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/21 generado |
| Julio | Brecha 1: Tabla historial (1-2 sem) |
| Agosto | Brecha 2: Frecuencia configurable (3-4 días) |
| Agosto | Brecha 3: Empresas + químicos (4-5 días) |
| Septiembre | Brecha 4: Certificados con hash (3-5 días) |
| Septiembre | Brecha 5: Bitácora PDF + costos (1 sem) |

**Tiempo total:** 3-4 meses  
**Inversión:** $0 software

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Lista FUMIPHOS / químicos
- Solo FUMIPHOS 570?
- Otros productos químicos?
- Stock interno o compra cada vez?

### Decisión 2 — Empresas fumigadoras actuales
- Cuál usas para bodegas?
- Cuál para camiones?
- Mismo proveedor o varios?

### Decisión 3 — Bodegas que se fumigan
- B1 y B2 (propias) - SÍ?
- 3 bodegas terceros - también?

### Decisión 4 — Camiones que se fumigan
- Todos los 14?
- Solo los de granel?
- Frecuencia?

### Decisión 5 — Frecuencia por producto
- Granos: cada 3 meses?
- Harinas: cada 6 meses?
- Productos enlatados: cada 12?

### Decisión 6 — Quién aplica fumigaciones internas
- Solo Josan?
- Otros empleados autorizados?
- Capacitación requerida?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #4 (CPP real con gastos asociados): costos fumigación

### Conexiones cruzadas:
- /audit/08 Inventario: lotes con fumigación tracking
- /audit/12 Evidencia: hashes en certificados
- /audit/17 Flota: vehículos con fumigación
- /audit/19 Dashboard: alertas vencimientos + costo
- /audit/20 Tesorería: gastos fumigación en gastos operativos

### Datos Biblia v1:
- Bodegas: B1, B2 (propias) + 3 terceros
- FUMIPHOS 570: usado para productos
- Productos: Josan compra y aplica personalmente (interna)
- Camiones: externa con certificado

### Ventaja única:
Módulo específico fumigaciones MX. Oracle/SAP NO tienen equivalente. Diferenciador comercial absoluto para PYMEs distribuidoras mexicanas.

---

## 9. Recomendación final

ALMASA-OS Fumigaciones es base mínima con problema crítico (historial se sobreescribe). Las 5 brechas crean módulo completo:

1. TABLA HISTORIAL — auditable, no se sobreescribe
2. FRECUENCIA CONFIGURABLE — por producto, bodega, vehículo
3. EMPRESAS + QUÍMICOS — catálogo completo MX
4. CERTIFICADOS CON HASH — compliance legal
5. BITÁCORA + COSTOS — auditoría + dashboard

**Orden estricto:**
1. JULIO: Tabla historial (CORE)
2. AGOSTO: Frecuencia + Empresas + Químicos
3. SEPTIEMBRE: Certificados + Bitácora

Una vez completas las 5 brechas, ALMASA-OS Fumigaciones será 
**el ÚNICO ERP del mundo con módulo de fumigaciones nativo 
para abarrotes mexicanos**, con costo $0 y compliance COFEPRIS 
modelado nativamente.

---

*ALMASA-OS · Rediseño de Fumigaciones · v1.0*  
*Generado el 10 de mayo de 2026*  
*Sin plagas, sin pérdidas, sin sanciones. Compliance MX nativo.*
