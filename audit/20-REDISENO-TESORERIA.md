# Rediseño de Tesorería — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de tesorería + decisiones operativas + metodología "Mejor que Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El dinero es vida. Sin visibilidad, no hay decisión.

---

## 1. La filosofía

Tesorería es la BRECHA MÁS GRANDE de ALMASA-OS hoy. Mientras otros 
módulos (Pedidos, Clientes, Flota, RH) están al 80-95% completos, 
Tesorería NO existe formalmente. Hay funcionalidad dispersa en 
Compras (pagos a OC), pero falta toda la infraestructura: caja 
chica, cuentas bancarias múltiples, conciliación, flujo de caja, 
dashboard tesorería.

> Principio rector: "Cada peso debe ser visible. Cada gasto debe 
> ser justificado. Cada saldo debe ser proyectable. Cada movimiento 
> debe quedar registrado. Tesorería como columna vertebral 
> financiera."

---

## 2. Estado actual de tesorería

ALMASA-OS NO tiene módulo formal. Funcionalidad dispersa:

**Lo que SÍ existe (todo en /components/compras):**

| Componente | Líneas | Función |
|-----------|--------|---------|
| ProcesarPagoOCDialog | 1,143 | Pagos OC (cheque/transferencia/efectivo) |
| MarcarPagadoDialog | 859 | Marcar OC pagada con comprobante |
| AdeudosProveedoresTab | 822 | Vista adeudos con PieChart |
| CreditosPendientesPanel | 616 | Créditos pendientes aplicar |
| ordenPagoPdfGenerator | 573 | PDF orden de pago |

**Total:** ~4,013 líneas (todas en compras).

**Lo que NO existe:**

