# UX Audit — Wizard Crear Orden de Compra
**Fecha**: 28 abril 2026
**Propósito**: Validación UX antes de uso real — perspectiva de usuario nuevo

---

## Vista general del wizard

- **Se abre desde**: `/compras` → tab "Órdenes" → botón "Nueva Orden"
- **Tipo**: Dialog modal, `sm:max-w-3xl`, `max-h-[90vh]` con scroll vertical
- **Indicador de pasos**: 4 círculos numerados en la esquina derecha del título. Paso actual: fondo primary. Pasos completados: check icon. Pasos futuros: gris.
- **Título del dialog**: "Nueva Orden de Compra" (sans-serif, no canónico)
- **Al cerrar**: hace reset completo del formulario

---

## PASO 1 — "¿A quién le compras?"

### Lo que ve el usuario:

Título centrado "¿A quién le compras?" con subtítulo "Selecciona el proveedor y tipo de pago". Debajo, dos secciones principales: selección de proveedor y forma de pago. Si el proveedor tiene créditos pendientes de devoluciones anteriores, aparece un panel amarillo con opciones de resolución. Al final, un colapsable de "Opciones avanzadas".

### Campos en orden:

| # | Label | Tipo | Placeholder | Ayuda | Default | Requerido |
|---|-------|------|-------------|-------|---------|-----------|
| 1 | Proveedor | radio → select o input | — | — | "Del catálogo" seleccionado | Sí |
| 1a | (catálogo) | select | "Selecciona un proveedor" | — | vacío | Sí si catálogo |
| 1b | (manual) Nombre | input con autocomplete | "Nombre del proveedor" | Suggestions de proveedores manuales usados antes | vacío | Sí si manual |
| 1c | (manual) Email | input email con icono 📧 | "correo@proveedor.com (opcional)" | — | vacío | No |
| 2 | ¿Cómo pagarás? | radio cards con iconos | — | — | "Contra Entrega" | Sí |
| 3 | Créditos pendientes (condicional) | radio group por crédito | — | Panel amber con desglose de cada crédito | — | No |
| 4 | ▼ Opciones avanzadas (colapsado) | — | — | — | cerrado | — |
| 4a | Notas | textarea | "Notas adicionales..." | — | vacío | No |
| 4b | Teléfono del proveedor (solo manual) | input | "(opcional)" | — | vacío | No |

### Botones:
- **"Siguiente →"** (derecha) — disabled si no hay proveedor seleccionado

### Mensajes condicionales:
- **AlertDialog "Sin email"**: Si el proveedor es manual y no tiene email, aparece alerta: "No podrás enviarle la OC por correo electrónico. ¿Deseas continuar?" con "Continuar sin email" y "Agregar email".
- **Panel créditos**: Solo aparece si el proveedor del catálogo tiene créditos pendientes. Muestra cada crédito con 3 opciones radio: "Aplicar descuento ($X)", "Esperar reposición (N bultos)", "No aplicar". Resumen al fondo con totales.
- **"Verificando créditos pendientes..."** con spinner: aparece mientras carga créditos.

---

## PASO 2 — "¿Qué productos?"

### Lo que ve el usuario:

Título centrado "¿Qué productos?" con subtítulo "Agrega los productos a la orden de [Nombre Proveedor]". Un formulario de 4 columnas para agregar productos uno por uno: Producto | Cantidad | Precio Unitario | botón +. Debajo, una tabla con los productos ya agregados. Al fondo, desglose de totales.

### Campos en orden:

