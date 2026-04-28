# AUDITORÍA — Captura de Orden de Compra
**Fecha**: 28 abril 2026
**Propósito**: Validar que el flujo de creación de OC está listo para uso real (Día 1.5, semana adopción)

---

## 1. Archivos del flujo

| Archivo | Rol | Líneas |
|---------|-----|--------|
| `src/components/compras/CrearOrdenCompraWizard.tsx` | **Wizard principal** — 4 pasos, selección proveedor, productos, entregas, confirmación + envío email/PDF | ~3,015 |
| `src/components/compras/OrdenesCompraTab.tsx` | Lista de OCs, abre el wizard, badges de status | grande |
| `src/components/compras/AutorizacionOCDialog.tsx` | Aprobación/rechazo por admin | — |
| `src/components/compras/CalendarioOcupacion.tsx` | Calendario de entregas ocupadas (usado dentro del wizard paso 3) | — |
| `src/lib/proveedorUtils.ts` | Formateo de dirección fiscal para PDFs | — |
| `src/lib/htmlToPdfBase64.ts` | Generación de PDF de la OC | — |
| `src/constants/companyData.ts` | Datos de ALMASA para el PDF (RFC, dirección, etc.) | — |
| `src/constants/catalogoSAT.ts` | Regímenes fiscales SAT (para PDF) | — |
| `src/components/compras/HistorialCorreosOC.tsx` | Registra emails enviados (`registrarCorreoEnviado`) | — |
| `src/services/pushNotifications.ts` | Push notifications al almacén | — |

**No hay ruta independiente.** El wizard se abre desde `OrdenesCompraTab` dentro de `/compras`.

---

## 2. Pasos del wizard

### Paso 1 — ¿A quién le compras?

**Selección de proveedor:**
- Radio: "Del catálogo" (Select con proveedores activos) o "Manual" (nombre/email/teléfono/notas)
- Proveedor manual: si no tiene email, muestra AlertDialog de advertencia (puede continuar sin email)
- Búsqueda autocomplete para proveedores manuales recurrentes

**Tipo de pago:**
- Radio: "Contra entrega" (default) o "Anticipado"
- Anticipado: OC se crea como `pendiente_pago` (no `pendiente`)

**Opciones avanzadas** (colapsadas por default):
- Textarea de notas generales

**Validación**: Proveedor seleccionado (catálogo) o nombre manual no vacío.

### Paso 2 — Productos

**Selección de productos:**
- Select con productos del catálogo
- Si el proveedor tiene productos asociados (`proveedor_productos`), se priorizan
- Productos no asociados se muestran después, separados

**Campos por producto:**
| Campo | Tipo | Detalle |
|-------|------|---------|
| Producto | select | Del catálogo, muestra nombre + código |
| Cantidad | number | Bultos/unidades |
| Precio unitario | number | Costo de compra acordado |
| Precio incluye IVA | switch | Default: true. Afecta cálculo de base |
| Precio incluye IEPS | switch | Solo si producto aplica IEPS. Default: true |
| Precio por kilo | toggle | Si el producto se compra por kg, calcula precio unitario = $/kg × kg/unidad |

**Cálculos automáticos:**
- Subtotal por producto = cantidad × precio unitario
- Total de la orden = Σ subtotales (con desglose IVA 16% + IEPS 8%)
- Maneja correctamente precios con IVA incluido vs sin IVA
- Maneja combinación IVA + IEPS con divisor compuesto (1.16 × 1.08)

**Modo vehículos:** Opción alternativa donde ingresas # de vehículos × capacidad y auto-calcula cantidad. Específico para proveedores con transporte estandarizado.

**Flujo de variante promocional:**
- Si un producto `puede_tener_promocion`, al agregarlo pregunta si quiere crear variante promo
- Crea un producto nuevo en la DB con descripción y precio promo
- Calcula precio de venta sugerido manteniendo el mismo margen del producto base

**Validación**: Al menos 1 producto en la orden.

### Paso 3 — Programar entregas

**Tipo de entrega:**
- "Entrega única" (default) — un solo calendario para seleccionar fecha
- "Entregas múltiples" — define bultos por trailer, auto-calcula # de entregas, asigna fecha a cada una

**Calendario de ocupación:**
- Muestra CalendarioOcupacion con días que ya tienen entregas programadas
- Ayuda a evitar agendar múltiples entregas el mismo día

