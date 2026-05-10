# Seguros y Riesgos — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Brecha /audit/17 + SAP FI-AA Insurance Values + Oracle Risk Management  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** SAP FI-AA Insurance Tracking para PYMEs. Pólizas integradas con activos.

---

## 1. La filosofía

ALMASA tiene activos asegurados que NO son solo vehículos: mercancía, inmuebles, RC, vida grupal, equipo electrónico. /audit/17 cubre solo seguros vehiculares.

> Principio rector: "Cada activo crítico tiene su póliza. Cada vencimiento alerta automática. Cada siniestro rastreado hasta el cobro."

---

## 2. Estado actual

Brecha 80%. Solo vehículos parcial. Resto sin tracking.

---

## 3. Diseño ALMASA-OS

### 3.1 Aseguradoras

```sql
CREATE TABLE aseguradoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rfc TEXT,
  agente_seguros_nombre TEXT,
  agente_email TEXT,
  agente_telefono TEXT,
  agente_whatsapp TEXT,
  telefono_emergencia_24h TEXT,
  telefono_atencion TEXT,
  url_portal_cliente TEXT,
  total_polizas_vigentes INTEGER DEFAULT 0,
  total_siniestros_reportados INTEGER DEFAULT 0,
  total_siniestros_pagados INTEGER DEFAULT 0,
  porcentaje_cobro NUMERIC,
  tiempo_promedio_pago_dias NUMERIC,
  rating_almasa NUMERIC,
  activa BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Pólizas (14 tipos)

```sql
CREATE TYPE tipo_poliza AS ENUM (
  'auto_individual', 'auto_flotilla', 'inmueble', 'contenido_inmueble',
  'mercancia_bodega', 'mercancia_transito', 'equipo_electronico',
  'rc_general', 'rc_operacional', 'rc_patronal',
  'vida_grupal', 'gastos_medicos_mayores', 'fianza', 'otro'
);

