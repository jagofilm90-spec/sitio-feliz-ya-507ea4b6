# Rediseño de Pedidos / Ventas — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de pedidos + decisiones operativas + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El corazón comercial de ALMASA, conectado al ledger.

---

## 1. La filosofía

Pedidos no es solo "un cliente quiere productos". Es el momento donde 
ALMASA hace una promesa: "te entregaremos esto, en este momento, 
a este precio". Y esa promesa cruza inventario, crédito, rutas, 
facturación, comisiones y cobranza.

Si pedidos falla, todo lo demás falla.

> Principio rector: "Pedido aprobado = stock apartado, crédito 
> verificado, ruta asignada. Sin estas tres, el pedido es un deseo, 
> no una promesa."

Este documento define:
- Cómo se crea un pedido (4 canales)
- Cómo se valida (stock, crédito, precio)
- Cómo evoluciona (9 estados)
- Cómo conecta con báscula (precio dual)
- Cómo se calculan comisiones
- Cómo se modifica post-aprobación

---

## 2. Estado actual de pedidos

ALMASA-OS tiene un módulo de pedidos MUY MADURO:

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Tabla pedidos | ✅ 38 campos | Identificación, financiero, fechas, alertas |
| Tabla pedidos_detalles | ✅ 17 campos | Precio dual prep, autorización, división |
| Estados workflow | ✅ 9 estados | borrador → entregado → por_cobrar |
| Folios atómicos | ✅ RPC | pg_advisory_xact_lock |
| Creación multi-canal | ✅ 4 canales | Vendedor, secretaria, email IA, cotización |
| Workflow aprobación | ✅ Completo | Alertas precio (error_dedo, bajo_costo) |
| Modificación en carga | ✅ Completo | Agregar producto, dividir línea |
| Audit trail | ✅ Con IP | pedidos_historial_cambios |
| Multi-cliente jerarquía | ✅ Grupo→RS→PDE | Holdings soportados |
| Cotizaciones | ✅ 4 patrones | Conversión a pedido |
| Pedidos programados | 🟡 Parcial | dia_fijo_semanal + cron, sin UI |
| Offline vendedor | ✅ Completo | offlineQueue.ts IndexedDB |
| Reservas de stock | ❌ NO existe | Múltiples vendedores = conflicto |
| Comisiones server-side | ❌ Solo frontend | Manipulable, sin trigger |
| Validación crédito server | 🟡 Frontend solo | Sin bloqueo real |
| Devolución parcial | ❌ Bug #1B documentado | Pendiente diseño |
| Reconciliación báscula | 🟡 Campos existen | Sin flujo conectado |
| Suscripciones | ❌ No prioritario | Plantillas futuras |

**Conclusión:** Base SÓLIDA. 4-5 brechas críticas que cerrar.

---

## 3. Estándar Oracle / SAP / NetSuite

Los grandes ERPs manejan pedidos con 8 conceptos:

### Concepto 1 — Customer Hub Centralizado
Datos del cliente UNA vez, referenciados en todos lados.

### Concepto 2 — Pricing Engine
Reglas de precio configurables: lista base, descuentos, promociones, 
precios especiales por cliente, volumen, fechas.

### Concepto 3 — Available-to-Promise (ATP)
Antes de aceptar pedido: verificar stock disponible REAL incluyendo 
reservas e in-transit.

### Concepto 4 — Credit Checking
Antes de aceptar pedido: verificar línea de crédito, facturas vencidas, 
saldo.

### Concepto 5 — Order Holds
Pedidos pueden estar EN HOLD por: crédito, stock, precio, aprobación.

### Concepto 6 — Workflow de Aprobación
Rutas configurables según monto, cliente, producto.

### Concepto 7 — Document Flow
Trazabilidad completa: cotización → pedido → entrega → factura → pago.

### Concepto 8 — Change Order Management
Cambios post-aprobación con audit trail completo.

### Estrategias específicas

**Oracle Order Management:** Order-to-Cash end-to-end, hold management, 
configurable workflow.

**SAP Sales & Distribution:** Document flow visible, pricing procedure 
complejo, credit management integrado.

