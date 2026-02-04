
# Plan: Corregir Notificaciones Push de Solicitud de Descuento

## Problema Identificado

Las notificaciones push no llegan cuando un vendedor solicita autorización de descuento porque el rol se está enviando con mayúscula incorrecta.

### Diagnóstico

| Ubicación | Error |
|-----------|-------|
| src/hooks/useSolicitudesDescuento.ts (línea 252) | roles: ['Admin'] debería ser roles: ['admin'] |

### Log de Error (Edge Function)

```
ERROR Error obteniendo usuarios por rol: {
  message: 'invalid input value for enum app_role: "Admin"'
}
INFO No hay usuarios destino para la notificación
```

El enum `app_role` en la base de datos tiene valores en minúsculas (`admin`, `vendedor`, `secretaria`, etc.), pero el código envía `'Admin'` con mayúscula, causando que la consulta SQL falle.

---

## Solución

Cambiar el valor del rol de `'Admin'` a `'admin'` en la llamada a la edge function.

### Archivo a Modificar

**src/hooks/useSolicitudesDescuento.ts** (línea 250-260)

```typescript
// ANTES (incorrecto)
await supabase.functions.invoke('send-push-notification', {
  body: {
    roles: ['Admin'],  // ❌ Mayúscula
    title: '🔔 Autoriza precio',
    ...
  }
});

// DESPUÉS (correcto)
await supabase.functions.invoke('send-push-notification', {
  body: {
    roles: ['admin'],  // ✅ Minúscula
    title: '🔔 Autoriza precio',
    ...
  }
});
```

---

## Verificación Adicional

Revisaré si hay otros lugares en el código donde se use `'Admin'` con mayúscula para notificaciones push, para corregirlos todos de una vez.

---

## Resultado Esperado

1. Cuando un vendedor solicite autorización de descuento
2. La edge function encontrará usuarios con rol `admin`
3. Enviará la notificación push a todos los dispositivos registrados de administradores
4. Los administradores recibirán la notificación en la app móvil

---

## Cambio Mínimo

Solo se requiere cambiar **1 carácter** en **1 archivo** para resolver el problema.