**Auto-inicialización:** Al entrar al paso 3, la fecha de entrega única se inicializa a mañana.

**Validación**:
- Entrega única: fecha seleccionada
- Múltiples: al menos 1 entrega con fecha

### Paso 4 — Revisa tu orden

**Resumen de confirmación:**
- Folio (auto-generado por RPC `generar_folio_orden_compra`)
- Proveedor
- Tipo de pago
- Total bultos
- Tabla de productos (producto, cantidad, kg, precio, subtotal)
- Desglose: subtotal, IVA, IEPS, total
- Créditos aplicados (si hay)
- Entregas programadas con fechas
- Alerta especial para pago anticipado (explica que la OC queda en `pendiente_pago`)

**Botón "Crear Orden"** → ejecuta la mutación.

---

## 3. Campos del formulario completo

| Campo | Paso | Tipo | Requerido | Tabla destino | Columna |
|-------|------|------|-----------|---------------|---------|
| Proveedor (catálogo) | 1 | select | Sí* | `ordenes_compra` | `proveedor_id` |
| Proveedor nombre manual | 1 | text | Sí* | `ordenes_compra` | `proveedor_nombre_manual` |
| Proveedor email manual | 1 | text | No | `ordenes_compra` | `proveedor_email_manual` |
| Proveedor teléfono manual | 1 | text | No | `ordenes_compra` | `proveedor_telefono_manual` |
| Notas proveedor manual | 1 | text | No | `ordenes_compra` | `notas_proveedor_manual` |
| Tipo de pago | 1 | radio | Sí (default: contra_entrega) | `ordenes_compra` | `tipo_pago` |
| Notas generales | 1 | textarea | No | `ordenes_compra` | `notas` |
| Productos (N) | 2 | tabla | ≥1 | `ordenes_compra_detalles` | producto_id, cantidad_ordenada, precio_unitario_compra, subtotal |
| Tipo entrega | 3 | radio | Sí (default: unica) | `ordenes_compra` | `entregas_multiples` |
| Fecha entrega única | 3 | calendar | Sí* | `ordenes_compra` | `fecha_entrega_programada` |
| Entregas múltiples (N) | 3 | tabla | ≥1* | `ordenes_compra_entregas` | numero_entrega, cantidad_bultos, fecha_programada |
| Folio | 4 | auto | Auto | `ordenes_compra` | `folio` |

*Uno de los dos es requerido según el tipo seleccionado.

---

## 4. Diseño visual vs Design Canon

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Título editorial (font-serif, italic accent, punto) | 🔴 No canónico | `<DialogTitle><span>Nueva Orden de Compra</span>...</DialogTitle>` — sans-serif, sin italic accent, sin punto. Tiene step indicators circulares al lado del título. |
| DialogDescription | 🔴 Ausente | No hay DialogDescription. Cada paso tiene su propio h3 + p centrados. |
| Secciones internas | 🟡 Funcional | Usa h3 sans-serif bold centrados ("¿A quién le compras?", "¿Qué productos necesitas?", etc.) — no sigue patrón canónico de secciones pero funciona para wizard. |
| Botones primary crimson | 🟡 Parcial | Usa `bg-primary` (que en el theme puede mapear a crimson, pero no es explícito `bg-crimson-500`). |
| Emojis en título | ✅ Sin emojis | Correcto. Emojis aparecen solo en notificaciones push, no en el UI. |
| Step indicators | 🟢 Bien diseñados | Círculos numerados con check para pasos completados. |

**Título correcto según el canon:**
```jsx
<DialogTitle className="font-serif text-2xl font-light text-ink-900">
  Nueva <em className="italic text-crimson-500 font-normal">orden de compra</em>.
</DialogTitle>
```
**Nota**: El wizard tiene step indicators junto al título que habría que preservar. El cambio cosmético NO es bloqueante para operación real.

---

## 5. Brechas vs negocio

