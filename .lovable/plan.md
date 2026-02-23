

## Plan: Corregir Emails de Pedidos y Mejorar Vista de Pedidos

### Problema 1: No llega email a pedidos@almasa.com.mx

El sistema tiene dos mecanismos de email para pedidos:
- **enviar-pedido-interno**: Usa Resend (servicio externo) para enviar a pedidos@almasa.com.mx. No tiene logs, lo que indica que posiblemente no se esta invocando correctamente o Resend tiene un problema de configuracion.
- **send-client-notification**: Usa Gmail API para enviar al cliente. Tampoco tiene logs.

**Solucion**: Migrar el envio del email interno (a pedidos@almasa.com.mx) para que use Gmail API en lugar de Resend, ya que el sistema ya tiene configurada la cuenta pedidos@almasa.com.mx en Gmail. Asi se unifica todo bajo un solo sistema que ya funciona.

Se modificara la funcion `enviar-pedido-interno` para usar Gmail API (mismo patron que `send-client-notification`) en lugar de Resend.

### Problema 2: Email de confirmacion al cliente

El codigo ya llama a `send-client-notification` con tipo `pedido_confirmado` al crear un pedido, pero no hay logs. Esto indica que la cuenta de Gmail `pedidos@almasa.com.mx` puede no estar activa o los correos del cliente no estan configurados con el proposito correcto.

**Solucion**: Verificar y asegurar que la llamada funcione. Ademas, agregar un fallback: si el cliente tiene email directo en la tabla `clientes`, enviar ahi tambien.

### Problema 3: Notificacion "en ruta" al cliente

Ya esta implementado en `PlanificadorRutas.tsx` linea 377. Usa `send-client-notification` con tipo `en_ruta`. El template del email ya existe y dice "Tu pedido esta en camino".

**Solucion**: Mismo fix que el punto 2 - asegurar que funcione correctamente.

### Problema 4: UI - Nombre del cliente mas grande en las tarjetas de pedidos

Actualmente en `PedidoCardMobile.tsx` y `PedidoCardMobileSecretaria.tsx`, el folio se muestra grande y el nombre del cliente en texto pequeno.

**Solucion**: Invertir la jerarquia visual:
- Nombre del cliente en texto grande y prominente
- Folio del pedido en texto pequeno/secundario

---

### Cambios Tecnicos

#### 1. Edge function `enviar-pedido-interno/index.ts`
- Reescribir para usar Gmail API (misma logica de `send-client-notification`)
- Obtener token de la cuenta `pedidos@almasa.com.mx` de `gmail_cuentas`
- Mantener el mismo template HTML del email
- Eliminar dependencia de Resend

#### 2. Edge function `send-client-notification/index.ts`
- Agregar fallback: si no hay `cliente_correos` configurados, buscar email directamente en la tabla `clientes`
- Esto asegura que clientes sin correos especificos configurados tambien reciban notificaciones

#### 3. `src/components/pedidos/PedidoCardMobile.tsx`
- Nombre del cliente: texto grande (text-base font-bold)
- Folio: texto pequeno (text-xs font-mono text-muted-foreground)

#### 4. `src/components/secretaria/PedidoCardMobileSecretaria.tsx`
- Mismo cambio de jerarquia visual

#### 5. Verificar invocacion en `VendedorNuevoPedidoTab.tsx`
- Confirmar que `enviarEmailPedido` se llama correctamente despues de crear el pedido
- Agregar mejor manejo de errores con logs visibles
