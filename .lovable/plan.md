

## Plan: Publicar cambios para activar el fix de FCM en iOS

### Diagnóstico Confirmado

| Elemento | Estado |
|----------|--------|
| AppDelegate.swift | ✅ Correcto - Firebase configurado con mapeo de token APNs |
| pushNotifications.ts (Lovable) | ✅ Actualizado con retry logic y validación |
| App iOS apunta a | `erp.almasa.com.mx` (producción) |
| Código en producción | ❌ Versión anterior sin el fix de FCM |

### Problema
La app iOS carga el JavaScript desde **producción** (`erp.almasa.com.mx`), pero el fix que agregamos al código `pushNotifications.ts` solo está en el **preview de Lovable**. Por eso el código nuevo no se ejecuta en tu iPhone.

### Solución

```text
┌─────────────────┐    Publicar    ┌─────────────────┐
│ Preview Lovable │  ──────────►   │ erp.almasa.com.mx │
│ (código nuevo)  │                │ (producción)      │
└─────────────────┘                └─────────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ App iOS      │
                                   │ carga código │
                                   │ actualizado  │
                                   └──────────────┘
```

### Pasos

1. **Publicar desde Lovable**
   - Haz clic en el botón **"Publish"** (arriba a la derecha en la interfaz de Lovable)
   - Esto despliega el código actualizado a `erp.almasa.com.mx`

2. **Forzar recarga en iOS**
   - Cierra completamente la app en tu iPhone (desliza hacia arriba para cerrarla)
   - Vuelve a abrir la app
   - Esto cargará el código JavaScript nuevo desde producción

3. **Re-activar notificaciones**
   - Cuando la app abra, debería activar el nuevo flujo de push
   - El código con retry logic intentará obtener el token FCM correctamente

4. **Verificación**
   - Una vez que hagas esto, avísame para verificar si el token FCM se guardó en la base de datos

---

### Nota Importante
No necesitas hacer un nuevo build de TestFlight para esto. El código JavaScript se carga dinámicamente desde el servidor cada vez que abres la app. Solo necesitas publicar y reabrir la app.