| Necesidad del negocio | ¿Cubierta? | Detalle |
|-----------------------|-----------|---------|
| Selección rápida de proveedor (13 activos) | ✅ Sí | Select con catálogo + opción manual |
| Búsqueda eficiente de productos | ✅ Sí | Select con productos filtrados por proveedor cuando están asociados |
| Captura cantidad + precio acordado | ✅ Sí | Por producto, con toggles IVA/IEPS incluido |
| Fecha entrega esperada | ✅ Sí | Calendar con auto-default a mañana |
| Entregas múltiples programadas | ✅ Sí | Divide por bultos/trailer + asigna fecha a cada una |
| Notas para el almacenista | ✅ Sí | Campo notas generales |
| Tipo de pago (anticipado/contra entrega) | ✅ Sí | Radio con flujo diferente según tipo |
| Generación PDF para proveedor | ✅ Sí | Auto-genera PDF con datos fiscales de ALMASA y proveedor |
| Envío email automático al proveedor | ✅ Sí | Vía `gmail-api` Edge Function con PDF adjunto |
| Push notification al almacén | ✅ Sí | Notifica cuando se crea OC con entrega programada |
| Créditos pendientes de devoluciones | ✅ Sí | Muestra créditos del proveedor y permite aplicar como descuento o reposición |
| Variantes promocionales | ✅ Sí | Crea producto variante directamente desde el wizard |
| Precio por kilo | ✅ Sí | Toggle por producto, calcula precio unitario automáticamente |
| Calendario de ocupación | ✅ Sí | Muestra días con entregas ya programadas |

**No hay brechas funcionales.** El wizard cubre todo lo que ALMASA necesita y más.

---

## 6. Conexión con BD

### INSERT ordenes_compra (paso 4, al crear)

| Columna | Origen | Nota |
|---------|--------|------|
| `folio` | RPC `generar_folio_orden_compra` | Atómico, formato OC-YYYYMM-NNNN |
| `proveedor_id` | Select paso 1 (o null si manual) | |
| `proveedor_nombre_manual` | Input paso 1 (o null si catálogo) | |
| `proveedor_email_manual` | Input paso 1 | |
| `proveedor_telefono_manual` | Input paso 1 | |
| `notas_proveedor_manual` | Input paso 1 | |
| `fecha_entrega_programada` | Calendar paso 3 (solo entrega única) | |
| `subtotal` | Calculado de productos | Base sin impuestos |
| `impuestos` | Calculado (IVA 16% + IEPS 8%) | |
| `total` | subtotal + impuestos | |
| `notas` | Textarea paso 1 | |
| `creado_por` | Auth user ID | |
| `status` | `pendiente` o `pendiente_pago` | Según tipo_pago |
| `entregas_multiples` | Boolean del paso 3 | |
| `tipo_pago` | Radio paso 1 | |
| `status_pago` | `'pendiente'` siempre | |

### INSERT ordenes_compra_detalles (N rows)

| Columna | Origen |
|---------|--------|
| `orden_compra_id` | ID de la OC recién creada |
| `producto_id` | Select paso 2 |
| `cantidad_ordenada` | Input cantidad paso 2 |
| `precio_unitario_compra` | Input precio paso 2 |
| `subtotal` | cantidad × precio |

### INSERT ordenes_compra_entregas (1 o N rows)

| Columna | Origen |
|---------|--------|
| `orden_compra_id` | ID de la OC |
| `numero_entrega` | Auto-secuencial |
| `cantidad_bultos` | Calculado o ingresado |
| `fecha_programada` | Calendar paso 3 |
| `status` | `programada` o `pendiente_fecha` |

### Columnas de ordenes_compra que el form NO captura

| Columna | Por qué | Riesgo |
|---------|---------|--------|
| `autorizado_por` | Se llena en AutorizacionOCDialog | ✅ Correcto |
| `fecha_autorizacion` | Idem | ✅ |
| `rechazado_por` | Idem | ✅ |
| `fecha_rechazo` | Idem | ✅ |
| `motivo_rechazo` | Idem | ✅ |
| `email_enviado_en` | Se llena post-envío automático | ✅ |
| `fecha_entrega_real` | Se llena al recibir | ✅ |
| `monto_devoluciones` | Se llena con devoluciones | ✅ |
| `monto_pagado` | Se llena al pagar | ✅ |
| `referencia_pago` | Idem | ✅ |
| `comprobante_pago_url` | Idem | ✅ |
| `status_conciliacion` | Se llena al conciliar | ✅ |

**No hay mismatch.** Todas las columnas no capturadas son llenadas por otros flujos downstream.

---

## 7. RPCs y lógica transaccional

### A. Folio atómico

