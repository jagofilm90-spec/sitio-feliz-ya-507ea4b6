# Extensiones del Módulo de Compras — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 8 de Mayo 2026  
**Origen:** Auditoría técnica + metodología "Pensar como Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El módulo más maduro de ALMASA-OS, elevado al estándar Procure-to-Pay.

---

## 1. La tesis

A diferencia de Facturación (rediseño necesario) e Inventario (gaps críticos), el módulo de Compras de ALMASA-OS es el **más maduro del sistema**. No necesita rediseño — necesita extensiones.

Con 18 tablas, 8 RPCs, 9 Edge Functions, 14 estados de OC, flujo completo de pago anticipado/contra entrega, y funcionalidades v3 únicas (Score de confiabilidad, Timeline con eventos auto-generados, Comparador de precios), ALMASA-OS ya supera a NetSuite básico en Procure-to-Pay.

Este documento propone 6 extensiones que lo elevan al nivel de Oracle Procurement Cloud Premium, manteniendo el costo y simplicidad de ALMASA.

---

## 2. Estado actual — Lo que YA funciona

### Ciclo de vida completo (14 status)

```
pendiente → pendiente_autorizacion → autorizada → enviada → confirmada
→ parcial/recibida → completada → cerrada
   ↓                    ↓
rechazada             cancelada

(Si anticipado: pendiente_pago → autorizada → ... )
```

### Funcionalidades operativas (todas en producción)

| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Crear OC (2 wizards) | Producción | Legacy dialog + v3 page |
| Folio atómico | Producción | RPC con advisory lock |
| Autorizar/Rechazar | Producción | Push notification al creador |
| Enviar PDF al proveedor | Producción | Gmail API + PDF auto |
| Recepción con firmas | Producción | Multi-lote, sellos, evidencia |
| Faltantes + sync KPIs | Producción | Corregido hoy con trigger |
| Devoluciones atómicas | Producción | Corregido hoy con RPC |
| Conciliación factura | Producción | 3 paths (full/rápida/ajuste) |
| Pago anticipado | Producción | Con comprobante upload |
| Pago contra entrega | Producción | Con ajuste de costos inline |
| Pagos parciales | Producción | status_pago: pendiente/parcial/pagado |
| Créditos proveedor | Producción | Aplicar en OC nueva |
| Calendario entregas | Producción | Calendar + badges ocupación |
| Score proveedor v3 | Producción | RPC get_proveedor_score |
| Timeline proveedor v3 | Producción | Eventos auto + manuales |
| Comparador precios v3 | Producción | Hook + UI |
| Sugerencias reabastecimiento | Producción | Tab con urgencia/consumo |
| Analytics compras | Producción | Charts por proveedor/mes |

### Lo que NO existe hoy

| Funcionalidad | Estado |
|--------------|--------|
| Requisiciones / pre-OC | No existe |
| Multi-cotización RFQ | No existe |
| 3-Way Match unificado | Parcial (existe por partes, no unificado) |
| Vendor Portal | No existe |
| Contratos Marco | No existe |
| Notas de crédito SAT | No existe |

---

## 3. Cómo lo hacen Oracle, SAP, NetSuite

### Oracle Procurement Cloud — Flujo completo

```
Requisition → RFQ → Quote Comparison → Purchase Order
→ Goods Receipt → Invoice Match → Payment
```

### Los 6 conceptos que ALMASA puede adoptar

### Concepto 1 — 3-Way Match
Comparar automáticamente: OC (qué pediste) vs Recepción (qué llegó) vs Factura (qué te cobran). Si los 3 coinciden, pago automático. Si no, alerta.

### Concepto 2 — Approval Workflow por montos
Reglas de negocio: OC < $10K auto-aprobada, $10-100K aprueba admin, > $100K aprueba dueño + contadora.

### Concepto 3 — Requisiciones (Pre-OC)
Documento previo: "necesitamos X producto". Pasa por aprobación. Si aprobada, genera OC. Trazabilidad de quién pidió qué.

### Concepto 4 — RFQ (Request for Quotation)
Enviar solicitud de cotización a N proveedores. Comparar respuestas. Elegir mejor oferta. Generar OC del ganador.

### Concepto 5 — Vendor Portal (Portal Proveedor)
Proveedor accede vía web a ver sus OCs, confirmar entregas, subir facturas. Reduce 80% de emails operativos.