| Aspecto | Estado |
|---------|--------|
| Caja chica (Spec #33) | ❌ "mayor caos operativo" |
| Cuentas bancarias múltiples | ❌ solo BBVA en companyData |
| Movimientos bancarios | ❌ sin tracking |
| Conciliación bancaria | ❌ propuesto en /audit/16 |
| Flujo de caja proyectado | ❌ |
| Gastos operativos generales | ❌ |
| Dashboard tesorería | ❌ |
| Cheques emitidos tracking | ❌ |

**Conclusión:** Brecha más grande. 7 piezas forman módulo completo.

---

## 3. Estándar Oracle / SAP / NetSuite

7 conceptos universales:
1. Caja chica (petty cash)
2. Cuentas bancarias múltiples
3. Movimientos bancarios + Conciliación
4. Pagos a proveedores
5. Flujo de caja proyectado
6. Anticipos (clientes y proveedores)
7. Dashboard tesorería consolidado

---

## 4. Por qué ALMASA-OS ganará

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Caja chica | ✅ | ❌ → planeado | EMPATE (post) |
| Cuentas bancarias | ✅ | ❌ → planeado | EMPATE (post) |
| Conciliación auto | ✅ | ❌ → planeado | EMPATE (post) |
| Pagos proveedores | ✅ | ✅ disperso | EMPATE |
| Adeudos proveedores | ✅ | ✅ con PieChart | EMPATE |
| Comprobantes pago | ✅ | ✅ | EMPATE |
| Orden pago PDF | ✅ | ✅ | EMPATE |
| Flujo caja proyectado | ✅ | ❌ → IA | ALMASA (post) |
| Caja chica con foto | ❌ | ❌ → ÚNICO | ALMASA (post) |
| Multi-banco mexicano | 🟡 | ❌ → ÚNICO | ALMASA (post) |
| Costo licencia | $$$$ | $0 | ALMASA |

---

## 5. Las 7 Brechas (TODO el módulo)

### Brecha 1 — Caja Chica (Spec #33 - CRÍTICO)

```sql
CREATE TABLE cajas_chicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fondo_asignado NUMERIC NOT NULL,
  saldo_actual NUMERIC NOT NULL,
  responsable_id UUID NOT NULL REFERENCES empleados(id),
  ubicacion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE categoria_gasto_caja AS ENUM (
  'gasolina', 'papeleria', 'comida_oficina', 'transporte',
  'mantenimiento_menor', 'limpieza', 'imprevistos', 'otros'
);

CREATE TABLE movimientos_caja_chica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas_chicas(id),
  fecha TIMESTAMPTZ DEFAULT now(),
  tipo TEXT CHECK (tipo IN ('gasto', 'reposicion', 'ajuste')),
  monto NUMERIC NOT NULL,
  categoria categoria_gasto_caja,
  descripcion TEXT NOT NULL,
  beneficiario TEXT,
  foto_ticket_url TEXT NOT NULL,
  foto_ticket_hash_sha256 TEXT NOT NULL,
  requiere_aprobacion BOOLEAN GENERATED ALWAYS AS (monto > 500) STORED,
  aprobado BOOLEAN DEFAULT false,
  aprobado_por UUID,
  aprobado_en TIMESTAMPTZ,
  registrado_por UUID NOT NULL,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION actualizar_saldo_caja()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cajas_chicas
  SET saldo_actual = saldo_actual + 
    CASE 
      WHEN NEW.tipo = 'gasto' THEN -NEW.monto
      WHEN NEW.tipo = 'reposicion' THEN NEW.monto
      WHEN NEW.tipo = 'ajuste' THEN NEW.monto
    END
  WHERE id = NEW.caja_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_saldo_caja
AFTER INSERT ON movimientos_caja_chica
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_caja();
```

**Reglas:** Gasto > $500 requiere admin. Foto OBLIGATORIA con hash. GPS automático. Reposición cuando saldo < 30%.

**Esfuerzo:** 2 semanas  
**Prioridad:** CRÍTICA

### Brecha 2 — Cuentas Bancarias Múltiples

```sql
CREATE TABLE cuentas_bancarias_almasa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  clabe_interbancaria TEXT NOT NULL,
  titular TEXT NOT NULL,
  rfc_titular TEXT,
  tipo_cuenta TEXT CHECK (tipo_cuenta IN (
    'operativa', 'reserva', 'compras', 'nomina', 'inversion', 'otra'
  )),
  saldo_actual NUMERIC DEFAULT 0,
  saldo_actualizado_en TIMESTAMPTZ,
  responsable_id UUID REFERENCES empleados(id),
  portal_url TEXT,
  notas TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE saldos_bancarios_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_bancaria_id UUID NOT NULL REFERENCES cuentas_bancarias_almasa(id),
  fecha DATE NOT NULL,
  saldo_inicio NUMERIC,
  saldo_fin NUMERIC,
  total_ingresos NUMERIC,
  total_egresos NUMERIC,
  num_movimientos INTEGER,
  capturado_en TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 1 semana  
**Prioridad:** ALTA

### Brecha 3 — Movimientos y Conciliación Bancaria

```sql
CREATE TABLE movimientos_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_bancaria_id UUID NOT NULL REFERENCES cuentas_bancarias_almasa(id),
  fecha_movimiento DATE NOT NULL,
  fecha_valor DATE,
  concepto TEXT NOT NULL,
  referencia TEXT,
  monto NUMERIC NOT NULL,
  tipo TEXT CHECK (tipo IN ('abono', 'cargo')),
  saldo_despues NUMERIC,
  conciliado BOOLEAN DEFAULT false,
  match_tipo TEXT CHECK (match_tipo IN (
    'pago_cliente', 'pago_proveedor', 'transferencia_interna',
    'gasto_operativo', 'caja_chica_reposicion', 'nomina', 'sin_match'
  )),
  match_referencia_id UUID,
  conciliado_en TIMESTAMPTZ,
  conciliado_por UUID,
  conciliado_metodo TEXT CHECK (conciliado_metodo IN ('automatico', 'manual')),
  importado_de TEXT,
  archivo_origen_url TEXT,
  archivo_origen_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 2-3 semanas  
**Prioridad:** ALTA

### Brecha 4 — Flujo de Caja Proyectado (con IA)

```sql
CREATE TABLE flujo_caja_proyecciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_proyeccion DATE NOT NULL,
  fecha_objetivo DATE NOT NULL,
  saldo_inicio_total NUMERIC NOT NULL,
  cobros_facturas_proyectados NUMERIC,
  ventas_nuevas_estimadas NUMERIC,
  otros_ingresos NUMERIC,
  total_ingresos_proyectados NUMERIC GENERATED ALWAYS AS (
    COALESCE(cobros_facturas_proyectados, 0) +
    COALESCE(ventas_nuevas_estimadas, 0) +
    COALESCE(otros_ingresos, 0)
  ) STORED,
  pagos_proveedores_proyectados NUMERIC,
  nomina_proyectada NUMERIC,
  rentas_servicios NUMERIC,
  gastos_operativos_estimados NUMERIC,
  otros_egresos NUMERIC,
  total_egresos_proyectados NUMERIC GENERATED ALWAYS AS (
    COALESCE(pagos_proveedores_proyectados, 0) +
    COALESCE(nomina_proyectada, 0) +
    COALESCE(rentas_servicios, 0) +
    COALESCE(gastos_operativos_estimados, 0) +
    COALESCE(otros_egresos, 0)
  ) STORED,
  saldo_proyectado NUMERIC GENERATED ALWAYS AS (
    saldo_inicio_total + 
    COALESCE(cobros_facturas_proyectados, 0) + COALESCE(ventas_nuevas_estimadas, 0) + COALESCE(otros_ingresos, 0) -
    COALESCE(pagos_proveedores_proyectados, 0) - COALESCE(nomina_proyectada, 0) - COALESCE(rentas_servicios, 0) - COALESCE(gastos_operativos_estimados, 0) - COALESCE(otros_egresos, 0)
  ) STORED,
  confianza_pct NUMERIC,
  generado_por TEXT CHECK (generado_por IN ('manual', 'ia', 'mixto')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Combina:** facturas vencidas + OCs + nómina + gastos + IA Claude.

**Esfuerzo:** 2-3 semanas  
**Prioridad:** ALTO IMPACTO ESTRATÉGICO

### Brecha 5 — Gastos Operativos Generales

```sql
CREATE TABLE gastos_operativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL CHECK (categoria IN (
    'renta_bodega', 'renta_oficina', 'servicios_luz', 'servicios_agua',
    'servicios_internet', 'servicios_telefono', 'servicios_basura',
    'oficina_papeleria', 'oficina_limpieza', 'mantenimiento_inmueble',
    'seguros_inmueble', 'impuestos_locales', 'asesoria_legal',
    'asesoria_contable', 'marketing', 'capacitacion', 'otros'
  )),
  descripcion TEXT NOT NULL,
  beneficiario TEXT,
  rfc_beneficiario TEXT,
  periodicidad TEXT NOT NULL CHECK (periodicidad IN (
    'unico', 'mensual_fijo', 'mensual_variable', 'bimestral',
    'trimestral', 'semestral', 'anual'
  )),
  monto NUMERIC NOT NULL,
  fecha_pago DATE NOT NULL,
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias_almasa(id),
  factura_xml_url TEXT,
  comprobante_pago_url TEXT,
  comprobante_hash TEXT,
  pagado BOOLEAN DEFAULT false,
  pagado_por UUID,
  pagado_en TIMESTAMPTZ,
  proxima_fecha_pago DATE,
  registrado_por UUID NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Conexión con utilidad N3:** suma mensual alimenta cálculo.

**Esfuerzo:** 1-2 semanas  
**Prioridad:** IMPORTANTE

### Brecha 6 — Transferencias y Cheques

```sql
CREATE TABLE transferencias_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_origen_id UUID NOT NULL REFERENCES cuentas_bancarias_almasa(id),
  cuenta_destino_id UUID NOT NULL REFERENCES cuentas_bancarias_almasa(id),
  monto NUMERIC NOT NULL,
  fecha_transferencia DATE NOT NULL,
  motivo TEXT NOT NULL,
  comprobante_url TEXT,
  comprobante_hash TEXT,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cheques_emitidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cheque TEXT UNIQUE NOT NULL,
  cuenta_bancaria_id UUID NOT NULL REFERENCES cuentas_bancarias_almasa(id),
  beneficiario TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_cobro DATE,
  estado TEXT DEFAULT 'emitido' CHECK (estado IN (
    'emitido', 'cobrado', 'cancelado', 'rebotado'
  )),
  pago_proveedor_id UUID,
  motivo TEXT,
  emitido_por UUID NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esfuerzo:** 1-2 semanas  
**Prioridad:** NICE

### Brecha 7 — Dashboard Tesorería Consolidado

```sql
CREATE VIEW vw_dashboard_tesoreria AS
SELECT 
  CURRENT_DATE AS fecha_consulta,
  (SELECT SUM(saldo_actual) FROM cuentas_bancarias_almasa WHERE activa = true) AS total_en_bancos,
  (SELECT SUM(saldo_actual) FROM cajas_chicas WHERE activa = true) AS total_caja_chica,
  (SELECT SUM(saldo_pendiente) FROM facturas WHERE pagada = false) AS total_cxc,
  (SELECT SUM(monto - COALESCE(monto_pagado, 0)) FROM ordenes_compra WHERE status_pago != 'pagado') AS total_cxp,
  (SELECT COUNT(*) FROM cajas_chicas WHERE saldo_actual < (fondo_asignado * 0.3)) AS cajas_requieren_reposicion;
```

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTA COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/20 generado |
| Julio | Brecha 2: Cuentas bancarias (1 sem) |
| Julio | Brecha 1: Caja chica con foto (2 sem) |
| Agosto | Brecha 5: Gastos operativos (2 sem) |
| Agosto | Brecha 6: Transferencias + cheques (1-2 sem) |
| Septiembre | Brecha 3: Movimientos + conciliación (3 sem) |
| Octubre | Brecha 4: Flujo de caja proyectado (3 sem) |
| Noviembre | Brecha 7: Dashboard tesorería consolidado (2 sem) |

**Tiempo total:** 6-7 meses  
**Inversión:** $0 software

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Cantidad de cajas chicas
- 1 caja principal o varias por bodega?
- Monto del fondo ($5,000 estándar?)

### Decisión 2 — Umbral aprobación gastos caja
- >$500 requiere admin? Otro monto?

### Decisión 3 — Cuentas bancarias actuales
- Listar bancos (BBVA + ?)
- Tipo de cada cuenta
- Responsable de cada una

### Decisión 4 — Frecuencia conciliación
- Diaria? Semanal? Mensual?
- Quién la hace?

### Decisión 5 — Periodicidad flujo de caja
- Recálculo diario o semanal?
- 7, 15 o 30 días de proyección?

### Decisión 6 — Categorías de gastos
- Validar lista propuesta
- Faltan categorías específicas ALMASA?

### Decisión 7 — Acceso al dashboard
- Solo admin?
- Contadora también?
- Vista limitada para secretaria?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #1 (Privacidad por rol): tesorería para admin/contadora
- Principio #4 (CPP real con gastos asociados): gastos operativos
- Principio #5 (Utilidad en tres niveles): N3 incluye admin
- Principio #10 (Users Before Perfection): MVP por brechas

### Conexiones cruzadas:
- /audit/13 Pedidos: cobros alimentan ingresos
- /audit/15 RH: nómina como egreso recurrente
- /audit/16 Cobranza: aging alimenta proyección ingresos
- /audit/17 Flota: cargas combustible son egreso
- /audit/19 Dashboard: utilidad N3 usa gastos operativos
- /audit/12 Evidencia: hashes en comprobantes

### Spec #33 de Biblia v1:
"Caja Chica - Mayor caos operativo actual."
Resuelto en Brecha 1.

### Nuevo Principio Transversal Propuesto — VISIBILIDAD FINANCIERA TOTAL
"Cada peso debe ser visible. Cada gasto debe tener evidencia. 
Cada saldo debe ser proyectable. Cada movimiento debe quedar 
registrado. Sin tesorería robusta, ALMASA-OS es un sistema 
operativo sin columna vertebral financiera."

---

## 9. Recomendación final

ALMASA-OS Tesorería es la BRECHA MÁS GRANDE del sistema. Es 
también la mayor OPORTUNIDAD: construir desde cero con visión 
correcta.

Las 7 brechas forman un módulo COMPLETO:
1. CAJA CHICA — resuelve "mayor caos operativo"
2. CUENTAS BANCARIAS — multi-banco mexicano
3. MOVIMIENTOS + CONCILIACIÓN — control real
4. FLUJO DE CAJA PROYECTADO — visibilidad futura
5. GASTOS OPERATIVOS — alimenta utilidad N3
6. TRANSFERENCIAS Y CHEQUES — completar tracking
7. DASHBOARD TESORERÍA — vista única

**Orden estricto:**
1. JULIO: Cuentas bancarias + Caja chica (CRÍTICO)
2. AGOSTO: Gastos operativos + Transferencias/Cheques
3. SEPTIEMBRE: Conciliación bancaria
4. OCTUBRE: Flujo de caja proyectado (con IA Claude)
5. NOVIEMBRE: Dashboard tesorería consolidado

Una vez completas las 7 brechas, ALMASA-OS Tesorería será 
**equivalente a Oracle Treasury Management para PYMEs mexicanas**, 
con costo $0 y 3 ventajas únicas (caja chica con foto+hash, 
multi-banco mexicano, flujo proyectado con IA Claude).

---

*ALMASA-OS · Rediseño de Tesorería · v1.0*  
*Generado el 10 de mayo de 2026*  
*El dinero es vida. Sin visibilidad, no hay decisión.*
