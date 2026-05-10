# Cierres Contables — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Confirmación Josan "diario caja, mensual, anual fiscal" + SAP AFC  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** SAP Advanced Financial Closing para PYMEs. 3-day close.

---

## 1. La filosofía

Sin sistema, cierre toma 10-15 días. Con SAP-level automation: 3 días.

> Principio rector: "El cierre es ritual mensual. Sistema automatiza 80%, contadora valida 20%. 3 días, no 10."

---

## 2. Estado actual

Brecha 90%. Cierre diario parcial manual. Sin checklist, sin lock, sin FCV.

---

## 3. Diseño ALMASA-OS

### 3.1 Periodos Contables

```sql
CREATE TYPE estado_periodo AS ENUM (
  'abierto', 'pre_cierre', 'cerrado', 'cerrado_fiscal', 'reabierto'
);

CREATE TABLE periodos_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado estado_periodo DEFAULT 'abierto',
  fecha_inicio_cierre DATE,
  fecha_cierre_efectivo DATE,
  cerrado_por UUID,
  reabierto_por UUID,
  fecha_reapertura TIMESTAMPTZ,
  motivo_reapertura TEXT,
  total_transacciones INTEGER,
  total_ingresos NUMERIC,
  total_egresos NUMERIC,
  utilidad_n1 NUMERIC,
  utilidad_n2 NUMERIC,
  utilidad_n3 NUMERIC,
  estado_resultados_pdf_url TEXT,
  balance_general_pdf_url TEXT,
  flujo_efectivo_pdf_url TEXT,
  hash_documentos_sha256 TEXT[],
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_periodos_unico ON periodos_contables(ano, mes);
```

### 3.2 Ejercicios Fiscales

```sql
CREATE TABLE ejercicios_fiscales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano INTEGER NOT NULL UNIQUE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT CHECK (estado IN (
    'activo', 'cierre_en_proceso', 'cerrado', 'declarado_sat', 'auditado'
  )) DEFAULT 'activo',
  fecha_cierre DATE,
  cerrado_por UUID,
  fecha_declaracion_anual DATE,
  declaracion_pdf_url TEXT,
  acuse_sat_url TEXT,
  isr_resultado NUMERIC,
  utilidad_neta_anual NUMERIC,
  reparto_utilidades_pendiente NUMERIC,
  dictamen_fiscal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Cierre Diario de Caja

```sql
CREATE TABLE cierres_diarios_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  saldo_inicial_efectivo NUMERIC NOT NULL,
  cobros_efectivo NUMERIC DEFAULT 0,
  cobros_transferencia NUMERIC DEFAULT 0,
  cobros_cheque NUMERIC DEFAULT 0,
  cobros_tarjeta NUMERIC DEFAULT 0,
  cobros_total NUMERIC GENERATED ALWAYS AS (
    cobros_efectivo + cobros_transferencia + cobros_cheque + cobros_tarjeta
  ) STORED,
  pagos_efectivo NUMERIC DEFAULT 0,
  pagos_transferencia NUMERIC DEFAULT 0,
  pagos_cheque NUMERIC DEFAULT 0,
  pagos_total NUMERIC GENERATED ALWAYS AS (
    pagos_efectivo + pagos_transferencia + pagos_cheque
  ) STORED,
  caja_chica_egresos NUMERIC DEFAULT 0,
  saldo_calculado_efectivo NUMERIC GENERATED ALWAYS AS (
    saldo_inicial_efectivo + cobros_efectivo - pagos_efectivo - caja_chica_egresos
  ) STORED,
  saldo_fisico_contado NUMERIC,
  contado_por UUID,
  diferencia NUMERIC GENERATED ALWAYS AS (
    saldo_fisico_contado - (saldo_inicial_efectivo + cobros_efectivo - pagos_efectivo - caja_chica_egresos)
  ) STORED,
  estado TEXT CHECK (estado IN (
    'abierto', 'cuadrado', 'descuadre_menor', 'descuadre_mayor'
  )),
  diferencia_justificada BOOLEAN DEFAULT false,
  motivo_diferencia TEXT,
  foto_caja_url TEXT,
  foto_hash_sha256 TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Checklist Cierre Mensual (20 pasos SAP)