### Concepto 6 — Contratos Marco (Blanket Agreements)
Acuerdo de largo plazo: "te compro X toneladas al año a precio Y". Auto-genera OCs según calendario. Tracking de cumplimiento.

---

## 4. Los 6 cambios propuestos

### Cambio 1 — Vista 3-Way Match (CRITICO)

**Problema:** OC, recepción y factura existen pero se revisan por separado.

**Solución:** Vista unificada que muestre por producto:

```
Producto | OC (pedido) | Recepción (llegó) | Factura (cobrado) | Match
Azúcar   | 100 sacos   | 95 sacos          | 95 sacos          | ✅ Parcial
         | $500/saco   | —                  | $520/saco         | ⚠️ +4%
Alpiste  | 50 sacos    | 50 sacos          | 48 sacos          | ❌ Discrepancia
```

**Reglas de match:**
- Cantidad: tolerancia configurable (default 0%)
- Precio: tolerancia configurable (default 5%)
- Si match completo: habilitar pago
- Si discrepancia: bloquear pago + notificar admin

**Dónde vive:** Nueva pestaña en Compras o dialog desde OC recibida.

**Tiempo estimado:** 1 semana

### Cambio 2 — Approval Workflow por montos (IMPORTANTE)

**Problema:** Toda OC requiere aprobación manual del admin, sin importar el monto.

**Solución:**

```sql
CREATE TABLE reglas_aprobacion_oc (
  id UUID PRIMARY KEY,
  monto_minimo NUMERIC NOT NULL,
  monto_maximo NUMERIC,
  roles_aprobadores TEXT[] NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);
```

**Reglas propuestas:**
- < $10,000: auto-aprobada
- $10,000 - $100,000: admin aprueba
- $100,000 - $500,000: admin + contadora
- > $500,000: dueño + contadora

**El wizard detecta monto y aplica la regla correcta automáticamente.**

**Tiempo estimado:** 1 semana

### Cambio 3 — Requisiciones / Pre-OC (NICE)

**Problema:** No hay trazabilidad de "quién pidió qué y por qué".

**Solución:**

```sql
CREATE TABLE requisiciones (
  id UUID PRIMARY KEY,
  folio TEXT UNIQUE,
  solicitante_id UUID NOT NULL,
  motivo TEXT CHECK (motivo IN ('pedido_cliente', 'stock_minimo', 'producto_especial', 'otro')),
  status TEXT CHECK (status IN ('borrador', 'pendiente', 'aprobada', 'rechazada', 'convertida')),
  orden_compra_id UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE requisiciones_detalles (
  id UUID PRIMARY KEY,
  requisicion_id UUID NOT NULL,
  producto_id UUID NOT NULL,
  cantidad NUMERIC NOT NULL,
  proveedor_sugerido_id UUID,
  notas TEXT
);
```

**Flujo:**
1. Vendedor o almacenista crea requisición
2. Admin aprueba/rechaza
3. Si aprobada: genera OC automáticamente
4. Trazabilidad: OC → requisición → quien la pidió

**Tiempo estimado:** 2 semanas

### Cambio 4 — RFQ Multi-cotización (NICE)

**Problema:** Se compra al proveedor habitual sin comparar precios.

**Solución:**

```sql
CREATE TABLE rfq (
  id UUID PRIMARY KEY,
  folio TEXT UNIQUE,
  productos JSONB NOT NULL,
  proveedores_invitados UUID[] NOT NULL,
  fecha_limite DATE NOT NULL,
  status TEXT CHECK (status IN ('abierto', 'cerrado', 'adjudicado')),
  ganador_proveedor_id UUID,
  ganador_oc_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfq_respuestas (
  id UUID PRIMARY KEY,
  rfq_id UUID NOT NULL,
  proveedor_id UUID NOT NULL,
  precios JSONB NOT NULL,
  condiciones TEXT,
  fecha_respuesta TIMESTAMPTZ DEFAULT now()
);
```

**Flujo:**
1. Admin crea RFQ con lista de productos
2. Sistema envía email a N proveedores
3. Proveedores responden con precios
4. Admin compara en tabla lado a lado
5. Adjudica al ganador: genera OC automáticamente

**Tiempo estimado:** 2-3 semanas

### Cambio 5 — Vendor Portal Pareto (FUTURO)

**Principio Pareto:** 5-10 proveedores representan 80% de las compras. Solo ellos necesitan portal.

