# Rediseño de Inventario — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 8 de Mayo 2026  
**Origen:** Auditoría técnica + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El corazón operativo de ALMASA, repensado.

---

## 1. La tesis

El inventario es el corazón operativo de ALMASA. Una distribuidora de mayoreo de abarrotes vive o muere por la calidad de su manejo de inventario.

Hoy ALMASA-OS tiene una base sólida — 7 triggers, 5 RPCs, 8 flujos operativos — pero con deudas claras que se vuelven críticas al digitalizar la operación con múltiples vendedores en campo simultáneamente.

Este documento aplica la metodología que define ALMASA-OS:

> 1. Investigar antes de actuar
> 2. Estudiar cómo lo hacen Oracle, SAP, NetSuite
> 3. Proponer cómo lo hacemos nosotros igual o mejor

**Hallazgo crítico de esta auditoría:** ALMASA tiene una realidad operativa que Oracle, SAP y NetSuite NO modelan correctamente — el manejo dual de unidades contables (sacos, cajas) vs unidades facturables (kilos, litros) con reconciliación en báscula al momento de carga. Esto no es un bug en ALMASA-OS. Es una característica única del mayoreo de abarrotes mexicano que ALMASA-OS debe codificar como ventaja competitiva.

---

## 2. Diagnóstico actual

### Tablas relacionadas

- **inventario_lotes** — Lotes individuales con cantidad, precio_compra, fecha_caducidad, bodega_id
- **inventario_movimientos** — Audit trail de movimientos (entrada/salida/ajuste/merma/transferencia)
- **productos** — Agregados (stock_actual, stock_minimo, costo_promedio_ponderado)
- **bodegas** — Ubicaciones físicas con detección WiFi/GPS
- **carga_productos** — Qué se cargó al camión por entrega
- **productos_stock_bajo** — VIEW de alerta

### Triggers activos (7)

1. `trg_sync_stock_on_lote_insert/update/delete` → recalcula stock_actual desde SUM(lotes)
2. `trg_actualizar_costo_promedio` → recalcula CPP
3. `update_stock_on_movement` → actualiza stock + notifica stock bajo
4. `update_inventario_lotes_updated_at` → timestamp

### RPCs disponibles (5)

1. `decrementar_lote(lote_id, cantidad)` — con lock FOR UPDATE
2. `incrementar_lote(lote_id, cantidad)`
3. `registrar_baja_caducidad(...)` — atómica con movimiento
4. `registrar_devolucion_proveedor(...)` — atómica con movimiento
5. `calcular_costo_promedio_ponderado(producto_id)`

### Flujos que modifican inventario (8)

| # | Flujo | Atómico | Auditoría |
|---|-------|---------|-----------|
| 1 | Recepción mercancía | No | Via triggers |
| 2 | Alta producto stock inicial | No | Via triggers |
| 3 | Carga de camión | RPC | Sin movimiento |
| 4 | Cancelar carga | RPC | Sin movimiento |
| 5 | Baja por caducidad | RPC | Completa |
| 6 | Devolución a proveedor | RPC | Completa |
| 7 | Ajuste manual almacén | No | Sin lock |
| 8 | Movimiento manual admin | No | No toca lotes |

### Problemas identificados

**BLOQUEANTE PARA ADOPCION — Sin reservas de stock**
Hoy funciona porque ALMASA opera en papel con reconciliación central. Cuando haya 4 vendedores creando pedidos en tiempo real, sin reservas se generan ventas duplicadas del mismo stock.

**BLOQUEANTE PARA OPERACION — Sin modelo de precio dual**
ALMASA vende productos con DOS modelos coexistiendo (precio fijo por unidad vs precio variable por kilo). El sistema actual no maneja la reconciliación báscula al momento de carga. Hoy se hace mentalmente, pero al digitalizar es indispensable codificarlo.

