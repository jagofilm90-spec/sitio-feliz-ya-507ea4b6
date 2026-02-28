

# Plan: WhatsApp en todo el ciclo de vida del pedido

## Resumen

Actualmente la Edge Function `send-client-notification` ya genera los datos de WhatsApp (telefono + mensaje) en la respuesta, pero solo los puntos de **entrega (chofer)** y **conciliacion masiva (secretaria)** los aprovechan. Falta que los demas momentos del ciclo tambien abran WhatsApp cuando el cliente no tiene correo (o tiene ambos).

Los 4 momentos clave son:
1. **Pedido creado** -- vendedor crea el pedido ✅ IMPLEMENTADO
2. **En ruta** -- almacen despacha la ruta ✅ IMPLEMENTADO
3. **Entregado** -- chofer escanea QR o registra manual ✅ YA EXISTÍA
4. **Conciliado** -- secretaria envia pedido conciliado ✅ YA EXISTÍA

## Estado: COMPLETADO

Todos los puntos del ciclo de vida ahora capturan la respuesta de `send-client-notification` y abren WhatsApp automáticamente si el cliente tiene teléfono registrado.

### Archivos modificados:
- `src/components/vendedor/VendedorNuevoPedidoTab.tsx` -- captura respuesta y abre WhatsApp al crear pedido
- `src/components/almacen/CargaRutaInlineFlow.tsx` -- acumula y abre WhatsApp al despachar ruta
- `src/pages/AlmacenCargaScan.tsx` -- mismo tratamiento al despachar ruta por scan