```sql
CREATE TABLE checklist_cierre_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos_contables(id),
  paso_numero INTEGER,
  paso_nombre TEXT NOT NULL,
  paso_categoria TEXT,
  estado TEXT CHECK (estado IN (
    'pendiente', 'en_proceso', 'completado', 'no_aplica', 'con_excepciones'
  )) DEFAULT 'pendiente',
  responsable_id UUID,
  fecha_inicio TIMESTAMPTZ,
  fecha_completado TIMESTAMPTZ,
  validado_por UUID,
  fecha_validacion TIMESTAMPTZ,
  notas TEXT,
  documentos_url TEXT[],
  excepciones JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION generar_checklist_cierre(p_periodo_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO checklist_cierre_mensual (periodo_id, paso_numero, paso_nombre, paso_categoria) VALUES
  (p_periodo_id, 1, 'Verificar todas facturas ingresadas', 'preparatorio'),
  (p_periodo_id, 2, 'Verificar notas crédito', 'preparatorio'),
  (p_periodo_id, 3, 'Verificar pagos clientes', 'preparatorio'),
  (p_periodo_id, 4, 'Verificar pagos proveedores', 'preparatorio'),
  (p_periodo_id, 5, 'Conciliación bancaria todas cuentas', 'reconciliacion'),
  (p_periodo_id, 6, 'GR/IR clearing (recepciones vs facturas)', 'reconciliacion'),
  (p_periodo_id, 7, 'Conciliación caja chica', 'reconciliacion'),
  (p_periodo_id, 8, 'Conciliación inventario físico vs sistema', 'reconciliacion'),
  (p_periodo_id, 9, 'Foreign Currency Valuation USD', 'valuacion'),
  (p_periodo_id, 10, 'Depreciación activos fijos', 'valuacion'),
  (p_periodo_id, 11, 'Provisión cuentas incobrables', 'valuacion'),
  (p_periodo_id, 12, 'Provisión gastos del mes', 'asientos'),
  (p_periodo_id, 13, 'Asientos ajuste cierre', 'asientos'),
  (p_periodo_id, 14, 'Asientos diferencia cambiaria', 'asientos'),
  (p_periodo_id, 15, 'Generar Estado de Resultados', 'reportes'),
  (p_periodo_id, 16, 'Generar Balance General', 'reportes'),
  (p_periodo_id, 17, 'Generar Flujo de Efectivo', 'reportes'),
  (p_periodo_id, 18, 'Validación contadora externa', 'lock'),
  (p_periodo_id, 19, 'Cerrar periodo (lock)', 'lock'),
  (p_periodo_id, 20, 'Generar reporte final cierre', 'lock');
END;
$$ LANGUAGE plpgsql;
```

### 3.5 Lock de Periodo

```sql
CREATE OR REPLACE FUNCTION validar_periodo_no_cerrado()
RETURNS TRIGGER AS $$
DECLARE v_estado estado_periodo; v_fecha DATE;
BEGIN
  v_fecha := COALESCE(NEW.fecha_emision, NEW.fecha, NEW.created_at::DATE);
  SELECT estado INTO v_estado FROM periodos_contables
  WHERE EXTRACT(YEAR FROM v_fecha) = ano AND EXTRACT(MONTH FROM v_fecha) = mes;
  IF v_estado IN ('cerrado', 'cerrado_fiscal') THEN
    RAISE EXCEPTION 'Periodo cerrado. No se pueden modificar transacciones.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.6 Foreign Currency Valuation (SAP F.05)

```sql
CREATE TABLE valuaciones_moneda_extranjera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos_contables(id),
  fecha_valuacion DATE NOT NULL,
  tipo_cambio_cierre NUMERIC NOT NULL,
  facturas_pendientes_usd NUMERIC,
  facturas_pendientes_mxn_emision NUMERIC,
  facturas_pendientes_mxn_revaluado NUMERIC,
  diferencia_unrealized NUMERIC GENERATED ALWAYS AS (
    facturas_pendientes_mxn_revaluado - facturas_pendientes_mxn_emision
  ) STORED,
  reversado BOOLEAN DEFAULT false,
  fecha_reversa DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.7 GR/IR Clearing + Provisiones

