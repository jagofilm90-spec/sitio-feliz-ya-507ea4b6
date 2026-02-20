
# Diagnóstico y Plan Completo del Módulo Vendedor

## Qué ya existe (no hay que construir)

El módulo Vendedor ya tiene una base muy sólida implementada:

| Función | Estado | Componente |
|---------|--------|-----------|
| Lista de precios con descuento máximo visible | LISTO | VendedorListaPreciosTab.tsx |
| Alta de clientes propios | LISTO | VendedorNuevoClienteSheet.tsx |
| Base de datos de clientes por zonas (tabs CDMX / Foráneas) | LISTO | VendedorMisClientesTab.tsx |
| Levantar pedidos multi-producto con wizard 4 pasos | LISTO | VendedorNuevoPedidoTab.tsx + pedido-wizard/ |
| Identificación KG vs Bulto/Caja con conversiones | LISTO | Tipos y wizard ya lo manejan |
| Selección de término de crédito (Contado, 8, 15, 30, 60 días) | LISTO | PasoCredito.tsx |
| Vencimiento calculado desde fecha_entrega_real | LISTO | creditoUtils + BD trigger |
| Saldos por cliente con semáforo de crédito | LISTO | VendedorSaldosTab.tsx |
| Registrar pagos (parciales, forma de pago, referencia) | LISTO | RegistrarPagoDialog.tsx |
| Tab "Mis Ventas" con estados del pedido | LISTO | VendedorMisVentasTab.tsx |
| Detalle de cliente (pedidos, facturas, contactos) | LISTO | ClienteDetalleSheet.tsx |
| Comisiones del 1% | LISTO | VendedorComisionesTab.tsx |
| Cobranza con indicadores de vencimiento por días | LISTO | VendedorCobranzaTab.tsx |

## Qué FALTA por construir (las brechas reales)

Revisando el código contra tus requisitos, hay 6 brechas que necesitamos cerrar:

### Brecha 1 -- Registro de cobro enlazado a PEDIDOS (no facturas)

El `RegistrarPagoDialog` actual aplica pagos contra *facturas* (`pagos_cliente` / `facturas`). Pero el flujo real del vendedor es: cobrar contra un *pedido* específico con saldo parcial acumulado. Cuando el cliente paga $25,000 de una nota de $50,000, el saldo de ese pedido debe quedar en $25,000, no tocar la tabla de facturas.

**Lo que falta:** El sistema de cobro debe trabajar sobre `pedidos` directamente (campo `saldo_pendiente` en la tabla pedidos o tabla `cobros_pedido`), con soporte para:
- Pagos parciales a cuenta del pedido
- Fecha de depósito para cheques
- El pedido se marca como "saldado" solo cuando llega a $0

### Brecha 2 -- KG totales sumados por ruta/destino

El pedido ya calcula kg totales por pedido, pero no hay una vista donde el vendedor pueda ver: "Para Cuernavaca tengo pedido A (120 kg) + pedido B (85 kg) = 205 kg para esa ruta". Esto le ayuda a coordinar con logística.

**Lo que falta:** En la pestaña "Mis Ventas", agregar una agrupación por zona/destino que muestre kg totales consolidados cuando hay más de un pedido para el mismo destino.

### Brecha 3 -- Secciones de estado del pedido separadas

Actualmente "Mis Ventas" muestra TODOS los pedidos mezclados con un filtro de período. El vendedor necesita ver 4 secciones claras:
- **Pendientes** (por autorizar / autorizados, no en ruta aún) -- con días transcurridos desde creación
- **En Ruta** (status `en_ruta`)
- **Entregados** (status `entregado`) -- donde aplica comisión
- **Por cobrar** (entregados + no pagados)

**Lo que falta:** Rediseñar `VendedorMisVentasTab` con tabs o secciones por estado, y mostrar el contador de días desde creación del pedido.

### Brecha 4 -- Notificación al vendedor cuando el chofer marca entrega + PDF

Cuando el chofer en `ChoferPanel` marca un pedido como entregado, no existe un mecanismo que notifique al vendedor con un PDF de recepción. 

**Lo que falta:** 
- Edge function que se dispare cuando `entregas.entregado = true`
- Generar PDF de confirmación de entrega (folio, cliente, productos, kg totales, firma del chofer)
- Enviar push notification al vendedor (ya tienen Firebase/FCM configurado) y/o email

### Brecha 5 -- Análisis de clientes inactivos e historial de productos frecuentes

No existe ninguna sección que muestre qué clientes llevan tiempo sin comprar, ni qué productos compra frecuentemente cada cliente.

**Lo que falta:** Nueva pestaña o sección dentro del detalle del cliente:
- "Clientes inactivos": lista de clientes del vendedor con más de X días sin pedido (configurable: 30, 60, 90 días)
- "Productos frecuentes": top 5-10 productos más pedidos por cada cliente (conteo de apariciones en `pedidos_detalle`)
- "Auditoría de precios": historial de pedidos pasados con los precios aplicados en cada compra

