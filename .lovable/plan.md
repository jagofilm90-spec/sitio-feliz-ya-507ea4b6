
# Plan: Conciliacion de Entregas, Correos al Cliente y Seccion de Cobranza del Vendedor

## Resumen

Completar el flujo post-entrega: registrar hora exacta al escanear QR, enviar correo de entrega al cliente, implementar conciliacion masiva por la secretaria con checkbox y edicion de pedidos, envio de correo final al cliente con PDF y datos bancarios, y crear una seccion de Cobranza dedicada en el sidebar del vendedor con vista de pedidos por estado de pago.

---

## 1. Registrar Hora de Entrega al Escanear QR

**Estado actual**: Ya se guarda `hora_entrega_real` en `QRScannerEntrega.tsx` al momento del escaneo. Ya esta implementado correctamente.

**Ajuste necesario**: Asegurar que en `RegistrarEntregaSheet.tsx` tambien se guarde la hora exacta del momento de registro (ya lo hace). No se requieren cambios en este punto.

---

## 2. Correo Automatico al Cliente al Confirmar Entrega (QR o Manual)

Al confirmar entrega, enviar correo al cliente con: "Pedido entregado, gracias por confiar en Almasa".

**Cambios:**
- Modificar `supabase/functions/send-client-notification/index.ts`:
  - Agregar tipo `"entregado"` al template de correo con mensaje profesional: folio, hora de entrega, quien recibio, y agradecimiento "Gracias por confiar en Almasa"
  - Incluir datos bancarios de la empresa (BBVA, CLABE, cuenta) en el correo para referencia de pago
- Verificar que `QRScannerEntrega.tsx` y `RegistrarEntregaSheet.tsx` ya invocan `send-client-notification` con tipo `"entregado"` (ya lo hacen)

---

## 3. Redisenar Conciliacion de Secretaria (Flujo Masivo con Checkbox)

**Problema actual**: La conciliacion es por entrega individual (boton "Registrar Devoluciones / Faltantes" y luego "Marcar papeles recibidos"). Se necesita un flujo masivo donde la secretaria vea todos los pedidos del dia y pueda:
1. Marcar con checkbox los pedidos que estan correctos (sin modificar)
2. Editar los que tuvieron devolucion/faltante
3. Al confirmar, enviar correo a cada cliente

**Cambios en `SecretariaRutasTab.tsx`:**
- Agregar pestana **"Conciliar y Enviar"** que muestre todos los pedidos de rutas completadas del dia anterior pendientes de envio
- Cada pedido muestra: folio, cliente, total, productos (resumen)
- **Checkbox** por pedido: al marcar indica "correcto, listo para enviar"
- **Boton "Editar"** por pedido: abre `ConciliacionDetalleDialog` para registrar devoluciones/faltantes
- Los pedidos editados se marcan automaticamente como "editado" (icono diferente al checkbox)
- **Boton global "Enviar Todo"** con dialogo de confirmacion: "Se van a enviar X pedidos a sus clientes. Todo esta en orden?"
  - Si -> procesa cada pedido (genera PDF + envia correo)
  - No -> regresa a la vista

**Cambios en `ConciliacionDetalleDialog.tsx`:**
- Separar el flujo: guardar devoluciones vs enviar correo
- Al guardar devoluciones, solo guardar los datos y recalcular totales
- El envio del correo se hace desde el flujo masivo, no desde este dialogo
- Agregar boton "Guardar y cerrar" que guarde sin enviar

---

## 4. Correo Final al Cliente con PDF y Datos Bancarios

Dos variantes de correo segun si hubo modificaciones:

**Pedido sin modificacion:**
- Asunto: "Su pedido [FOLIO] ha sido entregado - Almasa"
- Cuerpo: "Estimado cliente, su pedido ya fue entregado. A partir de la fecha de entrega ([fecha]) cuentan los dias de credito ([X dias]). Adjuntamos su documento final."
- PDF adjunto: Remision con precios, cantidades, pesos, total global + datos bancarios de Almasa