```sql
CREATE TABLE reconciliacion_gr_ir (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos_contables(id),
  fecha_reconciliacion DATE NOT NULL,
  total_recepciones_mxn NUMERIC,
  total_facturas_proveedor_mxn NUMERIC,
  diferencia NUMERIC GENERATED ALWAYS AS (
    total_recepciones_mxn - total_facturas_proveedor_mxn
  ) STORED,
  recepciones_sin_factura JSONB,
  facturas_sin_recepcion JSONB,
  resuelto BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE provisiones_mes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos_contables(id),
  tipo_provision TEXT CHECK (tipo_provision IN (
    'gastos_operativos', 'sueldos_quincena', 'cuentas_incobrables',
    'depreciacion', 'reparto_utilidades', 'finiquitos_estimados', 'otros'
  )),
  concepto TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  cuenta_contable TEXT,
  reversado BOOLEAN DEFAULT false,
  fecha_reversa DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.8 Contadora Externa

```sql
CREATE TABLE contadores_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rfc TEXT,
  cedula_profesional TEXT,
  email TEXT,
  telefono TEXT,
  puede_validar_cierres BOOLEAN DEFAULT true,
  puede_descargar_reportes BOOLEAN DEFAULT true,
  puede_modificar_provisiones BOOLEAN DEFAULT true,
  puede_cerrar_periodo BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Por qué ALMASA-OS gana

| Capacidad | SAP | NetSuite | ALMASA-OS |
|-----------|-----|----------|-----------|
| Periodos contables | ✅ | ✅ | ✅ |
| Checklist 20 pasos | ✅ AFC | 🟡 | ✅ |
| Lock periodos | ✅ | ✅ | ✅ |
| FCV automático | ✅ F.05 | ✅ | ✅ |
| GR/IR clearing | ✅ F.13 | 🟡 | ✅ |
| Cierre diario caja | 🟡 | 🟡 | ✅ |
| Contadora externa | ❌ | ❌ | ✅ ÚNICO |
| Hash documentos | ❌ | ❌ | ✅ ÚNICO |
| Costo | $$$$$ | $$$$ | $0 |

3 ÚNICOS: contadora externa MX, hash cierre, costo $0.

---

## 5. Roadmap

| Mes | Entrega |
|-----|---------|
| Junio | Periodos + ejercicios + cierre diario caja |
| Julio | Checklist 20 pasos + lock periodos |
| Agosto | FCV + GR/IR clearing |
| Septiembre | Provisiones + reportes auto |
| Octubre | Integración contadora externa |
| Noviembre | Cierre fiscal anual preparado |

**Tiempo:** 6 meses. **Inversión:** $0.

---

## 6. Decisiones Pendientes

1. **Lock estricto** — Bloquear TODO o permitir admin con justificación?
2. **Meta días cierre** — 3-5 días?
3. **Contadora acceso** — Portal completo o solo reportes?
4. **Provisiones auto** — Sistema sugiere basado en histórico?
5. **Cierre diario obligatorio** — Bloquear si no cerró ayer?
6. **Reportes** — Estado Resultados, Balance, Flujo siempre?

---

## 7. Conexión con otros documentos

- /audit/20 Tesorería (caja chica + bancos)
- /audit/29 Divisas (FCV USD)
- /audit/09 Compras (GR/IR)
- /audit/15 RH (provisión nómina)
- /audit/32 Anticipos (saldos préstamos)

### Nuevo Principio — RITUAL MENSUAL AUTOMATIZADO
"Cierre = ritual disciplinado. Sistema 80%, contadora 20%. 3 días, no 10."

---

## 8. Recomendación final

Replica SAP AFC + 3 ÚNICOS MX (contadora externa, hash, $0). Cierre en 3 días vs 10-15 hoy.

---

*ALMASA-OS · Cierres Contables · v1.0*  
*Generado el 10 de mayo de 2026*  
*SAP AFC para PYMEs. 3-day close. Contadora externa integrada.*
