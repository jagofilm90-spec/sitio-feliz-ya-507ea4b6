# Multi-Moneda y Divisas — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Confirmación Josan: ALMASA paga proveedores en USD vía Banco Base  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Operación internacional con la robustez de Oracle. Sin licencia de Oracle.

---

## 1. La filosofía

ALMASA NO es solo distribuidora local CDMX. Es empresa con operación internacional:

- **Compra directo del extranjero** (USD principalmente, EUR ocasional)
- **Compra vía brokers MX** que también facturan en USD
- **Banco Base** como su banco operativo en USD
- **Negocia INCOTERMS** (CIF, FOB, DDP, EXW)
- **Exportaciones futuras** (preparar pero no implementar aún)

Oracle Fusion Cloud resuelve esto con 5 tipos de tipo de cambio, cálculo automático de ganancias/pérdidas cambiarias, revaluación period-end. Pero cuesta $$$$ + consultores caros.

ALMASA-OS implementa la MISMA robustez sin licencia de Oracle.

> Principio rector: "El peso es nuestra moneda funcional. El dólar es nuestra realidad operativa. El sistema concilia ambos mundos sin error humano."

---

## 2. Estado actual

Probablemente NO existe módulo formal. ALMASA-OS asume MXN único.

| Capacidad | Estado |
|-----------|--------|
| Tabla tipos cambio | ❌ |
| Multi-moneda en documentos | ❌ |
| Cuentas bancarias USD | ❌ |
| Conversión automática | ❌ |
| Cálculo G/L cambiario | ❌ |
| Revaluación period-end | ❌ |
| Integración Banxico/DOF | ❌ |

**Conclusión:** Brecha 100%. Diseño desde cero basado en Oracle.

---

## 3. Estándar Oracle / SAP / NetSuite

5 conceptos universales:
1. Tabla central de tipos cambio histórica
2. Moneda en cada documento
3. Conversión a moneda funcional automática
4. Cálculo G/L cambiario (Realized + Unrealized)
5. Revaluación period-end

---

## 4. Por qué ALMASA-OS iguala Oracle

| Dimensión | Oracle | SAP | NetSuite | ALMASA-OS |
|-----------|--------|-----|----------|-----------|
| Tipos tipo cambio | 5 | 4 | 3 | 5 |
| Tabla histórica | ✅ | ✅ | ✅ | ✅ |
| Multi-moneda docs | ✅ | ✅ | ✅ | ✅ |
| Cálculo G/L | ✅ | ✅ | ✅ | ✅ |
| Revaluación | ✅ | ✅ | ✅ | ✅ |
| Banxico API | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Banco Base API | ❌ | ❌ | ❌ | ✅ ÚNICO |
| DOF publicación | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Costo | $$$$$ | $$$$$ | $$$$ | $0 |

ALMASA gana: 4 (3 ÚNICOS + costo). Oracle: 0. Empate: 5.

---

## 5. Diseño Multi-Moneda

### 5.1 Tabla Central — Tipos de Cambio

```sql
CREATE TYPE tipo_rate AS ENUM (
  'spot', 'corporate', 'banxico_fix', 'dof_pago', 'banco_base', 'user'
);

CREATE TABLE tipos_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  moneda_origen TEXT NOT NULL,
  moneda_destino TEXT NOT NULL DEFAULT 'MXN',
  tipo tipo_rate NOT NULL,
  tasa NUMERIC(15,6) NOT NULL,
  tasa_inversa NUMERIC(15,8) GENERATED ALWAYS AS 
    (1 / NULLIF(tasa, 0)) STORED,
  fuente TEXT,
  url_fuente TEXT,
  vigente_desde TIMESTAMPTZ DEFAULT now(),
  vigente_hasta TIMESTAMPTZ,
  capturado_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_tipos_cambio_unico
  ON tipos_cambio(fecha, moneda_origen, moneda_destino, tipo)
  WHERE vigente_hasta IS NULL;
```

### 5.2 Función obtener tipo de cambio

