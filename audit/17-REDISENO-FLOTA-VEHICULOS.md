# Rediseño de Flota / Vehículos — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de flota + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Cada camión es un negocio. Mídelo como tal.

---

## 1. La filosofía

ALMASA tiene 14 vehículos. Cada uno es un activo y un centro de 
costo. Cada uno consume combustible, requiere mantenimiento, paga 
seguro, recibe multas, deprecia. Si no medimos esto, no sabemos 
si un vehículo es rentable o si está perdiendo dinero.

Más importante: ALMASA-OS aspira a ser **producto comercial**. 
Quien compre un ERP exige saber el TCO (Total Cost of Ownership) 
de su flota. Sin esto, ALMASA-OS pierde frente a Oracle. Con esto, 
le gana porque suma diagrama visual de daños, IA extracción de 
documentos, capacidad dual local/foránea, y verificación CDMX 
modelada nativamente.

> Principio rector: "Medir cada vehículo como una mini-empresa: 
> ingresos atribuibles, costos directos, costos prorrateados, 
> rentabilidad. Sin TCO, hay flota; con TCO, hay decisión."

Este documento define:
- Cómo se modela cada vehículo (ya está bien)
- Cómo se rastrea combustible (con realidad mexicana)
- Cómo se manejan multas (responsabilidad variable)
- Cómo se calcula depreciación
- Cómo se construye TCO mensual por vehículo

---

## 2. Estado actual de flota

ALMASA-OS Flota es uno de los módulos MÁS COMPLETOS del sistema:

- 44 campos en tabla vehiculos
- 4 tablas de soporte (checkups, verificaciones, mantenimientos)
- VehiculosTab.tsx (1,460 líneas)
- DiagramaDanosVehiculo.tsx (875 líneas) - VISUAL ÚNICO
- VehiculoCheckupDialog.tsx (745 líneas) - 15+ items
- 4 edge functions de IA (extract-factura/placas/license)
- 2 storage buckets (vehiculos-documentos, checkups-danos-fotos)
- Cron check-vehicle-documents-expiry (alertas vencimientos)

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tabla vehículos (44 campos) | ✅ Completo | ID, tipo, capacidad, dimensiones, federal, docs, factura |
| Catálogo vehículos | ✅ UI | VehiculosTab (1,460 lín) |
| Asignación chofer fijo | ✅ | chofer_asignado_id FK empleados |
| Capacidad de carga dual | ✅ ÚNICO | peso_maximo_local_kg vs foraneo_kg |
| Checkup pre-ruta | ✅ Completo | 15+ items, firma conductor+supervisor, PDF |
| Diagrama de daños | ✅ ÚNICO | DiagramaDanosVehiculo (875 lín) + fotos |
| Historial de daños | ✅ | HistorialDanosVehiculo |
| Verificación CDMX | ✅ ÚNICO MX | Tabla vehiculos_verificaciones |
| Alertas vencimientos | ✅ Cron | check-vehicle-documents-expiry |
| Tarjeta circulación | ✅ | URL + vencimiento + tipo + IA extract |
| Póliza seguro | ✅ | URL + vencimiento |
| Mantenimiento por km | ✅ Tabla | vehiculos_mantenimientos |
| IA extracción documentos | ✅ ÚNICO | 3 edge functions (factura, placas, licencia) |
| Dimensiones vehículo | ✅ | alto, ancho, largo, ejes, llantas |
| Datos federales | ✅ MX | clase_federal, permiso_ruta |
| Factura del vehículo | ✅ | valor, fecha, vendedor, folio |
| Personal flotilla | ✅ | PersonalFlotillaTab + ConfiguracionFlotillaDialog |
| Kilometraje en rutas | ✅ | kilometraje_inicial/final en rutas |
| Combustible CorpoGas | ❌ NO existe | Spec #30 documentado, sin implementar |
| Multas tracking | ❌ NO existe | Sin tabla |
| Eficiencia km/litro | ❌ NO existe | Depende de combustible |
| Depreciación | ❌ NO existe | Sin cálculo |
| TCO por vehículo | ❌ NO existe | Sin consolidado mensual |
| Programación mantto alertas | 🟡 Parcial | Tiene km_proximo, sin alerta auto |