| # | Label | Tipo | Placeholder | Ayuda | Default | Requerido |
|---|-------|------|-------------|-------|---------|-----------|
| 0 | Modo creación (condicional) | radio | — | Solo aparece si el proveedor tiene config de transporte | "Por Vehículos (rápido)" / "Manual" | No |
| 1 | Producto | select (4/12 cols) | "Selecciona..." | Muestra nombre + marca + emoji 🎁 si promo + costo si configurado | vacío | Sí para agregar |
| 2a | Cantidad (modo manual) | input number (3/12 cols) | "Ej: 1200" | — | vacío | Sí para agregar |
| 2b | Vehículos (modo vehículos) | input number (3/12 cols) | "Ej: 3" | Muestra "×[capacidad]" al lado | vacío | Sí para agregar |
| 3 | Precio Unitario | input number (3/12 cols) | "$0.00" | Se desactiva si es precio por kg | vacío | Sí para agregar |
| 4 | Agregar | botón + (2/12 cols) | — | — | — | — |

### Campos condicionales (aparecen DEBAJO del form de agregar):

| # | Label | Tipo | Cuándo aparece | Ayuda |
|---|-------|------|----------------|-------|
| A | "¿Cómo te cobra el proveedor?" | radio cards: "Por kilo" / "Por bulto/caja" | Primera vez que se selecciona un producto sin config de precio por kg | Panel amber con checkbox "Recordar para futuras compras" |
| B | Badge "💰 Precio por kg" o "📦 Precio por bulto" | badge info | Si ya está configurado | Link "¿Comprar diferente?" para sobrescribir |
| C | Precio por kg / Kg por unidad | 2 inputs number | Si usa precio por kg | Preview en tiempo real: "1200 bultos × 50kg × $12.50/kg = $750,000.00 (60,000 kg total)" |
| D | Preview de cálculo | texto | Si hay cantidad y precio | "1200 bultos × $350.00/u = $420,000.00 (60,000 kg total)" |
| E | "Este producto grava: IVA (16%) + IEPS (8%)" | panel azul con checkboxes | Si el producto tiene IVA y/o IEPS | Texto: "El precio del proveedor YA incluye:" + checkboxes IVA / IEPS + desglose en tiempo real |

### Tabla de productos agregados:

| Columna | Qué muestra |
|---------|-------------|
| Producto | Nombre + badge "📦 por kilo" si aplica |
| Cantidad | Número + unidad |
| KG | Peso total calculado |
| Precio | Precio unitario + badges IVA/IEPS |
| Subtotal | Cantidad × precio |
| Acciones | Botón eliminar (🗑) |

### Desglose de totales (abajo de la tabla):

```
Subtotal:     $XXX,XXX.XX
IVA (16%):    $XX,XXX.XX
IEPS (8%):    $X,XXX.XX
─────────────────────────
Total:        $XXX,XXX.XX
Créditos:    -$X,XXX.XX   (solo si hay créditos aplicados)
─────────────────────────
A pagar:      $XXX,XXX.XX  (solo si hay créditos)
```

### Botones:
- **"← Atrás"** (izquierda)
- **"Siguiente →"** (derecha) — disabled si 0 productos

### Mensajes condicionales:
- **Dialog "¿Producto viene con promoción?"**: Si el producto tiene `puede_tener_promocion`, pregunta si quiere crear variante promo. Pide descripción de la promo y precio promocional. Calcula precio de venta sugerido automáticamente.

---

## PASO 3 — "¿Cuándo te llega?"

### Lo que ve el usuario:

Título centrado "¿Cuándo te llega?" con subtítulo "Programa la(s) fecha(s) de entrega". Arriba un resumen: "[N] bultos — [N] producto(s) de [Proveedor]". Debajo, radio cards para elegir entrega única o múltiple. Según la selección, aparece un calendario simple o un sistema de división de entregas.

### Campos en orden:

| # | Label | Tipo | Placeholder | Ayuda | Default | Requerido |
|---|-------|------|-------------|-------|---------|-----------|
| 0 | Resumen | info card | — | "[N] bultos — [N] producto(s) de [Proveedor]" | — | — |
| 1 | ¿Cómo deseas recibir la mercancía? | radio cards con iconos | — | "Una sola entrega: Todo en una fecha" / "Múltiples entregas: Dividir en varias fechas" | "Una sola entrega" | Sí |

### Si entrega única:

