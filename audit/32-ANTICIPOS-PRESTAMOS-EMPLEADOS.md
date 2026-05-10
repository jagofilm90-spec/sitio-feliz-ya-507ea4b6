# Anticipos y Préstamos a Empleados — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Confirmación Josan "frecuentes, importante documentar" + SAP Infotype 0045  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** SAP Loan Management nivel enterprise. Cumplimiento LFT México.

---

## 1. La filosofía

ALMASA opera 30+ empleados. Anticipos y préstamos son frecuentes. Sin sistema = Excel paralelo, errores, riesgo legal LFT.

SAP resuelve con Infotype 0045 (Loan Management) + repayment automático. ALMASA-OS implementa la misma robustez sin licencia.

> Principio rector: "El préstamo es un compromiso. El sistema lo registra, lo descuenta automático, y muestra el saldo."

---

## 2. Estado actual

Brecha 100%. Sin tabla, sin workflow, sin compliance LFT.

---

## 3. Estándar SAP / NetSuite

### SAP Infotype 0045
- Múltiples préstamos por empleado (tipo + sequential)
- 8 tipos configurables
- Repayment auto nómina
- Cálculo intereses
- Loan approval workflow

### Compliance LFT México
- Art. 110 fracción I: Descuentos máximo 30% del excedente sobre salario mínimo
- Anticipos hasta 1 mes de salario
- Préstamos con interés requieren autorización escrita

---

## 4. Diseño ALMASA-OS

### 4.1 Tipos de Préstamo

```sql
CREATE TYPE tipo_prestamo AS ENUM (
  'anticipo_sueldo', 'prestamo_personal', 'caja_ahorro',
  'auxilio_medico', 'auxilio_funerario', 'auxilio_escolar',
  'vale_despensa', 'compensacion_interna', 'prestamo_vivienda',
  'prestamo_vehiculo', 'otro'
);

CREATE TABLE tipos_prestamo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_prestamo NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto_maximo NUMERIC,
  plazo_maximo_quincenas INTEGER,
  tasa_interes_anual NUMERIC DEFAULT 0,
  porcentaje_max_descuento NUMERIC DEFAULT 30,
  requiere_garantia BOOLEAN DEFAULT false,
  requiere_autorizacion_admin BOOLEAN DEFAULT true,
  requiere_pagare BOOLEAN DEFAULT false,
  requiere_firma_digital BOOLEAN DEFAULT true,
  monto_umbral_aprobacion_admin NUMERIC,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Préstamos (basado SAP Infotype 0045)

```sql
CREATE TABLE prestamos_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_prestamo TEXT UNIQUE NOT NULL,
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  tipo tipo_prestamo NOT NULL,
  numero_secuencial INTEGER,
  fecha_solicitud DATE NOT NULL,
  motivo TEXT,
  monto_aprobado NUMERIC NOT NULL,
  plazo_quincenas INTEGER NOT NULL,
  fecha_inicio_descuentos DATE NOT NULL,
  fecha_fin_descuentos DATE,
  tasa_interes_anual NUMERIC DEFAULT 0,
  cuota_quincenal_capital NUMERIC,
  cuota_quincenal_interes NUMERIC,
  cuota_quincenal_total NUMERIC GENERATED ALWAYS AS 
    (cuota_quincenal_capital + COALESCE(cuota_quincenal_interes, 0)) STORED,
  saldo_capital NUMERIC NOT NULL,
  saldo_interes_acumulado NUMERIC DEFAULT 0,
  saldo_total NUMERIC GENERATED ALWAYS AS 
    (saldo_capital + COALESCE(saldo_interes_acumulado, 0)) STORED,
  total_pagado NUMERIC DEFAULT 0,
  total_capital_pagado NUMERIC DEFAULT 0,
  total_interes_pagado NUMERIC DEFAULT 0,
  estado TEXT CHECK (estado IN (
    'solicitado', 'aprobado', 'rechazado', 'desembolsado',
    'descontando_activo', 'pagado_completo', 'cancelado', 'incobrable'
  )) DEFAULT 'solicitado',
  aprobado_por UUID,
  aprobado_en TIMESTAMPTZ,
  rechazado_por UUID,
  rechazado_motivo TEXT,
  desembolsado_por UUID,
  desembolsado_en TIMESTAMPTZ,
  desembolsado_metodo TEXT,
  comprobante_desembolso_url TEXT,
  pagare_pdf_url TEXT,
  pagare_hash_sha256 TEXT,
  firma_empleado_url TEXT,
  firma_empleado_hash TEXT,
  fecha_firma TIMESTAMPTZ,
  porcentaje_descuento_calculado NUMERIC,
  cumple_lft_30pct BOOLEAN,
  liquidacion_anticipada BOOLEAN DEFAULT false,
  ultimo_descuento_fecha DATE,
  proxima_cuota_fecha DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prestamos_empleado_estado 
  ON prestamos_empleados(empleado_id, estado);
