
# Plan: Push Notification para Solicitudes de Descuento con Deep Link a "Pedidos Por Autorizar"

## Situación Actual

Ya existe la lógica para enviar push notifications cuando un vendedor solicita un descuento:

```typescript
// En useSolicitudesDescuento.ts (línea 248-264)
await supabase.functions.invoke('send-push-notification', {
  body: {
    roles: ['admin'],
    title: '🔔 Autoriza precio',
    body: `${vendedor_nombre || 'Vendedor'} solicita descuento para ${producto_nombre || 'producto'}`,
    data: {
      type: 'solicitud_descuento',
      solicitud_id: data.id,
    }
  }
});
```

**Problema**: El tipo `solicitud_descuento` **NO está manejado** en el `handleNotificationTap`, entonces cuando tocas la notificación, no navega a ningún lado.

---

## Cambios Requeridos

### 1. Agregar Deep Link para `solicitud_descuento`

Modificar `src/services/pushNotifications.ts` para manejar el tap en notificaciones de solicitud de descuento:

```typescript
// En handleNotificationTap (línea ~177)
case 'solicitud_descuento':
  window.location.href = '/pedidos?tab=por-autorizar';
  break;
```

Esto hará que al tocar la notificación, el admin sea llevado directamente a la pestaña "Por Autorizar" del módulo de Pedidos.

### 2. Pasar Nombre del Vendedor Correctamente

El componente `SolicitudDescuentoDialog.tsx` ya recibe la data necesaria, pero necesitamos asegurar que el nombre del vendedor se pase correctamente desde donde se invoca el dialog.

Verificar que al llamar `crearSolicitud()` se incluya:
- `vendedor_nombre`: Nombre completo del vendedor actual
- `producto_nombre`: Nombre del producto

---

## Flujo Completo

```text
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vendedor   │    │  Edge Function   │    │     Admin       │
│  en /vendedor│    │send-push-notif.  │    │   dispositivo   │
└──────┬───────┘    └────────┬─────────┘    └────────┬────────┘
       │                     │                       │
       │ 1. Click "Solicitar"│                       │
       │ (precio > máximo)   │                       │
       │                     │                       │
       │ 2. crearSolicitud() │                       │
       ├────────────────────>│                       │
       │                     │                       │
       │                     │ 3. FCM Push via      │
       │                     │    Firebase V1 API   │
       │                     ├──────────────────────>│
       │                     │                       │
       │                     │                       │ 4. Notificación
       │                     │                       │    "🔔 Juan solicita
       │                     │                       │     descuento para X"
       │                     │                       │
       │                     │                       │ 5. Admin toca notif.
       │                     │                       │
       │                     │                       │ 6. App abre en
       │                     │                       │    /pedidos?tab=por-autorizar
       │                     │                       │
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/services/pushNotifications.ts` | Agregar case `solicitud_descuento` en `handleNotificationTap` para navegar a `/pedidos?tab=por-autorizar` |
| `src/components/vendedor/SolicitudDescuentoDialog.tsx` | Asegurar que pase `vendedor_nombre` al llamar `crearSolicitud()` |

---

## Verificación

Una vez implementado:

1. Vendedor abre app y hace pedido con precio que excede descuento máximo
2. Click en "Solicitar Autorización" 
3. Admin recibe push notification: **"🔔 [Nombre Vendedor] solicita descuento para [Producto]"**
4. Admin toca la notificación
5. App abre directamente en `/pedidos?tab=por-autorizar` mostrando las solicitudes pendientes

---

## Notas Técnicas

- El tipo de dato `solicitud_descuento` ya se envía correctamente en el payload
- La pestaña "Por Autorizar" ya integra el componente `SolicitudesDescuentoPanel` que muestra las solicitudes pendientes
- Los roles se envían en minúsculas (`admin`) como requiere el edge function