| # | Label | Tipo | Placeholder | Default | Requerido |
|---|-------|------|-------------|---------|-----------|
| 2 | Fecha de Entrega | calendar popover | "Seleccionar fecha" | Mañana (auto) | Sí |

### Si entregas múltiples:

| # | Label | Tipo | Placeholder | Default | Requerido |
|---|-------|------|-------------|---------|-----------|
| 2 | Total bultos | input disabled | — | Calculado | — |
| 3 | Bultos por entrega | input number | "Ej: 1200" | vacío | Sí |
| 4 | Calcular (botón) | button secondary | — | — | — |
| 5 | Calendario de ocupación | calendar interactivo | — | Muestra días ocupados con badges | — |
| 6 | Lista de entregas | cards con badge # + cantidad + fecha | — | Auto-generado | Fechas requeridas |

### Botones:
- **"← Atrás"** (izquierda)
- **"Siguiente →"** (derecha) — disabled si no hay fecha (única) o si no hay entregas con fecha (múltiple)

### Mensajes condicionales:
- **Warning de validación (múltiple)**: Si la suma de bultos en entregas ≠ total bultos, muestra alerta.
- **Calendario de ocupación**: Días con entregas ya programadas se muestran con indicadores visuales.

---

## PASO 4 — "Revisa tu orden"

### Lo que ve el usuario:

Título centrado "Revisa tu orden" con subtítulo "Verifica los datos antes de crear". Un resumen grid (Folio, Proveedor, Tipo de Pago, Total Bultos), luego entregas programadas, luego tabla de productos, luego desglose de totales. Si es pago anticipado, un panel amber grande explica el flujo.

### Información mostrada:

| # | Elemento | Qué muestra |
|---|----------|-------------|
| 1 | Folio | Auto-generado por RPC (formato OC-YYYYMM-NNNN), o spinner si está generando |
| 2 | Proveedor | Nombre |
| 3 | Tipo de Pago | "Contra Entrega" o "Anticipado" |
| 4 | Total Bultos | Suma de cantidades |
| 5 | Alerta Anticipado (condicional) | Panel amber: "Esta orden requiere pago antes de la entrega..." con 3 bullets explicando el flujo |
| 6 | Entregas Programadas | Card con fecha(s) y cantidades |
| 7 | Tabla de productos | Producto / Cantidad / KG / Precio / Subtotal |
| 8 | Desglose totales | Subtotal + IVA + IEPS = Total (con créditos si aplica) |

### Botones:
- **"← Atrás"** (izquierda)
- **"Crear Orden ✓"** (derecha) — disabled si está creando. Muestra texto de progreso: "Creando orden..." → "Preparando email al proveedor..." → "Generando PDF..." → "Enviando email al proveedor..."

### Mensajes condicionales:
- **Panel amber pago anticipado**: Solo si `tipoPago === 'anticipado'`. Explica que la OC queda en "Pendiente de Pago", almacén no ve entregas hasta confirmar pago.

---

## Issues UX detectados

### 🔴 Bloqueante para uso real

**Ninguno.** El wizard es funcional y completo.

### 🟡 Confuso / mejorable

1. **Toggle "Precio incluye IVA/IEPS"** — El concepto es correcto pero para una secretaria nueva puede ser confuso. El texto "El precio del proveedor YA incluye:" ayuda, pero el default (ambos checked) asume que los precios del proveedor siempre incluyen impuestos. Si ALMASA trabaja con proveedores que dan precios sin IVA, la secretaria debe saber desmarcar. **Recomendación**: Agregar tooltip o texto: "Si el proveedor te da precio sin IVA, desmarca esta casilla."

2. **"Precio por kilo" vs "Precio por bulto"** — La primera vez que seleccionas un producto sin configurar, aparece un panel amber preguntando cómo cobra el proveedor. Está bien diseñado. Pero si el usuario no entiende la pregunta, puede elegir mal y el checkbox "Recordar para futuras compras" persiste la decisión incorrecta. **Recomendación**: Agregar texto: "Si no estás seguro, elige 'Por bulto/caja' y deja el checkbox activo."

