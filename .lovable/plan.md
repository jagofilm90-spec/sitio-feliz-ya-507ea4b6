

# Plan: WhatsApp automatico via Twilio

## Resumen

Cambiar el envio de WhatsApp de "semi-automatico" (abrir wa.me en el navegador) a **completamente automatico** via la API de Twilio. Los mensajes se enviaran desde la Edge Function `send-client-notification` sin intervencion del usuario.

## Prerequisitos

Se necesitan 3 secretos en el backend:
- `TWILIO_ACCOUNT_SID` -- identificador de la cuenta Twilio
- `TWILIO_AUTH_TOKEN` -- token de autenticacion
- `TWILIO_WHATSAPP_NUMBER` -- numero WhatsApp de Twilio (ej: `whatsapp:+14155238886`)

## Cambios

### 1. Guardar secretos de Twilio

Usar la herramienta `add_secret` para solicitar al usuario los 3 valores.

### 2. Modificar Edge Function `send-client-notification`

**Archivo:** `supabase/functions/send-client-notification/index.ts`

Actualmente la funcion genera `whatsappData` con `pending: true` y devuelve los telefonos + mensaje para que el frontend abra wa.me. Se cambiara para:

- Despues de obtener los telefonos y generar el mensaje, **enviar automaticamente** via la API de Twilio
- Usar `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` con autenticacion basica (SID:AuthToken)
- Enviar un mensaje por cada telefono activo del cliente
- El campo `whatsapp` en la respuesta cambiara de `pending: true` a `sent: true` con los resultados
- Si Twilio no esta configurado (faltan secretos), hacer fallback al comportamiento actual (devolver `pending: true`)

Codigo clave a agregar:

```text
async function sendTwilioWhatsApp(phone, message) {
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const FROM = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
  
  // Format: whatsapp:+521234567890
  const to = `whatsapp:+${formatPhoneForWhatsApp(phone)}`;
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${SID}:${TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: FROM, To: to, Body: message }),
    }
  );
  return response.json();
}
```

### 3. Limpiar frontend: quitar `openWhatsApp` de los flujos

Ya no se necesita abrir wa.me manualmente. Se eliminaran las llamadas a `openWhatsApp()` de:

- `src/components/vendedor/VendedorNuevoPedidoTab.tsx` -- quitar bloque que abre WhatsApp tras crear pedido
- `src/components/almacen/CargaRutaInlineFlow.tsx` -- quitar acumulacion de whatsappPendientes y apertura de links
- `src/pages/AlmacenCargaScan.tsx` -- mismo tratamiento
- `src/components/chofer/QRScannerEntrega.tsx` -- quitar apertura de WhatsApp tras entrega
- Cualquier otro archivo que use `openWhatsApp` con la respuesta de `send-client-notification`

En su lugar, si la respuesta indica `whatsapp.sent`, mostrar un toast informativo: "WhatsApp enviado al cliente" en lugar de "Abriendo WhatsApp..."

### 4. Registrar envios de WhatsApp (opcional pero recomendado)

Agregar un log en la tabla `correos_enviados` (o una nueva columna `canal`) para registrar los WhatsApp enviados, permitiendo auditoria.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/send-client-notification/index.ts` | Agregar envio Twilio automatico |
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | Quitar `openWhatsApp`, mostrar toast de exito |
| `src/components/almacen/CargaRutaInlineFlow.tsx` | Quitar `openWhatsApp`, mostrar toast de exito |
| `src/pages/AlmacenCargaScan.tsx` | Quitar `openWhatsApp`, mostrar toast de exito |
| `src/components/chofer/QRScannerEntrega.tsx` | Quitar `openWhatsApp`, mostrar toast de exito |

## Flujo resultante

```text
Evento (crear pedido, despachar, entregar, conciliar)
  --> Frontend llama send-client-notification
    --> Edge Function envia email (Gmail) + WhatsApp (Twilio) automaticamente
    --> Respuesta: { emailsSent: N, whatsappSent: N }
  --> Frontend muestra toast: "Cliente notificado por email y WhatsApp"
```

## Fallback

Si los secretos de Twilio no estan configurados, la funcion seguira enviando solo email y devolvera `whatsapp: null` (sin error). El sistema no se rompe.