CREATE TABLE polizas_seguros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_poliza TEXT UNIQUE NOT NULL,
  numero_certificado TEXT,
  tipo tipo_poliza NOT NULL,
  aseguradora_id UUID NOT NULL REFERENCES aseguradoras(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT CHECK (estado IN (
    'cotizando', 'vigente', 'por_vencer_60d', 'por_vencer_30d',
    'por_vencer_15d', 'vencida', 'cancelada', 'renovada'
  )) DEFAULT 'vigente',
  suma_asegurada NUMERIC NOT NULL,
  valor_actual_estimado NUMERIC,
  deducible NUMERIC,
  deducible_tipo TEXT CHECK (deducible_tipo IN (
    'fijo', 'porcentaje_suma_asegurada', 'porcentaje_perdida'
  )),
  indice_revaluacion NUMERIC DEFAULT 1.0,
  prima_total NUMERIC NOT NULL,
  prima_neta NUMERIC,
  iva NUMERIC,
  forma_pago TEXT CHECK (forma_pago IN (
    'contado', 'mensual', 'trimestral', 'semestral', 'anual'
  )),
  caratula_pdf_url TEXT,
  contrato_completo_pdf_url TEXT,
  hash_sha256 TEXT,
  renovacion_automatica BOOLEAN DEFAULT false,
  poliza_anterior_id UUID REFERENCES polizas_seguros(id),
  alertas_enviadas JSONB,
  cobertura_resumen TEXT,
  exclusiones TEXT,
  capturada_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Vinculación Póliza ↔ Activos (SAP FI-AA)

```sql
CREATE TABLE poliza_activos_cubiertos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas_seguros(id),
  tipo_activo TEXT CHECK (tipo_activo IN (
    'vehiculo', 'bodega', 'inventario_global', 'inventario_especifico',
    'equipo_electronico', 'empleado', 'flota_completa', 'operacion_general'
  )),
  activo_id UUID,
  activo_descripcion TEXT,
  activo_serie_o_placa TEXT,
  suma_asegurada_individual NUMERIC,
  coberturas_incluidas TEXT[],
  vigente_desde DATE,
  vigente_hasta DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Pagos de Primas

```sql
CREATE TABLE pagos_primas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas_seguros(id),
  fecha_pago DATE NOT NULL,
  monto NUMERIC NOT NULL,
  numero_recibo TEXT,
  cfdi_uuid TEXT,
  comprobante_pago_url TEXT,
  periodo_inicio DATE,
  periodo_fin DATE,
  metodo_pago TEXT,
  cuenta_bancaria_origen_id UUID,
  registrado_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.5 Siniestros (Oracle Risk Management)

```sql
CREATE TYPE estado_siniestro AS ENUM (
  'reportado', 'en_proceso', 'investigando', 'documentacion_pendiente',
  'aprobado', 'pago_pendiente', 'pagado', 'rechazado', 'cerrado'
);

CREATE TABLE siniestros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_siniestro TEXT UNIQUE,
  numero_reclamo_aseguradora TEXT,
  poliza_id UUID NOT NULL REFERENCES polizas_seguros(id),
  activo_id UUID,
  activo_tipo TEXT,
  activo_descripcion TEXT,
  fecha_ocurrencia DATE NOT NULL,
  hora_ocurrencia TIME,
  lugar TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  tipo_siniestro TEXT,
  descripcion_hechos TEXT NOT NULL,
  reportado_por UUID,
  fecha_reporte TIMESTAMPTZ DEFAULT now(),
  fotos_urls TEXT[],
  fotos_hashes TEXT[],
  parte_policial_url TEXT,
  parte_aseguradora_url TEXT,
  facturas_reparacion_urls TEXT[],
  presupuesto_reparacion_url TEXT,
  monto_reclamado NUMERIC,
  monto_aprobado NUMERIC,
  monto_pagado NUMERIC,
  deducible_aplicado NUMERIC,
  estado estado_siniestro DEFAULT 'reportado',
  fecha_aprobacion DATE,
  fecha_pago DATE,
  motivo_rechazo TEXT,
  apelacion_iniciada BOOLEAN DEFAULT false,
  dias_resolucion INTEGER GENERATED ALWAYS AS 
    (CASE WHEN fecha_pago IS NOT NULL THEN fecha_pago - fecha_reporte::DATE ELSE NULL END) STORED,
  notas_internas TEXT,
  ajustador_aseguradora TEXT,
  ajustador_telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.6 Alertas Automáticas

```sql
CREATE OR REPLACE FUNCTION actualizar_estados_polizas()
RETURNS void AS $$
BEGIN
  UPDATE polizas_seguros SET estado = 'vencida'
  WHERE fecha_fin < CURRENT_DATE AND estado NOT IN ('vencida', 'cancelada', 'renovada');
  
  UPDATE polizas_seguros SET estado = 'por_vencer_15d'
  WHERE fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days' AND estado = 'vigente';
  
  UPDATE polizas_seguros SET estado = 'por_vencer_30d'
  WHERE fecha_fin BETWEEN CURRENT_DATE + INTERVAL '15 days' AND CURRENT_DATE + INTERVAL '30 days' AND estado = 'vigente';
  
  UPDATE polizas_seguros SET estado = 'por_vencer_60d'
  WHERE fecha_fin BETWEEN CURRENT_DATE + INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '60 days' AND estado = 'vigente';
END;
$$ LANGUAGE plpgsql;
```

### 3.7 Coverage Gap Analysis

```sql
CREATE VIEW vw_coverage_gap_analysis AS
SELECT 'vehiculo_sin_poliza' AS tipo, v.id AS activo_id, v.placa AS descripcion,
  'CRÍTICO: vehículo sin seguro vigente' AS riesgo
FROM vehiculos v
LEFT JOIN poliza_activos_cubiertos pac ON pac.activo_id = v.id AND pac.tipo_activo IN ('vehiculo', 'flota_completa')
LEFT JOIN polizas_seguros p ON p.id = pac.poliza_id AND p.estado = 'vigente'
WHERE v.activo = true AND p.id IS NULL

UNION ALL

SELECT 'sin_rc_general', NULL::UUID, 'Operación general',
  'ALTO: sin RC general operacional'
WHERE NOT EXISTS (
  SELECT 1 FROM polizas_seguros WHERE tipo IN ('rc_general', 'rc_operacional') AND estado = 'vigente'
);
```

---

## 4. Por qué ALMASA-OS gana

| Capacidad | SAP FI-AA | Oracle Risk | ALMASA-OS |
|-----------|-----------|-------------|-----------|
| Pólizas múltiples tipos | ✅ | ✅ | ✅ |
| Vinculación activos | ✅ | ✅ | ✅ |
| Vencimiento auto | ✅ | ✅ | ✅ |
| Siniestros workflow | 🟡 | ✅ | ✅ |
| Coverage gap analysis | 🟡 | ✅ | ✅ |
| Performance aseguradoras | ❌ | 🟡 | ✅ ÚNICO |
| Aseguradoras MX nativas | ❌ | ❌ | ✅ ÚNICO |
| Auto-llamar 24h | ❌ | ❌ | ✅ ÚNICO |
| Costo | $$$$$ | $$$$ | $0 |

3 ÚNICOS: performance aseguradoras, MX nativas, auto-llamar 24h.

---

## 5. Roadmap

| Mes | Entrega |
|-----|---------|
| Junio | Aseguradoras + pólizas + activos cubiertos |
| Julio | Pagos primas + alertas vencimiento cron |
| Agosto | Siniestros workflow + UI dashboard |
| Septiembre | Coverage gap analysis + performance |
| Octubre | Auto-llamar emergencia 24h |

**Tiempo:** 5 meses. **Inversión:** $0.

---

## 6. Decisiones Pendientes

1. **Pólizas actuales** — Listar TODAS vigentes?
2. **Coberturas mínimas** — RC obligatoria + contenido?
3. **Vida grupal** — Solo clave o todos?
4. **Reclamos menores** — Reclamar siempre o > deducible?
5. **Renovación auto** — Permitir o cotizar alternativas?
6. **Equipo electrónico** — Cotizar póliza específica?

---

## 7. Conexión con otros documentos

- /audit/17 Flota (vehículos)
- /audit/08 Inventario (mercancía)
- /audit/14 Rutas (tránsito)
- /audit/15 RH (vida grupal)
- /audit/20 Tesorería (primas)
- /audit/33 Cierres (provisión)

### Nuevo Principio — PROTECCIÓN INTEGRAL VINCULADA
"Cada activo con póliza. Cada póliza con activo. Cada vencimiento alerta. Cada siniestro rastreado."

---

## 8. Recomendación final

Replica SAP FI-AA + Oracle Risk + 3 ÚNICOS MX. Costo $0 vs $$$$$.

---

*ALMASA-OS · Seguros y Riesgos · v1.0*  
*Generado el 10 de mayo de 2026*  
*SAP FI-AA Insurance para PYMEs. Pólizas integradas con activos.*