```sql
CREATE OR REPLACE FUNCTION obtener_tipo_cambio(
  p_moneda_origen TEXT,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_tipo tipo_rate DEFAULT 'spot'
) RETURNS NUMERIC AS $$
DECLARE v_tasa NUMERIC;
BEGIN
  IF p_moneda_origen = 'MXN' THEN RETURN 1; END IF;
  
  SELECT tasa INTO v_tasa FROM tipos_cambio
  WHERE moneda_origen = p_moneda_origen AND fecha = p_fecha
    AND tipo = p_tipo AND vigente_hasta IS NULL LIMIT 1;
  
  IF v_tasa IS NULL THEN
    SELECT tasa INTO v_tasa FROM tipos_cambio
    WHERE moneda_origen = p_moneda_origen AND fecha <= p_fecha
      AND tipo = p_tipo AND vigente_hasta IS NULL
    ORDER BY fecha DESC LIMIT 1;
  END IF;
  
  IF v_tasa IS NULL AND p_tipo != 'spot' THEN
    v_tasa := obtener_tipo_cambio(p_moneda_origen, p_fecha, 'spot');
  END IF;
  
  RETURN v_tasa;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 5.3 Multi-moneda en documentos

```sql
-- Proveedores
ALTER TABLE proveedores ADD COLUMN moneda_default TEXT DEFAULT 'MXN';
ALTER TABLE proveedores ADD COLUMN tipo_cambio_default tipo_rate DEFAULT 'spot';
ALTER TABLE proveedores ADD COLUMN cuenta_bancaria_usd TEXT;
ALTER TABLE proveedores ADD COLUMN swift_code TEXT;

-- Órdenes de compra
ALTER TABLE ordenes_compra ADD COLUMN moneda TEXT NOT NULL DEFAULT 'MXN';
ALTER TABLE ordenes_compra ADD COLUMN tipo_cambio_aplicado NUMERIC(15,6);
ALTER TABLE ordenes_compra ADD COLUMN tipo_cambio_fecha DATE;
ALTER TABLE ordenes_compra ADD COLUMN tipo_cambio_tipo tipo_rate;
ALTER TABLE ordenes_compra ADD COLUMN total_moneda_origen NUMERIC;
ALTER TABLE ordenes_compra ADD COLUMN total_mxn NUMERIC GENERATED ALWAYS AS 
  (total_moneda_origen * COALESCE(tipo_cambio_aplicado, 1)) STORED;

-- Facturas proveedor
ALTER TABLE facturas_proveedor ADD COLUMN moneda TEXT DEFAULT 'MXN';
ALTER TABLE facturas_proveedor ADD COLUMN tipo_cambio_emision NUMERIC(15,6);
ALTER TABLE facturas_proveedor ADD COLUMN tipo_cambio_pago NUMERIC(15,6);
ALTER TABLE facturas_proveedor ADD COLUMN total_moneda_origen NUMERIC;
ALTER TABLE facturas_proveedor ADD COLUMN total_mxn_emision NUMERIC;
ALTER TABLE facturas_proveedor ADD COLUMN total_mxn_pago NUMERIC;
ALTER TABLE facturas_proveedor ADD COLUMN ganancia_perdida_cambiaria NUMERIC 
  GENERATED ALWAYS AS (total_mxn_pago - total_mxn_emision) STORED;
```

### 5.4 Cuentas Bancarias Multi-Moneda

```sql
CREATE TABLE cuentas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_nombre TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  clabe TEXT,
  swift_code TEXT,
  moneda TEXT NOT NULL DEFAULT 'MXN',
  tipo TEXT CHECK (tipo IN (
    'operativa', 'reserva', 'inversion', 'nomina', 'usd_proveedores'
  )),
  saldo_actual NUMERIC,
  saldo_actualizado TIMESTAMPTZ,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.5 Cálculo G/L Cambiario

