
# Plan: Completar Flujo de Carga End-to-End

## Resumen

Este plan cubre las 6 funcionalidades faltantes para completar el ciclo operativo desde la carga en almacen hasta la entrega confirmada por el chofer.

---

## 1. PDF de 3 Hojas para Pedidos Internos (pedidos@almasa.com.mx)

Actualmente el sistema genera un PDF de 1 hoja (remision). Se necesita generar un bundle de 3 hojas al crear el pedido.

**Hojas a generar:**
- **Hoja 1 - Remision Comercial**: Igual al PDF del cliente (PedidoPrintTemplate existente)
- **Hoja 2 - Hoja de Carga Almacen**: Incluye QR (`almasa:carga:{pedidoId}`), tabla de productos con columnas para marcar cantidades, espacio para pesos
- **Hoja 3 - Hoja de Carga Cliente**: Sin QR, con campos de firma de recepcion, pagare, dias de credito, peso total

**Cambios:**
- Crear `src/components/pedidos/HojaCargaAlmacenTemplate.tsx` - template con QR y tabla de chequeo
- Crear `src/components/pedidos/HojaCargaClienteTemplate.tsx` - template con firmas, pagare, credito
- Modificar `src/components/vendedor/VendedorNuevoPedidoTab.tsx` - generar PDF de 3 paginas al enviar a pedidos@almasa.com.mx
- Modificar la Edge Function `send-order-authorized-email` para adjuntar el PDF de 3 hojas

---

## 2. Pestanas "En Ruta" y "Pedidos Entregados" en Almacen

Actualmente `AlmacenCargaRutasTab` solo muestra rutas para cargar. Se necesitan 2 pestanas adicionales.

**Cambios:**
- Modificar `src/components/almacen/AlmacenCargaRutasTab.tsx` - agregar un sistema de tabs interno con 3 vistas:
  - **Carga de Rutas** (vista actual)
  - **En Ruta** - rutas con status `en_curso`, mostrando progreso de entregas en tiempo real (cuantas entregadas/total)
  - **Pedidos Entregados** - rutas con status `completada`, con resumen de entregas del dia
- Suscripcion Realtime a cambios en `entregas` para actualizar progreso en tiempo real
- Modificar `src/components/almacen/AlmacenSidebar.tsx` y `AlmacenMobileNav.tsx` si se requiere ajuste en los contadores

---

## 3. Reimpresion Obligatoria al Modificar Cantidades

Cuando el almacen modifica cantidades en la hoja interactiva, antes de enviar a ruta debe:
1. Generar un nuevo PDF con las cantidades actualizadas (2 hojas: Hoja de Carga Original con QR para chofer + Hoja de Carga Cliente)
2. Forzar la impresion/descarga antes de permitir el envio

**Datos adicionales en las hojas:**
- Chofer, ayudantes, almacenista que cargo
- Hora de salida
- Espacio para firmas de recepcion del cliente
- Pagare, dias de credito
- Peso total por pedido (desglosado si son mas de 2 pedidos)

**Cambios:**
- Crear `src/components/almacen/HojaCargaDespachoTemplate.tsx` - template post-carga con datos operativos completos
- Modificar `src/components/almacen/AlmacenCargaRutasTab.tsx` - en `handleEnviarARuta`:
  - Detectar si hubo cambios de cantidad (comparar `carga_productos.cantidad_cargada` vs `pedidos_detalles.cantidad` original)
  - Si hubo cambios: generar PDF de 2 hojas, abrir dialogo de impresion obligatoria, bloquear envio hasta confirmar impresion
  - Si no hubo cambios: permitir envio directo

---

## 4. Email al Chofer al Enviar a Ruta

Al hacer click en "Enviar a Ruta", enviar email al chofer con su ruta y hojas de carga.

**Cambios:**
- Crear Edge Function `supabase/functions/send-chofer-route-email/index.ts`:
  - Recibe `rutaId`, busca datos de ruta, chofer, entregas
  - Genera email HTML con template profesional (logo Almasa, misma estetica que emails a clientes)
  - Incluye resumen de entregas, clientes, direcciones, peso total
  - Usa Resend API (secret ya configurada)
- Modificar `src/components/almacen/AlmacenCargaRutasTab.tsx` - en `handleEnviarARuta`, invocar `send-chofer-route-email` despues de actualizar estados

---

## 5. Escaneo QR del Chofer para Confirmar Entregas

El chofer debe poder escanear el QR de la hoja de carga del cliente para confirmar la entrega automaticamente.

**Cambios:**
- Modificar `src/components/chofer/EntregaCard.tsx`:
  - Agregar boton "Escanear QR" junto al boton "Entregar"
  - Al escanear, parsear URI `almasa:carga:{pedidoId}`, validar que coincida con el pedido de esa entrega
  - Marcar entrega como completada automaticamente
- Crear `src/components/chofer/QRScannerEntrega.tsx` - componente de scanner usando `html5-qrcode` (ya instalado)
- Usar el componente existente `CameraQrScanner` como referencia de implementacion

---

## 6. Notificaciones Automaticas al Escanear QR

Cuando el chofer escanea el QR y confirma la entrega, notificar automaticamente a:
- Vendedor del pedido
- Almacenista que cargo
- Secretarias y administradores

**Cambios:**
- Crear Edge Function `supabase/functions/send-delivery-confirmation/index.ts`:
  - Recibe `entregaId`, `pedidoId`, `rutaId`
  - Busca vendedor (via `pedidos.vendedor_id`), almacenista (`rutas.almacenista_id`), secretarias y admins (via `user_roles`)
  - Envia push notification via FCM (ya configurado) y email
  - Incluye: cliente, folio, hora de entrega, chofer
- Modificar `src/components/chofer/EntregaCard.tsx` o el flujo post-scan:
  - Despues de marcar entrega como completada, invocar `send-delivery-confirmation`
- Actualizar la Edge Function `send-client-notification` para soportar tipo `entrega_confirmada_qr` si se quiere notificar tambien al cliente

---

## Migracion de Base de Datos

Se necesita una migracion SQL para:
- Agregar campo `cantidad_original` a `pedidos_detalles` para trackear si hubo cambios durante la carga (necesario para la reimpresion obligatoria)
- Agregar campo `impresion_requerida` (boolean) a `rutas` para bloquear envio hasta imprimir

---

## Secuencia de Implementacion

1. Migracion DB (campo `cantidad_original`)
2. Templates de Hojas de Carga (almacen + cliente + despacho)
3. PDF de 3 hojas en creacion de pedido
4. Pestanas En Ruta / Entregados en almacen
5. Reimpresion obligatoria al modificar
6. Edge Function email al chofer
7. QR Scanner en panel del chofer
8. Edge Function notificaciones de entrega