**NetSuite Sales Orders:** UI amigable, templates de pedido, recurring 
orders, e-commerce nativo.

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Multi-canal creación | ✅ 3-4 | ✅ 4 (incluye email IA) | EMPATE |
| Workflow estados | ✅ flexible | ✅ 9 fijos | EMPATE |
| Pricing engine | ✅ complejo | ✅ alertas inteligentes | EMPATE |
| ATP (stock) | ✅ | 🟡 → planeado | ORACLE |
| Reservas stock | ✅ | ❌ → CRÍTICO | ORACLE |
| Credit checking | ✅ | 🟡 → planeado | ORACLE |
| Order holds | ✅ | ❌ → planeado | ORACLE |
| Approval workflow | ✅ por monto | ✅ por precio | EMPATE |
| Document flow | ✅ | ✅ | EMPATE |
| Change orders | ✅ | ✅ + IP | ALMASA |
| Email integration | 🟡 | ✅ IA parser | ALMASA |
| Offline mobile | 🟡 sync | ✅ queue | ALMASA |
| Multi-tier customer | ✅ | ✅ Grupo/RS/PDE | EMPATE |
| Subscriptions | ✅ | 🟡 plantillas futuro | ORACLE |
| Quote-to-Order | ✅ | ✅ 4 patrones | EMPATE |
| Price dual model | ❌ | ✅ ÚNICO | ALMASA |
| Modificación en carga | ❌ | ✅ ÚNICO | ALMASA |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador final (post-implementación):**
ALMASA gana: 6 dimensiones (incluyendo modelo precio dual y modificación en carga - ÚNICOS)
Oracle gana: 4 dimensiones
Empate: 8 dimensiones

ALMASA tiene 2 ventajas únicas que Oracle/SAP NO modelan:
1. Modelo precio dual con báscula
2. Modificación de pedido durante carga (agregar productos, dividir líneas)

---

## 5. Las 5 Brechas Críticas

### Brecha 1 — Reservas de Stock (CRÍTICO MULTI-VENDEDOR)

**Problema:** 4 vendedores en campo viendo mismo stock. 
Vendedor A vende 50 sacos. Vendedor B vende 50. Stock real: 80.
= Conflicto al cargar.

**Solución:**
(Alineado con /audit/08 Cambio 3)

```sql
CREATE TABLE stock_reservaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL,
  lote_id UUID,
  cantidad NUMERIC NOT NULL,
  pedido_id UUID NOT NULL,
  pedido_detalle_id UUID NOT NULL,
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

**Lógica:**
- Pedido creado → APARTA stock
- Pedido autorizado → mantiene reserva
- Carga camión → CONSUME reserva
- Pedido cancelado → LIBERA reserva
- 24h sin acción → EXPIRA automático

**Vista en pedido:** Vendedor ve "disponible_para_venta" no "stock_actual".

**Esfuerzo:** 1-2 semanas  
**Prioridad:** CRÍTICA  
**Bloquea:** Adopción multi-vendedor real

### Brecha 2 — Reconciliación Báscula en Pedidos

**Problema:** Pedido tiene precio ESTIMADO. Después de pesar, hay precio REAL. 
Hoy: campos existen pero NO hay flujo que los conecte.

**Solución:**

Pedido tiene 2 fases formales:

**FASE A — ESTIMADO (al crear):**
- Vendedor captura: 5 sacos azúcar
- Sistema: 5 x 25 kg x $20 = $2,500
- Estado: ESTIMADO
- Cliente APROBÓ comprar

**FASE B — REAL (post-báscula):**
- Almacenista pesa: 1,247 kg
- Sistema recalcula: $24,940
- Decisión almacenista: cobrar real / redondear / ajustar
- Estado: REAL
- Cliente RECIBE y FACTURA

```sql
ALTER TABLE pedidos ADD COLUMN precio_estimado_total NUMERIC;
ALTER TABLE pedidos ADD COLUMN precio_real_total NUMERIC;
ALTER TABLE pedidos ADD COLUMN diferencia_estimado_real NUMERIC GENERATED ALWAYS AS 
  (precio_real_total - precio_estimado_total) STORED;