### Brecha 6 -- Envío de email del pedido a pedidos@almasa.com.mx

Cuando el vendedor confirma un pedido en el wizard, no hay un mecanismo que envíe automáticamente una copia a `pedidos@almasa.com.mx`.

**Lo que falta:** Al crear el pedido exitosamente, invocar una edge function que envíe el detalle del pedido (folio, cliente, productos, cantidades, kg totales, total) por email a la dirección de pedidos.

---

## Plan de implementación (orden sugerido)

### Fase A -- Cobro enlazado a pedidos (más urgente, afecta operación diaria)

**Cambios:**
1. Agregar campo `saldo_pendiente` a la tabla `pedidos` (inicializado = total del pedido)
2. Crear tabla `cobros_pedido` con: `pedido_id`, `monto`, `forma_pago`, `referencia`, `fecha_cheque`, `notas`, `registrado_por`, `created_at`
3. Modificar/crear nuevo `RegistrarCobro` que funcione sobre pedidos (no facturas), mostrando lista de pedidos entregados con saldo > 0 del cliente seleccionado
4. Cuando el cobro liquida el pedido, marcar `pedidos.pagado = true` y actualizar `clientes.saldo_pendiente`

### Fase B -- Secciones de estado en Mis Ventas

**Cambios:**
1. Rediseñar `VendedorMisVentasTab` con 4 tabs: Pendientes | En Ruta | Entregados | Por Cobrar
2. En tab "Pendientes": mostrar días transcurridos desde `fecha_pedido`
3. En tab "Por Cobrar": integrar directamente el botón de registrar cobro
4. Agregar subtotal de KG por zona/destino en tab "En Ruta"

### Fase C -- Análisis de clientes (inteligencia comercial)

**Cambios:**
1. Nueva pestaña o sección "Análisis" en el panel vendedor
2. Sub-sección "Inactivos": clientes sin pedido en los últimos 30/60/90 días
3. En detalle del cliente: tab "Frecuencia" con top productos y frecuencia de compra
4. En detalle del cliente: tab "Historial Precios" con precios aplicados en pedidos históricos

### Fase D -- Notificación de entrega al vendedor

**Cambios:**
1. Edge function `notificar-entrega-vendedor` que recibe `entrega_id` cuando se marca como entregado
2. Genera mini PDF de comprobante (html2canvas/jsPDF -- ya están instalados)
3. Envía push notification FCM al vendedor (token ya almacenado)
4. Opcionalmente envía email con el PDF adjunto

### Fase E -- Email automático al crear pedido

**Cambios:**
1. Llamada a edge function `enviar-pedido-interno` al final del wizard (en `PasoConfirmar.tsx`)
2. La función formatea el pedido en HTML y lo envía a `pedidos@almasa.com.mx` via Resend (ya tienen `RESEND_API_KEY`)

---

## Lo que NO necesita cambios

- Clientes visibles para Admin y Secretaria: ya funciona (se ven en `/clientes` con el vendedor asignado)
- Selección de términos de crédito en el pedido: ya está en el wizard
- Cálculo de vencimiento desde fecha_entrega_real: ya funciona via trigger de BD
- Identificación KG vs Bulto en el pedido: ya implementado

---

## Archivos que se crearán o modificarán

**Fase A (Cobro por pedido):**
- Migración BD: tabla `cobros_pedido` + campo `saldo_pendiente` en `pedidos`
- `src/components/vendedor/RegistrarCobroPedidoDialog.tsx` (nuevo)
- `src/components/vendedor/VendedorCobranzaTab.tsx` (actualizar para usar pedidos)

**Fase B (Mis Ventas con secciones):**
- `src/components/vendedor/VendedorMisVentasTab.tsx` (rediseño de secciones)

**Fase C (Análisis clientes):**
- `src/components/vendedor/VendedorAnalisisClientesTab.tsx` (nuevo)
- `src/components/vendedor/ClienteDetalleSheet.tsx` (agregar tabs de frecuencia e historial)
- `src/pages/VendedorPanel.tsx` (agregar nueva pestaña al nav)

**Fase D (Notificación entrega):**
- `supabase/functions/notificar-entrega-vendedor/index.ts` (nuevo)
- `src/pages/ChoferPanel.tsx` (disparar función al confirmar entrega)

**Fase E (Email al crear pedido):**
- `supabase/functions/enviar-pedido-interno/index.ts` (nuevo)
- `src/components/vendedor/pedido-wizard/PasoConfirmar.tsx` (invocar función)

---

## Recomendación de inicio

El orden recomendado es A → B → E → C → D, ya que A y B impactan directamente la operación diaria del vendedor (cobros y seguimiento de pedidos), E es rápido de implementar, C agrega inteligencia comercial valiosa, y D requiere coordinación con el flujo del chofer.

¿Por cuál fase quieres empezar?