```

### 4.3 Movimientos

```sql
CREATE TABLE prestamos_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos_empleados(id),
  fecha_movimiento DATE NOT NULL,
  tipo_movimiento TEXT CHECK (tipo_movimiento IN (
    'desembolso', 'descuento_nomina', 'pago_directo',
    'liquidacion_anticipada', 'condonacion', 'ajuste_intereses', 'capitalizacion'
  )),
  monto_capital NUMERIC DEFAULT 0,
  monto_interes NUMERIC DEFAULT 0,
  monto_total NUMERIC GENERATED ALWAYS AS 
    (monto_capital + monto_interes) STORED,
  saldo_capital_resultante NUMERIC,
  saldo_interes_resultante NUMERIC,
  nomina_periodo_id UUID,
  comprobante_url TEXT,
  registrado_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.4 Cálculo Cuotas

```sql
CREATE OR REPLACE FUNCTION calcular_cuotas_prestamo(
  p_monto NUMERIC,
  p_plazo_quincenas INTEGER,
  p_tasa_anual NUMERIC DEFAULT 0
) RETURNS TABLE (
  cuota_capital NUMERIC, cuota_interes NUMERIC,
  cuota_total NUMERIC, total_a_pagar NUMERIC
) AS $$
DECLARE v_tasa_q NUMERIC; v_cuota NUMERIC; v_int NUMERIC;
BEGIN
  IF COALESCE(p_tasa_anual, 0) = 0 THEN
    v_cuota := p_monto / p_plazo_quincenas; v_int := 0;
  ELSE
    v_tasa_q := p_tasa_anual / 24 / 100;
    v_cuota := p_monto * (v_tasa_q * POWER(1 + v_tasa_q, p_plazo_quincenas)) /
      (POWER(1 + v_tasa_q, p_plazo_quincenas) - 1);
    v_int := v_cuota * v_tasa_q;
  END IF;
  RETURN QUERY SELECT v_cuota, v_int, v_cuota + v_int, (v_cuota + v_int) * p_plazo_quincenas;
END;
$$ LANGUAGE plpgsql;
```

### 4.5 Compliance LFT (CRÍTICO)

```sql
CREATE OR REPLACE FUNCTION validar_cumplimiento_lft(
  p_empleado_id UUID,
  p_nuevo_descuento_quincenal NUMERIC
) RETURNS TABLE (cumple BOOLEAN, porcentaje_descuento NUMERIC, motivo TEXT) AS $$
DECLARE
  v_salario_q NUMERIC; v_smm NUMERIC := 8364;
  v_sm_q NUMERIC; v_desc_exist NUMERIC;
  v_desc_total NUMERIC; v_excedente NUMERIC; v_pct NUMERIC;
BEGIN
  SELECT sueldo_bruto / 2 INTO v_salario_q FROM empleados WHERE id = p_empleado_id;
  v_sm_q := v_smm / 2;
  SELECT COALESCE(SUM(cuota_quincenal_total), 0) INTO v_desc_exist
  FROM prestamos_empleados WHERE empleado_id = p_empleado_id AND estado = 'descontando_activo';
  v_desc_total := v_desc_exist + p_nuevo_descuento_quincenal;
  v_excedente := v_salario_q - v_sm_q;
  IF v_excedente <= 0 THEN
    RETURN QUERY SELECT false, 100::NUMERIC, 'Salario inferior al mínimo (Art. 110 LFT)';
    RETURN;
  END IF;
  v_pct := (v_desc_total / v_excedente) * 100;
  IF v_pct > 30 THEN
    RETURN QUERY SELECT false, v_pct, 'Excede 30% excedente (Art. 110 LFT)';
  ELSE
    RETURN QUERY SELECT true, v_pct, 'Cumple LFT';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4.6 Descuento Automático Nómina

```sql
CREATE VIEW vw_descuentos_quincena_actual AS
SELECT 
  p.empleado_id, e.nombre_completo,
  COUNT(*) AS prestamos_activos,
  SUM(p.cuota_quincenal_total) AS descuento_total,
  ARRAY_AGG(p.numero_prestamo) AS prestamos_numeros