**Pedido con modificacion (devolucion/faltante):**
- Asunto: "Su pedido [FOLIO] ha sido ajustado - Almasa"
- Cuerpo: "Estimado cliente, su pedido fue ajustado de acuerdo a la devolucion/faltante de la entrega. El total global ya esta calculado y es el definitivo. A partir de la fecha de entrega cuentan los dias de credito."
- PDF adjunto: Remision corregida con total ajustado + datos bancarios

**Cambios:**
- Crear `src/components/secretaria/ConciliacionMasivaEnvio.tsx`: componente principal del flujo masivo
- Modificar generacion de PDF (`PedidoPrintTemplate` o crear variante) para incluir datos bancarios de Almasa al pie (usando `getBankInfoHTML` de `companyData.ts`)
- Crear Edge Function helper o reutilizar `send-client-notification` con tipo `"pedido_conciliado"` y `"pedido_conciliado_ajustado"`

---

## 5. Mover Pedido a "Por Cobrar" del Vendedor tras Conciliacion

Una vez que la secretaria concilia y envia el correo:
- Actualizar el status del pedido a `"por_cobrar"` en la base de datos
- Esto hace que aparezca automaticamente en la pestana "Por Cobrar" del vendedor

**Cambios:**
- En el flujo masivo de envio, despues de enviar correo exitosamente, hacer `UPDATE pedidos SET status = 'por_cobrar'`

---

## 6. Seccion de Cobranza Dedicada en Vendedor

Actualmente "Por Cobrar" es una pestana dentro de "Pedidos". Se propone crear una seccion independiente en el sidebar del vendedor.

**Nueva seccion "Cobranza" en el sidebar del vendedor con:**
- Vista de pedidos organizados por estado de pago:
  - **Vigentes** (verde): pedidos dentro del plazo de credito
  - **Proximos a vencer** (amarillo): pedidos a 3 dias o menos de vencer
  - **Vencidos** (rojo): pedidos que ya pasaron el plazo de credito, mostrando cuantos dias de atraso
- Cada pedido muestra: folio, cliente, total, saldo pendiente, fecha entrega, dias de credito, dias restantes/atraso
- Boton para registrar cobro (ya existe `RegistrarCobroPedidoDialog`)
- KPIs en la parte superior: Total vigente, Total proximo a vencer, Total vencido

**Cambios:**
- Crear `src/components/vendedor/VendedorCobranzaTab.tsx` con la vista organizada por estados
- Modificar `src/components/vendedor/VendedorSidebar.tsx` para agregar item "Cobranza" con icono y badge
- Modificar `src/pages/VendedorPanel.tsx` para agregar la nueva pestana
- Mantener "Por Cobrar" en la pestana de pedidos como acceso rapido (no eliminar)

---

## Detalle Tecnico

### Archivos nuevos:
- `src/components/secretaria/ConciliacionMasivaEnvio.tsx` - Flujo masivo de conciliacion con checkboxes
- `src/components/vendedor/VendedorCobranzaTab.tsx` - Seccion de cobranza con estados de pago

### Archivos a modificar:
- `supabase/functions/send-client-notification/index.ts` - Agregar tipos `pedido_conciliado` y `pedido_conciliado_ajustado` con templates que incluyan datos bancarios
- `src/components/secretaria/SecretariaRutasTab.tsx` - Agregar pestana "Conciliar y Enviar"
- `src/components/secretaria/ConciliacionDetalleDialog.tsx` - Separar guardar vs enviar
- `src/components/vendedor/VendedorSidebar.tsx` - Agregar seccion Cobranza
- `src/pages/VendedorPanel.tsx` - Registrar tab de cobranza
- `src/components/pedidos/PedidoPrintTemplate.tsx` - Incluir datos bancarios en PDF

### No se requieren cambios de base de datos:
- Los campos necesarios (`hora_entrega_real`, `status`, `saldo_pendiente`, `termino_credito`, `fecha_entrega_real`) ya existen
- La tabla `devoluciones` ya existe para el registro de faltantes

### Secuencia de implementacion:
1. Actualizar template de correo de entrega al cliente (send-client-notification)
2. Crear flujo masivo de conciliacion (ConciliacionMasivaEnvio)
3. Integrar en SecretariaRutasTab
4. Ajustar PDF para incluir datos bancarios
5. Crear seccion de Cobranza del vendedor
6. Integrar en sidebar y panel del vendedor