```typescript
const { data } = await supabase.rpc("generar_folio_orden_compra");
```
- Se genera al entrar al paso 4 (confirmación)
- Formato: `OC-YYYYMM-NNNN` (verificar en BD)
- **🟡 ISSUE #1**: El folio se genera ANTES de confirmar. Si el usuario cancela en paso 4, el folio se "quema" (se generó pero no se usó). No es bloqueante pero deja huecos en la secuencia.

### B. Atomicidad del INSERT

La creación NO es atómica. Es una secuencia de INSERTs independientes:

1. `INSERT ordenes_compra` → obtiene `orden.id`
2. `INSERT ordenes_compra_detalles` (batch) → usa `orden.id`
3. `INSERT ordenes_compra_entregas` → usa `orden.id`
4. `UPDATE proveedor_creditos_pendientes` (si aplica)
5. `UPDATE ordenes_compra` con créditos (si aplica)

**🟡 ISSUE #2**: Si el paso 2 falla (ej. producto_id inválido), la OC queda creada sin detalles. Si el paso 3 falla, la OC queda sin entregas. No hay rollback.

**Mitigación**: En la práctica, estos errores son muy improbables porque los IDs vienen de selects vinculados a datos reales. Pero técnicamente no es transaccional.

### C. Manejo de errores

- Cada INSERT tiene `if (error) throw error`
- La mutación tiene `onError` que muestra toast
- Si falla parcialmente, la OC puede quedar en estado inconsistente
- **No hay lógica de cleanup** si un INSERT intermedio falla

---

## 8. Issues encontrados

| # | Severidad | Issue | Impacto semana 1 |
|---|-----------|-------|-----------------|
| 1 | 🟡 | Título no sigue Design Canon ("Nueva Orden de Compra" sans-serif) | Cosmético. No bloquea. |
| 2 | 🟡 | Folio se "quema" si el usuario cancela en paso 4 | Huecos en secuencia. Aceptable en semana 1. |
| 3 | 🟡 | INSERT no atómico (OC → detalles → entregas sin transacción) | Riesgo bajo, productos vienen de selects válidos. |
| 4 | 🟢 | IVA hardcoded 16%, IEPS hardcoded 8% | Correcto para México 2026. No es issue. |
| 5 | 🟢 | `ultimo_costo_compra` NO se actualiza al crear OC (solo al conciliar) | Correcto por diseño. Costo solo se confirma con factura real. |

---

## 9. Veredicto

### ¿Listo para uso real? **SÍ**

El wizard de Captura de OC es el componente más maduro de todo ALMASA-OS:

- **3,015 líneas** de lógica cuidadosamente construida
- **4 pasos** claros y bien validados
- Cubre **todos los escenarios** del negocio: proveedor catálogo/manual, anticipado/contra entrega, entrega única/múltiple, IVA/IEPS incluido o no, precio por kilo, créditos de devoluciones, variantes promo
- **Auto-genera PDF** y **envía email** al proveedor automáticamente
- **Push notification** al almacén cuando se programa entrega
- **Cálculos de impuestos** correctos con desglose completo

**Cero issues bloqueantes.** El wizard está listo para la primera OC real el miércoles.

---

## 10. Acciones recomendadas para el miércoles

### ANTES de la primera OC real

1. **Verificar que `generar_folio_orden_compra` existe como RPC** (ya citado en DIA1-VALIDACION):
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'generar_folio_orden_compra';
   ```
2. **Tener al menos 1 proveedor con productos asociados** (`proveedor_productos`) para que el paso 2 priorice sus productos.
3. **Verificar gmail-api** para envío automático del PDF. Si no funciona, la OC se crea igual y el PDF se envía manualmente.

### NO TOCAR esta semana

- El título sans-serif funciona perfectamente — migrar a canon es mejora cosmética para semana 2+
- La atomicidad del INSERT es un refinamiento técnico para más adelante
- Los huecos de folio son aceptables

### PROTOCOLO para la primera OC

1. Secretaria abre `/compras` → tab "Órdenes" → botón "Nueva Orden"
2. Paso 1: selecciona proveedor del catálogo + tipo de pago
3. Paso 2: agrega productos con cantidades y precios acordados
4. Paso 3: selecciona fecha de entrega
5. Paso 4: revisa y crea
6. El sistema genera PDF y lo envía al proveedor automáticamente
7. Jose autoriza desde su panel (AutorizacionOCDialog)
8. Almacenista recibe notificación push de la entrega programada

---

*Documento de auditoría. No hacer commit hasta que Jose valide.*
