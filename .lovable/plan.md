
# Plan de Pruebas: Flujo Completo de Orden de Compra con Faltantes

## Objetivo

Verificar que el ciclo completo de una OC funciona correctamente:
1. Crear una orden de compra
2. Simular recepcion parcial (con faltantes)
3. Confirmar que se envia correo al proveedor
4. Verificar que se reprograma la entrega automaticamente

---

## Preparacion: Datos Requeridos

### Proveedor con Email (ya existen en BD)

| Proveedor | Email |
|-----------|-------|
| GRUPO INDUSTRIAL VIDA | trinidad.ibarra@grupovida.com |
| COMERCIALIZADORA GOLDENOUS | comercializadoragoldenous@gmail.com |
| ALIMENTOS BALANCEADOS PENJAMO | alanderos@albapesa.com.mx |

### Productos Disponibles

| Producto | ID |
|----------|-----|
| Durazno Mitades | 1ad00492-fb85-4673-ac4c-0b601be19833 |
| Sal Molida | c851041c-3e1d-4624-84f4-c015ab8973e4 |
| Arroz Americano | 6e565ee2-f122-435b-a913-5ce879bb7838 |

---

## Paso 1: Crear Orden de Compra

### Acciones

1. Ir a **Secretaria Panel** o **Compras** (modulo administrativo)
2. Click en **"Nueva OC"**
3. Seleccionar proveedor: **COMERCIALIZADORA GOLDENOUS** (tiene email configurado)
4. Agregar productos:
   - **Sal Molida** x 100 unidades @ $15.00
   - **Arroz Americano** x 50 unidades @ $25.00
5. Configurar fecha de entrega: **Hoy o mañana**
6. Guardar y enviar

### Verificaciones

- Se genera folio automatico (formato `OC-YYYYMM-XXXX`)
- Se envia correo al proveedor con PDF adjunto
- La OC aparece en calendario con status "enviada"

---

## Paso 2: Simular Llegada del Proveedor (Fase 1)

### Acciones

1. Ir a **Almacen Tablet** > **Recepcion**
2. Localizar la OC creada en la lista de entregas pendientes
3. Click en **"Registrar Llegada"**
4. Completar datos obligatorios:
   - Placas del vehiculo: `ABC-123`
   - Foto del chofer (capturar cualquier imagen)
   - Numero de sello: `SELLO-001` (o marcar "Sin Sellos")
5. Guardar llegada

### Verificaciones

- Entrega cambia a status `llegada_registrada`
- Se registra la hora de llegada
- Boton "Completar Recepcion" habilitado

---

## Paso 3: Completar Recepcion con Faltante (Fase 2)

### Acciones

1. Click en **"Completar Recepcion"**
2. En la lista de productos:
   - **Sal Molida**: Recibido = **80** (de 100 ordenadas)
   - **Arroz Americano**: Recibido = **50** (completo)
3. Para la diferencia de Sal Molida, seleccionar razon: **"No llego completo"**
4. Capturar foto de remision del proveedor
5. Seleccionar bodega destino
6. Firmar digitalmente
7. Click **"Finalizar Recepcion"**

### Verificaciones

- El sistema detecta 20 unidades faltantes de Sal Molida
- Se crea automaticamente una nueva entrega programada para el **siguiente dia habil**
- La OC cambia a status **"parcial"**
- Se crea lote de inventario con 80 unidades de Sal Molida
- Se actualizan stock y costo promedio ponderado

---

## Paso 4: Verificar Notificacion al Proveedor

### Metodo 1: Ver Logs de Edge Function

Usa la herramienta de logs para ver si `notificar-faltante-oc` se ejecuto correctamente:

```
Edge Function: notificar-faltante-oc
Buscar: "faltante_creado"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "tipo": "faltante_creado",
  "email": "comercializadoragoldenous@gmail.com"
}
```

### Metodo 2: Verificar Historial de Correos

1. Ir a la OC en **Ordenes de Compra**
2. Abrir **"Historial de Correos"** (icono de sobre)
3. Debe aparecer:
   - Correo original de OC
   - Correo de notificacion de faltante

---

## Paso 5: Verificar Reprogramacion en Calendario

### Acciones

1. Ir a **Compras** > **Calendario**
2. Navegar al **siguiente dia habil**

### Verificaciones

- Aparece nueva entrega con badge naranja **"Faltante"**
- Detalle muestra solo los productos faltantes (20 unidades de Sal Molida)
- La entrega original muestra "Recibida" con badge verde

---

## Paso 6: Probar Recepcion del Faltante

### Acciones

1. Ir a **Almacen** > **Recepcion**
2. Localizar la entrega de faltante (badge naranja)
3. Registrar llegada
4. Completar recepcion con las 20 unidades de Sal Molida
5. Finalizar

### Verificaciones

- OC cambia a status **"completada"**
- Stock total de Sal Molida = 100 unidades
- No quedan entregas pendientes

---

## Diagrama de Flujo del Sistema

```text
+-------------------+     +------------------+     +-------------------+
|  Crear OC         | --> |  Enviar Email    | --> |  Calendario       |
|  (CrearOrdenWiz)  |     |  (gmail-api)     |     |  (Pendiente)      |
+-------------------+     +------------------+     +-------------------+
                                                           |
                                                           v
+-------------------+     +------------------+     +-------------------+
|  Registrar        | --> |  Recepcion       | --> |  ¿Faltantes?      |
|  Llegada (Fase 1) |     |  (Fase 2)        |     |                   |
+-------------------+     +------------------+     +-------------------+
                                                           |
                          +--------------------------------+
                          |                                |
                          v                                v
              +-----------------------+        +------------------------+
              | SI: Crear entrega     |        | NO: Marcar OC como     |
              | programada para       |        | "completada"           |
              | siguiente dia habil   |        +------------------------+
              +-----------------------+
                          |
                          v
              +-----------------------+
              | notificar-faltante-oc |
              | (Email automatico)    |
              +-----------------------+
```

---

## Correos que se Envian Automaticamente

| Evento | Edge Function | Destinatario | Contenido |
|--------|---------------|--------------|-----------|
| OC Creada | `gmail-api` | Proveedor | PDF de la orden |
| Faltante detectado | `notificar-faltante-oc` | Proveedor | Lista de faltantes + nueva fecha |
| Devolucion registrada | `notificar-cierre-oc` | Proveedor | Productos devueltos + motivo |
| Fin de recepcion | `gmail-api` | Contacto logistica | PDF de recepcion |

---

## Seccion Tecnica: Archivos Clave

| Archivo | Funcion |
|---------|---------|
| `src/components/compras/CrearOrdenCompraWizard.tsx` | Creacion de OC y envio inicial |
| `src/components/almacen/AlmacenRecepcionSheet.tsx` | Recepcion en 2 fases, deteccion de faltantes |
| `supabase/functions/notificar-faltante-oc/index.ts` | Email automatico de faltantes |
| `supabase/functions/notificar-cierre-oc/index.ts` | Email de devoluciones |
| `supabase/functions/auto-reschedule-deliveries/index.ts` | CRON para reprogramar entregas vencidas |
| `src/lib/emailNotificationsUtils.ts` | Copias internas a admin/secretaria |

---

## Resultado Esperado

Al completar todas las pruebas:

1. **OC con folio unico** generada y enviada por email
2. **Recepcion parcial** registrada con stock actualizado
3. **Entrega de faltantes** programada automaticamente
4. **Email de notificacion** enviado al proveedor
5. **OC completada** al recibir todos los productos
6. **Historial completo** de correos y entregas visible en el sistema