**Conclusión:** Base ENORME. 5 brechas estratégicas que cierran 
el círculo financiero.

**Hallazgo clave:** ALMASA-OS Flota tiene 5 ÚNICOS no replicables 
por Oracle/SAP. Las 5 brechas son completamiento, no rediseño.

---

## 3. Estándar Oracle / SAP / NetSuite

**Oracle Fleet Management:** Asset lifecycle, preventive maintenance 
scheduling, fuel management, driver assignment, compliance.

**SAP Fleet Management:** Vehicle master data, maintenance plans, 
cost center per vehicle, document management.

**NetSuite Fixed Assets:** Asset depreciation, maintenance history, 
cost tracking, disposal.

6 conceptos universales:
1. Asset Master Data
2. Maintenance Schedule (preventive + corrective)
3. Fuel Management
4. Compliance Tracking
5. Incident Management
6. Cost Tracking (TCO)

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Catálogo vehículos | ✅ | ✅ 44 campos | EMPATE |
| Asignación chofer | ✅ | ✅ | EMPATE |
| Capacidad dual | ❌ | ✅ ÚNICO | ALMASA |
| Checkup pre-ruta | ✅ | ✅ 15+ items + firmas | EMPATE |
| Diagrama daños visual | 🟡 | ✅ ÚNICO 875 lín | ALMASA |
| Verificación CDMX | ❌ | ✅ ÚNICO MX | ALMASA |
| Alertas vencimientos | ✅ | ✅ cron | EMPATE |
| Mantenimiento por km | ✅ | ✅ | EMPATE |
| IA extracción docs | 🟡 | ✅ ÚNICO 3 edge fns | ALMASA |
| Datos federales MX | ❌ | ✅ ÚNICO | ALMASA |
| Factura vehículo | ✅ | ✅ | EMPATE |
| Combustible tracking | ✅ | ❌ → planeado | ORACLE |
| Eficiencia km/litro | ✅ | ❌ → planeado | ORACLE |
| Multas | ✅ | ❌ → planeado | ORACLE |
| Depreciación | ✅ | ❌ → planeado | ORACLE |
| TCO consolidado | ✅ | ❌ → planeado | ORACLE |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador final (post-implementación):**
ALMASA gana: 6 dimensiones (incluyendo 5 ÚNICOS)
Oracle gana: 5 dimensiones
Empate: 6 dimensiones

ALMASA tendrá 5 ventajas únicas que Oracle/SAP NO modelan:
1. Diagrama VISUAL de daños con fotos
2. Capacidad dual local/foránea
3. IA extracción de documentos (factura/placas/licencia)
4. Verificación CDMX modelada formalmente
5. Datos federales mexicanos (clase_federal, permiso_ruta)

---

## 5. Las 5 Brechas Críticas

### Brecha 1 — Combustible / CorpoGas Híbrido (CRÍTICO)

**Realidad operativa de ALMASA:**

Sistema híbrido inteligente:
- IDEAL: tarjeta CorpoGas (acuerdo comercial)
- ALTERNATIVA 1: efectivo (cuando sistema CorpoGas falla)
- ALTERNATIVA 2: otra gasolinera (CorpoGas no disponible en zona)
- ALTERNATIVA 3: tarjeta empresa ALMASA

**Solución:**

