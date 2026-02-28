

# Plan: Notificaciones Inteligentes — Correo + WhatsApp

## Resumen

Implementar un sistema de notificacion dual que envie automaticamente por correo y/o WhatsApp segun los datos del cliente:
- **Tiene correo y celular**: se envia a ambos
- **Solo correo**: se envia solo por correo
- **Solo celular (sin correo)**: se envia solo por WhatsApp

WhatsApp se enviara de forma **semi-automatica** usando la API de `wa.me` (abre WhatsApp Web/App con el mensaje ya escrito y listo para enviar con un clic). Esto no tiene costo y no requiere cuenta de WhatsApp Business API.

---

## 1. Modificar Edge Function `send-client-notification`

Actualmente la funcion solo envia correo. Se modificara para:

- Buscar tambien los telefonos del cliente en `cliente_telefonos`
- Si no hay correos configurados pero si hay telefono, retornar en la respuesta `whatsappPending: true` con el numero y mensaje pre-armado
- Si hay ambos, enviar correo normalmente y retornar `whatsappPending: true` para que el frontend abra el link
- Generar el texto del mensaje de WhatsApp segun el tipo de notificacion (version texto plano, sin HTML)

La respuesta incluira un nuevo campo:
```text
{
  success: true,
  emailsSent: 2,
  whatsapp: {
    pending: true,
    phones: ["+521234567890"],
    message: "Estimado cliente, su pedido PED-202602-0001 ha sido entregado..."
  }
}
```

---

## 2. Crear funcion utilitaria para generar links de WhatsApp

Archivo: `src/lib/whatsappUtils.ts`

- `generateWhatsAppUrl(phone, message)`: genera URL `https://wa.me/{phone}?text={encodedMessage}`
- `formatPhoneForWhatsApp(phone)`: limpia el numero (quita espacios, guiones, agrega codigo de pais 52 si no lo tiene)
- `generateWhatsAppMessage(tipo, data)`: genera el texto del mensaje segun el tipo de notificacion

---

## 3. Modificar `ConciliacionMasivaEnvio.tsx` (Secretaria)

Al enviar pedidos conciliados:
- Despues de enviar correo, verificar si la respuesta incluye `whatsapp.pending`
- Si hay WhatsApp pendiente, mostrar un dialogo/lista con botones "Enviar por WhatsApp" que abren `wa.me` con el mensaje pre-armado
- Si el pedido solo tiene WhatsApp (sin correo), mostrarlo con un icono diferente (icono de WhatsApp verde)
- Agregar indicador visual en cada pedido: icono de correo, icono de WhatsApp, o ambos

---

## 4. Modificar notificaciones del Chofer (QR Scanner y Entrega Manual)

En `QRScannerEntrega.tsx` y `RegistrarEntregaSheet.tsx`:
- Al recibir respuesta de `send-client-notification`, si hay `whatsapp.pending`, abrir automaticamente el link de WhatsApp para que el chofer envie el mensaje con un tap
- Mostrar toast indicando "Abrir WhatsApp para notificar al cliente"

---

## 5. Indicadores visuales en lista de pedidos

En las tarjetas de pedido de la conciliacion masiva, mostrar iconos:
- Icono de sobre (correo) si el cliente tiene email
- Icono de WhatsApp (verde) si tiene celular
- Ambos si tiene los dos
- Alerta si no tiene ni correo ni celular

---

## Detalle Tecnico

### Archivos nuevos:
- `src/lib/whatsappUtils.ts` — utilidades para generar URLs y mensajes de WhatsApp

### Archivos a modificar:
- `supabase/functions/send-client-notification/index.ts` — buscar telefonos del cliente, incluir datos de WhatsApp en respuesta, generar mensaje texto plano
- `src/components/secretaria/ConciliacionMasivaEnvio.tsx` — mostrar indicadores correo/WhatsApp, abrir links de WhatsApp post-envio
- `src/components/chofer/QRScannerEntrega.tsx` — abrir WhatsApp tras confirmar entrega si aplica
- `src/components/chofer/RegistrarEntregaSheet.tsx` — mismo comportamiento que QR scanner

### Sin cambios de base de datos:
- La tabla `cliente_telefonos` ya existe con los campos necesarios (`telefono`, `es_principal`, `cliente_id`)
- La tabla `cliente_correos` ya se usa para los correos

### Flujo completo:
1. Se invoca `send-client-notification` con `clienteId` y `tipo`
2. La funcion busca correos Y telefonos del cliente
3. Si hay correos, envia por Gmail como ya lo hace
4. En la respuesta, incluye los telefonos disponibles y el mensaje de WhatsApp pre-generado
5. El frontend recibe la respuesta y, si hay telefonos, abre `wa.me` o muestra boton para hacerlo