ALTER TABLE pedidos ADD COLUMN reconciliacion_bascula_completada BOOLEAN DEFAULT false;
```

**Reglas:**
- COMISIÓN se calcula sobre `precio_real_total` (no estimado)
- FACTURA se genera con datos REALES
- Si diferencia > 5%, requiere aprobación admin

**Esfuerzo:** 2 semanas  
**Prioridad:** CRÍTICA  
**Alineado con:** /audit/08 Cambio 7 + /audit/12 Brecha 2

### Brecha 3 — Comisiones Server-side

**Problema:** Cálculo en frontend = manipulable. Sin RPC = sin atomicidad. 
Sin trigger = sin trazabilidad.

**Solución:**

```sql
-- RPC para cálculo de comisiones
CREATE OR REPLACE FUNCTION calcular_comisiones_periodo(
  p_empleado_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE (
  total_ventas NUMERIC,
  total_comision NUMERIC,
  detalles JSONB
) AS $$
BEGIN
  -- Solo pedidos ENTREGADOS en el periodo
  -- Sobre precio_real_total (no estimado)
  -- Aplica % configurado del vendedor
  -- Excluye devoluciones
  RETURN QUERY
  SELECT
    SUM(p.precio_real_total) AS total_ventas,
    SUM(p.precio_real_total * v.porcentaje_comision / 100) AS total_comision,
    jsonb_agg(jsonb_build_object(
      'pedido_id', p.id,
      'folio', p.folio,
      'cliente', c.nombre,
      'venta_real', p.precio_real_total,
      'comision', p.precio_real_total * v.porcentaje_comision / 100,
      'fecha_entrega', p.fecha_entrega_real
    )) AS detalles
  FROM pedidos p
  JOIN vendedores v ON v.empleado_id = p_empleado_id
  JOIN clientes c ON c.id = p.cliente_id
  WHERE p.vendedor_id = p_empleado_id
    AND p.status = 'entregado'
    AND p.fecha_entrega_real BETWEEN p_fecha_inicio AND p_fecha_fin
    AND p.reconciliacion_bascula_completada = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Periodicidad configurable por vendedor:**

```sql
ALTER TABLE empleados ADD COLUMN periodicidad_comision TEXT 
  CHECK (periodicidad_comision IN ('quincenal', 'mensual'));
ALTER TABLE empleados ADD COLUMN porcentaje_comision NUMERIC; -- ej: 2.5%
ALTER TABLE empleados ADD COLUMN bono_meta_mensual NUMERIC; -- ej: $5,000 si supera meta
```

**Trigger automático:**
```sql
CREATE TRIGGER trg_recalcular_comision_pedido
AFTER UPDATE OF status, precio_real_total ON pedidos
FOR EACH ROW
WHEN (NEW.status = 'entregado' AND NEW.reconciliacion_bascula_completada = true)
EXECUTE FUNCTION sync_comision_post_entrega();
```

**Esfuerzo:** 1-2 semanas  
**Prioridad:** IMPORTANTE

### Brecha 4 — Validación de Crédito con HOLD Graduado

**Problema:** Frontend valida → vendedor manipula DOM → salta límite.

**Solución:** Sistema de HOLDS graduados según situación crediticia.

```sql
ALTER TABLE pedidos ADD COLUMN hold_estado TEXT 
  CHECK (hold_estado IN (
    'sin_hold',
    'hold_alerta',          -- < 10% exceso, info
    'hold_secretaria',      -- 10-25% exceso, aprueba secretaria
    'hold_admin',           -- > 25% exceso, aprueba admin
    'hold_critico_moroso'   -- factura vencida >30 días, solo admin
  ));

ALTER TABLE pedidos ADD COLUMN hold_motivo TEXT;
ALTER TABLE pedidos ADD COLUMN hold_aprobado_por UUID;
ALTER TABLE pedidos ADD COLUMN hold_aprobado_fecha TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN hold_motivo_aprobacion TEXT;

CREATE OR REPLACE FUNCTION validar_credito_cliente(
  p_cliente_id UUID,
  p_monto_pedido NUMERIC
)
RETURNS TABLE (
  puede_proceder BOOLEAN,
  hold_estado TEXT,
  motivo TEXT,
  saldo_actual NUMERIC,
  limite_credito NUMERIC,
  facturas_vencidas_count INTEGER,
  facturas_vencidas_dias INTEGER
) AS $$
DECLARE
  v_saldo NUMERIC;
  v_limite NUMERIC;
  v_vencidas_count INTEGER;
  v_vencidas_dias INTEGER;
  v_exceso_pct NUMERIC;
BEGIN
  -- Obtener saldo actual + facturas vencidas
  SELECT 
    COALESCE(SUM(saldo_pendiente), 0),
    limite_credito,
    COUNT(*) FILTER (WHERE fecha_vencimiento < CURRENT_DATE),
    COALESCE(MAX(EXTRACT(DAY FROM CURRENT_DATE - fecha_vencimiento)), 0)
  INTO v_saldo, v_limite, v_vencidas_count, v_vencidas_dias
  FROM facturas WHERE cliente_id = p_cliente_id;
  
  -- Regla 1: facturas vencidas > 30 días = HOLD CRÍTICO
  IF v_vencidas_dias > 30 THEN
    RETURN QUERY SELECT false, 'hold_critico_moroso', 
      'Factura vencida hace ' || v_vencidas_dias || ' días',
      v_saldo, v_limite, v_vencidas_count, v_vencidas_dias;
    RETURN;
  END IF;
  
  -- Regla 2: calcular exceso
  v_exceso_pct := ((v_saldo + p_monto_pedido - v_limite) / v_limite) * 100;
  
  IF v_exceso_pct < 0 THEN
    RETURN QUERY SELECT true, 'sin_hold', 'OK', v_saldo, v_limite, 0, 0;
  ELSIF v_exceso_pct < 10 THEN
    RETURN QUERY SELECT true, 'hold_alerta', 
      'Cerca del límite (excede ' || ROUND(v_exceso_pct, 1) || '%)',
      v_saldo, v_limite, v_vencidas_count, v_vencidas_dias;
  ELSIF v_exceso_pct < 25 THEN
    RETURN QUERY SELECT false, 'hold_secretaria',
      'Excede límite ' || ROUND(v_exceso_pct, 1) || '%',
      v_saldo, v_limite, v_vencidas_count, v_vencidas_dias;
  ELSE
    RETURN QUERY SELECT false, 'hold_admin',
      'Excede límite gravemente ' || ROUND(v_exceso_pct, 1) || '%',
      v_saldo, v_limite, v_vencidas_count, v_vencidas_dias;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Reglas finales:**

| Situación | HOLD | Quién libera |
|-----------|------|--------------|
| Sin exceso | sin_hold | — |
| Excede < 10% | hold_alerta | Sistema (solo nota) |
| Excede 10-25% | hold_secretaria | Secretaria |
| Excede > 25% | hold_admin | Admin (Jose) |
| Factura vencida > 30 días | hold_critico_moroso | Solo Admin |

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE

### Brecha 5 — UI Gestión de Pedidos Programados

**Problema:** Campo `dia_fijo_semanal` existe + cron `notificar-pedidos-programados`, 
pero NO hay UI para gestionar.

**Solución:**

Pantalla nueva en /admin/pedidos-programados:
- Lista de clientes con día fijo
- Próximos pedidos programados (preview 7 días)
- Editar día fijo
- Activar/desactivar programación
- Histórico de generación automática

**No es suscripción:** Cliente sigue dictando contenido cada vez. 
Solo se PROGRAMA el día de visita/captura.

**Esfuerzo:** 3-5 días  
**Prioridad:** NICE

---

## 6. Suscripciones / Plantillas — DESCARTADO POR AHORA

**Decisión:** No implementar suscripciones automáticas.

**Razón:** Los clientes recurrentes de ALMASA NO piden lo mismo cada 
vez. Cantidades varían según necesidad. La automatización sería 
inexacta.

**Alternativa futura:** "Plantillas de Pedido Frecuente"
- Lista de productos que cliente SUELE pedir
- Cantidades VACÍAS (cliente las dicta)
- Vendedor las pre-carga, ahorra búsqueda en catálogo
- Diferente a suscripción (no autogenera nada)

**Cuándo:** Cuando ALMASA tenga 50+ clientes recurrentes y se 
justifique el tiempo de desarrollo.

---

## 7. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/13 generado |
| Junio | Brecha 1: Reservas stock (alineado con Inv Fase 2) |
| Julio | Brecha 2: Reconciliación báscula en pedidos |
| Julio | Brecha 4: HOLD graduado de crédito |
| Agosto | Brecha 3: Comisiones server-side |
| Agosto | Brecha 5: UI pedidos programados |
| Septiembre | Bug #1B: Devolución parcial cliente |

**Tiempo total:** 4-5 meses  
**Inversión:** $0 software (solo desarrollo)

---

## 8. Decisiones de Negocio Pendientes

### Decisión 1 — Tiempo de expiración de reservas
Default: 24 horas. Es correcto? Si pedido va a almacén el día 
siguiente, es suficiente.

### Decisión 2 — Periodicidad de comisión por vendedor
- Carlos: quincenal o mensual?
- Salvador: quincenal o mensual?
- Martín: quincenal o mensual?
- Venancio: quincenal o mensual?

### Decisión 3 — Porcentaje de comisión
- Por vendedor o estándar?
- Bono por meta superada?

### Decisión 4 — Umbral exacto de HOLD
- 10/25% o ajustar?
- Días vencimiento crítico (30, 45, 60)?

### Decisión 5 — Diferencia báscula que requiere aprobación
- Propuesto: > 5%
- Aceptable?

### Decisión 6 — Quién aprueba HOLD secretaria
- Cualquier secretaria?
- Solo una específica?

---

## 9. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #1 (Privacidad por rol): vendedor solo ve sus comisiones
- Principio #2 (AirDrop digital): pedido fluye vendedor→admin→almacén→chofer
- Principio #5 (Utilidad en tres niveles): comisión sobre venta REAL
- Principio #6 (Doble Unidad): precio estimado vs real
- Principio #10 (Users Before Perfection): sin suscripciones complejas

### Conexiones cruzadas:
- /audit/07-FACTURACION: factura se genera con datos REALES
- /audit/08-INVENTARIO: reservas + reconciliación báscula
- /audit/09-COMPRAS: aprovisionamiento responde a demanda de pedidos
- /audit/11-ROLES-Y-SEGURIDAD: HOLDs requieren aprobación según rol
- /audit/12-RASTREO: cada cambio de pedido logea evidencia

---

## 10. Recomendación final

ALMASA-OS Pedidos es uno de los módulos más maduros del sistema.
4 canales de creación, 9 estados, modificación en carga, offline 
para vendedor, audit trail con IP. Tiene VENTAJAS ÚNICAS sobre 
Oracle/SAP (modificación en carga, modelo precio dual, parser IA email).

Las 5 brechas son específicas:
1. RESERVAS DE STOCK — bloqueante para multi-vendedor
2. RECONCILIACIÓN BÁSCULA — alinea con precio dual
3. COMISIONES SERVER-SIDE — confiabilidad y trazabilidad
4. HOLD GRADUADO — protege flujo de caja
5. UI PEDIDOS PROGRAMADOS — completa funcionalidad existente

**Orden estricto:**
1. JUNIO: Brecha 1 (reservas) — junto con Inventario Fase 2
2. JULIO: Brecha 2 (báscula) + Brecha 4 (crédito)
3. AGOSTO: Brecha 3 (comisiones) + Brecha 5 (UI programados)

Una vez completas las 5 brechas + Bug #1B (devolución), ALMASA-OS 
Pedidos será **superior a Oracle Order Management para mayoreo de 
abarrotes**, con costo $0 y ventajas únicas no replicables 
(modelo precio dual, modificación en carga, IA email).

---

*ALMASA-OS · Rediseño de Pedidos / Ventas · v1.0*  
*Generado el 10 de mayo de 2026*  
*El corazón comercial de ALMASA, conectado al ledger.*