**CRITICO — Carga de camión sin trail (flujos #3 y #4)**
Mercancía sale del almacén al camión sin registro en inventario_movimientos. Si se pierde en ruta, no hay evidencia.

**CRITICO — Movimiento manual sin tocar lotes (flujo #8)**
Inventario.tsx inserta movimientos directos sin actualizar inventario_lotes. Con el tiempo, SUM(lotes) != stock_actual.

**IMPORTANTE — Doble trigger de stock**
sync_stock_from_lotes y update_product_stock ambos mantienen stock_actual. Riesgo de divergencia.

**IMPORTANTE — CPP solo precio proveedor**
No incluye flete, cuadrilla, aduana. Subreporta costo real.

---

## 3. Cómo lo hacen Oracle, SAP, NetSuite

Los grandes ERPs comparten 6 conceptos fundamentales:

### Concepto 1 — Inventory Ledger (Libro Mayor)
Registro inmutable de toda transacción. Append-only. Si te equivocas, insertas reverso. Nunca UPDATE ni DELETE.

### Concepto 2 — Stock Snapshot
Estado computado del inventario. Se calcula sumando el ledger. El ledger es la verdad, el snapshot es vista.

### Concepto 3 — Stock Reservations (Apartados)
Cuando se crea pedido, aparta stock. Vendedor B no puede vender lo que A apartó.

### Concepto 4 — Valuation Methods (Costeo)
FIFO, LIFO, Weighted Average (CPP), Specific ID, Standard Cost. CPP en Oracle/SAP incluye TODOS los costos hasta llegar a bodega = TRUE LANDED COST.

### Concepto 5 — Warehouse Transfers
Movimiento entre bodegas con estado pendiente → en_tránsito → recibido.

### Concepto 6 — Cycle Counting
Conteos físicos periódicos. Plan, captura, comparación, ajuste.

### El gap fundamental: Modelo de unidades

Oracle/SAP/NetSuite asumen UNA unidad por producto. Si vendes "saco", el sistema cuenta sacos. Si vendes "kg", cuenta kilos. **Ninguno modela bien la realidad de ALMASA**: vender en sacos pero cobrar por kilo, con reconciliación física al momento de carga.

ALMASA-OS no debe copiar este modelo simplificado. Debe construir uno mejor.

---

## 4. Los 4 principios

### Principio 1 — Estado computado, no booleano
Stock derivado del ledger. Una sola fuente de verdad.

### Principio 2 — Una sola RPC para movimientos
Todos los flujos pasan por la misma función. Atomicidad y auditoría garantizadas.

### Principio 3 — Doble unidad: contable + facturable
Almacén cuenta unidades físicas (sacos, cajas). Facturación cobra por unidad facturable (kilos, piezas). Sistema respeta ambas dimensiones.

### Principio 4 — Reconciliación al momento de carga
Para productos por peso, la verdad fiscal se determina en báscula al cargar el camión, no en el pedido inicial.

---

## 5. Los 7 cambios propuestos

### Cambio 1 — Inventario_movimientos como ledger único

**Problema:** Doble trigger puede divergir. 2 fuentes de verdad.

**Solución:**
- inventario_movimientos = LEDGER UNICO
- inventario_lotes.cantidad_disponible = derivado del ledger
- productos.stock_actual = derivado del ledger
- Eliminar trigger sync_stock_from_lotes
- Mantener solo update_stock_on_movement

**Regla:** TODA modificación de inventario pasa por INSERT en inventario_movimientos.

**Ventaja sobre Oracle:** Más simple. El ledger ES la transacción.

### Cambio 2 — RPC unificada registrar_movimiento_inventario

**Problema:** 8 flujos modifican inventario. 3 atómicos, 5 no.

**Solución:** Una sola RPC para TODOS los movimientos.

```sql
registrar_movimiento_inventario(
  producto_id UUID,
  lote_id UUID,
  cantidad NUMERIC,            -- en unidad CONTABLE
  peso_real NUMERIC,           -- en unidad FACTURABLE (opcional)
  tipo_movimiento TEXT,
  referencia_tipo TEXT,
  referencia_id UUID,
  notas TEXT,
  metadata JSONB
)
RETURNS movimiento_id UUID
```

Esta RPC: lock del lote → valida → INSERT movimiento → UPDATE lote → trigger actualiza stock.

**Ventaja sobre Oracle:** Un solo punto de entrada. Oracle tiene una RPC por tipo.

### Cambio 3 — Stock Reservations (Apartados) — CRITICO PARA ADOPCION

**Problema bloqueante:** Múltiples vendedores en campo prometen mismo stock.

**Solución:**

```sql
CREATE TABLE stock_reservaciones (
  id UUID PRIMARY KEY,
  producto_id UUID NOT NULL,
  lote_id UUID,
  cantidad NUMERIC NOT NULL,
  pedido_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours',
  estado TEXT CHECK (estado IN ('activa', 'liberada', 'consumida', 'expirada')),
  notas TEXT
);

CREATE VIEW vw_stock_disponible AS
SELECT
  p.id AS producto_id,
  p.stock_actual,
  COALESCE((
    SELECT SUM(cantidad) FROM stock_reservaciones
    WHERE producto_id = p.id AND estado = 'activa'
      AND fecha_expiracion > now()
  ), 0) AS reservado,
  p.stock_actual - COALESCE((
    SELECT SUM(cantidad) FROM stock_reservaciones
    WHERE producto_id = p.id AND estado = 'activa'
      AND fecha_expiracion > now()
  ), 0) AS disponible_para_venta
FROM productos p;
```

Lógica:
- Vendedor crea pedido → APARTA stock automático
- Almacenista carga camión → CONSUME reserva
- Pedido cancelado → LIBERA reserva
- 24h sin acción → EXPIRA automático (cron)

**Ventaja sobre Oracle:** Auto-expiración con cron nativo.

### Cambio 4 — True Landed Cost en CPP

**Problema:** CPP solo incluye precio proveedor. Subreporta costos.

**Solución:**

```sql
CREATE TABLE gastos_asociados_oc (
  id UUID PRIMARY KEY,
  orden_compra_id UUID NOT NULL,
  tipo_gasto TEXT CHECK (tipo_gasto IN ('flete', 'cuadrilla', 'aduana', 'maniobra', 'seguro', 'otro')),
  monto_total NUMERIC NOT NULL,
  distribucion TEXT CHECK (distribucion IN ('por_peso', 'por_volumen', 'por_cantidad', 'manual')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Modificar calcular_costo_promedio_ponderado:
```
SUM((precio_compra + gastos_distribuidos_proporcional) x cantidad) / SUM(cantidad)
```

**Ventaja sobre Oracle:** Distribución smart por peso, volumen, cantidad o manual.

### Cambio 5 — Carga de camión como movimiento auditable

**Problema:** Flujos #3 y #4 no registran en movimientos.

**Solución:** Eliminar incrementar_lote/decrementar_lote. Reemplazar con la RPC unificada:
- Carga: tipo_movimiento='salida_a_camion', referencia_tipo='entrega'
- Cancelar: tipo_movimiento='entrada_de_camion', referencia_tipo='entrega'

**Ventaja sobre Oracle:** Tracking más granular. Oracle agrupa "shipment" como evento único.

### Cambio 6 — Cycle Counting adaptado a mayoreo

**Solución para ALMASA (sin barcode):**

```sql
CREATE TABLE conteos_ciclicos (
  id UUID PRIMARY KEY,
  bodega_id UUID NOT NULL,
  fecha_planeada DATE NOT NULL,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  estado TEXT CHECK (estado IN ('planeado', 'en_proceso', 'completado', 'cancelado')),
  usuario_responsable UUID NOT NULL,
  notas TEXT
);

CREATE TABLE conteos_ciclicos_detalle (
  id UUID PRIMARY KEY,
  conteo_id UUID NOT NULL,
  producto_id UUID NOT NULL,
  lote_id UUID,
  cantidad_sistema NUMERIC NOT NULL,
  cantidad_fisica NUMERIC,
  diferencia NUMERIC GENERATED ALWAYS AS (cantidad_fisica - cantidad_sistema) STORED,
  ajuste_aplicado BOOLEAN DEFAULT false,
  movimiento_ajuste_id UUID,
  notas TEXT,
  foto_evidencia_url TEXT,
  capturado_por UUID,
  fecha_captura TIMESTAMPTZ
);
```

Flujo:
1. Admin crea plan de conteo (semanal/mensual)
2. Almacenista cuenta físicamente con tablet/móvil
3. Sistema compara y muestra discrepancias
4. Admin aprueba ajustes uno por uno
5. Ajustes generan movimientos tipo 'ajuste_conteo' vía RPC unificada

**SIN BARCODE.** Almacenista cuenta sacos/cajas/cubetas visualmente.

**Ventaja sobre Oracle:** App móvil optimizada para mayoreo. Oracle requiere terminal especializada con barcode obligatorio.

### Cambio 7 — Modelo de Precio Dual con Reconciliación en Báscula — UNICO DE ALMASA

**El gap que Oracle/SAP no resuelven correctamente.**

**Realidad operativa de ALMASA:**

ALMASA vende dos tipos de productos:

**Tipo A — Precio fijo por unidad**
- Ejemplo: Azúcar refinada en saco
- Cliente pide: 1 saco
- Precio: $500 / saco (FIJO)
- El saco pesa lo que pese, se cobra $500
- Peso NO afecta cobro
- NO requiere báscula

**Tipo B — Precio variable por kilo**
- Ejemplo: Alpiste a granel en saco
- Cliente pide: 1 saco (~25 kg estimado)
- Precio: $20 / kg
- Peso REAL determina cobro
- REQUIERE báscula al cargar
- Si pesa 25.5 kg → cobro $510 (utilidad ALMASA)
- Si pesa 24.9 kg → DECISION DEL ALMACENISTA

**Decisión al cargar (caso por caso):**
- El almacenista en báscula DECIDE manualmente:
  - Cobrar peso real (cliente paga 24.9 x $20 = $498)
  - Redondear a estimado (cliente paga 25 x $20 = $500)
- La decisión queda LOGUEADA con motivo
- Política default: tratar de no tener pérdida

**Estructura propuesta:**

```sql
ALTER TABLE productos ADD COLUMN tipo_precio TEXT
  CHECK (tipo_precio IN ('fijo_por_unidad', 'variable_por_peso'));

ALTER TABLE productos ADD COLUMN unidad_venta TEXT;
-- 'saco', 'caja', 'cubeta', 'pieza', 'galon'

ALTER TABLE productos ADD COLUMN unidad_facturable TEXT;
-- 'kg', 'litro', 'pieza' (cuando tipo_precio = 'variable_por_peso')

ALTER TABLE productos ADD COLUMN peso_referencia NUMERIC;
-- 25 (kg estimado por unidad, para calcular pedidos iniciales)

ALTER TABLE productos ADD COLUMN precio_unidad NUMERIC;
-- $500 (si tipo_precio = 'fijo_por_unidad')

ALTER TABLE productos ADD COLUMN precio_facturable NUMERIC;
-- $20 (si tipo_precio = 'variable_por_peso')

ALTER TABLE productos ADD COLUMN tolerancia_diferencia_pct NUMERIC DEFAULT 5;
-- Si diferencia > 5%, requiere aprobación admin
```

**Flujo completo:**

```
1. PEDIDO (vendedor en campo)
   Producto: Alpiste (variable_por_peso)
   Cliente quiere: 5 sacos
   Sistema calcula:
   - cantidad_unidades = 5
   - peso_estimado = 5 x 25 = 125 kg
   - precio_estimado = 125 x $20 = $2,500
   Pedido se aprueba con valor estimado.

2. CARGA EN ALMACEN
   Almacenista carga 5 sacos al camión.
   App móvil pide: "Pesa los sacos en báscula"
   Almacenista pesa: 127.3 kg total
   App calcula: 127.3 x $20 = $2,546 (real)
   Diferencia: +$46 (utilidad ALMASA)
   App pregunta:
   - Cobrar real ($2,546) — recomendado
   - Redondear a estimado ($2,500)
   Almacenista selecciona y confirma.

3. ENTREGA AL CLIENTE
   Cliente firma con peso/precio REAL
   PDF muestra estimado original, real capturado,
   decisión aplicada, total final.

4. FACTURACION
   Se factura con datos REALES de entrega.
   No con estimados de pedido.
```

**Para productos tipo_precio = 'fijo_por_unidad':**
- Cliente pide 5 sacos azúcar
- Pedido: 5 x $500 = $2,500
- Carga: solo confirma cantidad
- NO se pesa, NO hay decisión
- Precio queda en $2,500

**Ventaja única sobre Oracle/SAP:**
Oracle y SAP asumen una sola unidad por producto. ALMASA-OS modela la dualidad real del mayoreo de abarrotes mexicano. Esto es ventaja competitiva codificada.

---

## 6. Por qué será mejor que Oracle

### Ventaja 1 — RPC unificada vs múltiples APIs
Una sola RPC registrar_movimiento_inventario. Menos código, menos bugs.

### Ventaja 2 — Reservas con auto-expiración
Cron nativo. Oracle requiere job manual.

### Ventaja 3 — Distribución smart de costos
Por peso, volumen, cantidad o manual. Oracle distribuye igualmente.

### Ventaja 4 — Cycle counting móvil sin barcode
App optimizada para mayoreo. Oracle requiere barcode + terminal especializada.

### Ventaja 5 — Tracking de carga granular
Cada bulto del almacén al cliente. Oracle agrupa shipment como evento único.

### Ventaja 6 — Modelo de precio dual con reconciliación báscula
Unico en la industria. Oracle/SAP/NetSuite NO modelan esto correctamente. ALMASA-OS lo codifica como ventaja competitiva.

### Ventaja 7 — Tamaño-apropiado
Oracle/SAP diseñados para empresas de miles. ALMASA tiene 30 empleados. Quitamos overhead, automatizamos decisiones.

---

## 7. Roadmap de migración

### Fase 1 — Fundamentos (CRITICO, 1-2 semanas)
- Cambio 1: Ledger único
- Cambio 2: RPC unificada
- Cambio 5: Carga como movimiento

### Fase 2 — Adopción habilitada (CRITICO, 1-2 semanas)
- Cambio 3: Stock Reservations
- Cambio 7: Modelo de Precio Dual con reconciliación

### Fase 3 — Costeo real (IMPORTANTE, 1 semana)
- Cambio 4: True Landed Cost

### Fase 4 — Conteo formal (IMPORTANTE, 1-2 semanas)
- Cambio 6: Cycle Counting con app móvil

### Total estimado: 5-7 semanas para implementación completa

**Las Fases 1 y 2 son bloqueantes para adopción real.** Sin Cambio 3 (reservas) y Cambio 7 (precio dual con báscula), el sistema digital generaría más caos que el papel actual.

---

## 8. Decisiones de negocio pendientes

### Decisión 1 — Tiempo de expiración de reservas
Default propuesto: 24 horas. Correcto para ALMASA?

### Decisión 2 — Método default de distribución de gastos
Por peso? Cantidad? Volumen?

### Decisión 3 — Frecuencia de cycle counting
Diario AAA? Semanal B? Mensual todos?

### Decisión 4 — Permitir stock negativo
Hoy se permite con notificación. Mantener o bloquear?

### Decisión 5 — Tolerancia default de diferencia de peso
Propuesto: 5%. Si diferencia > 5%, requiere aprobación admin.

### Decisión 6 — Permitir override de precio en pedido
El vendedor puede modificar el precio_facturable al crear pedido o es fijo del catálogo?

### Decisión 7 — App de cycle counting
PWA, React Native o tablet web optimizada?

---

## 9. Conexión con Biblia v1

### Módulo M02 — Inventario
Se enriquece con conceptos de ledger único, reservas, true landed cost, modelo de precio dual.

### Módulo M03 — Compras / OC
Captura de gastos asociados (flete, cuadrilla, aduana). Impacta CPP.

### Módulo M04 — Pedidos
Al crear pedido reserva stock. UI muestra disponible_para_venta. Para productos por peso, calcula estimado.

### Módulo M11 — Almacén / Operación física
Cycle counting con app móvil. Reconciliación báscula al cargar productos por peso.

### Módulo M07 — Facturación
Se factura con datos REALES de entrega, no estimados de pedido.

### Principio Transversal — Continuidad Operativa
Ledger único garantiza consistencia. Reconciliación báscula respeta operación real.

### Nuevo Principio Transversal Propuesto — DOBLE UNIDAD
"ALMASA opera en métricas duales: lo que ALMACEN cuenta (sacos, cajas) y lo que FACTURACION cobra (kg, l). El sistema respeta esta dualidad. Forzar una sola unidad rompe la operación."

---

## 10. Recomendación final

Este rediseño no es opcional. Las Fases 1 y 2 son **bloqueantes para la adopción real con múltiples vendedores simultáneos y operación física correcta**.

Sin Cambio 3 (reservas) y Cambio 7 (precio dual), el sistema digital sería peor que el papel actual.

**Orden estricto de ejecución:**
1. Fase 1 (fundamentos) — sin esto todo lo demás se construye sobre arena
2. Fase 2 (reservas + precio dual) — habilita adopción multi-vendedor
3. Fase 3 (landed cost) cuando haya volumen fiscal
4. Fase 4 (cycle counting) cuando operación digitalizada

Total: 5-7 semanas de trabajo dedicado.

---

*ALMASA-OS · Rediseño de Inventario · v1.0*
*Generado el 8 de mayo de 2026*
*Documento de diseño · Pendiente decisión y ejecución*
*El corazón operativo de ALMASA, repensado.*