```sql
CREATE TYPE forma_pago_combustible AS ENUM (
  'tarjeta_corpogas',
  'tarjeta_empresa',
  'efectivo',
  'vale'
);

CREATE TABLE cargas_combustible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id),
  chofer_id UUID NOT NULL,
  
  fecha_carga TIMESTAMPTZ NOT NULL,
  estacion TEXT NOT NULL,
  es_corpogas BOOLEAN DEFAULT false,
  justificacion_no_corpogas TEXT,
  
  litros NUMERIC NOT NULL,
  precio_litro NUMERIC NOT NULL,
  monto_total NUMERIC GENERATED ALWAYS AS 
    (litros * precio_litro) STORED,
  
  kilometraje_carga INTEGER NOT NULL,
  kilometraje_carga_anterior INTEGER,
  km_recorridos INTEGER GENERATED ALWAYS AS 
    (kilometraje_carga - kilometraje_carga_anterior) STORED,
  
  litros_carga_anterior NUMERIC,
  eficiencia_km_litro NUMERIC GENERATED ALWAYS AS 
    (CASE 
      WHEN litros_carga_anterior > 0 
      THEN (kilometraje_carga - kilometraje_carga_anterior)::NUMERIC / 
           litros_carga_anterior
      ELSE NULL
    END) STORED,
  
  forma_pago forma_pago_combustible NOT NULL,
  
  ticket_url TEXT,
  ticket_hash_sha256 TEXT,
  
  requiere_aprobacion BOOLEAN GENERATED ALWAYS AS (
    forma_pago IN ('efectivo') OR es_corpogas = false
  ) STORED,
  aprobado BOOLEAN DEFAULT false,
  aprobado_por UUID,
  aprobado_en TIMESTAMPTZ,
  
  registrado_por UUID NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Reglas inteligentes:**
- Carga en efectivo > $1,500 → aprobación admin
- Carga fuera de CorpoGas → justificación obligatoria
- Eficiencia bajó > 15% vs histórico → alerta investigar
- Carga repetida fuera de CorpoGas → alerta patrón

**Esfuerzo:** 2-3 semanas  
**Prioridad:** CRÍTICA (alimenta utilidad real)

### Brecha 2 — Multas con Responsabilidad Variable

**Realidad de ALMASA:**

ALMASA paga la multa al inicio (la placa es de la empresa).
Pero la responsabilidad varía:
- Velocidad / mal manejo → chofer paga
- Estacionamiento durante entrega → ALMASA paga
- Sin verificación CDMX → ALMASA (era su deber)
- Falta de documentos → depende del caso

**Solución:**

```sql
CREATE TYPE responsable_multa AS ENUM (
  'almasa',
  'chofer',
  'cliente',
  'pendiente_decidir'
);

CREATE TABLE multas_vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id),
  chofer_id UUID,
  
  fecha_multa DATE NOT NULL,
  folio TEXT UNIQUE NOT NULL,
  motivo TEXT NOT NULL,
  ubicacion TEXT,
  ruta_id UUID REFERENCES rutas(id),
  
  monto NUMERIC NOT NULL,
  monto_descuento_pronto_pago NUMERIC,
  monto_pagado NUMERIC,
  
  fecha_vencimiento_pago DATE,
  pagada BOOLEAN DEFAULT false,
  fecha_pago DATE,
  
  documento_url TEXT,
  documento_hash TEXT,
  
  pagada_inicialmente_por TEXT DEFAULT 'almasa',
  
  responsabilidad responsable_multa DEFAULT 'pendiente_decidir',
  decidido_por UUID,
  decidido_en TIMESTAMPTZ,
  justificacion_decision TEXT,
  
  descontado_a_chofer BOOLEAN DEFAULT false,
  descontado_en_periodo DATE,
  
  notas TEXT,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE

### Brecha 3 — Eficiencia km/litro (Depende de Brecha 1)

Ya implícito en tabla cargas_combustible (campo `eficiencia_km_litro` GENERATED).

**Dashboard por vehículo:**
- Eficiencia promedio últimos 6 meses
- Tendencia (mejora/empeora con gráfica)
- Comparativa entre vehículos similares
- Alertas de anomalías

**Esfuerzo:** 1 semana (después de Brecha 1)  
**Prioridad:** ALTA

### Brecha 4 — Depreciación por Vehículo

**Solución:**