3. **Campo "Precio Unitario" se desactiva con precio por kg** — Cuando se activa precio por kilo, el input de Precio Unitario se desactiva y muestra el calculado. El usuario no sabe por qué está gris. **Recomendación**: Agregar texto debajo: "Calculado automáticamente desde $/kg × kg/unidad".

4. **Folio se genera al entrar al paso 4** — Si el usuario va y viene entre pasos (paso 4 → atrás → paso 4), el folio ya se generó la primera vez. Si cancela, el folio se "quema". No es un problema funcional pero puede confundir a alguien que nota huecos en la secuencia. **Sin acción requerida esta semana.**

5. **"Opciones avanzadas" está MUY escondido** — El campo de Notas está dentro de un colapsable que la mayoría de usuarios nunca abrirán. Si las notas son importantes para la operación (ej. "mandar factura por correo"), el usuario no sabrá que existe. **Recomendación para semana 2**: evaluar si Notas debería estar visible siempre.

6. **Créditos pendientes** — El panel es completo pero puede abrumar a un usuario nuevo. Tiene 3 opciones por crédito (descuento/reposición/no aplicar) con montos y folios. Para la primera OC real, la secretaria probablemente no tendrá créditos pendientes (es proveedor nuevo), así que no será un problema inmediato.

### 🟢 Cosmético

1. **Título no sigue Design Canon** — "Nueva Orden de Compra" sans-serif bold. Debería ser "Nueva *orden de compra*." con serif + italic crimson + punto. No afecta funcionalidad.

2. **Emojis en paneles informativos** — ⚠️ 💰 📦 📊 🎁 aparecen en badges y textos auxiliares. El Design Canon prohíbe emojis en títulos de dialogs pero no dice nada de texto auxiliar. Aceptable pero no canónico.

3. **Botones usan `bg-primary`** en vez de `bg-crimson-500` explícito — Funciona si el theme mapea primary → crimson, pero no es canónicamente explícito.

---

## Recomendaciones priorizadas

### Antes de capacitar usuarios reales (esta semana)

1. **Hacer un walkthrough de 10 minutos con la secretaria** — Mostrarle los 4 pasos con datos reales de un proveedor que ya usa. El wizard es intuitivo pero necesita una primera guía.
2. **Explicarle verbalmente el toggle IVA/IEPS** — "Si el proveedor te dice $350 con IVA, deja marcado. Si dice $350 + IVA, desmarca."
3. **Tener a mano 3 productos reales con precios** para no inventar en la primera OC.

### Después de validar el flujo (semana 2+)

1. Migrar título del dialog a Design Canon
2. Evaluar si "Notas" debería estar visible siempre (no colapsado)
3. Agregar tooltip en toggles IVA/IEPS para usuarios nuevos
4. Considerar un "mini-tutorial" la primera vez que se abre el wizard (first-run experience)

### NO TOCAR

- **Los 4 pasos están en orden lógico perfecto**: proveedor → productos → entregas → confirmar. No reordenar.
- **La selección de proveedor manual con autocomplete** es excelente UX — recuerda proveedores usados antes.
- **El desglose de impuestos en tiempo real** (panel azul) es muy útil — muestra base + IVA + IEPS sin ambigüedad.
- **El preview de cálculo** (texto: "1200 bultos × $350.00/u = $420,000.00") es genial — el usuario ve el resultado antes de agregar.
- **El calendario de ocupación** en entregas múltiples evita doble-agendar.
- **Los radio cards con iconos** (Contra Entrega con 🚚, Anticipado con 💳) son más claros que un select o radios planos.
- **El flujo de créditos pendientes** es sofisticado pero bien diseñado — no simplificarlo.
- **El auto-envío de email/PDF** post-creación es diferenciador — no requiere paso manual.

---

*Documento de auditoría UX. No hacer commit hasta que Jose valide.*