FROM prestamos_empleados p
JOIN empleados e ON e.id = p.empleado_id
WHERE p.estado = 'descontando_activo'
  AND p.proxima_cuota_fecha <= CURRENT_DATE
GROUP BY p.empleado_id, e.nombre_completo;

CREATE OR REPLACE FUNCTION procesar_descuentos_nomina_quincena(p_nomina_periodo_id UUID)
RETURNS void AS $$
DECLARE v_prestamo RECORD;
BEGIN
  FOR v_prestamo IN SELECT * FROM prestamos_empleados 
    WHERE estado = 'descontando_activo' AND proxima_cuota_fecha <= CURRENT_DATE
  LOOP
    INSERT INTO prestamos_movimientos (
      prestamo_id, fecha_movimiento, tipo_movimiento,
      monto_capital, monto_interes, nomina_periodo_id
    ) VALUES (
      v_prestamo.id, CURRENT_DATE, 'descuento_nomina',
      v_prestamo.cuota_quincenal_capital, v_prestamo.cuota_quincenal_interes,
      p_nomina_periodo_id
    );
    UPDATE prestamos_empleados SET 
      saldo_capital = saldo_capital - cuota_quincenal_capital,
      total_pagado = total_pagado + cuota_quincenal_total,
      ultimo_descuento_fecha = CURRENT_DATE,
      proxima_cuota_fecha = CURRENT_DATE + INTERVAL '15 days',
      estado = CASE WHEN saldo_capital - cuota_quincenal_capital <= 0 
        THEN 'pagado_completo' ELSE 'descontando_activo' END
    WHERE id = v_prestamo.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Por qué ALMASA-OS gana

| Capacidad | SAP | NetSuite | ALMASA-OS |
|-----------|-----|----------|-----------|
| Múltiples préstamos | ✅ | 🟡 | ✅ |
| 11 tipos configurables | ✅ | 🟡 | ✅ |
| Repayment auto nómina | ✅ | ✅ US | ✅ MX |
| Workflow aprobación | ✅ | 🟡 | ✅ |
| Compliance LFT 30% | ❌ | ❌ | ✅ ÚNICO |
| Pagaré digital hash | ❌ | ❌ | ✅ ÚNICO |
| Score comportamiento | ❌ | ❌ | ✅ ÚNICO |
| Costo | $$$$ | $$$$ | $0 |

3 ÚNICOS: LFT nativo, pagaré hash, score pago.

---

## 6. Roadmap

| Mes | Entrega |
|-----|---------|
| Junio | Tablas config + prestamos + movimientos |
| Julio | Funciones cuotas + LFT |
| Agosto | UI empleado + admin |
| Septiembre | Pagaré digital + firma + integración nómina |
| Octubre | Score comportamiento pago |

**Tiempo:** 5 meses. **Inversión:** $0.

---

## 7. Decisiones Pendientes

1. **Tasas interés** — 0% pequeños, 5% grandes?
2. **Límite simultáneos** — Máx 2 activos?
3. **Auxilios sin descuento** — Funerario gracia?
4. **Antigüedad mínima** — 6 meses para préstamo plazo?
5. **Empleado se va** — Descontar finiquito?
6. **Documentación** — Médico requiere receta?

---

## 8. Conexión con otros documentos

- /audit/15 RH (empleados, salarios)
- /audit/20 Tesorería (desembolsos)
- /audit/12 Evidencia (hashes pagarés)
- /audit/19 Dashboard (KPIs)

### Nuevo Principio — COMPROMISO REGISTRADO Y AUTOMATIZADO
"Préstamo = compromiso. Sistema registra con firma digital, descuenta auto, muestra saldo. Sin Excel, sin disputas, cumpliendo LFT."

---

## 9. Recomendación final

Replica SAP Infotype 0045 + 3 únicos MX (LFT, pagaré hash, score). Costo $0 vs SAP $$$$$.

---

*ALMASA-OS · Anticipos y Préstamos · v1.0*  
*Generado el 10 de mayo de 2026*  
*SAP Loan Management para PYMEs. Cumplimiento LFT automático.*
