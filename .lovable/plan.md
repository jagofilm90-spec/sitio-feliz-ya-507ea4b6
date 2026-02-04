
Objetivo
- Evitar que el cuadro “Activar Notificaciones” aparezca en la pantalla de login (/auth) en iOS, incluso tras reinstalar.
- Dejar el flujo: el cuadro solo puede aparecer después de iniciar sesión y estar dentro del sistema.
- Aclarar y corregir el logo/splash inicial en iOS (esto requiere recompilar la app nativa y subir una nueva build a TestFlight).

Lo que encontré (causas probables)
1) El componente de push se monta globalmente (App.tsx) antes del enrutador (BrowserRouter), por lo que está “ciego” a los cambios de ruta de React Router. Hoy se intenta inferir la ruta con window.location.pathname, pero en iOS/Capacitor esa sincronía puede fallar en el arranque (y además puede incluir variaciones como /auth/).
2) Además, hay inicialización automática de push en App.tsx (initPushNotifications) en cuanto detecta sesión; eso puede disparar comportamiento inesperado si la sesión cambia o si hay reintentos.
3) El splash/logo inicial no depende del código web: en iOS vive en el proyecto nativo (LaunchScreen/AppIcon). Por eso borrar/reinstalar no “arregla” el logo: hay que regenerar assets y recompilar.

Cambios propuestos (código) – Push Notifications

A) Centralizar el control de push dentro del Router (con ruta real)
- Mover la lógica de “si debo mostrar el prompt” a un componente que viva dentro de <BrowserRouter> para usar useLocation().
- Regla estricta: si la ruta actual es /auth, /login o / (o empieza con /auth o /login), NO renderizar el prompt (ni siquiera montar el componente) y además cerrar cualquier diálogo pendiente.

Implementación (alto nivel)
1) Crear un componente “PushNotificationsGate/Manager” (puede ser nuevo archivo src/components/PushNotificationsGate.tsx o inline en App.tsx) que:
   - useLocation() para leer pathname real.
   - Determine isAuthRoute con algo robusto:
     - pathname === '/' OR pathname.startsWith('/auth') OR pathname.startsWith('/login')
   - Solo si:
     - plataforma nativa (Capacitor)
     - NO isAuthRoute
     - y hay sesión válida (session?.user?.id)
     entonces ejecutar checkNotificationPermissions() y decidir:
     - Si permisos concedidos: inicializar listeners/registro (initPushNotifications) solo una vez.
     - Si permisos NO concedidos: renderizar <PushNotificationSetup /> para mostrar el cuadro.

2) Evitar duplicidad de prompts
- Actualmente PushNotificationSetup se renderiza en:
  - src/App.tsx (PushNotificationInitializer)
  - src/pages/VendedorPanel.tsx
  - src/pages/ChoferPanel.tsx
- Plan: dejar un solo lugar “global” (el Gate dentro del Router) y eliminar los renders adicionales en VendedorPanel y ChoferPanel para evitar múltiples timers/listeners.

3) Quitar/ajustar inicialización automática agresiva
- En App.tsx hoy se hace initPushNotifications() al detectar SIGNED_IN (sin verificar si ya hay permiso).
- Plan: cambiar a:
  - NO pedir permisos automáticamente al iniciar sesión.
  - Solo inicializar/register si checkNotificationPermissions() === granted.
  - Si no está granted, no llamar initPushNotifications hasta que el usuario presione “Activar Notificaciones” en el diálogo.
Esto evita que algo de push “se active” en momentos donde el usuario aún está en login o en transición.

B) Hardening del componente PushNotificationSetup (defensa extra)
Aunque el Gate evitará montar el componente en /auth, igualmente lo haré más robusto:
- Cambiar la comparación exacta de rutas a startsWith para tolerar /auth/ y variantes.
- Cancelar timeouts internos si se desmonta el componente o si cambian condiciones (usar refs para guardar el id de setTimeout y limpiarlo).
- Asegurar que si no hay session?.user?.id, el componente no pueda programar setTimeout(() => setShowDialog(true)).