```sql
ALTER TABLE vehiculos ADD COLUMN valor_inicial NUMERIC;
ALTER TABLE vehiculos ADD COLUMN vida_util_anos INTEGER DEFAULT 10;
ALTER TABLE vehiculos ADD COLUMN valor_residual_pct NUMERIC DEFAULT 10;
ALTER TABLE vehiculos ADD COLUMN metodo_depreciacion TEXT 
  CHECK (metodo_depreciacion IN (
    'linea_recta', 'saldo_decreciente'
  )) DEFAULT 'linea_recta';

CREATE TABLE depreciacion_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id),
  mes DATE NOT NULL,
  valor_libros_inicio NUMERIC NOT NULL,
  depreciacion_mes NUMERIC NOT NULL,
  valor_libros_fin NUMERIC GENERATED ALWAYS AS 
    (valor_libros_inicio - depreciacion_mes) STORED,
  metodo_aplicado TEXT,
  generado_por UUID,
  generado_en TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(vehiculo_id, mes)
);
```

**Ejemplo:**
- Camión nuevo $800,000
- Vida útil: 10 años, valor residual: 10%
- Depreciación mensual: $6,000

**Cron mensual:** primer día del mes calcula del mes anterior.

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE

### Brecha 5 — Dashboard TCO por Vehículo (CRÍTICO COMERCIAL)

**Solución:**

```sql
CREATE VIEW vw_costo_total_vehiculo_mes AS
SELECT 
  v.id, v.nombre, v.placa, v.tipo,
  date_trunc('month', current_date) AS mes,
  
  COALESCE((
    SELECT SUM(monto_total) FROM cargas_combustible 
    WHERE vehiculo_id = v.id 
      AND date_trunc('month', fecha_carga) = date_trunc('month', current_date)
  ), 0) AS combustible,
  
  COALESCE((
    SELECT SUM(costo) FROM vehiculos_mantenimientos 
    WHERE vehiculo_id = v.id 
      AND date_trunc('month', fecha_mantenimiento) = date_trunc('month', current_date)
  ), 0) AS mantenimientos,
  
  COALESCE(v.poliza_seguro_costo_anual / 12, 0) AS seguro_prorrateado,
  COALESCE(v.verificacion_costo_semestral / 6, 0) AS verificacion_prorrateada,
  
  COALESCE((
    SELECT SUM(monto) FROM multas_vehiculos 
    WHERE vehiculo_id = v.id 
      AND date_trunc('month', fecha_multa) = date_trunc('month', current_date)
      AND responsabilidad = 'almasa'
  ), 0) AS multas,
  
  COALESCE((
    SELECT depreciacion_mes FROM depreciacion_mensual 
    WHERE vehiculo_id = v.id 
      AND mes = date_trunc('month', current_date)
  ), 0) AS depreciacion
  
FROM vehiculos v
WHERE v.activo = true;

CREATE VIEW vw_eficiencia_vehiculo AS
SELECT 
  *,
  (combustible + mantenimientos + seguro_prorrateado + 
   verificacion_prorrateada + multas + depreciacion) AS costo_total_mes,
  (SELECT SUM(kilometros_recorridos) FROM rutas 
   WHERE vehiculo_id = id 
     AND date_trunc('month', fecha_ruta) = date_trunc('month', current_date)
  ) AS km_recorridos_mes,
  (SELECT COUNT(*) FROM entregas e 
   JOIN rutas r ON r.id = e.ruta_id 
   WHERE r.vehiculo_id = id 
     AND e.entregado = true
     AND date_trunc('month', e.fecha_entrega) = date_trunc('month', current_date)
  ) AS entregas_completadas_mes
FROM vw_costo_total_vehiculo_mes;
```

**Dashboard ejecutivo:**

