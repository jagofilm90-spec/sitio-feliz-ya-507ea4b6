

# Plan: Agregar Acceso Directo al Diagnóstico desde Login

## Problema
La app nativa de iOS no tiene barra de direcciones visible. El usuario no puede navegar manualmente a `/push-diagnostics` porque el WebView de Capacitor no expone la URL.

## Solución
Agregar un **botón de diagnóstico** visible en la pantalla de autenticación (`/auth`) que permita acceder a la herramienta de diagnóstico sin necesidad de iniciar sesión.

---

## Cambios a Realizar

### 1. Modificar la página de Auth
**Archivo:** `src/pages/Auth.tsx`

Agregar en la parte inferior de la pantalla de login:
- Un enlace pequeño/discreto que diga "Diagnóstico Push (Admin)"
- Al tocarlo, navegará a `/push-diagnostics`

### 2. Permitir acceso sin autenticación (temporal para debug)
**Archivo:** `src/App.tsx`

Modificar la ruta `/push-diagnostics` para que NO requiera `ProtectedRoute` temporalmente. Esto es solo para poder diagnosticar el problema de detección de plataforma.

```tsx
// Cambiar de:
<Route path="/push-diagnostics" element={
  <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
    <PushDiagnosticsPage />
  </ProtectedRoute>
} />

// A (temporal):
<Route path="/push-diagnostics" element={<PushDiagnosticsPage />} />
```

---

## Flujo de Uso

1. Abrir la app desde Xcode en el iPhone
2. En la pantalla de login, tocar el enlace "Diagnóstico Push"
3. Ver qué valores reporta Capacitor
4. Ejecutar el diagnóstico completo
5. Compartir los resultados

---

## Sección Técnica

El diagnóstico mostrará:
- `Capacitor.getPlatform()` → debería decir `"ios"`
- `Capacitor.isNativePlatform()` → debería ser `true`

Si ambos muestran `"web"` y `false`, significa que hay un problema con:
- La sincronización de Capacitor (`npx cap sync`)
- La configuración del bridge nativo
- El build de iOS no incluye correctamente los plugins

---

## Nota de Seguridad
Una vez que terminemos de diagnosticar, volveremos a proteger la ruta con `ProtectedRoute`.