Pruebas esperadas (push)
1) iOS / TestFlight / app recién instalada
   - Abrir app → estás en /auth → NO aparece el cuadro de “Activar Notificaciones”.
2) Iniciar sesión
   - La app redirige a dashboard/panel correspondiente.
   - Después de entrar, si el permiso NO está concedido y no se ha marcado “Ahora no” antes, aparece el cuadro.
3) Si el usuario presiona “Activar Notificaciones”
   - Aparece el prompt del sistema iOS (si aplica), se registra el token y se guarda en backend.
4) Verificación backend (opcional)
   - Confirmar que aparece un registro en device_tokens para ese usuario.

Cambios propuestos (proceso) – Logo/Splash inicial en iOS
Esto no se arregla con cambios web: requiere una nueva compilación y subida a TestFlight.

1) Generar assets correctos
- En la app ya existe una pantalla para generar splash/icon:
  - /generate-assets (GenerateAssets.tsx)
  - SplashGenerator produce un splash 2732x2732 con el logo actual (src/assets/logo-almasa.png).
- Si el problema es que el logo se ve “cortado / mal escalado”, normalmente la solución es:
  - usar un splash con suficiente padding (logo más pequeño),
  - y/o actualizar el LaunchScreen en Xcode.

2) Regenerar assets nativos y recompilar
- En tu máquina (proyecto exportado a GitHub):
  - git pull
  - npm install
  - npm run build
  - npx cap sync
  - Abrir iOS en Xcode (npx cap open ios)
  - Actualizar:
    - App Icon (Assets.xcassets)
    - LaunchScreen / Splash (según configuración actual del proyecto iOS)
  - Clean build + Archive + subir a TestFlight

Nota importante
- Esto es “nativo”. Aunque el sitio web se actualice, el splash/logo inicial no cambia hasta que se genere una nueva build de iOS y se instale.

Checklist de entrega
- [ ] El prompt de “Activar Notificaciones” no aparece en /auth en iOS
- [ ] El prompt aparece solo después de login (en dashboard/panel)
- [ ] No hay múltiples instancias del prompt (se eliminan duplicados en panels)
- [ ] Si permisos ya están concedidos, se inicializa push sin mostrar diálogo
- [ ] Splash/logo iOS corregido mediante nueva build en TestFlight

Riesgos / consideraciones
- Si la build iOS actual no está cargando el sitio más reciente (por ejemplo, usa archivos locales en vez de URL remota), entonces cualquier cambio web no se reflejará hasta recompilar. El Gate igual lo implemento, pero si ves que “no cambia nada”, eso indica que necesitamos una nueva build.
- Mantendré logs de diagnóstico (solo console.log) para confirmar: ruta actual, si hay sesión, y estado de permisos, durante pruebas internas.

Qué haré en la implementación (archivos)
- src/App.tsx
  - Reubicar/reestructurar PushNotificationInitializer → PushNotificationsGate dentro del BrowserRouter.
  - Ajustar initPushNotifications para que no solicite permisos automáticamente si no están concedidos.
- src/components/PushNotificationSetup.tsx
  - Robustecer guards (startsWith), limpiar timeouts, asegurar que no se programe showDialog sin sesión válida y fuera de rutas permitidas.
- src/pages/VendedorPanel.tsx y src/pages/ChoferPanel.tsx
  - Quitar <PushNotificationSetup /> para evitar duplicidad.

Guía para ti (nativo iOS)
- Después de cualquier cambio relacionado con iOS nativo (como splash/icon), recuerda:
  1) hacer git pull del repo exportado
  2) correr npm run build
  3) correr npx cap sync
  4) recompilar en Xcode y subir nueva build a TestFlight
- También revisa la guía MOBILE_BUILD_GUIDE.md del proyecto y el blog-post recomendado de Capacitor sobre assets/splash para iOS (para evitar que se vea “cortado” en distintos modelos).