```
TCO FLOTA - MAYO 2026

VEHÍCULOS ACTIVOS: 14
TCO TOTAL FLOTA: $XXX,XXX

TOP 3 MÁS EFICIENTES (por costo/entrega):
1. Camión "Tito" - $45/entrega
2. Camión "Capitán" - $52/entrega
3. Camión "Águila" - $58/entrega

TOP 3 MENOS EFICIENTES:
12. Camión "Veterano" - $180/entrega
13. Camión "Vagón" - $220/entrega
14. Camión "Reliquia" - $280/entrega
   → Considerar reemplazo o reasignación
```

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTO VALOR ESTRATÉGICO + COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/17 generado |
| Julio | Brecha 1: Combustible/CorpoGas (3 sem) |
| Agosto | Brecha 4: Depreciación (1 sem) |
| Agosto | Brecha 2: Multas (1 sem) |
| Septiembre | Brecha 3: Eficiencia (1 sem) |
| Octubre | Brecha 5: Dashboard TCO (2 sem) |

**Tiempo total:** 4-5 meses  
**Inversión:** $0 software + capacitación choferes en app combustible

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Política CorpoGas
- Carga en efectivo: límite máximo sin aprobación?
- Carga fuera CorpoGas: qué justificaciones aceptables?

### Decisión 2 — Multas chofer
- Si chofer paga: descuento próxima nómina o cuota mensual?
- Hay tope (no más de X% del sueldo)?
- Apelación interna?

### Decisión 3 — Depreciación método
- Línea recta (más simple) o saldo decreciente (más fiscal)?
- Validar con contadora

### Decisión 4 — Vida útil estándar
- Camiones grandes: 10 o 12 años?
- Camionetas: 8 o 10 años?
- Considerar uso intensivo

### Decisión 5 — Valor residual
- 10% estándar?
- Por tipo de vehículo?

### Decisión 6 — Costo seguro y verificación
- Cargar costo anual en vehiculos
- Sistema prorratea automático

### Decisión 7 — Dashboard accesible a quién
- Solo admin?
- Gerente almacén también?
- Choferes ven solo su vehículo?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #4 (CPP real con gastos asociados): TCO = costo total
- Principio #5 (Utilidad en tres niveles): rentabilidad por activo

### Conexiones cruzadas:
- /audit/14-RUTAS: combustible + depreciación alimentan costos ruta
- /audit/15-RH: multas a chofer en export contadora
- /audit/12-EVIDENCIA: tickets combustible con hash, fotos daños

### Visión comercial:
ALMASA-OS aspira a producto vendible. Dashboard TCO es de los 
features que MÁS impresionan a compradores potenciales. Combinado 
con ventajas únicas (diagrama daños visual, IA documentos, 
capacidad dual, verificación CDMX) crea propuesta imbatible para 
distribuidoras mexicanas.

---

## 9. Recomendación final

ALMASA-OS Flota es uno de los módulos más impresionantes del 
sistema, con 5 ventajas únicas no replicables por Oracle/SAP:
1. Diagrama VISUAL de daños con fotos (875 líneas de código)
2. Capacidad dual local/foránea
3. IA extracción de documentos (3 edge functions)
4. Verificación CDMX modelada formalmente
5. Datos federales mexicanos nativos

Las 5 brechas cierran el círculo financiero:
1. COMBUSTIBLE — base de eficiencia y costos
2. MULTAS — tracking con responsabilidad variable
3. EFICIENCIA — métricas calculadas
4. DEPRECIACIÓN — cálculo fiscal y operativo
5. DASHBOARD TCO — ventaja comercial decisiva

**Orden estricto:**
1. JULIO 2026: Combustible (3 semanas - base)
2. AGOSTO 2026: Depreciación + Multas
3. SEPTIEMBRE 2026: Eficiencia (post-combustible)
4. OCTUBRE 2026: Dashboard TCO (cierre comercial)

Una vez completas las 5 brechas, ALMASA-OS Flota será **superior 
a Oracle Fleet Management para distribuidoras mexicanas**, con 
costo $0, ventajas únicas, y dashboard TCO que convierte cada 
vehículo en un negocio medible. Producto vendible.

---

*ALMASA-OS · Rediseño de Flota / Vehículos · v1.0*  
*Generado el 10 de mayo de 2026*  
*Cada camión es un negocio. Mídelo como tal.*