```sql
-- Realized G/L (al pagar)
CREATE OR REPLACE FUNCTION calcular_realized_gl_pago(
  p_factura_proveedor_id UUID,
  p_fecha_pago DATE,
  p_tipo_cambio_pago NUMERIC
) RETURNS NUMERIC AS $$
DECLARE v_factura RECORD; v_diferencia NUMERIC;
BEGIN
  SELECT * INTO v_factura FROM facturas_proveedor WHERE id = p_factura_proveedor_id;
  IF v_factura.moneda = 'MXN' THEN RETURN 0; END IF;
  v_diferencia := v_factura.total_moneda_origen * 
                  (p_tipo_cambio_pago - v_factura.tipo_cambio_emision);
  RETURN v_diferencia;
END;
$$ LANGUAGE plpgsql;

-- Unrealized G/L (revaluación cierre mes)
CREATE OR REPLACE FUNCTION revaluar_cuentas_pagar_usd(p_fecha_cierre DATE)
RETURNS TABLE (factura_id UUID, monto_usd NUMERIC, tc_original NUMERIC, 
  tc_cierre NUMERIC, diferencia_mxn NUMERIC) AS $$
DECLARE v_tc_cierre NUMERIC;
BEGIN
  v_tc_cierre := obtener_tipo_cambio('USD', p_fecha_cierre, 'banxico_fix');
  RETURN QUERY
  SELECT f.id, f.total_moneda_origen, f.tipo_cambio_emision, v_tc_cierre,
    f.total_moneda_origen * (v_tc_cierre - f.tipo_cambio_emision)
  FROM facturas_proveedor f
  WHERE f.moneda = 'USD' AND f.estado = 'pendiente_pago'
    AND f.fecha_emision <= p_fecha_cierre;
END;
$$ LANGUAGE plpgsql;
```

### 5.6 Edge Function — Sincronización Banxico

```typescript
// supabase/functions/sync-banxico/index.ts
const BANXICO_API = 'https://www.banxico.org.mx/SieAPIRest/service/v1';

export async function sincronizarBanxicoFIX(fecha: string) {
  const url = `${BANXICO_API}/series/SF43718/datos/${fecha}/${fecha}`;
  const response = await fetch(url, {
    headers: { 'Bmx-Token': Deno.env.get('BANXICO_API_TOKEN'), 'Accept': 'application/json' }
  });
  const data = await response.json();
  const fixRate = parseFloat(data.bmx.series[0].datos[0].dato);
  
  await supabase.from('tipos_cambio').insert({
    fecha, moneda_origen: 'USD', moneda_destino: 'MXN',
    tipo: 'banxico_fix', tasa: fixRate, fuente: 'banxico_api'
  });
  return fixRate;
}
// Cron diario 9am
```

---

## 6. Roadmap

| Mes | Entrega |
|-----|---------|
| Junio | Tabla tipos_cambio + multi-moneda proveedores/OCs |
| Julio | Multi-moneda facturas/pagos + cuentas bancarias |
| Agosto | Sync Banxico cron + Realized G/L |
| Septiembre | Revaluación period-end + Dashboard exposición |
| Octubre | Integración Banco Base API |

**Tiempo total:** 5 meses  
**Inversión:** $0 (Banxico API gratis)

---

## 7. Decisiones Pendientes

1. **Tipo cambio default** — Spot o Banxico FIX para OCs?
2. **Precisión decimales** — 2 en montos, 6 en tipo cambio?
3. **Comisiones bancarias** — Al gasto o al producto?
4. **Históricos** — Importar 3 años atrás?
5. **Frecuencia revaluación** — Mensual o semanal?
6. **Aprobación pagos USD** — > $5,000 requiere admin?

---

## 8. Conexión con otros documentos

- /audit/09 Compras (OCs USD)
- /audit/20 Tesorería (cuentas bancarias)
- /audit/22 Productos (CPP en MXN)
- /audit/19 Dashboard (exposición KPI)

### Nuevo Principio — MONEDA FUNCIONAL Y REALIDAD OPERATIVA
"MXN es moneda funcional. USD es realidad operativa. El sistema concilia ambos mundos."

---

## 9. Recomendación final

Replica robustez Oracle Fusion Cloud + 3 únicos MX (Banxico, Banco Base, DOF). Costo $0 vs $50K+ Oracle.

**Orden:** Jun-Oct 2026, 5 meses de implementación gradual.

---

*ALMASA-OS · Multi-Moneda y Divisas · v1.0*  
*Generado el 10 de mayo de 2026*  
*Operación internacional con la robustez de Oracle. Sin licencia de Oracle.*
