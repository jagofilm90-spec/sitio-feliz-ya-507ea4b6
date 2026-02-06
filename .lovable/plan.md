
# Plan: Agregar Ruta de Diagnóstico Push Incondicional

## Problema Identificado
La tarjeta "Notificaciones Push" en Configuración → Sistema **solo aparece si `Capacitor.isNativePlatform()` retorna `true`**. En iOS desde Xcode, esta verificación parece estar fallando, lo que oculta la herramienta de diagnóstico.

## Solución
Crear una **ruta de acceso directo** (`/push-diagnostics`) que muestre la herramienta de diagnóstico **sin la verificación condicional de plataforma**. Esto permitirá acceder a los diagnósticos desde cualquier contexto y ver exactamente qué está reportando Capacitor.

---

## Cambios a Realizar

### 1. Crear página de diagnóstico independiente
**Archivo nuevo:** `src/pages/PushDiagnosticsPage.tsx`

Una página simple que:
- Importa y muestra el componente `PushNotificationDiagnostics`
- No tiene verificación `isNative` para renderizar
- Muestra información adicional sobre lo que Capacitor está detectando
- Protegida solo para admin

### 2. Agregar ruta en App.tsx
**Archivo:** `src/App.tsx`

Agregar:
```tsx
<Route path="/push-diagnostics" element={
  <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
    <PushDiagnosticsPage />
  </ProtectedRoute>
} />
```

### 3. Mejorar el componente de diagnóstico
**Archivo:** `src/components/configuracion/PushNotificationDiagnostics.tsx`

Modificar para que siempre muestre los controles, incluso cuando `isNative` sea false, pero con advertencias claras. Esto permite ver qué está reportando Capacitor.

---

## Uso
1. Desde iOS/Xcode, navegar manualmente a: `/push-diagnostics`
2. La página mostrará el diagnóstico completo
3. Podrás ver exactamente qué valores retorna `Capacitor.getPlatform()` y `Capacitor.isNativePlatform()`
4. Si el problema es que Capacitor no detecta la plataforma, lo verás inmediatamente

---

## Resultado Esperado
Al navegar a `/push-diagnostics` desde el iPhone conectado a Xcode:
- Verás si Capacitor está detectando `ios` o `web`
- Podrás ejecutar el diagnóstico completo independientemente de lo que diga `isNativePlatform()`
- Tendrás logs detallados del proceso

Esto nos dará la información exacta de dónde está el fallo.
