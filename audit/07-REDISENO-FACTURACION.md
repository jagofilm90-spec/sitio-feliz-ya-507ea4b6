# Rediseño de Facturación — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 8 de Mayo 2026  
**Origen:** Bug #2 · Auditoría técnica  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Pensar como Oracle. Construir mejor.

---

## 1. La tesis

Bug #2 no es un bug. Es un problema de **diseño**.

ALMASA-OS hoy tiene dos flujos paralelos que pretenden hacer
lo mismo, pero hacen cosas distintas y no se hablan entre sí.
Ningún ERP de clase mundial — ni Oracle, ni SAP, ni NetSuite,
ni Microsoft Dynamics — opera de esta forma.

> El problema no es que un flag boolean se desincroniza.
> El problema es que existe un flag boolean.
> Los ERPs de clase mundial no tienen flags de facturación.
> El estado de facturación se computa.

---

## 2. Diagnóstico actual

### Columnas existentes en pedidos
- `facturado` (boolean) — flag manual problemático
- `requiere_factura` (boolean) — intención del cliente
- `factura_enviada_al_cliente` (boolean) — redundante
- `factura_solicitada_por_cliente` (boolean) — duplicado
- `datos_fiscales_factura` (JSON)
- `fecha_factura_enviada` (timestamp)

### Columnas existentes en facturas
- `pedido_id` (UUID FK)
- `cfdi_estado` (borrador/pendiente/timbrada/cancelada/error)
- `cfdi_uuid`
- `pagada` (boolean)

### Los dos flujos paralelos

**FLUJO A — "Facturar y Enviar"** (Pedidos.tsx:380)
1. Marca `pedidos.facturado = true`
2. Llama edge function `send-invoice-email`
3. NO crea registro en `facturas`
4. NO timbra CFDI
5. Solo envía email

**FLUJO B — "Generar Factura CFDI"** (GenerarFacturaDialog)
1. Crea registro en `facturas` con `cfdi_estado: pendiente`
2. NO marca `pedidos.facturado = true`
3. Después se timbra desde Facturas.tsx

### El doble fallo

- **Pre-factura fantasma**: Pedido `facturado=true` sin CFDI real
- **Factura invisible**: CFDI real pero `facturado=false`

### Impacto operativo
1. KPIs incorrectos (ClienteEstadoCuenta filtra por flag)
2. Exportaciones erróneas (exportData usa boolean)
3. Confusión semántica ("Facturar y Enviar" no factura)
4. Riesgo fiscal (pre-facturas en reportes contables)

---

## 3. Cómo lo hacen Oracle, SAP, NetSuite

### Modelo de tres documentos

| Documento | Representa | Valor fiscal | Cuándo |
|-----------|------------|--------------|--------|
| Sales Order (Pedido) | Compromiso comercial | Sin valor fiscal | Al recibir orden |
| Delivery Note (Remisión) | Comprobante de entrega | Sin valor fiscal | Al cargar camión |
| Invoice (Factura) | Documento contable | Con valor fiscal | Cuando cliente pide |

### Lo que NUNCA hacen los grandes ERPs
- Nunca tienen flag `facturado` en pedido
- Nunca duplican estado entre tablas
- Nunca asumen relación 1:1
- Nunca mezclan documento operativo con fiscal
- Nunca confían en booleans para estado complejo

---

## 4. Los 4 principios

### Principio 1 — Estado computado, no booleano
El estado se deriva. No se almacena. Una sola fuente de verdad.

### Principio 2 — Documentos separados, ciclos separados
Pedido, remisión, factura: tres documentos distintos.
Cada uno con su propio estado y reglas.

### Principio 3 — Relación uno a muchos, siempre
Un pedido puede tener 0, 1 o N facturas.
El boolean no puede representar esto.

### Principio 4 — Máquina de estados explícita
borrador → pendiente_timbrado → timbrada → pagada
                                       ↓
                                   cancelada

---

## 5. Arquitectura propuesta

### Lo que se elimina de pedidos
- `facturado` (deprecar)
- `factura_enviada_al_cliente` (deprecar)
- `factura_solicitada_por_cliente` (deprecar)
- `fecha_factura_enviada` (mover a facturas)

### Lo que se conserva
- pedidos: estado propio (borrador → autorizado → entregado → completado)
- pedidos.requiere_factura (intención del cliente)
- pedidos.datos_fiscales_factura

### Tabla facturas (refinada)
- Mantiene cfdi_estado, cfdi_uuid, pagada
- Nuevo: tipo_documento ('cfdi' o 'nota_venta')
- Nuevo: email_enviado (boolean)
- Nuevo: fecha_email_enviado (timestamp)

### Vista vw_pedidos_estado_facturacion

