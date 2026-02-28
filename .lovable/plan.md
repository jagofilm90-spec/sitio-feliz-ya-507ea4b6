

# Plan: WhatsApp en todo el ciclo de vida del pedido

## Resumen

Actualmente la Edge Function `send-client-notification` ya genera los datos de WhatsApp (telefono + mensaje) en la respuesta, pero solo los puntos de **entrega (chofer)** y **conciliacion masiva (secretaria)** los aprovechan. Falta que los demas momentos del ciclo tambien abran WhatsApp cuando el cliente no tiene correo (o tiene ambos).

Los 4 momentos clave son:
1. **Pedido creado** -- vendedor crea el pedido
2. **En ruta** -- almacen despacha la ruta
3. **Entregado** -- chofer escanea QR o registra manual (ya implementado)
4. **Conciliado** -- secretaria envia pedido conciliado (ya implementado)

## Cambios necesarios

### 1. Creacion de pedido (Vendedor)

**Archivo:** `src/components/vendedor/VendedorNuevoPedidoTab.tsx`

En la seccion donde se invoca `send-client-notification` con tipo `pedido_confirmado` (linea ~928), actualmente se hace `.catch()` y se ignora la respuesta. Se modificara para:
- Capturar la respuesta (`data: notifResponse`)
- Si `notifResponse?.whatsapp?.pending` es true, llamar `openWhatsApp()` para abrir el link de wa.me con el mensaje pre-armado
- Mostrar un toast informativo: "Abriendo WhatsApp para notificar al cliente"

Esto cubre el caso donde el vendedor crea un pedido para un cliente sin correo.

### 2. Despacho a ruta (Almacen)

Hay dos archivos donde se despachan rutas y se envia notificacion `en_ruta`:

**Archivo:** `src/components/almacen/CargaRutaInlineFlow.tsx` (linea ~348)
**Archivo:** `src/pages/AlmacenCargaScan.tsx` (linea ~640)

En ambos se itera sobre los pedidos de la cola y se invoca `send-client-notification`. Se modificaran para:
- Capturar la respuesta de cada invocacion
- Acumular los pedidos que tengan `whatsapp.pending` en una lista
- Al finalizar el loop, si hay pedidos pendientes de WhatsApp, mostrar un dialogo o abrir los links secuencialmente (con un toast por cada uno)

Como el almacenista puede despachar multiples pedidos a la vez, se mostrara un resumen tipo lista con botones "Enviar WhatsApp" por cada cliente que lo necesite, similar al dialogo que ya existe en `ConciliacionMasivaEnvio.tsx`.

### 3. Otros puntos ya cubiertos

- **QRScannerEntrega.tsx** -- ya abre WhatsApp tras confirmar entrega
- **RegistrarEntregaSheet.tsx** -- ya abre WhatsApp tras registrar entrega manual
- **ConciliacionMasivaEnvio.tsx** -- ya muestra dialogo post-envio con botones WhatsApp

## Detalle Tecnico

### Archivos a modificar:
- `src/components/vendedor/VendedorNuevoPedidoTab.tsx` -- capturar respuesta de `send-client-notification` y abrir WhatsApp si aplica
- `src/components/almacen/CargaRutaInlineFlow.tsx` -- acumular respuestas WhatsApp y mostrar dialogo/botones post-despacho
- `src/pages/AlmacenCargaScan.tsx` -- mismo tratamiento que CargaRutaInlineFlow

### Patron de implementacion:

En cada punto se seguira el mismo patron que ya funciona en `QRScannerEntrega.tsx`:

```text
const { data: notifResponse } = await supabase.functions.invoke("send-client-notification", { body: {...} });
if (notifResponse?.whatsapp?.pending && notifResponse.whatsapp.phones?.length) {
  openWhatsApp(notifResponse.whatsapp.phones, notifResponse.whatsapp.message);
  toast.info("Abriendo WhatsApp para notificar al cliente");
}
```

Para los casos de multiples pedidos (almacen), se acumularan los datos WhatsApp pendientes y se mostrara un dialogo con la lista de clientes y un boton por cada uno para abrir wa.me.

### Sin cambios en Edge Function ni base de datos
La funcion `send-client-notification` ya retorna los datos de WhatsApp correctamente para todos los tipos de notificacion. Solo falta que el frontend los use en los puntos faltantes.