**Funcionalidades del portal:**
- Ver OCs pendientes de confirmación
- Confirmar fecha de entrega
- Subir factura CFDI (XML + PDF)
- Ver historial de pagos
- Ver devoluciones y créditos
- Chat directo con compras ALMASA

**Arquitectura:** Ruta /portal-proveedor (similar a /portal-cliente). Auth con rol 'proveedor'. RLS por proveedor_id.

**Beneficios:**
- Reduce 80% emails operativos con proveedores grandes
- Proveedor auto-gestiona su información
- Facturas se cargan directamente (no vía email)
- Confirmaciones de entrega en tiempo real

**Tiempo estimado:** 4-6 semanas

### Cambio 6 — Contratos Marco / Blanket Agreements (FUTURO)

**Para proveedores con compra recurrente predecible.**

```sql
CREATE TABLE contratos_proveedor (
  id UUID PRIMARY KEY,
  proveedor_id UUID NOT NULL,
  folio TEXT UNIQUE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  status TEXT CHECK (status IN ('borrador', 'activo', 'vencido', 'cancelado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contratos_proveedor_lineas (
  id UUID PRIMARY KEY,
  contrato_id UUID NOT NULL,
  producto_id UUID NOT NULL,
  cantidad_anual NUMERIC NOT NULL,
  precio_acordado NUMERIC NOT NULL,
  frecuencia_entrega TEXT,
  cantidad_entregada NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Beneficios:**
- Mejor precio por volumen
- Predictibilidad de inventario
- Auto-creación de OCs según contrato
- Alerta si proveedor no cumple volúmenes

**Tiempo estimado:** 3-4 semanas

---

## 5. Módulo Lecaroz — Estado y recomendación

### Estado actual
6 archivos + 3 tablas + 3 rutas. Mini-módulo vertical completo para 1 cliente grande. Funcional pero acoplado al core.

### Archivos
- LecarozCotizaciones.tsx — Lista de cotizaciones mensuales
- LecarozCotizacionEditor.tsx — Editor con líneas específicas
- LecarozBandeja.tsx — Bandeja de emails filtrada
- VerificacionRapidaLecaroz.tsx — Verificación rápida de pedido
- LecarozPreviewModal.tsx — Preview de cotización
- lecarozParser.ts — Parser de emails

### Tablas
- cotizaciones_lecaroz, cotizacion_lecaroz_lineas, tandas_lecaroz, email_log_lecaroz

### Recomendación
Mantener como está. Si en el futuro otros clientes grandes necesitan flujos similares, generalizar el patrón Lecaroz en un "módulo de clientes especiales" configurable.

---

## 6. Por qué ALMASA está mejor posicionado que Oracle

### Ventaja 1 — Funcionalidades v3 nativas
Oracle vende SRM como módulo separado. ALMASA tiene Score + Timeline + Comparador integrados al core.

### Ventaja 2 — Architecture cloud-native
Oracle requiere infraestructura on-premise o licencias caras. ALMASA usa Supabase + Edge Functions = costo marginal cercano a cero.

### Ventaja 3 — Workflow específico para distribución
Oracle es genérico para cualquier industria. ALMASA está optimizado para mayoreo de abarrotes con flujos como multi-lote en recepción, faltantes con notificación al proveedor, calendario de entregas con detección de bodega.

### Ventaja 4 — UX moderna (Lovable)
Oracle tiene UX corporativa de los 2000s. ALMASA tiene UX contemporánea.

### Ventaja 5 — Tamaño-apropiado
Para una distribuidora de 30 empleados, Oracle es 10x más complejo de lo necesario. ALMASA tiene la potencia justa.

### Ventaja 6 — Vendor Portal Pareto
Oracle forza portal a TODOS los proveedores. ALMASA solo a los 5-10 grandes que importan. Más adopción real, menos resistencia.

---

## 7. Roadmap de extensiones

### Fase 1 — 3-Way Match (1 semana, CRITICO)
Cambio 1. Vista unificada de conciliación. Bloqueante para control fiscal estricto.

### Fase 2 — Approval Workflow (1 semana, IMPORTANTE)
Cambio 2. Reglas por monto. Importante cuando el volumen de OCs crezca.

### Fase 3 — Requisiciones (2 semanas, NICE)
Cambio 3. Pre-OC con trazabilidad. Útil cuando haya múltiples vendedores creando necesidades.

### Fase 4 — RFQ Multi-cotización (2-3 semanas, NICE)
Cambio 4. Comparar 3-5 proveedores antes de comprar. Valioso para optimización de costos.

### Fase 5 — Vendor Portal (4-6 semanas, FUTURO)
Cambio 5. Portal para 5-10 proveedores grandes. Reduce 80% comunicación email operativa.

### Fase 6 — Contratos Marco (3-4 semanas, FUTURO)
Cambio 6. Acuerdos de largo plazo formales. Cuando ALMASA tenga relaciones consolidadas.

### Total estimado: 13-17 semanas para todas las extensiones

**Las Fases 1 y 2 son las únicas críticas.** Las demás son extensiones de valor que se implementan cuando ALMASA crece y requiere las funcionalidades.

---

## 8. Decisiones de negocio pendientes

### Decisión 1 — Niveles de aprobación por monto
Reglas propuestas:
- < $10,000: auto
- $10,000-$100,000: admin
- $100,000-$500,000: admin + contador
- > $500,000: dueño + contador

Correcto para ALMASA?

### Decisión 2 — Tipos de motivo de requisición
Propuesto: pedido_cliente, stock_minimo, producto_especial, otro. Falta alguno?

### Decisión 3 — RFQ obligatorio sobre cierto monto
Toda OC > $X debe pasar por RFQ con al menos 3 cotizaciones? O es opcional siempre?

### Decisión 4 — Vendor Portal: qué proveedores empiezan
Lista propuesta para piloto: Sigma, Lecaroz, Lala, otros?

### Decisión 5 — Contratos marco: ajuste anual
Ajuste por inflación INPC? Negociación anual? Fijo?

### Decisión 6 — 3-Way Match: bloqueo de pago
Si discrepancia: bloqueo total o solo alerta?

---

## 9. Conexión con Biblia v1

### Módulo M03 — Compras
La Biblia describe Compras como módulo completo. Este documento agrega 6 extensiones que lo elevan a Procure-to-Pay completo estilo Oracle, manteniendo las funcionalidades v3 únicas de ALMASA.

### Módulo M07 — Facturación (cruzado)
3-Way Match conecta directamente con el rediseño de facturación del documento /audit/07. Una OC se cierra cuando su factura proveedor coincide con su recepción.

### Módulo M02 — Inventario (cruzado)
Las extensiones de Compras conectan con el rediseño de Inventario del documento /audit/08. Especialmente: gastos asociados (true landed cost) se capturan en OC, faltantes generan movimiento de inventario, devoluciones decrementan stock.

### Principio Transversal — Continuidad Operativa
3-Way Match garantiza que ALMASA NO pague mercancía que no llegó. Approval workflow garantiza que NO se gaste sin autorización.

### Nuevo Principio Transversal Propuesto — VENTAJA POR INTEGRACION
"ALMASA-OS no es la suma de sus módulos. Es la INTEGRACION entre ellos. Compras conoce Inventario, Inventario conoce Pedidos, Pedidos conocen Facturación. Esta integración es la ventaja sobre Oracle / SAP que tienen módulos sueltos."

---

## 10. Recomendación final

A diferencia de los rediseños 07 (Facturación) y 08 (Inventario), el módulo de Compras NO requiere acción urgente. Es el más maduro.

**Orden recomendado:**

1. **AHORA (0-3 meses):** Solo Cambio 1 (3-way match). Es crítico para control fiscal y aprovecha lo que ya tienes.

2. **Cuando crezca el volumen (3-6 meses):** Cambio 2 (approval workflow). Empiezas a tener compras grandes que requieren más control.

3. **Cuando haya múltiples vendedores activos (6-12 meses):** Cambios 3 y 4 (requisiciones + RFQ).

4. **Cuando ALMASA-OS esté maduro (12+ meses):** Cambios 5 y 6 (vendor portal + contratos marco).

**El módulo de Compras de ALMASA-OS YA ES MEJOR que NetSuite básico hoy. Estas extensiones lo elevan al nivel de Oracle Procurement Cloud Premium, manteniendo el costo y simplicidad de ALMASA.**

---

*ALMASA-OS · Extensiones de Compras · v1.0*
*Generado el 8 de mayo de 2026*
*Documento de diseño · Pendiente decisión y ejecución*
*El módulo más maduro de ALMASA-OS, elevado al estándar Procure-to-Pay.*