```sql
CREATE VIEW vw_pedidos_estado_facturacion AS
SELECT
  p.id AS pedido_id,
  p.folio,
  p.cliente_id,
  p.requiere_factura,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM facturas f WHERE f.pedido_id = p.id)
      THEN 'sin_documentar'
    WHEN EXISTS (SELECT 1 FROM facturas f
                 WHERE f.pedido_id = p.id
                   AND f.tipo_documento = 'nota_venta'
                   AND NOT EXISTS (SELECT 1 FROM facturas f2
                                   WHERE f2.pedido_id = p.id
                                     AND f2.tipo_documento = 'cfdi'))
      THEN 'documentado_no_fiscal'
    WHEN EXISTS (SELECT 1 FROM facturas f
                 WHERE f.pedido_id = p.id
                   AND f.tipo_documento = 'cfdi'
                   AND f.cfdi_estado = 'borrador')
      THEN 'fiscal_pendiente_timbrado'
    WHEN EXISTS (SELECT 1 FROM facturas f
                 WHERE f.pedido_id = p.id
                   AND f.tipo_documento = 'cfdi'
                   AND f.cfdi_estado = 'timbrada'
                   AND f.pagada = true)
      THEN 'fiscal_pagada'
    WHEN EXISTS (SELECT 1 FROM facturas f
                 WHERE f.pedido_id = p.id
                   AND f.tipo_documento = 'cfdi'
                   AND f.cfdi_estado = 'timbrada')
      THEN 'fiscal_timbrada_pendiente_pago'
    ELSE 'estado_excepcional'
  END AS estado_facturacion
FROM pedidos p;
```

### Flujo único — "Generar Documento"
1. UI detecta requiere_factura del cliente
2. Si SÍ: flujo CFDI completo con auto-timbrado
3. Si NO: nota de venta sin CFDI
4. En ambos casos crea registro en facturas
5. Envía email automáticamente
6. Marca email_enviado=true

---

## 6. Por qué será mejor que Oracle

### Ventaja 1 — Detección automática del documento
Oracle: 3 clics manuales. ALMASA: el sistema decide solo
basado en el cliente.

### Ventaja 2 — RPC unificada atómica
SAP separa generación, timbrado y envío. ALMASA puede
unificar en una sola RPC: generar_documento_completo(pedido_id, opciones).

### Ventaja 3 — Portal cliente unificado
Oracle muestra documentos en pestañas. ALMASA puede
mostrar línea de tiempo cronológica con TODOS los
documentos en una sola vista.

**Principio**: Oracle/SAP están diseñados para empresas de
miles. ALMASA tiene 30 empleados, operación clara, un país.
Podemos quitar overhead, automatizar decisiones, unificar
lo que ellos separan. Más simple, sin perder rigor.

---

## 7. Roadmap de migración (1-2 semanas)

### Fase 1 — Análisis y diseño detallado (3-4 días)
- Mapear queries que usan facturado
- Diseño detallado de vista y RPC
- Especificación de tipo_documento
- Validación con casos reales
- Documentación en Biblia v1.1

### Fase 2 — Migración de datos (2-3 días)
- Identificar pedidos facturado=true sin CFDI real
- Crear registros nota_venta para ellos
- Identificar pedidos con CFDI pero facturado=false
- Validar consistencia
- Backup completo

### Fase 3 — Implementación (4-5 días)
- Crear vista vw_pedidos_estado_facturacion
- Crear RPC generar_documento_completo
- Refactor Pedidos.tsx (un botón, lógica condicional)
- Refactor GenerarFacturaDialog (usa RPC)
- Refactor ClienteEstadoCuenta (usa vista)
- Update KPIs y exportaciones

### Fase 4 — Deprecación, testing, deploy (1-2 días)
- Marcar columnas viejas como deprecadas
- Suite de tests
- Validación con pedidos reales en sandbox
- Deploy gradual
- Monitoreo 1 semana
- Drop columnas viejas en migración separada

---

## 8. Decisiones de negocio pendientes

### Decisión 1 — % de clientes que pide CFDI vs nota
Determina lógica del botón inteligente.

### Decisión 2 — ¿Permitir facturación parcial?
Pedido grande puede entregar en 3 viajes.
¿Facturar cada viaje o solo al final?

### Decisión 3 — ¿Plantilla única o separadas?
Nota más simple vs factura más formal.

### Decisión 4 — ¿Quién puede cancelar CFDI?
Permisos especiales o solo admin.

### Decisión 5 — ¿Mantener "Re-enviar email"?
Caso común suficiente como para botón propio.

---

## 9. Conexión con Biblia v1

### Módulo M07 — Facturación
Se enriquece con concepto de "documento comercial"
(CFDI o nota de venta) y vista de estado computado.

### Módulo M04 — Pedidos
Sección "Estados de pedido" elimina facturado como atributo.
Estado de facturación es dimensión derivada.

### Módulo M19 — Portal Cliente (futuro)
Se beneficia directamente de la vista unificada.
Línea de tiempo cronológica.

### Principio Transversal — Continuidad Operativa
Hoy el flag facturado puede causar inconsistencia.
Después del rediseño, el estado siempre refleja realidad.
Esto es Continuidad Operativa aplicada a datos.

---

## Recomendación final

Cuando se actualice la Biblia v1 a v1.1, este documento
debe servir como apéndice técnico de la sección de
Facturación. Idealmente con resumen ejecutivo de 2 páginas
en la Biblia y este markdown como referencia detallada.

---

*ALMASA-OS · Rediseño de Facturación · v1.0*  
*Generado el 8 de mayo de 2026*  
*Documento de diseño · Pendiente decisión y ejecución*  
*Pensar como Oracle. Construir mejor.*
